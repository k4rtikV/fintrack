import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },

    type: {
      type: String,
      enum: ["INCOME", "EXPENSE"],
      required: true,
    },

    icon: {
      type: String,
      default: "circle",
    },

    color: {
      type: String,
      default: "slate",
    },

    displayOrder: {
      type: Number,
      default: 999,
      min: 0,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

categorySchema.index({
  user: 1,
  type: 1,
  displayOrder: 1,
  name: 1,
});

const Category = mongoose.model("Category", categorySchema);

export default Category;