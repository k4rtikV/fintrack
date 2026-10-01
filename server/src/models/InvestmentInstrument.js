import mongoose from "mongoose";

const investmentInstrumentSchema = new mongoose.Schema(
  {
    instrumentKey: { type: String, required: true, unique: true, index: true, trim: true },
    exchange: { type: String, required: true, enum: ["NSE", "BSE"], index: true },
    segment: { type: String, required: true, enum: ["NSE_EQ", "BSE_EQ"], index: true },
    isin: { type: String, required: true, trim: true, index: true },
    tradingSymbol: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    shortName: { type: String, trim: true, default: "" },
    instrumentType: { type: String, trim: true, default: "" },
    exchangeToken: { type: String, trim: true, default: "" },
    lotSize: { type: Number, min: 0, default: 1 },
    tickSize: { type: Number, min: 0, default: 0 },
    casEligible: { type: Boolean, default: false },
    lastPrice: { type: Number, min: 0, default: null },
    previousClose: { type: Number, min: 0, default: null },
    yearHigh: { type: Number, min: 0, default: null },
    yearLow: { type: Number, min: 0, default: null },
    volume: { type: Number, min: 0, default: null },
    quoteUpdatedAt: { type: Date, default: null, index: true },
    // Provider snapshot time and actual last trade are different concepts.
    quoteFetchedAt: { type: Date, default: null },
    lastTradeAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

investmentInstrumentSchema.index({ exchange: 1, tradingSymbol: 1 });
investmentInstrumentSchema.index({ isin: 1, exchange: 1 });

const InvestmentInstrument = mongoose.model(
  "InvestmentInstrument",
  investmentInstrumentSchema,
);

export default InvestmentInstrument;
