import {
  authenticateUser,
  createUser,
  findUserById,
} from "../services/auth.service.js";

import {
  clearAuthCookie,
  setAuthCookie,
} from "../utils/authCookie.js";

import { generateAccessToken } from "../utils/jwt.js";

const register = async (req, res) => {
  const {
    fullName,
    email,
    password,
    preferredCurrency,
  } = req.validatedData.body;

  const user = await createUser({
    fullName,
    email,
    password,
    preferredCurrency,
  });

  const token = generateAccessToken(user._id);

  setAuthCookie(res, token);

  res.status(201).json({
    success: true,
    message: "Account created successfully",
    data: {
      user,
    },
  });
};

const login = async (req, res) => {
  const { email, password } = req.validatedData.body;

  const user = await authenticateUser({
    email,
    password,
  });

  const token = generateAccessToken(user._id);

  setAuthCookie(res, token);

  res.status(200).json({
    success: true,
    message: "Logged in successfully",
    data: {
      user,
    },
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

export { getCurrentUser, login, logout, register };