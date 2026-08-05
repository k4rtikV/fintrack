import mongoose from "mongoose";

const accountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Account name is required"],
      trim: true,
      minlength: [2, "Account name must contain at least 2 characters"],
      maxlength: [60, "Account name cannot exceed 60 characters"],
    },

    type: {
      type: String,
      required: [true, "Account type is required"],
      enum: ["BANK", "CASH", "CARD", "WALLET", "INVESTMENT"],
    },

    balance: {
      type: Number,
      default: 0,
    },

    currency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP"],
      default: "INR",
    },

    color: {
      type: String,
      default: "slate",
      trim: true,
    },

    icon: {
      type: String,
      default: "wallet",
      trim: true,
    },

    isArchived: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

accountSchema.index({
  user: 1,
  isArchived: 1,
  createdAt: -1,
});

const Account = mongoose.model("Account", accountSchema);

export default Account;