import crypto from "node:crypto";

import SecurityEvent from "../models/SecurityEvent.js";
import UserSession from "../models/UserSession.js";
import AppError from "../utils/AppError.js";
import { getDeviceLabel } from "../utils/securityContext.js";
import {
  generateAccessToken,
  getAccessTokenExpiry,
} from "../utils/jwt.js";

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const createAuthenticatedSession = async ({
  userId,
  securityContext,
}) => {
  const sessionId = crypto.randomUUID();
  const token = generateAccessToken(userId, {
    sessionId,
  });
  const expiresAt = getAccessTokenExpiry(token);

  const session = await UserSession.create({
    sessionId,
    user: userId,
    ...securityContext,
    expiresAt,
  });

  return {
    token,
    session,
  };
};

const findActiveSession = async ({
  userId,
  sessionId,
}) => {
  if (!sessionId) {
    return null;
  }

  return UserSession.findOne({
    sessionId,
    user: userId,
    revokedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  }).lean();
};

const touchSessionActivity = async (session) => {
  if (!session?.sessionId || !session.lastSeenAt) {
    return;
  }

  const elapsed =
    Date.now() - new Date(session.lastSeenAt).getTime();

  if (elapsed < SESSION_TOUCH_INTERVAL_MS) {
    return;
  }

  await UserSession.updateOne(
    {
      sessionId: session.sessionId,
      revokedAt: null,
    },
    {
      $set: {
        lastSeenAt: new Date(),
      },
    },
  );
};

const serializeSession = (session, currentSessionId) => ({
  id: session.sessionId,
  current: session.sessionId === currentSessionId,
  deviceType: session.deviceType,
  browser: session.browser,
  os: session.os,
  deviceLabel: getDeviceLabel(session),
  ipAddress: session.ipAddress,
  createdAt: session.createdAt,
  lastSeenAt: session.lastSeenAt,
  expiresAt: session.expiresAt,
});

const listActiveSessionsForUser = async ({
  userId,
  currentSessionId,
}) => {
  const sessions = await UserSession.find({
    user: userId,
    revokedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  })
    .sort({
      lastSeenAt: -1,
      createdAt: -1,
    })
    .lean();

  return sessions.map((session) =>
    serializeSession(session, currentSessionId),
  );
};

const revokeSessionForUser = async ({
  userId,
  sessionId,
  reason = "USER_REVOKED",
}) => {
  const session = await UserSession.findOne({
    user: userId,
    sessionId,
    revokedAt: null,
    expiresAt: {
      $gt: new Date(),
    },
  });

  if (!session) {
    throw new AppError(
      "That session is no longer active",
      404,
    );
  }

  session.revokedAt = new Date();
  session.revokeReason = reason;

  await session.save({
    validateModifiedOnly: true,
  });

  return serializeSession(session.toObject(), "");
};

const revokeOtherSessionsForUser = async ({
  userId,
  currentSessionId,
}) => {
  const result = await UserSession.updateMany(
    {
      user: userId,
      sessionId: {
        $ne: currentSessionId,
      },
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: "OTHER_SESSIONS_REVOKED",
      },
    },
  );

  return result.modifiedCount || 0;
};

const revokeAllSessionsForUser = async ({
  userId,
  reason = "PASSWORD_CHANGED",
}) => {
  const result = await UserSession.updateMany(
    {
      user: userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: reason,
      },
    },
  );

  return result.modifiedCount || 0;
};

const recordSecurityEvent = async ({
  userId,
  type,
  sessionId = null,
  securityContext = {},
  metadata = {},
}) =>
  SecurityEvent.create({
    user: userId,
    type,
    sessionId,
    ipAddress: securityContext.ipAddress || "Unknown",
    userAgent: securityContext.userAgent || "Unknown",
    browser: securityContext.browser || "Unknown browser",
    os: securityContext.os || "Unknown OS",
    deviceType: securityContext.deviceType || "Desktop",
    metadata: {
      targetDeviceLabel: String(
        metadata.targetDeviceLabel || "",
      ).slice(0, 180),
      revokedCount: Number.isFinite(metadata.revokedCount)
        ? metadata.revokedCount
        : null,
    },
  });

const recordSecurityEventSafe = async (payload) => {
  try {
    return await recordSecurityEvent(payload);
  } catch (error) {
    console.error(
      "Could not record FinTrack security event:",
      error.message,
    );

    return null;
  }
};

const eventPresentation = {
  REGISTRATION_SUCCESS: {
    title: "Account verified",
    description:
      "Your email was verified and a new FinTrack session was created.",
    severity: "success",
  },
  LOGIN_SUCCESS: {
    title: "Successful login",
    description:
      "A password and email OTP login completed successfully.",
    severity: "success",
  },
  LOGIN_PASSWORD_FAILED: {
    title: "Failed password attempt",
    description:
      "A login attempt used an incorrect password for your account.",
    severity: "warning",
  },
  LOGIN_OTP_FAILED: {
    title: "Failed login OTP",
    description:
      "An incorrect login verification code was submitted.",
    severity: "warning",
  },
  PASSWORD_CHANGED: {
    title: "Password changed",
    description:
      "Your password was changed and all existing sessions were revoked.",
    severity: "info",
  },
  SESSION_REVOKED: {
    title: "Session revoked",
    description:
      "An active device session was revoked from Security settings.",
    severity: "info",
  },
  OTHER_SESSIONS_REVOKED: {
    title: "Other sessions revoked",
    description:
      "All active sessions except the current device were revoked.",
    severity: "info",
  },
  LOGOUT: {
    title: "Logged out",
    description:
      "A FinTrack session was ended normally.",
    severity: "info",
  },
};

const serializeSecurityEvent = (event) => {
  const presentation =
    eventPresentation[event.type] ||
    {
      title: "Security activity",
      description: "Security-related account activity was recorded.",
      severity: "info",
    };

  return {
    id: event._id.toString(),
    type: event.type,
    ...presentation,
    deviceType: event.deviceType,
    browser: event.browser,
    os: event.os,
    deviceLabel: getDeviceLabel(event),
    ipAddress: event.ipAddress,
    createdAt: event.createdAt,
    metadata: event.metadata || {},
  };
};

const getSecurityActivityForUser = async ({
  userId,
  limit = 20,
}) => {
  const events = await SecurityEvent.find({
    user: userId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(limit)
    .lean();

  return events.map(serializeSecurityEvent);
};

export {
  createAuthenticatedSession,
  findActiveSession,
  getSecurityActivityForUser,
  listActiveSessionsForUser,
  recordSecurityEventSafe,
  revokeAllSessionsForUser,
  revokeOtherSessionsForUser,
  revokeSessionForUser,
  touchSessionActivity,
};
