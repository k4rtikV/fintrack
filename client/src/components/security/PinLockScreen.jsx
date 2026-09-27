import { KeyRound, LockKeyhole, LogOut, ShieldCheck } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import GoogleSignInButton from "../auth/GoogleSignInButton";
import useAuth from "../../hooks/useAuth";
import { reauthenticateWithGoogle } from "../../services/authService";
import { resetPin, unlockPin } from "../../services/securityService";
import getApiError from "../../utils/getApiError";

const pinInputClass =
  "w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-center text-2xl font-bold tracking-[0.55em] text-white outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10";

const PinLockScreen = () => {
  const { logout, refreshUser, sessionSecurity } = useAuth();
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [googleVerified, setGoogleVerified] = useState(false);
  const [busy, setBusy] = useState(false);

  const handlePinChange = (setter) => (event) => {
    setter(event.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handleUnlock = async (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(pin)) {
      toast.error("Enter your 6-digit PIN");
      return;
    }

    setBusy(true);

    try {
      const response = await unlockPin(pin);
      setPin("");
      await refreshUser();
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not unlock FinTrack"));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleCredential = async (credential) => {
    setBusy(true);

    try {
      const response = await reauthenticateWithGoogle(credential);
      setGoogleVerified(true);
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Google verification failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event) => {
    event.preventDefault();

    if (!googleVerified) {
      toast.error("Verify your Google identity first");
      return;
    }

    if (!/^\d{6}$/.test(newPin)) {
      toast.error("New PIN must contain exactly 6 digits");
      return;
    }

    if (newPin !== confirmPin) {
      toast.error("PIN confirmation does not match");
      return;
    }

    setBusy(true);

    try {
      const response = await resetPin(newPin);
      setNewPin("");
      setConfirmPin("");
      setGoogleVerified(false);
      setResetMode(false);
      await refreshUser();
      toast.success(response.message);
    } catch (error) {
      toast.error(getApiError(error, "Could not reset PIN"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-7 shadow-2xl shadow-black/30 sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950">
          <LockKeyhole size={27} />
        </div>

        <h1 className="mt-5 text-center text-2xl font-bold">
          FinTrack is locked
        </h1>
        <p className="mt-2 text-center text-sm leading-6 text-slate-400">
          This trusted device locks after {sessionSecurity.idleLockMinutes || 15} minutes of inactivity. Your Google identity remains the primary account credential.
        </p>

        {!resetMode ? (
          <form className="mt-7" onSubmit={handleUnlock}>
            <label className="block text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              6-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pin}
              onChange={handlePinChange(setPin)}
              className={`${pinInputClass} mt-3`}
              placeholder="••••••"
              aria-label="6-digit FinTrack PIN"
              autoFocus
            />

            <button
              type="submit"
              disabled={busy || pin.length !== 6}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <KeyRound size={18} />
              {busy ? "Unlocking…" : "Unlock FinTrack"}
            </button>

            <button
              type="button"
              onClick={() => {
                setResetMode(true);
                setPin("");
              }}
              className="mt-4 w-full text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              Forgot PIN? Verify with Google
            </button>
          </form>
        ) : (
          <div className="mt-7">
            <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={19} />
                <p className="text-xs leading-5 text-slate-400">
                  Resetting the PIN requires fresh Google verification for the exact Google identity linked to this FinTrack account.
                </p>
              </div>
            </div>

            {!googleVerified ? (
              <div className="mt-5">
                <GoogleSignInButton
                  onCredential={handleGoogleCredential}
                  disabled={busy}
                />
              </div>
            ) : (
              <form className="mt-5 space-y-4" onSubmit={handleReset}>
                <label className="block text-sm text-slate-300">
                  New 6-digit PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    value={newPin}
                    onChange={handlePinChange(setNewPin)}
                    className={`${pinInputClass} mt-2`}
                    placeholder="••••••"
                  />
                </label>
                <label className="block text-sm text-slate-300">
                  Confirm new PIN
                  <input
                    type="password"
                    inputMode="numeric"
                    value={confirmPin}
                    onChange={handlePinChange(setConfirmPin)}
                    className={`${pinInputClass} mt-2`}
                    placeholder="••••••"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busy || newPin.length !== 6 || confirmPin.length !== 6}
                  className="w-full rounded-2xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:opacity-50"
                >
                  {busy ? "Resetting…" : "Reset PIN and unlock"}
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => {
                setResetMode(false);
                setGoogleVerified(false);
                setNewPin("");
                setConfirmPin("");
              }}
              disabled={busy}
              className="mt-4 w-full text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              Back to PIN unlock
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={logout}
          disabled={busy}
          className="mt-7 flex w-full items-center justify-center gap-2 border-t border-white/10 pt-5 text-sm font-semibold text-slate-500 transition hover:text-white"
        >
          <LogOut size={16} />
          Sign out instead
        </button>
      </section>
    </main>
  );
};

export default PinLockScreen;
