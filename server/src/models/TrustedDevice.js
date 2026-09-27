import mongoose from "mongoose";

const trustedDeviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    deviceKeyHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 64,
      maxlength: 64,
      select: false,
    },
    pinHash: {
      type: String,
      required: true,
      select: false,
    },
    pinSalt: {
      type: String,
      required: true,
      select: false,
    },
    browser: {
      type: String,
      default: "Unknown browser",
      maxlength: 80,
      trim: true,
    },
    os: {
      type: String,
      default: "Unknown OS",
      maxlength: 80,
      trim: true,
    },
    deviceType: {
      type: String,
      enum: ["Desktop", "Mobile", "Tablet"],
      default: "Desktop",
    },
    failedAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    cooldownUntil: {
      type: Date,
      default: null,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    lastUnlockedAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokeReason: {
      type: String,
      enum: [
        "PIN_DISABLED",
        "SESSION_REVOKED",
        "OTHER_SESSIONS_REVOKED",
        "ALL_SESSIONS_REVOKED",
      ],
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

trustedDeviceSchema.index({
  user: 1,
  revokedAt: 1,
  expiresAt: -1,
});

trustedDeviceSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

const TrustedDevice = mongoose.model("TrustedDevice", trustedDeviceSchema);

export default TrustedDevice;
