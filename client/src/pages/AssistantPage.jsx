import {
  Bot,
  BrainCircuit,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

import AssistantResponseCard from "../components/assistant/AssistantResponseCard";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import useAuth from "../hooks/useAuth";
import { sendAssistantMessage } from "../services/assistantService";
import getApiError from "../utils/getApiError";

const starterPrompts = [
  "How am I doing financially this month?",
  "Am I on track with my current budgets?",
  "What spending looks unusual or out of pattern this month?",
  "How am I projected to finish this month?",
  "What if I spend ₹25,000 more this month?",
  "Review my savings goals and priorities.",
];

const welcomeMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask me about spending, budgets, cash flow, unusual patterns, forecasts, what-if scenarios, accounts, recurring payments, or savings goals. I’ll answer using the financial data already in your FinTrack account.",
};

const makeMessage = (role, content, metadata = {}) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  ...metadata,
});

const getUserStorageId = (user) =>
  user?._id || user?.id || user?.email || "current-user";

const getChatStorageKey = (user) =>
  `fintrack_assistant_chat:${getUserStorageId(user)}`;

const getDraftStorageKey = (user) =>
  `fintrack_assistant_draft:${getUserStorageId(user)}`;

const getCooldownStorageKey = (user) =>
  `fintrack_assistant_cooldown:${getUserStorageId(user)}`;

const loadStoredCooldownUntil = (user) => {
  try {
    const stored = Number(sessionStorage.getItem(getCooldownStorageKey(user)));

    return Number.isFinite(stored) && stored > Date.now() ? stored : 0;
  } catch {
    return 0;
  }
};

const getRetryAfterSeconds = (error) => {
  const structuredRetry =
    error.response?.data?.errors?.retryAfterSeconds;

  if (Number.isFinite(structuredRetry) && structuredRetry > 0) {
    return Math.ceil(structuredRetry);
  }

  const retryAfterHeader = error.response?.headers?.["retry-after"];

  if (retryAfterHeader !== undefined) {
    const seconds = Number(retryAfterHeader);

    if (Number.isFinite(seconds) && seconds > 0) {
      return Math.ceil(seconds);
    }

    const retryDate = Date.parse(retryAfterHeader);

    if (!Number.isNaN(retryDate)) {
      return Math.max(Math.ceil((retryDate - Date.now()) / 1000), 1);
    }
  }

  const message = error.response?.data?.message || error.message || "";
  const match = String(message).match(/(?:about|in)\s+(\d+)\s+seconds?/i);

  return match ? Math.max(Number(match[1]), 1) : null;
};

const loadStoredMessages = (user) => {
  try {
    const stored = sessionStorage.getItem(getChatStorageKey(user));

    if (!stored) {
      return [welcomeMessage];
    }

    const parsed = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [welcomeMessage];
    }

    const validMessages = parsed.filter(
      (message) =>
        message &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        message.content.trim(),
    );

    return validMessages.length ? validMessages : [welcomeMessage];
  } catch {
    return [welcomeMessage];
  }
};

const loadStoredDraft = (user) => {
  try {
    return sessionStorage.getItem(getDraftStorageKey(user)) || "";
  } catch {
    return "";
  }
};

const AssistantPage = () => {
  const { user } = useAuth();

  const [messages, setMessages] = useState(() => loadStoredMessages(user));
  const [input, setInput] = useState(() => loadStoredDraft(user));
  const [isSending, setIsSending] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState(() =>
    loadStoredCooldownUntil(user),
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    Math.max(
      Math.ceil((loadStoredCooldownUntil(user) - Date.now()) / 1000),
      0,
    ),
  );
  const messagesEndRef = useRef(null);

  const isCoolingDown = cooldownSeconds > 0;

  useEffect(() => {
    try {
      sessionStorage.setItem(
        getChatStorageKey(user),
        JSON.stringify(messages),
      );
    } catch {
      // If sessionStorage is unavailable/full, the assistant still works;
      // only session persistence is skipped.
    }
  }, [messages, user]);

  useEffect(() => {
    try {
      if (input) {
        sessionStorage.setItem(getDraftStorageKey(user), input);
      } else {
        sessionStorage.removeItem(getDraftStorageKey(user));
      }
    } catch {
      // Draft persistence is optional and should never block chat usage.
    }
  }, [input, user]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      const secondsRemaining = Math.max(
        Math.ceil((cooldownUntil - Date.now()) / 1000),
        0,
      );

      setCooldownSeconds(secondsRemaining);

      if (secondsRemaining <= 0) {
        setCooldownUntil(0);

        try {
          sessionStorage.removeItem(getCooldownStorageKey(user));
        } catch {
          // Cooldown storage is optional.
        }
      }
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownUntil, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages, isSending]);

  const clearChat = () => {
    setMessages([welcomeMessage]);
    setInput("");

    try {
      sessionStorage.removeItem(getChatStorageKey(user));
      sessionStorage.removeItem(getDraftStorageKey(user));
    } catch {
      // Ignore storage cleanup failures.
    }
  };

  const handleSend = async (prompt = input) => {
    const message = prompt.trim();

    if (!message || isSending || isCoolingDown) {
      return;
    }

    const history = messages
      .filter(
        (item) =>
          item.id !== "welcome" &&
          !item.isError &&
          !String(item.content).startsWith("I couldn’t complete that request."),
      )
      .slice(-10)
      .map((item) => ({
        role: item.role,
        content: item.content,
      }));

    const pendingMessage = makeMessage("user", message);

    setMessages((current) => [...current, pendingMessage]);
    setInput("");
    setIsSending(true);

    try {
      const result = await sendAssistantMessage({
        message,
        history,
      });

      setMessages((current) => [
        ...current,
        makeMessage("assistant", result.reply, {
          presentation: result.presentation,
          toolsUsed: result.toolsUsed,
          model: result.model,
          generatedAt: result.generatedAt,
        }),
      ]);
    } catch (error) {
      const messageText = getApiError(error);
      const retryAfterSeconds = getRetryAfterSeconds(error);

      if (error.response?.status === 429 && retryAfterSeconds) {
        const nextCooldownUntil =
          Date.now() + retryAfterSeconds * 1000;

        setMessages((current) =>
          current.filter((item) => item.id !== pendingMessage.id),
        );
        setInput(message);
        setCooldownUntil(nextCooldownUntil);
        setCooldownSeconds(retryAfterSeconds);

        try {
          sessionStorage.setItem(
            getCooldownStorageKey(user),
            String(nextCooldownUntil),
          );
        } catch {
          // The countdown still works in memory if storage is unavailable.
        }

        toast.error(
          `Gemini is rate-limited. Sending will unlock in ${retryAfterSeconds}s.`,
        );

        return;
      }

      toast.error(messageText);

      setMessages((current) => [
        ...current,
        makeMessage(
          "assistant",
          `I couldn’t complete that request. ${messageText}`,
          { isError: true },
        ),
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <PageContainer
      title="AI Assistant"
      description="Ask questions about your FinTrack data and get grounded explanations, spending insights, and practical next steps."
      action={
        <Button
          variant="secondary"
          onClick={clearChat}
          disabled={messages.length === 1 || isSending}
        >
          <Trash2 size={17} />
          Clear chat
        </Button>
      }
    >
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <DashboardCard className="self-start flex h-[calc(100vh-220px)] min-h-[560px] max-h-[760px] flex-col overflow-hidden p-0!">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400 text-slate-950">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  FinTrack Assistant
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Grounded in your current FinTrack data
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {messages.map((message) => {
              const assistant = message.role === "assistant";

              return (
                <div
                  key={message.id}
                  className={`flex ${assistant ? "justify-start" : "justify-end"}`}
                >
                  {assistant && message.presentation ? (
                    <div className="w-full max-w-[94%] sm:max-w-[88%]">
                      <AssistantResponseCard
                        presentation={message.presentation}
                      />
                    </div>
                  ) : (
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                        assistant
                          ? "border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                          : "bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
                  <Sparkles size={16} className="animate-pulse text-emerald-500" />
                  Analyzing your FinTrack data…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
            {isCoolingDown && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300">
                Gemini is temporarily rate-limited. Your question has been restored below, and sending will unlock automatically in{" "}
                <span className="font-semibold">{cooldownSeconds}s</span>.
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1200}
                rows={2}
                placeholder="Ask about spending, budgets, goals, or cash flow…"
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                disabled={isSending}
              />

              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isSending || isCoolingDown}
                className="h-[52px] w-[52px] px-0"
                aria-label={
                  isCoolingDown
                    ? `Send available in ${cooldownSeconds} seconds`
                    : "Send message"
                }
              >
                <Send size={18} />
              </Button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-400">
              <span>
                {isCoolingDown
                  ? `Gemini cooldown: ${cooldownSeconds}s remaining`
                  : "Enter to send · Shift + Enter for a new line"}
              </span>
              <span>{input.length}/1200</span>
            </div>
          </div>
        </DashboardCard>

        <div className="space-y-5 self-start">
          <DashboardCard>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Try asking
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Start with one of these questions or write your own.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={isSending || isCoolingDown}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-left text-sm leading-5 text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:border-emerald-700 dark:hover:bg-emerald-500/10"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-400">
                <WalletCards size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  What it can analyze
                </h2>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>• Current-month income, expenses, and savings</p>
              <p>• Spending anomalies, spikes, and recurring patterns</p>
              <p>• Budgets, pacing, and month-end forecasts</p>
              <p>• Read-only what-if cash-flow simulations</p>
              <p>• Accounts, goals, recurring items, and trends</p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-emerald-500" />
              <div>
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Privacy & scope
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Your Gemini API key stays on the FinTrack server. Assistant requests send the relevant FinTrack financial context to the configured Gemini API service, and the assistant cannot modify your records.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Review the Gemini API provider’s current data-use terms before using real financial data. Responses are informational and may be imperfect; verify important financial decisions independently.
                </p>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </PageContainer>
  );
};

export default AssistantPage;
