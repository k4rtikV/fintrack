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
  resendRegistrationOtp,
  verifyRegistrationOtp,
} from "../services/authService";

import getApiError from "../utils/getApiError";

const RegistrationOtpPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { completeAuthentication } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const email =
    location.state?.email ||
    sessionStorage.getItem(
      "fintrack_registration_email",
    );

  if (!email) {
    return (
      <Navigate
        to="/register"
        replace
      />
    );
  }

  const handleVerify = async (otp) => {
    let otpAccepted = false;

    try {
      setIsSubmitting(true);

      const response = await verifyRegistrationOtp({
        email,
        otp,
      });

      otpAccepted = true;

      // Confirm that the browser retained the new authenticated session
      // before mounting protected routes.
      const sessionResponse = await getCurrentUser();

      completeAuthentication(sessionResponse.data.user);

      sessionStorage.removeItem(
        "fintrack_registration_email",
      );

      navigate("/dashboard", {
        replace: true,
      });

      toast.success(response.message);
    } catch (error) {
      if (otpAccepted) {
        sessionStorage.removeItem(
          "fintrack_registration_email",
        );

        navigate("/login", {
          replace: true,
        });

        toast.error(
          "Your account was verified, but this browser did not retain the FinTrack session. Please log in again after allowing site cookies.",
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
      const response =
        await resendRegistrationOtp(email);

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
      title="Verify your email"
      description="We sent a registration verification code to:"
      email={email}
      isSubmitting={isSubmitting}
      onSubmit={handleVerify}
      onResend={handleResend}
    />
  );
};

export default RegistrationOtpPage;