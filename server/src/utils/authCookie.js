const AUTH_COOKIE_NAME = "fintrack_token";
const GOOGLE_NONCE_COOKIE_NAME = "fintrack_google_nonce";

const getAuthCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: "/",
  };
};


const getGoogleNonceCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/api/auth",
  };
};

const setGoogleNonceCookie = (res, nonce) => {
  res.cookie(
    GOOGLE_NONCE_COOKIE_NAME,
    nonce,
    getGoogleNonceCookieOptions(),
  );
};

const clearGoogleNonceCookie = (res) => {
  res.clearCookie(
    GOOGLE_NONCE_COOKIE_NAME,
    getGoogleNonceCookieOptions(),
  );
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
};

const clearAuthCookie = (res) => {
  const options = getAuthCookieOptions();

  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: options.httpOnly,
    secure: options.secure,
    sameSite: options.sameSite,
    path: options.path,
  });
};

export {
  AUTH_COOKIE_NAME,
  GOOGLE_NONCE_COOKIE_NAME,
  clearAuthCookie,
  clearGoogleNonceCookie,
  getAuthCookieOptions,
  getGoogleNonceCookieOptions,
  setAuthCookie,
  setGoogleNonceCookie,
};
