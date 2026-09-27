import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const PIN_KEY_LENGTH = 32;
const PIN_SALT_BYTES = 16;
const PIN_SCRYPT_OPTIONS = Object.freeze({
  N: 32768,
  r: 8,
  p: 1,
  maxmem: 64 * 1024 * 1024,
});

const assertPinShape = (pin) => {
  if (!/^\d{6}$/.test(String(pin || ""))) {
    throw new TypeError("PIN must contain exactly 6 digits");
  }
};

const derivePinKey = async (pin, salt) => {
  assertPinShape(pin);

  const normalizedSalt = String(salt || "");

  if (!normalizedSalt) {
    throw new TypeError("PIN salt is required");
  }

  return scryptAsync(
    String(pin),
    Buffer.from(normalizedSalt, "base64url"),
    PIN_KEY_LENGTH,
    PIN_SCRYPT_OPTIONS,
  );
};

const createPinVerifier = async (pin) => {
  assertPinShape(pin);

  const salt = crypto.randomBytes(PIN_SALT_BYTES).toString("base64url");
  const key = await derivePinKey(pin, salt);

  return {
    salt,
    hash: Buffer.from(key).toString("base64url"),
  };
};

const verifyPinVerifier = async (pin, { hash, salt } = {}) => {
  assertPinShape(pin);

  const expected = Buffer.from(String(hash || ""), "base64url");

  if (expected.length !== PIN_KEY_LENGTH || !salt) {
    return false;
  }

  const actual = Buffer.from(await derivePinKey(pin, salt));

  return crypto.timingSafeEqual(actual, expected);
};

const calculatePinCooldownMs = (failedAttempts) => {
  const attempts = Number(failedAttempts) || 0;

  if (attempts < 5) {
    return 0;
  }

  const baseDelayMs = 30 * 1000;
  const exponent = Math.min(attempts - 5, 7);

  return Math.min(60 * 60 * 1000, baseDelayMs * 2 ** exponent);
};

const hashTrustedDeviceToken = (token) => {
  const value = String(token || "").trim();

  if (value.length < 32 || value.length > 256) {
    return "";
  }

  return crypto.createHash("sha256").update(value).digest("hex");
};

export {
  calculatePinCooldownMs,
  createPinVerifier,
  hashTrustedDeviceToken,
  verifyPinVerifier,
};
