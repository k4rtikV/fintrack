import { KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import GoogleSignInButton from "../auth/GoogleSignInButton";
import DashboardCard from "../layout/DashboardCard";
import Button from "../ui/Button";
import useAuth from "../../hooks/useAuth";
import { reauthenticateWithGoogle } from "../../services/authService";
import {
  changePin,
  disablePin,
  enrollPin,
  lockPin,
  resetPin,
} from "../../services/securityService";
import { announceAppLocked } from "../../utils/authEvents";
import getApiError from "../../utils/getApiError";

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

const sanitizePin = (value) => value.replace(/\D/g, "").slice(0, 6);

const PinSecurityCard = () => {
  const { sessionSecurity, applySessionSecurity } = useAuth();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("");
  const [pin, setPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const clearFields = () => {
    setPin("");
    setCurrentPin("");
    setNewPin("");
    setConfirmPin("");
  };

  const handleGoogleReauth = async (credential) => {
    setBusy(true);

    try {
      const response = await reauthenticateWithGoogle(credential);
      applySessionSecurity(response.data.sessionSecurity);
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Google verification failed"));
    } finally {
      setBusy(false);
    }
  };

  const validateConfirmation = (value, confirmation) => {
    if (!/^\d{6}$/.test(value)) {
      toast.error("PIN must contain exactly 6 digits");
      return false;
    }

    if (value !== confirmation) {
      toast.error("PIN confirmation does not match");
      return false;
    }

    return true;
  };

  const handleEnroll = async (event) => {
    event.preventDefault();

    if (!validateConfirmation(pin, confirmPin)) {
      return;
    }

    setBusy(true);

    try {
      const response = await enrollPin(pin);
      applySessionSecurity(response.data.sessionSecurity);
      clearFields();
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not enable PIN"));
    } finally {
      setBusy(false);
    }
  };

  const handleChange = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(currentPin)) {
      toast.error("Enter the current 6-digit PIN");
      return;
    }

    if (!validateConfirmation(newPin, confirmPin)) {
      return;
    }

    setBusy(true);

    try {
      const response = await changePin({ currentPin, newPin });
      applySessionSecurity(response.data.sessionSecurity);
      clearFields();
      setMode("");
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not change PIN"));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();

    if (!validateConfirmation(newPin, confirmPin)) {
      return;
    }

    setBusy(true);

    try {
      const response = await resetPin(newPin);
      applySessionSecurity(response.data.sessionSecurity);
      clearFields();
      setMode("");
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not reset PIN"));
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Disable the 6-digit PIN on this trusted device?")) {
      return;
    }

    setBusy(true);

    try {
      const response = await disablePin();
      applySessionSecurity(response.data.sessionSecurity);
      clearFields();
      setMode("");
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not disable PIN"));
    } finally {
      setBusy(false);
    }
  };

  const handleLock = async () => {
    setBusy(true);

    try {
      const response = await lockPin();
      applySessionSecurity(response.data.sessionSecurity);
      announceAppLocked();
    } catch (error) {
      toast.error(getApiError(error, "Could not lock FinTrack"));
      setBusy(false);
    }
  };

  const strongAuthNotice = !sessionSecurity.strongAuthFresh && (
    <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" size={18} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Fresh Google verification required
          </p>
          <p className="mt-1 text-xs leading-5 text-amber-700/80 dark:text-amber-200/70">
            PIN enrollment, changes, resets and disabling require recent strong authentication.
          </p>
          <div className="mt-3">
            <GoogleSignInButton
              onCredential={handleGoogleReauth}
              disabled={busy}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardCard>
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <KeyRound size={18} />
        </div>
        <div>
          <h2 className="font-semibold text-slate-900 dark:text-white">
            Quick PIN
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            Optional 6-digit trusted-device unlock. Google remains your primary identity and recovery method.
          </p>
        </div>
      </div>

      {!sessionSecurity.pinEnabled ? (
        <>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/60">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              PIN is disabled on this device
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              When enabled, this server session will automatically lock after approximately {sessionSecurity.idleLockMinutes || 15} minutes of inactivity.
            </p>
          </div>

          {strongAuthNotice}

          {sessionSecurity.strongAuthFresh && (
            <form className="mt-5 space-y-4" onSubmit={handleEnroll}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                New 6-digit PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={pin}
                  onChange={(event) => setPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <Button type="submit" disabled={busy || pin.length !== 6 || confirmPin.length !== 6}>
                <LockKeyhole size={16} />
                {busy ? "Enabling…" : "Enable PIN"}
              </Button>
            </form>
          )}
        </>
      ) : (
        <>
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
              PIN protection enabled
            </p>
            <p className="mt-1 text-xs leading-5 text-emerald-700/80 dark:text-emerald-200/70">
              The PIN verifier is memory-hard and server-side. The browser never decides whether a session is unlocked.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={handleLock} disabled={busy}>
              <LockKeyhole size={16} />
              Lock now
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearFields();
                setMode(mode === "change" ? "" : "change");
              }}
              disabled={busy}
            >
              Change PIN
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                clearFields();
                setMode(mode === "reset" ? "" : "reset");
              }}
              disabled={busy}
            >
              Reset PIN
            </Button>
          </div>

          {strongAuthNotice}

          {mode === "change" && sessionSecurity.strongAuthFresh && (
            <form className="mt-5 space-y-4" onSubmit={handleChange}>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Current PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(event) => setCurrentPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                New PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => setNewPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm new PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <Button type="submit" disabled={busy}>Save new PIN</Button>
            </form>
          )}

          {mode === "reset" && sessionSecurity.strongAuthFresh && (
            <form className="mt-5 space-y-4" onSubmit={handleReset}>
              <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                A reset does not require the current PIN because the linked Google identity was freshly reverified.
              </p>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                New PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={newPin}
                  onChange={(event) => setNewPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                Confirm new PIN
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmPin}
                  onChange={(event) => setConfirmPin(sanitizePin(event.target.value))}
                  className={inputClass}
                  placeholder="••••••"
                />
              </label>
              <Button type="submit" disabled={busy}>Reset PIN</Button>
            </form>
          )}

          <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
            <Button
              type="button"
              variant="danger"
              onClick={handleDisable}
              disabled={busy || !sessionSecurity.strongAuthFresh}
            >
              Disable PIN on this device
            </Button>
          </div>
        </>
      )}
    </DashboardCard>
  );
};

export default PinSecurityCard;
