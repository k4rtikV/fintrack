import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  logout as logoutRequest,
} from "../services/authService";
import { AUTH_SESSION_INVALIDATED_EVENT } from "../utils/authEvents";

const AuthContext = createContext(null);

const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearPrivateClientState = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data.user);

      return response.data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    const handleSessionInvalidated = () => {
      clearPrivateClientState();
      setUser(null);
      setIsAuthLoading(false);
    };

    window.addEventListener(
      AUTH_SESSION_INVALIDATED_EVENT,
      handleSessionInvalidated,
    );

    return () =>
      window.removeEventListener(
        AUTH_SESSION_INVALIDATED_EVENT,
        handleSessionInvalidated,
      );
  }, [clearPrivateClientState]);

  const completeAuthentication = useCallback(
    (authenticatedUser) => {
      // Authentication can happen without a full page reload. Clear all
      // account-scoped query data before mounting the newly authenticated user.
      clearPrivateClientState();
      setUser(authenticatedUser);
      setIsAuthLoading(false);
    },
    [clearPrivateClientState],
  );

  const clearAuthentication = useCallback(() => {
    clearPrivateClientState();
    setUser(null);
    setIsAuthLoading(false);
  }, [clearPrivateClientState]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearPrivateClientState();
      setUser(null);
      setIsAuthLoading(false);
    }
  }, [clearPrivateClientState]);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isAuthLoading,
      refreshUser,
      completeAuthentication,
      clearAuthentication,
      logout,
    }),
    [
      user,
      isAuthLoading,
      refreshUser,
      completeAuthentication,
      clearAuthentication,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
