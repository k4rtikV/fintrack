import AppError from "../utils/AppError.js";
import {
  createStatementPreview,
  prepareStatementImport,
  commitStatementImport,
  listStatementImports,
} from "../services/statementImport.service.js";

const previewStatement = async (req, res) => {
  if (!Buffer.isBuffer(req.body)) throw new AppError("Upload a CSV or XLSX file", 400);
  const format = String(req.get("x-statement-format") || "").toLowerCase();
  let filename;
  try { filename = decodeURIComponent(req.get("x-statement-name") || `statement.${format}`); }
  catch { throw new AppError("Invalid statement filename", 400); }
  const result = await createStatementPreview({ userId: req.user._id, format, filename, buffer: req.body });
  res.status(201).json({ success: true, data: result });
};
const prepareStatement = async (req, res) => {
  const result = await prepareStatementImport({ userId: req.user._id, ...req.validatedData.body });
  res.status(200).json({ success: true, data: result });
};
const commitStatement = async (req, res) => {
  const result = await commitStatementImport({ userId: req.user._id, ...req.validatedData.body });
  res.status(200).json({
    success: true,
    message: result.alreadyCommitted ? "This statement selection was already imported" : `${result.batch.importedCount} statement transactions imported`,
    data: result,
  });
};
const importHistory = async (req, res) => {
  const batches = await listStatementImports({ userId: req.user._id });
  res.status(200).json({ success: true, data: { batches } });
};
export { previewStatement, prepareStatement, commitStatement, importHistory };
