"use client";

/** Shared black-and-white pieces. Kept in one file so the pages stay readable. */

import { useEffect, useState } from "react";

export const CARD = "bg-white rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.06)]";
export const HAIR = "border-[#e2e2e2]";

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.18em] uppercase text-[#9a9a9a] mb-2">{children}</p>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-12 text-[16px] leading-relaxed text-[#6b6b6b]">{children}</p>;
}

/** A text field that saves on blur. */
export function Field({
  label, value, onSave, type = "text", multiline = false, placeholder = "", className = "",
}: {
  label?: string; value: string; onSave: (v: string) => void;
  type?: string; multiline?: boolean; placeholder?: string; className?: string;
}) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const shared =
    "w-full bg-white rounded-lg px-3.5 py-3 text-[16px] leading-relaxed text-black " +
    "shadow-[inset_0_0_0_1px_#e2e2e2] focus:outline-none focus:shadow-[inset_0_0_0_2px_#000]";

  return (
    <label className={`block ${className}`}>
      {label && (
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#9a9a9a] mb-2">{label}</span>
      )}
      {multiline ? (
        <textarea
          value={v} placeholder={placeholder} rows={4}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== value && onSave(v)}
          className={`${shared} min-h-[120px] resize-y`}
        />
      ) : (
        <input
          type={type} value={v} placeholder={placeholder}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== value && onSave(v)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className={`${shared} min-h-[48px]`}
        />
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
        <span className="block text-[11px] tracking-[0.14em] uppercase text-[#9a9a9a] mb-2">{label}</span>
      )}
      <select
        value={value}
        onChange={(e) => onSave(e.target.value)}
        className="w-full min-h-[48px] bg-white rounded-lg px-3 py-2 text-[16px] text-black shadow-[inset_0_0_0_1px_#e2e2e2] focus:outline-none focus:shadow-[inset_0_0_0_2px_#000]"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}

/** Filled black for the primary action; hairline for everything else. */
export function Button({
  children, onClick, kind = "ghost", disabled, className = "",
}: {
  children: React.ReactNode; onClick?: () => void;
  kind?: "solid" | "ghost"; disabled?: boolean; className?: string;
}) {
  const style =
    kind === "solid"
      ? "bg-black text-white"
      : "bg-white text-black shadow-[inset_0_0_0_1px_#e2e2e2]";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-h-[48px] px-5 rounded-lg text-[16px] disabled:opacity-40 ${style} ${className}`}
    >
      {children}
    </button>
  );
}

/** A tick that keeps a 48px hit area around an 18px dot. */
export function Tick({
  done, onClick, label,
}: { done: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="shrink-0 -m-[15px] p-[15px] flex items-start"
    >
      <span
        className={`block mt-[4px] w-[18px] h-[18px] rounded-full transition-colors ${
          done ? "bg-black" : "shadow-[inset_0_0_0_1.5px_#c4c4c4]"
        }`}
      />
    </button>
  );
}
