import mongoose from "mongoose";

const investmentWatchlistItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    instrument: { type: mongoose.Schema.Types.ObjectId, ref: "InvestmentInstrument", required: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

investmentWatchlistItemSchema.index({ user: 1, instrument: 1 }, { unique: true });
investmentWatchlistItemSchema.index({ user: 1, createdAt: -1 });

const InvestmentWatchlistItem = mongoose.model(
  "InvestmentWatchlistItem",
  investmentWatchlistItemSchema,
);

export default InvestmentWatchlistItem;
