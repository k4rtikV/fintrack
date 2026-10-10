import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getCurrentUser,
  logout as logoutRequest,
} from "../services/authService";
import { lockPin as lockPinRequest } from "../services/securityService";
import { cancelPendingReportDownloads } from "../services/reportService";
import { cancelPendingTransactionExports } from "../services/transactionService";
import {
  cancelAssistantRequest,
  clearAssistantUserState,
  getAssistantUserId,
} from "../services/assistantConversationService";
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
  // Route-independent async work must never be revived by an older /auth/me
  // response after login, logout, PIN lock, or a different refresh finishes.
  const authRevisionRef = useRef(0);
  const refreshSequenceRef = useRef(0);
  const currentUserRef = useRef(null);
  const invalidateAuthRefresh = useCallback(() => {
    authRevisionRef.current += 1;
    refreshSequenceRef.current += 1;
  }, []);

  const clearPrivateClientState = useCallback(() => {
    cancelPendingReportDownloads();
    cancelPendingTransactionExports();
    queryClient.clear();
  }, [queryClient]);

  const applySessionSecurity = useCallback((value) => {
    setSessionSecurityState(normalizeSessionSecurity(value));
  }, []);

  const refreshUser = useCallback(async () => {
    const revision = authRevisionRef.current;
    const sequence = ++refreshSequenceRef.current;
    const stillCurrent = () => authRevisionRef.current === revision &&
      refreshSequenceRef.current === sequence;
    try {
      const response = await getCurrentUser();
      if (!stillCurrent()) return null;
      currentUserRef.current = response.data.user;
      setUser(response.data.user);
      applySessionSecurity(response.data.sessionSecurity);
      return response.data.user;
    } catch (error) {
      if (!stillCurrent()) return null;
      // A temporary network/5xx failure while refreshing PIN/settings does
      // not sign out an authenticated user. An actual 401 is independently
      // handled by the global session-invalidation interceptor.
      if (currentUserRef.current && error.response?.status !== 401) {
        throw error;
      }
      currentUserRef.current = null;
      setUser(null);
      applySessionSecurity(null);
      return null;
    } finally {
      if (stillCurrent()) setIsAuthLoading(false);
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
      invalidateAuthRefresh();
      cancelAssistantRequest(user, { reason: "locked" });
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
    invalidateAuthRefresh,
    sessionSecurity.appLocked,
    sessionSecurity.idleLockMinutes,
    sessionSecurity.pinEnabled,
    user,
  ]);

  useEffect(() => {
    const handleSessionInvalidated = () => {
      invalidateAuthRefresh();
      currentUserRef.current = null;
      if (user) {
        clearAssistantUserState(user);
      }
      clearPrivateClientState();
      setUser(null);
      applySessionSecurity(null);
      setIsAuthLoading(false);
    };

    const handleAppLocked = () => {
      invalidateAuthRefresh();
      if (user) {
        cancelAssistantRequest(user, { reason: "locked" });
      }
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
  }, [applySessionSecurity, clearPrivateClientState, invalidateAuthRefresh, user]);

  const completeAuthentication = useCallback(
    (authenticatedUser, nextSessionSecurity = null) => {
      invalidateAuthRefresh();
      currentUserRef.current = authenticatedUser;
      if (
        user &&
        getAssistantUserId(user) !== getAssistantUserId(authenticatedUser)
      ) {
        clearAssistantUserState(user);
      }
      clearPrivateClientState();
      setUser(authenticatedUser);
      applySessionSecurity(nextSessionSecurity);
      setIsAuthLoading(false);
    },
    [applySessionSecurity, clearPrivateClientState, invalidateAuthRefresh, user],
  );

  const clearAuthentication = useCallback(() => {
    invalidateAuthRefresh();
    currentUserRef.current = null;
    if (user) {
      clearAssistantUserState(user);
    }
    clearPrivateClientState();
    setUser(null);
    applySessionSecurity(null);
    setIsAuthLoading(false);
  }, [applySessionSecurity, clearPrivateClientState, invalidateAuthRefresh, user]);

  const logout = useCallback(async () => {
    invalidateAuthRefresh();
    if (user) clearAssistantUserState(user);
    clearPrivateClientState();
    // Hide all protected content while the server revokes the session, but do
    // not falsely claim "logged out" if the request never reached the server.
    setIsAuthLoading(true);
    try {
      await logoutRequest();
    } catch (error) {
      setIsAuthLoading(false);
      throw error;
    }
    currentUserRef.current = null;
    setUser(null);
    applySessionSecurity(null);
    setIsAuthLoading(false);
  }, [applySessionSecurity, clearPrivateClientState, invalidateAuthRefresh, user]);

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
