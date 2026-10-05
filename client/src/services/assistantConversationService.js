import getApiError from "../utils/getApiError.js";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me about your FinTrack accounts, transactions, transfers, Autopay, budgets, goals, forecasts, investment holdings, recorded stock trades, watchlist, or read-only market research. I’ll use the relevant FinTrack data instead of treating one ledger as a substitute for another.",
};

const sessions = new Map();

const makeMessage = (role, content, metadata = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  ...metadata,
});

const getAssistantUserId = (user) =>
  user?._id || user?.id || user?.email || "current-user";

const storageKeys = (userId) => ({
  chat: `fintrack_assistant_chat:${userId}`,
  draft: `fintrack_assistant_draft:${userId}`,
  cooldown: `fintrack_assistant_cooldown:${userId}`,
  pending: `fintrack_assistant_pending:${userId}`,
});

const safeSessionStorage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      // Persistence is best-effort; the in-memory conversation remains usable.
    }
  },
  remove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Persistence cleanup is best-effort.
    }
  },
};

const loadMessages = (userId) => {
  const stored = safeSessionStorage.get(storageKeys(userId).chat);
  if (!stored) return [WELCOME_MESSAGE];

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [WELCOME_MESSAGE];

    const valid = parsed.filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    );

    return valid.length ? valid : [WELCOME_MESSAGE];
  } catch {
    return [WELCOME_MESSAGE];
  }
};

const loadCooldownUntil = (userId) => {
  const stored = Number(safeSessionStorage.get(storageKeys(userId).cooldown));
  return Number.isFinite(stored) && stored > Date.now() ? stored : 0;
};

const loadPendingMarker = (userId) => {
  const stored = safeSessionStorage.get(storageKeys(userId).pending);
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.requestId === "string" &&
      typeof parsed.prompt === "string" &&
      parsed.prompt.trim()
    ) {
      return parsed;
    }
  } catch {
    // Invalid pending metadata is treated as stale and removed below.
  }

  safeSessionStorage.remove(storageKeys(userId).pending);
  return null;
};

const createSession = (userId) => {
  const messages = loadMessages(userId);
  const stalePending = loadPendingMarker(userId);

  if (stalePending) {
    messages.push(
      makeMessage(
        "assistant",
        "That request was interrupted by a page reload before FinTrack could reconnect to its result. Retry it to continue.",
        { isError: true, retryPrompt: stalePending.prompt, interruption: "reload" },
      ),
    );
    safeSessionStorage.remove(storageKeys(userId).pending);
    safeSessionStorage.set(storageKeys(userId).chat, JSON.stringify(messages));
  }

  return {
    userId,
    messages,
    draft: safeSessionStorage.get(storageKeys(userId).draft) || "",
    cooldownUntil: loadCooldownUntil(userId),
    pending: null,
    controller: null,
    listeners: new Set(),
    version: 0,
  };
};

const ensureSession = (userOrId) => {
  const userId =
    typeof userOrId === "string" ? userOrId : getAssistantUserId(userOrId);

  if (!sessions.has(userId)) {
    sessions.set(userId, createSession(userId));
  }

  return sessions.get(userId);
};

const persistSession = (state) => {
  const keys = storageKeys(state.userId);
  safeSessionStorage.set(keys.chat, JSON.stringify(state.messages));

  if (state.draft) safeSessionStorage.set(keys.draft, state.draft);
  else safeSessionStorage.remove(keys.draft);

  if (state.cooldownUntil > Date.now()) {
    safeSessionStorage.set(keys.cooldown, String(state.cooldownUntil));
  } else {
    safeSessionStorage.remove(keys.cooldown);
  }

  if (state.pending) {
    safeSessionStorage.set(
      keys.pending,
      JSON.stringify({
        requestId: state.pending.requestId,
        prompt: state.pending.prompt,
        startedAt: state.pending.startedAt,
      }),
    );
  } else {
    safeSessionStorage.remove(keys.pending);
  }
};

const snapshot = (state) => ({
  messages: state.messages,
  draft: state.draft,
  cooldownUntil: state.cooldownUntil,
  pending: state.pending
    ? {
        requestId: state.pending.requestId,
        prompt: state.pending.prompt,
        startedAt: state.pending.startedAt,
      }
    : null,
  version: state.version,
});

const publish = (state) => {
  state.version += 1;
  persistSession(state);
  const current = snapshot(state);
  state.listeners.forEach((listener) => listener(current));
};

const getRetryAfterSeconds = (error) => {
  const structuredRetry = error.response?.data?.errors?.retryAfterSeconds;
  if (Number.isFinite(structuredRetry) && structuredRetry > 0) {
    return Math.ceil(structuredRetry);
  }

  const retryAfterHeader = error.response?.headers?.["retry-after"];
  if (retryAfterHeader !== undefined) {
    const seconds = Number(retryAfterHeader);
    if (Number.isFinite(seconds) && seconds > 0) return Math.ceil(seconds);

    const retryDate = Date.parse(retryAfterHeader);
    if (!Number.isNaN(retryDate)) {
      return Math.max(Math.ceil((retryDate - Date.now()) / 1000), 1);
    }
  }

  const message = error.response?.data?.message || error.message || "";
  const match = String(message).match(/(?:about|in)\s+(\d+)\s+seconds?/i);
  return match ? Math.max(Number(match[1]), 1) : null;
};

const isCanceledRequest = (error) =>
  error?.code === "ERR_CANCELED" || error?.name === "CanceledError";

const buildHistory = (messages) =>
  messages
    .filter(
      (item) =>
        item.id !== "welcome" &&
        !item.isError &&
        !String(item.content).startsWith("I couldn’t complete that request."),
    )
    .slice(-10)
    .map((item) => ({ role: item.role, content: item.content }));

const getAssistantConversationSnapshot = (user) =>
  snapshot(ensureSession(user));

const subscribeAssistantConversation = (user, listener) => {
  const state = ensureSession(user);
  state.listeners.add(listener);
  listener(snapshot(state));
  return () => state.listeners.delete(listener);
};

const setAssistantDraft = (user, value) => {
  const state = ensureSession(user);
  state.draft = String(value || "").slice(0, 1200);
  publish(state);
};

const clearAssistantConversation = (user) => {
  const state = ensureSession(user);
  if (state.pending) return false;

  state.messages = [WELCOME_MESSAGE];
  state.draft = "";
  state.cooldownUntil = 0;
  publish(state);
  return true;
};

const submitAssistantMessage = (user, prompt, sendMessage) => {
  const state = ensureSession(user);
  const message = String(prompt || state.draft || "").trim();

  if (!message) return { accepted: false, reason: "empty" };
  if (typeof sendMessage !== "function") {
    throw new TypeError("Assistant message sender is required");
  }
  if (state.pending) return { accepted: false, reason: "pending" };
  if (state.cooldownUntil > Date.now()) {
    return { accepted: false, reason: "cooldown" };
  }

  const history = buildHistory(state.messages);
  const userMessage = makeMessage("user", message);
  const requestId = `assistant-request-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const controller = new AbortController();

  state.messages = [...state.messages, userMessage];
  state.draft = "";
  state.pending = {
    requestId,
    prompt: message,
    userMessageId: userMessage.id,
    startedAt: Date.now(),
  };
  state.controller = controller;
  publish(state);

  const requestPromise = Promise.resolve()
    .then(() =>
      sendMessage({
        message,
        history,
        signal: controller.signal,
      }),
    )
    .then((result) => {
      if (!state.pending || state.pending.requestId !== requestId) return;

      state.messages = [
        ...state.messages,
        makeMessage("assistant", result.reply, {
          presentation: result.presentation,
          toolsUsed: result.toolsUsed,
          model: result.model,
          generatedAt: result.generatedAt,
        }),
      ];
      state.pending = null;
      state.controller = null;
      publish(state);
    })
    .catch((error) => {
      if (!state.pending || state.pending.requestId !== requestId) return;
      if (controller.signal.aborted || isCanceledRequest(error)) return;

      const retryAfterSeconds = getRetryAfterSeconds(error);
      if (error.response?.status === 429 && retryAfterSeconds) {
        state.messages = state.messages.filter(
          (item) => item.id !== userMessage.id,
        );
        state.draft = message;
        state.cooldownUntil = Date.now() + retryAfterSeconds * 1000;
        state.pending = null;
        state.controller = null;
        publish(state);
        return;
      }

      state.messages = [
        ...state.messages,
        makeMessage(
          "assistant",
          `I couldn’t complete that request. ${getApiError(error)}`,
          { isError: true, retryPrompt: message },
        ),
      ];
      state.pending = null;
      state.controller = null;
      publish(state);
    })
    .finally(() => {
      if (state.pending?.requestId === requestId && controller.signal.aborted) {
        state.pending = null;
        state.controller = null;
        publish(state);
      }
    });

  state.pending.promise = requestPromise;
  return { accepted: true, requestId, promise: requestPromise };
};

const cancelAssistantRequest = (
  user,
  { reason = "locked", preserveConversation = true } = {},
) => {
  const state = ensureSession(user);
  if (!state.pending) return false;

  const pending = state.pending;
  state.controller?.abort();
  state.controller = null;
  state.pending = null;

  if (preserveConversation) {
    const content =
      reason === "locked"
        ? "That request was canceled because FinTrack locked this device. Unlock FinTrack and retry the question when you’re ready."
        : "That request was canceled before it finished. Retry it when you’re ready.";
    state.messages = [
      ...state.messages,
      makeMessage("assistant", content, {
        isError: true,
        retryPrompt: pending.prompt,
        interruption: reason,
      }),
    ];
  }

  publish(state);
  return true;
};

const clearAssistantUserState = (user) => {
  const userId = getAssistantUserId(user);
  const state = sessions.get(userId);
  const listeners = state ? [...state.listeners] : [];

  if (state) {
    state.pending = null;
    state.controller?.abort();
    state.controller = null;
  }
  const keys = storageKeys(userId);
  Object.values(keys).forEach((key) => safeSessionStorage.remove(key));
  sessions.delete(userId);

  if (listeners.length) {
    const cleared = {
      messages: [WELCOME_MESSAGE],
      draft: "",
      cooldownUntil: 0,
      pending: null,
      version: 0,
    };
    listeners.forEach((listener) => listener(cleared));
  }
};

export {
  WELCOME_MESSAGE,
  cancelAssistantRequest,
  clearAssistantConversation,
  clearAssistantUserState,
  getAssistantConversationSnapshot,
  getAssistantUserId,
  setAssistantDraft,
  submitAssistantMessage,
  subscribeAssistantConversation,
};
