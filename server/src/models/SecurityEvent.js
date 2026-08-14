import mongoose from "mongoose";

const securityEventMetadataSchema = new mongoose.Schema(
  {
    targetDeviceLabel: {
      type: String,
      default: "",
      maxlength: 180,
      trim: true,
    },
    revokedCount: {
      type: Number,
      default: null,
      min: 0,
    },
  },
  {
    _id: false,
  },
);

const securityEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      required: true,
      enum: [
        "REGISTRATION_SUCCESS",
        "LOGIN_SUCCESS",
        "LOGIN_PASSWORD_FAILED",
        "LOGIN_OTP_FAILED",
        "PASSWORD_CHANGED",
        "SESSION_REVOKED",
        "OTHER_SESSIONS_REVOKED",
        "LOGOUT",
      ],
    },

    sessionId: {
      type: String,
      default: null,
      maxlength: 80,
      trim: true,
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

    metadata: {
      type: securityEventMetadataSchema,
      default: () => ({}),
    },

    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    versionKey: false,
  },
);

securityEventSchema.index({
  user: 1,
  createdAt: -1,
});

const SecurityEvent = mongoose.model("SecurityEvent", securityEventSchema);

export default SecurityEvent;
