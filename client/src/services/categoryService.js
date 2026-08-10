import api from "../api/axios";

const getCategories = async ({ type, includeArchived = false } = {}) => {
  const params = {};
  if (type && type !== "ALL") params.type = type;
  if (includeArchived) params.includeArchived = true;

  const response = await api.get("/categories", { params });
  return response.data.data.categories;
};

const createCategory = async (payload) => {
  const response = await api.post("/categories", payload);
  return response.data.data.category;
};

const updateCategory = async ({ categoryId, payload }) => {
  const response = await api.patch(`/categories/${categoryId}`, payload);
  return response.data.data.category;
};

const archiveCategory = async (categoryId) => {
  const response = await api.patch(`/categories/${categoryId}/archive`);
  return response.data.data.category;
};

export { archiveCategory, createCategory, getCategories, updateCategory };
