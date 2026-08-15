import { useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import toast from "react-hot-toast";

import OtpVerificationForm from "../components/forms/OtpVerificationForm";
import useAuth from "../hooks/useAuth";

import {
  getCurrentUser,
  resendLoginOtp,
  verifyLoginOtp,
} from "../services/authService";

import getApiError from "../utils/getApiError";

const LoginOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeAuthentication } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const email =
    location.state?.email ||
    sessionStorage.getItem("fintrack_login_email");

  if (!email) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const handleVerify = async (otp) => {
    let otpAccepted = false;

    try {
      setIsSubmitting(true);

      const response = await verifyLoginOtp({
        email,
        otp,
      });

      otpAccepted = true;

      // Do not report a completed login until the browser proves that it
      // retained the HttpOnly session cookie and can use it on a protected
      // request. This also catches browsers that block cross-site cookies.
      const sessionResponse = await getCurrentUser();

      completeAuthentication(sessionResponse.data.user);

      sessionStorage.removeItem(
        "fintrack_login_email",
      );

      navigate("/dashboard", {
        replace: true,
      });

      toast.success(response.message);
    } catch (error) {
      if (otpAccepted) {
        sessionStorage.removeItem(
          "fintrack_login_email",
        );

        navigate("/login", {
          replace: true,
        });

        toast.error(
          "Your OTP was accepted, but this browser did not retain the FinTrack session. Please try again after allowing site cookies.",
        );

        return;
      }

      toast.error(
        getApiError(error, "OTP verification failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      const response = await resendLoginOtp(email);
      toast.success(response.message);
    } catch (error) {
      toast.error(
        getApiError(error, "Unable to resend OTP"),
      );

      throw error;
    }
  };

  return (
    <OtpVerificationForm
      title="Confirm your login"
      description="We sent a login verification code to:"
      email={email}
      isSubmitting={isSubmitting}
      onSubmit={handleVerify}
      onResend={handleResend}
    />
  );
};

export default LoginOtpPage;