const AUTH_SESSION_INVALIDATED_EVENT = "fintrack:auth-session-invalidated";
const AUTH_APP_LOCKED_EVENT = "fintrack:app-locked";

const announceAuthSessionInvalidated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
};

const announceAppLocked = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_APP_LOCKED_EVENT));
};

export {
  AUTH_APP_LOCKED_EVENT,
  AUTH_SESSION_INVALIDATED_EVENT,
  announceAppLocked,
  announceAuthSessionInvalidated,
};
