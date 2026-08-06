import crypto from "crypto";

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp) => {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
};

const verifyOtpHash = (otp, storedHash) => {
  if (!storedHash) {
    return false;
  }

  const submittedHash = hashOtp(otp);

  const submittedBuffer = Buffer.from(submittedHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (submittedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(submittedBuffer, storedBuffer);
};

const getOtpExpiryDate = () => {
  const expiryMinutes =
    Number(process.env.OTP_EXPIRES_MINUTES) || 10;

  return new Date(Date.now() + expiryMinutes * 60 * 1000);
};

export {
  generateOtp,
  getOtpExpiryDate,
  hashOtp,
  verifyOtpHash,
};