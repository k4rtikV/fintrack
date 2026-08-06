import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
      minlength: [2, "Full name must contain at least 2 characters"],
      maxlength: [60, "Full name cannot exceed 60 characters"],
    },

    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: [120, "Email address is too long"],
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must contain at least 8 characters"],
      select: false,
    },

    preferredCurrency: {
      type: String,
      enum: ["INR", "USD", "EUR", "GBP"],
      default: "INR",
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
    },

    locale: {
      type: String,
      default: "en-IN",
      trim: true,
    },

    avatarUrl: {
      type: String,
      default: "",
      trim: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    registrationOtpHash: {
      type: String,
      select: false,
      default: null,
    },

    registrationOtpExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },

    registrationOtpLastSentAt: {
      type: Date,
      select: false,
      default: null,
    },

    registrationOtpAttempts: {
      type: Number,
      select: false,
      default: 0,
    },

    loginOtpHash: {
      type: String,
      select: false,
      default: null,
    },

    loginOtpExpiresAt: {
      type: Date,
      select: false,
      default: null,
    },

    loginOtpLastSentAt: {
      type: Date,
      select: false,
      default: null,
    },

    loginOtpAttempts: {
      type: Number,
      select: false,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: function (document, returnedObject) {
        delete returnedObject.password;
        return returnedObject;
      },
    },
  },
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;