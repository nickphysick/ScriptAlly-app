/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dashFeed — the dashboard's activity feed, derived (v16, 18 Sep; ref design-refs/dashboard-v16-2026-09-18.html).
 *
 * One entry per logged event in the last 30 days, newest first, grouped under day rules. Each entry
 * is a pill and a time, a sentence, a mono provenance line, and — where the record supports one — an
 * action link.
 *
 * ⚠️ MOVED HERE FROM `OneScreenRail`, WHICH IS RETIRED WITH THE CONVERSATION FEED. The derivation is
 * the one that shipped: the same subject lookup, the same sentence builder, the same three refusals
 * on the elapsed clause. What is new is the day labels, the "new since you last looked" mark, and
 * that the AGENT is a run of its own inside the sentence rather than text inside a run — the ref sets
 * the person in semibold and the manuscript in Special Elite, and a renderer cannot find either
 * inside a finished string without parsing it back out.
 *
 * ⚠️ THE SUBJECT IS LOOKED UP, NEVER PARSED OUT OF THE DESCRIPTION. `Activity` carries no `agentId`,
 * so the agent list is the authority: the longest known name or agency the description contains wins
 * ("Vane" must not claim "Vane-Coe"). A row whose subject cannot be resolved is DROPPED rather than
 * rendered with a hole in it.
 *
 * ⚠️ THERE IS NO APP-GENERATED EVENT IN THIS APP, AND THE FEED DOES NOT PRETEND OTHERWISE. The ref
 * draws "Housekeeping" and "Scout" rows bylined QueryHawk; nothing writes an activity except the
 * writer's own act, so the stone pill and the muted treatment go to the rows that are not about a
 * query — an agent added, a manuscript updated — and no row claims the app did something it did not.
 */
import { MONTHS_SHORT } from "./dates";
import { EVENT_LABEL, isEventKey } from "./queryActions/eventKeys";
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus } from "../types";
import { requeryLine } from "./requery";
import { eventShape, markSentOffered } from "./feedConversation";
import { recordSpecFor } from "./todoCalendar";
import { stageSentAt } from "./dashBreakdown";
import type { State } from "./queryCardFacts";
import { isImportActivity, importSentence, importGroupLine, IMPORT_ROUTE_LABEL, type ImportCounts, type ImportRoute } from "./importEvent";
import { foldAgentBursts, houseSay, sweepSay } from "./feedHouse";
import { HOLDING_REPLY_TYPE as HOLDING_REPLY } from "./holdingReply";

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = MONTHS_SHORT;

/** How far back the feed reads. The ref's chip says so on the card: "30 days". */
export const FEED_DAYS = 30;

/** One run of a sentence. `em` marks the manuscript, `who` the person. */
export type FeedSeg = { t: string; em?: boolean; who?: boolean };

export interface FeedEntry {
  id: string;
  /** when it happened, ms */
  at: number;
  /** "1:05pm" */
  time: string;
  /** "Today" · "Yesterday" · "Wed 19 Aug" — the rule this entry sits under */
  dayLabel: string;
  /** the pill's words — the verb of the row */
  pill: string;
  /** the event's own key, where it has one (v152.1: `offer_told` has no status, so its family is read from this) */
  eventKey?: string | null;
  /** the rung this event produced, for the pill's glyph; null on a row that is not about a query */
  status: QueryStatus | null;
  /** the state whose token fills the pill; null on a row that is not about a query */
  state: State | null;
  /** not about a query — the app's record-keeping. Stone pill, muted sentence. */
  app: boolean;
  /** the sentence, in runs */
  say: FeedSeg[];
  /** the mono line beneath it — the agency, or what was done */
  provenance: string;
  /** the underlined link at the right, where the record supports one */
  action: { label: string; queryId: string } | null;
  /**
   * A requery's explanation (clean-up pass, 28 Sep): on the row that records a query going out,
   * when an earlier, closed query to the same agent for the same book exists — its outcome and date,
   * and the id that opens it. The one check is lib/requery.
   */
  requery: { text: string; queryId: string } | null;
  /**
   * The query this entry is about, where it is about one.
   *
   * ⚠️ SEPARATE FROM `action`, BECAUSE THE ROWS THAT MOST NEED THE PEEK ARE THE ONES WITH NO ACTION.
   * `action` is present only where a send is offered — a handful of rows. Every other entry about a
   * query is still about a query, and "what is this, where is it up to" is exactly the question a
   * row with nothing to press raises. Gating the peek on `action` meant the glance was available on
   * the rows that already had a button and nowhere else.
   *
   * ⚠️ AND IT IS THE ACTIVITY'S OWN `queryId`, NOT A LOOKUP. `app` rows — the housekeeping the app
   * did for itself — carry none, which is what keeps them out of the peek without a second test.
   */
  queryId: string | null;
  /** logged since the writer last had this page open */
  isNew: boolean;
  /* ── Dashboard v58, the feed drawer ───────────────────────────────────────────────────────────
     `dir` is AUTHORSHIP: "in" is something an agent did (asked for pages, passed, offered), "out"
     is something the writer did (queried, sent, nudged, added an agent or a manuscript). It reads
     `recordSpecFor`, the calendar record's own table, so the two cannot disagree about who wrote. */
  dir: "in" | "out";
  /** the event's own type, for a surface that words the writer's housekeeping itself */
  activityType: string;
  /** the subject's name as it appears in the sentence, and the agency behind a query event */
  who: string;
  agency: string;
  /** a request (or an offer) the query still stands at: it still needs the writer */
  need: { label: string } | null;
  /** a request since answered: the day the pages went, "28 Sep" */
  met: string | null;
  /** import review v1: the import's own event (lib/importEvent) — its counts, group line and route.
   *  Absent on every other entry. */
  imported?: { counts: ImportCounts; groups: string[]; route: ImportRoute; routeLabel: string } | null;
}

export interface FeedDay {
  /** the day's own label, and what the rule reads */
  label: string;
  entries: FeedEntry[];
}

export interface FeedInput {
  activities: Activity[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  now: Date;
  /** when the writer last had the dashboard open; null on a device that has never shown it */
  seenAt: number | null;
  /** where the window starts (ms). Absent, the last `FEED_DAYS` days. */
  from?: number;
  /**
   * First visit v1 (D4), the desktop only: a query's send is dated by its SENT date, not by when it was logged, and
   * "after … without a reply" counts from that sent date. Without it a query logged today with an earlier sent date
   * sat under "Today", and a June query closed in October read "after 3 minutes without a reply" (the minutes
   * between logging and closing). The phone keeps the old reading until dashboard-mobile-v1 takes this up.
   */
  honestDates?: boolean;
}

/** The record of a query going out: the drawer's `query_sent`, or (before event keys) a rung to Queried. */
const isSendEvent = (a: Activity): boolean =>
  a.eventKey === "query_sent" || (!a.eventKey && a.resultingStatus === QueryStatus.QUERIED);

/* ── the pills ─────────────────────────────────────────────────────────────────────────────────── */

/**
 * The pill for an event: its resulting STATUS where it has one (more specific), else its type.
 * ⚠️ AN UNMAPPED TYPE RETURNS NULL AND THE ROW DROPS — a pill reading "Status changed" over a
 * sentence that says what happened is furniture, and an unlabelled event is a bug worth seeing.
 */
const STATUS_PILL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.QUERIED]: "Query sent",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit",
  [QueryStatus.RESUBMITTED]: "Resubmitted",
  [QueryStatus.OFFER]: "An offer",
  [QueryStatus.SIGNED]: "Signed",
  [QueryStatus.REJECTED]: "Passed",
  [QueryStatus.WITHDRAWN]: "Withdrawn",
  [QueryStatus.NO_RESPONSE]: "No reply",
};

const TYPE_PILL: Partial<Record<string, string>> = {
  [ActivityType.NUDGE_SENT]: "Nudge sent",
  [ActivityType.OFFER_ACCEPTED]: "Offer accepted",
  [ActivityType.OFFER_DECLINED]: "Offer declined",
  [ActivityType.AGENT_ADDED]: "Agent added",
  [ActivityType.AGENT_UPDATED]: "Agent updated",
  [ActivityType.AGENT_DELETED]: "Agent removed",
  [ActivityType.MANUSCRIPT_ADDED]: "Manuscript added",
  [ActivityType.MANUSCRIPT_UPDATED]: "Manuscript updated",
  [ActivityType.MANUSCRIPT_DELETED]: "Manuscript removed",
};

export const feedPill = (a: Pick<Activity, "activityType" | "resultingStatus"> & { eventKey?: Activity["eventKey"] }): string | null =>
  /* Query actions v1 (K5) — the structured key first; the status and the type for older rows. */
  (isEventKey(a.eventKey) ? EVENT_LABEL[a.eventKey] : undefined) ??
  (a.resultingStatus ? STATUS_PILL[a.resultingStatus] : undefined) ?? TYPE_PILL[a.activityType] ?? null;

/* ── the sentence ──────────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠️ THE ELAPSED CLAUSE IS THE ONE THING HERE THAT CAN ASSERT SOMETHING UNTRUE, so it refuses far
 * more readily than it speaks. It once said "870 days after you queried" about a full manuscript sent
 * seventy-one minutes after the query, because the anchor was a seeded `dateSent`: correct
 * arithmetic, false sentence, and nothing about it looked wrong.
 *
 * ⚠️ AND IT SPEAKS IN THE UNIT THE GAP DESERVES — an hour rounded to zero days and vanished.
 */
export const elapsedClause = (ms: number | null): string | null => {
  if (ms === null || !Number.isFinite(ms)) return null;
  if (ms < MIN) return null;                       // the same instant, to a reader
  const n = (v: number, unit: string) => `${v} ${unit}${v === 1 ? "" : "s"}`;
  if (ms < 90 * MIN) return n(Math.round(ms / MIN), "minute");
  /* 24, not 36: at 36 the singular "1 day" was unreachable */
  if (ms < 24 * HOUR) return n(Math.round(ms / HOUR), "hour");
  return n(Math.round(ms / DAY), "day");
};

/**
 * ⚠️ EVERY CLAUSE IS DERIVABLE FROM THE RECORD, AND THAT IS THE WHOLE CONSTRAINT. The ref's fixture
 * writes clauses this app cannot support — "the first 50 pages", "after reading the partial" — which
 * are facts about a submission our log does not carry. Inventing them is the copy fault this repo
 * records three times over.
 *
 * So: the SUBJECT, the VERB the status names, the OBJECT where the manuscript resolves, and one
 * optional clause — how long after the query went out.
 */
export const describeEvent = (
  status: QueryStatus | null,
  who: string,
  msTitle: string,
  /** milliseconds between the query going out and THIS event; null when it cannot be trusted */
  elapsedMs: number | null,
  /**
   * The event's own type, for the rungs that carry no status.
   *
   * ⚠️ OPTIONAL, SO EVERY EXISTING CALLER IS BYTE-IDENTICAL. A nudge has no `resultingStatus` —
   * it is not a state change — so without this the sentence was null and the row fell back to the
   * activity's STORED `description`, which is import-and-writer prose rather than the feed's voice.
   */
  activityType?: string,
  /**
   * Could this close have been the app's rather than the writer's?
   *
   * ⚠️ IT IS A POSSIBILITY, NOT A FACT, AND THAT IS WHY IT IS PHRASED THIS WAY. `db.tsx` auto-closes
   * a query whose `ifNoResponse` is "Mark as no response automatically" once its deadline passes —
   * so on such a query a `NO_RESPONSE` rung may be the app's act or the writer's, and **nothing on
   * the record distinguishes them**. The only marker is the activity's `description` string, and
   * deriving state by reading a display string is the fault this whole module is built to avoid.
   *
   * So the writer's sentence is used only where an automatic close was IMPOSSIBLE, which is a sound
   * inference; where it was possible the old sentence stands, and it is true either way. Giving the
   * activity a real field at write time is the proper fix and it needs a rules line.
   */
  autoCloseArmed?: boolean,
  /** Feed wording v1: the event's own key, for the offer declined through the drawer (`offer_declined`) */
  eventKey?: string | null,
): FeedSeg[] | null => {
  /* Feed wording v1 (one voice): no sentence ends with a full stop, none carries a dash. [X] the person, [T] the
     manuscript; where the record has no title, the sentence is the one that needs none. */
  const they: FeedSeg[] = who ? [{ t: who, who: true }] : [];
  const book: FeedSeg[] = msTitle ? [{ t: msTitle, em: true }] : [];
  const ofT: FeedSeg[] = msTitle ? [{ t: " of " }, ...book] : [];
  const forT: FeedSeg[] = msTitle ? [{ t: " for " }, ...book] : [];
  const clause = elapsedClause(elapsedMs);
  /**
   * ⚠️ THE NUDGE IS BUILT, NEVER READ OFF THE RECORD (Nick, 20 Sep). `logNudge` stores
   * "Nudge sent to {agent} at {agency}"; printing that would put a second vocabulary in a feed
   * written in one voice, and it is the writer's own act, so the subject is "You".
   */
  if (!status && activityType === ActivityType.NUDGE_SENT && who) {
    return [{ t: "You nudged " }, ...they, ...(clause ? [{ t: `, ${clause} after you queried` }] : [])];
  }
  if (!who) return null;
  /* the rows that carry no status of their own (Step 0.4): a holding reply, and the To-do board's offer accepted */
  if (!status && activityType === HOLDING_REPLY) {
    return [...they, { t: " sent a holding reply" }, ...(msTitle ? [{ t: " about " }, ...book] : [])];
  }
  if (!status && activityType === ActivityType.OFFER_ACCEPTED) {
    return [{ t: "You accepted the offer from " }, ...they, ...forT];
  }
  if (!status) return null;
  /* see `autoCloseArmed` — "you closed it" only where the app could not have */
  const byWriter = !autoCloseArmed;
  const to: FeedSeg[] = [{ t: " to " }, ...they];
  let head: FeedSeg[] | null = null;
  /* an offer declined is recorded as a withdrawal; the feed says what the writer did */
  const declined = activityType === ActivityType.OFFER_DECLINED || eventKey === "offer_declined";
  switch (status) {
    case QueryStatus.QUERIED:
      head = msTitle ? [{ t: "You sent your query for " }, ...book, ...to] : [{ t: "You queried " }, ...they];
      break;
    case QueryStatus.PARTIAL_REQUESTED:
      head = [...they, { t: " asked for a partial" }, ...ofT];
      break;
    case QueryStatus.PARTIAL_SENT:
      head = [{ t: "You sent the partial" }, ...ofT, ...to];
      break;
    case QueryStatus.FULL_REQUESTED:
      head = [...they, { t: " asked for the full manuscript" }, ...ofT];
      break;
    case QueryStatus.FULL_SENT:
      head = [{ t: "You sent the full manuscript" }, ...ofT, ...to];
      break;
    case QueryStatus.REVISE_RESUBMIT:
      head = [...they, { t: " asked you to revise and resubmit" }, ...(msTitle ? [{ t: " " }, ...book] : [])];
      break;
    case QueryStatus.RESUBMITTED:
      head = [{ t: "You sent the revised manuscript" }, ...ofT, ...to];
      break;
    case QueryStatus.OFFER:
      head = [...they, { t: " offered to represent " }, ...(msTitle ? book : [{ t: "you" }])];
      break;
    case QueryStatus.SIGNED:
      head = [{ t: "You accepted the offer from " }, ...they, ...forT];
      break;
    case QueryStatus.REJECTED:
      head = [...they, { t: " passed" }, ...(msTitle ? [{ t: " on " }, ...book] : [])];
      break;
    case QueryStatus.WITHDRAWN:
      head = declined
        ? [{ t: "You declined the offer from " }, ...they, ...forT]
        : [{ t: "You withdrew your query" }, ...forT, { t: " from " }, ...they];
      break;
    /**
     * ⚠️ THE SUBJECT IS THE WRITER, BECAUSE CLOSING IS THE WRITER'S ACT (Nick, 20 Sep) — and the
     * feed is written in their voice throughout. It names what the writer did, never what the agent
     * did not do: "without a reply" is a fact about the record.
     *
     * ⚠️ AND WHERE THE APP COULD HAVE CLOSED IT, THE SENTENCE HAS NO SUBJECT TO GET WRONG: "Your query
     * … closed without a reply" is true whichever of the two closed it.
     */
    case QueryStatus.NO_RESPONSE:
      if (byWriter) {
        return [{ t: "You closed your query" }, ...to, ...forT, { t: clause ? ` after ${clause} without a reply` : " without a reply" }];
      }
      head = [{ t: "Your query" }, ...to, ...forT, { t: " closed without a reply" }];
      break;
    default:
      return null;
  }
  if (clause && status !== QueryStatus.QUERIED) head.push({ t: `, ${clause} after you queried` });
  return head;
};

/** The whole sentence, as a reader would copy it — the accessible name, and what a test reads. */
export const sayText = (say: readonly FeedSeg[]): string => say.map((s) => s.t).join("");

/* ── the anchors ───────────────────────────────────────────────────────────────────────────────── */

/** the query's own QUERIED activity, by queryId — the log's answer to "when did this go out" */
export const queriedTimes = (activities: readonly Activity[]): Map<string, number> => {
  const out = new Map<string, number>();
  for (const a of activities) {
    if (a.resultingStatus !== QueryStatus.QUERIED || !a.queryId) continue;
    const t = new Date(a.date).getTime();
    if (!Number.isFinite(t)) continue;
    /* the EARLIEST such event: a resubmission can write a second one */
    const seen = out.get(a.queryId);
    if (seen === undefined || t < seen) out.set(a.queryId, t);
  }
  return out;
};

const querySentAt = (queryId: string, fromLog: Map<string, number>, q?: Query): number | null => {
  const logged = fromLog.get(queryId);
  if (logged !== undefined) return logged;
  const stored = q?.dateSent ? new Date(q.dateSent).getTime() : NaN;
  return Number.isFinite(stored) ? stored : null;
};

/**
 * ⚠️ AN ELAPSED THE RECORD CANNOT SUPPORT IS `null`, NOT A NUMBER. Negative means the event predates
 * the query it belongs to; longer than the query has existed means the anchor is not a send date at
 * all. Both are contradictions in the record rather than facts about the writer's querying.
 */
export const trustedElapsed = (anchor: number | null, eventAt: number, nowAt: number): number | null => {
  if (anchor === null || !Number.isFinite(anchor) || !Number.isFinite(eventAt)) return null;
  const elapsed = eventAt - anchor;
  if (elapsed < 0) return null;
  const queryAge = nowAt - anchor;
  if (queryAge < 0 || elapsed > queryAge) return null;
  return elapsed;
};

/* ── the rows ──────────────────────────────────────────────────────────────────────────────────── */

/** addAgent's own id for its Added row (`act-added-agent-{agentId}`) — the one row the live list may name. */
const ADDED_AGENT_ID = "act-added-agent-";

const AGENT_TYPES = new Set<string>([ActivityType.AGENT_ADDED, ActivityType.AGENT_UPDATED, ActivityType.AGENT_DELETED]);
const MS_TYPES = new Set<string>([ActivityType.MANUSCRIPT_ADDED, ActivityType.MANUSCRIPT_UPDATED, ActivityType.MANUSCRIPT_DELETED]);

/** What the agent-event provenance line says, since the pill is already the verb. */
const agentEventContext = (t: string): string =>
  t === ActivityType.AGENT_ADDED ? "added to your list"
    : t === ActivityType.AGENT_DELETED ? "removed from your list"
      : "details updated";

/**
 * ⚠️ A PROVENANCE LINE ADDS WHAT THE SENTENCE DOES NOT ALREADY SAY. `agentPrimary` falls back to the
 * AGENCY for a nameless agent, so a line that always led with the agency read "Penhallow Literary"
 * twice, two lines apart. Case- and space-insensitive, because CSS uppercases the line.
 */
export const provenanceOf = (subject: string, ...parts: (string | undefined)[]): string => {
  const norm = (v: string) => v.trim().toLowerCase();
  return parts
    .map((p) => (p ?? "").trim())
    .filter((p) => p && norm(p) !== norm(subject))
    .join(" · ");
};

/** The feed's clock, "11:40am" — the ONE formatter for the rows and the cards (feed wording v1). */
export const feedClock = (ms: number): string =>
  new Date(ms).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase();

/** "Today" / "Yesterday" / "Wed 19 Aug" — the ref's three forms. */
export const dayLabelFor = (at: number, now: Date): string => {
  const d = new Date(at);
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((midnight(now) - midnight(d)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

/** What an open request asks of the writer — the drawer's ink action on a reply card. */
const NEED_LABEL: Partial<Record<QueryStatus, string>> = {
  [QueryStatus.PARTIAL_REQUESTED]: "Send the partial",
  [QueryStatus.FULL_REQUESTED]: "Send the full",
  [QueryStatus.REVISE_RESUBMIT]: "Send your revision",
  [QueryStatus.OFFER]: "Offer: next steps",
};

/**
 * The day a request was answered, or null. Only a send AFTER the request counts: an earlier Full
 * sent does not answer a later revise-and-resubmit.
 */
const metOn = (status: QueryStatus | null, q: Query, log: readonly Activity[], askedAt: number): string | null => {
  const stage = status === QueryStatus.PARTIAL_REQUESTED ? QueryStatus.PARTIAL_SENT
    : status === QueryStatus.FULL_REQUESTED || status === QueryStatus.REVISE_RESUBMIT ? QueryStatus.FULL_SENT
      : null;
  if (!stage) return null;
  const sent = stageSentAt(q, stage, log).ms;
  if (sent === null || sent < askedAt) return null;
  const d = new Date(sent);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const feedEntries = (i: FeedInput): FeedEntry[] => {
  const nowMs = i.now.getTime();
  const from = i.from ?? nowMs - FEED_DAYS * DAY;
  /* built over the WHOLE activity list, not the window: a query sent two months ago still anchors an
     event from last week, and windowing the anchor loses the elapsed clause on every older query */
  const queriedAt = queriedTimes(i.activities);
  const out: FeedEntry[] = [];
  /* honest dates (D4): a send is when it was sent; everything else is when it was recorded */
  const sentOf = (q: Query | undefined): number | null => {
    const v = q?.dateSent ? new Date(q.dateSent).getTime() : NaN;
    return Number.isFinite(v) ? v : null;
  };
  const whenOf = (x: Activity): number => {
    const logged = new Date(x.date).getTime();
    if (!i.honestDates || !isSendEvent(x) || !x.queryId) return logged;
    const sent = sentOf(i.queries.find((q) => q.id === x.queryId));
    return sent !== null && sent < logged ? sent : logged;
  };

  /* Feed wording v1: updates to one agent less than ten minutes apart read as one row (display only) */
  for (const { a, t } of foldAgentBursts(i.activities)
    .map((x) => ({ a: x, t: whenOf(x) }))
    .filter((x) => Number.isFinite(x.t) && x.t >= from && x.t <= nowMs)
    .sort((x, y) => y.t - x.t)) {
    /* THE IMPORT'S EVENT (import review v1): about a manuscript, never a query, so it has no subject
       and no status for the rows below to read. Its own branch, before the drops it would hit. */
    if (isImportActivity(a)) {
      const title = (i.manuscripts.find((m) => m.id === a.manuscriptId)?.title ?? "").trim();
      const c = a.importCounts;
      out.push({
        id: a.id, at: t,
        time: feedClock(t),
        dayLabel: dayLabelFor(t, i.now),
        pill: EVENT_LABEL.imported, status: null, state: null, app: false,
        say: importSentence(c, title), provenance: "", action: null, requery: null, queryId: null,
        isNew: i.seenAt !== null && t > i.seenAt,
        /* one "thing you did"; never "From agents" */
        dir: "out", activityType: String(a.activityType), who: title, agency: "", need: null, met: null,
        imported: { counts: c, groups: importGroupLine(c), route: a.importRoute, routeLabel: IMPORT_ROUTE_LABEL[a.importRoute] ?? "" },
      });
      continue;
    }
    const shape = eventShape(a);
    const pill = feedPill(a);
    if (!pill) continue;

    let who = "";
    let say: FeedSeg[] | null = null;
    let provenance = "";
    /** the agency, where the row has one the sentence has not already said (a nameless agent's IS its subject) */
    let agencyLine: string | null = null;

    if (AGENT_TYPES.has(a.activityType)) {
      /* Feed wording v1 — THE SUBJECT IS CARRIED, NEVER GUESSED: the activity's own fields; for an Added row, the live
         agent its id names; otherwise the row drops. A description is never printed as a name. */
      const sweep = a.activityType === ActivityType.AGENT_UPDATED && (a.batchCount ?? 0) >= 2;
      const live = a.activityType === ActivityType.AGENT_ADDED && a.id.startsWith(ADDED_AGENT_ID)
        ? i.agents.find((ag) => ag.id === a.id.slice(ADDED_AGENT_ID.length)) : undefined;
      const name = (a.subjectName ?? "").trim() || (a.subjectAgency ? "" : (live?.name ?? "").trim());
      const agency = (a.subjectName || a.subjectAgency ? a.subjectAgency ?? "" : live?.agency ?? "").trim();
      if (sweep) {
        say = sweepSay(a.batchCount as number);
        provenance = agentEventContext(a.activityType);
        agencyLine = "";
      } else {
        who = name || agency;
        if (!who) continue;
        say = houseSay(a, { t: who, who: true }, agency);
        provenance = provenanceOf(who, agency, agentEventContext(a.activityType));
        agencyLine = provenanceOf(who, agency);
      }
    } else if (MS_TYPES.has(a.activityType)) {
      who = (a.subjectName ?? "").trim() || (i.manuscripts.find((m) => m.id === a.manuscriptId)?.title ?? "").trim();
      if (!who) continue;
      say = houseSay(a, { t: who, em: true });
      provenance = provenanceOf(who, "your manuscripts");
    } else {
      const q = i.queries.find((x) => x.id === a.queryId);
      const agent = q ? i.agents.find((x) => x.id === q.agentId) : undefined;
      who = (agent?.name || agent?.agency || "").trim();
      const msTitle = i.manuscripts.find((m) => m.id === a.manuscriptId)?.title;
      const anchorAt = i.honestDates ? (sentOf(q) ?? querySentAt(a.queryId ?? "", queriedAt, q)) : querySentAt(a.queryId ?? "", queriedAt, q);
      say = describeEvent(
        shape.status, who, (msTitle ?? "").trim(), trustedElapsed(anchorAt, t, nowMs),
        String(a.activityType),
        q?.ifNoResponse === "Mark as no response automatically",
        typeof a.eventKey === "string" ? a.eventKey : null,
      )
        ?? [{ t: a.description?.trim() || who }];
      provenance = (agent?.agency ?? "").trim();
    }

    /* ⚠️ NEVER AN EM DASH WHERE A NAME BELONGS — an unresolvable subject drops the row (a sweep names no one) */
    if (!who && !(a.activityType === ActivityType.AGENT_UPDATED && (a.batchCount ?? 0) >= 2)) continue;
    if (!say) continue;

    const dir: "in" | "out" = shape.kind === "housekeeping" ? "out"
      : (recordSpecFor(String(a.activityType), a.resultingStatus)?.dir ?? "out");
    const evQuery = a.queryId ? i.queries.find((x) => x.id === a.queryId) : undefined;
    const need = evQuery && shape.status && NEED_LABEL[shape.status] && evQuery.status === shape.status
      ? { label: NEED_LABEL[shape.status] as string } : null;
    const met = need || !evQuery ? null : metOn(shape.status, evQuery, i.activities, t);

    out.push({
      id: a.id,
      at: t,
      time: feedClock(t),
      dayLabel: dayLabelFor(t, i.now),
      pill,
      status: shape.status,
      state: shape.state,
      app: shape.kind === "housekeeping",
      say,
      provenance,
      action: markSentOffered(a, i.queries) ? { label: "Send it →", queryId: a.queryId } : null,
      requery: (() => {
        if (shape.status !== QueryStatus.QUERIED || !a.queryId) return null;
        const q = i.queries.find((x) => x.id === a.queryId);
        return q ? requeryLine(q, i.queries) : null;
      })(),
      queryId: a.queryId ?? null,
      /* ⚠️ A DEVICE THAT HAS NEVER SHOWN THE PAGE MARKS NOTHING. Everything would be new, which puts a
         rust rule beside all thirty days of it and says nothing at all. */
      isNew: i.seenAt !== null && t > i.seenAt,
      dir, activityType: String(a.activityType), who, agency: agencyLine ?? provenance, need, met,
      eventKey: typeof a.eventKey === "string" ? a.eventKey : null,
    });
  }
  return out;
};

/** The entries under their day rules, in the order they were derived (newest first). */
export const feedDays = (entries: readonly FeedEntry[]): FeedDay[] => {
  const days: FeedDay[] = [];
  for (const e of entries) {
    const last = days[days.length - 1];
    if (last && last.label === e.dayLabel) last.entries.push(e);
    else days.push({ label: e.dayLabel, entries: [e] });
  }
  return days;
};

/** How many are new — the header's "· N new", absent at zero. */
export const newCount = (entries: readonly FeedEntry[]): number => entries.filter((e) => e.isNew).length;
