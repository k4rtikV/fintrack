import mongoose from "mongoose";

const recurringTransactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true, index: true },
    destinationAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required() { return this.type === "TRANSFER"; },
      default: null,
      index: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required() { return this.type !== "TRANSFER"; },
      default: null,
      index: true,
    },
    type: { type: String, enum: ["INCOME", "EXPENSE", "TRANSFER"], required: true, index: true },
    amount: { type: Number, required: true, min: [0.01, "Amount must be greater than zero"] },
    title: { type: String, required: true, trim: true, minlength: 2, maxlength: 100 },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"],
      default: "OTHER",
    },
    tags: { type: [String], default: [] },
    frequency: { type: String, enum: ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"], required: true, index: true },
    interval: { type: Number, min: 1, max: 365, default: 1 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, default: null },
    nextRunDate: { type: Date, required: true, index: true },
    lastRunDate: { type: Date, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true, versionKey: false },
);

recurringTransactionSchema.pre("validate", function validateTransferShape() {
  if (this.type === "TRANSFER") {
    this.category = null;
    if (this.account && this.destinationAccount && this.account.equals(this.destinationAccount)) {
      this.invalidate("destinationAccount", "Autopay transfer destination must be different from the source account");
    }
  } else {
    this.destinationAccount = null;
  }
});

recurringTransactionSchema.index({ user: 1, isActive: 1, nextRunDate: 1 });
const RecurringTransaction = mongoose.model("RecurringTransaction", recurringTransactionSchema);
export default RecurringTransaction;
