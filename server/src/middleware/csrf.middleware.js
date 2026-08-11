import {
  getAllowedClientOrigins,
  normalizeClientOrigin,
} from "../config/clientOrigins.js";
import { AUTH_COOKIE_NAME } from "../utils/authCookie.js";
import AppError from "../utils/AppError.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const getRequestSourceOrigin = (req) => {
  const origin = normalizeClientOrigin(req.get("origin"));

  if (origin) {
    return origin;
  }

  const referer = req.get("referer");

  if (!referer) {
    return "";
  }

  try {
    return normalizeClientOrigin(new URL(referer).origin);
  } catch {
    return "";
  }
};

const protectCookieAuthenticatedMutation = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  // Bearer-token-only callers are not vulnerable to browser cookie CSRF.
  const hasAuthCookie = Boolean(req.cookies?.[AUTH_COOKIE_NAME]);

  if (!hasAuthCookie) {
    return next();
  }

  const sourceOrigin = getRequestSourceOrigin(req);

  if (!sourceOrigin && process.env.NODE_ENV !== "production") {
    return next();
  }

  if (getAllowedClientOrigins().includes(sourceOrigin)) {
    return next();
  }

  return next(
    new AppError(
      "This request did not originate from an approved FinTrack client",
      403,
    ),
  );
};

export default protectCookieAuthenticatedMutation;
