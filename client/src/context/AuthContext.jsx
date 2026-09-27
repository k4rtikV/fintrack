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
import { lockPin as lockPinRequest } from "../services/securityService";
import {
  AUTH_APP_LOCKED_EVENT,
  AUTH_SESSION_INVALIDATED_EVENT,
} from "../utils/authEvents";

const AuthContext = createContext(null);

const defaultSessionSecurity = {
  pinEnabled: false,
  appLocked: false,
  appLockedAt: null,
  strongAuthFresh: false,
  strongAuthAt: null,
  idleLockMinutes: 15,
};

const normalizeSessionSecurity = (value) => ({
  ...defaultSessionSecurity,
  ...(value || {}),
});

const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [sessionSecurity, setSessionSecurityState] = useState(
    defaultSessionSecurity,
  );
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const clearPrivateClientState = useCallback(() => {
    queryClient.clear();
  }, [queryClient]);

  const applySessionSecurity = useCallback((value) => {
    setSessionSecurityState(normalizeSessionSecurity(value));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data.user);
      applySessionSecurity(response.data.sessionSecurity);

      return response.data.user;
    } catch {
      setUser(null);
      applySessionSecurity(null);
      return null;
    } finally {
      setIsAuthLoading(false);
    }
  }, [applySessionSecurity]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!user || !sessionSecurity.pinEnabled || sessionSecurity.appLocked) {
      return undefined;
    }

    const idleMinutes = Number(sessionSecurity.idleLockMinutes) || 15;
    const idleMs = idleMinutes * 60 * 1000;
    let timeoutId = null;
    let locking = false;

    const lockForIdle = async () => {
      if (locking) {
        return;
      }

      locking = true;
      clearPrivateClientState();
      setSessionSecurityState((current) => ({
        ...normalizeSessionSecurity(current),
        pinEnabled: true,
        appLocked: true,
        appLockedAt: new Date().toISOString(),
      }));

      try {
        await lockPinRequest();
      } catch {
        // The server independently enforces idle locking based on session
        // activity. A temporary network failure must not reveal cached data.
      }
    };

    const scheduleLock = () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(lockForIdle, idleMs);
    };

    const activityEvents = ["pointerdown", "keydown", "touchstart", "wheel"];
    activityEvents.forEach((eventName) =>
      window.addEventListener(eventName, scheduleLock, { passive: true }),
    );
    scheduleLock();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      activityEvents.forEach((eventName) =>
        window.removeEventListener(eventName, scheduleLock),
      );
    };
  }, [
    clearPrivateClientState,
    sessionSecurity.appLocked,
    sessionSecurity.idleLockMinutes,
    sessionSecurity.pinEnabled,
    user,
  ]);

  useEffect(() => {
    const handleSessionInvalidated = () => {
      clearPrivateClientState();
      setUser(null);
      applySessionSecurity(null);
      setIsAuthLoading(false);
    };

    const handleAppLocked = () => {
      clearPrivateClientState();
      setSessionSecurityState((current) => ({
        ...normalizeSessionSecurity(current),
        pinEnabled: true,
        appLocked: true,
        appLockedAt: new Date().toISOString(),
      }));
      setIsAuthLoading(false);
    };

    window.addEventListener(
      AUTH_SESSION_INVALIDATED_EVENT,
      handleSessionInvalidated,
    );
    window.addEventListener(
      AUTH_APP_LOCKED_EVENT,
      handleAppLocked,
    );

    return () => {
      window.removeEventListener(
        AUTH_SESSION_INVALIDATED_EVENT,
        handleSessionInvalidated,
      );
      window.removeEventListener(
        AUTH_APP_LOCKED_EVENT,
        handleAppLocked,
      );
    };
  }, [applySessionSecurity, clearPrivateClientState]);

  const completeAuthentication = useCallback(
    (authenticatedUser, nextSessionSecurity = null) => {
      clearPrivateClientState();
      setUser(authenticatedUser);
      applySessionSecurity(nextSessionSecurity);
      setIsAuthLoading(false);
    },
    [applySessionSecurity, clearPrivateClientState],
  );

  const clearAuthentication = useCallback(() => {
    clearPrivateClientState();
    setUser(null);
    applySessionSecurity(null);
    setIsAuthLoading(false);
  }, [applySessionSecurity, clearPrivateClientState]);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      clearPrivateClientState();
      setUser(null);
      applySessionSecurity(null);
      setIsAuthLoading(false);
    }
  }, [applySessionSecurity, clearPrivateClientState]);

  const value = useMemo(
    () => ({
      user,
      sessionSecurity,
      isAuthenticated: Boolean(user),
      isPinLocked: Boolean(user && sessionSecurity.appLocked),
      isAuthLoading,
      refreshUser,
      completeAuthentication,
      clearAuthentication,
      applySessionSecurity,
      logout,
    }),
    [
      user,
      sessionSecurity,
      isAuthLoading,
      refreshUser,
      completeAuthentication,
      clearAuthentication,
      applySessionSecurity,
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
