import mongoose from "mongoose";

const userSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    ipAddress: {
      type: String,
      default: "Unknown",
      maxlength: 96,
      trim: true,
    },

    userAgent: {
      type: String,
      default: "Unknown",
      maxlength: 512,
      trim: true,
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

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
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
        "LOGOUT",
        "USER_REVOKED",
        "OTHER_SESSIONS_REVOKED",
        "PASSWORD_CHANGED",
      ],
      default: null,
    },
  },
  {
    versionKey: false,
  },
);

userSessionSchema.index({
  user: 1,
  revokedAt: 1,
  expiresAt: -1,
});

userSessionSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

const UserSession = mongoose.model("UserSession", userSessionSchema);

export default UserSession;
