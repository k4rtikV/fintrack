const normalizeClientOrigin = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");

const getAllowedClientOrigins = () => {
  const configured = String(process.env.CLIENT_URL || "")
    .split(",")
    .map(normalizeClientOrigin)
    .filter(Boolean);

  if (configured.length) {
    return [...new Set(configured)];
  }

  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ];
};

const getPrimaryClientUrl = () =>
  getAllowedClientOrigins()[0] || "http://localhost:5173";

export {
  getAllowedClientOrigins,
  getPrimaryClientUrl,
  normalizeClientOrigin,
};
