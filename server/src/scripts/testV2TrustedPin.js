import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculatePinCooldownMs,
  createPinVerifier,
  verifyPinVerifier,
} from "../utils/pinSecurity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverSrc = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverSrc, "../..");
const clientSrc = path.join(repoRoot, "client", "src");

const read = (...parts) => fs.readFileSync(path.join(...parts), "utf8");

const verifier = await createPinVerifier("482913");
assert.notEqual(verifier.hash, "482913");
assert.ok(verifier.salt.length >= 20);
assert.equal(
  await verifyPinVerifier("482913", verifier),
  true,
);
assert.equal(
  await verifyPinVerifier("482914", verifier),
  false,
);
assert.equal(calculatePinCooldownMs(4), 0);
assert.equal(calculatePinCooldownMs(5), 30_000);
assert.equal(calculatePinCooldownMs(6), 60_000);
assert.equal(calculatePinCooldownMs(20), 3_600_000);

const pinUtility = read(serverSrc, "utils", "pinSecurity.js");
const trustedDeviceModel = read(serverSrc, "models", "TrustedDevice.js");
const sessionModel = read(serverSrc, "models", "UserSession.js");
const appLockMiddleware = read(serverSrc, "middleware", "appLock.middleware.js");
const pinService = read(serverSrc, "services", "pin.service.js");
const securityRoutes = read(serverSrc, "routes", "security.routes.js");
const authRoutes = read(serverSrc, "routes", "auth.routes.js");
const authController = read(serverSrc, "controllers", "auth.controller.js");
const authCookie = read(serverSrc, "utils", "authCookie.js");
const securityEventModel = read(serverSrc, "models", "SecurityEvent.js");
const axiosClient = read(clientSrc, "api", "axios.js");
const protectedRoute = read(clientSrc, "routes", "ProtectedRoute.jsx");
const pinLockScreen = read(clientSrc, "components", "security", "PinLockScreen.jsx");
const pinSettingsCard = read(clientSrc, "components", "security", "PinSecurityCard.jsx");
const authContext = read(clientSrc, "context", "AuthContext.jsx");

assert.match(pinUtility, /scrypt/);
assert.match(pinUtility, /N:\s*32768/);
assert.match(pinUtility, /timingSafeEqual/);
assert.match(pinUtility, /randomBytes\(PIN_SALT_BYTES\)/);

assert.match(trustedDeviceModel, /deviceKeyHash/);
assert.match(trustedDeviceModel, /pinHash/);
assert.match(trustedDeviceModel, /pinSalt/);
assert.match(trustedDeviceModel, /select:\s*false/);
assert.equal(/plaintextPin|pin:\s*\{/.test(trustedDeviceModel), false);

assert.match(sessionModel, /trustedDevice/);
assert.match(sessionModel, /appLocked/);
assert.match(sessionModel, /strongAuthAt/);
assert.match(appLockMiddleware, /PIN_LOCKED/);
assert.match(appLockMiddleware, /423/);
assert.match(appLockMiddleware, /GOOGLE_REAUTH_REQUIRED/);

assert.match(pinService, /\$inc:\s*\{\s*failedAttempts:\s*1/);
assert.match(pinService, /calculatePinCooldownMs/);
assert.match(pinService, /\$max:\s*\{\s*cooldownUntil/);
assert.match(pinService, /verifyPinVerifier/);
assert.match(pinService, /PIN_COOLDOWN/);
assert.match(pinService, /PIN_INVALID/);
assert.match(pinService, /UserSession\.updateMany/);

assert.match(securityRoutes, /"\/pin\/unlock"/);
assert.match(securityRoutes, /"\/pin\/reset"/);
assert.match(securityRoutes, /"\/pin\/enroll"/);
assert.match(securityRoutes, /"\/pin\/change"/);
assert.match(securityRoutes, /"\/pin\/lock"/);
assert.match(securityRoutes, /requireRecentStrongAuth/);
assert.match(securityRoutes, /requireAppUnlocked/);

for (const routeName of [
  "account",
  "analytics",
  "assistant",
  "budget",
  "category",
  "goal",
  "notification",
  "recurring",
  "report",
  "settings",
  "transaction",
]) {
  const routeSource = read(serverSrc, "routes", `${routeName}.routes.js`);
  assert.match(
    routeSource,
    /router\.use\(protect, requireAppUnlocked\)/,
    `${routeName} routes are not protected by the server-side app lock`,
  );
}

assert.match(authRoutes, /"\/google\/reauth"/);
assert.match(authController, /markSessionStrongAuth/);
assert.match(authController, /getSessionSecurityState/);
assert.match(authCookie, /TRUSTED_DEVICE_COOKIE_NAME/);
assert.match(authCookie, /httpOnly:\s*true/);

for (const eventName of [
  "GOOGLE_REAUTHENTICATED",
  "PIN_ENROLLED",
  "PIN_CHANGED",
  "PIN_RESET",
  "PIN_DISABLED",
  "PIN_UNLOCK_FAILED",
  "PIN_COOLDOWN",
  "APP_LOCKED",
]) {
  assert.match(securityEventModel, new RegExp(eventName));
}

assert.match(axiosClient, /status === 423/);
assert.match(axiosClient, /\/auth\/google\/reauth/);
assert.match(axiosClient, /PIN_LOCKED/);
assert.match(protectedRoute, /PinLockScreen/);
assert.match(protectedRoute, /isPinLocked/);
assert.match(pinLockScreen, /reauthenticateWithGoogle/);
assert.match(pinLockScreen, /resetPin/);
assert.match(pinSettingsCard, /GoogleSignInButton/);
assert.match(pinSettingsCard, /enable|Enable/);
assert.match(authContext, /lockPinRequest/);
assert.match(authContext, /clearPrivateClientState/);

const entireClientSecuritySurface = [
  axiosClient,
  protectedRoute,
  pinLockScreen,
  pinSettingsCard,
  authContext,
].join("\n");
assert.equal(
  /pinVerified\s*=|pinVerified:\s*true/.test(entireClientSecuritySurface),
  false,
  "Client must never become the authority for PIN verification",
);

console.log("FinTrack v2 trusted-device PIN regressions passed.");
