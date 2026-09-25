import mongoose from "mongoose";

import Account from "../models/Account.js";
import Budget from "../models/Budget.js";
import Category from "../models/Category.js";
import ExternalIdentity from "../models/ExternalIdentity.js";
import Goal from "../models/Goal.js";
import RecurringTransaction from "../models/RecurringTransaction.js";
import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import UserSession from "../models/UserSession.js";
import AppError from "../utils/AppError.js";
import { seedDefaultCategoriesForUser } from "./category.service.js";
import {
  getGoogleClientId,
  isGoogleAuthoritativeForEmail,
  verifyGoogleCredential,
} from "./googleIdentity.service.js";
import { recordSecurityEventSafe } from "./security.service.js";

const GOOGLE_PROVIDER = "GOOGLE";

const legacyAuthUnset = {
  password: "",
  registrationOtpHash: "",
  registrationOtpExpiresAt: "",
  registrationOtpLastSentAt: "",
  registrationOtpAttempts: "",
  loginOtpHash: "",
  loginOtpExpiresAt: "",
  loginOtpLastSentAt: "",
  loginOtpAttempts: "",
  passwordChangedAt: "",
};

const getSafeGoogleDisplayName = ({ fullName, email }) => {
  const candidate = String(fullName || "").trim();

  if (candidate.length >= 2) {
    return candidate.slice(0, 60);
  }

  const localPart = String(email || "").split("@")[0].trim();

  if (localPart.length >= 2) {
    return localPart.slice(0, 60);
  }

  return "FinTrack User";
};

const buildIdentityDocument = ({ userId, googleProfile }) => ({
  user: userId,
  provider: GOOGLE_PROVIDER,
  providerSubject: googleProfile.subject,
  providerEmailSnapshot: googleProfile.email,
  providerEmailVerified: googleProfile.emailVerified,
  hostedDomain: googleProfile.hostedDomain,
  lastAuthenticatedAt: new Date(),
});

const ensureActiveUser = (user) => {
  if (!user || !user.isActive) {
    throw new AppError("This FinTrack account is not available", 403);
  }
};

const findGoogleIdentityForUser = (userId, session = null) => {
  const query = ExternalIdentity.findOne({
    user: userId,
    provider: GOOGLE_PROVIDER,
  });

  if (session) {
    query.session(session);
  }

  return query;
};

const updateIdentityAuthenticationSnapshot = async (
  identity,
  googleProfile,
) => {
  identity.providerEmailSnapshot = googleProfile.email;
  identity.providerEmailVerified = googleProfile.emailVerified;
  identity.hostedDomain = googleProfile.hostedDomain;
  identity.lastAuthenticatedAt = new Date();
  await identity.save({ validateModifiedOnly: true });
};


const synchronizeReturningGoogleUser = async (user, googleProfile) => {
  const updates = {
    lastLoginAt: new Date(),
    emailVerified: true,
  };

  if (googleProfile.avatarUrl) {
    updates.avatarUrl = googleProfile.avatarUrl;
  }

  if (
    user.email !== googleProfile.email &&
    isGoogleAuthoritativeForEmail(googleProfile)
  ) {
    const conflict = await User.exists({
      _id: { $ne: user._id },
      email: googleProfile.email,
    });

    if (conflict) {
      throw new AppError(
        "The current Google email is already associated with another FinTrack account",
        409,
        {
          code: "GOOGLE_EMAIL_CONFLICT",
        },
      );
    }

    updates.email = googleProfile.email;
  }

  await User.updateOne(
    { _id: user._id },
    {
      $set: updates,
      // A Google-bound v2 identity must never retain an old password/OTP
      // authentication path, even if legacy data was partially migrated.
      $unset: legacyAuthUnset,
    },
  );
};

const recoverSuccessfulGoogleRace = async (googleProfile) => {
  const identity = await ExternalIdentity.findOne({
    provider: GOOGLE_PROVIDER,
    providerSubject: googleProfile.subject,
  });

  if (!identity) {
    return null;
  }

  const user = await User.findById(identity.user);
  ensureActiveUser(user);

  await Promise.all([
    updateIdentityAuthenticationSnapshot(identity, googleProfile),
    synchronizeReturningGoogleUser(user, googleProfile),
  ]);

  return {
    user: await User.findById(user._id),
    securityEventType: "GOOGLE_SIGN_IN",
    revokeExistingSessions: false,
  };
};

const legacyUnverifiedUserHasProtectedState = async (userId) => {
  const [
    accounts,
    transactions,
    categories,
    recurring,
    budgets,
    goals,
    sessions,
  ] = await Promise.all([
    Account.exists({ user: userId }),
    Transaction.exists({ user: userId }),
    Category.exists({ user: userId }),
    RecurringTransaction.exists({ user: userId }),
    Budget.exists({ user: userId }),
    Goal.exists({ user: userId }),
    UserSession.exists({ user: userId }),
  ]);

  return Boolean(
    accounts ||
      transactions ||
      categories ||
      recurring ||
      budgets ||
      goals ||
      sessions,
  );
};

const getGoogleAuthConfig = () => ({
  clientId: getGoogleClientId(),
});

const authenticateWithGoogle = async (
  { credential },
  { expectedNonce } = {},
) => {
  const googleProfile = await verifyGoogleCredential(credential, {
    expectedNonce,
  });

  const existingIdentity = await ExternalIdentity.findOne({
    provider: GOOGLE_PROVIDER,
    providerSubject: googleProfile.subject,
  });

  if (existingIdentity) {
    const user = await User.findById(existingIdentity.user);
    ensureActiveUser(user);

    await Promise.all([
      updateIdentityAuthenticationSnapshot(existingIdentity, googleProfile),
      synchronizeReturningGoogleUser(user, googleProfile),
    ]);

    return {
      user: await User.findById(user._id),
      securityEventType: "GOOGLE_SIGN_IN",
      revokeExistingSessions: false,
    };
  }

  const existingUser = await User.findOne({
    email: googleProfile.email,
  }).select(
    "+password +registrationOtpHash +registrationOtpExpiresAt " +
      "+registrationOtpLastSentAt +registrationOtpAttempts " +
      "+loginOtpHash +loginOtpExpiresAt +loginOtpLastSentAt +loginOtpAttempts",
  );

  if (existingUser) {
    ensureActiveUser(existingUser);

    const linkedIdentity = await findGoogleIdentityForUser(existingUser._id);

    if (linkedIdentity) {
      throw new AppError(
        "This email is already attached to a different Google identity",
        409,
        {
          code: "GOOGLE_IDENTITY_CONFLICT",
        },
      );
    }

    if (existingUser.emailVerified) {
      throw new AppError(
        "This existing FinTrack account needs a one-time secure Google migration",
        409,
        {
          code: "LEGACY_ACCOUNT_REQUIRES_LINK",
          email: existingUser.email,
        },
      );
    }

    // FinTrack v1 created permanent users before registration OTP verification.
    // Never preserve an attacker-planted local password when the real owner later
    // arrives through Google. Reclaim only an unused local-only record and only
    // when Google is authoritative for that email address.
    if (!isGoogleAuthoritativeForEmail(googleProfile)) {
      throw new AppError(
        "This unfinished legacy registration cannot be claimed automatically. Contact support to migrate it safely.",
        409,
        {
          code: "LEGACY_UNVERIFIED_ACCOUNT_REQUIRES_MANUAL_MIGRATION",
        },
      );
    }

    if (await legacyUnverifiedUserHasProtectedState(existingUser._id)) {
      throw new AppError(
        "This unfinished legacy registration contains protected account state and cannot be migrated automatically.",
        409,
        {
          code: "LEGACY_UNVERIFIED_ACCOUNT_REQUIRES_MANUAL_MIGRATION",
        },
      );
    }

    let user;

    try {
      user = await mongoose.connection.transaction(async (session) => {
        const identityConflict = await ExternalIdentity.findOne({
          provider: GOOGLE_PROVIDER,
          providerSubject: googleProfile.subject,
        }).session(session);

        if (identityConflict) {
          throw new AppError("This Google account is already linked", 409);
        }

        const googleName = getSafeGoogleDisplayName(googleProfile);

        await User.updateOne(
          {
            _id: existingUser._id,
            emailVerified: false,
          },
          {
            $set: {
              fullName: googleName,
              emailVerified: true,
              preferredCurrency: "INR",
              avatarUrl: googleProfile.avatarUrl,
              lastLoginAt: new Date(),
            },
            $unset: legacyAuthUnset,
          },
          { session },
        );

        await ExternalIdentity.create(
          [buildIdentityDocument({
            userId: existingUser._id,
            googleProfile,
          })],
          { session },
        );

        return await User.findById(existingUser._id).session(session);
      });
    } catch (error) {
      if (error?.code === 11000) {
        const raced = await recoverSuccessfulGoogleRace(googleProfile);

        if (raced) {
          return raced;
        }

        throw new AppError(
          "This unfinished legacy registration is already being migrated to a different Google identity",
          409,
          {
            code: "GOOGLE_IDENTITY_CONFLICT",
          },
        );
      }

      throw error;
    }

    await seedDefaultCategoriesForUser(user._id);

    return {
      user,
      securityEventType: "GOOGLE_UNVERIFIED_ACCOUNT_RECLAIMED",
      revokeExistingSessions: true,
    };
  }

  let user;

  try {
    user = await mongoose.connection.transaction(async (session) => {
      const [createdUser] = await User.create(
        [
          {
            fullName: getSafeGoogleDisplayName(googleProfile),
            email: googleProfile.email,
            preferredCurrency: "INR",
            emailVerified: true,
            avatarUrl: googleProfile.avatarUrl,
            lastLoginAt: new Date(),
          },
        ],
        { session },
      );

      await ExternalIdentity.create(
        [buildIdentityDocument({
          userId: createdUser._id,
          googleProfile,
        })],
        { session },
      );

      return createdUser;
    });
  } catch (error) {
    if (error?.code === 11000) {
      const raced = await recoverSuccessfulGoogleRace(googleProfile);

      if (raced) {
        return raced;
      }

      throw new AppError(
        "This Google email is already associated with another FinTrack account",
        409,
        {
          code: "GOOGLE_EMAIL_CONFLICT",
        },
      );
    }

    throw error;
  }

  await seedDefaultCategoriesForUser(user._id);

  return {
    user,
    securityEventType: "GOOGLE_ACCOUNT_CREATED",
    revokeExistingSessions: false,
  };
};

const linkLegacyAccountWithGoogle = async (
  { credential, password },
  securityContext = {},
  { expectedNonce } = {},
) => {
  const googleProfile = await verifyGoogleCredential(credential, {
    expectedNonce,
  });

  const user = await User.findOne({
    email: googleProfile.email,
  }).select(
    "+password +registrationOtpHash +registrationOtpExpiresAt " +
      "+registrationOtpLastSentAt +registrationOtpAttempts " +
      "+loginOtpHash +loginOtpExpiresAt +loginOtpLastSentAt +loginOtpAttempts",
  );

  if (!user || !user.isActive || !user.emailVerified || !user.password) {
    throw new AppError(
      "The legacy FinTrack account could not be securely linked to this Google account",
      401,
    );
  }

  const [subjectIdentity, userIdentity] = await Promise.all([
    ExternalIdentity.findOne({
      provider: GOOGLE_PROVIDER,
      providerSubject: googleProfile.subject,
    }),
    findGoogleIdentityForUser(user._id),
  ]);

  if (subjectIdentity && !subjectIdentity.user.equals(user._id)) {
    throw new AppError("This Google account is already linked", 409, {
      code: "GOOGLE_IDENTITY_CONFLICT",
    });
  }

  if (
    userIdentity &&
    userIdentity.providerSubject !== googleProfile.subject
  ) {
    throw new AppError(
      "This FinTrack account is already linked to a different Google identity",
      409,
      {
        code: "GOOGLE_IDENTITY_CONFLICT",
      },
    );
  }

  if (subjectIdentity && userIdentity) {
    return User.findById(user._id);
  }

  const passwordMatches = await user.comparePassword(password);

  if (!passwordMatches) {
    await recordSecurityEventSafe({
      userId: user._id,
      type: "GOOGLE_LEGACY_LINK_FAILED",
      securityContext,
    });

    throw new AppError(
      "The legacy FinTrack account could not be securely linked to this Google account",
      401,
    );
  }

  try {
    await mongoose.connection.transaction(async (session) => {
      const currentSubjectIdentity = await ExternalIdentity.findOne({
        provider: GOOGLE_PROVIDER,
        providerSubject: googleProfile.subject,
      }).session(session);

      if (
        currentSubjectIdentity &&
        !currentSubjectIdentity.user.equals(user._id)
      ) {
        throw new AppError("This Google account is already linked", 409);
      }

      const currentUserIdentity = await findGoogleIdentityForUser(
        user._id,
        session,
      );

      if (
        currentUserIdentity &&
        currentUserIdentity.providerSubject !== googleProfile.subject
      ) {
        throw new AppError(
          "This FinTrack account is already linked to a different Google identity",
          409,
        );
      }

      if (!currentUserIdentity) {
        await ExternalIdentity.create(
          [buildIdentityDocument({
            userId: user._id,
            googleProfile,
          })],
          { session },
        );
      }

      await User.updateOne(
        { _id: user._id },
        {
          $set: {
            lastLoginAt: new Date(),
          },
          $unset: legacyAuthUnset,
        },
        { session },
      );
    });
  } catch (error) {
    if (error?.code === 11000) {
      const [subjectIdentityAfterRace, userIdentityAfterRace] = await Promise.all([
        ExternalIdentity.findOne({
          provider: GOOGLE_PROVIDER,
          providerSubject: googleProfile.subject,
        }),
        findGoogleIdentityForUser(user._id),
      ]);

      if (
        subjectIdentityAfterRace?.user?.equals(user._id) &&
        userIdentityAfterRace?.providerSubject === googleProfile.subject
      ) {
        return User.findById(user._id);
      }

      throw new AppError(
        "This Google identity or FinTrack account is already linked elsewhere",
        409,
        {
          code: "GOOGLE_IDENTITY_CONFLICT",
        },
      );
    }

    throw error;
  }

  return User.findById(user._id);
};

const findUserById = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User account not found", 404);
  }

  return user;
};

export {
  authenticateWithGoogle,
  findUserById,
  getGoogleAuthConfig,
  linkLegacyAccountWithGoogle,
};
