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

/**
 * ⚠️ THE SAME DURATION, SPLIT INTO ITS TWO TYPOGRAPHIC HALVES — added for the task list, whose
 * right column sets the FIGURE in Playfair and the UNIT in mono, on two lines. Splitting
 * `elapsedPhrase`'s output on a space at the call site would work until the day a phrase gained a
 * second word, and it would put the rule about how a duration is said in a component. This is the
 * extension the list brief asks for: in the formatter's own file, with `elapsedPhrase` built FROM
 * it, so there is exactly one place that decides days-versus-weeks-versus-quarters-of-a-year.
 */
export interface ElapsedParts {
  /** "7" · "2¼" — never contains a space */
  figure: string;
  /** "weeks" · "years" — already pluralised for the figure */
  unit: string;
}

export function elapsedParts(days: number): ElapsedParts {
  const n = Math.max(0, Math.round(days));
  const split = (v: number, one: string): ElapsedParts => ({ figure: String(v), unit: one + (v === 1 ? "" : "s") });
  if (n < DAYS_MAX) return split(n, "day");
  if (n < WEEKS_MAX) return split(Math.round(n / 7), "week");
  if (n < MONTHS_MAX) return split(Math.max(1, Math.round(n / 30.44)), "month");
  /* years, to the nearest quarter */
  const y = n / 365.25;
  const whole = Math.floor(y);
  const q = Math.round((y - whole) * 4);
  /* a quarter that rounds up to four is the next whole year */
  const yy = q === 4 ? whole + 1 : whole;
  const frac = q === 4 ? 0 : q;
  return { figure: `${yy}${QUARTER[frac]}`, unit: yy === 1 && frac === 0 ? "year" : "years" };
}

export function elapsedPhrase(days: number): string {
  const p = elapsedParts(days);
  return `${p.figure} ${p.unit}`;
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
 * A day, as a thread's separator says it: "Today", "Yesterday", then the date.
 *
 * ⚠️ IT LIVES BESIDE `exactDate` RATHER THAN IN THE COMPONENT, because this module is where this
 * app spells dates. A separator wants a SHORTER form than the precise one — the year is noise on a
 * thread you are reading top to bottom — so it is a second FORM, not a second formatter, and both
 * are here where they can be compared.
 */
export function dayLabel(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const day = (t: Date) => new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime();
  const diff = Math.round((day(new Date(now)) - day(d)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const sameYear = d.getFullYear() === new Date(now).getFullYear();
  return d.toLocaleDateString("en-GB", sameYear ? { day: "numeric", month: "long" } : { day: "numeric", month: "long", year: "numeric" });
}

/**
 * A duration said as a RELATIVE DATE — "5 weeks ago", "2½ years ago".
 *
 * ⚠️ THE FORMATTER IS NOT FORKED; "ago" is appended at the presentation layer, which is what this
 * is. The phrase itself still scales its unit exactly as everywhere else.
 *
 * ⚠️ AND ZERO DAYS IS "TODAY", NOT "0 days ago". "0 days" is the correct DURATION and the wrong
 * sentence about when something happened — measured on the deployed build the day this was written,
 * on a nudge sent moments earlier.
 */
export const agoLabel = (days: number): string => (days === 0 ? "today" : `${elapsedPhrase(days)} ago`);

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

/**
 * ⚠️ A SNOOZE IS SAID DIFFERENTLY FROM AN ELAPSED WAIT, and that is a real distinction rather than
 * a second formatter. `elapsedParts` describes how long something HAS been — its thresholds are
 * chosen so "13 days" stays precise, because a wait's exact length is the fact. A snooze describes
 * a length the writer is CHOOSING, where "1 week" is what they mean and "7 days" is the same answer
 * in the wrong register. Same file, same conventions, one place to change either.
 *
 * 1–6 days as days · 7–27 as whole weeks · 28+ as whole months (the frame contract, §4).
 */
export function snoozeParts(days: number): ElapsedParts {
  const n = Math.max(1, Math.round(days));
  if (n < 7) return { figure: String(n), unit: n === 1 ? "day" : "days" };
  if (n < 28) { const w = Math.floor(n / 7); return { figure: String(w), unit: w === 1 ? "week" : "weeks" }; }
  const m = Math.floor(n / 30);
  return { figure: String(Math.max(1, m)), unit: Math.max(1, m) === 1 ? "month" : "months" };
}

/** "1 week" — the snooze panel's readout, as one string */
export const snoozePhrase = (days: number): string => {
  const p = snoozeParts(days);
  return `${p.figure} ${p.unit}`;
};
