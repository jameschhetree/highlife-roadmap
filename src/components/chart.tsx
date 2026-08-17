"use client";

/**
 * Charts, drawn by hand.
 *
 * Every reference dashboard worth copying — Plausible, Tremor, shadcn — leads
 * with a shape over time. This board led with a paragraph, and rendered
 * thirteen SVGs of which every one was an icon.
 *
 * No charting library: the two shapes needed here are a line and a bar, and a
 * dependency to draw them would be more code to hold than the code it saves,
 * plus a second set of colours to keep matched to the theme.
 *
 * `vector-effect: non-scaling-stroke` throughout — the viewBox stretches to the
 * container, and without it every hairline stretches with it and the chart ends
 * up with lines of four different weights.
 */

const W = 720;
const H = 210;
const PAD = { l: 8, r: 8, t: 14, b: 26 };

export type Point = { label: string; target: number; actual: number | null };

const money = (n: number) =>
  n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K` : `$${Math.round(n)}`;

/**
 * Cumulative target against cumulative actual.
 *
 * The target line is the whole plan — every month of it, so the shape of what
 * is coming is visible from the first week. The actual is drawn only as far as
 * there are numbers: a line continued through months nobody has reported would
 * read as revenue of zero rather than as an unknown.
 */
export function Curve({ points, now, height = H }: {
  points: Point[];
  /**
   * Where today falls, and what the plan says should be banked by now.
   *
   * Without it the actual is a single dot near the origin with nothing to read
   * it against — true, but it looks like the chart failed to draw rather than
   * like week two of seventeen months. The marker gives the dot a reference: it
   * sits below the plan line by exactly the amount we are behind.
   */
  now?: { at: number; expected: number } | null;
  height?: number;
}) {
  if (points.length < 2) return null;

  const max = Math.max(...points.map((p) => p.target), ...points.map((p) => p.actual ?? 0));
  const x = (i: number) => PAD.l + (i / (points.length - 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - v / max) * (height - PAD.t - PAD.b);

  const line = (get: (p: Point) => number | null) => {
    const d: string[] = [];
    points.forEach((p, i) => {
      const v = get(p);
      if (v == null) return;
      d.push(`${d.length ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
    });
    return d.join(" ");
  };

  const targetPath = line((p) => p.target);
  const actualPts = points.map((p, i) => ({ p, i })).filter(({ p }) => p.actual != null);
  const actualPath = line((p) => p.actual);
  const last = actualPts[actualPts.length - 1];

  // Every third month, so the axis is readable at phone width.
  const ticks = points.filter((_, i) => i % 3 === 0 || i === points.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" style={{ height: "auto" }} role="img"
      aria-label={`Cumulative target ${money(max)}, actual to date ${last ? money(last.p.actual!) : "none yet"}`}>
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--c1)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--c1)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Three rules, unlabelled except the top. A grid drawn darker than the
          data competes with it. */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={PAD.l} x2={W - PAD.r} y1={y(max * f)} y2={y(max * f)}
          stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      ))}
      <text x={PAD.l} y={y(max) - 5} className="fill-current text-[11px] tabular-nums" opacity="0.45">
        {money(max)}
      </text>

      {/* The plan. Dashed, because it has not happened. */}
      <path d={targetPath} fill="none" stroke="currentColor" strokeOpacity="0.34" strokeWidth="1.25"
        strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />

      {/* What actually came in. */}
      {actualPath && (
        <>
          <path d={`${actualPath} L${x(last!.i)} ${y(0)} L${x(actualPts[0].i)} ${y(0)} Z`}
            fill="url(#curveFill)" stroke="none" />
          <path d={actualPath} fill="none" stroke="var(--c1)" strokeWidth="2.25"
            strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          <circle cx={x(last!.i)} cy={y(last!.p.actual!)} r="3.5" fill="var(--c1)" />
        </>
      )}

      {now && (
        <>
          <line x1={x(now.at)} x2={x(now.at)} y1={PAD.t} y2={height - PAD.b}
            stroke="currentColor" strokeOpacity="0.28" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <circle cx={x(now.at)} cy={y(now.expected)} r="2.5" fill="none"
            stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.25" vectorEffect="non-scaling-stroke" />
          <text x={x(now.at) + 6} y={PAD.t + 10} className="fill-current text-[11px]" opacity="0.45">
            today
          </text>
        </>
      )}

      {ticks.map((p) => {
        // By index: the labels are month names and the plan runs 17 months, so
        // "Aug" appears twice and React saw two children with the same key.
        const i = points.indexOf(p);
        return (
          <text key={i} x={x(i)} y={height - 6}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            className="fill-current text-[11px]" opacity="0.45">
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

/**
 * A metric's last few weeks, small enough to sit beside the number.
 *
 * Nulls break the line rather than being drawn as zero — a week nobody filled
 * in is not a week of no revenue, and a sparkline that dives to the floor on a
 * blank is worse than no sparkline.
 */
export function Sparkline({ values, width = 96, height = 28 }: {
  values: (number | null)[]; width?: number; height?: number;
}) {
  const known = values.filter((v): v is number => v != null);
  if (known.length < 2) return null;

  const max = Math.max(...known);
  const min = Math.min(...known);
  const span = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * (width - 4) + 2;
  const y = (v: number) => height - 3 - ((v - min) / span) * (height - 6);

  // One path per unbroken run, so a gap stays a gap.
  const runs: string[] = [];
  let cur: string[] = [];
  values.forEach((v, i) => {
    if (v == null) { if (cur.length > 1) runs.push(cur.join(" ")); cur = []; return; }
    cur.push(`${cur.length ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  });
  if (cur.length > 1) runs.push(cur.join(" "));

  const lastIdx = values.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0).pop()!;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" className="shrink-0">
      {runs.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" opacity="0.75" />
      ))}
      <circle cx={x(lastIdx)} cy={y(values[lastIdx]!)} r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * A bar showing how far along something is against how far along it should be.
 *
 * The tick is the point of it. A bar on its own says "some"; a bar with the
 * expected mark on it says ahead or behind without a sentence.
 */
export function PaceBar({ pct, through }: { pct: number; through: number }) {
  const tone = pct >= 100 ? "var(--ok)" : pct >= 90 ? "var(--warn)" : "var(--alert)";
  // Against the target, not against pace — the bar is the month, the tick is today.
  const filled = Math.max(0, Math.min(1, (pct / 100) * through));

  return (
    <div className="relative h-2 rounded-full bg-[var(--text)]/[0.09] overflow-hidden">
      <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
        style={{ width: `${filled * 100}%`, background: tone }} />
      <div className="absolute inset-y-0 w-px bg-[var(--text)]/50" style={{ left: `${through * 100}%` }}
        title="where today falls" />
    </div>
  );
}

/**
 * Where the open work actually is, by pillar.
 *
 * The board could tell you there were nine commitments and who owned each one,
 * and nothing anywhere said that every single one of them was Operations —
 * which, against a plan whose whole argument is that podcast is the cash engine,
 * is the most useful thing on the page.
 *
 * Horizontal bars because the labels are words, and words on a vertical axis
 * read fine at any width.
 */
export function Bars({ rows, total }: {
  rows: { label: string; value: number; colour: string }[];
  total?: number;
}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const sum = total ?? rows.reduce((a, r) => a + r.value, 0);

  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between gap-3 mb-1">
            <span className="text-[14px] text-[var(--muted)] truncate">{r.label}</span>
            <span className="shrink-0 text-[14px] tabular-nums">
              {r.value}
              {sum > 0 && (
                <span className="ml-2 text-[12px] text-[var(--muted-3)]">
                  {Math.round((r.value / sum) * 100)}%
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--text)]/[0.07] overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${(r.value / max) * 100}%`, background: r.colour }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Stage counts as bars, each labelled with the drop from the stage above. */
export function Funnel({ stages }: {
  stages: { label: string; value: number | null; rate: number | null; of: string | null }[];
}) {
  const max = Math.max(...stages.map((s) => s.value ?? 0), 1);
  // Cool to warm down the funnel: the last bar is the one that pays.
  const tones = ["var(--c5)", "var(--c1)", "var(--c2)"];

  return (
    <div className="space-y-2.5">
      {stages.map((s, i) => (
        <div key={s.label}>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            {/* Nowrap: in a 200px column "Tours showed" broke over two lines and
                pushed the card past its cell. */}
            <span className="text-[13px] text-[var(--muted)] truncate whitespace-nowrap">{s.label}</span>
            <span className="shrink-0 text-[14px] tabular-nums whitespace-nowrap">
              {s.value == null ? <span className="text-[var(--muted-3)]">—</span> : s.value}
              {s.rate != null && (
                <span className="ml-1.5 text-[12px] text-[var(--muted-3)]">{Math.round(s.rate)}%</span>
              )}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--text)]/[0.07] overflow-hidden">
            <div className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${((s.value ?? 0) / max) * 100}%`, background: tones[i] ?? "var(--c7)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
