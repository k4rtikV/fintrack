import mongoose from "mongoose";
const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  fingerprint: { type: String, required: true },
  transaction: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", required: true },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "StatementImportBatch", required: true },
}, { timestamps: true, versionKey: false });
schema.index({ user: 1, account: 1, fingerprint: 1 }, { unique: true });
schema.index({ user: 1, batch: 1 });
export default mongoose.model("StatementImportEntry", schema);
