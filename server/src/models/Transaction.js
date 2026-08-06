import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Account",
      required: true,
      index: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Amount must be greater than zero"],
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
      index: true,
    },

    paymentMethod: {
      type: String,
      enum: [
        "CASH",
        "UPI",
        "CARD",
        "BANK_TRANSFER",
        "CHEQUE",
        "OTHER",
      ],
      default: "OTHER",
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

transactionSchema.index({
  user: 1,
  transactionDate: -1,
});

transactionSchema.index({
  user: 1,
  account: 1,
  transactionDate: -1,
});

transactionSchema.index({
  user: 1,
  category: 1,
  transactionDate: -1,
});

const Transaction = mongoose.model("Transaction", transactionSchema);

export default Transaction;