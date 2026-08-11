const AUTH_SESSION_INVALIDATED_EVENT = "fintrack:auth-session-invalidated";

const announceAuthSessionInvalidated = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(AUTH_SESSION_INVALIDATED_EVENT));
};

export {
  AUTH_SESSION_INVALIDATED_EVENT,
  announceAuthSessionInvalidated,
};
