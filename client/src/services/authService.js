import api from "../api/axios";

const getGoogleAuthConfig = async () => {
  const response = await api.get("/auth/google/config");
  return response.data;
};

const authenticateWithGoogle = async (credential) => {
  const response = await api.post("/auth/google", {
    credential,
  });

  return response.data;
};

const linkLegacyGoogleAccount = async ({ credential, password }) => {
  const response = await api.post("/auth/google/link-legacy", {
    credential,
    password,
  });

  return response.data;
};

const getCurrentUser = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};

const logout = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};

export {
  authenticateWithGoogle,
  getCurrentUser,
  getGoogleAuthConfig,
  linkLegacyGoogleAccount,
  logout,
};
