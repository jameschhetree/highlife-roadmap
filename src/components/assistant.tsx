"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Send, Sparkles, RefreshCw } from "lucide-react";

type Msg = { role: string; content: string };
const prompts = ["What should we focus on this week?", "What is blocked, and who can unblock it?", "Summarize progress against our quarterly goals.", "Help me prepare for our next team meeting."];

export function Assistant({ onChanged }: { onChanged: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/chat");
      if (!r.ok) throw new Error("Could not load saved conversations. Please retry.");
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error("Could not load saved conversations.");
      setMsgs(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load conversations."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => { if (msgs.length) endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, busy]);

  const send = async () => {
    const message = text.trim();
    if (!message || busy || loading) return;
    setText(""); setError(""); setBusy(true);
    setMsgs(m => [...m, { role: "user", content: message }]);
    try {
      const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, readOnly: true }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "The assistant could not reply. Please try again.");
      setMsgs(m => [...m, { role: "assistant", content: d.reply || "No reply was returned. Please try again." }]);
      if (d.applied) onChanged();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not reach the assistant."); setText(message); }
    finally { setBusy(false); }
  };

  return <div className="hl-assistant-layout"><section className="hl-chat">
    <header className="hl-chat-header"><span className="hl-ai-icon"><Sparkles size={22}/></span><div><h2>HighLife assistant</h2><p>Connected to your roadmap · Advice mode</p></div><button aria-label="Reload saved conversation" disabled={busy || loading} onClick={() => void load()}><RefreshCw size={17}/></button></header>
    <div className="hl-chat-messages" role="log" aria-label="Conversation" aria-live="polite" aria-busy={busy || loading}>
      {loading ? <p className="hl-chat-status">Loading saved conversation…</p> : !msgs.length && <div className="hl-chat-welcome"><Sparkles size={32}/><h2>Good questions. Clear next steps.</h2><p>Make sense of your priorities, spot blockers, and prepare for the week ahead.</p><div className="hl-prompts">{prompts.map(p => <button key={p} onClick={() => setText(p)}>{p}<ArrowUpRight size={16}/></button>)}</div></div>}
      {msgs.map((m, i) => <div key={i} className={`hl-message ${m.role === "user" ? "from-user" : "from-assistant"}`}><small>{m.role === "user" ? "You" : "HighLife assistant"}</small><div>{m.content}</div></div>)}
      {busy && <p className="hl-chat-status">Reviewing your roadmap…</p>}<div ref={endRef}/>
    </div>
    {error && <div className="hl-error" role="alert">{error}</div>}
    <form className="hl-chat-compose" onSubmit={e => { e.preventDefault(); void send(); }}><label className="sr-only" htmlFor="assistant-message">Message the assistant</label><textarea id="assistant-message" value={text} maxLength={6000} onChange={e => setText(e.target.value)} placeholder="Ask about your roadmap…" rows={2} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(); } }}/><button className="hl-primary" type="submit" disabled={busy || loading || !text.trim()} aria-label="Send message"><Send size={18}/></button><small>Advice only. Your saved tasks and progress stay in your control.</small></form>
  </section><aside className="hl-assistant-help"><p className="hl-eyebrow">A LITTLE DIRECTION</p><h2>Start with what matters.</h2><p>Your assistant can use saved tasks, goals, meetings, and team context to help you plan.</p>{prompts.map((p, i) => <button key={p} onClick={() => setText(p)}><span>0{i+1}</span>{p}<ArrowUpRight size={16}/></button>)}<div className="hl-assistant-note"><Sparkles size={20}/><h3>Ideas before action.</h3><p>This workspace offers guidance. Apply changes in the relevant task or roadmap section when you’re ready.</p></div></aside></div>;
}
