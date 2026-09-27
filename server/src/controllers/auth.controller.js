import { randomBytes } from "node:crypto";

import {
  authenticateWithGoogle,
  findUserById,
  getGoogleAuthConfig,
  linkLegacyAccountWithGoogle,
  reauthenticateCurrentUserWithGoogle,
} from "../services/auth.service.js";
import { sendLoginAlertEmail } from "../services/email.service.js";
import {
  createAuthenticatedSession,
  getSessionSecurityState,
  markSessionStrongAuth,
  recordSecurityEventSafe,
  revokeAllSessionsForUser,
  revokeSessionForUser,
} from "../services/security.service.js";
import { resolveTrustedDeviceFromCookie } from "../services/pin.service.js";
import {
  GOOGLE_NONCE_COOKIE_NAME,
  TRUSTED_DEVICE_COOKIE_NAME,
  clearAuthCookie,
  clearGoogleNonceCookie,
  clearTrustedDeviceCookie,
  setAuthCookie,
  setGoogleNonceCookie,
} from "../utils/authCookie.js";
import { getRequestSecurityContext } from "../utils/securityContext.js";

const googleConfig = async (req, res) => {
  const nonce = randomBytes(32).toString("base64url");

  setGoogleNonceCookie(res, nonce);

  res.status(200).json({
    success: true,
    data: {
      ...getGoogleAuthConfig(),
      nonce,
    },
  });
};

const sendLoginAlertSafe = ({ user, securityContext, loginAt }) => {
  void sendLoginAlertEmail({
    user,
    securityContext,
    loginAt,
  }).catch((error) => {
    console.error(
      "Could not send FinTrack login security alert:",
      error.message,
    );
  });
};

const completeGoogleSession = async ({
  req,
  res,
  user,
  securityContext,
  securityEventType,
  revokeExistingSessions = false,
  revokeReason = "GOOGLE_IDENTITY_MIGRATION",
}) => {
  if (revokeExistingSessions) {
    await revokeAllSessionsForUser({
      userId: user._id,
      reason: revokeReason,
    });
  }

  const trustedDevice = await resolveTrustedDeviceFromCookie({
    userId: user._id,
    deviceToken: req.cookies?.[TRUSTED_DEVICE_COOKIE_NAME],
  });

  if (req.cookies?.[TRUSTED_DEVICE_COOKIE_NAME] && !trustedDevice) {
    clearTrustedDeviceCookie(res);
  }

  const { token, session } = await createAuthenticatedSession({
    userId: user._id,
    securityContext,
    trustedDeviceId: trustedDevice?._id || null,
  });

  setAuthCookie(res, token);
  clearGoogleNonceCookie(res);

  await recordSecurityEventSafe({
    userId: user._id,
    type: securityEventType,
    sessionId: session.sessionId,
    securityContext,
  });

  sendLoginAlertSafe({
    user,
    securityContext,
    loginAt: new Date(),
  });

  return session;
};

const googleAuthenticate = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);
  const result = await authenticateWithGoogle(
    req.validatedData.body,
    {
      expectedNonce: req.cookies?.[GOOGLE_NONCE_COOKIE_NAME],
    },
  );

  await completeGoogleSession({
    req,
    res,
    user: result.user,
    securityContext,
    securityEventType: result.securityEventType,
    revokeExistingSessions: result.revokeExistingSessions,
    revokeReason: "GOOGLE_ACCOUNT_RECLAIMED",
  });

  const message =
    result.securityEventType === "GOOGLE_ACCOUNT_CREATED"
      ? "FinTrack account created with Google"
      : result.securityEventType === "GOOGLE_UNVERIFIED_ACCOUNT_RECLAIMED"
        ? "Google identity verified and unfinished legacy registration replaced securely"
        : "Signed in with Google";

  res.status(200).json({
    success: true,
    message,
    data: {
      user: result.user,
    },
  });
};

const linkLegacyGoogle = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);
  const user = await linkLegacyAccountWithGoogle(
    req.validatedData.body,
    securityContext,
    {
      expectedNonce: req.cookies?.[GOOGLE_NONCE_COOKIE_NAME],
    },
  );

  await completeGoogleSession({
    req,
    res,
    user,
    securityContext,
    securityEventType: "GOOGLE_ACCOUNT_LINKED",
    revokeExistingSessions: true,
    revokeReason: "GOOGLE_ACCOUNT_LINKED",
  });

  res.status(200).json({
    success: true,
    message:
      "Google sign-in is now your FinTrack login. Legacy password and OTP credentials were removed.",
    data: {
      user,
    },
  });
};

const logout = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  await revokeSessionForUser({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
    reason: "LOGOUT",
    revokeTrustedDevice: false,
  });

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "LOGOUT",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  clearAuthCookie(res);

  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

const googleReauthenticate = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  await reauthenticateCurrentUserWithGoogle(
    req.user._id,
    req.validatedData.body,
    {
      expectedNonce: req.cookies?.[GOOGLE_NONCE_COOKIE_NAME],
    },
  );

  const session = await markSessionStrongAuth({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
  });

  clearGoogleNonceCookie(res);

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "GOOGLE_REAUTHENTICATED",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(200).json({
    success: true,
    message: "Google identity reverified",
    data: {
      sessionSecurity: getSessionSecurityState(session),
    },
  });
};

const getCurrentUser = async (req, res) => {
  const user = await findUserById(req.user._id);

  res.status(200).json({
    success: true,
    data: {
      user,
      sessionSecurity: getSessionSecurityState(req.authSession),
    },
  });
};

export {
  getCurrentUser,
  googleAuthenticate,
  googleConfig,
  googleReauthenticate,
  linkLegacyGoogle,
  logout,
};
