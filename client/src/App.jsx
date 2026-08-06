import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import DashboardPage from "./pages/DashboardPage";
import LoginOtpPage from "./pages/LoginOtpPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RegistrationOtpPage from "./pages/RegistrationOtpPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";

const App = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route
            path="/register"
            element={<RegisterPage />}
          />

          <Route
            path="/verify-registration"
            element={<RegistrationOtpPage />}
          />

          <Route
            path="/login"
            element={<LoginPage />}
          />

          <Route
            path="/verify-login"
            element={<LoginOtpPage />}
          />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
  );
};

export default App;