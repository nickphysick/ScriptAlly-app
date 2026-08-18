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
  if (dismissed || !times.length || windowClosedMs == null) return { show: false, facts: "" };
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
