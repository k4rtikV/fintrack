import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { z } from "zod";

import { login as loginRequest } from "../services/authService";
import getApiError from "../utils/getApiError";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),

  password: z
    .string()
    .min(1, "Password is required"),
});

const LoginPage = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values) => {
    try {
      const response = await loginRequest(values);

      sessionStorage.setItem(
        "fintrack_login_email",
        response.data.email,
      );

      toast.success(response.message);

      navigate("/verify-login", {
        state: {
          email: response.data.email,
        },
      });
    } catch (error) {
      const code =
        error?.response?.data?.errors?.code;

      const email =
        error?.response?.data?.errors?.email;

      if (code === "EMAIL_NOT_VERIFIED" && email) {
        sessionStorage.setItem(
          "fintrack_registration_email",
          email,
        );

        navigate("/verify-registration", {
          state: {
            email,
          },
        });
      }

      toast.error(
        getApiError(error, "Login failed"),
      );
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <section className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
      <p className="text-sm font-semibold text-emerald-600">
        Welcome back
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-950">
        Log in to FinTrack
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        After verifying your password, we’ll send a login code to your email.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={handleSubmit(onSubmit)}
      >
        <label className="block text-sm font-medium">
          Email address

          <input
            {...register("email")}
            type="email"
            className={inputClass}
            placeholder="you@example.com"
          />

          {errors.email && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.email.message}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium">
          Password

          <div className="relative mt-2">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Enter your password"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword((current) => !current)
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
              title={
                showPassword
                  ? "Hide password"
                  : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {errors.password && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.password.message}
            </span>
          )}
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Sending login code…"
            : "Continue"}

          {!isSubmitting && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        New to FinTrack?{" "}

        <Link
          to="/register"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
};

export default LoginPage;