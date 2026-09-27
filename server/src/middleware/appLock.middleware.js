import AppError from "../utils/AppError.js";
import { isStrongAuthFresh } from "../services/security.service.js";

const requireAppUnlocked = (req, res, next) => {
  if (req.authSession?.appLocked) {
    next(
      new AppError(
        "FinTrack is locked on this device. Enter your 6-digit PIN to continue.",
        423,
        {
          code: "PIN_LOCKED",
        },
      ),
    );
    return;
  }

  next();
};

const requireRecentStrongAuth = (req, res, next) => {
  if (!isStrongAuthFresh(req.authSession)) {
    next(
      new AppError(
        "Verify your Google identity again before changing PIN security settings.",
        403,
        {
          code: "GOOGLE_REAUTH_REQUIRED",
        },
      ),
    );
    return;
  }

  next();
};

export {
  requireAppUnlocked,
  requireRecentStrongAuth,
};
