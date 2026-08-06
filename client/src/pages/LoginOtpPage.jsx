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
    try {
      setIsSubmitting(true);

      const response = await verifyLoginOtp({
        email,
        otp,
      });

      completeAuthentication(response.data.user);

      sessionStorage.removeItem(
        "fintrack_login_email",
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