import {
  changePasswordForUser,
  getSettingsForUser,
  updateNotificationSettingsForUser,
  updateProfileSettingsForUser,
} from "../services/settings.service.js";

const getSettings = async (req, res) => {
  const settings = await getSettingsForUser(req.user._id);

  res.status(200).json({
    success: true,
    data: settings,
  });
};

const updateProfileSettings = async (req, res) => {
  const user = await updateProfileSettingsForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Profile settings updated successfully",
    data: {
      user,
    },
  });
};

const updateNotificationSettings = async (req, res) => {
  const notifications = await updateNotificationSettingsForUser({
    userId: req.user._id,
    ...req.validatedData.body,
  });

  res.status(200).json({
    success: true,
    message: "Notification preferences updated successfully",
    data: {
      notifications,
    },
  });
};

const changePassword = async (req, res) => {
  await changePasswordForUser({
    userId: req.user._id,
    currentPassword: req.validatedData.body.currentPassword,
    newPassword: req.validatedData.body.newPassword,
  });

  res.status(200).json({
    success: true,
    message: "Password changed successfully",
  });
};

export {
  changePassword,
  getSettings,
  updateNotificationSettings,
  updateProfileSettings,
};
