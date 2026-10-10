import api from "../api/axios";

const uploadStatement = async (file) => {
  const format = file.name.toLowerCase().endsWith(".xlsx") ? "xlsx"
    : file.name.toLowerCase().endsWith(".csv") ? "csv" : "";
  if (!format || file.size > 3 * 1024 * 1024 || !file.size) {
    throw new Error("Choose a nonempty .csv or .xlsx file of at most 3 MB");
  }
  const response = await api.post("/statement-imports/preview", await file.arrayBuffer(), {
    headers: {
      "Content-Type": "application/octet-stream",
      "x-statement-format": format,
      "x-statement-name": encodeURIComponent(file.name),
    },
    timeout: 45000,
  });
  return response.data.data;
};
const prepareStatement = async (data) =>
  (await api.post("/statement-imports/prepare", data, { timeout: 45000 })).data.data;
const commitStatement = async (data) =>
  (await api.post("/statement-imports/commit", data, { timeout: 120000 })).data;
const getImportHistory = async () =>
  (await api.get("/statement-imports/history")).data.data.batches;
export { uploadStatement, prepareStatement, commitStatement, getImportHistory };
