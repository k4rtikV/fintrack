import {
  getSecurityActivityForUser,
  listActiveSessionsForUser,
  recordSecurityEventSafe,
  revokeOtherSessionsForUser,
  revokeSessionForUser,
} from "../services/security.service.js";
import { clearAuthCookie } from "../utils/authCookie.js";
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

  if (revokedCurrentSession) {
    clearAuthCookie(res);
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

export {
  getSecurityActivity,
  getSessions,
  revokeOtherSessions,
  revokeSession,
};
