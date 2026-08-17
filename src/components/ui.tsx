"use client";

/** Shared pieces. Black, white and glass, matching highlifedashboard.com. */

import { createContext, useContext, useEffect, useRef, useState } from "react";

/**
 * The blur, applied inline.
 *
 * Declared in a stylesheet it did not survive the build: lightningcss kept only
 * the -webkit- form and the computed value came back `none`, so every "glass"
 * surface was a flat panel that merely looked layered in code review. Inline it
 * cannot be minified away or lost to the cascade, and it is verifiable in the
 * browser, which is how this was caught.
 */
export const BLUR = (px = 20, saturate = false) => ({
  backdropFilter: `blur(${px}px)${saturate ? " saturate(140%)" : ""}`,
  WebkitBackdropFilter: `blur(${px}px)${saturate ? " saturate(140%)" : ""}`,
});

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] tracking-[0.18em] uppercase text-[var(--muted-3)] mb-2">{children}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-[16px] leading-relaxed text-[var(--muted)]">{children}</p>;
}

const INPUT =
  "w-full px-3.5 py-3 text-[16px] leading-relaxed rounded-[10px] " +
  "bg-white/[0.04] border border-white/10 text-[var(--text)] placeholder:text-[var(--muted-3)] " +
  "focus:outline-none focus:border-white/40 focus:bg-white/[0.07]";

/**
 * A field inside a SaveGroup.
 *
 * The field itself has no button. Putting one there gave every item five Save
 * buttons and every scorecard twelve, which is what Jaco was looking at. It
 * reports changes upward and the group carries a single Save at the end.
 *
 * Without a group it falls back to saving on blur, so a field used on its own
 * still works.
 */
/**
 * One Save button for everything inside it.
 *
 * Fields report a pending change on edit and the group commits them together.
 *
 * Deliberately driven by event handlers rather than by effects: an earlier
 * version called setState from an effect on every render to track which fields
 * were dirty, and it miscounted two edits as one and would not clear after
 * saving. Reporting on change is both simpler and correct.
 */
type GroupApi = {
  set: (key: string, dirty: boolean, commit: () => void) => void;
};
const SaveGroupContext = createContext<GroupApi | null>(null);

export function SaveGroup({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const pending = useRef(new Map<string, () => void>());
  const [count, setCount] = useState(0);
  const [saved, setSaved] = useState(false);

  const api = useRef<GroupApi>({
    set: (key, dirty, commit) => {
      if (dirty) pending.current.set(key, commit);
      else pending.current.delete(key);
      setCount(pending.current.size);
    },
  }).current;

  const save = () => {
    for (const commit of pending.current.values()) commit();
    pending.current.clear();
    setCount(0);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <SaveGroupContext.Provider value={api}>
      <div className={className}>
        {children}
        <button
          onClick={save}
          disabled={count === 0}
          className={`mt-6 min-h-[48px] px-6 rounded-full text-[16px] transition-opacity ${
            count > 0
              ? "bg-[var(--text)] text-[var(--bg)]"
              : "bezel text-[var(--muted-3)] opacity-60 cursor-default"
          }`}
        >
          {saved ? "Saved" : count > 0 ? `Save ${count} change${count === 1 ? "" : "s"}` : "Save"}
        </button>
      </div>
    </SaveGroupContext.Provider>
  );
}

let fieldSeq = 0;

export function Field({
  label, value, onSave, type = "text", multiline = false, placeholder = "", className = "",
}: {
  label?: string; value: string; onSave: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string; className?: string;
}) {
  const group = useContext(SaveGroupContext);
  const key = useRef(`f${++fieldSeq}`).current;
  const [v, setV] = useState(value);
  const dirty = v !== value;

  // Only take the server's value when there is nothing unsaved here.
  //
  // Without this guard, any background refresh — and one runs after every save
  // anywhere on the page — overwrote whatever was being typed. Jaco lost a set
  // of meeting notes to exactly that: he typed them, something else refreshed,
  // and the box reset to empty.
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  useEffect(() => {
    if (!dirtyRef.current) setV(value);
  }, [value]);

  const commit = () => {
    if (v !== value) onSave(v);
  };

  const change = (next: string) => {
    setV(next);
    group?.set(key, next !== value, () => next !== value && onSave(next));
  };

  const shared =
    "w-full px-3.5 py-3 text-[16px] leading-relaxed rounded-[10px] " +
    "bg-white/[0.04] border border-white/10 text-[var(--text)] placeholder:text-[var(--muted-3)] " +
    "focus:outline-none focus:border-white/40";

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-2">{label}</span>
      )}
      {multiline ? (
        <textarea
          value={v} placeholder={placeholder} rows={4}
          onChange={(e) => change(e.target.value)}
          // Blur saves even inside a group. The button is a confirmation, not
          // the only way in — losing text because it was never pressed is worse
          // than saving something twice.
          onBlur={commit}
          className={`${shared} min-h-[120px] resize-y`}
        />
      ) : (
        <input
          type={type} value={v} placeholder={placeholder}
          onChange={(e) => change(e.target.value)}
          onBlur={commit}
          className={`${shared} min-h-[48px]`}
        />
      )}
    </label>
  );
}

export function Choice({
  label, value, options, onSave, labels,
}: {
  label?: string; value: string; options: string[]; onSave: (v: string) => void;
  /** Optional display names, for values that are not what a person calls them. */
  labels?: Record<string, string>;
}) {
  return (
    <label className="block">
      {label && (
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[var(--muted-3)] mb-2">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className={`${INPUT} min-h-[48px] py-2`}
      >
        {options.map((o) => <option key={o} value={o}>{labels?.[o] ?? o}</option>)}
      </select>
    </label>
  );
}

/**
 * Pill CTA. `arrow` adds the button-in-button trailing chevron from the
 * standard — a filled disc inside the pill, not an icon sitting next to text.
 */
export function Button({
  children, onClick, kind = "ghost", disabled, arrow = false, className = "",
}: {
  children: React.ReactNode; onClick?: () => void;
  kind?: "solid" | "ghost"; disabled?: boolean; arrow?: boolean; className?: string;
}) {
  const solid = kind === "solid";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={solid ? undefined : BLUR(20)}
      className={`group inline-flex items-center gap-3 min-h-[48px] ${arrow ? "pl-6 pr-2" : "px-6"} rounded-full text-[16px]
        transition-[background-color,border-color,transform] duration-300 active:scale-[0.98] disabled:opacity-40
        ${solid ? "bg-[var(--text)] text-[var(--bg)] border border-[var(--text)]" : "bezel text-[var(--text)]"}
        ${className}`}
    >
      <span>{children}</span>
      {arrow && (
        <span
          className={`grid place-items-center w-9 h-9 rounded-full transition-transform duration-300 group-hover:translate-x-[2px]
            ${solid ? "bg-black text-white" : "bg-white/10 text-white"}`}
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.25"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </button>
  );
}

/** Small pill badge that sits above a major heading. */
export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={BLUR(20)} className="inline-block px-3 py-1 mb-4 rounded-full text-[11px] tracking-[0.16em] uppercase
      text-[var(--muted)] bezel">
      {children}
    </span>
  );
}

/** Fades a section up the first time it comes into view. */
export function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If IntersectionObserver is unavailable the content must still be visible.
    if (typeof IntersectionObserver === "undefined") { el.classList.add("in"); return; }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { el.classList.add("in"); io.disconnect(); } },
      { rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

/** A tick that keeps a 48px hit area around an 18px dot. */
export function Tick({
  done, onClick, label,
}: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} aria-label={label} className="shrink-0 -m-[15px] p-[15px] flex items-start">
      <span
        className={`block mt-[4px] w-[18px] h-[18px] rounded-full transition-colors ${
          done ? "bg-[var(--text)]" : "border border-[var(--text)]/30"
        }`}
      />
    </button>
  );
}

/** The panel used for anything raised off the page. */
export function Panel({
  children, className = "", soft = false,
}: { children: React.ReactNode; className?: string; soft?: boolean }) {
  return (
    <div style={BLUR(soft ? 12 : 20)} className={`${soft ? "glass-soft" : "bezel"} rounded-2xl ${className}`}>
      {children}
    </div>
  );
}
