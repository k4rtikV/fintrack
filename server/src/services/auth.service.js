import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const createUser = async ({
  fullName,
  email,
  password,
  preferredCurrency,
}) => {
  const existingUser = await User.findOne({ email });

  if (existingUser) {
    throw new AppError("An account with this email already exists", 409);
  }

  const user = await User.create({
    fullName,
    email,
    password,
    preferredCurrency,
  });

  return user;
};

const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated", 403);
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  user.lastLoginAt = new Date();
  await user.save({ validateModifiedOnly: true });

  return user;
};

const findUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User account not found", 404);
  }

  return user;
};

export { authenticateUser, createUser, findUserById };