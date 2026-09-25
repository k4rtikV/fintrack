import mongoose from "mongoose";

const externalIdentitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["GOOGLE"],
      required: true,
    },
    providerSubject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    providerEmailSnapshot: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    providerEmailVerified: {
      type: Boolean,
      default: false,
    },
    hostedDomain: {
      type: String,
      default: "",
      trim: true,
      maxlength: 180,
    },
    lastAuthenticatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

externalIdentitySchema.index(
  {
    provider: 1,
    providerSubject: 1,
  },
  {
    unique: true,
  },
);

externalIdentitySchema.index(
  {
    user: 1,
    provider: 1,
  },
  {
    unique: true,
  },
);

const ExternalIdentity = mongoose.model(
  "ExternalIdentity",
  externalIdentitySchema,
);

export default ExternalIdentity;
