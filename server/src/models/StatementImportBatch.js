import mongoose from "mongoose";
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  requestKey: { type: String, required: true },
  filename: { type: String, maxlength: 120, required: true },
  importedCount: { type: Number, required: true, min: 0 },
  duplicateCount: { type: Number, required: true, min: 0 },
  totalIncome: { type: Number, required: true, default: 0 },
  totalExpense: { type: Number, required: true, default: 0 },
}, { timestamps: true, versionKey: false });
schema.index({ user: 1, requestKey: 1 }, { unique: true });
export default mongoose.model("StatementImportBatch", schema);
