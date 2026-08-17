"use client";

/** Shared pieces. Black, white and glass, matching highlifedashboard.com. */

import { useEffect, useRef, useState } from "react";

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
  return <p className="text-[11px] tracking-[0.18em] uppercase text-[#666] mb-2">{children}</p>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-[16px] leading-relaxed text-[#888]">{children}</p>;
}

const INPUT =
  "w-full px-3.5 py-3 text-[16px] leading-relaxed rounded-[10px] " +
  "bg-white/[0.04] border border-white/10 text-white placeholder:text-[#666] " +
  "focus:outline-none focus:border-white/40 focus:bg-white/[0.07]";

/**
 * A field that saves, and says so.
 *
 * It saved on blur before, which works and looks like nothing happening — Jaco
 * asked for a save button because he could not tell whether a number had
 * landed. Blur still saves, so nothing is lost by tapping elsewhere, but a Save
 * button appears the moment the value differs and a tick confirms it went in.
 */
export function Field({
  label, value, onSave, type = "text", multiline = false, placeholder = "", className = "",
}: {
  label?: string; value: string; onSave: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string; className?: string;
}) {
  const [v, setV] = useState(value);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setV(value); setSaved(false); }, [value]);

  const dirty = v !== value;

  const commit = () => {
    if (!dirty) return;
    onSave(v);
    setSaved(true);
    // Long enough to notice, short enough not to linger over the next edit.
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="flex items-baseline justify-between gap-2 mb-2">
          <span className="text-[11px] tracking-[0.14em] uppercase text-[#666]">{label}</span>
          {saved && <span className="text-[11px] tracking-[0.1em] uppercase text-[#4ade80]">saved</span>}
        </span>
      )}
      {multiline ? (
        <textarea
          value={v} placeholder={placeholder} rows={4}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          className={`${INPUT} min-h-[120px] resize-y`}
        />
      ) : (
        <input
          type={type} value={v} placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={`${INPUT} min-h-[48px]`}
        />
      )}
      {dirty && (
        <button
          onClick={(e) => { e.preventDefault(); commit(); }}
          className="mt-2 min-h-[44px] px-5 rounded-full bg-white text-black text-[15px]"
        >
          Save
        </button>
      )}
    </label>
  );
}

export function Choice({
  label, value, options, onSave,
}: { label?: string; value: string; options: string[]; onSave: (v: string) => void }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#666] mb-2">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className={`${INPUT} min-h-[48px] py-2`}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
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
        ${solid ? "bg-white text-black border border-white hover:bg-white/90" : "bezel text-white hover:bg-white/[0.09]"}
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
      text-[#9a9a9a] bezel">
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
          done ? "bg-white" : "border border-white/25"
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
