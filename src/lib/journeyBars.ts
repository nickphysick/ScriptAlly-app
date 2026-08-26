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
export const OVERRUN_SPAN = 2;

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

/** Which of the five dated things a waypoint is — the view draws the reminder differently. */
export type WaypointKind = "expected" | "reminder" | "deadline" | "snooze" | "overrun";

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
  /** the date the stretch runs to, drawn at the bar's right end; "" where there is none */
  when: string;
  /** the duration, stated as a fact and never as a verdict */
  count?: string;
  /** no reply time recorded — a dashed rail, no cap and no forecast */
  norail?: true;
  /** open-ended by nature (an R&R, an offer with no stated deadline) — it fades, it does not end */
  openEnd?: true;
  /**
   * How much of THIS piece lies before the expected date, as a percentage of its own width.
   *
   * ⚠️ THE OVERRUN IS A BACKGROUND TREATMENT ON ONE BAR, NOT A SECOND OBJECT BESIDE IT. It used to
   * be its own segment with its own count, so a long-standing row drew two capsules and printed
   * the duration twice — v11's "hatched behind, solid ahead" is ONE bar and one story. Every piece
   * computes its own share, so the hatch composes with whatever real events also broke the bar:
   * a piece wholly before the date is 100, wholly after is absent, straddling is the fraction.
   */
  hatchPct?: number;
  /** your-move only */
  weight?: Weight;
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
  caption: string;
  queryId: string;
  activityId: string;
}

export interface Waypoint {
  key: string;
  rowKey: string;
  lane: number;
  at: number;
  side: Side;
  kind: WaypointKind;
  caption: string;
  /** the week is behind us: the dashes go solid and this renders as already passed */
  passed?: true;
  queryId: string;
}

export interface Bars {
  segments: Segment[];
  nodes: BarNode[];
  waypoints: Waypoint[];
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
    return { segments: [], nodes: [], waypoints: [] };
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

  /* ── waypoints: what is forecast, and what comes back ──────────────────────────────────── */
  const waypoints: Waypoint[] = [];
  const sends = [query.dateSent, query.partialSentDate, query.fullSentDate]
    .map((iso) => (iso ? new Date(iso as string).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  const sentMs = sends.length ? Math.max(...sends) : null;
  /* ⚠️ `null` FOR THE REPLY-STATED WINDOW, inherited and deliberate: an agency's window stated
     inside a holding reply lives in the query's NESTED events, which only the reading pane loads.
     Composing one from what this page holds would be inventing data. */
  const resolved = terminal ? { ms: null, source: null }
    : resolveExpectedDate(query, sentMs, agent?.responseTimeWeeks ?? null, null);
  const expectedYmd = resolved.ms == null ? null : isoToYmd(new Date(resolved.ms).toISOString());
  const expectedPassed = !!expectedYmd && expectedYmd < win.today;

  const addWp = (ymd: string | null, side: Side, kind: WaypointKind, caption: string) => {
    if (!ymd || !caption) return;
    const a = at(ymd);
    if (a == null || a > stopAt) return;
    waypoints.push({
      key: `wp-${rowKey}-${lane}-${ymd}-${caption}`, rowKey, lane, at: a, side, kind, caption,
      ...(ymd < win.today ? { passed: true as const } : {}),
      queryId: query.id,
    });
  };

  /* ⚠️ A WAYPOINT IS DRAWN WHEREVER IT LANDS IN THE WINDOW, and `passed` says whether it has been
     overtaken. Gating on "not yet passed" was right for the current week and wrong for a past one,
     where v5's whole rule is that overtaken waypoints still render — as passed. In a window that
     starts today, in-window and not-yet-passed are the same thing, so one test does both jobs. */
  if (expectedYmd) {
    /* ⚠️ ONE DATE, TWO OF v11's FIVE. While it is theirs it is the reply window's close; once the
       move is the writer's it is the deadline the agency stated for THEM. The same resolved date,
       named for whose it is — not two derivations. */
    addWp(expectedYmd, now === "yours" ? "yours" : "theirs",
      now === "yours" ? "deadline" : "expected",
      now === "yours" ? `They asked by ${shortCalDate(expectedYmd)}` : `Expected ${shortCalDate(expectedYmd)}`);
  }
  /* the next reminder the writer set — a forecast, never a fact */
  const nudgeYmd = terminal ? null : isoToYmd(query.nudgeDate as string | undefined);
  addWp(nudgeYmd, "theirs", "reminder", nudgeYmd ? `Reminder due ${shortCalDate(nudgeYmd)}` : "");
  /* ⚠️ A SNOOZE PAUSES YOUR ATTENTION, NOT THE AGENT'S CLOCK — so it is a waypoint and the bar is
     untouched by it. Drawing a break in the journey would say something stopped; nothing did. */
  const backYmd = flag?.snoozedUntil ? isoToYmd(flag.snoozedUntil) : null;
  if (backYmd) addWp(backYmd, "yours", "snooze", `Back on ${shortCalDate(backYmd)}`);

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
  const wantsOverrun = now === "yours" && !terminal && weight === "long" && expectedPassed && !win.past;

  const breaks: Break[] = [
    ...live.map((n) => ({ at: n.at, kind: "node" as const })),
    ...waypoints.map((w) => ({ at: w.at, kind: "waypoint" as const })),
  ];
  if (wantsOverrun) {
    /* ⚠️ IT IS NOT PUSHED INTO `breaks`. The expectation passing is a change of TREATMENT, not an
       interruption — nothing happened on that date, which is the whole of what it says. Breaking
       the bar there is what made it two objects. */
    waypoints.push({
      key: `wp-${rowKey}-${lane}-overrun`, rowKey, lane, at: OVERRUN_SPAN, side: "yours",
      kind: "overrun",
      caption: expectedYmd ? `Expected ${shortCalDate(expectedYmd)}` : "Expected",
      queryId: query.id,
    });
  }

  /* ── the pieces ────────────────────────────────────────────────────────────────────────── */
  const marks = [...new Set(breaks.map((b) => b.at))].sort((a, b) => a - b).filter((m) => m <= stopAt);
  const pieces = cutPieces(stopAt, marks);

  /* ⚠️ NO REPLY TIME RECORDED → A DASHED RAIL AND NOTHING ELSE. No cap, no forecast, no end: the
     app does not know when to expect an answer, and drawing one would be inventing the date the
     writer has not given. One piece, whatever the events did. */
  const norail = now === "theirs" && !terminal && resolved.ms == null;

  /* ⚠️ OPEN-ENDED BY NATURE. An R&R and an offer with no stated deadline have no end to draw, so
     the bar fades rather than stopping. `resolveExpectedDate` is the only date the model holds for
     either; where it resolves, the cap is real and gets a waypoint (above). */
  const openEndKind = query.status === QueryStatus.REVISE_RESUBMIT || query.status === QueryStatus.OFFER;
  const openEnd = now === "yours" && openEndKind && resolved.ms == null;

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
  const widestOfRun = new Map<number, number>();
  pieces.forEach((p, i) => {
    const cur = widestOfRun.get(runOf[i]);
    if (cur === undefined || p.to - p.from > pieces[cur].to - pieces[cur].from) widestOfRun.set(runOf[i], i);
  });

  const segments: Segment[] = [];
  pieces.forEach((p, i) => {
    const speaks = widestOfRun.get(runOf[i]) === i;
    /* which stretch is this? the one after however many nodes precede it */
    const before = live.filter((n) => n.at <= p.from).length;
    const side = sides[Math.min(before, sides.length - 1)];
    const last = i === pieces.length - 1;
    const first = i === 0;
    /* the share of this piece that lies before the expectation — 0 when it is wholly after */
    const hatch = wantsOverrun
      ? Math.max(0, Math.min(1, (OVERRUN_SPAN - p.from) / Math.max(0.0001, p.to - p.from)))
      : 0;
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
        ? { label: "", when: "" }
        : (() => {
            const l = labelFor(side, {
              norail, openEnd, query, expectedYmd, expectedPassed, nudgeYmd, moveLabel, terminal,
            });
            return { label: l.text, when: l.when };
          })()),
      ...(hatch > 0 ? { hatchPct: Math.round(hatch * 1000) / 10 } : {}),
      /* ⚠️ THE DURATION IS STATED ONCE, on the one piece of the run that speaks. It used to ride
         the overrun AND the piece after it, so a long-standing row printed it twice; the phrasing
         gains "your move" where there is an overrun, because that is what the hatch is measuring. */
      ...(speaks && side === "yours" && !terminal && yoursDays > 0
        ? { count: wantsOverrun ? `${durationCount(yoursDays)} your move` : durationCount(yoursDays) }
        : {}),
      ...(side === "yours" && !terminal ? { weight } : {}),
      ...(norail && first ? { norail: true as const } : {}),
      ...(openEnd && last ? { openEnd: true as const } : {}),
      queryId: query.id,
    });
  });

  return { segments, nodes: live, waypoints };
}

interface LabelInput {
  norail: boolean;
  openEnd: boolean;
  query: Query;
  expectedYmd: string | null;
  expectedPassed: boolean;
  nudgeYmd: string | null;
  moveLabel?: string;
  terminal: boolean;
}

/**
 * What a stretch says.
 *
 * ⚠️ IT REPORTS AND DOES NOT JUDGE. No adverb, no escalation, and never the word this pack forbids
 * outright — a duration is a fact, lateness is a verdict, and an agent has not broken a promise by
 * being slow. `Next reminder due {date}` is the one forward-looking clause and it names something
 * the WRITER set.
 */
export interface BarLabel {
  /** what the stretch is; "" where the bar has nothing true to add to the row's own sentence */
  text: string;
  /** the date, drawn at the bar's RIGHT end so a run of bars line their dates up */
  when: string;
}

export function labelFor(side: Side, i: LabelInput): BarLabel {
  if (i.terminal) return { text: "Closed", when: "" };
  if (side === "theirs") {
    if (i.norail) return { text: "No reply time given", when: "" };
    /* ⚠️ THE BAR ALWAYS RUNS TO THE NEXT THING DUE. After a nudge the clock restarts, so the
       stretch is not waiting on the agent in general — it is waiting until the reminder the
       writer set. */
    if (i.nudgeYmd) return { text: "Reminder", when: shortCalDate(i.nudgeYmd) };
    if (i.expectedYmd && !i.expectedPassed) return { text: "Reply by", when: shortCalDate(i.expectedYmd) };
    /**
     * ⚠️ NOTHING, AND THAT IS THE HONEST ANSWER. This was "Reply window" — a phrase from the
     * derivation rather than from the writer, naming a window that has closed with nothing in it.
     * The row's head says what is true here ("No word in 40 days"); the bar repeating it in the
     * code's own vocabulary added a second, worse description of one fact.
     */
    return { text: "", when: "" };
  }
  if (i.openEnd) {
    return i.query.status === QueryStatus.OFFER
      ? { text: "Offer to answer — no date set", when: "" }
      : { text: "Revise and resubmit — no date set", when: "" };
  }
  /* ⚠️ THE CARD'S OWN WORDS, BARE. They were prefixed "Your move · ", which is how this codebase
     talks to itself and not how a writer talks about their own submission. */
  return { text: i.moveLabel ?? "", when: "" };
}

/** Which activities wrote a status — the join the side derivation needs, built once per render. */
export function statusIndex(activities: readonly Activity[]): Map<string, QueryStatus> {
  const m = new Map<string, QueryStatus>();
  for (const a of activities) {
    if (a.id && a.resultingStatus) m.set(a.id, a.resultingStatus as QueryStatus);
  }
  return m;
}
