import { useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  MonitorCog,
  Save,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import useAuth from "../hooks/useAuth";
import useTheme from "../hooks/useTheme";
import {
  changePassword,
  getSettings,
  updateNotificationSettings,
  updateProfileSettings,
} from "../services/settingsService";
import getApiError from "../utils/getApiError";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const Toggle = ({ checked, onChange, label, description, disabled = false }) => (
  <label
    className={`flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800 ${
      disabled ? "opacity-50" : "cursor-pointer"
    }`}
  >
    <span>
      <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
        {label}
      </span>
      <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </span>
    </span>

    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${
        checked ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span
        className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </span>
  </label>
);

const SettingsSectionTitle = ({ icon: Icon, title, description }) => (
  <div className="mb-5 flex items-start gap-3">
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
      <Icon size={19} />
    </div>
    <div>
      <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  </div>
);

const SettingsPage = () => {
  const { user, refreshUser, clearAuthentication } = useAuth();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [notificationSaving, setNotificationSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    preferredCurrency: "INR",
    timezone: "Asia/Kolkata",
  });

  const [notifications, setNotifications] = useState({
    emailEnabled: true,
    budgetAlerts: true,
    goalAlerts: true,
    recurringAlerts: true,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await getSettings();
        setProfile(response.data.profile);
        setNotifications(response.data.notifications);
      } catch (error) {
        toast.error(getApiError(error, "Could not load settings"));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setProfileSaving(true);

    try {
      const response = await updateProfileSettings({
        fullName: profile.fullName.trim(),
        preferredCurrency: profile.preferredCurrency,
        timezone: profile.timezone,
      });

      await refreshUser();
      await queryClient.invalidateQueries();
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not update profile settings"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handleNotificationSave = async () => {
    setNotificationSaving(true);

    try {
      const response = await updateNotificationSettings(notifications);
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not update notification preferences"));
    } finally {
      setNotificationSaving(false);
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();

    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await changePassword(passwords);
      setPasswords({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      clearAuthentication();
      toast.success(`${response.message}. Please log in again.`);
    } catch (error) {
      toast.error(getApiError(error, "Could not change password"));
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return (
      <PageContainer
        title="Settings"
        description="Manage your FinTrack profile, alerts, appearance, and account security."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-2xl bg-slate-200/70 dark:bg-slate-800"
            />
          ))}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Settings"
      description="Manage your FinTrack profile, alerts, appearance, and account security."
    >
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <DashboardCard>
          <SettingsSectionTitle
            icon={UserRound}
            title="Profile"
            description="Update the personal and regional preferences used across FinTrack."
          />

          <form className="space-y-4" onSubmit={handleProfileSave}>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Full name
              <input
                value={profile.fullName}
                onChange={(event) =>
                  setProfile((current) => ({
                    ...current,
                    fullName: event.target.value,
                  }))
                }
                className={inputClass}
                maxLength={60}
              />
            </label>

            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Email address
              <div className="relative">
                <input
                  value={profile.email}
                  readOnly
                  className={`${inputClass} cursor-not-allowed pr-10 opacity-70`}
                />
                <CheckCircle2
                  size={17}
                  className="absolute right-3.5 top-1/2 mt-1 -translate-y-1/2 text-emerald-500"
                />
              </div>
              <span className="mt-1.5 block text-xs text-slate-400">
                Email changes require a new verification flow and are kept locked here.
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Preferred currency
                <select
                  value={profile.preferredCurrency}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      preferredCurrency: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Timezone
                <select
                  value={profile.timezone}
                  onChange={(event) =>
                    setProfile((current) => ({
                      ...current,
                      timezone: event.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="Asia/Kolkata">India — Asia/Kolkata</option>
                  <option value="UTC">UTC</option>
                  <option value="Europe/London">Europe — London</option>
                  <option value="America/New_York">America — New York</option>
                  <option value="Asia/Singapore">Asia — Singapore</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end pt-1">
              <Button type="submit" disabled={profileSaving || !profile.fullName.trim()}>
                <Save size={17} />
                {profileSaving ? "Saving…" : "Save profile"}
              </Button>
            </div>
          </form>
        </DashboardCard>

        <DashboardCard>
          <SettingsSectionTitle
            icon={BellRing}
            title="Notifications"
            description="Choose which financial events FinTrack should alert you about."
          />

          <div className="space-y-3">
            <Toggle
              checked={notifications.budgetAlerts}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  budgetAlerts: checked,
                }))
              }
              label="Budget alerts"
              description="Notify me when a monthly category budget reaches 80% or is exceeded."
            />

            <Toggle
              checked={notifications.goalAlerts}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  goalAlerts: checked,
                }))
              }
              label="Goal milestones"
              description="Notify me when a savings goal reaches 50%, 75%, or 100%."
            />

            <Toggle
              checked={notifications.recurringAlerts}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  recurringAlerts: checked,
                }))
              }
              label="Recurring transaction alerts"
              description="Notify me when a due recurring item is processed into a transaction."
            />

            <Toggle
              checked={notifications.emailEnabled}
              onChange={(checked) =>
                setNotifications((current) => ({
                  ...current,
                  emailEnabled: checked,
                }))
              }
              label="Email copies"
              description="Also send enabled FinTrack alerts to my verified email address."
            />
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Disabling an alert type stops new in-app alerts and their email copies. Existing
            notifications remain in your history.
          </p>

          <div className="mt-5 flex justify-end">
            <Button onClick={handleNotificationSave} disabled={notificationSaving}>
              <Save size={17} />
              {notificationSaving ? "Saving…" : "Save notifications"}
            </Button>
          </div>
        </DashboardCard>

        <DashboardCard>
          <SettingsSectionTitle
            icon={MonitorCog}
            title="Appearance"
            description="Choose how FinTrack looks on this browser."
          />

          <div className="grid grid-cols-2 gap-3">
            {[
              ["light", "Light", "Bright workspace with dark text."],
              ["dark", "Dark", "Low-light workspace with dark surfaces."],
            ].map(([value, label, description]) => {
              const active = theme === value;

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTheme(value)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    active
                      ? "border-emerald-400 bg-emerald-50 ring-2 ring-emerald-400/15 dark:bg-emerald-500/10"
                      : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {label}
                    </span>
                    {active && <CheckCircle2 size={18} className="text-emerald-500" />}
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {description}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            Theme preference is saved locally and is applied immediately throughout FinTrack.
          </p>
        </DashboardCard>

        <DashboardCard>
          <SettingsSectionTitle
            icon={LockKeyhole}
            title="Security"
            description="Change your password without affecting your verified email or OTP login."
          />

          <form className="space-y-4" onSubmit={handlePasswordSave}>
            {[
              [
                "currentPassword",
                "Current password",
                showCurrentPassword,
                setShowCurrentPassword,
              ],
              ["newPassword", "New password", showNewPassword, setShowNewPassword],
              [
                "confirmPassword",
                "Confirm new password",
                showConfirmPassword,
                setShowConfirmPassword,
              ],
            ].map(([key, label, visible, setVisible]) => (
              <label
                key={key}
                className="block text-sm font-medium text-slate-700 dark:text-slate-200"
              >
                {label}
                <div className="relative">
                  <input
                    type={visible ? "text" : "password"}
                    value={passwords[key]}
                    onChange={(event) =>
                      setPasswords((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className={`${inputClass} pr-11`}
                    autoComplete={
                      key === "currentPassword" ? "current-password" : "new-password"
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setVisible((current) => !current)}
                    className="absolute right-3 top-1/2 mt-1 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    aria-label={visible ? `Hide ${label}` : `Show ${label}`}
                  >
                    {visible ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            ))}

            <p className="text-xs leading-5 text-slate-400">
              Use at least 8 characters with an uppercase letter, lowercase letter, and number.
            </p>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={
                  passwordSaving ||
                  !passwords.currentPassword ||
                  !passwords.newPassword ||
                  !passwords.confirmPassword
                }
              >
                <LockKeyhole size={17} />
                {passwordSaving ? "Changing…" : "Change password"}
              </Button>
            </div>
          </form>
        </DashboardCard>
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
        Signed in as <span className="font-semibold">{user?.email}</span>. Sensitive account
        actions remain protected by your existing verified-email and OTP authentication flow.
      </div>
    </PageContainer>
  );
};

export default SettingsPage;
