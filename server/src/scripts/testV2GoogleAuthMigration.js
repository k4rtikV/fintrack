import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverSrc = path.resolve(__dirname, "..");
const repoRoot = path.resolve(serverSrc, "../..");
const clientSrc = path.join(repoRoot, "client", "src");

const read = (...parts) =>
  fs.readFileSync(path.join(...parts), "utf8");

const authRoutes = read(serverSrc, "routes", "auth.routes.js");
const authService = read(serverSrc, "services", "auth.service.js");
const googleService = read(
  serverSrc,
  "services",
  "googleIdentity.service.js",
);
const userModel = read(serverSrc, "models", "User.js");
const identityModel = read(serverSrc, "models", "ExternalIdentity.js");
const settingsRoutes = read(serverSrc, "routes", "settings.routes.js");
const appSource = read(serverSrc, "app.js");
const csrfMiddleware = read(serverSrc, "middleware", "csrf.middleware.js");
const authCookie = read(serverSrc, "utils", "authCookie.js");
const clientApp = read(clientSrc, "App.jsx");
const loginPage = read(clientSrc, "pages", "LoginPage.jsx");
const googleButton = read(clientSrc, "components", "auth", "GoogleSignInButton.jsx");

for (const removedRoute of [
  '"/register"',
  '"/verify-registration-otp"',
  '"/resend-registration-otp"',
  '"/login"',
  '"/verify-login-otp"',
  '"/resend-login-otp"',
]) {
  assert.equal(
    authRoutes.includes(removedRoute),
    false,
    `Legacy auth route still exposed: ${removedRoute}`,
  );
}

assert.match(authRoutes, /"\/google"/);
assert.match(authRoutes, /"\/google\/link-legacy"/);
assert.match(authRoutes, /legacyLinkLimiter/);
assert.match(authRoutes, /requireApprovedBrowserOrigin/);

assert.match(identityModel, /providerSubject/);
assert.match(identityModel, /provider:\s*1,\s*providerSubject:\s*1/);
assert.match(identityModel, /user:\s*1,\s*provider:\s*1/);
assert.match(identityModel, /unique:\s*true/);

assert.match(userModel, /required:\s*false/);
assert.match(userModel, /if \(!this\.password/);

assert.match(authService, /providerSubject:\s*googleProfile\.subject/);
assert.match(authService, /LEGACY_ACCOUNT_REQUIRES_LINK/);
assert.match(authService, /isGoogleAuthoritativeForEmail/);
assert.match(authService, /legacyUnverifiedUserHasProtectedState/);
assert.match(authService, /GOOGLE_IDENTITY_CONFLICT/);
assert.match(authService, /error\?\.code === 11000/);
assert.match(authService, /\$unset:\s*legacyAuthUnset/);
assert.match(authService, /GOOGLE_UNVERIFIED_ACCOUNT_RECLAIMED/);

assert.match(googleService, /algorithms:\s*\["RS256"\]/);
assert.match(googleService, /audience:\s*clientId/);
assert.match(googleService, /issuer:\s*GOOGLE_ISSUERS/);
assert.match(googleService, /email_verified/);
assert.match(googleService, /GOOGLE_JWKS_URL/);
assert.match(googleService, /payload\.nonce/);
assert.match(googleService, /timingSafeEqual/);

assert.equal(settingsRoutes.includes('"/password"'), false);
assert.match(appSource, /accounts\.google\.com\/gsi\/client/);
assert.match(appSource, /same-origin-allow-popups/);
assert.match(csrfMiddleware, /requireApprovedBrowserOrigin/);
assert.match(authCookie, /GOOGLE_NONCE_COOKIE_NAME/);
for (const requiredExport of [
  "GOOGLE_NONCE_COOKIE_NAME",
  "clearGoogleNonceCookie",
  "getGoogleNonceCookieOptions",
  "setGoogleNonceCookie",
]) {
  const exportBlock = authCookie.slice(authCookie.lastIndexOf("export {"));
  assert.equal(
    exportBlock.includes(requiredExport),
    true,
    `authCookie.js is missing required Google nonce export: ${requiredExport}`,
  );
}
assert.match(authCookie, /httpOnly:\s*true/);
assert.match(appSource, /same-origin-allow-popups/);

assert.equal(
  fs.existsSync(path.join(clientSrc, "pages", "RegistrationOtpPage.jsx")),
  false,
);
assert.equal(
  fs.existsSync(path.join(clientSrc, "pages", "LoginOtpPage.jsx")),
  false,
);
assert.match(clientApp, /path="\/register" element={<Navigate to="\/login" replace \/>}/);
assert.match(loginPage, /linkLegacyGoogleAccount/);
assert.match(googleButton, /nonce,/);
assert.match(googleButton, /credentialHandlerRef\.current\?\.\(credential, authNonce\)/);
assert.match(loginPage, /Existing accounts are never\s*silently claimed by email alone/s);

console.log("FinTrack v2 Google-auth migration structural regressions passed.");
