import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
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
    transactionDate: { type: Date, required: true, default: Date.now, index: true },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "BANK_TRANSFER", "CHEQUE", "OTHER"],
      default: "OTHER",
    },
    tags: { type: [String], default: [] },
    recurringTransaction: { type: mongoose.Schema.Types.ObjectId, ref: "RecurringTransaction", default: null, index: true },
    recurringOccurrenceDate: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

transactionSchema.pre("validate", function validateTransferShape() {
  if (this.type === "TRANSFER") {
    this.category = null;
    if (this.account && this.destinationAccount && this.account.equals(this.destinationAccount)) {
      this.invalidate("destinationAccount", "Transfer destination must be different from the source account");
    }
  } else {
    this.destinationAccount = null;
  }
});

transactionSchema.index({ user: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, account: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, destinationAccount: 1, transactionDate: -1 });
transactionSchema.index({ user: 1, category: 1, transactionDate: -1 });
transactionSchema.index(
  { user: 1, recurringTransaction: 1, recurringOccurrenceDate: 1 },
  {
    unique: true,
    partialFilterExpression: {
      recurringTransaction: { $type: "objectId" },
      recurringOccurrenceDate: { $type: "date" },
    },
  },
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
