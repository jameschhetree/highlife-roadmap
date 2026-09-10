"use client";

import { useMemo, useState } from "react";

/**
 * The twelve week sprint drawn as a road rather than a list.
 *
 * The list told you week 3 was current only if you counted rows. A road shows
 * distance covered and distance left without reading anything, which is what
 * James asked for: something both of them can look at and immediately place
 * themselves on.
 *
 * The path is a serpentine so twelve stops fit a phone without becoming a
 * hairline. Geometry is computed rather than hand-drawn so the shape holds if
 * the sprint ever stops being twelve weeks.
 */

export type RoadWeek = {
  id: string;
  week: number;
  objective: string;
  deliverable: string;
  done: boolean;
  startsOn?: string | null;
};

type Props = {
  weeks: RoadWeek[];
  currentWeek?: number;
  onPick?: (week: RoadWeek) => void;
};

// Halved from 132. At three per row the road ran four switchbacks and took up
// a page and a half before you reached anything underneath it.
const LANE_H = 74;
const PAD_X = 40;        // keeps markers off the edge
const CURVE = 40;        // how round the switchback corners are

function buildPath(count: number, width: number, perRow: number) {
  const rows = Math.ceil(count / perRow);
  const usable = width - PAD_X * 2;
  const step = usable / (perRow - 1);

  const stops: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    // Every other row runs right to left, so the road doubles back.
    const c = row % 2 === 0 ? col : perRow - 1 - col;
    stops.push({ x: PAD_X + c * step, y: 70 + row * LANE_H });
  }

  // One continuous path through the stops, rounded at the turns.
  let d = `M ${stops[0].x} ${stops[0].y}`;
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const cur = stops[i];
    if (prev.y === cur.y) {
      d += ` L ${cur.x} ${cur.y}`;
    } else {
      // Switchback: out to the edge, curve down, back along the new row.
      const dir = prev.x > cur.x ? 1 : -1;
      const edge = prev.x + dir * CURVE * 0.6;
      d += ` C ${edge} ${prev.y}, ${edge} ${cur.y}, ${cur.x} ${cur.y}`;
    }
  }
  return { d, stops, height: rows * LANE_H + 60 };
}

export default function SprintRoad({ weeks, currentWeek, onPick }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  // Tapping has to select, not hover. A phone has no hover, so the detail panel
  // was stuck on the current week and every stop on the road was decorative.
  const [picked, setPicked] = useState<number | null>(null);
  const ordered = useMemo(() => [...weeks].sort((a, b) => a.week - b.week), [weeks]);

  // Four per row over three rows, on a canvas narrow enough to still fit a
  // phone. The earlier four-per-row version clipped because the canvas was 720
  // wide, not because four was too many.
  const perRow = 4;
  const width = 460;
  const { d, stops, height } = useMemo(
    () => buildPath(ordered.length, width, perRow),
    [ordered.length]
  );

  if (!ordered.length) return null;

  const currentIdx = ordered.findIndex((w) => w.week === currentWeek);
  const doneCount = ordered.filter((w) => w.done).length;
  const activeIdx = picked ?? hover ?? (currentIdx >= 0 ? currentIdx : 0);
  const active = ordered[activeIdx];

  return (
    <div className="w-full">
      <div className="flex items-baseline justify-between gap-3 mb-4">
        <p className="text-[15px] text-[var(--muted)]">
          {doneCount} of {ordered.length} weeks done
          {currentWeek ? <> · you are on week {currentWeek}</> : null}
          <span className="text-[var(--muted-3)]"> · tap a stop</span>
        </p>
      </div>

      <div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label={`Twelve week sprint, ${doneCount} weeks complete`}
        >
          <defs>
            <linearGradient id="travelled" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--c1, #d8b45a)" stopOpacity="0.9" />
              <stop offset="100%" stopColor="var(--c1, #d8b45a)" stopOpacity="0.35" />
            </linearGradient>
          </defs>

          {/* Asphalt */}
          <path d={d} fill="none" stroke="var(--road)" strokeWidth="26" strokeLinecap="round" />
          {/* Centre line */}
          <path
            d={d}
            fill="none"
            stroke="var(--road-line)"
            strokeWidth="1.5"
            strokeDasharray="9 13"
            strokeLinecap="round"
          />

          {ordered.map((w, i) => {
            const p = stops[i];
            const isNow = w.week === currentWeek;
            const isHover = hover === i;
            const past = currentIdx >= 0 && i < currentIdx;

            return (
              <g
                key={w.id}
                transform={`translate(${p.x} ${p.y})`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => {
                  setPicked(i);
                  onPick?.(w);
                }}
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={`Week ${w.week}: ${w.objective}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setPicked(i);
                    onPick?.(w);
                  }
                }}
              >
                {/* A finger is wider than a 13px circle. This is the tap target
                    and it is deliberately invisible. */}
                <circle r="24" fill="transparent" />

                {activeIdx === i && !isNow && (
                  <circle r="19" fill="none" stroke="var(--marker-line)" strokeWidth="1.5" />
                )}

                {isNow && (
                  <circle r="21" fill="none" stroke="var(--c1, #d8b45a)" strokeOpacity="0.35" strokeWidth="1.5">
                    <animate attributeName="r" values="17;24;17" dur="2.6s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" values="0.45;0;0.45" dur="2.6s" repeatCount="indefinite" />
                  </circle>
                )}

                <circle
                  r={isNow ? 15 : 13}
                  fill={w.done ? "var(--c1, #d8b45a)" : "var(--marker)"}
                  stroke={w.done ? "var(--c1, #d8b45a)" : isNow ? "var(--c1, #d8b45a)" : "var(--marker-line)"}
                  strokeWidth={isNow ? 2.5 : 1.5}
                  style={{ transition: "all .28s cubic-bezier(0.32,0.72,0,1)" }}
                />

                {w.done ? (
                  <path
                    d="M -5 0 L -1.5 3.5 L 5.5 -3.5"
                    fill="none"
                    stroke="var(--on-accent)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dy="4.5"
                    className="tabular-nums"
                    fontSize="12.5"
                    fill={isNow || isHover || past ? "var(--text)" : "var(--muted-3)"}
                  >
                    {w.week}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* One detail panel under the road rather than twelve labels on it. */}
      {active && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <p className="text-[13px] tracking-[0.14em] uppercase text-[var(--muted-3)]">
            Week {active.week}
            {active.startsOn ? ` · ${new Date(active.startsOn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            {active.done ? " · done" : active.week === currentWeek ? " · in progress" : ""}
          </p>
          <p className="mt-2 text-[17px] leading-snug">{active.objective}</p>
          {active.deliverable && (
            <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--muted)]">{active.deliverable}</p>
          )}
        </div>
      )}
    </div>
  );
}
