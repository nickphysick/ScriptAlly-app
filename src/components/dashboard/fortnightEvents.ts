/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fortnight event derivation — extracted unchanged from the retired FortnightInFocus panel so the
 * depth carousel re-skins the same feed. One behavioural delta, inherent to the carousel's shape:
 * the window widened from −6…+7 (14 days) to −7…+7 (15 days, today centred at index 7).
 *
 * Derived-over-stored: every event is read from the derived model — query fields written by
 * recomputeQuery (dateSent / partial+full sent+requested dates / responseDeadline / nudgeDate /
 * the closed-response timestamps) and the activity log for the two entity-added markers. No stored
 * fields are added and nothing is written back.
 */
import { Query, Agent, Manuscript, Activity, QueryStatus, ActivityType } from "../../types";
import { extractAgentFromText } from "../../lib/activityUtils";

export const FORTNIGHT_PAST_DAYS = 7;
export const FORTNIGHT_FUTURE_DAYS = 7;
/** Index of today in the 15-card strip. */
export const FORTNIGHT_TODAY_IDX = FORTNIGHT_PAST_DAYS;

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const dayDiff = (a: Date, b: Date) => Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / 86400000);
export const dayKey = (d: Date) => startOfDay(d).getTime();
export const fmtDayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "today" / "in N days" / "overdue N days" relative to a reference day. */
const relDays = (target: Date, ref: Date) => {
  const n = dayDiff(target, ref);
  if (n === 0) return "today";
  if (n > 0) return `in ${n} day${n === 1 ? "" : "s"}`;
  return `overdue ${-n} day${-n === 1 ? "" : "s"}`;
};

/** Firestore Timestamp | ISO string | Date → Date | null. */
const coerceDate = (v: any): Date | null => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "string") { const d = new Date(v); return isNaN(d.getTime()) ? null : d; }
  if (typeof v.seconds === "number") return new Date(v.seconds * 1000);
  if (typeof v.toDate === "function") { try { return v.toDate(); } catch { return null; } }
  return null;
};

// ── Event model ──────────────────────────────────────────────────────────────
export type FType =
  | "sent"
  | "partial_sent"
  | "full_sent"
  | "pages_requested"           // agent requested partial/full, writer hasn't sent (request logged)
  | "pages_due"                 // a requested partial/full is due to send (future)
  | "pages_overdue"             // a requested partial/full was due and is unsent (past)
  | "expected_upcoming"         // response window closing — today/future
  | "expected_overdue"          // response window passed
  | "nudge"                     // follow-up reminder scheduled
  | "response_received"         // offer / rejection / withdrawn / no-response recorded
  | "agent_added"
  | "manuscript_added";

export type Urgency = "elapsed" | "upcoming" | "neutral";
export type Marker = { kind: "status"; status: QueryStatus } | { kind: "icon"; icon: "agent" | "query" | "manuscript" };

export interface FEvent {
  id: string;
  type: FType;
  date: Date;
  queryId?: string;
  title: string;        // headline — agent name or manuscript title
  agency?: string;
  manuscript?: string;
  line: string;         // the activity (line 1)
  detail?: string;      // muted-italic timing that trails the activity ("overdue 5 days")
  marker: Marker;
  urgency: Urgency;
  cta?: { label: string; urgent: boolean };
}

/** Forward-looking due-semantics types — the carousel draws these as the dashed reminder ring. */
export const REMINDER_TYPES: ReadonlySet<FType> = new Set([
  "pages_due",
  "pages_overdue",
  "expected_upcoming",
  "expected_overdue",
  "nudge",
]);

/** Single source of truth: an event type's urgency class. */
const URGENCY_BY_TYPE: Record<FType, Urgency> = {
  sent: "neutral",
  partial_sent: "neutral",
  full_sent: "neutral",
  pages_requested: "neutral",
  pages_due: "upcoming",
  pages_overdue: "elapsed",
  expected_upcoming: "upcoming",
  expected_overdue: "elapsed",
  nudge: "upcoming",
  response_received: "neutral",
  agent_added: "neutral",
  manuscript_added: "neutral",
};

/** The requested-materials status for a query in a pages_* event (mirrors the pipeline's mapping). */
export const requestStatus = (q: Query): QueryStatus => {
  if (q.status === QueryStatus.PARTIAL_REQUESTED || q.status === QueryStatus.PARTIAL_SENT) return QueryStatus.PARTIAL_REQUESTED;
  if (q.status === QueryStatus.FULL_REQUESTED || q.status === QueryStatus.FULL_SENT) return QueryStatus.FULL_REQUESTED;
  if (q.status === QueryStatus.REVISE_RESUBMIT) return QueryStatus.REVISE_RESUBMIT;
  return q.fullRequestedDate ? QueryStatus.FULL_REQUESTED : QueryStatus.PARTIAL_REQUESTED;
};

/** Single source of truth: an event type → its marker (StatusDot status, or one of the three icons). */
const markerFor = (type: FType, q?: Query): Marker => {
  switch (type) {
    case "sent": return { kind: "icon", icon: "query" };
    case "agent_added": return { kind: "icon", icon: "agent" };
    case "manuscript_added": return { kind: "icon", icon: "manuscript" };
    case "partial_sent": return { kind: "status", status: QueryStatus.PARTIAL_SENT };
    case "full_sent": return { kind: "status", status: QueryStatus.FULL_SENT };
    case "pages_requested":
    case "pages_due":
    case "pages_overdue": return { kind: "status", status: q ? requestStatus(q) : QueryStatus.PARTIAL_REQUESTED };
    // expected_*, nudge, response_received → the query's own derived status
    default: return { kind: "status", status: (q?.status as QueryStatus) ?? QueryStatus.QUERIED };
  }
};

/** Every fortnight event within the window, unsorted (day grouping orders the render). */
export const deriveFortnightEvents = (
  queries: Query[],
  agents: Agent[],
  manuscripts: Manuscript[],
  activities: Activity[],
  today: Date,
): FEvent[] => {
  const out: FEvent[] = [];
  const inWindow = (d: Date | null) =>
    !!d && dayDiff(d, today) >= -FORTNIGHT_PAST_DAYS && dayDiff(d, today) <= FORTNIGHT_FUTURE_DAYS;

  const agentName = (q: Query) => { const a = agents.find((x) => x.id === q.agentId); return a?.name || a?.agency || "the agent"; };
  const agentAgency = (q: Query) => agents.find((a) => a.id === q.agentId)?.agency || "";
  const msTitle = (q: Query) => manuscripts.find((m) => m.id === q.manuscriptId)?.title || "";

  const ctaFor = (type: FType, urgent: boolean): FEvent["cta"] | undefined => {
    switch (type) {
      case "pages_requested":
      case "pages_due":
      case "pages_overdue": return { label: "Send", urgent };
      case "expected_upcoming":
      case "expected_overdue":
      case "nudge": return { label: "Nudge", urgent };
      case "sent":
      case "partial_sent":
      case "full_sent":
      case "response_received": return { label: "Open", urgent: false };
      default: return undefined; // entity-added: informational, no CTA
    }
  };

  const pushQuery = (q: Query, type: FType, date: Date, line: string, detail?: string) => {
    if (!inWindow(date)) return;
    const urgency = URGENCY_BY_TYPE[type];
    out.push({
      id: `${q.id}-${type}-${dayKey(date)}`,
      type,
      date,
      queryId: q.id,
      title: agentName(q),
      agency: agentAgency(q),
      manuscript: msTitle(q),
      line,
      detail,
      marker: markerFor(type, q),
      urgency,
      cta: ctaFor(type, urgency !== "neutral"),
    });
  };

  queries.forEach((q) => {
    // Query sent (entity action → Send icon)
    const sent = coerceDate(q.dateSent);
    if (sent) pushQuery(q, "sent", sent, "Query sent");

    // Materials sent — past confirmations
    const ps = coerceDate(q.partialSentDate);
    if (ps) pushQuery(q, "partial_sent", ps, "Partial sent");
    const fs = coerceDate(q.fullSentDate);
    if (fs) pushQuery(q, "full_sent", fs, "Full sent");

    // Agent requested pages, writer hasn't sent them yet
    const awaitingSend =
      (q.status === QueryStatus.PARTIAL_REQUESTED && !q.partialSentDate) ||
      (q.status === QueryStatus.FULL_REQUESTED && !q.fullSentDate) ||
      (q.status === QueryStatus.REVISE_RESUBMIT && !q.partialSentDate && !q.fullSentDate);

    if (awaitingSend) {
      const reqStatus = requestStatus(q);
      const reqLabel = reqStatus === QueryStatus.FULL_REQUESTED ? "Full requested" : reqStatus === QueryStatus.REVISE_RESUBMIT ? "Revise & resubmit" : "Partial requested";
      const sendLabel = reqStatus === QueryStatus.FULL_REQUESTED ? "full" : reqStatus === QueryStatus.REVISE_RESUBMIT ? "revision" : "partial";
      const capSend = sendLabel.charAt(0).toUpperCase() + sendLabel.slice(1);
      const reqDate = coerceDate(
        q.status === QueryStatus.PARTIAL_REQUESTED ? (q.partialRequestedDate || q.dateSent)
        : q.status === QueryStatus.FULL_REQUESTED ? (q.fullRequestedDate || q.dateSent)
        : (q.fullRequestedDate || q.partialRequestedDate || q.dateSent)
      );
      if (reqDate) pushQuery(q, "pages_requested", reqDate, reqLabel);

      const due = coerceDate(q.expectedSendDate || q.responseDeadline);
      if (due) {
        const diff = dayDiff(due, today);
        if (diff >= 1) pushQuery(q, "pages_due", due, `Send the ${sendLabel}`, `due ${fmtDayMonth(due)} · ${relDays(due, today)}`);
        else if (diff < 0) pushQuery(q, "pages_overdue", due, `${capSend} not yet sent`, `due ${fmtDayMonth(due)} · ${relDays(due, today)}`);
      }
    }

    // Response window — only for still-open queries that aren't mid-send
    const isOpen =
      q.status !== QueryStatus.OFFER && q.status !== QueryStatus.REJECTED &&
      q.status !== QueryStatus.WITHDRAWN && q.status !== QueryStatus.NO_RESPONSE;
    if (isOpen && !awaitingSend) {
      const deadline = coerceDate(q.responseDeadline);
      if (deadline) {
        const diff = dayDiff(deadline, today);
        if (diff >= 0) pushQuery(q, "expected_upcoming", deadline, "Response expected", diff === 0 ? "today" : `${fmtDayMonth(deadline)} · ${relDays(deadline, today)}`);
        else pushQuery(q, "expected_overdue", deadline, "Response window passed", relDays(deadline, today));
      }
    }

    // Follow-up reminder
    const nudge = coerceDate(q.nudgeDate);
    if (nudge && dayDiff(nudge, today) >= 0) {
      const nd = relDays(nudge, today);
      pushQuery(q, "nudge", nudge, "Follow-up reminder", nd === "today" ? "today" : `${fmtDayMonth(nudge)} · ${nd}`);
    }

    // Response recorded (offer / rejection / withdrawn / no-response)
    const isClosed = [QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE].includes(q.status);
    if (isClosed) {
      const resp = coerceDate((q as any).responseReceivedAt || (q as any).lastStatusChange);
      if (resp) {
        const label =
          q.status === QueryStatus.OFFER ? "Offer received" :
          q.status === QueryStatus.REJECTED ? "Rejection received" :
          q.status === QueryStatus.WITHDRAWN ? "Withdrawn" : "Closed — no response";
        pushQuery(q, "response_received", resp, label);
      }
    }
  });

  // Agent + manuscript added markers from the activity log (Fortnight intentionally shows
  // these; only Story-so-far cuts housekeeping). Agent-added events are collected first and
  // deduplicated by description (addAgent + backfill can both emit one), preferring the
  // stable-id backfill entry so the agents-array lookup resolves agency-only names.
  const agentAddedByDesc = new Map<string, Activity>();
  activities.forEach((act) => {
    const d = coerceDate(act.date);
    if (!inWindow(d) || !d) return;
    if (act.activityType === ActivityType.AGENT_ADDED) {
      const isStable = act.id.startsWith("act-added-agent-");
      const prev = agentAddedByDesc.get(act.description);
      if (!prev || (isStable && !prev.id.startsWith("act-added-agent-"))) {
        agentAddedByDesc.set(act.description, act);
      }
    } else if (act.activityType === ActivityType.MANUSCRIPT_ADDED) {
      const title = manuscripts.find((m) => m.id === act.manuscriptId)?.title || "New manuscript";
      out.push({
        id: `msadd-${act.id}`,
        type: "manuscript_added",
        date: d,
        title,
        line: "Manuscript added",
        marker: markerFor("manuscript_added"),
        urgency: "neutral",
      });
    }
  });
  for (const act of agentAddedByDesc.values()) {
    const d = coerceDate(act.date)!;
    const stableMatch = act.id.match(/^act-added-agent-(.+)$/);
    const agentId = stableMatch?.[1] ?? null;
    const agent = agentId ? agents.find((a) => a.id === agentId) : null;
    const parsed = extractAgentFromText(act.description);
    // Agency-only descriptions ("Added Curtis Brown") have no "at" so parsed is null;
    // strip the "Added " prefix as a last resort before falling back to "the agent".
    const agencyFallback = parsed == null
      ? (act.description.match(/^Added\s+(.+)$/) ?? [])[1] ?? null
      : null;
    out.push({
      id: `agentadd-${act.id}`,
      type: "agent_added",
      date: d,
      title: agent?.name || agent?.agency || parsed?.name || parsed?.agency || agencyFallback || "the agent",
      agency: agent?.agency || parsed?.agency || agencyFallback || "",
      line: "Agent added",
      marker: markerFor("agent_added"),
      urgency: "neutral",
    });
  }

  return out;
};

export interface FortnightGroups {
  byDay: Map<number, FEvent[]>;
  /** Events dated today or earlier in the window (diff −7…0) — the header's "last week" figure. */
  lastWeekCount: number;
  /** Forward events in the next 7 days (diff 1…7) — the header's "coming up" figure and the quiet-Today hint. */
  comingUpCount: number;
}

/** Group by day + neutral count totals per half (activity volume only). */
export const groupFortnightEvents = (events: FEvent[], today: Date): FortnightGroups => {
  const map = new Map<number, FEvent[]>();
  let lw = 0, cu = 0;
  for (const ev of events) {
    const k = dayKey(ev.date);
    (map.get(k) ?? map.set(k, []).get(k)!).push(ev);
    const diff = dayDiff(ev.date, today);
    if (diff >= -FORTNIGHT_PAST_DAYS && diff <= 0) lw++;
    else if (diff >= 1 && diff <= FORTNIGHT_FUTURE_DAYS) cu++;
  }
  return { byDay: map, lastWeekCount: lw, comingUpCount: cu };
};
