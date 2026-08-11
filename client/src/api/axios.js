import axios from "axios";

import { announceAuthSessionInvalidated } from "../utils/authEvents";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000/api",

  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },

  timeout: 15000,
});

const publicAuthPaths = [
  "/auth/register",
  "/auth/verify-registration-otp",
  "/auth/resend-registration-otp",
  "/auth/login",
  "/auth/verify-login-otp",
  "/auth/resend-login-otp",
];

const isPublicAuthRequest = (url = "") =>
  publicAuthPaths.some(
    (path) => url === path || url.startsWith(`${path}?`),
  );

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isPublicAuthRequest(error.config?.url)
    ) {
      announceAuthSessionInvalidated();
    }

    return Promise.reject(error);
  },
);

export default api;
