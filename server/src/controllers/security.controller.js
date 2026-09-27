import {
  changePinForSession,
  disablePinForSession,
  enrollPinForSession,
  resetPinForSession,
  verifyPinForSession,
} from "../services/pin.service.js";
import {
  getSecurityActivityForUser,
  getSessionSecurityState,
  listActiveSessionsForUser,
  markSessionLocked,
  markSessionUnlocked,
  recordSecurityEventSafe,
  revokeOtherSessionsForUser,
  revokeSessionForUser,
} from "../services/security.service.js";
import {
  clearAuthCookie,
  clearTrustedDeviceCookie,
  setTrustedDeviceCookie,
} from "../utils/authCookie.js";
import {
  getDeviceLabel,
  getRequestSecurityContext,
} from "../utils/securityContext.js";

const getSessions = async (req, res) => {
  const sessions = await listActiveSessionsForUser({
    userId: req.user._id,
    currentSessionId: req.authSession.sessionId,
  });

  res.status(200).json({
    success: true,
    data: {
      sessions,
    },
  });
};

const revokeSession = async (req, res) => {
  const { sessionId } = req.validatedData.params;
  const securityContext = getRequestSecurityContext(req);

  const revokedSession = await revokeSessionForUser({
    userId: req.user._id,
    sessionId,
  });

  const revokedCurrentSession =
    sessionId === req.authSession.sessionId;

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "SESSION_REVOKED",
    sessionId: req.authSession.sessionId,
    securityContext,
    metadata: {
      targetDeviceLabel:
        revokedSession.deviceLabel ||
        getDeviceLabel(revokedSession),
    },
  });

  if (revokedSession.pinEnabled) {
    await recordSecurityEventSafe({
      userId: req.user._id,
      type: "TRUSTED_DEVICE_REVOKED",
      sessionId: req.authSession.sessionId,
      securityContext,
      metadata: {
        targetDeviceLabel: revokedSession.deviceLabel,
      },
    });
  }

  if (revokedCurrentSession) {
    clearAuthCookie(res);
    clearTrustedDeviceCookie(res);
  }

  res.status(200).json({
    success: true,
    message: revokedCurrentSession
      ? "Current session revoked successfully"
      : "Session revoked successfully",
    data: {
      currentSessionRevoked: revokedCurrentSession,
    },
  });
};

const revokeOtherSessions = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  const revokedCount = await revokeOtherSessionsForUser({
    userId: req.user._id,
    currentSessionId: req.authSession.sessionId,
  });

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "OTHER_SESSIONS_REVOKED",
    sessionId: req.authSession.sessionId,
    securityContext,
    metadata: {
      revokedCount,
    },
  });

  res.status(200).json({
    success: true,
    message:
      revokedCount === 1
        ? "1 other session revoked"
        : `${revokedCount} other sessions revoked`,
    data: {
      revokedCount,
    },
  });
};

const getSecurityActivity = async (req, res) => {
  const activity = await getSecurityActivityForUser({
    userId: req.user._id,
    limit: req.validatedData.query.limit,
  });

  res.status(200).json({
    success: true,
    data: {
      activity,
    },
  });
};

const getPinStatus = async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      sessionSecurity: getSessionSecurityState(req.authSession),
    },
  });
};

const enrollPin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);
  const result = await enrollPinForSession({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
    pin: req.validatedData.body.pin,
    securityContext,
  });

  setTrustedDeviceCookie(res, result.deviceToken);

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "PIN_ENROLLED",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(201).json({
    success: true,
    message: "6-digit PIN enabled on this trusted device",
    data: {
      sessionSecurity: getSessionSecurityState(result.session),
    },
  });
};

const lockPin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);
  const session = await markSessionLocked({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
  });

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "APP_LOCKED",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(200).json({
    success: true,
    message: "FinTrack locked",
    data: {
      sessionSecurity: getSessionSecurityState(session),
    },
  });
};

const unlockPin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  try {
    await verifyPinForSession({
      userId: req.user._id,
      session: req.authSession,
      pin: req.validatedData.body.pin,
    });
  } catch (error) {
    const code = error?.details?.code;

    if (code === "PIN_INVALID" || code === "PIN_COOLDOWN") {
      await recordSecurityEventSafe({
        userId: req.user._id,
        type: code === "PIN_COOLDOWN" ? "PIN_COOLDOWN" : "PIN_UNLOCK_FAILED",
        sessionId: req.authSession.sessionId,
        securityContext,
        metadata: {
          failedAttempts: error?.details?.failedAttempts,
          cooldownUntil: error?.details?.cooldownUntil,
        },
      });
    }

    throw error;
  }

  const session = await markSessionUnlocked({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
  });

  res.status(200).json({
    success: true,
    message: "FinTrack unlocked",
    data: {
      sessionSecurity: getSessionSecurityState(session),
    },
  });
};

const changePin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  await changePinForSession({
    userId: req.user._id,
    session: req.authSession,
    currentPin: req.validatedData.body.currentPin,
    newPin: req.validatedData.body.newPin,
  });

  const session = await markSessionUnlocked({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
  });

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "PIN_CHANGED",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(200).json({
    success: true,
    message: "6-digit PIN changed",
    data: {
      sessionSecurity: getSessionSecurityState(session),
    },
  });
};

const resetPin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  await resetPinForSession({
    userId: req.user._id,
    session: req.authSession,
    newPin: req.validatedData.body.newPin,
  });

  const session = await markSessionUnlocked({
    userId: req.user._id,
    sessionId: req.authSession.sessionId,
  });

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "PIN_RESET",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(200).json({
    success: true,
    message: "6-digit PIN reset after Google verification",
    data: {
      sessionSecurity: getSessionSecurityState(session),
    },
  });
};

const disablePin = async (req, res) => {
  const securityContext = getRequestSecurityContext(req);

  await disablePinForSession({
    userId: req.user._id,
    session: req.authSession,
  });

  clearTrustedDeviceCookie(res);

  await recordSecurityEventSafe({
    userId: req.user._id,
    type: "PIN_DISABLED",
    sessionId: req.authSession.sessionId,
    securityContext,
  });

  res.status(200).json({
    success: true,
    message: "6-digit PIN disabled on this device",
    data: {
      sessionSecurity: getSessionSecurityState({
        ...req.authSession,
        trustedDevice: null,
        appLocked: false,
        appLockedAt: null,
      }),
    },
  });
};

export {
  changePin,
  disablePin,
  enrollPin,
  getPinStatus,
  getSecurityActivity,
  getSessions,
  lockPin,
  resetPin,
  revokeOtherSessions,
  revokeSession,
  unlockPin,
};
