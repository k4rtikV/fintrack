import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
} from "../utils/authCookie.js";
import { verifyAccessToken } from "../utils/jwt.js";
import {
  findActiveSession,
  touchSessionActivity,
} from "../services/security.service.js";

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

    if (!decoded.sid) {
      throw new AppError(
        "Your session was created before FinTrack session management was enabled. Please log in again.",
        401,
      );
    }

    const [user, session] = await Promise.all([
      User.findById(decoded.sub),
      findActiveSession({
        userId: decoded.sub,
        sessionId: decoded.sid,
      }),
    ]);

    if (!user || !user.isActive) {
      throw new AppError(
        "The account associated with this session was not found",
        401,
      );
    }

    if (!session) {
      throw new AppError(
        "Your session has been revoked or has expired. Please log in again.",
        401,
      );
    }

    if (!user.emailVerified) {
      throw new AppError("Email verification is required", 403);
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
    req.authSession = session;

    void touchSessionActivity(session).catch((error) => {
      console.error(
        "Could not update FinTrack session activity:",
        error.message,
      );
    });

    next();
  } catch (error) {
    let normalizedError = error;

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      normalizedError = new AppError(
        "Your session is invalid or has expired",
        401,
      );
    }

    if (normalizedError.statusCode === 401) {
      clearAuthCookie(res);
    }

    next(normalizedError);
  }
};

export default protect;
