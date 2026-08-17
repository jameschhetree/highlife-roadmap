"use client";

/**
 * The assistant, which had a working API and no way to reach it.
 *
 * The chat route was rewritten for the new data model and then never given an
 * interface, so from Jaco's side the feature simply did not exist. It answers
 * questions about the roadmap and edits it in plain English, under the same
 * rules the rest of the app enforces — it cannot create an ownerless item and
 * it refuses to store leads or bookings, which belong in HighLevel.
 */

import { useEffect, useRef, useState } from "react";
import { BLUR } from "./ui";

type Msg = { role: string; content: string };

export function Assistant({ onChanged }: { onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    fetch("/api/chat").then((r) => (r.ok ? r.json() : [])).then(setMsgs).catch(() => {});
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const send = async () => {
    const message = text.trim();
    if (!message || busy) return;
    setText("");
    setMsgs((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "assistant", content: d.reply ?? d.error ?? "That did not work." }]);
      // Anything it changed should appear behind the panel straight away.
      if (d.applied) onChanged();
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Could not reach the assistant." }]);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={BLUR(26)}
        className="fixed bottom-5 right-5 z-40 min-h-[52px] px-6 rounded-full pill-nav text-[16px]"
      >
        Ask
      </button>
    );
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 sm:inset-x-auto sm:right-5 sm:w-[420px]">
      <div style={BLUR(26)} className="rounded-2xl pill-nav !rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 h-[56px] border-b border-white/10">
          <span className="text-[16px]">Ask the roadmap</span>
          <button onClick={() => setOpen(false)} className="min-h-[44px] px-2 text-[15px] text-[var(--muted)]">
            Close
          </button>
        </div>

        <div className="max-h-[46vh] overflow-y-auto px-5 py-4 space-y-4">
          {msgs.length === 0 && (
            <div className="text-[15px] leading-relaxed text-[var(--muted)]">
              <p className="mb-3">Try:</p>
              <p>What does JoJo owe this week?</p>
              <p>What is blocked?</p>
              <p>Add: book 20 tours by Friday, owner Jaco</p>
              <p>Score KR1 of the Launch Sprint at 0.6</p>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={m.role === "user" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[92%] text-left px-4 py-2.5 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
                  m.role === "user" ? "bg-white text-black" : "bg-white/[0.06] text-[var(--text)]"
                }`}
              >
                {m.content}
              </span>
            </div>
          ))}
          {busy && <p className="text-[15px] text-[var(--muted-3)]">Thinking…</p>}
          <div ref={endRef} />
        </div>

        <div className="flex gap-2 p-3 border-t border-white/10">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Ask or change something"
            className="flex-1 min-h-[48px] px-4 text-[16px]"
          />
          <button
            onClick={send}
            disabled={busy || !text.trim()}
            className="min-h-[48px] px-5 rounded-xl bg-white text-black text-[16px] disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
