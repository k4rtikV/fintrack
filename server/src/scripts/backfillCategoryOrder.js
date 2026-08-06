import dotenv from "dotenv";
import mongoose from "mongoose";

import { DEFAULT_CATEGORIES } from "../constants/defaultCategories.js";
import Category from "../models/Category.js";

dotenv.config();

const backfillCategoryOrder = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    for (const category of DEFAULT_CATEGORIES) {
      await Category.updateMany(
        {
          name: category.name,
          type: category.type,
          isDefault: true,
        },
        {
          $set: {
            displayOrder: category.displayOrder,
          },
        },
      );
    }

    await Category.updateMany(
      {
        isDefault: false,
        displayOrder: {
          $exists: false,
        },
      },
      {
        $set: {
          displayOrder: 999,
        },
      },
    );

    console.log("Category display order backfilled successfully.");
  } catch (error) {
    console.error(`Backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
  }
};

backfillCategoryOrder();