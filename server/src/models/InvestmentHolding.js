import mongoose from "mongoose";

const investmentHoldingSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    instrument: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentInstrument", required: true, index: true },
    quantity: { type: Number, min: 0, default: 0 },
    averageCost: { type: Number, min: 0, default: 0 },
    costBasis: { type: Number, min: 0, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    currency: { type: String, enum: ["INR"], default: "INR" },
  },
  { timestamps: true, versionKey: false },
);

investmentHoldingSchema.index(
  { user: 1, account: 1, instrument: 1 },
  { unique: true },
);
investmentHoldingSchema.index({ user: 1, quantity: -1, updatedAt: -1 });

const InvestmentHolding = mongoose.model("InvestmentHolding", investmentHoldingSchema);
export default InvestmentHolding;
