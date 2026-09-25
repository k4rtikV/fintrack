import ExternalIdentity from "../models/ExternalIdentity.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";

const findSettingsUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.isActive) {
    throw new AppError("User account not found", 404);
  }

  return user;
};

const getSettingsForUser = async (userId) => {
  const [user, googleIdentity] = await Promise.all([
    findSettingsUser(userId),
    ExternalIdentity.findOne({
      user: userId,
      provider: "GOOGLE",
    }).lean(),
  ]);

  return {
    profile: {
      fullName: user.fullName,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      timezone: user.timezone,
      emailVerified: user.emailVerified,
    },
    authentication: {
      provider: googleIdentity ? "GOOGLE" : "LEGACY_MIGRATION_REQUIRED",
      googleLinked: Boolean(googleIdentity),
      googleEmail: googleIdentity?.providerEmailSnapshot || "",
      linkedAt: googleIdentity?.createdAt || null,
    },
    notifications: {
      emailEnabled: user.notificationPreferences?.emailEnabled ?? true,
      budgetAlerts: user.notificationPreferences?.budgetAlerts ?? true,
      goalAlerts: user.notificationPreferences?.goalAlerts ?? true,
      recurringAlerts: user.notificationPreferences?.recurringAlerts ?? true,
    },
  };
};

const updateProfileSettingsForUser = async ({
  userId,
  fullName,
  preferredCurrency,
  timezone,
}) => {
  const user = await findSettingsUser(userId);

  user.fullName = fullName;
  user.preferredCurrency = preferredCurrency;
  user.timezone = timezone;

  await user.save({
    validateModifiedOnly: true,
  });

  return user;
};

const updateNotificationSettingsForUser = async ({
  userId,
  emailEnabled,
  budgetAlerts,
  goalAlerts,
  recurringAlerts,
}) => {
  const user = await findSettingsUser(userId);

  user.notificationPreferences = {
    emailEnabled,
    budgetAlerts,
    goalAlerts,
    recurringAlerts,
  };

  await user.save({
    validateModifiedOnly: true,
  });

  return user.notificationPreferences;
};

export {
  getSettingsForUser,
  updateNotificationSettingsForUser,
  updateProfileSettingsForUser,
};
