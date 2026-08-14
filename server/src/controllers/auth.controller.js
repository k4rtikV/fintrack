import {
  findUserById,
  registerUser,
  requestLoginOtp,
  resendLoginOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  verifyRegistrationOtp,
} from "../services/auth.service.js";
import { sendLoginAlertEmail } from "../services/email.service.js";
import {
  createAuthenticatedSession,
  recordSecurityEventSafe,
  revokeSessionForUser,
} from "../services/security.service.js";

import {
  clearAuthCookie,
  setAuthCookie,
} from "../utils/authCookie.js";
import { getRequestSecurityContext } from "../utils/securityContext.js";

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
  const securityContext = getRequestSecurityContext(req);
  const { token, session } = await createAuthenticatedSession({
    userId: user._id,
    securityContext,
  });

  setAuthCookie(res, token);

  await recordSecurityEventSafe({
    userId: user._id,
    type: "REGISTRATION_SUCCESS",
    sessionId: session.sessionId,
    securityContext,
  });

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
  const securityContext = getRequestSecurityContext(req);
  const result = await requestLoginOtp(
    req.validatedData.body,
    securityContext,
  );

  res.status(200).json({
    success: true,
    message: "Login OTP sent to your email address",
    data: result,
  });
};

const verifyLogin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);
  const user = await verifyLoginOtp(
    req.validatedData.body,
    securityContext,
  );
  const loginAt = new Date();
  const { token, session } = await createAuthenticatedSession({
    userId: user._id,
    securityContext,
  });

  setAuthCookie(res, token);

  await recordSecurityEventSafe({
    userId: user._id,
    type: "LOGIN_SUCCESS",
    sessionId: session.sessionId,
    securityContext,
  });

  // A security alert should not prevent a valid login if the email
  // provider is temporarily unavailable.
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
  const securityContext = getRequestSecurityContext(req);

  await revokeSessionForUser({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
    reason: "LOGOUT",
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
