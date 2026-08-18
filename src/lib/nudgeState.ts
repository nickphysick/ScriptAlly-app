/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * nudgeState — when a nudge is available, what an unavailable one says, what a confirm states, and
 * what a nudge leaves behind (§4 + §5, refs 155-nudge.html and 156-nudge-timeline.html).
 *
 * ⚠️ AVAILABILITY FOLLOWS WHOSE TURN IT IS, NOT WHETHER A DATE HAS PASSED — and that was the whole
 * bug. The control was gated on `replyTaskFor(...) === "nudge"`, which needs a stated window AND a
 * send date AND fourteen days of grace past the deadline before it can be true; an agency that
 * states no response time can never satisfy it, so Nudge was permanently grey on most queries. It
 * was not a broken condition — it is the condition that fires the to-do TASK, which is a different
 * question ("should the app raise this?") from the one the button answers ("may I chase?").
 *
 * ⚠️ ONE DIRECTION DERIVATION, THE CTA ENGINE'S. `getPrimaryAction(status).ballHolder` is what the
 * command bar, the agent list's whose-turn axis and the timeline's waiting state already read. A
 * second list of statuses here would disagree the first time one is added.
 *
 * ⚠️ AND `statusDirection` IS THE OTHER ONE, deliberately not used for availability: it classifies
 * an EVENT as incoming or outgoing and calls an Offer "out", which is right for a dot and wrong for
 * a turn. It is used below for exactly what it is for — has anything come back since the nudge.
 */
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";
import { statusDirection } from "../components/StatusDot";
import { elapsedPhrase, daysBetween, agoLabel } from "./elapsed";

const DAY = 86400000;

/** Who is being chased, and whether they take a plural verb. An agency does; a person does not. */
export interface Chased { name: string; plural: boolean }

export interface NudgeAgent {
  name?: string;
  agency?: string;
  responseTimeWeeks?: number;
}

/**
 * ⚠️ THE AGENCY IS THE SUBJECT WHERE THERE IS ONE, and it takes "are"/"state" — British collective
 * agreement, which the app already uses ("The Marsh Agency state eight weeks"). Falling back to a
 * person and keeping the plural verb would produce "Jonathan are waiting on you", so the verb is
 * carried with the name rather than baked into the sentence.
 */
export function chasedBy(agent: NudgeAgent | null | undefined): Chased {
  const agency = agent?.agency?.trim();
  if (agency) return { name: agency, plural: true };
  const name = agent?.name?.trim();
  if (name) return { name, plural: false };
  return { name: "The agency", plural: true };
}

const agree = (c: Chased, pluralForm: string, singularForm: string) => (c.plural ? pluralForm : singularForm);

export type NudgeStanding = "available" | "writer" | "finished";

/** §4a — whose turn it is, and nothing else. */
export const nudgeStanding = (status: QueryStatus): NudgeStanding => {
  const ball = getPrimaryAction(status).ballHolder;
  return ball === "agent" ? "available" : ball === "writer" ? "writer" : "finished";
};

/**
 * §4b — an unavailable control that never says why is the weakest thing in a toolbar.
 *
 * ⚠️ THE SECOND CLAUSE IS DERIVED FROM WHAT IS OUTSTANDING, not written per status: the CTA engine
 * already knows what the writer owes, because it is the same fact its primary button acts on.
 */
export function nudgeReason(status: QueryStatus, agent: NudgeAgent | null | undefined): string {
  const standing = nudgeStanding(status);
  if (standing === "available") return "";
  if (standing === "finished") return "This query is closed. Reopen it if you want to follow up.";
  const who = chasedBy(agent);
  const action = getPrimaryAction(status);
  const owed = action.kind === "mark-sent"
    ? (action.markKind === "resubmit" ? "send your resubmission first" : `send the ${action.markKind} first`)
    : "it is your move";
  return `${who.name} ${agree(who, "are", "is")} waiting on you — ${owed}.`;
}

export interface NudgeConfirm {
  /** "no-window" states what is known instead of a closing date; both offer the same two answers. */
  kind: "inside-window" | "no-window";
  title: string;
  body: string;
  /**
   * §4 — the window drawn, and ONLY where there is a window to draw.
   *
   * ⚠️ ABSENT IS THE ANSWER, NOT AN EMPTY BAR. A track rendered for an agency that states no
   * response time would be inventing the fact the sentence beside it is admitting does not exist —
   * and it is the same rule the timeline's waiting state now obeys: a bar exists only where there
   * is something to measure against. It is also absent when a window is stated but no send date is
   * recorded, because a proportion needs both ends.
   */
  bar?: { pct: number; sentLabel: string; closesLabel: string };
}

export interface ConfirmInput {
  agent: NudgeAgent | null | undefined;
  /** When the current stage was sent. Absent (an undated import) reads as "no window". */
  sentMs: number | null;
  now: number;
  /** How the exact date is spelled — passed in so this module keeps no second date formatter. */
  formatDate: (ms: number) => string;
}

/**
 * §4c — a nudge inside the agency's own stated window asks first.
 *
 * ⚠️ IT STATES FACTS AND STOPS. No "are you sure", no "this may annoy them", no recommendation: what
 * the agency said, when the window closes, and how far off that is. The app reports; the writer
 * decides — the same rule the no-reply card and every duration label are held to.
 *
 * ⚠️ NULL MEANS PROCEED. Once the window has closed there is nothing left to state, so the confirm
 * is absent rather than reworded — an interruption that carries no information is just friction.
 *
 * ⚠️ AND THE WINDOW IS THE AGENT'S STATED ONE, NEVER THE HOUSE ASSUMPTION. `queryAmbientStatus`
 * falls back to 8/12/12 weeks so the tracking bar always has an anchor; using that here would put a
 * closing date in the writer's face and attribute it to an agency that never gave one.
 */
export function nudgeConfirm({ agent, sentMs, now, formatDate }: ConfirmInput): NudgeConfirm | null {
  const who = chasedBy(agent);
  const weeks = agent?.responseTimeWeeks;
  const stated = typeof weeks === "number" && weeks > 0;

  if (stated && sentMs != null) {
    const closesMs = sentMs + weeks! * 7 * DAY;
    if (now >= closesMs) return null; // the window has passed — nudge proceeds directly
    return {
      kind: "inside-window",
      title: "Nudge before their window closes?",
      body: `${who.name} ${agree(who, "state", "states")} ${weeks} week${weeks === 1 ? "" : "s"}. `
        + `That window closes on ${formatDate(closesMs)} — ${elapsedPhrase(daysBetween(now, closesMs))} from now.`,
      bar: {
        pct: Math.max(0, Math.min(100, ((now - sentMs) / (closesMs - sentMs)) * 100)),
        sentLabel: `Sent ${formatDate(sentMs)}`,
        closesLabel: `Closes ${formatDate(closesMs)}`,
      },
    };
  }

  /* ⚠️ A STATED WINDOW WITH NO SEND DATE IS STILL "NOT YET DUE" — there is no anchor to say it has
     passed, and treating an unknown as elapsed would nudge on the app's assumption rather than the
     writer's knowledge. It states what it has: the window, without a date. */
  if (stated) {
    return {
      kind: "inside-window",
      title: "Nudge before their window closes?",
      body: `${who.name} ${agree(who, "state", "states")} ${weeks} week${weeks === 1 ? "" : "s"}. This query has no send date recorded, so that window has no closing date.`,
    };
  }

  return {
    kind: "no-window",
    title: "Nudge?",
    body: `${who.name} ${agree(who, "do", "does")} not state a response time.`
      + (sentMs != null ? ` You sent this ${elapsedPhrase(daysBetween(sentMs, now))} ago.` : ""),
  };
}

/** Every nudge on this query, oldest first. */
export function nudgeTimes(events: { type?: unknown; createdAt?: unknown }[] | null | undefined, nudgeType: string, at: (v: unknown) => number): number[] {
  return (events || []).filter((e) => e.type === nudgeType).map((e) => at(e.createdAt)).filter((t) => !Number.isNaN(t)).sort((a, b) => a - b);
}

/**
 * §4d — how long ago the last nudge on THIS round went, or null if there has not been one.
 *
 * ⚠️ THIS ROUND, NOT THIS QUERY. A nudge sent before the agent replied and asked for the full is
 * part of the record but is not a follow-up on what is outstanding now, and a control reading
 * "Nudged · 8 months ago" beside a fortnight-old full would be answering the wrong question. §5e
 * states the same rule from the other side: when a nudge works, the state moves on.
 */
export function nudgedAgo(times: number[], roundStartMs: number | null, now: number): number | null {
  const live = roundStartMs == null ? times : times.filter((t) => t >= roundStartMs);
  if (!live.length) return null;
  return daysBetween(live[live.length - 1], now);
}

/**
 * §4d — how the control reports that it has been used.
 *
 * ⚠️ IT IS `agoLabel`, MOVED TO `elapsed.ts` AND SHARED. The list row says the same kind of thing —
 * "5 weeks ago" — and two copies of "append ago, except at zero" is exactly how one surface comes
 * to read "today" while the other reads "0 days ago".
 */
export { agoLabel } from "./elapsed";

/**
 * §5a — what a nudge event says.
 *
 * ⚠️ THE OUTCOME, NOT THE ACT, AND IT IS DERIVED. "Nudged — no reply" while nothing has come back;
 * plain "Nudged" once something has, because the reply event below it says the rest. Nothing stores
 * whether a nudge worked — the presence of an incoming event after it IS the answer, and a stored
 * flag would be a second copy of a fact the log already holds.
 */
export function nudgeOutcomeLabel(nudgeMs: number, laterEvents: { status: QueryStatus | string; timeMs?: number }[]): string {
  const answered = laterEvents.some((e) => (e.timeMs ?? 0) > nudgeMs && statusDirection(e.status) === "in");
  return answered ? "Nudged" : "Nudged — no reply";
}

/**
 * §5b — the nudge history line under the window bar.
 *
 * ⚠️ THE SINGLE MOST USEFUL FACT IN A LONG SILENCE, and it exists nowhere else: without it a writer
 * scrolls the whole timeline to find out whether they already followed up.
 */
const COUNT_WORD = ["", "once", "twice", "three times", "four times", "five times", "six times"];
/** The offer counts nudges as a sentence's subject, where a numeral reads as a statistic. */
const CARDINAL = ["", "One", "Two", "Three", "Four", "Five", "Six"];
export function nudgeHistoryLine(times: number[], formatDate: (ms: number) => string): string {
  if (!times.length) return "";
  const n = COUNT_WORD[times.length] ?? `${times.length} times`;
  return `Nudged ${n} · ${times.map(formatDate).join(", ")}`;
}

export interface ClosureOfferInput {
  /** Nudge times on this query, oldest first. */
  times: number[];
  /** When the agent's window closed. Null = no window to be past. */
  windowClosedMs: number | null;
  now: number;
  /** The writer already said "keep tracking" — §5d, the one stored thing in this section. */
  dismissed: boolean;
  /**
   * §1 (policy pack) — the agency's own `noResponseMeansNo`. `true` is a SECOND route into this
   * offer, independent of the nudge history: an agency that has published "assume no" has already
   * answered the question the six-month wait exists to ask.
   */
  policy?: boolean;
}

/** How long past a closed window the offer waits — stated once, so it is tunable rather than hunted. */
export const CLOSURE_OFFER_MONTHS = 6;

/**
 * §5c — closure is offered once, and only when the facts justify it.
 *
 * ⚠️ THE TRIGGER IS FACTS, NOT THE CLOCK. A query that has never been nudged never gets the offer,
 * however old it is: the obvious next step there is a nudge, not closure. Both conditions must hold
 * — at least one nudge has gone unanswered, AND the window closed more than six months ago.
 *
 * ⚠️ AND THE LAST NUDGE MUST BE OLD TOO. Six months past a window plus a nudge sent yesterday is a
 * query the writer has just acted on; offering to close it would be answering a question they have
 * already answered.
 */
export function closureOffer(inp: ClosureOfferInput): { show: boolean; facts: string } {
  const { times, windowClosedMs, now, dismissed } = inp;
  if (dismissed || windowClosedMs == null) return { show: false, facts: "" };

  /**
   * ⚠️ §1 (policy pack) · THE POLICY ROUTE, AND IT DOES NOT WAIT SIX MONTHS. The nudge route below
   * waits because closure is the app's inference and an inference needs evidence; where the AGENCY
   * has stated that silence means no, closure is THEIR published position and the only thing left
   * to establish is that the window has closed. No nudge is required either: chasing an agency that
   * has already said it will not reply is a step the app should not be implying is missing.
   *
   * ⚠️ THE FACTS STOP SHORT OF THE POLICY ITSELF, because the line above the offer states it. An
   * offer that repeated it would be the app pressing the point, which is the one thing this section
   * forbids.
   */
  if (inp.policy === true && now > windowClosedMs) {
    const since = elapsedPhrase(daysBetween(windowClosedMs, now));
    return {
      show: true,
      facts: times.length
        ? `No reply in the ${since} since their window closed, and ${times.length === 1 ? "a nudge" : `${times.length} nudges`} went unanswered.`
        : `No reply in the ${since} since their window closed.`,
    };
  }

  if (!times.length) return { show: false, facts: "" };
  const monthsPast = (now - windowClosedMs) / (DAY * 30.44);
  const lastNudge = times[times.length - 1];
  if (monthsPast <= CLOSURE_OFFER_MONTHS || now < lastNudge) return { show: false, facts: "" };
  return {
    show: true,
    /* ⚠️ THE ACCUMULATED FACTS AND NOTHING ELSE. Not "time to move on", not "unlikely to reply" —
       the offer names what has happened and lets the writer draw the conclusion. */
    facts: `${CARDINAL[times.length] ?? times.length} nudge${times.length === 1 ? "" : "s"}, no reply, `
      + `and ${elapsedPhrase(daysBetween(windowClosedMs, now))} since the window closed.`,
  };
}

/**
 * §6a — how long the silence has run PAST the window the agency stated.
 *
 * ⚠️ MEASURED FROM THE STATED CLOSE, AND ONLY WHERE ONE WAS STATED. Without a window there is
 * nothing to be past, and the house 8/12/12-week assumption is not a thing to be past either — it
 * is the app's own guess, and a figure counted from it would attribute the app's arithmetic to the
 * agency. Null is the answer, and the card says something else instead.
 *
 * ⚠️ THE PHRASING KEEPS THE FACT ON THE AGENCY'S SIDE OF THE LINE: "past the window they stated",
 * not "overdue" and not "late". A stated window is an intention, not a contract, and the app
 * reports rather than appraises — the same rule that retired "overdue" from this page.
 */
export function pastWindowLine(windowClosedMs: number | null, now: number, stated: boolean): { figure: string; tail: string } | null {
  if (!stated || windowClosedMs == null || now <= windowClosedMs) return null;
  return { figure: elapsedPhrase(daysBetween(windowClosedMs, now)), tail: "past the window they stated" };
}

/**
 * §1 (policy pack) — THE AGENCY'S OWN SILENCE POLICY, OR NOTHING.
 *
 * ⚠️ THE GENERIC LINE IS GONE AND MUST NOT COME BACK. The card printed "Many agencies treat silence
 * as a pass." on every past-window state — an industry observation on one specific query's tracker,
 * true of the trade and unattributable to the agency in front of you. Where the agency HAS stated
 * the policy, the app can name them; where it has not, it says nothing at all. There is no house
 * fallback, exactly as there is no house window bar.
 *
 * ⚠️ THE RECOMMENDATION IS THEIRS, NOT OURS. The sentence quotes a fact the agency published and
 * the date their own window closed; the app adds no verdict and never says "we recommend". That is
 * what earns it the right to sit above an offer to close.
 *
 * ⚠️ `noResponseMeansNo` IS ALREADY THE FIELD — this needed no schema change. Absent means the
 * agency has not said, `false` means they reply either way, and BOTH render nothing: only an
 * explicit `true` produces a line. A `!== false` test here would turn silence about silence into a
 * statement about it, which is the whole fault this section removes.
 */
export interface SilencePolicyInput {
  /** The agent's `noResponseMeansNo` — absent = not stated. */
  policy: boolean | undefined;
  who: Chased;
  /** When the agency's stated window closed. Null = no window, so nothing to be past. */
  windowClosedMs: number | null;
  now: number;
  /** Long-form date, injected so this module stays free of formatting. */
  formatDate: (ms: number) => string;
}

export function silencePolicyLine(inp: SilencePolicyInput): string | null {
  const { policy, who, windowClosedMs, now, formatDate } = inp;
  if (policy !== true || windowClosedMs == null || now <= windowClosedMs) return null;
  /* "their" for both — an agency takes it as a plural and a person takes it as the singular they,
     so the possessive is the one word in this sentence that does not need to agree. */
  return `${who.name} ${agree(who, "treat", "treats")} silence as a pass — their window closed ${formatDate(windowClosedMs)}.`;
}

/** A task that is a scheduled reminder on this query: undone, scoped to it, and dated ahead. */
export interface ReminderTask { id: string; text: string; done: boolean; queryId?: string; dueDate?: string }

/**
 * §6b — the scheduled reminder this query is waiting on, or null.
 *
 * ⚠️ THE PREDICATE IS `!done && queryId === id && dueDate > today` — three clauses, and each is
 * load-bearing. A done task is history; a task scoped elsewhere is not this query's; and a task
 * dated TODAY OR EARLIER is not a future to draw as a ghost — it is on the writer's list now, which
 * is a different statement.
 *
 * ⚠️ AND IT READS THE STORED `UserTask` STORE, NOT THE DERIVED `Task` FEED. `queryTaskBadge` counts
 * DERIVED suggestions off `relatedRecordId` — things the app noticed — and a reminder is something
 * the writer SET. The bar's count reads both; a ghost rung must only ever draw the second, or the
 * timeline would show a future the writer never scheduled.
 *
 * ⚠️ THE NEAREST ONE, so two reminders do not draw two rungs.
 */
export function scheduledReminder(tasks: readonly ReminderTask[] | undefined, queryId: string, todayISO: string): ReminderTask | null {
  const ahead = (tasks ?? []).filter((t) => !t.done && t.queryId === queryId && !!t.dueDate && t.dueDate > todayISO);
  return ahead.sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))[0] ?? null;
}

export interface NextStepInput {
  /** Nudge times on this query, oldest first. */
  times: number[];
  /** A reminder already scheduled — anything pending means no offer. */
  reminder: ReminderTask | null;
  now: number;
  /** The writer already dismissed the card's offer — §5d's flag, reused. */
  dismissed: boolean;
  /** How recent a nudge still counts as pending, in days. */
  recentDays?: number;
}

/** How long a nudge stays "pending" for the purposes of the offer — one stated figure. */
export const NUDGE_PENDING_DAYS = 28;

/**
 * §6c — the offer appears only when there is genuinely nothing pending.
 *
 * ⚠️ NOTHING PENDING MEANS NOTHING PENDING: no reminder scheduled AND no recent unanswered nudge.
 * An offer to nudge, beside a nudge sent last week, would be the app failing to notice what the
 * writer just did.
 *
 * ⚠️ AND IT NEEDS NO DISMISSAL FLAG OF ITS OWN, WHICH IS THE FINDING. Every one of its three
 * actions makes its own trigger false — nudging creates a recent nudge, "remind me later" creates
 * the reminder, marking closed ends the query — so it self-dismisses by construction and there is
 * no state where it would return having been answered. It still honours the CLOSURE offer's flag,
 * because a writer who has said "keep tracking" has answered the card's offer as such.
 */
export function nextStepOffer(inp: NextStepInput): { show: boolean; facts: string } {
  const { times, reminder, now, dismissed } = inp;
  const recent = inp.recentDays ?? NUDGE_PENDING_DAYS;
  if (dismissed || reminder) return { show: false, facts: "" };
  const last = times[times.length - 1];
  if (last != null && daysBetween(last, now) <= recent) return { show: false, facts: "" };
  return {
    show: true,
    /* ⚠️ THE FACTS, AND NO ADVICE. Not "it may be time to chase" — what has and has not happened. */
    facts: times.length
      ? `Your last nudge was ${elapsedPhrase(daysBetween(last, now))} ago and no reminder is set.`
      : "No nudge has been sent and no reminder is set.",
  };
}
