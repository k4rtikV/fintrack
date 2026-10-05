import {
  Bot,
  BrainCircuit,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AssistantResponseCard from "../components/assistant/AssistantResponseCard";
import DashboardCard from "../components/layout/DashboardCard";
import PageContainer from "../components/layout/PageContainer";
import Button from "../components/ui/Button";
import useAuth from "../hooks/useAuth";
import { sendAssistantMessage } from "../services/assistantService";
import {
  clearAssistantConversation,
  getAssistantConversationSnapshot,
  getAssistantUserId,
  setAssistantDraft,
  submitAssistantMessage,
  subscribeAssistantConversation,
} from "../services/assistantConversationService";

const starterPrompts = [
  "How is my investment portfolio performing?",
  "Show my recent investment trades and realised P&L.",
  "How am I doing financially this month?",
  "What Autopay payments are coming up?",
  "Am I on track with my budgets and savings goals?",
  "What spending looks unusual or out of pattern this month?",
];

const AssistantPage = () => {
  const { user, isPinLocked } = useAuth();
  const userStorageId = getAssistantUserId(user);
  const [conversation, setConversation] = useState(() =>
    getAssistantConversationSnapshot(user),
  );
  const [cooldownSeconds, setCooldownSeconds] = useState(() =>
    Math.max(
      Math.ceil((getAssistantConversationSnapshot(user).cooldownUntil - Date.now()) / 1000),
      0,
    ),
  );

  const messagesEndRef = useRef(null);
  const messagesScrollRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);
  const forceScrollRef = useRef(false);

  const messages = conversation.messages;
  const input = conversation.draft;
  const isSending = Boolean(conversation.pending);
  const isCoolingDown = cooldownSeconds > 0;
  const interactionDisabled = isSending || isCoolingDown || isPinLocked;

  useEffect(() => {
    shouldStickToBottomRef.current = true;
    forceScrollRef.current = true;

    return subscribeAssistantConversation(user, (next) => {
      setConversation(next);
    });
  }, [user, userStorageId]);

  useEffect(() => {
    const cooldownUntil = conversation.cooldownUntil;

    if (!cooldownUntil || cooldownUntil <= Date.now()) {
      setCooldownSeconds(0);
      return undefined;
    }

    const updateCountdown = () => {
      setCooldownSeconds(
        Math.max(Math.ceil((cooldownUntil - Date.now()) / 1000), 0),
      );
    };

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [conversation.cooldownUntil]);

  useEffect(() => {
    if (!forceScrollRef.current && !shouldStickToBottomRef.current) {
      return;
    }

    messagesEndRef.current?.scrollIntoView({
      behavior: forceScrollRef.current ? "smooth" : "auto",
      block: "nearest",
    });
    forceScrollRef.current = false;
  }, [messages, isSending]);

  const handleConversationScroll = (event) => {
    const element = event.currentTarget;
    const gap = element.scrollHeight - element.scrollTop - element.clientHeight;
    shouldStickToBottomRef.current = gap < 120;
  };

  const clearChat = () => {
    if (!clearAssistantConversation(user)) return;
    shouldStickToBottomRef.current = true;
    forceScrollRef.current = true;
  };

  const handleSend = (prompt = input) => {
    const message = String(prompt || "").trim();
    if (!message || interactionDisabled) return;

    const result = submitAssistantMessage(user, message, sendAssistantMessage);
    if (!result.accepted) return;

    shouldStickToBottomRef.current = true;
    forceScrollRef.current = true;
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
      description="Ask questions across your FinTrack finances, investments, and read-only market research with the appropriate ledger and data source kept distinct."
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
          <div className="border-b border-slate-800 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-copper-400 to-steel-500 text-slate-950">
                <Bot size={20} />
              </div>
              <div>
                <p className="font-semibold text-white">FinTrack Assistant</p>
                <p className="text-xs text-slate-400">
                  Read-only · grounded in the relevant FinTrack data
                </p>
              </div>
            </div>
          </div>

          <div
            ref={messagesScrollRef}
            onScroll={handleConversationScroll}
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6"
          >
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
                        onSuggestion={handleSend}
                        suggestionsDisabled={interactionDisabled}
                      />
                    </div>
                  ) : (
                    <div
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 sm:max-w-[78%] ${
                        assistant
                          ? "border border-slate-700 bg-slate-800 text-slate-200"
                          : "bg-copper-500 text-slate-950 shadow-sm shadow-copper-950/20"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      {message.isError && message.retryPrompt && (
                        <button
                          type="button"
                          onClick={() => handleSend(message.retryPrompt)}
                          disabled={interactionDisabled}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-2.5 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-copper-500/60 hover:text-copper-200 disabled:opacity-50"
                        >
                          <RefreshCw size={13} />
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-slate-400">
                  <Sparkles size={16} className="animate-pulse text-copper-500" />
                  Selecting and analyzing the relevant FinTrack data…
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-800 bg-slate-900 p-4 sm:p-5">
            {isCoolingDown && (
              <div className="mb-3 rounded-xl border border-amber-900/60 bg-amber-500/10 px-3.5 py-2.5 text-xs leading-5 text-amber-300">
                Gemini is temporarily rate-limited. Your question has been restored below, and sending will unlock automatically in{" "}
                <span className="font-semibold">{cooldownSeconds}s</span>.
              </div>
            )}

            {isPinLocked && (
              <div className="mb-3 rounded-xl border border-steel-600/50 bg-steel-500/10 px-3.5 py-2.5 text-xs leading-5 text-steel-200">
                FinTrack is locked. Assistant requests are paused until this device is unlocked.
              </div>
            )}

            <div className="flex items-end gap-3">
              <textarea
                value={input}
                onChange={(event) => setAssistantDraft(user, event.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={1200}
                rows={2}
                placeholder="Ask about finances, investments, Autopay, goals, or a tracked stock…"
                className="min-h-[52px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-copper-400 focus:ring-2 focus:ring-copper-400/15"
                disabled={isSending || isPinLocked}
              />

              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || interactionDisabled}
                className="h-[52px] w-[52px] px-0"
                aria-label={
                  isPinLocked
                    ? "Unlock FinTrack to send"
                    : isCoolingDown
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-copper-500/10 text-copper-300">
                <BrainCircuit size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white">Try asking</h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  These prompts exercise different FinTrack data domains.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  disabled={interactionDisabled}
                  className="w-full rounded-xl border border-slate-700 px-3.5 py-3 text-left text-sm leading-5 text-slate-200 transition hover:border-copper-700 hover:bg-copper-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-steel-500/10 text-steel-200">
                <WalletCards size={18} />
              </div>
              <div>
                <h2 className="font-semibold text-white">What it can analyze</h2>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm leading-6 text-slate-300">
              <p>• Income, expenses, transfers, accounts, and unified activity</p>
              <p>• Budgets, goals, Autopay rules, anomalies, and forecasts</p>
              <p>• FinTrack investment holdings, BUY/SELL history, and P&amp;L</p>
              <p>• Watchlist and read-only NSE/BSE market research</p>
              <p>• Deterministic what-if cash-flow simulations</p>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-copper-400" />
              <div>
                <h2 className="font-semibold text-white">Privacy & scope</h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  The assistant is read-only. Relevant FinTrack context and, when needed, read-only public market data are sent through the server to the configured Gemini API service. Your Upstox brokerage account, funds, orders, and broker holdings are not connected or synchronized.
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Market quotes may be live, delayed, closed-market, cached, or unavailable and are labelled accordingly. FinTrack does not use the assistant for future stock-price predictions or personalized buy/sell recommendations.
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
