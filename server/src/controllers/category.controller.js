import {
  archiveCategoryForUser,
  createCategoryForUser,
  getCategoriesForUser,
  getCategoryByIdForUser,
  updateCategoryForUser,
} from "../services/category.service.js";

const createCategory = async (req, res) => {
  const category = await createCategoryForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: {
      category,
    },
  });
};

const getCategories = async (req, res) => {
  const type = req.query.type?.toUpperCase();

  const categories = await getCategoriesForUser({
    userId: req.user._id,
    type,
    includeArchived: req.query.includeArchived === "true",
  });

  res.status(200).json({
    success: true,
    results: categories.length,
    data: {
      categories,
    },
  });
};

const getCategory = async (req, res) => {
  const category = await getCategoryByIdForUser({
    categoryId: req.validatedData.params.categoryId,
    userId: req.user._id,
    includeArchived: true,
  });

  res.status(200).json({
    success: true,
    data: {
      category,
    },
  });
};

const updateCategory = async (req, res) => {
  const category = await updateCategoryForUser({
    categoryId: req.validatedData.params.categoryId,
    userId: req.user._id,
    updates: req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: {
      category,
    },
  });
};

const archiveCategory = async (req, res) => {
  const category = await archiveCategoryForUser({
    categoryId: req.validatedData.params.categoryId,
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    message: "Category archived successfully",
    data: {
      category,
    },
  });
};

export {
  archiveCategory,
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
};