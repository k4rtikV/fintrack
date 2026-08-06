import api from "../api/axios";

const register = async (formData) => {
  const response = await api.post("/auth/register", formData);
  return response.data;
};

const verifyRegistrationOtp = async ({ email, otp }) => {
  const response = await api.post(
    "/auth/verify-registration-otp",
    {
      email,
      otp,
    },
  );

  return response.data;
};

const resendRegistrationOtp = async (email) => {
  const response = await api.post(
    "/auth/resend-registration-otp",
    {
      email,
    },
  );

  return response.data;
};

const login = async (credentials) => {
  const response = await api.post("/auth/login", credentials);
  return response.data;
};

const verifyLoginOtp = async ({ email, otp }) => {
  const response = await api.post("/auth/verify-login-otp", {
    email,
    otp,
  });

  return response.data;
};

const resendLoginOtp = async (email) => {
  const response = await api.post("/auth/resend-login-otp", {
    email,
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
  getCurrentUser,
  login,
  logout,
  register,
  resendLoginOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  verifyRegistrationOtp,
};