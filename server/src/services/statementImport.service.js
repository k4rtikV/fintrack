import { createHash } from "node:crypto";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import Category from "../models/Category.js";
import StatementImportDraft from "../models/StatementImportDraft.js";
import StatementImportBatch from "../models/StatementImportBatch.js";
import StatementImportEntry from "../models/StatementImportEntry.js";
import Transaction from "../models/Transaction.js";
import AppError from "../utils/AppError.js";
import { parseStatementFile } from "../utils/statementFileParser.js";
import { normalizeStatementRows } from "../utils/statementImportRows.js";
import { syncBudgetAlertsForTransaction } from "./notification.service.js";

const digest = (value) => createHash("sha256").update(value).digest("hex");
const fail = (message, code = 400) => { throw new AppError(message, code); };
const isId = (id) => mongoose.isValidObjectId(id);
const lookupDraft = async ({ draftId, userId }) => {
  if (!isId(draftId)) fail("Invalid statement preview", 400);
  const draft = await StatementImportDraft.findOne({ _id: draftId, user: userId, expiresAt: { $gt: new Date() } });
  if (!draft) fail("Statement preview expired; upload the file again", 404);
  return draft;
};
const lookupImportAccount = async ({ accountId, userId, session }) => {
  if (!isId(accountId)) fail("Choose a valid account", 400);
  const q = Account.findOne({ _id: accountId, user: userId, isArchived: false });
  const account = await (session ? q.session(session) : q);
  if (!account) fail("Import account not found or archived", 404);
  if (account.currency !== "INR") fail("Statement import supports INR accounts only", 409);
  if (account.type !== "BANK") fail("Import bank statements into BANK accounts only. Use Investments for stock trades and account transfers for money movements.", 409);
  return account;
};
const verifyCategory = async ({ categoryId, type, userId, session }) => {
  if (!isId(categoryId)) fail(`Choose an ${type.toLowerCase()} category`, 400);
  const q = Category.findOne({ _id: categoryId, type, user: userId, isArchived: false });
  const category = await (session ? q.session(session) : q);
  if (!category) fail(`${type} category not found or archived`, 404);
  return category;
};
const verifyCategories = async ({ normalized, categoryIds, userId, session }) => {
  const types = new Set(normalized.filter((r) => !r.error).map((r) => r.type));
  const found = {};
  for (const type of types) {
    found[type] = (await verifyCategory({ categoryId: categoryIds[type], type, userId, session }))._id;
  }
  return found;
};
const getExisting = async ({ userId, accountId, fingerprints, session }) => {
  if (!fingerprints.length) return new Set();
  const q = StatementImportEntry.find({ user: userId, account: accountId, fingerprint: { $in: fingerprints } }).select("fingerprint").lean();
  return new Set((await (session ? q.session(session) : q)).map((row) => row.fingerprint));
};
const createStatementPreview = async ({ userId, filename, format, buffer }) => {
  if (!["csv", "xlsx"].includes(format)) fail("Only .csv and .xlsx statements are supported");
  const file = parseStatementFile(buffer, format);
  if (file.rows.length < 2) fail("Statement must contain a header and at least one transaction");
  const draft = await StatementImportDraft.create({
    user: userId,
    filename: String(filename || `statement.${format}`).replace(/[\\/\x00-\x1f]/g, "").slice(0, 120),
    fileDigest: digest(buffer),
    format,
    rows: file.rows,
    date1904: file.date1904,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return {
    draftId: draft._id,
    filename: draft.filename,
    headers: file.rows[0],
    sampleRows: file.rows.slice(1, 7),
    headerCandidates: file.rows.slice(0, 10),
    rowCount: file.rows.length - 1,
    expiresAt: draft.expiresAt,
  };
};
const prepareStatementImport = async ({ userId, draftId, accountId, mapping, categories }) => {
  const draft = await lookupDraft({ userId, draftId });
  await lookupImportAccount({ accountId, userId });
  const normalized = normalizeStatementRows({ rows: draft.rows, mapping, date1904: draft.date1904 });
  const categoryIds = { INCOME: categories?.incomeCategoryId, EXPENSE: categories?.expenseCategoryId };
  await verifyCategories({ normalized: normalized.rows, categoryIds, userId });
  const existing = await getExisting({
    userId, accountId,
    fingerprints: normalized.rows.filter((row) => row.fingerprint).map((row) => row.fingerprint),
  });
  const preview = normalized.rows.map((row) => ({
    ...row,
    status: row.error ? "INVALID" : existing.has(row.fingerprint) ? "DUPLICATE" : "READY",
  }));
  const preparedToken = digest(JSON.stringify({ userId: String(userId), accountId, file: draft.fileDigest, mapping: normalized.mapping, categories: categoryIds }));
  draft.prepared = { preparedToken, accountId: String(accountId), mapping: normalized.mapping, categoryIds };
  await draft.save();
  return {
    draftId: draft._id,
    preparedToken,
    headers: draft.rows[normalized.mapping.headerRow] || [],
    rows: preview,
    readyCount: preview.filter((row) => row.status === "READY").length,
    duplicateCount: preview.filter((row) => row.status === "DUPLICATE").length,
    invalidCount: preview.filter((row) => row.status === "INVALID").length,
  };
};
const commitStatementImport = async ({ userId, draftId, preparedToken, selectedRows }) => {
  if (typeof preparedToken !== "string" || !/^[a-f0-9]{64}$/.test(preparedToken)) fail("Prepare the statement again before importing");
  if (!Array.isArray(selectedRows) || selectedRows.length < 1 || selectedRows.length > 500 ||
    selectedRows.some((row) => !Number.isInteger(row) || row < 0) ||
    new Set(selectedRows).size !== selectedRows.length) fail("Select valid statement rows to import");
  const draft = await lookupDraft({ userId, draftId });
  if (!draft.prepared || draft.prepared.preparedToken !== preparedToken) fail("Statement preparation has changed; preview again", 409);
  const { mapping, categoryIds, accountId } = draft.prepared;
  const normalized = normalizeStatementRows({ rows: draft.rows, mapping, date1904: draft.date1904 });
  const index = new Map(normalized.rows.map((row) => [row.rowIndex, row]));
  const requested = selectedRows.map((rowIndex) => {
    const row = index.get(rowIndex);
    if (!row || row.error) fail(`Statement row ${rowIndex + 1} is invalid; correct the file or deselect it`, 400);
    return row;
  });
  const requestKey = digest(JSON.stringify({ accountId, preparedToken, selectedRows: [...selectedRows].sort((a, b) => a - b) }));
  let batchResult;
  let alreadyCommitted = false;
  let committedExpenseDates = [];
  try {
    await mongoose.connection.transaction(async (session) => {
      // A receipt is replayable only while every requested fingerprint is
      // still present. Historical duplicate-only batches may have been made
      // before someone deleted an imported transaction from a DIFFERENT batch.
      // Reconcile against live entries in this transaction, not a stale count.
      const oldBatch = await StatementImportBatch.findOne({ user: userId, requestKey }).session(session).lean();
      const existing = await getExisting({ userId, accountId, fingerprints: requested.map((r) => r.fingerprint), session });
      const ready = requested.filter((row) => !existing.has(row.fingerprint));
      if (oldBatch && !ready.length) {
        batchResult = oldBatch;
        alreadyCommitted = true;
        return;
      }
      const account = await lookupImportAccount({ userId, accountId, session });
      const categoriesByType = await verifyCategories({ normalized: requested, categoryIds, userId, session });
      if (oldBatch) {
        await StatementImportBatch.updateOne(
          { _id: oldBatch._id, user: userId, requestKey },
          { $set: { requestKey: `superseded:${String(oldBatch._id)}`, invalidatedAt: new Date() } },
          { session },
        );
      }
      // Only notify for rows inserted by this transaction, not duplicates.
      committedExpenseDates = ready.filter((row) => row.type === "EXPENSE").map((row) => row.date);
      const incomePaise = ready.filter((row) => row.type === "INCOME").reduce((sum, row) => sum + row.paise, 0);
      const expensePaise = ready.filter((row) => row.type === "EXPENSE").reduce((sum, row) => sum + row.paise, 0);
      const batch = await StatementImportBatch.create([{
        user: userId, account: account._id, requestKey, filename: draft.filename,
        importedCount: ready.length, duplicateCount: requested.length - ready.length,
        totalIncome: incomePaise / 100, totalExpense: expensePaise / 100,
      }], { session });
      if (ready.length) {
        const imported = await Transaction.insertMany(ready.map((row) => ({
          user: userId, account: account._id, category: categoriesByType[row.type],
          type: row.type, amount: row.paise / 100, title: row.title,
          note: row.reference ? `Statement ref: ${row.reference}` : "Imported from statement",
          transactionDate: new Date(`${row.date}T00:00:00.000Z`),
          paymentMethod: "BANK_TRANSFER", tags: ["statement-import"],
        })), { session, ordered: true });
        await StatementImportEntry.insertMany(ready.map((row, i) => ({
          user: userId, account: account._id, fingerprint: row.fingerprint,
          transaction: imported[i]._id, batch: batch[0]._id,
        })), { session, ordered: true });
        account.balance = Math.round((Math.round(account.balance * 100) + incomePaise - expensePaise)) / 100;
        await account.save({ session, validateModifiedOnly: true });
      }
      batchResult = batch[0].toObject();
    });
  } catch (error) {
    if (error?.code === 11000) {
      const completed = await StatementImportBatch.findOne({ user: userId, requestKey }).lean();
      if (completed) return { batch: completed, alreadyCommitted: true };
      fail("An overlapping statement import completed simultaneously; preview again to avoid duplicates", 409);
    }
    throw error;
  }
  // Alerts are secondary; never turn a committed financial operation into
  // a failed response because a notification provider is down.
  if (!alreadyCommitted && batchResult.importedCount > 0) {
    const monthDates = new Map(committedExpenseDates.map((date) => [date.slice(0, 7), date]));
    for (const date of monthDates.values()) {
      try {
        await syncBudgetAlertsForTransaction({ userId, categoryId: categoryIds.EXPENSE, transactionDate: new Date(`${date}T00:00:00.000Z`) });
      } catch (error) { console.warn("Statement import budget alert unavailable:", error.message); }
    }
  }
  return { batch: batchResult, alreadyCommitted };
};

const listStatementImports = async ({ userId }) => StatementImportBatch.find({ user: userId })
  .select("filename account importedCount duplicateCount totalIncome totalExpense createdAt")
  .populate("account", "name currency")
  .sort({ createdAt: -1 }).limit(15).lean();

export { createStatementPreview, prepareStatementImport, commitStatementImport, listStatementImports };
