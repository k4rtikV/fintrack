import { Navigate, Outlet } from "react-router-dom";

import useAuth from "../hooks/useAuth";

const PublicOnlyRoute = () => {
  const {
    isAuthenticated,
    isAuthLoading,
  } = useAuth();

  if (isAuthLoading) {
    return null;
  }

  if (isAuthenticated) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
};

export default PublicOnlyRoute;