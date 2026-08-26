"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";
import { useCurrentUser } from "@/lib/useCurrentUser";

interface Message {
  sender: "user" | "coach";
  text: string;
}

export default function AskCoachPage() {
  const { me } = useCurrentUser();
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "coach",
      text: "👋 **Hi, I'm your PitchIQ AI Performance Coach.**\n\nI interpret your MediaPipe pose analysis, batting/bowling statistics, and training check-ins to give you actionable cricket drills. Ask me anything about your technique, performance drops, or session history!",
    },
  ]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickPrompts = [
    "Why am I struggling against pace?",
    "Why has my strike rate dropped?",
    "Compare my last video sessions.",
    "Why is my bowling accuracy decreasing?",
  ];

  async function handleSend(textToSend: string) {
    if (!textToSend.trim() || loading) return;
    setLoading(true);
    setMessages((prev) => [...prev, { sender: "user", text: textToSend }]);
    setQuery("");

    try {
      const res = await api.askCoach(textToSend);
      setMessages((prev) => [...prev, { sender: "coach", text: res.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "coach",
          text: "⚠️ Sorry, I ran into an issue connecting to the PitchIQ database. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12 flex flex-col h-[calc(100vh-140px)]">
      {/* Title Header */}
      <div className="border-b border-border pb-4 mb-6">
        <span className="text-xs font-mono uppercase text-accent tracking-widest block">
          Ask PitchIQ
        </span>
        <h1 className="display-heading text-2xl mt-1">🧠 Talk to Your Coach</h1>
        <p className="text-xs text-muted mt-1">
          The AI answers using your own batting, bowling, workload, and video analysis history.
        </p>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 border border-border/50 bg-surface/30 rounded-xl p-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col max-w-[85%] rounded-lg p-4 text-sm leading-relaxed ${
              msg.sender === "user"
                ? "bg-accent/15 border border-accent/20 text-foreground ml-auto"
                : "bg-surface border border-border text-muted mr-auto"
            }`}
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent font-bold mb-1.5">
              {msg.sender === "user" ? "Player Query" : "🧠 PitchIQ Coach"}
            </span>
            <p className="whitespace-pre-line text-sm text-foreground">{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="bg-surface border border-border text-muted mr-auto rounded-lg p-4 max-w-[80%] flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
            <span className="text-xs font-mono text-muted">Analyzing session telemetry...</span>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-2.5 mb-4">
        {quickPrompts.map((p) => (
          <button
            key={p}
            onClick={() => handleSend(p)}
            className="rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-muted hover:border-accent hover:text-foreground transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(query);
        }}
        className="flex gap-2"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Why am I struggling against pace?"
          className="flex-1 rounded-md border border-border bg-surface px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!query.trim() || loading}
          className="rounded-md bg-accent px-6 py-3 font-medium text-accent-ink hover:opacity-90 disabled:opacity-50 text-xs font-mono uppercase tracking-wider"
        >
          Send
        </button>
      </form>
    </div>
  );
}
