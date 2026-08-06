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

import { register as registerRequest } from "../services/authService";
import getApiError from "../utils/getApiError";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name")
      .max(60, "Name is too long"),

    email: z
      .string()
      .trim()
      .email("Enter a valid email address"),

    password: z
      .string()
      .min(8, "Password must contain at least 8 characters")
      .regex(/[a-z]/, "Add a lowercase letter")
      .regex(/[A-Z]/, "Add an uppercase letter")
      .regex(/[0-9]/, "Add a number"),

    confirmPassword: z
      .string()
      .min(1, "Confirm your password"),

    preferredCurrency: z.enum([
      "INR",
      "USD",
      "EUR",
      "GBP",
    ]),
  })
  .refine(
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    },
  );

const RegisterPage = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
  } = useForm({
    resolver: zodResolver(registerSchema),

    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      preferredCurrency: "INR",
    },
  });

  const onSubmit = async (values) => {
    try {
      const response = await registerRequest(values);

      sessionStorage.setItem(
        "fintrack_registration_email",
        response.data.email,
      );

      toast.success(response.message);

      navigate("/verify-registration", {
        state: {
          email: response.data.email,
        },
      });
    } catch (error) {
      toast.error(
        getApiError(error, "Registration failed"),
      );
    }
  };

  const inputClass =
    "mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100";

  return (
    <section className="rounded-3xl bg-white p-7 shadow-xl shadow-slate-200/70 sm:p-9">
      <p className="text-sm font-semibold text-emerald-600">
        Create your account
      </p>

      <h1 className="mt-2 text-3xl font-bold text-slate-950">
        Start tracking your finances
      </h1>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Your account will be activated after email verification.
      </p>

      <form
        className="mt-8 space-y-5"
        onSubmit={handleSubmit(onSubmit)}
      >
        <label className="block text-sm font-medium">
          Full name

          <input
            {...register("fullName")}
            className={inputClass}
            placeholder="Kartik Varma"
          />

          {errors.fullName && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.fullName.message}
            </span>
          )}
        </label>

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
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="At least 8 characters"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (currentValue) =>
                    !currentValue,
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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

        <label className="block text-sm font-medium">
          Confirm password

          <div className="relative mt-2">
            <input
              {...register("confirmPassword")}
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              placeholder="Repeat your password"
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  (currentValue) =>
                    !currentValue,
                )
              }
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md text-slate-400 transition hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
              title={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {errors.confirmPassword && (
            <span className="mt-1 block text-xs text-red-600">
              {errors.confirmPassword.message}
            </span>
          )}
        </label>

        <label className="block text-sm font-medium">
          Preferred currency

          <select
            {...register("preferredCurrency")}
            className={inputClass}
          >
            <option value="INR">
              INR — Indian Rupee
            </option>
            <option value="USD">
              USD — US Dollar
            </option>
            <option value="EUR">
              EUR — Euro
            </option>
            <option value="GBP">
              GBP — British Pound
            </option>
          </select>
        </label>

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? "Sending verification code…"
            : "Create account"}

          {!isSubmitting && <ArrowRight size={18} />}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-slate-500">
        Already have an account?{" "}

        <Link
          to="/login"
          className="font-semibold text-emerald-600 hover:text-emerald-700"
        >
          Log in
        </Link>
      </p>
    </section>
  );
};

export default RegisterPage;