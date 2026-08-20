/**
 * queryAmbient — the ONE derivation of a query's open-state numbers (days waiting, expected
 * reply, days since the agent's request). Both the reading-pane Tracking block and the command
 * bar consume this, so the two can never disagree (ref queries-workspace-v2.html: the bar's
 * ambient status reads the same state the CTA engine reads — computed once, here).
 *
 * Whose turn it is (ballHolder + markKind) still comes from getPrimaryAction (the CTA engine,
 * Queries.tsx) and is PASSED IN — this module never re-derives it. Pure + unit-tested.
 */

import { Query, QueryStatus } from "../types";
/* the CTA engine — the consequence line promises what the ROW will offer, so it must ask the same
   function the row asks rather than restating the map */
import { elapsedPhrase } from "./elapsed";
/* §1 (provenance pack) — the writer's own date, read through the one accessor that knows the field. */
import { writerExpectedMs, resolveExpectedDate, type ExpectedSource } from "./expectedDate";
import { replyStatedWindow, waitAnchor, waitAnchorMs, HOLDING_REPLY_TYPE, type StoredHoldingReply } from "./holdingReply";
import { getPrimaryAction } from "./queryPrimaryAction";
/* ⚠️ THE CANONICAL "an agent replied" SET, imported from its owner rather than restated. It is the
   same five rungs `recomputeQuery` derives `hasAgentResponded` from, so the place line and the
   stored flag cannot disagree about what counts as a reply. */
import { AGENT_RESPONSE_STATUSES, normalizeResultingStatus } from "./queryDerivation";
import { isRequestStatus } from "./timelineChapters";

/**
 * Filter-bar STATUS bucket — the derived state the CTA engine (getPrimaryAction, Queries.tsx)
 * distinguishes, as a pure status→bucket map: Waiting = agent's court, Your move = writer owes
 * materials, Closed = terminal. Kept in step with getPrimaryAction's ball-holder switch.
 */
export type QueryBucket = "waiting" | "move" | "closed";
export function queryBucket(status: QueryStatus): QueryBucket {
  switch (status) {
    case QueryStatus.PARTIAL_REQUESTED:
    case QueryStatus.FULL_REQUESTED:
    case QueryStatus.REVISE_RESUBMIT:
      return "move";
    case QueryStatus.QUERIED:
    case QueryStatus.PARTIAL_SENT:
    case QueryStatus.FULL_SENT:
      return "waiting";
    default:
      return "closed";
  }
}

/**
 * Masthead pulse line — `Tracking {scope} · {n} queries · {m} awaiting your move`. `m` reuses
 * the CTA engine's writer's-turn bucket (`queryBucket === "move"`), never a fresh count, so the
 * masthead and the filter bar's "Your move" pill can't disagree. Pure; the slab uppercases it.
 */
export function queriesPulse(queries: Pick<Query, "status">[], scope: string): string {
  const n = queries.length;
  const m = queries.filter((q) => queryBucket(q.status as QueryStatus) === "move").length;
  return `Tracking ${scope} · ${n} ${n === 1 ? "query" : "queries"} · ${m} awaiting your move`;
}

/**
 * The masthead's two facts: how many queries, and how many are waiting on an agent.
 *
 * ⚠️ IT COMPOSES `queryBucket`, IT DOES NOT RE-DERIVE. "Awaiting reply" is the `waiting` bucket —
 * the agent has the ball — which is the SAME split `getPrimaryAction` draws and the filter bar's
 * pills use. A second rule for "waiting" here would be a second answer to whose turn it is, and
 * this page has three surfaces that would then be free to disagree.
 *
 * ⚠️ IT REPLACES A SUBTITLE, NOT A COUNT. What stood here described the page to someone already
 * standing on it; these are facts they cannot get by looking.
 *
 * ⚠️ AND `awaiting reply` IS NOT `awaiting your move`. `queriesPulse` states the other side of the
 * same split — what the WRITER owes. Both read one function; neither restates the membership.
 */
export function queriesMastheadCounts(queries: Pick<Query, "status">[]): string {
  const n = queries.length;
  const waiting = queries.filter((q) => queryBucket(q.status as QueryStatus) === "waiting").length;
  const head = `${n} ${n === 1 ? "query" : "queries"}`;
  /* ⚠️ THE CLAUSE IS OMITTED, NEVER ZERO-FILLED. "0 awaiting reply" is a sentence about nothing;
     with none outstanding the count of queries is the whole fact. */
  return waiting > 0 ? `${head} · ${waiting} awaiting reply` : head;
}

export const DAY = 86400000;
/** Stage response windows in WEEKS (not per-agent) — expected reply = send date + window. */
export const STAGE_RESPONSE_WINDOWS = { query: 8, partial: 12, full: 12 } as const;
type SendStage = keyof typeof STAGE_RESPONSE_WINDOWS;

export type BallHolder = "writer" | "agent" | null;
export type MarkKind = "partial" | "full" | "resubmit" | undefined;

const getTime = (val: any): number => {
  if (val == null) return NaN;
  if (typeof val === "object" && typeof val.toDate === "function") return val.toDate().getTime();
  if (typeof val === "object" && "seconds" in val) return val.seconds * 1000;
  return new Date(val).getTime();
};

const fmtShort = (ms: number | null): string => {
  if (ms == null || Number.isNaN(ms)) return "";
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
};

export interface AmbientStatus {
  mode: "waiting" | "writer" | "closed";
  /** Waiting: days since the relevant send. */
  nDays: number;
  sentMs: number | null;
  expMs: number | null;
  /** 0–100 progress toward the expected-reply date. */
  widthPct: number;
  overdue: boolean;
  /** Days elapsed BEYOND the expected-reply date (0 within window). Derived; no stored field. */
  daysOverdue: number;
  /** Writer: what's owed ("partial" | "full" | "resubmission"). */
  sendWhat: "partial" | "full" | "resubmission";
  /** Writer: the agent's request in words ("partial requested" etc.). */
  eventLabel: string;
  /** Writer: days since that request (null when undated). */
  writerDaysAgo: number | null;
  /**
   * Is `expMs` a WINDOW SOMEONE STATED, or the house assumption?
   *
   * ⚠️ `expMs` IS ALMOST NEVER NULL, WHICH IS WHY THIS EXISTS. When nobody has stated a response
   * time this derivation still produces an expected date from `STAGE_RESPONSE_WINDOWS` (8/12/12
   * weeks) so the numbers have an anchor — and every surface that drew a bar or printed "expected
   * by ~" off it was presenting the house guess as something the agency said. True when the AGENT
   * states a window, or when the writer set an expected date themselves (`responseDeadline`); false
   * when the figure is the assumption.
   *
   * ⚠️ IT IS NOW DERIVED FROM `windowSource` rather than set beside it, so the two cannot disagree.
   */
  windowStated: boolean;
  /**
   * ══ WHOSE WINDOW IS IT ═══════════════════════════════════════════════════════════════════════
   *
   * ⚠️ `windowStated` COLLAPSED TWO DIFFERENT FACTS INTO ONE BOOLEAN, and that is the whole fault.
   * A window reaches this card from three places and they belong to three different people:
   *
   *   `"agent"`  the agency's own `responseTimeWeeks` — THEIR claim, and nameable as such
   *   `"writer"` a date the writer set themselves (`responseDeadline`) — YOUR estimate
   *   `null`     the house 8/12/12-week default — nobody's, and it may say nothing at all
   *
   * With one flag for the first two, a date the WRITER typed rendered as though the agency had
   * stated it — beside a body line correctly reporting that they had not. Both sentences were
   * true; the attribution was invented, and nothing in the data said which was which.
   *
   * ⚠️ THE PREVIOUS PACK REMOVED THE HOUSE ASSUMPTION FROM EVERY READER. This is a level above
   * that: the assumption was already excluded, and the remaining two were still one thing.
   */
  /* ⚠️ §1 · `reply` JOINS THE SET (D4). A window an agent stated IN A REPLY is theirs, about this
     manuscript, on that day — not the agency's standing policy, which is why it is a fourth value
     rather than being folded into `agent`. */
  windowSource: ExpectedSource;
  /**
   * ⚠️ §3a · WHAT THE ANCHOR IS, so the bar's start label can name it. It read "SENT 18 AUG" where
   * 18 August was the date the AGENT replied — the arithmetic right, the word wrong. Derived with
   * the instant rather than beside it, because a label and a figure computed separately are free to
   * describe different events.
   */
  anchorKind: "send" | "reply";
}

/** Derive the open-state numbers for a query, given the CTA engine's ball-holder + markKind. */
/**
 * ⚠️ `windowWeeks` IS ADDITIVE AND OPT-IN, AND IT EXISTS BECAUSE THIS PAGE HAD TWO CLOCKS.
 *
 * `STAGE_RESPONSE_WINDOWS` (8/12/12 weeks) is a house assumption for when nobody has stated
 * anything. The AGENT's own `responseTimeWeeks` is a fact, and it is what `taskPrecedence` — and so
 * the to-do task, the Nudge button and Query Centre's OVERDUE group — has always read. With the
 * list stating a position derived from the agent's window and this pane stating "reply expected by"
 * derived from the house one, the two halves of one screen disagreed about the same query: an agent
 * stating four weeks produced a list row counting to week 4 and a pane counting to week 8.
 *
 * Passing it makes the caller read the stated fact and fall back to the house assumption only when
 * there is none. Omitting it is byte-identical to the previous behaviour, which is why the to-do
 * surfaces are untouched by this — their divergence from the agent's window is REPORTED, not
 * silently changed underneath them.
 */
/**
 * §3 — when the agent last ASKED for something, from the log.
 *
 * ⚠️ LOCAL, AND DELIBERATELY NOT BESIDE `waitAnchor`. That one composes a send with a holding reply
 * and lives with the holding-reply model; this is a different fact with one consumer, and moving it
 * into that module would file "when did they ask" under "a reply that decides nothing".
 */
function lastRequestMs(events: readonly StoredHoldingReply[] | null | undefined): number | null {
  const times = (events || [])
    .map((e) => ({ s: normalizeResultingStatus((e as { type?: unknown }).type), t: new Date(String((e as { createdAt?: unknown }).createdAt ?? "")).getTime() }))
    .filter((e) => e.s !== null && isRequestStatus(e.s) && !Number.isNaN(e.t))
    .map((e) => e.t);
  return times.length ? Math.max(...times) : null;
}

export function queryAmbientStatus(
  query: Query,
  ballHolder: BallHolder,
  markKind: MarkKind,
  now: number = Date.now(),
  windowWeeks?: number,
  /**
   * ⚠️ PHASE 2 · THE QUERY'S OWN ACTIVITY EVENTS, additive and opt-in. Omitting them is
   * byte-identical to the previous behaviour, which is what lets the surfaces that do not yet read
   * holding replies stay untouched rather than being changed underneath them.
   */
  events?: readonly StoredHoldingReply[] | null,
): AmbientStatus {
  const base: AmbientStatus = {
    mode: "closed", nDays: 0, sentMs: null, expMs: null, widthPct: 0, overdue: false, daysOverdue: 0,
    sendWhat: "resubmission", eventLabel: "", writerDaysAgo: null, windowStated: false, windowSource: null, anchorKind: "send",
  };

  if (ballHolder === "agent") {
    const st = query.status as QueryStatus;
    const stage: SendStage = st === QueryStatus.QUERIED ? "query" : st === QueryStatus.PARTIAL_SENT ? "partial" : "full";
    const sendIso = st === QueryStatus.QUERIED ? query.dateSent : st === QueryStatus.PARTIAL_SENT ? query.partialSentDate : query.fullSentDate;
    const mDays = (windowWeeks && windowWeeks > 0 ? windowWeeks : STAGE_RESPONSE_WINDOWS[stage]) * 7;
    /**
     * ⚠️ PHASE 2 · THE CLOCK RE-BASES ON THE LATER OF THE SEND AND THEIR LAST HOLDING REPLY.
     *
     * That is the whole of what a holding reply DOES to this card. You are not waiting on a
     * two-year silence any more; you are waiting on the four days since they wrote. The meta
     * figure and the bar re-base together because both read `sentMs`, which is now the anchor
     * rather than the send — one value, so they cannot come to disagree.
     *
     * ⚠️ AND THE LIST DELIBERATELY DOES NOT (D2). It measures from the last outbound send and
     * answers "how long has this been going"; this card answers "what am I waiting on now". Both
     * true, and the visible difference between them is the point, not a bug to reconcile.
     */
    /**
     * ⚠️ §1b · THE ANCHOR IS THE LOG'S, AND THE STATUS-KEYED FIELD IS ONLY A FALLBACK.
     *
     * `sendIso` above picks ONE of three derived date fields by status, so a query at Partial Sent
     * whose `partialSentDate` had not been derived read as having no send date at all — with
     * `dateSent` on the record and both rungs drawn on the card directly above. Those fields are
     * `recomputeQuery`'s OUTPUT; the log is its input, and the input is what always exists.
     *
     * ⚠️ THE FIELD STAYS AS THE FALLBACK BECAUSE `events` IS OPTIONAL. Callers that pass no log get
     * exactly their previous behaviour, which is what keeps this additive.
     */
    const rawSentMs = sendIso ? getTime(sendIso) : NaN;
    const anchor = waitAnchor(events, Number.isNaN(rawSentMs) ? null : rawSentMs);
    const sentMs = anchor ? anchor.ms : NaN;
    if (!Number.isNaN(sentMs) && sentMs != null) {
      const nDays = Math.max(0, Math.floor((now - sentMs) / DAY));
      /**
       * ⚠️ THE WRITER'S DATE IS NOW ITS OWN STORED FIELD AND WINS OUTRIGHT (provenance pack §1).
       * It used to be inferred from `responseDeadline`, which `addQuery` seeded from the AGENT's
       * window — so a stored date was never evidence the writer typed one, and the test had to be
       * "the agency states nothing now, so this cannot be theirs". `writerExpectedDate` is written
       * only by the writer's control, so a value there IS the writer's, and an explicit override
       * outranks the window it was entered to replace.
       *
       * ⚠️ AND THE AGENCY'S WINDOW IS DERIVED FROM THE WEEKS THEY STATE TODAY, so clearing them
       * removes it from every query at once. Nothing is stored to go stale.
       *
       * The old note, kept because it records what was wrong:
       * ⚠️ THE WRITER'S OWN DATE IS HONOURED ON A DATED QUERY TOO, and it was not before. This
       * branch read the agent's weeks or the house default and never looked at `responseDeadline`
       * at all — the override was consulted only where there was no send date — so a writer who
       * answered "Set a date" on an ordinary dated query changed nothing they could see.
       *
       * ⚠️ THE AGENCY'S FIGURE STILL WINS WHERE THEY HAVE STATED ONE. It is a fact about them
       * rather than an estimate about them, and the control that sets the writer's date is offered
       * only where the agency has stated nothing — so the two rarely meet, and when they do the
       * attributable fact is the one worth drawing.
       *
       * ⚠️ KNOWN LIMIT, AND IT NEEDS A DECISION RATHER THAN A PATCH: `responseDeadline` IS NOT A
       * RECORD OF WHO SET IT. `addQuery` writes it at creation from the AGENT's window, so a stored
       * date is not evidence the writer typed one — the test below is "the agency states nothing
       * now, so this date cannot be their window", which is sound for every query the app can
       * currently create (with no stated weeks `computeResponseDeadline` produces an invalid date,
       * so such a query is never born carrying one) and unsound for exactly one history: an agent
       * who stated weeks and later had them cleared. `computeAgentDeadlineWrites` is deliberately
       * non-destructive on a clear — "Not set → no writes" — so those queries keep a deadline
       * derived from a window that no longer exists, and it would read here as the writer's.
       *
       * That fix is this section: the field exists, and the reasoning above is history.
       */
      /* ⚠️ F2 · THE PRECEDENCE IS `resolveExpectedDate`'S, NOT A SECOND COPY OF IT. This block used
         to compose it inline, so Fortnight — wanting the same answer — read a stored field instead
         and the two surfaces disagreed about the same query. One resolver, and the house 8/12/12
         fallback stays HERE because it is this surface's own: it anchors a bar and is attributed to
         nobody, which is exactly why the resolver refuses to return it. */
      /* ⚠️ THE REPLY-STATED WINDOW IS A DATED STATEMENT, and the resolver decides recency (D4).
         It is derived from the events here rather than being passed pre-computed, so a caller
         cannot hand this function a window from somewhere else. */
      const resolved = resolveExpectedDate(query, sentMs, windowWeeks, replyStatedWindow(events));
      const expMs = resolved.ms ?? sentMs + mDays * DAY;
      const span = Math.max(1, expMs - sentMs);
      return {
        ...base, mode: "waiting", nDays, sentMs, expMs,
        widthPct: Math.max(0, Math.min(1, (now - sentMs) / span)) * 100,
        overdue: now > expMs,
        daysOverdue: Math.max(0, Math.floor((now - expMs) / DAY)),
        windowStated: resolved.source !== null,
        windowSource: resolved.source,
        /* §3a — what the anchor IS, so the label can name the event rather than assume a send. */
        anchorKind: anchor?.kind ?? "send",
      };
    }
    // P4 — no stage send date to derive from: fall back to the stored responseDeadline OVERRIDE (a
    // legitimate user input — "Set an expected date"). Drives the readout's overdue/expected; without
    // a send anchor there is still no progress bar (sentMs null).
    /* ⚠️ THE WRITER'S FIELD, NOT `responseDeadline` — on an undated query the stored deadline could
       still be an import's, and this branch has always meant "the writer typed a date themselves". */
    /* an undated import: no send to anchor to, but a holding reply is still a statement */
    const undatedResolved = resolveExpectedDate(query, null, undefined, replyStatedWindow(events));
    if (undatedResolved.ms != null) {
      return { ...base, mode: "waiting", sentMs: waitAnchorMs(null, events), expMs: undatedResolved.ms,
        overdue: now > undatedResolved.ms, daysOverdue: Math.max(0, Math.floor((now - undatedResolved.ms) / DAY)),
        windowStated: true, windowSource: undatedResolved.source };
    }
    const overrideMs = writerExpectedMs(query);
    if (overrideMs != null) {
      return { ...base, mode: "waiting", sentMs: null, expMs: overrideMs, overdue: now > overrideMs, daysOverdue: Math.max(0, Math.floor((now - overrideMs) / DAY)), windowStated: true, windowSource: "writer" };
    }
    // Undated import, no override — the pill reads "waiting" but there is no bar/date.
    return { ...base, mode: "waiting", sentMs: null, expMs: null };
  }

  if (ballHolder === "writer") {
    const sendWhat = markKind === "partial" ? "partial" : markKind === "full" ? "full" : "resubmission";
    const st = query.status as QueryStatus;
    const eventLabel = st === QueryStatus.PARTIAL_REQUESTED ? "partial requested"
      : st === QueryStatus.FULL_REQUESTED ? "full requested"
      : "revise & resubmit";
    /**
     * ⚠️ §3 · THE SAME STATUS-KEYED FAULT AS THE SEND ANCHOR, ON THIS FUNCTION'S OTHER BRANCH.
     *
     * This picked `partialRequestedDate` or `fullRequestedDate` by status with NO fallback, and both
     * are `recomputeQuery`'s output — so a query at Partial Requested whose stage date had not been
     * derived produced `writerDaysAgo: null` and the card lost "N days ago" entirely. Measured
     * before changing it. The R&R branch already fell back through `lastStatusChange`, which is why
     * only two of the three could go blank.
     *
     * ⚠️ REQUESTS COME FROM `isRequestStatus`, THE CTA ENGINE'S ANSWER — "a status whose primary
     * action is mark-sent" — the mirror of the `isSendStatus` the send anchor reads. Neither is a
     * list of statuses written out here, so a new request stage joins both for free.
     *
     * ⚠️ THE FIELD REMAINS THE FALLBACK because `events` is optional: a caller that passes no log
     * behaves exactly as before, which is what keeps this additive.
     */
    const reqFromLog = lastRequestMs(events);
    const reqIso = st === QueryStatus.PARTIAL_REQUESTED ? query.partialRequestedDate
      : st === QueryStatus.FULL_REQUESTED ? query.fullRequestedDate
      : (query.lastStatusChange ?? query.dateSent);
    const reqMs = reqFromLog ?? (reqIso ? getTime(reqIso) : NaN);
    const writerDaysAgo = Number.isNaN(reqMs) ? null : Math.max(0, Math.floor((now - reqMs) / DAY));
    return { ...base, mode: "writer", sendWhat, eventLabel, writerDaysAgo };
  }

  return base;
}

// ── Escalation state machine (grace/overdue) — derived, never stored (no isGrace/isCalm flag). ──

export type Escalation = "within" | "overdue" | "grace";

export interface EscalationInput {
  /** Query.nudgeDate — the follow-up reminder (check-back) date the last nudge set. */
  reminderMs: number | null;
  /** Query.lastNudgeSentDate — when the last nudge actually fired. */
  lastNudgeMs: number | null;
  now: number;
}

/**
 * The Tracking readout's escalation for an agent-waiting query:
 *  - within  — inside the response window (calm; unchanged).
 *  - overdue — past expected-by AND (never nudged since it lapsed, OR the latest nudge's reminder
 *              has itself lapsed). The loud treatment.
 *  - grace   — past expected-by, a nudge fired SINCE it lapsed, and that nudge's follow-up reminder
 *              is still in the FUTURE — a horizon to wait on, so the escalation stands down (warm).
 *
 * A nudge with no future reminder grants no grace (nothing to wait on). All live-derived from
 * expected-by, now, the latest nudge + its reminder — no stored flag; a nudge never moves this via
 * status/response (it doesn't touch the overdue clock, which reads dateSent + window).
 */
export function deriveEscalation(a: AmbientStatus, input: EscalationInput): Escalation {
  if (a.mode !== "waiting" || !a.overdue) return "within";
  const { reminderMs, lastNudgeMs, now } = input;
  const nudgedSinceExpected = lastNudgeMs != null && a.expMs != null && lastNudgeMs >= a.expMs;
  const reminderFuture = reminderMs != null && reminderMs > now;
  return nudgedSinceExpected && reminderFuture ? "grace" : "overdue";
}

export interface TrackingBar {
  /** Elapsed-position fill, 0–100. */
  fillPct: number;
  /** Expected-by marker position, or null when the bar END is the expected date (within-window). */
  markerPct: number | null;
  /** Whether a hatch/overdue zone renders beyond the marker (overdue only). */
  overdueZone: boolean;
  /** Grace only: a faded tick where the ORIGINAL expected lapsed (bar end = the reminder horizon). */
  graceTickPct: number | null;
}

/**
 * Derived bar geometry — no magic percentages. within: 0→expected, fill = elapsed/window, no marker.
 * overdue: 0→now, expected marker at window/(window+daysPast), hatch beyond. grace: 0→reminder
 * (the new horizon), faded tick where expected lapsed. Undated → an empty (hidden) bar.
 */
export function trackingBar(state: Escalation, a: AmbientStatus, reminderMs: number | null, now: number): TrackingBar {
  const empty: TrackingBar = { fillPct: 0, markerPct: null, overdueZone: false, graceTickPct: null };
  if (a.sentMs == null || a.expMs == null) return empty;
  const windowMs = a.expMs - a.sentMs;
  if (windowMs <= 0) return empty;
  const pct = (n: number) => Math.max(0, Math.min(100, n * 100));

  if (state === "grace" && reminderMs != null && reminderMs > a.sentMs) {
    const span = reminderMs - a.sentMs;
    return {
      fillPct: pct((now - a.sentMs) / span),
      markerPct: null,
      overdueZone: false,
      graceTickPct: pct(windowMs / span), // original expected, faded
    };
  }
  if (state === "overdue") {
    const span = Math.max(now - a.sentMs, windowMs); // sent→now
    return { fillPct: 100, markerPct: pct(windowMs / span), overdueZone: true, graceTickPct: null };
  }
  // within — the bar IS the window; the end is the expected date, so no mid-bar marker.
  return { fillPct: pct((now - a.sentMs) / windowMs), markerPct: null, overdueZone: false, graceTickPct: null };
}

/** Count the nudge activities in the per-query log (drives the re-escalation "nudged N×" copy). */
export function nudgeCount(events: { type?: unknown }[] | null | undefined, nudgeType: string): number {
  return (events || []).filter((e) => e.type === nudgeType).length;
}

// ── Suggested fork action (the single pulsing chip) — derived, never stored. ─────────────────────

/**
 * "Hugely overdue" threshold, in ONE clearly-named place so it's tunable without hunting: overdue by
 * more than HUGELY_OVERDUE_WINDOW_MULT× the agent's stated response window, floored at
 * HUGELY_OVERDUE_FLOOR_WEEKS so a tiny or unstated window doesn't flip a query to "close" prematurely.
 */
export const HUGELY_OVERDUE_WINDOW_MULT = 3;
export const HUGELY_OVERDUE_FLOOR_WEEKS = 12;

/**
 * True when a waiting query is "hugely" overdue — more than max(mult × window, floor) weeks BEYOND its
 * expected reply. `agentWindowWeeks` is the per-agent `responseTimeWeeks` (readable per query); when
 * absent or tiny the floor guards, so agents with no stated window fall back to the 12-week floor.
 */
export function isHugelyOverdue(daysOverdue: number, agentWindowWeeks: number | null | undefined): boolean {
  const weeks = agentWindowWeeks && agentWindowWeeks > 0
    ? Math.max(HUGELY_OVERDUE_WINDOW_MULT * agentWindowWeeks, HUGELY_OVERDUE_FLOOR_WEEKS)
    : HUGELY_OVERDUE_FLOOR_WEEKS;
  return daysOverdue > weeks * 7;
}

export type SuggestedAction = "nudge" | "close" | null;

/**
 * The ONE fork chip that pulses, chosen by rule (nothing stored):
 *  - overdue, not hugely overdue → "nudge" (chase it).
 *  - overdue AND hugely overdue → "close" (time to let go).
 *  - grace (nudged, reminder ahead) → null (you're waiting on the agent).
 *  - within window → null.
 */
export function suggestedAction(escal: Escalation, daysOverdue: number, agentWindowWeeks: number | null | undefined): SuggestedAction {
  if (escal !== "overdue") return null;
  return isHugelyOverdue(daysOverdue, agentWindowWeeks) ? "close" : "nudge";
}

/**
 * TWS P4 — the ONE elapsed-time label, applied to every elapsed value on the Tracking pane (overdue
 * badge, "waiting {n}", "asked {n} ago"): ≤28 days → "{n} days"; beyond → "{round(n/7)} weeks".
 * (Large values yield large week counts — acceptable per spec; a months tier is a future option.)
 */
export function elapsedLabel(days: number): string {
  const n = Math.max(0, Math.round(days));
  if (n <= 28) return `${n} ${n === 1 ? "day" : "days"}`;
  const w = Math.round(n / 7);
  return `${w} ${w === 1 ? "week" : "weeks"}`;
}

/** Command-bar centre text — mono uppercase; `bold` is the burgundy fragment (writer's move). */
export function commandBarStatus(a: AmbientStatus): { bold?: string; text: string } | null {
  if (a.mode === "waiting") {
    if (a.sentMs == null) return { text: "Waiting to hear back" };
    const parts = [`Waiting to hear back · ${a.nDays} ${a.nDays === 1 ? "day" : "days"}`];
    /* ⚠️ §3 · `windowStated`, NOT `expMs` — the SECOND display path found reading the house
       assumption. `expMs` is derived from the 8/12/12-week fallback whenever nobody has stated a
       response time, so this printed "expected ~14 Sept" for an agency that never gave a date. */
    if (a.windowStated && a.expMs != null) parts.push(`expected ~${fmtShort(a.expMs)}`);
    return { text: parts.join(" · ") };
  }
  if (a.mode === "writer") {
    const tail = a.writerDaysAgo == null
      ? a.eventLabel
      : `${a.eventLabel} ${a.writerDaysAgo} ${a.writerDaysAgo === 1 ? "day" : "days"} ago`;
    return { bold: "Your move", text: `· ${tail}` };
  }
  return null; // closed / Offer — no ambient status
}

/**
 * The query list's head. ONE sentence carrying its own count — "21 queries" at rest, "Showing
 * 12 of 21 queries" while the list is narrowed.
 *
 * ⚠️ `narrowed` is the state of the CONTROLS, not `shown !== total`. A filter that happens to
 * match every query still reads "Showing 21 of 21 queries": the sentence describes what the
 * list is doing, and a control silently reading as "off" because its result was total is how
 * you end up staring at a filtered list that says it isn't one.
 *
 * The noun agrees with the TOTAL, which is the only number present in both forms — so a lone
 * query reads "1 query" and "Showing 1 of 1 query", never "1 queries".
 */
export function listHeadLabel(shown: number, total: number, narrowed: boolean): string {
  const noun = total === 1 ? "query" : "queries";
  return narrowed ? `Showing ${shown} of ${total} ${noun}` : `${total} ${noun}`;
}

/**
 * THE PLACE LINE (§2b) — where this act sits in the campaign, stated as fact.
 *
 * ⚠️ FACT ONLY. No adjective, no encouragement, no streak. "Your 17th query for Murphy's Day Out"
 * is a position; "your 17th — keep going" is a coach, and the app reports rather than appraises.
 * The locks assert the absence of that vocabulary, because it is the kind of copy that arrives one
 * cheerful word at a time.
 *
 * ⚠️ A MISSING FIGURE OMITS ITS CLAUSE, never prints a zero or a placeholder. "the 0th reply" and
 * "· — currently awaiting reply" are both worse than saying less.
 */
export interface PlaceLineInput {
  /** queries already logged against this manuscript, EXCLUDING the one being composed */
  priorForManuscript?: number;
  manuscriptTitle?: string;
  /** record only — agent replies already in the log for this book, EXCLUDING this query's */
  priorRepliesForManuscript?: number;
}

/**
 * ⚠️ HOW MANY REPLIES AN AGENT HAS ACTUALLY SENT FOR THIS BOOK (§4). Three things about this are
 * corrections rather than choices, and each was a way of being plausibly wrong:
 *
 * 1. IT READS `AGENT_RESPONSE_STATUSES` DIRECTLY, never `responsesReceivedCount`. That selector
 *    falls back to a legacy status set including `Partial Sent` and `Full Sent` — the WRITER'S
 *    sends. Fine for a dashboard's tolerance; wrong in a sentence, because a line that counts your
 *    own send as a response from an agent is the exact confusion this journey exists to prevent.
 *    And the fallback fires only on unmigrated imports, which is precisely when nobody would catch
 *    it.
 *
 * 2. THE UNIT IS ACTIVITIES, NOT QUERIES. A query that went partial → full → offer is THREE
 *    responses received, not one. Counting queries-with-a-reply would make the ordinal drift
 *    quietly and permanently as a campaign matured — always low, never obviously wrong.
 *
 * 3. THE QUERY BEING RECORDED IS EXCLUDED. Correct for a new record and for a correction to an
 *    existing one: without it, re-recording a reply on a query that already has one counts that
 *    query's history twice.
 *
 * ⚠️ AND SILENCE IS NOT A REPLY. `NO_RESPONSE` is absent from `AGENT_RESPONSE_STATUSES` — closing a
 * query as "no reply" cannot increment this, which is asserted rather than assumed, because it
 * holds only while that set stays honest.
 */
export function agentRepliesForManuscript(
  activities: readonly { manuscriptId?: string; queryId?: string; resultingStatus?: QueryStatus; activityType?: unknown }[],
  manuscriptId: string | undefined,
  excludeQueryId?: string,
): number | undefined {
  if (!manuscriptId) return undefined;
  return activities.filter(
    (a) =>
      a.manuscriptId === manuscriptId &&
      a.queryId !== excludeQueryId &&
      /**
       * ⚠️ §3b · A HOLDING REPLY IS A REPLY. The sentence this feeds reads "the Nth response you've
       * received", and an acknowledgement IS a response received — it is only not a DECISION. The
       * set below is `AGENT_RESPONSE_STATUSES`, which is keyed on `resultingStatus`, and a holding
       * reply carries none by construction, so it could never have been counted here.
       *
       * ⚠️ CHECKED AGAINST THE ONE CALLER FIRST, per the pack's condition. There is exactly one:
       * `recordPlaceLine`, which says "response received" and not "response that decided" — so
       * including it makes that ordinal true rather than changing what it means. No caller wanted
       * "decided", which is why this changes rather than being reported and left.
       */
      ((a.resultingStatus !== undefined && AGENT_RESPONSE_STATUSES.has(a.resultingStatus))
        || a.activityType === HOLDING_REPLY_TYPE),
  ).length;
}

/** 1st, 2nd, 3rd, 4th … — English ordinals, including the teens that break the pattern. */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

/**
 * ⚠️ ONE FACT, NOT A LIST (§4). Both lines used to join two clauses with an interpunct — the place
 * plus a running total ("· 12 currently awaiting reply", "You sent this 3 days ago · …"). The
 * header's job is to say WHERE this act sits, once; a second figure beside it turns a position into
 * a status readout, and the writer has to read both to find the one they wanted. The dropped
 * clauses are not relocated — they were context nobody asked for at the moment of composing.
 *
 * ⚠️ A MISSING FIGURE OMITS THE WHOLE LINE, never prints a zero or a placeholder. "Your 0th query"
 * and "…for undefined" are both worse than saying nothing.
 */
export function createPlaceLine(i: PlaceLineInput): string {
  if (i.priorForManuscript === undefined || !i.manuscriptTitle) return "";
  return `Your ${ordinal(i.priorForManuscript + 1)} query for ${i.manuscriptTitle}`;
}

export function recordPlaceLine(i: PlaceLineInput): string {
  if (i.priorRepliesForManuscript === undefined || !i.manuscriptTitle) return "";
  return `The ${ordinal(i.priorRepliesForManuscript + 1)} response you've received for ${i.manuscriptTitle}`;
}

/**
 * THE CONSEQUENCE LINE (§3) — what the save will do, before it happens.
 *
 * ⚠️ REPORTING, NOT COACHING. It states the outcome, whose turn it leaves, and what the row will
 * offer next. It never says what to do about it: "your turn — the row will offer Mark sent" is a
 * consequence; "your turn — remember to send it" is an instruction, and the app does not instruct.
 *
 * ⚠️ IT READS `getPrimaryAction`, THE SAME CTA ENGINE the row, the hero and the To-do flows read,
 * so the promise made here cannot differ from what the row actually offers a second later. A
 * hand-written "the row will offer …" would be a second answer to whose turn it is.
 *
 * ⚠️ AND IT HAS AN EMPTY STATE. Before an outcome is chosen there is no consequence to state, and
 * a blank bar reads as a bar that has failed to load.
 */
export function consequenceLine(next: QueryStatus | null): string {
  if (!next) return "Nothing saved yet";
  const action = getPrimaryAction(next);
  const turn = action.ballHolder === "writer" ? "your turn"
    : action.ballHolder === "agent" ? "waiting on them"
    : "closed";
  return `Saves as ${next} · ${turn} — the row will offer ${action.label}`;
}

/**
 * ══ §2 · TRACKING'S STAT CELLS — a FIXED skeleton, derived ═══════════════════════════════════
 *
 * One cell per figure, always both, or none at all. Data only: the component maps `key` to a glyph,
 * because a lib that returns JSX is a lib nobody can call from a test.
 *
 * ⚠️ IT IS PURE AND IT LIVES HERE BECAUSE THE ABSENT CASE HAS NO DATA ON DEV. The strip was built
 * inline in the card, and the browser measure that proves its SHAPE could only ever exercise the
 * records the account happens to hold — every query on dev has an expected date, so the "Not set"
 * branch measured green by never running. A pure function can be handed the state directly.
 *
 * ⚠️ AND THE INPUT IS THE REAL DERIVATION'S OUTPUT, never a literal. Callers pass what
 * `queryAmbientStatus` returned; a test that hand-writes `{ mode: "waiting", expMs: null }` is
 * testing a shape the system might not produce (the trap this repo has a rule about).
 */
export interface TrackingStatCell {
  key: "waiting" | "expected";
  value: string;
  unit?: string;
  caption: string;
  /** true when the record holds no figure — the cell states the missing FIELD, quietly. */
  absent: boolean;
}

/* ⚠️ THE STRIP SHOWS THE SCALED PHRASE (§4a), SPLIT INTO ITS FIGURE AND ITS UNIT — the cell draws
   the number large and the unit small, so the formatter's one string is divided at the space rather
   than composed a second way. `85 days` became `12 weeks`; a two-year query read `847 days`. */
const splitPhrase = (p: string): { value: string; unit?: string } => {
  const i = p.indexOf(" ");
  return i < 0 ? { value: p } : { value: p.slice(0, i), unit: p.slice(i + 1) };
};
const STAT_DAY = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric" });
const STAT_MON = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { month: "short" });

export function trackingStatCells(a: AmbientStatus): TrackingStatCell[] {
  /* ⚠️ SCOPED TO THE STATE THE FIGURES DESCRIBE. Both are about waiting on an agent, and every
     non-waiting mode returns `expMs: null` — so a skeleton on a closed or writer's-turn query
     would be two cells reading "Not set" about a wait that is not happening. A fixed shape across
     the states this strip is ABOUT is the fix; a fixed shape everywhere would be furniture. */
  if (a.mode !== "waiting") return [];
  return [
    /* ⚠️ THE ABSENT CELL NAMES THE MISSING FIELD RATHER THAN KEEPING A CAPTION THAT WOULD BE FALSE.
       "Waiting so far · Not set" says nothing; "Date sent · Not set" says what is wrong with the
       record. The SHAPE is what is fixed here — two cells, one geometry — not the words. */
    a.sentMs != null
      ? { key: "waiting", ...splitPhrase(elapsedPhrase(a.nDays)), caption: "Waiting so far", absent: false }
      : { key: "waiting", value: "Not set", caption: "Date sent", absent: true },
    /**
     * ⚠️ §4 (event-grammar pack) · ONCE THE WINDOW HAS PASSED THE CAPTION IS `Window expired`, and
     * that is a correctness fix rather than a rename. A date in the past under "Reply expected by"
     * states an expectation that has already failed — the tile was still describing the future.
     *
     * ⚠️ AND THE WORD IS `expired`, NOT `closed`. Closing is something the WRITER does to a query
     * and records; a window running out happens to the AGENCY's own stated deadline. Sharing one
     * word made `closed 23 July` read as "the writer closed this".
     *
     * ⚠️ THE ABSENT CELL KEEPS `Reply expected by`, because there is no window to have expired —
     * what is missing is the expectation itself, which is what that caption names.
     */
    a.expMs != null
      ? { key: "expected", value: STAT_DAY(a.expMs), unit: STAT_MON(a.expMs), caption: a.overdue ? "Window expired" : "Reply expected by", absent: false }
      : { key: "expected", value: "Not set", caption: "Reply expected by", absent: true },
  ];
}

/**
 * ══ §4b · THE COUNT STATES BOTH HALVES ═══════════════════════════════════════════════════════
 *
 * ⚠️ "17 AWAITING" LEFT THE OTHER HALF UNSAID, so the reader had to subtract to learn the thing
 * they actually wanted: how many have come back. `8 answered · 17 not` states both, and the two
 * are the whole set by construction rather than by two counts agreeing.
 *
 * ⚠️ THEY SUM TO THE TOTAL, INCLUDING CLOSED AND WITHDRAWN — which is why `notAnswered` is derived
 * by SUBTRACTION rather than counted. Two independent tallies is how a page comes to state a pair
 * that does not add up, and a closed query is one nobody is waiting on but which still happened.
 *
 * ⚠️ ANSWERED MEANS THE AGENT REPLIED, from the canonical set the rest of the app reads — not
 * "not waiting", which would count a query you withdrew as one they answered.
 */
export interface AnsweredSplit { answered: number; notAnswered: number; total: number }

export function answeredSplit(queries: Pick<Query, "status">[]): AnsweredSplit {
  const total = queries.length;
  const answered = queries.filter((q) => AGENT_ANSWERED.has(q.status as QueryStatus)).length;
  return { answered, notAnswered: total - answered, total };
}

/**
 * ⚠️ THE AGENT SAID SOMETHING. A request, an offer or a rejection is an answer; withdrawn is the
 * writer's own act and no-response is the absence of one, so neither counts.
 */
const AGENT_ANSWERED = new Set<QueryStatus>([
  QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT,
  QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT,
  QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.REJECTED,
]);
