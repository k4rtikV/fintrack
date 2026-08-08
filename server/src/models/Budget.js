import mongoose from "mongoose";

const budgetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },

    month: {
      type: String,
      required: true,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format"],
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: [0.01, "Budget amount must be greater than zero"],
    },

    note: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

budgetSchema.index(
  {
    user: 1,
    category: 1,
    month: 1,
  },
  {
    unique: true,
  },
);

budgetSchema.index({
  user: 1,
  month: 1,
});

const Budget = mongoose.model("Budget", budgetSchema);

export default Budget;
