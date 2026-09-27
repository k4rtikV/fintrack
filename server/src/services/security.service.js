import crypto from "node:crypto";

import SecurityEvent from "../models/SecurityEvent.js";
import TrustedDevice from "../models/TrustedDevice.js";
import UserSession from "../models/UserSession.js";
import AppError from "../utils/AppError.js";
import { getDeviceLabel } from "../utils/securityContext.js";
import {
  generateAccessToken,
  getAccessTokenExpiry,
} from "../utils/jwt.js";

const SESSION_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

const parsePositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getPinIdleLockMinutes = () =>
  parsePositiveInteger(process.env.PIN_IDLE_LOCK_MINUTES, 15);

const getStrongAuthMinutes = () =>
  parsePositiveInteger(process.env.PIN_STRONG_AUTH_MINUTES, 10);

const createAuthenticatedSession = async ({
  userId,
  securityContext,
  trustedDeviceId = null,
}) => {
  const sessionId = crypto.randomUUID();
  const token = generateAccessToken(userId, {
    sessionId,
  });
  const expiresAt = getAccessTokenExpiry(token);
  const now = new Date();

  const session = await UserSession.create({
    sessionId,
    user: userId,
    ...securityContext,
    expiresAt,
    trustedDevice: trustedDeviceId || null,
    appLocked: false,
    appLockedAt: null,
    strongAuthAt: now,
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

const refreshSessionAppLockState = async (session) => {
  if (!session?.sessionId || !session.trustedDevice || session.appLocked) {
    return session;
  }

  const lastSeenAt = new Date(session.lastSeenAt || session.createdAt).getTime();
  const idleMs = getPinIdleLockMinutes() * 60 * 1000;

  if (!Number.isFinite(lastSeenAt) || Date.now() - lastSeenAt < idleMs) {
    return session;
  }

  const appLockedAt = new Date();
  const result = await UserSession.updateOne(
    {
      sessionId: session.sessionId,
      user: session.user,
      trustedDevice: session.trustedDevice,
      revokedAt: null,
      appLocked: false,
    },
    {
      $set: {
        appLocked: true,
        appLockedAt,
      },
    },
  );

  if (!result.modifiedCount) {
    const latest = await UserSession.findOne({
      sessionId: session.sessionId,
      user: session.user,
      revokedAt: null,
    }).lean();

    return latest || session;
  }

  return {
    ...session,
    appLocked: true,
    appLockedAt,
  };
};

const touchSessionActivity = async (session) => {
  if (!session?.sessionId || !session.lastSeenAt || session.appLocked) {
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
      appLocked: false,
    },
    {
      $set: {
        lastSeenAt: new Date(),
      },
    },
  );
};

const isStrongAuthFresh = (session) => {
  if (!session?.strongAuthAt) {
    return false;
  }

  const age = Date.now() - new Date(session.strongAuthAt).getTime();
  return Number.isFinite(age) && age >= 0 && age <= getStrongAuthMinutes() * 60 * 1000;
};

const getSessionSecurityState = (session) => ({
  pinEnabled: Boolean(session?.trustedDevice),
  appLocked: Boolean(session?.appLocked),
  appLockedAt: session?.appLockedAt || null,
  strongAuthFresh: isStrongAuthFresh(session),
  strongAuthAt: session?.strongAuthAt || null,
  idleLockMinutes: getPinIdleLockMinutes(),
});

const markSessionStrongAuth = async ({ userId, sessionId }) => {
  const strongAuthAt = new Date();
  const session = await UserSession.findOneAndUpdate(
    {
      user: userId,
      sessionId,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: { strongAuthAt },
    },
    { new: true },
  ).lean();

  if (!session) {
    throw new AppError("This FinTrack session is no longer active", 401);
  }

  return session;
};

const markSessionLocked = async ({ userId, sessionId }) => {
  const appLockedAt = new Date();
  const session = await UserSession.findOneAndUpdate(
    {
      user: userId,
      sessionId,
      trustedDevice: { $ne: null },
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        appLocked: true,
        appLockedAt,
      },
    },
    { new: true },
  ).lean();

  if (!session) {
    throw new AppError("A 6-digit PIN is not enabled on this device", 400, {
      code: "PIN_NOT_ENABLED",
    });
  }

  return session;
};

const markSessionUnlocked = async ({ userId, sessionId }) => {
  const session = await UserSession.findOneAndUpdate(
    {
      user: userId,
      sessionId,
      trustedDevice: { $ne: null },
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $set: {
        appLocked: false,
        appLockedAt: null,
        lastSeenAt: new Date(),
      },
    },
    { new: true },
  ).lean();

  if (!session) {
    throw new AppError("A 6-digit PIN is not enabled on this device", 400, {
      code: "PIN_NOT_ENABLED",
    });
  }

  return session;
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
  pinEnabled: Boolean(session.trustedDevice),
  appLocked: Boolean(session.appLocked),
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

const normalizeTrustedDeviceIds = (trustedDeviceIds) =>
  [...new Set(
    trustedDeviceIds
      .filter(Boolean)
      .map((value) => String(value)),
  )];

const revokeTrustedDeviceIds = async (trustedDeviceIds, reason) => {
  const uniqueIds = normalizeTrustedDeviceIds(trustedDeviceIds);

  if (!uniqueIds.length) {
    return 0;
  }

  const result = await TrustedDevice.updateMany(
    {
      _id: { $in: uniqueIds },
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

const revokeTrustedDevicesIfOrphaned = async (trustedDeviceIds, reason) => {
  const uniqueIds = normalizeTrustedDeviceIds(trustedDeviceIds);

  if (!uniqueIds.length) {
    return 0;
  }

  const activeReferences = await UserSession.distinct("trustedDevice", {
    trustedDevice: { $in: uniqueIds },
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });
  const activeIds = new Set(activeReferences.map((value) => String(value)));
  const orphanedIds = uniqueIds.filter((value) => !activeIds.has(value));

  return revokeTrustedDeviceIds(orphanedIds, reason);
};

const revokeSessionForUser = async ({
  userId,
  sessionId,
  reason = "USER_REVOKED",
  revokeTrustedDevice = true,
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

  if (revokeTrustedDevice && session.trustedDevice) {
    await revokeTrustedDevicesIfOrphaned(
      [session.trustedDevice],
      "SESSION_REVOKED",
    );
  }

  return serializeSession(session.toObject(), "");
};

const revokeOtherSessionsForUser = async ({
  userId,
  currentSessionId,
}) => {
  const sessions = await UserSession.find({
    user: userId,
    sessionId: { $ne: currentSessionId },
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .select("sessionId trustedDevice")
    .lean();

  if (!sessions.length) {
    return 0;
  }

  const result = await UserSession.updateMany(
    {
      user: userId,
      sessionId: { $in: sessions.map((session) => session.sessionId) },
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
        revokeReason: "OTHER_SESSIONS_REVOKED",
      },
    },
  );

  await revokeTrustedDevicesIfOrphaned(
    sessions.map((session) => session.trustedDevice),
    "OTHER_SESSIONS_REVOKED",
  );

  return result.modifiedCount || 0;
};

const revokeAllSessionsForUser = async ({
  userId,
  reason = "PASSWORD_CHANGED",
}) => {
  const sessions = await UserSession.find({
    user: userId,
    revokedAt: null,
  })
    .select("trustedDevice")
    .lean();

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

  await revokeTrustedDeviceIds(
    sessions.map((session) => session.trustedDevice),
    "ALL_SESSIONS_REVOKED",
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
      failedAttempts: Number.isFinite(metadata.failedAttempts)
        ? metadata.failedAttempts
        : null,
      cooldownUntil: metadata.cooldownUntil || null,
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
  GOOGLE_ACCOUNT_CREATED: {
    title: "Google account created",
    description:
      "Your FinTrack account was created after Google identity verification.",
    severity: "success",
  },
  GOOGLE_SIGN_IN: {
    title: "Google sign-in",
    description:
      "A Google identity verification completed and a FinTrack session was created.",
    severity: "success",
  },
  GOOGLE_REAUTHENTICATED: {
    title: "Google identity reverified",
    description:
      "Google identity was reverified for a sensitive FinTrack security action.",
    severity: "success",
  },
  GOOGLE_ACCOUNT_LINKED: {
    title: "Google identity linked",
    description:
      "Your legacy FinTrack login was securely migrated to Google-only authentication.",
    severity: "info",
  },
  GOOGLE_LEGACY_LINK_FAILED: {
    title: "Failed Google migration attempt",
    description:
      "A one-time legacy account migration attempt failed its FinTrack password check.",
    severity: "warning",
  },
  GOOGLE_UNVERIFIED_ACCOUNT_RECLAIMED: {
    title: "Legacy registration replaced",
    description:
      "An unfinished legacy registration was replaced with an authoritative Google identity and its old local credentials were removed.",
    severity: "info",
  },
  PIN_ENROLLED: {
    title: "Quick PIN enabled",
    description:
      "A 6-digit FinTrack unlock PIN was enrolled for this trusted device.",
    severity: "success",
  },
  PIN_CHANGED: {
    title: "Quick PIN changed",
    description:
      "The 6-digit unlock PIN for this trusted device was changed.",
    severity: "info",
  },
  PIN_RESET: {
    title: "Quick PIN reset",
    description:
      "The trusted-device PIN was reset after Google reauthentication.",
    severity: "warning",
  },
  PIN_DISABLED: {
    title: "Quick PIN disabled",
    description:
      "Trusted-device PIN unlock was disabled on this device.",
    severity: "info",
  },
  PIN_UNLOCK_FAILED: {
    title: "Incorrect PIN attempt",
    description:
      "An incorrect 6-digit PIN was entered on a trusted device.",
    severity: "warning",
  },
  PIN_COOLDOWN: {
    title: "PIN cooldown activated",
    description:
      "PIN unlock was temporarily throttled after repeated incorrect attempts.",
    severity: "warning",
  },
  APP_LOCKED: {
    title: "FinTrack locked",
    description:
      "FinTrack was manually locked on this trusted device.",
    severity: "info",
  },
  TRUSTED_DEVICE_REVOKED: {
    title: "Trusted device revoked",
    description:
      "PIN trust for a device was revoked together with its session.",
    severity: "warning",
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
  getSessionSecurityState,
  isStrongAuthFresh,
  listActiveSessionsForUser,
  markSessionLocked,
  markSessionStrongAuth,
  markSessionUnlocked,
  recordSecurityEventSafe,
  refreshSessionAppLockState,
  revokeAllSessionsForUser,
  revokeOtherSessionsForUser,
  revokeSessionForUser,
  touchSessionActivity,
};
