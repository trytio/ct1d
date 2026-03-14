"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRef, useEffect, useCallback, useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Activity,
  Target,
  Microscope,
  Shield,
  Dna,
  TrendingUp,
  Search,
  Sprout,
  Cpu,
  Layers,
  Box,
  Loader2,
} from "lucide-react";
import suggestedQuestions from "@/data/suggested-questions.json";
import type { SuggestedQuestion } from "@/types/chat";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Target,
  Microscope,
  Shield,
  Dna,
  TrendingUp,
  Search,
  Sprout,
  Cpu,
  Layers,
  Box,
};

const questions = suggestedQuestions as SuggestedQuestion[];

function SuggestedQuestions({
  onSelect,
}: {
  onSelect: (question: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {questions.map((q, i) => {
        const Icon = ICON_MAP[q.icon] || Target;
        return (
          <button
            key={i}
            onClick={() => onSelect(q.text)}
            className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm text-foreground transition-all hover:border-primary/50 hover:bg-surface-light"
          >
            <Icon className="h-4 w-4 text-primary" />
            <span className="whitespace-nowrap">{q.text}</span>
          </button>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
        <Activity className="h-4 w-4 text-accent" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-surface px-4 py-3">
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:0ms]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:150ms]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

/** Extract all text content from a UIMessage's parts array */
function getMessageText(
  parts: Array<{ type: string; text?: string }>
): string {
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
}

export default function ChatPage() {
  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    []
  );

  const { messages, sendMessage, status } = useChat({ transport });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = status === "submitted" || status === "streaming";

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, [input]);

  const handleSelectQuestion = useCallback((question: string) => {
    setInput(question);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    sendMessage({ text: trimmed });
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const hasMessages = messages.length > 0;

  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col px-4"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto py-6">
        {!hasMessages ? (
          /* Welcome screen */
          <div className="flex h-full flex-col items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/20 glow-green">
                <Activity className="h-8 w-8 text-accent" />
              </div>
              <h1 className="text-2xl font-bold">
                <span className="gradient-text">CT1D</span> Research Companion
              </h1>
              <p className="max-w-lg text-center text-muted">
                I track every serious effort to cure Type 1 Diabetes — from stem
                cell therapies to gene editing breakthroughs. Ask me anything
                about T1D cure research.
              </p>
            </div>

            <div className="w-full max-w-3xl">
              <p className="mb-3 text-sm font-medium text-muted">
                Try asking:
              </p>
              <SuggestedQuestions onSelect={handleSelectQuestion} />
            </div>
          </div>
        ) : (
          /* Message list */
          <div className="flex flex-col gap-6">
            {messages.map((message) => {
              const isUser = message.role === "user";
              const text = getMessageText(message.parts);
              if (!text) return null;
              return (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 ${
                    isUser ? "flex-row-reverse" : ""
                  }`}
                >
                  {/* Avatar */}
                  {!isUser && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/20">
                      <Activity className="h-4 w-4 text-accent" />
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`max-w-[85%] ${
                      isUser
                        ? "rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-white"
                        : "rounded-2xl rounded-tl-sm bg-surface px-4 py-3"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm">{text}</p>
                    ) : (
                      <div className="prose prose-sm prose-chat max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {text}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading &&
              messages[messages.length - 1]?.role === "user" && (
                <TypingIndicator />
              )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Suggested questions (shown below messages when conversation is active) */}
      {hasMessages && !isLoading && (
        <div className="border-t border-border/50 pt-3">
          <SuggestedQuestions onSelect={handleSelectQuestion} />
        </div>
      )}

      {/* Input area */}
      <div className="border-t border-border bg-background pb-4 pt-4">
        <form
          onSubmit={handleFormSubmit}
          className="flex items-end gap-3 rounded-2xl border border-border bg-surface p-2 transition-colors focus-within:border-primary/50"
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about T1D cure research..."
            rows={1}
            className="flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition-all hover:bg-primary-light disabled:opacity-40 disabled:hover:bg-primary"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </form>
        <p className="mt-2 text-center text-xs text-muted">
          CT1D provides research information only — not medical advice. Always
          consult your healthcare provider.
        </p>
      </div>
    </div>
  );
}
