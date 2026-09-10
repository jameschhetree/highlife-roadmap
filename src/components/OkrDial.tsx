"use client";

/**
 * Key results as arcs instead of decimals.
 *
 * A key result scored 0.6 reads as a number you have to interpret. An arc
 * two thirds filled reads as "nearly there" before you have finished looking,
 * which is the point of putting OKRs on a wall in the first place.
 *
 * Colour follows the plan's own convention: at or above 0.7 is on track,
 * 0.4 to 0.7 is at risk, below that is off track. Unscored stays grey rather
 * than pretending zero, because null and zero mean different things here.
 */

type KR = { id: string; label: string; text: string; score: number | null };

const R = 26;
const C = 2 * Math.PI * R;

function band(score: number | null) {
  if (score == null) return { stroke: "var(--track)", word: "not scored" };
  if (score >= 0.7) return { stroke: "var(--ok, #4ea87a)", word: "on track" };
  if (score >= 0.4) return { stroke: "var(--c1, #d8b45a)", word: "at risk" };
  return { stroke: "var(--alert, #c4614f)", word: "off track" };
}

export function Dial({ score, size = 64 }: { score: number | null; size?: number }) {
  const pct = score == null ? 0 : Math.max(0, Math.min(1, score));
  const { stroke } = band(score);

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className="shrink-0" aria-hidden="true">
      <circle cx="32" cy="32" r={R} fill="none" stroke="var(--track)" strokeWidth="5" />
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - pct)}
        transform="rotate(-90 32 32)"
        style={{ transition: "stroke-dashoffset .5s cubic-bezier(0.32,0.72,0,1)" }}
      />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        fontSize="15"
        className="tabular-nums"
        fill={score == null ? "var(--muted-3)" : "var(--text)"}
      >
        {score == null ? "–" : Math.round(pct * 100)}
      </text>
    </svg>
  );
}

export default function OkrDial({ title, keyResults }: { title: string; keyResults: KR[] }) {
  const scored = keyResults.filter((k) => k.score != null);
  const avg = scored.length
    ? scored.reduce((n, k) => n + (k.score as number), 0) / scored.length
    : null;

  return (
    <div className="border-t border-white/10 pt-5">
      <div className="flex items-start gap-4">
        <Dial score={avg} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug">{title}</p>
          <p className="mt-1 text-[14px] text-[var(--muted-3)]">
            {scored.length}/{keyResults.length} scored · {band(avg).word}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3 pl-1">
        {keyResults.map((k) => {
          const b = band(k.score);
          const pct = k.score == null ? 0 : Math.max(0, Math.min(1, k.score));
          return (
            <div key={k.id}>
              <div className="flex items-baseline gap-2.5">
                <span className="text-[12px] tracking-[0.1em] uppercase text-[var(--muted-3)] w-8 shrink-0">
                  {k.label}
                </span>
                <span className="min-w-0 flex-1 text-[15px] leading-snug">{k.text}</span>
                <span className="shrink-0 text-[14px] tabular-nums text-[var(--muted)]">
                  {k.score == null ? "–" : pct.toFixed(1)}
                </span>
              </div>
              <div className="mt-1.5 ml-[42px] h-[3px] rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${pct * 100}%`,
                    background: b.stroke,
                    transition: "width .5s cubic-bezier(0.32,0.72,0,1)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
