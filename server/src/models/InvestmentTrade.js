import mongoose from "mongoose";

const investmentTradeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    holding: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentHolding", required: true, index: true },
    instrument: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentInstrument", required: true, index: true },
    type: { type: String, required: true, enum: ["BUY", "SELL"], index: true },
    quantity: { type: Number, required: true, min: 0.000001 },
    price: { type: Number, required: true, min: 0.000001 },
    fees: { type: Number, min: 0, default: 0 },
    grossAmount: { type: Number, required: true, min: 0 },
    netCashAmount: { type: Number, required: true },
    costBasis: { type: Number, min: 0, default: 0 },
    realizedPnl: { type: Number, default: 0 },
    tradeDate: { type: Date, required: true, index: true },
    note: { type: String, trim: true, maxlength: 300, default: "" },
  },
  { timestamps: true, versionKey: false },
);

investmentTradeSchema.index({ user: 1, tradeDate: -1, createdAt: -1 });
investmentTradeSchema.index({ user: 1, holding: 1, tradeDate: -1 });

const InvestmentTrade = mongoose.model("InvestmentTrade", investmentTradeSchema);
export default InvestmentTrade;
