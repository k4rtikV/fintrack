import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import {
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  verifyOtpHash,
} from "../utils/otp.js";
import { sendOtpEmail } from "./email.service.js";
import { seedDefaultCategoriesForUser } from "./category.service.js";

const getOtpSettings = () => ({
  maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  cooldownSeconds:
    Number(process.env.OTP_RESEND_COOLDOWN_SECONDS) || 60,
});

const ensureResendCooldownPassed = (lastSentAt) => {
  if (!lastSentAt) {
    return;
  }

  const { cooldownSeconds } = getOtpSettings();
  const elapsedMilliseconds = Date.now() - lastSentAt.getTime();
  const cooldownMilliseconds = cooldownSeconds * 1000;

  if (elapsedMilliseconds < cooldownMilliseconds) {
    const secondsRemaining = Math.ceil(
      (cooldownMilliseconds - elapsedMilliseconds) / 1000,
    );

    throw new AppError(
      `Please wait ${secondsRemaining} seconds before requesting another OTP`,
      429,
    );
  }
};

const setRegistrationOtp = async (user) => {
  const otp = generateOtp();

  user.registrationOtpHash = hashOtp(otp);
  user.registrationOtpExpiresAt = getOtpExpiryDate();
  user.registrationOtpLastSentAt = new Date();
  user.registrationOtpAttempts = 0;

  await user.save({
    validateModifiedOnly: true,
  });

  await sendOtpEmail({
    email: user.email,
    fullName: user.fullName,
    otp,
    purpose: "registration",
  });
};

const setLoginOtp = async (user) => {
  const otp = generateOtp();

  user.loginOtpHash = hashOtp(otp);
  user.loginOtpExpiresAt = getOtpExpiryDate();
  user.loginOtpLastSentAt = new Date();
  user.loginOtpAttempts = 0;

  await user.save({
    validateModifiedOnly: true,
  });

  await sendOtpEmail({
    email: user.email,
    fullName: user.fullName,
    otp,
    purpose: "login",
  });
};

const registerUser = async ({
  fullName,
  email,
  password,
  preferredCurrency,
}) => {
  const existingUser = await User.findOne({ email }).select(
    "+registrationOtpHash " +
      "+registrationOtpExpiresAt " +
      "+registrationOtpLastSentAt " +
      "+registrationOtpAttempts",
  );

  if (existingUser?.emailVerified) {
    throw new AppError(
      "An account with this email already exists",
      409,
    );
  }

  let user = existingUser;

  if (!user) {
    user = await User.create({
      fullName,
      email,
      password,
      preferredCurrency,
      emailVerified: false,
    });

    user = await User.findById(user._id).select(
      "+registrationOtpHash " +
        "+registrationOtpExpiresAt " +
        "+registrationOtpLastSentAt " +
        "+registrationOtpAttempts",
    );
  } else {
    ensureResendCooldownPassed(user.registrationOtpLastSentAt);

    user.fullName = fullName;
    user.password = password;
    user.preferredCurrency = preferredCurrency;

    await user.save({
      validateModifiedOnly: true,
    });
  }

  await setRegistrationOtp(user);

  return {
    email: user.email,
    expiresInMinutes:
      Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  };
};

const verifyRegistrationOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select(
    "+registrationOtpHash " +
      "+registrationOtpExpiresAt " +
      "+registrationOtpAttempts",
  );

  if (!user) {
    throw new AppError("Registration request not found", 404);
  }

  if (user.emailVerified) {
    throw new AppError("This email has already been verified", 409);
  }

  if (
    !user.registrationOtpHash ||
    !user.registrationOtpExpiresAt
  ) {
    throw new AppError(
      "No registration OTP is active. Request a new OTP.",
      400,
    );
  }

  if (user.registrationOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError(
      "The registration OTP has expired. Request a new OTP.",
      400,
    );
  }

  const { maxAttempts } = getOtpSettings();

  if (user.registrationOtpAttempts >= maxAttempts) {
    throw new AppError(
      "Too many incorrect attempts. Request a new OTP.",
      429,
    );
  }

  const isValid = verifyOtpHash(
    otp,
    user.registrationOtpHash,
  );

  if (!isValid) {
    user.registrationOtpAttempts += 1;

    await user.save({
      validateModifiedOnly: true,
    });

    const remainingAttempts =
      maxAttempts - user.registrationOtpAttempts;

    throw new AppError(
      `Incorrect OTP. ${remainingAttempts} attempt${
        remainingAttempts === 1 ? "" : "s"
      } remaining.`,
      400,
    );
  }

  user.emailVerified = true;
  user.registrationOtpHash = null;
  user.registrationOtpExpiresAt = null;
  user.registrationOtpLastSentAt = null;
  user.registrationOtpAttempts = 0;

  await user.save({
    validateModifiedOnly: true,
  });

  await seedDefaultCategoriesForUser(user._id);

  return User.findById(user._id);
};

const resendRegistrationOtp = async ({ email }) => {
  const user = await User.findOne({ email }).select(
    "+registrationOtpHash " +
      "+registrationOtpExpiresAt " +
      "+registrationOtpLastSentAt " +
      "+registrationOtpAttempts",
  );

  if (!user) {
    throw new AppError("Registration request not found", 404);
  }

  if (user.emailVerified) {
    throw new AppError("This email has already been verified", 409);
  }

  ensureResendCooldownPassed(user.registrationOtpLastSentAt);

  await setRegistrationOtp(user);

  return {
    email: user.email,
    expiresInMinutes:
      Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  };
};

const requestLoginOtp = async ({ email, password }) => {
  const user = await User.findOne({ email }).select(
    "+password " +
      "+loginOtpHash " +
      "+loginOtpExpiresAt " +
      "+loginOtpLastSentAt " +
      "+loginOtpAttempts",
  );

  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated", 403);
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.emailVerified) {
    throw new AppError(
      "Verify your email address before logging in",
      403,
      {
        code: "EMAIL_NOT_VERIFIED",
        email: user.email,
      },
    );
  }

  ensureResendCooldownPassed(user.loginOtpLastSentAt);

  await setLoginOtp(user);

  return {
    email: user.email,
    expiresInMinutes:
      Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  };
};

const verifyLoginOtp = async ({ email, otp }) => {
  const user = await User.findOne({ email }).select(
    "+loginOtpHash " +
      "+loginOtpExpiresAt " +
      "+loginOtpAttempts",
  );

  if (!user) {
    throw new AppError("Login request not found", 404);
  }

  if (!user.isActive) {
    throw new AppError("This account has been deactivated", 403);
  }

  if (!user.emailVerified) {
    throw new AppError(
      "Verify your email address before logging in",
      403,
    );
  }

  if (!user.loginOtpHash || !user.loginOtpExpiresAt) {
    throw new AppError(
      "No login OTP is active. Start the login process again.",
      400,
    );
  }

  if (user.loginOtpExpiresAt.getTime() < Date.now()) {
    throw new AppError(
      "The login OTP has expired. Request a new OTP.",
      400,
    );
  }

  const { maxAttempts } = getOtpSettings();

  if (user.loginOtpAttempts >= maxAttempts) {
    throw new AppError(
      "Too many incorrect attempts. Request a new OTP.",
      429,
    );
  }

  const isValid = verifyOtpHash(otp, user.loginOtpHash);

  if (!isValid) {
    user.loginOtpAttempts += 1;

    await user.save({
      validateModifiedOnly: true,
    });

    const remainingAttempts =
      maxAttempts - user.loginOtpAttempts;

    throw new AppError(
      `Incorrect OTP. ${remainingAttempts} attempt${
        remainingAttempts === 1 ? "" : "s"
      } remaining.`,
      400,
    );
  }

  user.loginOtpHash = null;
  user.loginOtpExpiresAt = null;
  user.loginOtpLastSentAt = null;
  user.loginOtpAttempts = 0;
  user.lastLoginAt = new Date();

  await user.save({
    validateModifiedOnly: true,
  });

  return User.findById(user._id);
};

const resendLoginOtp = async ({ email }) => {
  const user = await User.findOne({ email }).select(
    "+loginOtpHash " +
      "+loginOtpExpiresAt " +
      "+loginOtpLastSentAt " +
      "+loginOtpAttempts",
  );

  if (!user || !user.emailVerified || !user.isActive) {
    throw new AppError("Login request not found", 404);
  }

  ensureResendCooldownPassed(user.loginOtpLastSentAt);

  await setLoginOtp(user);

  return {
    email: user.email,
    expiresInMinutes:
      Number(process.env.OTP_EXPIRES_MINUTES) || 10,
  };
};

const findUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User account not found", 404);
  }

  return user;
};

export {
  findUserById,
  registerUser,
  requestLoginOtp,
  resendLoginOtp,
  resendRegistrationOtp,
  verifyLoginOtp,
  verifyRegistrationOtp,
};