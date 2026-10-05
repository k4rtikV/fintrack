import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const assistantPage = read("client/src/pages/AssistantPage.jsx");
const assistantConversation = read("client/src/services/assistantConversationService.js");
const assistantClient = read("client/src/services/assistantService.js");
const authContext = read("client/src/context/AuthContext.jsx");
const animatedOutlet = read("client/src/components/layout/AnimatedOutlet.jsx");
const assistantController = read("server/src/controllers/assistant.controller.js");
const assistantServer = read("server/src/services/assistant.service.js");

assert(
  animatedOutlet.includes("key={location.key || location.pathname}"),
  "Route navigation must still remount page content so stale-navigation coverage is meaningful",
);
assert(
  !assistantPage.includes("requestControllerRef") &&
    !assistantPage.includes("requestControllerRef.current?.abort()"),
  "Ordinary Assistant page unmount/navigation must not abort the active request",
);
assert(
  assistantPage.includes("subscribeAssistantConversation") &&
    assistantPage.includes("getAssistantConversationSnapshot") &&
    assistantPage.includes("submitAssistantMessage(user, message, sendAssistantMessage)"),
  "Assistant UI must bind to a route-independent conversation coordinator",
);
assert(
  assistantConversation.includes("const sessions = new Map()") &&
    assistantConversation.includes("fintrack_assistant_pending:") &&
    assistantConversation.includes("state.pending") &&
    assistantConversation.includes("requestId"),
  "Assistant pending state must live outside the route component and be persisted",
);
assert(
  assistantConversation.includes('reason: "pending"') &&
    assistantConversation.includes("if (state.pending)"),
  "A remounted Assistant page must not be able to duplicate an in-flight request",
);
assert(
  assistantConversation.includes("interrupted by a page reload") &&
    assistantConversation.includes("retryPrompt: stalePending.prompt"),
  "A hard reload must recover an orphaned pending marker into an actionable retry",
);
assert(
  assistantClient.includes("timeout: ASSISTANT_REQUEST_TIMEOUT_MS") &&
    assistantClient.includes("signal"),
  "Assistant requests must keep the bounded timeout and security cancellation support",
);
assert(
  authContext.includes('cancelAssistantRequest(user, { reason: "locked" })') &&
    authContext.includes("clearAssistantUserState(user)"),
  "PIN lock and authentication teardown must still cancel/discard private assistant work",
);

const pageDirectory = path.join(root, "client/src/pages");
for (const filename of fs.readdirSync(pageDirectory).filter((name) => name.endsWith(".jsx"))) {
  const source = fs.readFileSync(path.join(pageDirectory, filename), "utf8");
  assert(
    !source.includes("requestControllerRef.current?.abort()"),
    `${filename} must not tie an ordinary route unmount to request cancellation`,
  );
}

assert(
  assistantController.includes('req.once("aborted", cancelDisconnectedRequest)') &&
    assistantController.includes('res.once("close", cancelDisconnectedRequest)') &&
    assistantController.includes("signal: controller.signal"),
  "A genuine client/security disconnect must propagate cancellation into the server assistant request",
);
assert(
  assistantServer.includes("signal,") &&
    assistantServer.includes("await sleep(delayMs, signal)") &&
    assistantServer.includes("signal?.aborted") &&
    assistantServer.includes("axios.post(url, body") &&
    assistantServer.includes("signal,"),
  "Gemini provider requests and retry delays must honor server-side cancellation",
);

class SessionStorageMock {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }

  clear() {
    this.values.clear();
  }
}

globalThis.sessionStorage = new SessionStorageMock();

const conversationModule = await import(
  `${pathToFileURL(path.join(root, "client/src/services/assistantConversationService.js")).href}?stale-nav-test=${Date.now()}`
);

const {
  cancelAssistantRequest,
  clearAssistantUserState,
  getAssistantConversationSnapshot,
  submitAssistantMessage,
  subscribeAssistantConversation,
} = conversationModule;

const user = { _id: "stale-nav-user" };
let resolveRequest;
const sender = () =>
  new Promise((resolve) => {
    resolveRequest = resolve;
  });

const submission = submitAssistantMessage(user, "What is on my investment watchlist?", sender);
assert.equal(submission.accepted, true, "First request must be accepted");
await Promise.resolve();
assert.equal(
  getAssistantConversationSnapshot(user).pending?.prompt,
  "What is on my investment watchlist?",
  "Pending request must survive independently of the Assistant page",
);

const duplicate = submitAssistantMessage(user, "What is on my investment watchlist?", sender);
assert.deepEqual(
  { accepted: duplicate.accepted, reason: duplicate.reason },
  { accepted: false, reason: "pending" },
  "A navigation/remount must not allow duplicate submission while the first request is in flight",
);

let remountedSnapshot;
const unsubscribe = subscribeAssistantConversation(user, (next) => {
  remountedSnapshot = next;
});
assert(remountedSnapshot.pending, "A remounted subscriber must restore the pending state");

resolveRequest({
  reply: "Your FinTrack watchlist contains the requested instruments.",
  presentation: { title: "Watchlist" },
  toolsUsed: ["get_investment_watchlist"],
  model: "test-model",
  generatedAt: new Date().toISOString(),
});
await submission.promise;

assert.equal(remountedSnapshot.pending, null, "Completed request must clear pending state");
assert.equal(
  remountedSnapshot.messages.at(-1)?.content,
  "Your FinTrack watchlist contains the requested instruments.",
  "A response completed after navigation must be delivered to the remounted conversation",
);
unsubscribe();

let resolveLocked;
const lockedSender = () =>
  new Promise((resolve) => {
    resolveLocked = resolve;
  });
const lockedSubmission = submitAssistantMessage(user, "How is my portfolio doing?", lockedSender);
assert.equal(lockedSubmission.accepted, true);
await Promise.resolve();
assert.equal(cancelAssistantRequest(user, { reason: "locked" }), true);
const lockedSnapshot = getAssistantConversationSnapshot(user);
assert.equal(lockedSnapshot.pending, null, "PIN lock must clear the pending request");
assert.equal(lockedSnapshot.messages.at(-1)?.interruption, "locked");
resolveLocked({ reply: "This stale response must be ignored." });
await lockedSubmission.promise;
assert.notEqual(
  getAssistantConversationSnapshot(user).messages.at(-1)?.content,
  "This stale response must be ignored.",
  "A response arriving after security cancellation must be suppressed",
);

clearAssistantUserState(user);
assert.equal(
  sessionStorage.getItem("fintrack_assistant_chat:stale-nav-user"),
  null,
  "Logout/session teardown must remove persisted assistant chat state",
);

sessionStorage.setItem(
  "fintrack_assistant_chat:reload-user",
  JSON.stringify([
    { id: "welcome", role: "assistant", content: "Welcome" },
    { id: "user-reload", role: "user", content: "Interrupted question" },
  ]),
);
sessionStorage.setItem(
  "fintrack_assistant_pending:reload-user",
  JSON.stringify({
    requestId: "old-request",
    prompt: "Interrupted question",
    startedAt: Date.now() - 1000,
  }),
);
const reloadSnapshot = getAssistantConversationSnapshot({ _id: "reload-user" });
assert.equal(reloadSnapshot.pending, null);
assert.equal(reloadSnapshot.messages.at(-1)?.interruption, "reload");
assert.equal(reloadSnapshot.messages.at(-1)?.retryPrompt, "Interrupted question");

console.log("FinTrack V2 stale-navigation behavioral regression tests passed.");
