import { Navigate, Route, Routes } from "react-router-dom";

import AuthLayout from "./layouts/AuthLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import AccountsPage from "./pages/AccountsPage";
import BudgetsPage from "./pages/BudgetsPage";
import DashboardPage from "./pages/DashboardPage";
import LoginOtpPage from "./pages/LoginOtpPage";
import LoginPage from "./pages/LoginPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import RegisterPage from "./pages/RegisterPage";
import RegistrationOtpPage from "./pages/RegistrationOtpPage";
import TransactionsPage from "./pages/TransactionsPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import PublicOnlyRoute from "./routes/PublicOnlyRoute";

const placeholderRoutes = [
  "categories",
  "goals",
  "reports",
  "assistant",
  "settings",
];

const App = () => {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route element={<AuthLayout />}>
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/verify-registration"
            element={<RegistrationOtpPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/verify-login" element={<LoginOtpPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />

          {placeholderRoutes.map((path) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<PlaceholderPage />}
            />
          ))}
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
