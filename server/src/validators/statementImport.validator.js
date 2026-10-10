import { z } from "zod";
const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");
const column = z.number().int().min(-1).max(29);
const mapping = z.object({
  headerRow: z.number().int().min(0).max(9),
  mode: z.enum(["DEBIT_CREDIT", "SIGNED_AMOUNT"]),
  dateColumn: column,
  descriptionColumn: column,
  debitColumn: column.optional(),
  creditColumn: column.optional(),
  amountColumn: column.optional(),
  referenceColumn: column.optional(),
  dateOrder: z.enum(["DMY", "MDY"]).default("DMY"),
}).strict();
const draft = z.object({ draftId: objectId });
const prepareStatementSchema = z.object({ body: draft.extend({
  accountId: objectId,
  mapping,
  categories: z.object({
    incomeCategoryId: objectId.optional(),
    expenseCategoryId: objectId.optional(),
  }).strict(),
}).strict() });
const commitStatementSchema = z.object({ body: draft.extend({
  preparedToken: z.string().regex(/^[a-f\d]{64}$/i),
  selectedRows: z.array(z.number().int().min(0).max(510)).min(1).max(500),
}).strict() });
export { prepareStatementSchema, commitStatementSchema };
