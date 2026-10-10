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

    // Random opaque browser-profile token hash; never derive identity from IP/UA.
    browserInstanceHash: {
      type: String,
      default: null,
      index: true,
      select: false,
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

    trustedDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrustedDevice",
      default: null,
      index: true,
    },

    appLocked: {
      type: Boolean,
      default: false,
    },

    appLockedAt: {
      type: Date,
      default: null,
    },

    strongAuthAt: {
      type: Date,
      default: Date.now,
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
        "SAME_BROWSER_SIGN_IN",
        "PASSWORD_CHANGED",
        "GOOGLE_ACCOUNT_LINKED",
        "GOOGLE_ACCOUNT_RECLAIMED",
      ],
      default: null,
    },
  },
  {
    versionKey: false,
  },
);

userSessionSchema.index({ user: 1, browserInstanceHash: 1, revokedAt: 1 });

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
