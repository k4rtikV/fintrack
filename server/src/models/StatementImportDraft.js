import mongoose from "mongoose";

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  filename: { type: String, maxlength: 120, required: true },
  fileDigest: { type: String, required: true },
  format: { type: String, enum: ["csv", "xlsx"], required: true },
  rows: { type: [[String]], required: true },
  date1904: { type: Boolean, default: false },
  prepared: { type: mongoose.Schema.Types.Mixed, default: null },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("StatementImportDraft", schema);
