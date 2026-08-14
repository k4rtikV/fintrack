import jwt from "jsonwebtoken";

const generateAccessToken = (
  userId,
  {
    sessionId,
  } = {},
) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  if (!sessionId) {
    throw new Error("A session ID is required to generate an access token");
  }

  return jwt.sign(
    {
      sub: userId.toString(),
      sid: sessionId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "30d",
      jwtid: sessionId,
    },
  );
};

const verifyAccessToken = (token) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return jwt.verify(token, process.env.JWT_SECRET);
};

const getAccessTokenExpiry = (token) => {
  const decoded = jwt.decode(token);

  if (!decoded?.exp) {
    throw new Error("Could not determine access-token expiry");
  }

  return new Date(decoded.exp * 1000);
};

export {
  generateAccessToken,
  getAccessTokenExpiry,
  verifyAccessToken,
};
