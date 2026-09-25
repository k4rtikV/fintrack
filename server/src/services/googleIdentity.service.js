import jwt from "jsonwebtoken";
import { createPublicKey, timingSafeEqual } from "node:crypto";

import AppError from "../utils/AppError.js";

const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = [
  "accounts.google.com",
  "https://accounts.google.com",
];
const DEFAULT_JWKS_CACHE_MS = 60 * 60 * 1000;
const MIN_JWKS_CACHE_MS = 60 * 1000;
const MAX_JWKS_CACHE_MS = 24 * 60 * 60 * 1000;
const GOOGLE_TOKEN_MAX_LENGTH = 16_384;

let cachedJwks = null;
let jwksExpiresAt = 0;
let jwksRequestPromise = null;

const getGoogleClientId = () => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || "").trim();

  if (!clientId) {
    throw new AppError("Google authentication is not configured", 503);
  }

  return clientId;
};

const parseCacheDuration = (cacheControl) => {
  const match = String(cacheControl || "").match(/max-age=(\d+)/i);

  if (!match) {
    return DEFAULT_JWKS_CACHE_MS;
  }

  const milliseconds = Number(match[1]) * 1000;

  if (!Number.isFinite(milliseconds)) {
    return DEFAULT_JWKS_CACHE_MS;
  }

  return Math.min(
    MAX_JWKS_CACHE_MS,
    Math.max(MIN_JWKS_CACHE_MS, milliseconds),
  );
};

const fetchGoogleJwks = async ({ force = false } = {}) => {
  if (!force && cachedJwks && Date.now() < jwksExpiresAt) {
    return cachedJwks;
  }

  if (!force && jwksRequestPromise) {
    return jwksRequestPromise;
  }

  const request = (async () => {
    const response = await fetch(GOOGLE_JWKS_URL, {
      headers: {
        accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`Google JWKS request failed with ${response.status}`);
    }

    const payload = await response.json();

    if (!Array.isArray(payload?.keys) || payload.keys.length === 0) {
      throw new Error("Google JWKS response did not contain signing keys");
    }

    cachedJwks = payload.keys;
    jwksExpiresAt =
      Date.now() + parseCacheDuration(response.headers.get("cache-control"));

    return cachedJwks;
  })();

  jwksRequestPromise = request;

  try {
    return await request;
  } finally {
    if (jwksRequestPromise === request) {
      jwksRequestPromise = null;
    }
  }
};

const decodeGoogleTokenHeader = (credential) => {
  const header = jwt.decode(credential, {
    complete: true,
  })?.header;

  if (
    !header ||
    header.alg !== "RS256" ||
    typeof header.kid !== "string" ||
    !header.kid
  ) {
    throw new AppError("Google sign-in credential is invalid", 401);
  }

  return header;
};

const findSigningKey = async (kid) => {
  let keys = await fetchGoogleJwks();
  let key = keys.find((candidate) => candidate.kid === kid);

  if (!key) {
    // Google rotates signing keys. Refresh once when a token references a key
    // that is not in the current cached set.
    keys = await fetchGoogleJwks({ force: true });
    key = keys.find((candidate) => candidate.kid === kid);
  }

  if (!key) {
    throw new AppError("Google sign-in credential is invalid", 401);
  }

  if (
    key.kty !== "RSA" ||
    (key.use && key.use !== "sig") ||
    (key.alg && key.alg !== "RS256")
  ) {
    throw new AppError("Google sign-in credential is invalid", 401);
  }

  return key;
};


const secureStringEquals = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (!leftBuffer.length || leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
};

const normalizeGooglePayload = (payload) => {
  const subject = String(payload?.sub || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const fullName = String(payload?.name || "").trim();
  const avatarUrl = String(payload?.picture || "").trim();
  const hostedDomain = String(payload?.hd || "").trim().toLowerCase();

  if (!subject || subject.length > 255) {
    throw new AppError("Google account identity is invalid", 401);
  }

  if (
    !email ||
    email.length > 120 ||
    !email.includes("@") ||
    payload?.email_verified !== true
  ) {
    throw new AppError(
      "Google must provide a verified email address to use FinTrack",
      403,
    );
  }

  return {
    subject,
    email,
    emailVerified: true,
    fullName: fullName.slice(0, 60),
    avatarUrl: avatarUrl.slice(0, 2048),
    hostedDomain: hostedDomain.slice(0, 180),
  };
};

const isGoogleAuthoritativeForEmail = ({ email, emailVerified, hostedDomain }) => {
  if (!emailVerified) {
    return false;
  }

  return email.endsWith("@gmail.com") || Boolean(hostedDomain);
};

const verifyGoogleCredential = async (
  credential,
  { expectedNonce } = {},
) => {
  if (
    typeof credential !== "string" ||
    credential.length < 100 ||
    credential.length > GOOGLE_TOKEN_MAX_LENGTH
  ) {
    throw new AppError("Google sign-in credential is invalid", 401);
  }

  try {
    const clientId = getGoogleClientId();
    const header = decodeGoogleTokenHeader(credential);
    const jwk = await findSigningKey(header.kid);
    const publicKey = createPublicKey({
      key: jwk,
      format: "jwk",
    });

    const payload = jwt.verify(credential, publicKey, {
      algorithms: ["RS256"],
      audience: clientId,
      issuer: GOOGLE_ISSUERS,
      clockTolerance: 5,
    });

    if (typeof payload !== "object" || payload === null) {
      throw new AppError("Google sign-in credential is invalid", 401);
    }

    if (
      !expectedNonce ||
      !secureStringEquals(payload.nonce, expectedNonce)
    ) {
      throw new AppError(
        "Google sign-in request could not be matched to this browser session",
        401,
        {
          code: "GOOGLE_NONCE_MISMATCH",
        },
      );
    }

    return normalizeGooglePayload(payload);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    console.error(
      "Could not verify Google identity credential:",
      error?.message || "verification failed",
    );

    throw new AppError("Google sign-in credential is invalid", 401);
  }
};

export {
  getGoogleClientId,
  isGoogleAuthoritativeForEmail,
  normalizeGooglePayload,
  verifyGoogleCredential,
};
