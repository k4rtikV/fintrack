const VALID_NODE_ENVS = new Set(["development", "test", "production"]);

const getMissingVariables = (names) =>
  names.filter((name) => !String(process.env[name] || "").trim());

const validateEnvironment = () => {
  const nodeEnv = String(process.env.NODE_ENV || "development").trim();

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of: ${[...VALID_NODE_ENVS].join(", ")}`,
    );
  }

  process.env.NODE_ENV = nodeEnv;

  const alwaysRequired = ["MONGO_URI", "JWT_SECRET"];
  const productionRequired = [
    "CLIENT_URL",
    "BREVO_API_KEY",
    "BREVO_SENDER_EMAIL",
    "GEMINI_API_KEY",
  ];
  const required =
    nodeEnv === "production"
      ? [...alwaysRequired, ...productionRequired]
      : alwaysRequired;
  const missing = getMissingVariables(required);

  if (missing.length) {
    throw new Error(
      `Missing required environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
    );
  }

  if (nodeEnv === "production" && process.env.JWT_SECRET.length < 32) {
    throw new Error(
      "JWT_SECRET must contain at least 32 characters in production",
    );
  }
};

export { validateEnvironment };
