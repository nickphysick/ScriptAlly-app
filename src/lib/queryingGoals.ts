/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERYING GOALS — the storage contract. (Phase 1 of the goals pack; the derivation lands in
 * Phase 2 and this file grows into it.)
 *
 * ⚠️ THE LIST IS THE ONLY THING STORED. A goal is an append-only sequence of intents on the user
 * document; the count, the period, the label, whether the target was reached and on what day, and
 * the four-period history are ALL derived at read time from that list and the writer's queries.
 * There is deliberately no progress counter, no `met` flag, no period-close write and no cached
 * history — every one of those is a second source of truth for something the queries already say,
 * and this codebase has paid for that shape before.
 *
 * ⚠️ APPEND, NEVER MUTATE. Rewriting the last entry to change a target would restate the past:
 * a period that ran under a target of 5 would retroactively have run under 12. Appending leaves
 * the old intent standing and dates the new one, which is what lets a completed period be read
 * with the target that was actually in force while it was running.
 */
import type { GoalCadence, QueryingGoalEntry } from "../types";

/**
 * ⚠️ ARTEFACT-LOCKED TO `firestore.rules` — the `queryingGoals` size cap in `isValidUser` MUST
 * carry this same number. If the two drift, the client permits a write the rules deny SILENTLY,
 * which is the failure this repo has met before (see the MAX_COMPS note in the rules file).
 * `queryingGoalsCap.test.ts` reads both files and fails when they disagree.
 *
 * ⚠️ IT IS A DOCUMENT-SIZE GUARD, NOT A LIMIT ON HOW OFTEN YOU MAY CHANGE YOUR MIND. An entry is
 * roughly 80 bytes; 200 of them is ~16KB against a 1MB document. A writer who changed target
 * every month for sixteen years would reach it.
 */
export const MAX_GOAL_ENTRIES = 200;

/** The entries a write may carry — the tail, if a very long history ever reaches the cap. */
export const boundGoalEntries = (entries: readonly QueryingGoalEntry[]): QueryingGoalEntry[] =>
  entries.length <= MAX_GOAL_ENTRIES ? [...entries] : entries.slice(entries.length - MAX_GOAL_ENTRIES);

/* ══════════════════════════ THE LONDON CALENDAR ══════════════════════════ */

/**
 * ⚠️ EVERY BOUNDARY IS A LONDON CALENDAR DAY, NEVER A UTC ONE — and the difference is a whole
 * period for anything sent late in the evening. A query stored as `2026-07-31T23:40:00Z` was sent
 * at 00:40 on the 1st of August in London (BST), so it belongs to AUGUST. Counted in UTC it lands
 * in July, and the writer's August total is short by one for reasons nothing on screen explains.
 *
 * ⚠️ AND IT CANNOT REUSE `isoWeekStart` OR `weekStartOf`. Both are Monday-00:00 in the BROWSER's
 * zone, which is right for a reader in London and wrong by a day for one in Chicago looking at
 * their own sends. The goal is the writer's, and the app's stated calendar is London.
 */
const LONDON = "Europe/London";

/** A calendar day as `YYYY-MM-DD`. ISO day strings sort lexicographically, which is what makes
 *  every boundary comparison below a string compare with no arithmetic to get wrong. */
export type Day = string;

const DAY_PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: LONDON, year: "numeric", month: "2-digit", day: "2-digit",
});

/**
 * The London calendar day an instant falls on.
 *
 * ⚠️ BUILT FROM `formatToParts`, NOT FROM A FORMATTED STRING. A locale's date order is a
 * presentation decision that can change; the parts are named and cannot be reordered underneath us.
 */
export const londonDay = (t: Date): Day => {
  const p = DAY_PARTS.formatToParts(t);
  const get = (type: string) => p.find((x) => x.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};

/**
 * Parse whatever a `dateSent` turns out to be into its London day, or `null`.
 *
 * ⚠️ `null` IS A REAL ANSWER AND MEANS "NOT COUNTED". `Query.dateSent` is optional — provisional
 * imported queries carry none — and an unparseable or absent date must drop out of the count
 * rather than be assigned a day the writer never chose. Nothing here invents a date.
 */
export const sentDay = (dateSent: unknown): Day | null => {
  if (dateSent === null || dateSent === undefined || dateSent === "") return null;
  /* A date-only string is already a calendar day; parsing it through Date would send it via UTC
     midnight, which is 00:00 or 01:00 London — the same day either way, but stating it directly
     is cheaper and cannot drift. */
  if (typeof dateSent === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dateSent)) return dateSent;
  const t = dateSent instanceof Date ? dateSent
    : typeof dateSent === "number" ? new Date(dateSent)
    : typeof dateSent === "string" ? new Date(dateSent)
    : null;
  if (t === null || Number.isNaN(t.getTime())) return null;
  return londonDay(t);
};

/* ⚠️ CALENDAR ARITHMETIC RUNS THROUGH UTC MIDNIGHT ON PURPOSE. Once a day is a `YYYY-MM-DD`
   string the zone has already been applied; treating it as UTC midnight makes "add 14 days" exact,
   because UTC has no DST and every day is 24 hours. Doing the same arithmetic in local time would
   reintroduce the clock change this module exists to avoid — one day a year is 23 hours long. */
const asUtc = (d: Day): Date => new Date(`${d}T00:00:00Z`);
const asDay = (t: Date): Day => t.toISOString().slice(0, 10);
const addDays = (d: Day, n: number): Day => asDay(new Date(asUtc(d).getTime() + n * 86_400_000));
/** Monday = 0 … Sunday = 6. */
const mondayIndex = (d: Day): number => (asUtc(d).getUTCDay() + 6) % 7;
const mondayOf = (d: Day): Day => addDays(d, -mondayIndex(d));
const monthStart = (d: Day): Day => `${d.slice(0, 7)}-01`;
const monthEnd = (d: Day): Day => {
  const t = asUtc(monthStart(d));
  return asDay(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)));
};
const daysBetween = (a: Day, b: Day): number => Math.round((asUtc(b).getTime() - asUtc(a).getTime()) / 86_400_000);

const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const monthName = (d: Day): string => MONTHS[Number(d.slice(5, 7)) - 1];
/** `4 August` — the house short-date shape, with no leading zero. */
const dayAndMonth = (d: Day): string => `${Number(d.slice(8, 10))} ${monthName(d)}`;
/** `4 AUG` — the history strip's compact form. */
const dayAndMonthShort = (d: Day): string => `${Number(d.slice(8, 10))} ${monthName(d).slice(0, 3).toUpperCase()}`;

/** `Target reached 14 August` takes this. Exported so the card never formats a date of its own. */
export const formatReached = (d: Day): string => dayAndMonth(d);

/* ══════════════════════════ WHICH TARGET IS IN FORCE ══════════════════════════ */

export interface ResolvedGoal {
  target: number;
  cadence: GoalCadence;
}

const CADENCES: ReadonlySet<string> = new Set<GoalCadence>(["week", "fortnight", "month"]);

/** A stored entry is only usable if it says both things and says them legibly. */
const usable = (e: QueryingGoalEntry | undefined): e is QueryingGoalEntry & ResolvedGoal =>
  !!e && typeof e.target === "number" && Number.isInteger(e.target) && e.target >= 1
  && typeof e.cadence === "string" && CADENCES.has(e.cadence);

/** Entries in date order, ties keeping their append order (Array.sort is stable). */
const ordered = (entries: readonly QueryingGoalEntry[]): QueryingGoalEntry[] =>
  entries.filter((e) => typeof e?.effectiveFrom === "string" && /^\d{4}-\d{2}-\d{2}$/.test(e.effectiveFrom))
    .slice().sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0));

/**
 * The entry in force at an instant: the LAST one whose `effectiveFrom` is on or before that day.
 *
 * ⚠️ THIS IS WHAT LETS A PAST PERIOD BE READ HONESTLY. Resolving at a date in the past returns the
 * target that was actually running then, not today's — which is only possible because entries are
 * appended rather than overwritten.
 *
 * ⚠️ AN UNREADABLE ENTRY RESOLVES TO `null`, NEVER TO A DEFAULT. A target of 0, a cadence of
 * "quarter" left by the retired field, a missing key — each means "no goal is in force", because
 * the alternative is inventing a number the writer never chose and rendering it with the same
 * confidence as one they did.
 */
export const resolveGoal = (
  entries: readonly QueryingGoalEntry[] | undefined,
  at: Date,
): ResolvedGoal | null => {
  if (!entries || entries.length === 0) return null;
  const day = londonDay(at);
  const inForce = ordered(entries).filter((e) => e.effectiveFrom <= day).pop();
  return usable(inForce) ? { target: inForce.target, cadence: inForce.cadence } : null;
};

/* ══════════════════════════ PERIOD BOUNDARIES ══════════════════════════ */

export interface PeriodBounds {
  /** First London day of the period, inclusive. */
  start: Day;
  /** Last London day of the period, inclusive. */
  end: Day;
  /** The period named for the card's sub-label — `August`, `w/c 4 August`, `from 4 August`. */
  label: string;
}

/**
 * ⚠️ THE FORTNIGHT'S ANCHOR IS DERIVED, NOT STORED. It is the Monday of the week containing the
 * effective date of the goal entry in force — so the blocks are deterministic from data that
 * already exists, and there is no anchor field to fall out of step with the entry it belongs to.
 *
 * ⚠️ AND IT STEPS BACKWARDS AS WELL AS FORWARDS. `Math.floor` on a negative offset walks the same
 * 14-day grid into the past, which is what gives the history strip fortnights that line up with
 * the current one instead of a second grid counted back from today.
 */
const fortnightAnchor = (entries: readonly QueryingGoalEntry[] | undefined, at: Date): Day => {
  if (entries && entries.length) {
    const day = londonDay(at);
    const inForce = ordered(entries).filter((e) => e.effectiveFrom <= day).pop();
    if (inForce) return mondayOf(inForce.effectiveFrom);
  }
  /* No entry in force — the caller is asking about a cadence nothing declared. The Monday of the
     asking week is the only anchor available, and it is stated rather than thrown so the history
     strip can still draw. */
  return mondayOf(londonDay(at));
};

export const periodBounds = (
  cadence: GoalCadence,
  at: Date,
  entries?: readonly QueryingGoalEntry[],
): PeriodBounds => {
  const day = londonDay(at);
  if (cadence === "month") {
    const start = monthStart(day);
    return { start, end: monthEnd(day), label: monthName(day) };
  }
  if (cadence === "week") {
    const start = mondayOf(day);
    return { start, end: addDays(start, 6), label: `w/c ${dayAndMonth(start)}` };
  }
  const anchor = fortnightAnchor(entries, at);
  /* ⚠️ `Math.floor`, AND THE NEGATIVE BRANCH IS CURRENTLY UNREACHABLE. `fortnightAnchor` returns
     mondayOf(effectiveFrom) only for an entry already in force (effectiveFrom <= day) or else
     mondayOf(day) — both <= day — so the offset is never negative and `trunc` would behave
     identically. Proved by the invariant test rather than assumed, and `floor` stays because it is
     the correct general answer: the day the anchor becomes movable, `trunc` would put a date
     before it into the block AFTER it, silently. */
  const block = Math.floor(daysBetween(anchor, day) / 14);
  const start = addDays(anchor, block * 14);
  return { start, end: addDays(start, 13), label: `from ${dayAndMonth(start)}` };
};

/** The period immediately before `b`, on the same grid. */
const previousPeriod = (cadence: GoalCadence, b: PeriodBounds): PeriodBounds => {
  if (cadence === "month") {
    const prev = addDays(b.start, -1);
    return { start: monthStart(prev), end: monthEnd(prev), label: monthName(prev) };
  }
  const span = cadence === "week" ? 7 : 14;
  const start = addDays(b.start, -span);
  return {
    start, end: addDays(start, span - 1),
    label: cadence === "week" ? `w/c ${dayAndMonth(start)}` : `from ${dayAndMonth(start)}`,
  };
};

/** The history strip's own label — `JUL` for a month, `4 AUG` for a week or fortnight. */
const historyLabel = (cadence: GoalCadence, b: PeriodBounds): string =>
  cadence === "month" ? monthName(b.start).slice(0, 3).toUpperCase() : dayAndMonthShort(b.start);

/* ══════════════════════════ THE DERIVATION ══════════════════════════ */

export interface GoalPeriodCount {
  label: string;
  count: number;
}

export interface GoalProgress {
  /** `null` when no target is in force — the card's unset state. */
  target: number | null;
  cadence: GoalCadence | null;
  /** Queries sent inside the current period. */
  count: number;
  /** The current period, named for the sub-label. */
  periodLabel: string;
  /** The London day the target was reached, or `null`. Never stored. */
  reachedOn: Day | null;
  /** Up to four completed periods, most recent first. */
  history: GoalPeriodCount[];
}

/** Sends per London day, ascending — computed once and reused by the count and the history. */
const sentDays = (queries: readonly { dateSent?: string }[]): Day[] =>
  queries.map((q) => sentDay(q.dateSent)).filter((d): d is Day => d !== null).sort();

const countIn = (days: readonly Day[], b: PeriodBounds): number =>
  days.filter((d) => d >= b.start && d <= b.end).length;

/**
 * ⚠️ THE COUNT IS ONE ROW PER QUERY, AND THAT IS THE WHOLE RULE.
 *
 * A query is a thing you sent to somebody once, so counting the ROWS gives the dedupe, the
 * exclusion of resubmissions and the exclusion of requested partials and fulls for free — none of
 * them is a new query, and none of them makes a second row. Counting SEND ACTIVITIES would need
 * three filters to arrive at the same number, each of which could be got wrong independently, and
 * would still under-count: Smart Import writes `dateSent` without any activity history, so every
 * imported query would silently vanish from the total.
 *
 * ⚠️ A QUERY WITH NO `dateSent` IS NOT COUNTED, and needs no other filter. That is the honest
 * reading of a provisional imported record: it exists, and nobody has said when it went.
 */
export const deriveGoalProgress = (
  queries: readonly { dateSent?: string }[],
  entries: readonly QueryingGoalEntry[] | undefined,
  at: Date,
): GoalProgress => {
  const goal = resolveGoal(entries, at);
  /**
   * ⚠️ WITH NO TARGET THE CARD STILL COUNTS, AND IT COUNTS BY CALENDAR MONTH. State A reads
   * "You've sent {n} queries this month" — the month is not a cadence the writer chose, it is the
   * only period available to describe before they have chosen one.
   */
  const cadence: GoalCadence = goal?.cadence ?? "month";
  const days = sentDays(queries);
  const current = periodBounds(cadence, at, entries);
  const count = countIn(days, current);

  /* The Nth send of the period, N = target. Days are already ascending. */
  let reachedOn: Day | null = null;
  if (goal && count >= goal.target) {
    reachedOn = days.filter((d) => d >= current.start && d <= current.end)[goal.target - 1] ?? null;
  }

  /**
   * ⚠️ HISTORY STOPS AT THE WRITER'S FIRST SEND, and does not run back into calendar time they
   * were not using the app for. Four zeros before the first query state nothing and read as data.
   * A zero BETWEEN the first send and now is real and is shown — that is a quiet period, which
   * the strip is exactly the right place to say.
   */
  const history: GoalPeriodCount[] = [];
  const earliest = days[0];
  if (earliest !== undefined) {
    let b = previousPeriod(cadence, current);
    while (history.length < 4 && b.end >= earliest) {
      history.push({ label: historyLabel(cadence, b), count: countIn(days, b) });
      b = previousPeriod(cadence, b);
    }
  }

  return {
    target: goal?.target ?? null,
    cadence: goal?.cadence ?? null,
    count,
    periodLabel: current.label,
    reachedOn,
    history,
  };
};

/* ══════════════════════════ WORDS ══════════════════════════ */

/** The header row's cadence tag. */
export const CADENCE_TAG: Record<GoalCadence, string> = {
  week: "Weekly", fortnight: "Fortnightly", month: "Monthly",
};

/** The sheet's three segment buttons. */
export const CADENCE_SEGMENT: Record<GoalCadence, string> = {
  week: "Week", fortnight: "Fortnight", month: "Month",
};

/** The sheet's preview sentence says "each week", not "each Week". */
export const CADENCE_EACH: Record<GoalCadence, string> = {
  week: "week", fortnight: "fortnight", month: "month",
};

/** ⚠️ A COUNT IN A SENTENCE NEEDS ITS NOUN TO AGREE — "1 queries" shipped once already. */
export const queriesNoun = (n: number): string => `${n} ${n === 1 ? "query" : "queries"}`;

/**
 * The unset state's one line.
 *
 * ⚠️ IT SAYS "THIS MONTH" WHATEVER HAPPENS, because there is no cadence yet — the writer has not
 * chosen a period, so the card describes the only one it can without inventing their intent.
 */
export const unsetLine = (count: number): string => `You've sent ${queriesNoun(count)} this month.`;

/* ══════════════════════════ WRITING ══════════════════════════ */

/**
 * The next state of the list after a change of intent. APPEND ONLY — see the header.
 *
 * `next: null` records a REMOVAL. It writes a real entry rather than truncating the list, because
 * "there was a target until today" and "there was never a target" are different histories.
 *
 * ⚠️ IT NEVER MUTATES ITS INPUT. The caller holds the stored array; returning a new one is what
 * keeps a failed write from having already changed what is on screen.
 */
export const appendGoalEntry = (
  entries: readonly QueryingGoalEntry[] | undefined,
  next: ResolvedGoal | null,
  at: Date,
): QueryingGoalEntry[] => boundGoalEntries([
  ...(entries ?? []),
  next === null
    ? { target: null, cadence: null, effectiveFrom: londonDay(at) }
    : { target: next.target, cadence: next.cadence, effectiveFrom: londonDay(at) },
]);

/**
 * The bounds a goal WOULD run on if it took effect today — what the sheet's preview describes.
 *
 * ⚠️ IT USES A SYNTHETIC ENTRY, NOT THE STORED ONES. A fortnight's grid is anchored to the entry
 * in force, and the sheet is describing an entry that does not exist yet; reading the stored list
 * would preview the OLD grid and state a restart date the new goal will not use.
 */
export const prospectiveBounds = (cadence: GoalCadence, at: Date): PeriodBounds =>
  periodBounds(cadence, at, [{ target: 1, cadence, effectiveFrom: londonDay(at) }]);

/** The day the count starts again — the sheet's second preview line. */
export const nextPeriodStart = (cadence: GoalCadence, at: Date): string =>
  dayAndMonth(addDays(prospectiveBounds(cadence, at).end, 1));
