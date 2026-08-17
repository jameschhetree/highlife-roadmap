/**
 * Line icons, one stroke weight, 20px on a 24 grid.
 *
 * Drawn here rather than pulled from a set because the standard bans the
 * thick-stroked defaults, and because eleven icons is not worth a dependency.
 * Every path is stroke-only at 1.5, so they sit at the same visual weight as the
 * labels beside them.
 */

type P = { className?: string };
const wrap = (d: React.ReactNode) => ({ className = "w-5 h-5" }: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
       strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {d}
  </svg>
);

export const IconWeek = wrap(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>);
export const IconMeeting = wrap(<><path d="M17 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1" /><circle cx="9.5" cy="7" r="3.5" /><path d="M19 8v6M22 11h-6" /></>);
export const IconMoney = wrap(<><path d="M3 17l5-5 4 3 8-8" /><path d="M21 7v5h-5" /></>);
export const IconTarget = wrap(<><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>);
export const IconSystems = wrap(<><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /><circle cx="12" cy="12" r="3.5" /></>);
export const IconRevenue = wrap(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>);
export const IconContent = wrap(<><rect x="3" y="4" width="18" height="14" rx="2" /><path d="M10 9l5 3-5 3V9z" /></>);
export const IconEvent = wrap(<><path d="M12 3l2.4 5 5.6.7-4 3.9 1 5.4-5-2.7-5 2.7 1-5.4-4-3.9 5.6-.7z" /></>);
export const IconSop = wrap(<><path d="M8 3h8l4 4v14H4V3h4z" /><path d="M16 3v4h4M8 12h8M8 16h5" /></>);
export const IconTeam = wrap(<><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20v-1a4.5 4.5 0 0 1 4.5-4.5h4A4.5 4.5 0 0 1 15.5 19v1" /><path d="M17 5.5a3 3 0 0 1 0 5.8M18 14.5a4 4 0 0 1 3.5 4v1.5" /></>);
export const IconBlocked = wrap(<><circle cx="12" cy="12" r="8.5" /><path d="M6 6l12 12" /></>);
export const IconDecision = wrap(<><path d="M12 3v18M12 8L5 12M12 8l7 4" /><circle cx="12" cy="3.5" r="1.5" /></>);
export const IconPlan = wrap(<><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 5.5v15" /></>);
export const IconAsk = wrap(<><path d="M21 12a8 8 0 1 1-3.2-6.4" /><path d="M12 8v4M12 16h.01" /></>);
