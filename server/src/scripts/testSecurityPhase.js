import assert from "node:assert/strict";

import {
  getDeviceLabel,
  getRequestSecurityContext,
} from "../utils/securityContext.js";
import {
  generateAccessToken,
  getAccessTokenExpiry,
  verifyAccessToken,
} from "../utils/jwt.js";

process.env.JWT_SECRET =
  process.env.JWT_SECRET ||
  "fintrack-security-phase-test-secret-32-characters";
process.env.JWT_EXPIRES_IN = "30m";

const mockRequest = {
  ip: "::ffff:203.0.113.15",
  socket: {
    remoteAddress: "::ffff:203.0.113.15",
  },
  get(name) {
    if (name.toLowerCase() === "user-agent") {
      return "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36";
    }

    return "";
  },
};

const securityContext =
  getRequestSecurityContext(mockRequest);

assert.equal(securityContext.ipAddress, "203.0.113.15");
assert.equal(securityContext.browser, "Chrome");
assert.equal(securityContext.os, "Windows");
assert.equal(securityContext.deviceType, "Desktop");
assert.equal(
  getDeviceLabel(securityContext),
  "Chrome on Windows",
);

const sessionId = "88eb581e-1676-4cf8-9197-b6f3adf0bd5d";
const token = generateAccessToken(
  "64f00c000000000000000001",
  {
    sessionId,
  },
);
const decoded = verifyAccessToken(token);

assert.equal(decoded.sub, "64f00c000000000000000001");
assert.equal(decoded.sid, sessionId);
assert.equal(decoded.jti, sessionId);
assert.ok(
  getAccessTokenExpiry(token).getTime() > Date.now(),
);

assert.throws(
  () =>
    generateAccessToken(
      "64f00c000000000000000001",
    ),
  /session ID is required/i,
);

console.log("FinTrack Security Phase 16 regression checks passed.");
