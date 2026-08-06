import {
  findUserById,
  registerUser,
  requestLoginOtp,
  resendLoginOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  verifyRegistrationOtp,
} from "../services/auth.service.js";

import {
  clearAuthCookie,
  setAuthCookie,
} from "../utils/authCookie.js";

import { generateAccessToken } from "../utils/jwt.js";

const register = async (req, res) => {
  const result = await registerUser(
    req.validatedData.body,
  );

  res.status(201).json({
    success: true,
    message:
      "Registration OTP sent. Verify your email to activate your account.",
    data: result,
  });
};

const verifyRegistration = async (req, res) => {
  const user = await verifyRegistrationOtp(
    req.validatedData.body,
  );

  const token = generateAccessToken(user._id);
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Email verified and account activated successfully",
    data: {
      user,
    },
  });
};

const resendRegistration = async (req, res) => {
  const result = await resendRegistrationOtp(
    req.validatedData.body,
  );

  res.status(200).json({
    success: true,
    message: "A new registration OTP has been sent",
    data: result,
  });
};

const login = async (req, res) => {
  const result = await requestLoginOtp(
    req.validatedData.body,
  );

  res.status(200).json({
    success: true,
    message: "Login OTP sent to your email address",
    data: result,
  });
};

const verifyLogin = async (req, res) => {
  const user = await verifyLoginOtp(
    req.validatedData.body,
  );

  const token = generateAccessToken(user._id);
  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Login completed successfully",
    data: {
      user,
    },
  });
};

const resendLogin = async (req, res) => {
  const result = await resendLoginOtp(
    req.validatedData.body,
  );

  res.status(200).json({
    success: true,
    message: "A new login OTP has been sent",
    data: result,
  });
};

const logout = async (req, res) => {
  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const getCurrentUser = async (req, res) => {
  const user = await findUserById(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      user,
    },
  });
};

export {
  getCurrentUser,
  login,
  logout,
  register,
  resendLogin,
  resendRegistration,
  verifyLogin,
  verifyRegistration,
};