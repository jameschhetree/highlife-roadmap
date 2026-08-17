/**
 * Key results the scorecard can answer for itself.
 *
 * Some of the Launch Sprint's key results are already being counted every Monday
 * — tours booked, show rate, close rate, podcast MRR — and asking someone to
 * score them by hand invites a number that disagrees with the board.
 *
 * Only a subset is derivable, and that matters: "every lead lives in HighLevel"
 * is not something this app can see, and pretending to measure it would be
 * worse than leaving it to judgement. Anything not listed here stays manual.
 *
 * Nothing is written automatically. A measured value is shown beside the key
 * result with a one-tap "use this", because a score is a judgement the plan
 * asks a person to make.
 */

export type Card = {
  date: string;
  toursBooked: number | null;
  toursShowed: number | null;
  tourCloseRate: number | null;
  podcastMrr: number | null;
};

export type Counts = {
  sopsPublished: number;
  sopsRequired: number;
  meetingsHeld: number;
  meetingsExpected: number;
  commitmentsOwnedAndDated: number;
  commitmentsTotal: number;
};

export type Measure = { label: string; value: string; score: number };

/** Clamp to the 0-1 the plan scores on. */
const scoreOf = (actual: number, target: number) =>
  target <= 0 ? 0 : Math.max(0, Math.min(1, Math.round((actual / target) * 100) / 100));

/**
 * Matched on the key result's own text rather than its position, so reordering
 * or rewording a KR cannot silently attach a measurement to the wrong one — it
 * just stops matching, which is visible.
 */
export function measureKr(text: string, cards: Card[], counts: Counts): Measure | null {
  const t = text.toLowerCase();
  const sum = (f: keyof Card) =>
    cards.reduce((n, c) => n + (typeof c[f] === "number" ? (c[f] as number) : 0), 0);
  const latest = (f: keyof Card) => {
    const withValue = cards.filter((c) => c[f] != null);
    if (!withValue.length) return null;
    return withValue.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0][f] as number;
  };

  if (t.includes("book at least 50 podcast tours")) {
    const booked = sum("toursBooked");
    return { label: "tours booked", value: `${booked} of 50`, score: scoreOf(booked, 50) };
  }

  if (t.includes("tour show rate") && t.includes("close rate")) {
    const booked = sum("toursBooked");
    const showed = sum("toursShowed");
    if (booked === 0) return null;
    const rate = (showed / booked) * 100;
    const close = latest("tourCloseRate");
    return {
      label: "show rate",
      value: `${Math.round(rate)}% show${close != null ? `, ${close}% close` : ""}`,
      // Scored on the show rate, which is the one the app can compute from
      // counts rather than from a number someone typed.
      score: scoreOf(rate, 65),
    };
  }

  if (t.includes("podcast mrr") && t.includes("2.5k")) {
    const mrr = latest("podcastMrr");
    if (mrr == null) return null;
    return { label: "podcast MRR", value: `$${mrr.toLocaleString()} of $2,500`, score: scoreOf(mrr, 2500) };
  }

  if (t.includes("publish the first 7 core sops")) {
    return {
      label: "SOPs published",
      value: `${counts.sopsPublished} of ${counts.sopsRequired}`,
      score: scoreOf(counts.sopsPublished, counts.sopsRequired),
    };
  }

  if (t.includes("hold >=90%") || t.includes("scheduled monday, wednesday and sunday meetings")) {
    if (counts.meetingsExpected === 0) return null;
    const pct = (counts.meetingsHeld / counts.meetingsExpected) * 100;
    return {
      label: "meetings held",
      value: `${counts.meetingsHeld} of ${counts.meetingsExpected}`,
      score: scoreOf(pct, 90),
    };
  }

  if (t.includes("move all leadership commitments into the roadmap")) {
    if (counts.commitmentsTotal === 0) return null;
    const pct = (counts.commitmentsOwnedAndDated / counts.commitmentsTotal) * 100;
    return {
      label: "with an owner and a date",
      value: `${counts.commitmentsOwnedAndDated} of ${counts.commitmentsTotal}`,
      score: scoreOf(pct, 100),
    };
  }

  return null;
}
