/**
 * Whose work is this.
 *
 * Owners are free text and some of them are shared: "JoJo + Jaco" is a real
 * value in the board. Matching the filter by string equality meant that asking
 * for Jaco's tasks hid every task he shares with JoJo — the filter would have
 * quietly reported four when the true answer was five, which is worse than not
 * having a filter at all.
 *
 * Names are matched as whole words inside the owner string, so "JoJo + Jaco"
 * belongs to both of them and "Unassigned" belongs to nobody.
 */

export function ownsIt(owner: string, who: string): boolean {
  if (who === "Everyone") return true;
  if (owner === who) return true;

  // Whole-word, case-insensitive. Without the boundaries, a name that is a
  // substring of another ("Jo" inside "JoJo") would match the wrong person.
  const name = who.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${name}([^\\p{L}\\p{N}]|$)`, "iu").test(owner);
}

/** Everyone named in an owner string. "JoJo + Jaco" is two people. */
export function namesIn(owner: string): string[] {
  return owner
    .split(/\s*(?:\+|&|,|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
