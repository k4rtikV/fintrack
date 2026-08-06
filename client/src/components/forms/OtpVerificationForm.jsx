import { useEffect, useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";

const OtpVerificationForm = ({
  title,
  description,
  email,
  isSubmitting,
  onSubmit,
  onResend,
}) => {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCountdown((current) => current - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    try {
      setIsResending(true);
      await onResend();
      setCountdown(60);
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(otp)) {
      return;
    }

    onSubmit(otp);
  };

  return (
    <section className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        <MailCheck size={24} />
      </div>

      <h1 className="mt-6 text-3xl font-bold text-slate-950">
        {title}
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <p className="mt-2 break-all text-sm font-semibold text-slate-700">
        {email}
      </p>

      <form
        className="mt-8"
        onSubmit={handleSubmit}
      >
        <label className="text-sm font-medium text-slate-700">
          Six-digit verification code

          <input
            value={otp}
            onChange={(event) => {
              const value = event.target.value
                .replace(/\D/g, "")
                .slice(0, 6);

              setOtp(value);
            }}
            inputMode="numeric"
            autoComplete="one-time-code"
            className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-4 text-center text-3xl font-bold tracking-[0.5em] outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            placeholder="000000"
          />
        </label>

        <button
          type="submit"
          disabled={
            isSubmitting ||
            otp.length !== 6
          }
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Verifying…"
            : "Verify code"}

          {!isSubmitting && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-slate-500">
        {countdown > 0 ? (
          <span>
            Request another code in {countdown}s
          </span>
        ) : (
          <button
            type="button"
            disabled={isResending}
            onClick={handleResend}
            className="font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            {isResending
              ? "Sending…"
              : "Resend verification code"}
          </button>
        )}
      </div>
    </section>
  );
};

export default OtpVerificationForm;