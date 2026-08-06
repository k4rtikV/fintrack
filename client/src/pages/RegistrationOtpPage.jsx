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
    try {
      setIsSubmitting(true);

      const response = await verifyRegistrationOtp({
        email,
        otp,
      });

      completeAuthentication(response.data.user);

      sessionStorage.removeItem(
        "fintrack_registration_email",
      );

      toast.success(response.message);
      navigate("/dashboard", {
        replace: true,
      });
    } catch (error) {
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