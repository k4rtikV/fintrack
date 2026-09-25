import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import GoogleSignInButton from "../components/auth/GoogleSignInButton";
import useAuth from "../hooks/useAuth";
import {
  authenticateWithGoogle,
  getCurrentUser,
  linkLegacyGoogleAccount,
} from "../services/authService";
import getApiError from "../utils/getApiError";

const LoginPage = () => {
  const navigate = useNavigate();
  const { completeAuthentication } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legacyMigration, setLegacyMigration] = useState(null);
  const [legacyPassword, setLegacyPassword] = useState("");

  const finishAuthentication = useCallback(
    async (message) => {
      const sessionResponse = await getCurrentUser();
      completeAuthentication(sessionResponse.data.user);
      navigate("/dashboard", { replace: true });
      toast.success(message);
    },
    [completeAuthentication, navigate],
  );

  const handleGoogleCredential = useCallback(
    async (credential, nonce) => {
      setIsSubmitting(true);

      try {
        const response = await authenticateWithGoogle(credential);
        await finishAuthentication(response.message);
      } catch (error) {
        const code = error?.response?.data?.errors?.code;
        const email = error?.response?.data?.errors?.email;

        if (code === "LEGACY_ACCOUNT_REQUIRES_LINK") {
          setLegacyMigration({
            credential,
            nonce,
            email: email || "your existing FinTrack account",
          });
          setLegacyPassword("");
          toast(
            "One-time migration required. Confirm your existing FinTrack password to replace legacy login with Google.",
          );
          return;
        }

        toast.error(getApiError(error, "Google sign-in failed"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [finishAuthentication],
  );

  const handleLegacyMigration = async (event) => {
    event.preventDefault();

    if (
      !legacyMigration?.credential ||
      !legacyMigration?.nonce ||
      !legacyPassword
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await linkLegacyGoogleAccount({
        credential: legacyMigration.credential,
        password: legacyPassword,
      });

      setLegacyMigration(null);
      setLegacyPassword("");
      await finishAuthentication(response.message);
    } catch (error) {
      toast.error(
        getApiError(error, "Could not migrate the existing FinTrack account"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
      <p className="text-sm font-semibold text-emerald-600">
        Secure access
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-950">
        Continue to FinTrack
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Sign in or create your FinTrack account with Google. FinTrack does not
        receive or store your Google password.
      </p>

      <div className="mt-8">
        <GoogleSignInButton
          onCredential={handleGoogleCredential}
          disabled={isSubmitting}
        />
      </div>

      {isSubmitting && !legacyMigration && (
        <p className="mt-4 text-center text-xs text-slate-400">
          Verifying your Google identity and creating a secure FinTrack session…
        </p>
      )}

      {legacyMigration && (
        <form
          className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-5"
          onSubmit={handleLegacyMigration}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl bg-amber-100 p-2 text-amber-700">
              <LockKeyhole size={18} />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">
                One-time v1 account migration
              </h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                A verified FinTrack v1 account already exists for
                {" "}
                <span className="font-semibold">{legacyMigration.email}</span>.
                Confirm its current FinTrack password once. After migration,
                the legacy password and OTP credentials are removed and Google
                becomes the only primary sign-in method.
              </p>
            </div>
          </div>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Current FinTrack password
            <input
              type="password"
              value={legacyPassword}
              onChange={(event) => setLegacyPassword(event.target.value)}
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-amber-200 bg-white px-4 py-3 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              placeholder="Used only for this migration"
            />
          </label>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setLegacyMigration(null);
                setLegacyPassword("");
              }}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500 transition hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !legacyPassword}
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Migrating…" : "Migrate securely"}
            </button>
          </div>
        </form>
      )}

      <div className="mt-7 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <ShieldCheck className="mt-0.5 shrink-0 text-emerald-600" size={18} />
        <p className="text-xs leading-5 text-slate-500">
          Google proves your external identity; FinTrack still creates and
          validates its own server-side session. Existing accounts are never
          silently claimed by email alone.
        </p>
      </div>
    </section>
  );
};

export default LoginPage;
