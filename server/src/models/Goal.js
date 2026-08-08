import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: [true, "Goal name is required"],
      trim: true,
      minlength: [2, "Goal name must contain at least 2 characters"],
      maxlength: [80, "Goal name cannot exceed 80 characters"],
    },

    targetAmount: {
      type: Number,
      required: [true, "Target amount is required"],
      min: [0.01, "Target amount must be greater than zero"],
    },

    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Current amount cannot be negative"],
    },

    targetDate: {
      type: Date,
      required: [true, "Target date is required"],
    },

    note: {
      type: String,
      trim: true,
      maxlength: [300, "Note cannot exceed 300 characters"],
      default: "",
    },

    color: {
      type: String,
      trim: true,
      maxlength: [30, "Color value is too long"],
      default: "emerald",
    },

    icon: {
      type: String,
      trim: true,
      maxlength: [40, "Icon value is too long"],
      default: "target",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

goalSchema.index({
  user: 1,
  targetDate: 1,
  createdAt: -1,
});

const Goal = mongoose.model("Goal", goalSchema);

export default Goal;
