import mongoose from "mongoose";

import { DEFAULT_CATEGORIES } from "../constants/defaultCategories.js";
import Category from "../models/Category.js";
import AppError from "../utils/AppError.js";

const ensureValidObjectId = (id) => {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid category ID", 400);
  }
};

const seedDefaultCategoriesForUser = async (userId) => {
  const existingCount = await Category.countDocuments({
    user: userId,
  });

  if (existingCount > 0) {
    return;
  }

  const categories = DEFAULT_CATEGORIES.map((category) => ({
    ...category,
    user: userId,
    isDefault: true,
  }));

  await Category.insertMany(categories);
};

const createCategoryForUser = async ({
  userId,
  name,
  type,
  icon,
  color,
}) => {
  const existingCategory = await Category.findOne({
    user: userId,
    name,
    type,
    isArchived: false,
  });

  if (existingCategory) {
    throw new AppError(
      "You already have an active category with this name and type",
      409,
    );
  }

  return Category.create({
    user: userId,
    name,
    type,
    icon,
    color,
    displayOrder: 999,
    isDefault: false,
  });
};

const getCategoriesForUser = async ({
  userId,
  type,
  includeArchived = false,
}) => {
  const filter = {
    user: userId,
  };

  if (type) {
    filter.type = type;
  }

  if (!includeArchived) {
    filter.isArchived = false;
  }

  return Category.find(filter).sort({
    type: 1,
    displayOrder: 1,
    name: 1,
  });
};

const getCategoryByIdForUser = async ({
  categoryId,
  userId,
  includeArchived = false,
}) => {
  ensureValidObjectId(categoryId);

  const filter = {
    _id: categoryId,
    user: userId,
  };

  if (!includeArchived) {
    filter.isArchived = false;
  }

  const category = await Category.findOne(filter);

  if (!category) {
    throw new AppError("Category not found", 404);
  }

  return category;
};

const updateCategoryForUser = async ({
  categoryId,
  userId,
  updates,
}) => {
  const category = await getCategoryByIdForUser({
    categoryId,
    userId,
  });

  if (updates.name && updates.name !== category.name) {
    const duplicate = await Category.findOne({
      user: userId,
      name: updates.name,
      type: category.type,
      isArchived: false,
      _id: {
        $ne: category._id,
      },
    });

    if (duplicate) {
      throw new AppError(
        "You already have an active category with this name and type",
        409,
      );
    }
  }

  const allowedFields = ["name", "icon", "color"];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      category[field] = updates[field];
    }
  }

  await category.save();

  return category;
};

const archiveCategoryForUser = async ({
  categoryId,
  userId,
}) => {
  const category = await getCategoryByIdForUser({
    categoryId,
    userId,
  });

  category.isArchived = true;
  await category.save();

  return category;
};

export {
  archiveCategoryForUser,
  createCategoryForUser,
  getCategoriesForUser,
  getCategoryByIdForUser,
  seedDefaultCategoriesForUser,
  updateCategoryForUser,
};