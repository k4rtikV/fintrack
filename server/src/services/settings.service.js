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
  const user = await findSettingsUser(userId);

  return {
    profile: {
      fullName: user.fullName,
      email: user.email,
      preferredCurrency: user.preferredCurrency,
      timezone: user.timezone,
      emailVerified: user.emailVerified,
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

const changePasswordForUser = async ({
  userId,
  currentPassword,
  newPassword,
}) => {
  const user = await User.findById(userId).select("+password");

  if (!user || !user.isActive) {
    throw new AppError("User account not found", 404);
  }

  const currentPasswordMatches = await user.comparePassword(currentPassword);

  if (!currentPasswordMatches) {
    throw new AppError("Current password is incorrect", 400);
  }

  const passwordIsUnchanged = await user.comparePassword(newPassword);

  if (passwordIsUnchanged) {
    throw new AppError(
      "New password must be different from your current password",
      400,
    );
  }

  user.password = newPassword;

  await user.save({
    validateModifiedOnly: true,
  });
};

export {
  changePasswordForUser,
  getSettingsForUser,
  updateNotificationSettingsForUser,
  updateProfileSettingsForUser,
};
