import mongoose from "mongoose";

const investmentLotSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    holding: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentHolding", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    instrument: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentInstrument", required: true, index: true },
    quantityOriginal: { type: Number, required: true, min: 0.000001 },
    quantityRemaining: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true, min: 0 },
    acquiredAt: { type: Date, required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

investmentLotSchema.index({ user: 1, holding: 1, acquiredAt: 1, _id: 1 });

const InvestmentLot = mongoose.model("InvestmentLot", investmentLotSchema);
export default InvestmentLot;
