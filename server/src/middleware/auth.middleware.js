import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import { verifyAccessToken } from "../utils/jwt.js";

const protect = async (req, res, next) => {
  try {
    let token = req.cookies[AUTH_COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      throw new AppError("Authentication is required", 401);
    }

    const decoded = verifyAccessToken(token);

    const user = await User.findById(decoded.sub);

    if (!user || !user.isActive) {
      throw new AppError("The account associated with this session was not found", 401);
    }

    if (!user.emailVerified) {
      throw new AppError(
        "Email verification is required",403,);
    }

    if (
      user.passwordChangedAt &&
      decoded.iat * 1000 < user.passwordChangedAt.getTime()
    ) {
      throw new AppError(
        "Your password changed after this session began. Please log in again.",
        401,
      );
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return next(
        new AppError("Your session is invalid or has expired", 401),
      );
    }

    next(error);
  }
};

export default protect;