/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * elapsed — ONE formatter for every duration the Query Centre says out loud.
 *
 * ⚠️ THE UNIT SCALES BECAUSE THE READER'S QUESTION CHANGES WITH IT. "9 days" is a number you act
 * on; "847 days" is a number you have to divide before it means anything, and by then the app has
 * made you do arithmetic about your own submission. Past a fortnight nobody counts in days.
 *
 * ⚠️ APPROXIMATE DISPLAY, PRECISE TRUTH. The phrase rounds; the exact date goes in a `title` on the
 * figure, so nothing is lost and nothing has to be worked out. That split is the whole design: this
 * governs DURATIONS only, and dates stay dates.
 *
 * ⚠️ AND IT REPLACES `elapsedLabel`, which stopped at weeks — so a two-year-old query read "121
 * weeks", which is the failure this exists to fix rather than a rounding preference.
 */

/** ~a fortnight in days: beyond this, weeks. */
export const DAYS_MAX = 14;
/** ~three months in days: beyond this, months. */
export const WEEKS_MAX = 91;
/** ~two years in days: beyond this, years. */
export const MONTHS_MAX = 730;

const DAY = 86400000;
const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/**
 * ⚠️ QUARTERS, NOT DECIMALS. "2.3 years" is a measurement; "2¼ years" is how a person says it, and
 * the precision it implies is the precision the number actually has. A whole year prints bare —
 * "2 years", never "2¼" rounded down to "2.0".
 */
const QUARTER = ["", "¼", "½", "¾"] as const;

export function elapsedPhrase(days: number): string {
  const n = Math.max(0, Math.round(days));
  if (n < DAYS_MAX) return plural(n, "day");
  if (n < WEEKS_MAX) return plural(Math.round(n / 7), "week");
  if (n < MONTHS_MAX) return plural(Math.max(1, Math.round(n / 30.44)), "month");
  /* years, to the nearest quarter */
  const y = n / 365.25;
  const whole = Math.floor(y);
  const q = Math.round((y - whole) * 4);
  /* a quarter that rounds up to four is the next whole year */
  const yy = q === 4 ? whole + 1 : whole;
  const frac = q === 4 ? 0 : q;
  const unit = yy === 1 && frac === 0 ? "year" : "years";
  return `${yy}${QUARTER[frac]} ${unit}`;
}

/** Days between two instants, floored — the input every caller already has. */
export const daysBetween = (fromMs: number, toMs: number): number => Math.max(0, Math.floor((toMs - fromMs) / DAY));

/**
 * The precise date behind an approximate phrase, for a `title`.
 *
 * ⚠️ ONE `en-GB` FORMATTER, the same discipline as the phrase. A second `toLocaleDateString` call
 * with its own options is how two surfaces come to spell one date differently.
 */
export const exactDate = (ms: number): string => {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * How a list row describes where a query stands.
 *
 * ⚠️ "WITH AGENT FOR …" ONLY HOLDS WHILE IT IS ACTUALLY WITH AN AGENT. A rejected query is not
 * "with agent for 2 years" — that sentence is false, and a false sentence about someone's own
 * submission is worse than a vague one. Closed, answered and writer's-turn rows get their own
 * label, which is why this returns the LABEL as well as the phrase.
 *
 * ⚠️ AND THE LABEL SITS ABOVE THE FIGURE, which is what lets it be a sentence rather than a
 * caption: the eye reads "with agent for" and then the number it qualifies.
 */
export type ElapsedSense = "with-agent" | "your-move" | "answered" | "closed";

export const ELAPSED_LABEL: Record<ElapsedSense, string> = {
  "with-agent": "with agent for",
  /* ⚠️ THE WRITER'S TURN IS NOT A WAIT, it is a debt — the clock is running on them, not the
     agency, and "with agent for" would put the delay on the wrong party. */
  "your-move": "waiting on you for",
  /* ⚠️ AN ANSWERED QUERY'S DURATION IS HOW LONG IT TOOK, not how long it has been. Past tense,
     because the thing being measured has finished. */
  answered: "answered in",
  /* ⚠️ A CLOSED QUERY IS NOT WAITING FOR ANYTHING. "Closed after" states the fact without implying
     an outstanding obligation on either side. */
  closed: "closed after",
};
