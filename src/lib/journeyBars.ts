/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * journeyBars — one continuous bar per agent × manuscript (bars pack, Phase 3; refs
 * design-refs/timeline-journey-bars.html for the grammar, timeline-edge-cases.html for the nine
 * rules, timeline-urgency.html for the duration weights).
 *
 * ⚠️ THIS IS ARITHMETIC OVER DATA THE PAGE ALREADY HOLDS. Nothing here reads, writes or derives a
 * fact: the events come from `recordDays`, the window from `resolveExpectedDate`, the forecast from
 * `Query.nudgeDate`, the return from `TaskFlag.snoozedUntil`, and whose move it is from
 * `getPrimaryAction(status).ballHolder` — the CTA engine the row-head dot and the filters already
 * read. What this module does is cut one bar into the pieces the interruptions leave.
 *
 * ⚠️ POSITIONS ARE FRACTIONAL DAYS, AND THE HALF IS NOT A GUESS. An activity is stamped with a DAY
 * and nothing finer — the day panel's own note says so — so its honest position is the MIDDLE of
 * its column, `dayIndex + EVENT_AT`. Drawing it at the column's left edge would claim a time of day
 * the record does not carry, and drawing it at a real time would invent one.
 *
 * ⚠️ AND WHOSE MOVE IT IS AT EACH POINT IN THE WEEK IS DERIVED, NOT REPLAYED FROM A SECOND TABLE.
 * Two rules do the whole job, and both come from facts the record already carries:
 *   · AFTER an event that changed the status, the side is `getPrimaryAction(resultingStatus)`;
 *   · an event that changed NO status changes no hands either — a nudge is something you do WHILE
 *     waiting, not a hand-over, and it carries no `resultingStatus` by construction.
 *   · BEFORE a hand-changing event, the side is the opposite of who authored it: you author when it
 *     is your move, they author when it is theirs. `dir` is already the record layer's word for
 *     authorship, so this needs no new vocabulary.
 * Verified against every case v5 draws, the nudge included — which is the one the naive inversion
 * gets wrong, and the reason the no-status clause is stated first.
 */
import { Activity, Agent, Query, QueryStatus, TaskFlag } from "../types";
import { RecordItem, shortCalDate } from "./todoCalendar";
import { getPrimaryAction } from "./queryPrimaryAction";
import { resolveExpectedDate } from "./expectedDate";
import { isTerminalStatus } from "./agentList";

/* ══ THE TOKENS ═══════════════════════════════════════════════════════════════════════════════ */

/**
 * The clearance either side of a node or waypoint, in days — v5's own constant.
 *
 * ⚠️ ONE TOKEN, BOTH SIDES. The bar stops `GAP` short of every interruption and resumes `GAP` past
 * it, so a break is symmetrical by construction. Two numbers would let one side drift.
 */
export const GAP = 0.34;

/**
 * A piece narrower than this is not drawn at all.
 *
 * ⚠️ THE RULE IS "NOTHING HAPPENED BETWEEN THEM", NOT "THE PIECE IS SMALL". Two events on adjacent
 * days leave `1 - 2 × GAP = 0.32` of a day between them; a sliver of bar there would say a state
 * persisted for a few hours, which is a claim the record cannot support. v5 draws the two events
 * adjacent and nothing between, and this is that rule as a number.
 */
export const MIN_SEG = 0.33;

/** An event sits at the middle of its day, because a day is all the record knows. */
export const EVENT_AT = 0.5;

/* ── the duration weights (v7) ─────────────────────────────────────────────────────────────── */
/**
 * ⚠️ NAMED TOKENS, NOT LITERALS, AND FLAGGED FOR NICK. These are a judgement about how long is
 * long, and the honest answer probably differs by task type — a fortnight sitting on a full
 * request is not a fortnight sitting on a nudge. They are one place so that ruling is one edit.
 */
export const FRESH_MAX_DAYS = 7;
export const SETTLED_MAX_DAYS = 21;

/**
 * How much of the window the overrun's hatch occupies.
 *
 * ⚠️ IT IS NOT TO SCALE, AND THAT IS FORCED RATHER THAN CHOSEN. A 41-day overrun cannot be drawn to
 * scale in a seven-day window, and on a window that starts today the whole of it is in the past, so
 * a to-scale stretch would have zero width. v7 draws it as a lead-in and captions the waypoint with
 * a date two months before the week it sits in, which is the same admission. So the hatch is a
 * MARKER and the count on it is the fact — `41 days your move` is true, and the number is the half
 * that has to be.
 */

/**
 * The fraction at which a bar deepens one step — and the whole of what replaced the pulse.
 *
 * ⚠️ POSITION, NOT MOTION. Urgency used to be an animation on the writer's own long-standing
 * bars; it had to be suppressed under `prefers-reduced-motion`, which left the reader who asked
 * for no motion with no signal at all. A bar at 85% of its stated span is at 85% whether or not
 * anything moves, and it is legible in a screenshot.
 */
export const NEAR_AT = 0.85;

/**
 * How far through its stated span a stretch is — `null` where nobody stated one.
 *
 * ⚠️ `null` IS THE POINT OF THIS FUNCTION, NOT ITS FAILURE CASE. A bar with no named end renders
 * NO FILL ELEMENT, and that emptiness is information: it says nobody named a date. A fill of zero
 * would say the opposite — that a span exists and none of it has elapsed — which is a confident
 * wrong answer of exactly the kind this repo has shipped before, where a value was invented to
 * fill a hole in the model and then rendered as though a person had supplied it.
 *
 * ⚠️ A HISTORICAL STRETCH IS FULL. It ended at a real event; there is nothing left of it to be
 * part-way through, and drawing it part-filled would suggest a wait still running.
 *
 * ⚠️ AND IT CAPS AT 1 RATHER THAN RUNNING PAST IT. Past the named end the bar is full and the
 * CONTINUATION is drawn hollow — lateness is drawn, never named. A fill of 130% would be a
 * verdict with a number on it.
 */
export function fillFor(sg: Segment): number | null {
  if (sg.historical) return 1;
  if (sg.goal == null) return null;
  /* ⚠️ `trueFrom`, NEVER `from`. `from` is where the ELEMENT starts — clamped to the window's left
     edge — and reading it here made the reported fraction depend on the range the reader happened
     to be on. See the field's own note. */
  const start = sg.trueFrom;
  /* the named end is at or before the start: nothing to be part-way through */
  if (sg.goal <= start) return 1;
  const p = (sg.todayAt - start) / (sg.goal - start);
  return Math.max(0, Math.min(1, p));
}

export type Side = "theirs" | "yours";
export type Weight = "fresh" | "settled" | "long";
export type NodeDir = "out" | "in" | "close";

/**
 * ⚠️ WHICH MARKER, AND THE SHAPE IS THE CLAIM (markers pack, Phase 3; ref v11).
 *
 * `status` — the query's status changed here, so the marker is the locked `StatusDot`: the same
 *   symbol the writer reads everywhere else, at its own app-wide size.
 * `direction` — an activity was recorded and the status HELD. A StatusDot here would draw the same
 *   symbol on both sides of the join, which reads as nothing having happened; a smaller ringless
 *   dot says "on the record, not a step in the journey".
 *
 * The third marker is not here because it is not a node: a date that arrived with nothing recorded
 * against it is a `Waypoint`, and the absence of a node IS the claim.
 */
export type MarkerKind = "status" | "direction";
/** The four circled marker faces the board draws. */
export type MarkerFace = "in" | "outk" | "bang" | "clock";

/** Which of the five dated things a waypoint is — the view draws the reminder differently. */

export interface Segment {
  key: string;
  rowKey: string;
  lane: number;
  /** fractional day, 0 = the window's left edge */
  from: number;
  to: number;
  side: Side;
  /** began before the window — dotted left edge, squared off */
  openLeft: boolean;
  /** continues past the window — dashed right edge, squared off */
  openRight: boolean;
  /** resumed after a break — a round cap on the left */
  capLeft: boolean;
  /** stopped at a break — a round cap on the right */
  capRight: boolean;
  label: string;
  /**
   * The shorter form, used when the bar cannot hold `label`.
   *
   * ⚠️ THIS REPLACES `when`, the date drawn at the bar's right end. The ref carries the date
   * INSIDE the wording ("reply expected 18 Aug"), so a right-aligned copy of it would have stated
   * the same date twice on one bar. `""` where there is no shorter true form — the fit pass goes
   * bare rather than inventing one.
   */
  short: string;
  /** the duration, stated as a fact and never as a verdict */
  count?: string;
  /** no reply time recorded — a dashed rail, no cap and no forecast */
  norail?: true;
  /** open-ended by nature (an R&R, an offer with no stated deadline) — it fades, it does not end */
  openEnd?: true;
  /** your-move only */
  weight?: Weight;
  /**
   * What this stretch IS — the one thing the stylesheet reads.
   *
   * ⚠️ IT DOES NOT REPLACE `side` OR `weight`, which the drawer, the row dot and the sort keys
   * still read for their own reasons. It replaces the SHEET's habit of composing a colour from
   * several classes at once, where no single place said what a bar was.
   */
  state: BarState;
  /**
   * Where the NAMED end of this stretch is, in the same fractional-day coordinates as `from` and
   * `to` — absent where nobody named one.
   *
   * ⚠️ THREE SOURCES, ONE PRECEDENCE, AND NO NEW STORED FIELD. The agency's stated response
   * window and a promised send-by are the SAME resolved date wearing whichever name the current
   * side gives it (`resolveExpectedDate`); the writer's own reminder is the fallback where
   * neither exists. All three were already read to place a waypoint — this records where the
   * winner landed rather than deriving anything new.
   */
  goal?: number;
  /** where today is, in this segment's own coordinates — a window fact, carried so `fillFor` is pure */
  todayAt: number;
  /**
   * Where this stretch REALLY began, in window coordinates — negative when it opened before the
   * window's left edge.
   *
   * ⚠️ THIS IS THE FILL'S ANCHOR, AND `from` IS THE DRAWING'S. `cutPieces` starts every run at 0
   * because that is where the element starts; reading it as the stretch's beginning made the fill
   * a fraction of what happened to be ON SCREEN. Measured at 1440 before this field existed, one
   * unchanged wait reported 35% at one month, 58% at three and 74% at six. A board that answers
   * "how far through am I" with a number that moves when you change the zoom is not reporting.
   *
   * ⚠️ CLIPPING IS WHAT A WINDOW IS, so the drawn piece is still cut at the edge. What must not be
   * cut is the arithmetic.
   */
  trueFrom: number;
  /** this stretch ended at a real event: it is finished, and a finished stretch is full */
  historical?: true;
  /**
   * This is the stretch that reaches today — the one still running.
   *
   * ⚠️ IT IS RENDERED AS `data-live` SO A PROBE CAN NAME THE SAME STRETCH AT EVERY RANGE. A row is
   * cut into a different NUMBER of pieces at different ranges as events fall in and out of the
   * window, so any geometric rule for "the live one" (the last piece, the piece containing today,
   * the piece whose edge is nearest today) selects a different segment at each reading — and a
   * range-invariance check that changes its subject between readings is measuring its own
   * selection. Identity, not geometry.
   */
  live?: true;
  /** this piece lies PAST the named end — transparent, outlined, label dimmed */
  hollow?: true;
  /** what the one portalled tooltip says for this bar: the label and the named date */
  tip: string;
  /**
   * Whether a MARKER sits at this piece's left / right end.
   *
   * ⚠️ A BOOLEAN, NOT A PIXEL COUNT. How far a bar stands off a marker is geometry and belongs
   * with the tokens; whether it abuts one at all is data, and only the pass that cut the pieces
   * knows it. The render turns each flag into `--tl-gap-mk` or `--tl-gap`, so the clearance can be
   * retuned in the stylesheet without touching this module.
   */
  abutL?: true;
  abutR?: true;
  queryId: string;
}

export interface BarNode {
  key: string;
  rowKey: string;
  lane: number;
  at: number;
  dir: NodeDir;
  /**
   * ⚠️ DERIVED FROM WHETHER THE ACTIVITY WROTE A STATUS, which is the one fact that separates the
   * two: a nudge writes no `resultingStatus` by construction, and so does a holding reply and a
   * logged note. The same absence the side walk already reads to decide that no hands changed.
   */
  marker: MarkerKind;
  /** the status it moved to — present iff `marker` is `"status"`, and it IS the marker's input */
  status?: QueryStatus;
  /** the direction marker's own symbol; a status marker draws `StatusDot` and ignores this */
  glyph: string;
  /**
   * Which of the ref's FOUR circled markers this is.
   *
   * ⚠️ FOUR KINDS AND NO NOTCH (Porcelain, Phase 5). `in` is something arriving, `outk` something
   * leaving, `bang` a nudge or reminder fallen due, `clock` a query gone quiet. They are drawn as
   * 20px circles on white with a halo of the row's own colour — which is what keeps a marker
   * legible where it sits ON a bar rather than beside one.
   */
  mark: MarkerFace;
  caption: string;
  queryId: string;
  activityId: string;
}

/* ⚠️ `Waypoint`, `WaypointKind` AND `OVERRUN_SPAN` ARE RETIRED (Porcelain, Phase 5). A waypoint
   was a forecast DRAWN as a notch — "somebody named this date" — and the fill states that on its
   own now: a filling bar means a date exists, an empty one means nobody set it, and the bar ends
   on the date either way. Three statements of one fact. The captions were not lost with the
   drawing: they ride the bar's own tooltip, where they survive the long ranges at which labels
   drop out entirely.

   ⚠️ AND `hatchPct` WENT WITH THEM. It shaded the part of a your-move stretch that ran past its
   expectation; the HOLLOW continuation says the same thing in the same single element, and says
   it for every family rather than for one. The hatch survives on `quiet` alone, where there is no
   named span for a fraction to be OF. */

export interface Bars {
  segments: Segment[];
  nodes: BarNode[];
}

/** One lane's inputs — a single agent × manuscript pairing. */
export interface LaneInput {
  rowKey: string;
  lane: number;
  query: Query;
  agent: Agent | null;
  /** the lane's own record entries, inside the window, in date order */
  records: RecordItem[];
  /** `activityId` → the `resultingStatus` it wrote, where it wrote one */
  statusOf: (activityId: string) => QueryStatus | null;
  /** the flag whose return date belongs to this lane, if any */
  flag?: TaskFlag | null;
  /** the label the card would carry — `pillLabel`'s output, never re-summarised here */
  moveLabel?: string;
}

export interface BarWindow {
  /** the window's day strings, in order */
  days: readonly string[];
  today: string;
  /** the whole window is behind today */
  past: boolean;
}

/* ══ helpers ══════════════════════════════════════════════════════════════════════════════════ */

const ms = (ymd: string) => new Date(`${ymd}T12:00:00`).getTime();
const DAY_MS = 86_400_000;
/** whole days between two ymds, midday-anchored so a DST shift cannot round one off */
const daysBetween = (a: string, b: string) => Math.round((ms(b) - ms(a)) / DAY_MS);
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

const isoToYmd = (iso: string | undefined | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/* ══ ONE FACT: THE NAMED END ═════════════════════════════════════════════════════════════════ */

/** Which of the three sources named the date — the bar does not care, the copy does. */
export type NamedEndSource = "window" | "sendBy" | "reminder";
export interface NamedEnd { ymd: string; source: NamedEndSource }
/**
 * What one call answers.
 *
 * ⚠️ TWO FACTS, ONE DERIVATION, AND THAT IS WHY THEY ARE RETURNED TOGETHER. `end` is the date the
 * bar RUNS TO; `window` is the date the AGENCY stated, whether or not it won. They are different
 * questions — a reminder ahead of the window takes the end while the window is still the thing
 * that decides whether a reply time was ever given — and returning them from one call is what
 * stops a consumer deriving the second for itself, which is the whole disease this pack treats.
 */
export interface NamedEnds { end: NamedEnd | null; window: string | null }

/**
 * The date somebody named for this stretch, or `null` where nobody did.
 *
 * ⚠️ THIS IS THE PACK'S ONE FUNCTION AND IT REPLACES THREE. The bar computed its own from
 * `Math.max(...sends)`; the row's copy computed its own from `Math.min(...sends)` — **the opposite
 * send**, fed to the same `resolveExpectedDate` — and a third read the earliest send again. So the
 * bar measured the wait from the last thing you sent and the scrawl measured it from the first,
 * which on a relationship that ran a query in January and a full in August is a difference of
 * months. That is where the impossible day-counts came from.
 *
 * ⚠️ AND `Math.max` IS THE RIGHT ONE, which is worth saying because the two were not merely
 * inconsistent — one was wrong. The reply you are waiting for is to the LAST thing you sent. A
 * window measured from the original query would still be running long after the agency answered
 * it and asked for something else.
 *
 * ⚠️ THE PRECEDENCE IS THE PORCELAIN ONE, and its first two members are ONE resolved date wearing
 * whichever name the current holder gives it: an agency's stated reply window while the work is
 * theirs, a send-by the agency asked for once it is yours. The writer's own reminder is the
 * genuine third and is a FALLBACK rather than a peer — a date the agency stated outranks one the
 * writer set for themselves.
 */
export function namedEndFor(
  query: Query,
  agent: Agent | null,
  opts: { terminal?: boolean; today?: string } = {},
): NamedEnds {
  const terminal = opts.terminal ?? isTerminalStatus(query.status as QueryStatus);
  if (terminal) return { end: null, window: null };
  const sends = [query.dateSent, query.partialSentDate, query.fullSentDate]
    .map((iso) => (iso ? new Date(iso as string).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  /* ⚠️ `null` FOR THE REPLY-STATED WINDOW, inherited and deliberate: an agency's window stated
     inside a holding reply lives in the query's NESTED events, which only the reading pane loads.
     Composing one from what this page holds would be inventing data. */
  const r = resolveExpectedDate(
    query, sends.length ? Math.max(...sends) : null, agent?.responseTimeWeeks ?? null, null);
  const cands: NamedEnd[] = [];
  const wYmd = r.ms == null ? null : isoToYmd(new Date(r.ms).toISOString());
  if (wYmd) {
    cands.push({ ymd: wYmd, source: sideOf(query.status as QueryStatus) === "yours" ? "sendBy" : "window" });
  }
  const nudge = isoToYmd(query.nudgeDate as string | undefined);
  if (nudge) cands.push({ ymd: nudge, source: "reminder" });
  if (!cands.length) return { end: null, window: null };

  /**
   * ⚠️ THE NEXT DATE STILL AHEAD — which is the precedence, read the way the ref draws it.
   *
   * Stated as a list ("window, then send-by, then the writer's own reminder") the three look like
   * a strict order, and the first two ARE one resolved date wearing whichever name the holder
   * gives it, so the only real contest is window against reminder. The ref settles that contest
   * in the reminder's favour: its nudged row runs `-9 → 29` with the goal ON the reminder, not on
   * the window beyond it. And that is the right answer for the reason a reminder exists — you set
   * one so that something happens BEFORE the window elapses, so the reminder is by construction
   * the next named date, and a bar filling past it toward a later one would be filling toward a
   * date nothing is going to happen on.
   *
   * ⚠️ WHERE EVERY CANDIDATE HAS PASSED, THE MOST RECENT WINS. The overrun should be measured from
   * the last commitment anybody made, not from the oldest one — measuring from the oldest is how a
   * day-count nobody could reconcile gets printed.
   */
  const today = opts.today;
  const pick = (): NamedEnd => {
    if (!today) return cands[0];
    const ahead = cands.filter((c) => c.ymd >= today).sort((a, b) => a.ymd.localeCompare(b.ymd));
    if (ahead.length) return ahead[0];
    return [...cands].sort((a, b) => b.ymd.localeCompare(a.ymd))[0];
  };
  return { end: pick(), window: wYmd };
}

/**
 * The side the CTA engine puts a status on — `null` where the journey has ended.
 *
 * ⚠️ THE ENGINE RETURNS `null` FOR AN OFFER AS WELL AS FOR THE THREE TERMINAL STATUSES, and
 * defaulting that to "theirs" was wrong in the one case a reader would notice: an offer is
 * emphatically the writer's move. The engine is not wrong either — it declines to draw a
 * BALL-HOLDER CHIP for an offer, which is a decision about that chip.
 *
 * ⚠️ SO THE SECOND SOURCE IS NOT A NEW LIST, IT IS `isTerminalStatus`. A status the engine gives no
 * holder for is either finished or it is the offer, and the board has already ruled on the offer by
 * raising `offer_received` into the writer's-turn family. Two existing derivations, composed.
 *
 * ⚠️ AND `null` IS RETURNED RATHER THAN A HARMLESS-LOOKING DEFAULT, because every live branch in
 * this module tests for `"yours"` or `"theirs"` — so a closed journey switches all of them off by
 * arriving as neither, instead of by each branch remembering to ask.
 */
export const sideOf = (status: QueryStatus): Side | null => {
  const holder = getPrimaryAction(status).ballHolder;
  if (holder) return holder === "writer" ? "yours" : "theirs";
  return isTerminalStatus(status) ? null : "yours";
};

/**
 * How long a your-move stretch has run, as a weight.
 *
 * ⚠️ THREE NAMES AND NO FOURTH. Weight is the whole of the urgency grammar here — no red, no
 * motion, and no word that judges — so the scale has to be readable at a glance rather than
 * precise. Adding a fourth step would make two of them indistinguishable.
 */
/**
 * What a stretch of time IS — one value per segment, and the only thing the stylesheet reads.
 *
 * ⚠️ TEN STATES, ONE FIELD. The sheet used to compose a bar's look from `side` + `weight` + four
 * modifier classes, which meant a colour lived at the intersection of several rules and no single
 * place said what a bar was. One state means one rule per state and a token triple per rule.
 *
 * ⚠️ AND THE FOUR AGENT-SIDE STATES SEPARATE BY KIND, NOT BY DURATION. A reply date exists or it
 * does not; a reminder is scheduled or it is not; that date has passed or it has not. No constant
 * is involved, so none has to be tuned or explained. Only the writer's three — fresh, settled,
 * long-standing — are a duration distinction, because nothing else separates a three-day stretch
 * from a thirty-day one, and those go through `weightFor`'s two already-named boundaries.
 */
export type BarState =
  | "closed" | "theirs" | "theirsq" | "nudged" | "quiet" | "y1" | "y2" | "y3" | "offer";

/** Who holds a stretch — the one question a bar's colour answers. */
export type Holder = "agent" | "writer";

/**
 * Who holds this stretch.
 *
 * ⚠️ ONE FACT, ONE FUNCTION, AND IT IS THE WHOLE OF WHAT DECIDES A FAMILY. `side` is the walk's
 * own word and it is already correct per piece; what went wrong was that the family ALSO consulted
 * three query-level facts about TODAY (`expectedPassed`, `nudgeYmd`, `weight`) and applied them to
 * every piece regardless of when that piece ran. So one journey alternated families —
 * `req | req | quiet | req` measured on a single row — because a stretch that finished weeks ago
 * was being coloured grey by an expectation that passed long after it ended.
 */
export const holderOf = (sg: { side: Side }): Holder => (sg.side === "yours" ? "writer" : "agent");

/**
 * The painted family, from the holder and the kind of thing — never from age.
 *
 * ⚠️ `quiet`, `nudged` AND `theirsq` ARE PROPERTIES OF THE **LIVE** STRETCH AND OF NOTHING ELSE.
 * Each of them characterises an ABSENCE — no reply logged, no date ever given, a reminder standing
 * between you and silence — and a stretch that has ENDED cannot be characterised by the absence of
 * an ending: something happened, which is why it stopped. That single sentence is the fix.
 */
export const familyOf = (state: BarState): string => {
  switch (state) {
    case "closed": return "closedp";
    case "quiet": return "quiet";
    case "nudged": return "remind";
    case "offer": return "decide";
    case "theirs": case "theirsq": return "out";
    case "y1": case "y2": case "y3": return "req";
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
};

export interface StateInput {
  side: Side;
  terminal: boolean;
  status: QueryStatus;
  norail: boolean;
  /** the reminder the WRITER set, ymd, or null */
  nudgeYmd: string | null;
  /** the reply date has been overtaken */
  expectedPassed: boolean;
  weight: Weight;
  today: string;
  /**
   * Is this the stretch that runs to today?
   *
   * ⚠️ WITHOUT IT, EVERY FACT ABOUT NOW WAS APPLIED TO EVERY PIECE. `expectedPassed` and
   * `nudgeYmd` describe where the relationship stands TODAY; a piece that ended in July cannot
   * be gone-quiet, because something happened in July to end it.
   */
  live: boolean;
}

export function barState(i: StateInput): BarState {
  if (i.terminal) return "closed";
  if (i.side === "theirs") {
    /* ⚠️ A FINISHED AGENT-HELD STRETCH IS SIMPLY `theirs`. The three branches below all describe
       the state of play NOW; none of them can be true of a stretch that already ended. */
    if (!i.live) return "theirs";
    /* no reply time was ever recorded — there is nothing to have passed */
    if (i.norail) return "theirsq";
    /* the writer has a reminder in front of them, so this is not silence */
    if (i.nudgeYmd && i.nudgeYmd > i.today) return "nudged";
    /* the date came and went and nothing is scheduled — this is what gone quiet MEANS */
    if (i.expectedPassed) return "quiet";
    return "theirs";
  }
  /* ⚠️ AN OFFER IS ITS OWN STATE BEFORE IT IS A WEIGHT. It is categorically different from every
     other thing on the writer's side, and filing it under a duration band would colour the best
     news a writer gets the same as a chore that has run three weeks. */
  if (i.status === QueryStatus.OFFER) return "offer";
  return i.weight === "fresh" ? "y1" : i.weight === "settled" ? "y2" : "y3";
}

export const weightFor = (days: number): Weight =>
  days <= FRESH_MAX_DAYS ? "fresh" : days <= SETTLED_MAX_DAYS ? "settled" : "long";

/** The count, stated as a duration and never as a verdict. */
export const durationCount = (days: number): string => plural(days, "day");

/**
 * ⚠️ v11's OWN SYMBOLS, and only the direction marker uses them. A status marker draws the locked
 * component, which brings its own glyph — so a symbol here would be a second vocabulary for a
 * thing that already has one.
 */
const GLYPH: Record<NodeDir, string> = { out: "↑", in: "←", close: "●" };

/**
 * Which circled face a node draws.
 *
 * ⚠️ DIRECTION IS THE DEFAULT AND `bang`/`clock` ARE THE TWO EXCEPTIONS, both of which are about
 * a DATE rather than about an event: `bang` is a nudge or reminder that has fallen due, `clock` a
 * query that has gone quiet. Neither is something that happened — they are the absence of
 * something happening, which is why they cannot be derived from `dir`.
 */
const faceOf = (dir: NodeDir): MarkerFace => (dir === "in" ? "in" : "outk");

/**
 * The face a join draws, from the HOLDER TRANSITION either side of it.
 *
 * ⚠️ THE RECORD'S OWN `dir` IS AUTHORSHIP, WHICH IS A DIFFERENT QUESTION. It says who wrote the
 * entry; the marker says which way the work moved. They agree most of the time and disagree
 * exactly where it matters — a holding reply the AGENT sent that hands nothing over, or a
 * status the writer logged on the agent's behalf. Reading the transition means the glyph and the
 * two stretches it sits between can never tell different stories, because they are the same story
 * read at a point instead of over a span.
 */
const faceAt = (before: Side | undefined, after: Side | undefined, dir: NodeDir): MarkerFace => {
  if (dir === "close") return "outk";
  if (before && after && before !== after) return after === "yours" ? "in" : "outk";
  /* no hands changed — fall back to who authored it, which is all there is to go on */
  return faceOf(dir);
};

/* ══ the pass ═════════════════════════════════════════════════════════════════════════════════ */

interface Break { at: number; kind: "node" | "waypoint" }

/**
 * Cut `[0, span]` at every break, leaving `GAP` either side, and drop what is left too narrow.
 *
 * ⚠️ EXPORTED SO THE CUT CAN BE TESTED WITHOUT A QUERY. The rule that a sliver is not drawn is the
 * one most easily lost to a refactor, and it is the one v5 spends a whole case on.
 */
export function cutPieces(span: number, breaks: readonly number[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let cursor = 0;
  for (const b of [...breaks].sort((x, y) => x - y)) {
    const to = b - GAP;
    if (to - cursor >= MIN_SEG) out.push({ from: cursor, to });
    cursor = Math.max(cursor, b + GAP);
  }
  if (span - cursor >= MIN_SEG) out.push({ from: cursor, to: span });
  return out;
}

/**
 * One lane's bar: its segments, its nodes and its waypoints.
 */
export function laneBars(input: LaneInput, win: BarWindow): Bars {
  const { rowKey, lane, query, agent, records, statusOf, flag, moveLabel } = input;
  const span = win.days.length;
  const idxOf = new Map(win.days.map((d, i) => [d, i]));
  const at = (ymd: string): number | null => {
    const i = idxOf.get(ymd);
    return i === undefined ? null : i + EVENT_AT;
  };

  /* ── nodes: the events, in the order they happened ─────────────────────────────────────── */
  const nodes: BarNode[] = [];
  for (const r of records) {
    const a = at(r.ymd);
    if (a == null) continue;
    const closes = /^closed$/i.test(r.label);
    const dir: NodeDir = closes ? "close" : r.dir;
    /* ⚠️ THE MARKER IS DECIDED BY THE ACTIVITY, NOT BY THE LABEL. A closure IS a status change, so
       it takes the StatusDot like every other transition — v11 draws all three closure kinds the
       same, and the terminus is the dot's own business rather than a symbol invented here. */
    const st = statusOf(r.activityId);
    nodes.push({
      key: `nd-${r.key}`, rowKey, lane, at: a,
      dir,
      marker: st ? "status" : "direction",
      ...(st ? { status: st } : {}),
      glyph: GLYPH[dir],
      mark: faceOf(dir),
      caption: r.label,
      queryId: r.queryId,
      activityId: r.activityId,
    });
  }
  nodes.sort((a, b) => a.at - b.at);

  /**
   * ⚠️ TWO EVENTS ON ONE DAY MUST NOT BE DRAWN IN ONE PLACE — one of them disappears, and nothing
   * says it did. Measured on the deployed site: a row with two sends on the same day rendered two
   * 36px nodes at identical coordinates, so the writer saw one event where the record holds two.
   *
   * ⚠️ SPREADING THEM INSIDE THEIR OWN DAY INVENTS NO TIME. A day is all the record knows, so the
   * middle of the column was always a convention rather than a claim; sharing the column between
   * the events that happened in it keeps every one of them inside the day it belongs to and states
   * nothing new about when. They stay in the order the record gives them.
   */
  for (let i = 0; i < nodes.length;) {
    let j = i;
    while (j + 1 < nodes.length && Math.abs(nodes[j + 1].at - nodes[i].at) < 0.001) j += 1;
    const n = j - i + 1;
    if (n > 1) {
      const day = Math.floor(nodes[i].at);
      /* ⚠️ THE SPREAD STAYS WELL INSIDE THE COLUMN — a node is 36px wide and a column can be 104,
         so crowding them to the edges would put one over the day beside it. */
      const room = 0.62;
      for (let k = 0; k < n; k += 1) {
        nodes[i + k].at = day + 0.5 + room * ((k + 0.5) / n - 0.5);
      }
    }
    i = j + 1;
  }

  /* ⚠️ A CLOSURE STOPS THE BAR DEAD AND NOTHING FOLLOWS IT, EVER. Everything after the first
     closure is dropped here rather than filtered later, so no forecast, waypoint or segment can
     be emitted past it by some other branch. */
  const closeIdx = nodes.findIndex((n) => n.dir === "close");
  const live = closeIdx >= 0 ? nodes.slice(0, closeIdx + 1) : nodes;
  const stopAt = closeIdx >= 0 ? live[live.length - 1].at : span;

  /* ⚠️ A JOURNEY THAT ENDED BEFORE THIS WEEK DRAWS NOTHING AT ALL. v5's closure rule is that the
     bar stops dead AT the closure — which says nothing about a week the closure is not in. A
     terminal query whose closure fell in some earlier month has no stretch left to draw here, and
     drawing one labelled "Closed" across a week in which nothing happened would state an event on
     days that held none. The row it belongs to survives only if something else puts it there. */
  if (isTerminalStatus(query.status) && closeIdx < 0) {
    return { segments: [], nodes: [] };
  }

  /* ── the sides, walked backwards from today ────────────────────────────────────────────── */
  const now = sideOf(query.status);
  const terminal = isTerminalStatus(query.status);
  /**
   * `sides[i]` is the stretch BEFORE node i; `sides[live.length]` is the stretch after the last.
   *
   * ⚠️ IT WALKS FORWARDS, AND THE FIRST VERSION WALKED BACKWARDS — which was wrong in a way no
   * number caught and one screenshot did. Carrying the current side back through every node made
   * each earlier stretch equal to the one after it unless the node itself flipped it, so a row
   * with two sends in a week drew "Your move" three times in a row: after you send a partial it is
   * plainly THEIR move, and the bar said it was still yours.
   *
   * Forwards, each stretch is stated by the event that opened it, which is the only thing that can
   * state it: `getPrimaryAction(resultingStatus)` for an event that moved the status, and the
   * PREVIOUS stretch for one that did not — a nudge is something you do while waiting, and it
   * carries no `resultingStatus` by construction.
   *
   * ⚠️ THE OPENING STRETCH IS THE ONE THE WINDOW CANNOT SEE THE CAUSE OF, so it is inferred from
   * the first event instead: you author when it is your move, they author when it is theirs, and
   * `dir` is already the record layer's word for authorship. Where the first event changed no
   * hands there is nothing to infer from and nothing changed, so the side is simply the query's.
   *
   * ⚠️ AND THE LAST STRETCH TAKES THE QUERY'S OWN STATUS, not the walk's answer. The status is the
   * ground truth for what is true NOW; a disagreement means something happened that the visible
   * record does not hold, and in that argument the status wins.
   */
  const sides: Side[] = new Array(live.length + 1);
  const firstStatus = live.length ? statusOf(live[0].activityId) : null;
  sides[0] = live.length && firstStatus
    ? (live[0].dir === "out" ? "yours" : "theirs")
    : (now ?? "theirs");
  for (let i = 0; i < live.length; i += 1) {
    const st = statusOf(live[i].activityId);
    sides[i + 1] = st ? (sideOf(st) ?? sides[i]) : sides[i];
  }
  if (live.length) sides[live.length] = now ?? sides[live.length];

  /**
   * ⚠️ THE MARKER'S FACE IS REWRITTEN FROM THE TRANSITION, once the holders are known.
   *
   * It cannot be decided where the node is BUILT, because the side walk has not run yet — and
   * that is precisely why it used to read the record's own `dir`, which answers a different
   * question (who wrote this) from the one the glyph asks (which way did the work move). One pass
   * over `live`, and the arrow and the two stretches it sits between can no longer disagree.
   */
  for (let i = 0; i < live.length; i += 1) {
    live[i].mark = faceAt(sides[i], sides[i + 1], live[i].dir);
  }

  /* ── what is forecast: read to place the bar's end, never drawn ────────────────────────── */
  const sends = [query.dateSent, query.partialSentDate, query.fullSentDate]
    .map((iso) => (iso ? new Date(iso as string).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  const sentMs = sends.length ? Math.max(...sends) : null;
  /* ⚠️ `null` FOR THE REPLY-STATED WINDOW, inherited and deliberate: an agency's window stated
     inside a holding reply lives in the query's NESTED events, which only the reading pane loads.
     Composing one from what this page holds would be inventing data. */
  /* ⚠️ ONE CALL, AND THE TWO LOCAL DERIVATIONS IT REPLACES ARE GONE. `expectedYmd` is now
     whatever `namedEndFor` says, and so is the goal below — the bar cannot fill toward one date
     while its own label names another. */
  const named = namedEndFor(query, agent, { terminal, today: win.today });
  /* ⚠️ THE AGENCY'S OWN DATE, whether or not it won the bar's end — `norail` and `expectedPassed`
     are about whether a reply time was ever GIVEN, which a reminder the writer set does not
     answer either way. */
  const expectedYmd = named.window;
  const expectedPassed = !!expectedYmd && expectedYmd < win.today;


  /* the next reminder the writer set — a forecast, never a fact */
  const nudgeYmd = terminal ? null : isoToYmd(query.nudgeDate as string | undefined);

  /* ══ THE TWO MARKERS THAT ARE NOT EVENTS ═══════════════════════════════════════════════
   *
   * ⚠️ THEY MARK THE ABSENCE OF SOMETHING HAPPENING, which is why neither can come from the
   * record walk above. `bang` is a reminder the writer set that has arrived; `clock` is a stated
   * reply window that came and went with nothing scheduled behind it. Both are drawn where the
   * DATE is, and both are the same fact the bar's own state already carries — said at a point,
   * because the bar says it over a span and a reader scanning dates is looking at points.
   */
  const dateMarks: BarNode[] = [];
  const pushMark = (ymd: string | null, mark: MarkerFace, caption: string) => {
    if (!ymd) return;
    const a = at(ymd);
    if (a == null || a > stopAt) return;
    dateMarks.push({
      key: `dm-${rowKey}-${lane}-${mark}-${ymd}`, rowKey, lane, at: a, dir: "in",
      marker: "direction", glyph: "", mark, caption,
      queryId: query.id, activityId: "",
    });
  };
  if (!terminal && nudgeYmd && nudgeYmd <= win.today) {
    pushMark(nudgeYmd, "bang", `Reminder fell due · ${shortCalDate(nudgeYmd)}`);
  }
  /* ⚠️ GONE QUIET IS THE STATE WITH NO SCHEDULED FOLLOW-UP. Where a reminder IS set the bar is
     `nudged`, not `quiet`, so drawing a clock as well would contradict it. */
  if (!terminal && expectedPassed && expectedYmd && !(nudgeYmd && nudgeYmd > win.today)) {
    pushMark(expectedYmd, "clock", `Gone quiet · no reply logged since ${shortCalDate(expectedYmd)}`);
  }

  /* ── the overrun: a long-standing your-move stretch, hatched back to the expectation ────── */
  const sinceYmd = (() => {
    /* the last hand-changing event IN VIEW is the most specific answer there is */
    for (let i = live.length - 1; i >= 0; i -= 1) {
      const ymd = win.days[Math.floor(live[i].at)];
      /* ⚠️ AN EVENT AFTER TODAY CANNOT BE WHEN SOMETHING STARTED. Records are past by nature, so
         this only bites on a window paged forward — where it would otherwise produce a negative
         elapsed time, clamped to zero, and a stretch that silently lost its duration. */
      if (ymd > win.today) continue;
      if (statusOf(live[i].activityId) && sides[i + 1] === "yours") return ymd;
    }
    /**
     * ⚠️ `lastStatusChange`, AND FALLING BACK TO THE SEND WAS MEASURABLY WRONG. The hand-change is
     * usually OUTSIDE the visible week — a full requested last month, a bar drawn this one — and
     * the send date is the wrong substitute: it dates the whole relationship, not the stretch. On
     * the harness account that put 35 stretches into the heaviest weight while none of them had an
     * expectation that had passed, which is the contradiction that gave it away.
     *
     * `lastStatusChange` is the audit stamp for when the CURRENT status began, and for a
     * writer's-move query that is exactly when it became the writer's move. It is the same field
     * `cardActionYmd` reads to place an agent task on the day it landed on the desk — one
     * derivation, two readers, rather than a second guess at the same fact.
     */
    const stamped = isoToYmd(query.lastStatusChange as string | undefined);
    if (stamped) return stamped;
    if (expectedPassed && expectedYmd) return expectedYmd;
    return sentMs != null ? isoToYmd(new Date(sentMs).toISOString()) : null;
  })();
  const yoursDays = sinceYmd ? Math.max(0, daysBetween(sinceYmd, win.today)) : 0;
  const weight = weightFor(yoursDays);

  /* ══ WHERE TODAY IS, AND WHERE THE NAMED END IS ══════════════════════════════════════════
   *
   * ⚠️ `todayAt` MAY SIT OUTSIDE THE WINDOW, and it is deliberately not clamped. A window paged
   * into the past has today beyond its right edge; clamping would put today ON the edge and every
   * bar in that window would fill to 100%, silently, stating that every wait had completed.
   * Out-of-range is the honest value and `fillFor`'s own clamp is what keeps the fraction sane.
   */
  const todayAt = daysBetween(win.days[0], win.today) + EVENT_AT;
  /**
   * Where the journey opened, in window coordinates — negative when it began before the window.
   *
   * ⚠️ IT IS THE SAME ANCHOR THE LABEL ALREADY NAMES. A bar reading "Out since 27 Jul" is telling
   * the reader when this stretch began; the fill must measure from the same day or the two are
   * describing different spans on one element. `openedAt` is that day, and it is deliberately NOT
   * clamped to the window — the whole fault was a clamp.
   */
  const sendYmds = [query.dateSent, query.partialSentDate, query.fullSentDate]
    .map((iso) => isoToYmd(iso as string | undefined))
    .filter((y): y is string => !!y)
    .sort();
  /**
   * ⚠️ THE LATEST SEND, BECAUSE THAT IS THE DATE THE GOAL IS MEASURED FROM.
   *
   * `namedEndFor` resolves the reply window as `Math.max(...sends) + responseTimeWeeks`, so the
   * stated span IS `[latest send, latest send + weeks]` — and a fill is the elapsed part of THAT.
   * Anchoring anywhere else makes the numerator and the denominator measure from two different
   * days, which is how a fraction comes to depend on things neither of them is about.
   *
   * ⚠️ `lastStatusChange` WAS TRIED HERE AND IS WRONG. It is the audit stamp for when the current
   * STATUS began, which is not when the current WAIT began: a query sent in July whose full went
   * out on the 31st has a status change in July and a wait that starts on the 31st. Measured, one
   * row anchored on the status change read 73% at three months and 59% at six — the two ranges
   * disagreeing because only the wider one could see the send that actually opened the stretch.
   * Both halves of the fraction now come from one date and the window cannot reach either.
   */
  const openedYmd = sendYmds.length ? sendYmds[sendYmds.length - 1] : null;
  const openedAt = openedYmd ? daysBetween(win.days[0], openedYmd) + EVENT_AT : 0;

  /**
   * ⚠️ THE PRECEDENCE IS EXPECTED-THEN-REMINDER, AND THE FIRST COVERS TWO OF THE THREE SOURCES.
   * The agency's stated window and a send-by the agency asked for are ONE resolved date named for
   * whichever side currently holds the move — that is already how the waypoint above is built, so
   * treating them as two candidates here would be a second derivation of one fact. The writer's
   * own reminder is the genuine third, and it is the fallback rather than a peer: a date the
   * agency stated outranks one the writer set for themselves.
   */
  /* ⚠️ THE GOAL IS THE NAMED END, FULL STOP — not a second `??` chain that happens to agree with
     one. `namedEndFor` already applied the precedence; restating it here is how the two came to
     pick different dates on the same bar. */
  const goalYmd = named.end ? named.end.ymd : null;
  const goalAt = goalYmd ? daysBetween(win.days[0], goalYmd) + EVENT_AT : null;

  /**
   * ⚠️ ONLY EVENTS BREAK A BAR NOW. A break exists so that something DRAWN has room beside it —
   * and with the notch retired nothing is drawn at a forecast date at all. Leaving the forecasts
   * in here was not merely redundant, it deleted bars: a bar that now ENDS on its named date had
   * a break at that same date, so `cutPieces` reserved clearance either side of the bar's own
   * terminus and the whole stretch came back too narrow to draw. Measured on the unit fixtures —
   * an eight-week window resolving to exactly today produced zero pieces and the row vanished.
   */
  /**
   * ⚠️ EVERY DRAWN MARKER BREAKS THE BAR, INCLUDING THE TWO THAT ARE NOT EVENTS.
   *
   * `bang` (a reminder fallen due) and `clock` (a query gone quiet) are drawn at their dates but
   * were never in `breaks`, so the bar ran straight under them and the marker's 20px disc sat ON
   * the ink. Measured box-to-box at 1440: eight pixels of overlap, on thirteen marker/bar pairs.
   * A marker INTERRUPTS a bar — that is what the 12px gap is for — so anything drawn is a break,
   * and the two exceptions were the whole of the fault.
   */
  const breaks: Break[] = [
    ...live.map((n) => ({ at: n.at, kind: "node" as const })),
    ...dateMarks.map((n) => ({ at: n.at, kind: "node" as const })),
  ];

  /* ── the pieces ────────────────────────────────────────────────────────────────────────── */
  /* ══ WHERE THE LIVE BAR STOPS ═══════════════════════════════════════════════════════════
   *
   * ⚠️ IT USED TO RUN TO THE WINDOW'S EDGE, WHICH SAID SOMETHING FALSE AT EVERY RANGE. A bar
   * drawn to the right-hand edge states that the wait continues to the end of the visible period
   * — a claim that changes meaning when the reader changes the range, and one nobody made. The
   * bar ends where the story ends: on the named date if one is ahead, otherwise on today.
   *
   * ⚠️ AND WHERE THE NAMED DATE HAS PASSED, THE BAR RUNS ON TO TODAY AND THAT STRETCH IS HOLLOW.
   * That is the whole drawing of lateness: full to the date, outlined past it, no word and no
   * second colour.
   */
  /* ⚠️ AND IT MUST REACH EVERY EVENT DRAWN ON IT. A marker is placed at its own date whatever
     the bar does; a bar that stopped short of one would leave the event floating over bare
     ground, attached to nothing. So the stop is the LAST of: today, the named end, and the final
     event — never today alone. */
  const lastEventAt = live.length ? live[live.length - 1].at : -Infinity;
  const liveStop = closeIdx >= 0
    ? stopAt
    : Math.max(0, Math.min(span, Math.max(todayAt, goalAt ?? -Infinity, lastEventAt)));
  const barStop = closeIdx >= 0 ? stopAt : liveStop;

  /* ⚠️ THE NAMED END SPLITS THE BAR SEAMLESSLY — it is not in `breaks`. A break leaves `GAP`
     either side because something is DRAWN there; nothing is drawn at the named end any more (the
     notch is retired), so a gap would open a hole in a continuous stretch for no reason a reader
     could see. */
  const marks = [...new Set(breaks.map((b) => b.at))].sort((a, b) => a - b).filter((m) => m <= barStop);
  const cut = cutPieces(barStop, marks);
  const pieces: { from: number; to: number }[] = [];
  for (const pc of cut) {
    if (goalAt != null && goalAt > pc.from + 0.001 && goalAt < pc.to - 0.001) {
      pieces.push({ from: pc.from, to: goalAt }, { from: goalAt, to: pc.to });
    } else pieces.push(pc);
  }

  /* ⚠️ NO REPLY TIME RECORDED → A DASHED RAIL AND NOTHING ELSE. No cap, no forecast, no end: the
     app does not know when to expect an answer, and drawing one would be inventing the date the
     writer has not given. One piece, whatever the events did. */
  /* ⚠️ "NO REPLY TIME" IS "THE AGENCY NAMED NOTHING", not "nothing is named at all". A reminder
     the WRITER set is still a date this bar can run to, but it is not the agency stating a window
     — so the dashed rail is decided by the absence of a `window`/`sendBy` end, never by the
     absence of `namedEndFor` outright. */
  const norail = now === "theirs" && !terminal && expectedYmd == null;

  /* ⚠️ OPEN-ENDED BY NATURE. An R&R and an offer with no stated deadline have no end to draw, so
     the bar fades rather than stopping. `resolveExpectedDate` is the only date the model holds for
     either; where it resolves, the cap is real and gets a waypoint (above). */
  const openEndKind = query.status === QueryStatus.REVISE_RESUBMIT || query.status === QueryStatus.OFFER;
  const openEnd = now === "yours" && openEndKind && expectedYmd == null;

  /**
   * ⚠️ A BAR SAYS WHAT IT IS ONCE, WHERE THERE IS ROOM TO READ IT.
   *
   * Every piece of a run used to carry the label and the count, so a row broken by two events drew
   * "Your move · 3 days" three times across one week. It reads as three separate things, which is
   * the exact impression a continuous bar exists to remove — and no assertion could see it,
   * because each piece was individually correct.
   *
   * The label goes on the WIDEST piece of each contiguous same-side run rather than the first: a
   * run's opening piece is often the sliver left before an event, where the words would be
   * truncated to nothing. Where it fits is where it is legible.
   */
  const runOf: number[] = [];
  const sideAt = (idx: number) => sides[Math.min(live.filter((n) => n.at <= pieces[idx].from).length, sides.length - 1)];
  let run = 0;
  pieces.forEach((_, i) => {
    if (i > 0 && sideAt(i) !== sideAt(i - 1)) run += 1;
    runOf[i] = run;
  });
  /**
   * ⚠️ THE RUN SPEAKS FROM ITS WIDEST **SOLID** PIECE, and the preference is the fix.
   *
   * A stretch past its named date is drawn hollow, and the hollow piece is very often the widest
   * one in the run — so the label kept landing on the OVERRUN, where it is dimmed to .75 and
   * describes the part of the stretch nobody named. The words belong to the part that was named:
   * a bar reading "Full requested · send by 20 Aug" is about the span that ran up to 20 Aug.
   * Widest-solid first; widest-of-anything only where the whole run is hollow, because a run with
   * nothing to say is worse than one saying it quietly.
   */
  const isHollow = (i: number) => goalAt != null && pieces[i].from >= goalAt - 0.001 && goalAt < todayAt;
  const widestOfRun = new Map<number, number>();
  const better = (i: number, cur: number | undefined) => {
    if (cur === undefined) return true;
    const solidNow = !isHollow(i);
    const solidCur = !isHollow(cur);
    if (solidNow !== solidCur) return solidNow;
    return pieces[i].to - pieces[i].from > pieces[cur].to - pieces[cur].from;
  };
  pieces.forEach((_, i) => {
    if (better(i, widestOfRun.get(runOf[i]))) widestOfRun.set(runOf[i], i);
  });

  /**
   * Where each contiguous same-side run really began, in window coordinates.
   *
   * ⚠️ CLIPPED RUNS TAKE THE JOURNEY'S OWN OPENING. A run whose first piece starts at the window
   * edge began before the window; `openedAt` is the outer bound we can state — `lastStatusChange`
   * where there is one, the latest send otherwise. It is deliberately not clamped: the whole fault
   * this replaces was a clamp.
   */
  const runFrom: Record<number, number> = {};
  pieces.forEach((p, i) => {
    if (runFrom[runOf[i]] === undefined) runFrom[runOf[i]] = p.from <= 0.001 ? openedAt : p.from;
  });
  /**
   * ⚠️ THE LIVE RUN ALWAYS ANCHORS ON `openedAt`, WHETHER OR NOT ITS FIRST PIECE IS CLIPPED.
   *
   * Its goal is `latest send + weeks`, so its span is `[latest send, goal]` — both from the
   * query's own fields, neither reachable by the window. Taking the first VISIBLE piece's position
   * instead introduces a second anchor, and the two disagree wherever the record holds an event
   * the query's send dates do not: measured, one row read 73% at three months and 59% at six,
   * because at six months an event a fortnight after the last send became visible and the run
   * started counting from there while its goal went on counting from the send. A fraction whose
   * numerator and denominator measure from different days is not a fraction of anything.
   *
   * ⚠️ ONLY THE LIVE RUN NEEDS THIS. Every other run is `historical`, and `fillFor` returns 1 for
   * those without reading the anchor at all.
   */
  pieces.forEach((p, i) => {
    if (p.to >= todayAt - 0.001 && todayAt <= span + 0.001 && todayAt >= -0.001) {
      runFrom[runOf[i]] = openedAt;
    }
  });

  const segments: Segment[] = [];
  pieces.forEach((p, i) => {
    const speaks = widestOfRun.get(runOf[i]) === i;
    /* which stretch is this? the one after however many nodes precede it */
    const before = live.filter((n) => n.at <= p.from).length;
    const side = sides[Math.min(before, sides.length - 1)];
    const last = i === pieces.length - 1;
    const first = i === 0;
    /* ⚠️ THE STATE IS COMPUTED BEFORE THE LABEL, because the label reads it. Leaving it in the
       object literal below would have had `labelFor` reading a `const` from the same literal it
       is being written into — the temporal-dead-zone shape this repo has shipped once. */
    /* ⚠️ THE LIVE PIECE IS THE ONE THAT REACHES TODAY — the last of the run, and only when the
       window actually contains today. A window paged into the past has no live stretch at all,
       which is right: nothing in it is still running. */
    const live_ = p.to >= todayAt - 0.001 && todayAt <= span + 0.001 && todayAt >= -0.001;
    const state = barState({
      side, terminal, status: query.status as QueryStatus,
      norail, nudgeYmd, expectedPassed, weight, today: win.today, live: live_,
    });
    const startsAtEdge = p.from <= 0.001;
    const endsAtEdge = Math.abs(p.to - span) < 0.001;

    segments.push({
      key: `sg-${rowKey}-${lane}-${i}`,
      rowKey, lane, from: p.from, to: p.to,
      side,
      /* the journey began before the window unless its own send is the first thing in it */
      openLeft: startsAtEdge && !(live[0] && live[0].dir === "out" && live[0].at < 1),
      openRight: endsAtEdge && !terminal && closeIdx < 0 && !openEnd && !norail,
      capLeft: !startsAtEdge,
      capRight: !endsAtEdge,
      ...(!speaks
        ? { label: "", short: "" }
        : (() => {
            const l = labelFor(state, {
              norail, openEnd, query, expectedYmd, expectedPassed, nudgeYmd, moveLabel, terminal,
              goalYmd,
              nudgedOnYmd: isoToYmd(query.lastNudgeSentDate as string | undefined),
              sentYmd: sentMs == null ? null : isoToYmd(new Date(sentMs).toISOString()),
              yoursDays,
              /* ⚠️ HOW LONG SINCE THE REPLY WAS EXPECTED — not how long since it was sent. A
                 journey that has been out four months with a three-month window has been QUIET
                 for one, and saying four would state the wrong fact in the right shape. */
              quietDays: expectedYmd && expectedPassed ? daysBetween(expectedYmd, win.today) : 0,
              closedYmd: isoToYmd(
                (query.rejectedDate ?? query.lastStatusChange) as string | undefined),
            });
            return { label: l.long, short: l.short };
          })()),
      /* ⚠️ THE DURATION IS STATED ONCE, on the one piece of the run that speaks. It used to ride
         the overrun AND the piece after it, so a long-standing row printed it twice; the phrasing
         gains "your move" where there is an overrun, because that is what the hatch is measuring. */
      ...(speaks && side === "yours" && !terminal && yoursDays > 0
        /* ⚠️ THE "your move" SUFFIX WENT WITH THE HATCH IT DESCRIBED. It existed because the
           hatch was measuring how long the stretch had been the writer's; the hollow run-on says
           that by being an outline, so the count is a plain duration again. */
        ? { count: durationCount(yoursDays) }
        : {}),
      ...(side === "yours" && !terminal ? { weight } : {}),
      state,
      ...(norail && first ? { norail: true as const } : {}),
      ...(openEnd && last ? { openEnd: true as const } : {}),
      todayAt,
      /* ⚠️ THE FIRST PIECE OF A RUN TAKES THE JOURNEY'S OWN OPENING; every later one begins at a
         real event and already knows where it began.
         ⚠️ AND THE TEST IS "does this piece start at the window edge", NOT "did the journey open
         before the window". A bar is ALWAYS drawn from the edge — `cutPieces` starts every run at
         0 whether or not the send is visible — so a send that sits comfortably inside the window
         is still not where the element begins, and requiring a negative opening left the six-month
         reading disagreeing with the other two by three points. */
      /* ⚠️ THE RUN'S OPENING, NOT THE PIECE'S. Pieces break at EVERY node — a nudge, a holding
         reply, anything drawn — and most of those change no hands, so the stretch continues
         through them. Anchoring on the piece made the fill depend on how many events happened to
         be inside the window: one row read 73% at three months and 59% at six, because at six
         months a nudge was visible and the piece began there. A run is one stretch and takes one
         anchor. */
      trueFrom: runFrom[runOf[i]],
      /* ⚠️ A FINISHED STRETCH IS FULL, AND THERE ARE THREE WAYS TO BE FINISHED: it lies wholly
         behind today, it ENDS AT AN EVENT (something happened and the stretch stopped), or the
         journey is closed. A live relationship is made of completed stretches and one running
         one, and only the running one has a fraction to be part-way through. */
      ...(live_ ? { live: true as const } : {}),
      ...(p.to < todayAt - 0.001
        || marks.some((m) => Math.abs(m - p.to) < GAP + 0.001)
        || terminal
        ? { historical: true as const } : {}),
      /* ⚠️ THE STRETCH PAST THE NAMED END IS DRAWN, NEVER NAMED — except on `quiet`, which has
         its own treatment and must not take this one.
         A quiet bar IS the stretch past a date that came and went with nothing scheduled behind
         it; that is what the state means. Drawing it hollow would leave it with no fill element
         at all, so the hatch — the one thing that distinguishes gone-quiet from a bar somebody
         forgot to finish — would never paint. Measured: a transparent track, no `.tl-fl` child,
         and a rule that read perfectly correctly. Two treatments for one fact, and the wrong one
         was winning. */
      /* ⚠️ ONE EXPRESSION FOR "IS THIS PIECE PAST THE NAMED END", shared with the label pass above.
         Two copies of the same test is how the label came to sit on a piece the sheet was about to
         dim. `quiet` is exempted because it has its own treatment — a hatch rather than an
         outline — and a hollow quiet piece would have no fill element at all to hatch. */
      ...(isHollow(i) && state !== "quiet" ? { hollow: true as const } : {}),
      ...(goalAt != null ? { goal: goalAt } : {}),
      ...(marks.some((m) => Math.abs(m - p.from) < GAP + 0.001) ? { abutL: true as const } : {}),
      ...(marks.some((m) => Math.abs(m - p.to) < GAP + 0.001) ? { abutR: true as const } : {}),
      /**
       * ⚠️ THE TOOLTIP IS WHERE THE NAMED DATE SURVIVES. `barFit` drops a bar's label entirely at
       * six months, and the notch that used to carry the date is retired — so without this the
       * date would be unreachable on exactly the range where a reader most needs it. It is built
       * from the LONG label, never the fitted one: what a bar says when it has no room is a
       * layout fact, and a tooltip has all the room it needs.
       */
      tip: "",
      queryId: query.id,
    });
  });

  /**
   * ⚠️ THE TIP IS COMPOSED AFTER THE FACT, because it needs the label the spread above produced.
   * Writing it inside the literal would mean reading a property of the object being constructed —
   * the shape this repo has shipped a temporal-dead-zone crash through once already.
   *
   * ⚠️ AND A PIECE THAT DOES NOT SPEAK STILL GETS A TIP. Only the widest piece of a run carries
   * the visible label, but every piece of that run is the same stretch and a reader hovering the
   * narrow end is asking the same question.
   */
  const runLabel = new Map<number, string>();
  segments.forEach((sg, i) => { if (sg.label) runLabel.set(runOf[i], sg.label); });
  const namedOn = goalYmd ? shortCalDate(goalYmd) : null;
  segments.forEach((sg, i) => {
    const words = sg.label || runLabel.get(runOf[i]) || "";
    const dateBit = namedOn && !words.includes(namedOn) ? namedOn : null;
    sg.tip = [words, dateBit].filter(Boolean).join(" · ");
  });

  /* ⚠️ THE DATE MARKS RIDE ALONGSIDE THE RECORD NODES BUT ARE NOT `live`. `live` is what the side
     walk and the piece cuts are computed from, and a mark that is not an event must not break a
     bar or flip a side — it is drawn on top of a stretch that is already correct without it. */
  return { segments, nodes: [...live, ...dateMarks] };
}

interface LabelInput {
  norail: boolean;
  openEnd: boolean;
  query: Query;
  expectedYmd: string | null;
  expectedPassed: boolean;
  nudgeYmd: string | null;
  /**
   * The date this bar actually RUNS TO — `namedEndFor`'s answer.
   *
   * ⚠️ A LABEL NAMES ITS OWN BAR'S END, AND NOTHING ELSE. The nudged form used to name the
   * reminder while the bar filled toward the agency's window, so the label said one date and the
   * bar's own tooltip appended another two words later. Whichever date wins the end is the date
   * the words are about; the loser is stated by the marker standing on it, where a point in time
   * belongs.
   */
  goalYmd: string | null;
  nudgedOnYmd: string | null;
  /** the day this journey went out, ymd — "Out since …" */
  sentYmd: string | null;
  /** how long the writer has held it, for the long-standing forms */
  yoursDays: number;
  /** how long since the reply was expected, for the quiet forms */
  quietDays: number;
  closedYmd: string | null;
  moveLabel?: string;
  terminal: boolean;
}

/**
 * What a stretch of time IS, in two lengths.
 *
 * ⚠️ TWO FORMS, BECAUSE A BAR'S WIDTH IS DATA. The same stretch is a third of the board at one
 * week and four pixels at six months, so a single string is either too long for the short board or
 * too terse for the long one. The fit pass tries `long`, falls back to `short`, and only then goes
 * bare — an ellipsis is a promise that the rest is somewhere, and it is not.
 *
 * ⚠️ IT REPORTS AND DOES NOT JUDGE. No adverb, no escalation, and never the forbidden word — a
 * duration is a fact, lateness is a verdict, and an agent has not broken a promise by being slow.
 *
 * ⚠️ AND THE BAR NEVER NAMES THE AGENT. The row head does, once. A bar repeating it would put the
 * same name twice on one line, and would put it inside the one element whose width cannot hold it.
 */
export interface BarLabel {
  /** the full form, used when the bar can hold it */
  long: string;
  /** the fallback, used when it cannot; "" where there is no shorter true form */
  short: string;
}

export function labelFor(state: BarState, i: LabelInput): BarLabel {
  const on = (ymd: string | null) => (ymd ? shortCalDate(ymd) : "");
  const since = i.sentYmd ? `Out since ${on(i.sentYmd)}` : "Out";

  switch (state) {
    case "closed":
      return i.closedYmd
        ? { long: `Closed on ${on(i.closedYmd)}`, short: `Closed ${on(i.closedYmd)}` }
        : { long: "Closed", short: "" };

    case "theirsq":
      /* ⚠️ "no reply date given" IS A FACT ABOUT THE RECORD, not a reproach to the agency. Plenty
         of agencies state no window at all, and the app's job is to say so. */
      return { long: `${since} · no reply date given`, short: "No reply date given" };

    case "nudged":
      return {
        long: i.nudgedOnYmd
          /* ⚠️ THE BAR NAMES THE DATE IT RUNS TO, AND THE MARKER NAMES THE REMINDER. This form used
             to name the reminder and nothing else, while the bar filled toward the agency's own
             window — so the label said "next reminder 8 Sept" and the bar's tooltip appended
             "16 Sept" two words later. A span's label states the span's end; a point in time
             belongs on the marker standing at it. */
          ? `Nudged ${on(i.nudgedOnYmd)}${i.goalYmd ? ` · next ${on(i.goalYmd)}` : ""}`
          : (i.goalYmd ? `Next reminder ${on(i.goalYmd)}` : "Reminder ahead"),
        short: i.nudgedOnYmd ? `Nudged · remind ${on(i.nudgeYmd)}` : `Remind ${on(i.nudgeYmd)}`,
      };

    case "quiet":
      /* ⚠️ THE INSTRUCTION IS NOT HERE. The ref's own quiet bar reads "Quiet for 78 days · nudge
         or close it" above a note reading "Nudge or close it" — the bar states what the stretch
         IS and the note states what to do, and saying it twice makes the note redundant. */
      return i.quietDays > 0
        ? { long: `Quiet for ${plural(i.quietDays, "day")}`, short: `${i.quietDays} days quiet` }
        : { long: "Quiet", short: "" };

    case "theirs":
      if (i.nudgeYmd && !i.expectedPassed) {
        return { long: `${since} · nudge due`, short: "Nudge due" };
      }
      return i.expectedYmd
        ? { long: `${since} · reply expected ${on(i.expectedYmd)}`, short: since }
        : { long: since, short: "" };

    case "offer":
      return i.expectedYmd
        ? { long: `Offer received · answer by ${on(i.expectedYmd)}`, short: `Offer · answer by ${on(i.expectedYmd)}` }
        : { long: "Offer received", short: "Offer" };

    /* ── the writer's move ─────────────────────────────────────────────────────────────────── */
    default: {
      const asked = ASKED_FOR[i.query.status as QueryStatus];
      if (!asked) {
        /* an open-ended stretch with nothing named — the card's own words, whole */
        return { long: i.moveLabel ?? "", short: "" };
      }
      if (state === "y3" && i.yoursDays > 0) {
        return {
          long: `${asked.long} ${plural(i.yoursDays, "day")} ago`,
          short: `${asked.short} · ${i.yoursDays} days ago`,
        };
      }
      return i.expectedYmd
        ? { long: `${asked.long} · send by ${on(i.expectedYmd)}`, short: `${asked.short} · by ${on(i.expectedYmd)}` }
        : { long: asked.long, short: asked.short };
    }
  }
}

/**
 * What the agency asked for, long and short.
 *
 * ⚠️ THE SHORT FORM IS AN ABBREVIATION, NOT A DIFFERENT SENTENCE. "Partial req" is the same words
 * cut; a second phrasing would be a second thing to keep true.
 */
const ASKED_FOR: Partial<Record<QueryStatus, { long: string; short: string }>> = {
  [QueryStatus.PARTIAL_REQUESTED]: { long: "Partial requested", short: "Partial req" },
  [QueryStatus.FULL_REQUESTED]: { long: "Full requested", short: "Full req" },
  [QueryStatus.REVISE_RESUBMIT]: { long: "Revise and resubmit", short: "R&R" },
};

/** Which activities wrote a status — the join the side derivation needs, built once per render. */
export function statusIndex(activities: readonly Activity[]): Map<string, QueryStatus> {
  const m = new Map<string, QueryStatus>();
  for (const a of activities) {
    if (a.id && a.resultingStatus) m.set(a.id, a.resultingStatus as QueryStatus);
  }
  return m;
}
