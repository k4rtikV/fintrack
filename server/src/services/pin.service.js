import crypto from "node:crypto";

import TrustedDevice from "../models/TrustedDevice.js";
import UserSession from "../models/UserSession.js";
import AppError from "../utils/AppError.js";
import {
  calculatePinCooldownMs,
  createPinVerifier,
  hashTrustedDeviceToken,
  verifyPinVerifier,
} from "../utils/pinSecurity.js";

const TRUSTED_DEVICE_LIFETIME_MS = 90 * 24 * 60 * 60 * 1000;

const getActiveTrustedDeviceForSession = async ({
  userId,
  session,
  includeVerifier = false,
}) => {
  const trustedDeviceId = session?.trustedDevice;

  if (!trustedDeviceId) {
    return null;
  }

  const query = TrustedDevice.findOne({
    _id: trustedDeviceId,
    user: userId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (includeVerifier) {
    query.select("+pinHash +pinSalt +deviceKeyHash");
  }

  return query;
};

const resolveTrustedDeviceFromCookie = async ({
  userId,
  deviceToken,
}) => {
  const deviceKeyHash = hashTrustedDeviceToken(deviceToken);

  if (!deviceKeyHash) {
    return null;
  }

  const trustedDevice = await TrustedDevice.findOne({
    user: userId,
    deviceKeyHash,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!trustedDevice) {
    return null;
  }

  trustedDevice.lastSeenAt = new Date();
  await trustedDevice.save({ validateModifiedOnly: true });

  return trustedDevice;
};

const enrollPinForSession = async ({
  userId,
  sessionId,
  pin,
  securityContext = {},
}) => {
  const session = await UserSession.findOne({
    user: userId,
    sessionId,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!session) {
    throw new AppError("This FinTrack session is no longer active", 401);
  }

  if (session.trustedDevice) {
    throw new AppError("A 6-digit PIN is already enabled on this device", 409, {
      code: "PIN_ALREADY_ENABLED",
    });
  }

  const deviceToken = crypto.randomBytes(32).toString("base64url");
  const deviceKeyHash = hashTrustedDeviceToken(deviceToken);
  const verifier = await createPinVerifier(pin);
  const now = new Date();

  const trustedDevice = await TrustedDevice.create({
    user: userId,
    deviceKeyHash,
    pinHash: verifier.hash,
    pinSalt: verifier.salt,
    browser: securityContext.browser || session.browser,
    os: securityContext.os || session.os,
    deviceType: securityContext.deviceType || session.deviceType,
    failedAttempts: 0,
    cooldownUntil: null,
    enrolledAt: now,
    lastUnlockedAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_LIFETIME_MS),
  });

  session.trustedDevice = trustedDevice._id;
  session.appLocked = false;
  session.appLockedAt = null;
  session.lastSeenAt = now;
  await session.save({ validateModifiedOnly: true });

  return {
    trustedDevice,
    deviceToken,
    session: session.toObject(),
  };
};

const registerPinFailure = async (trustedDevice) => {
  const updated = await TrustedDevice.findOneAndUpdate(
    {
      _id: trustedDevice._id,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    },
    {
      $inc: { failedAttempts: 1 },
      $set: { lastSeenAt: new Date() },
    },
    { new: true },
  ).lean();

  if (!updated) {
    throw new AppError("This trusted-device PIN is no longer active", 403, {
      code: "PIN_NOT_ENABLED",
    });
  }

  const cooldownMs = calculatePinCooldownMs(updated.failedAttempts);
  let cooldownUntil = null;

  if (cooldownMs > 0) {
    const requestedCooldownUntil = new Date(Date.now() + cooldownMs);
    const cooldownDevice = await TrustedDevice.findOneAndUpdate(
      { _id: updated._id, revokedAt: null },
      { $max: { cooldownUntil: requestedCooldownUntil } },
      { new: true },
    ).lean();

    cooldownUntil = cooldownDevice?.cooldownUntil || requestedCooldownUntil;
  }

  return {
    failedAttempts: updated.failedAttempts,
    cooldownUntil,
  };
};

const verifyPinForSession = async ({
  userId,
  session,
  pin,
}) => {
  const trustedDevice = await getActiveTrustedDeviceForSession({
    userId,
    session,
    includeVerifier: true,
  });

  if (!trustedDevice) {
    throw new AppError("A 6-digit PIN is not enabled on this device", 400, {
      code: "PIN_NOT_ENABLED",
    });
  }

  if (
    trustedDevice.cooldownUntil &&
    trustedDevice.cooldownUntil.getTime() > Date.now()
  ) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((trustedDevice.cooldownUntil.getTime() - Date.now()) / 1000),
    );

    throw new AppError(
      "Too many incorrect PIN attempts. Try again after the cooldown.",
      429,
      {
        code: "PIN_COOLDOWN",
        retryAfterSeconds,
        cooldownUntil: trustedDevice.cooldownUntil,
      },
    );
  }

  const matches = await verifyPinVerifier(pin, {
    hash: trustedDevice.pinHash,
    salt: trustedDevice.pinSalt,
  });

  if (!matches) {
    const failure = await registerPinFailure(trustedDevice);

    if (failure.cooldownUntil) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((failure.cooldownUntil.getTime() - Date.now()) / 1000),
      );

      throw new AppError(
        "Too many incorrect PIN attempts. PIN unlock is temporarily throttled.",
        429,
        {
          code: "PIN_COOLDOWN",
          failedAttempts: failure.failedAttempts,
          retryAfterSeconds,
          cooldownUntil: failure.cooldownUntil,
        },
      );
    }

    throw new AppError("Incorrect 6-digit PIN", 403, {
      code: "PIN_INVALID",
      failedAttempts: failure.failedAttempts,
    });
  }

  const now = new Date();
  await TrustedDevice.updateOne(
    { _id: trustedDevice._id, revokedAt: null },
    {
      $set: {
        failedAttempts: 0,
        cooldownUntil: null,
        lastUnlockedAt: now,
        lastSeenAt: now,
      },
    },
  );

  return trustedDevice;
};

const changePinForSession = async ({
  userId,
  session,
  currentPin,
  newPin,
}) => {
  const trustedDevice = await verifyPinForSession({
    userId,
    session,
    pin: currentPin,
  });
  const verifier = await createPinVerifier(newPin);

  await TrustedDevice.updateOne(
    { _id: trustedDevice._id, user: userId, revokedAt: null },
    {
      $set: {
        pinHash: verifier.hash,
        pinSalt: verifier.salt,
        failedAttempts: 0,
        cooldownUntil: null,
        lastUnlockedAt: new Date(),
      },
    },
  );

  return trustedDevice;
};

const resetPinForSession = async ({
  userId,
  session,
  newPin,
}) => {
  const trustedDevice = await getActiveTrustedDeviceForSession({
    userId,
    session,
    includeVerifier: false,
  });

  if (!trustedDevice) {
    throw new AppError("A 6-digit PIN is not enabled on this device", 400, {
      code: "PIN_NOT_ENABLED",
    });
  }

  const verifier = await createPinVerifier(newPin);
  const now = new Date();

  await TrustedDevice.updateOne(
    { _id: trustedDevice._id, user: userId, revokedAt: null },
    {
      $set: {
        pinHash: verifier.hash,
        pinSalt: verifier.salt,
        failedAttempts: 0,
        cooldownUntil: null,
        lastUnlockedAt: now,
        lastSeenAt: now,
      },
    },
  );

  return trustedDevice;
};

const disablePinForSession = async ({
  userId,
  session,
}) => {
  const trustedDevice = await getActiveTrustedDeviceForSession({
    userId,
    session,
    includeVerifier: false,
  });

  if (!trustedDevice) {
    throw new AppError("A 6-digit PIN is not enabled on this device", 400, {
      code: "PIN_NOT_ENABLED",
    });
  }

  const now = new Date();

  await Promise.all([
    TrustedDevice.updateOne(
      { _id: trustedDevice._id, user: userId, revokedAt: null },
      {
        $set: {
          revokedAt: now,
          revokeReason: "PIN_DISABLED",
        },
      },
    ),
    UserSession.updateMany(
      {
        user: userId,
        trustedDevice: trustedDevice._id,
        revokedAt: null,
      },
      {
        $set: {
          trustedDevice: null,
          appLocked: false,
          appLockedAt: null,
        },
      },
    ),
  ]);

  return trustedDevice;
};

export {
  changePinForSession,
  disablePinForSession,
  enrollPinForSession,
  resetPinForSession,
  resolveTrustedDeviceFromCookie,
  verifyPinForSession,
};
