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
import { Activity, ActivityType, Agent, Manuscript, Query, QueryStatus } from "../types";
import { agentPrimary } from "./agentDisplay";
import { eventShape, markSentOffered } from "./feedConversation";
import type { State } from "./queryCardFacts";

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;
const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
}

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
  [QueryStatus.OFFER]: "An offer",
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

export const feedPill = (a: Pick<Activity, "activityType" | "resultingStatus">): string | null =>
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
): FeedSeg[] | null => {
  /**
   * ⚠️ THE NUDGE IS BUILT, NEVER READ OFF THE RECORD (Nick, 20 Sep). `logNudge` stores
   * "Nudge sent to {agent} at {agency}"; printing that would put a second vocabulary in a feed
   * written in one voice, and it is the writer's own act, so the subject is "You".
   */
  if (!status && activityType === ActivityType.NUDGE_SENT && who) {
    const head: FeedSeg[] = [{ t: "You nudged " }, { t: who, who: true }];
    const clause = elapsedClause(elapsedMs);
    if (clause) head.push({ t: ` — ${clause} since your query` });
    return head;
  }
  if (!status || !who) return null;
  /* see `autoCloseArmed` — "you closed it" only where the app could not have */
  const byWriter = !autoCloseArmed;
  const book: FeedSeg[] = msTitle ? [{ t: " " }, { t: msTitle, em: true }] : [];
  const to: FeedSeg[] = [{ t: " to " }, { t: who, who: true }];
  const they: FeedSeg[] = [{ t: who, who: true }];
  let head: FeedSeg[] | null = null;
  switch (status) {
    case QueryStatus.QUERIED:
      head = msTitle ? [{ t: "You sent your query for" }, ...book, ...to] : [{ t: "You queried " }, ...they];
      break;
    case QueryStatus.PARTIAL_REQUESTED:
      head = [...they, { t: " asked to read part of" }, ...book];
      break;
    case QueryStatus.PARTIAL_SENT:
      head = [{ t: "You sent the partial of" }, ...book, ...to];
      break;
    case QueryStatus.FULL_REQUESTED:
      head = [...they, { t: " asked for the full manuscript of" }, ...book];
      break;
    case QueryStatus.FULL_SENT:
      head = [{ t: "You sent the full manuscript of" }, ...book, ...to];
      break;
    case QueryStatus.REVISE_RESUBMIT:
      head = [...they, { t: " invited a revise and resubmit on" }, ...book];
      break;
    case QueryStatus.OFFER:
      head = [...they, { t: " offered representation for" }, ...book];
      break;
    case QueryStatus.REJECTED:
      head = [...they, { t: " passed on" }, ...book];
      break;
    case QueryStatus.WITHDRAWN:
      head = [{ t: "You withdrew your query for" }, ...book, { t: " from " }, ...they];
      break;
    /**
     * ⚠️ THE SUBJECT IS THE WRITER, BECAUSE CLOSING IS THE WRITER'S ACT (Nick, 20 Sep) — and the
     * feed is written in their voice throughout. The old sentence ("No reply recorded from …") was
     * right about one thing and it is carried over: **it names what the writer did, never what the
     * agent did not do.** "Without a reply" is a fact about the record; "they ignored you" would be
     * a claim about a person who may have replied somewhere this app never saw.
     *
     * ⚠️ AND THE AUTOMATIC CLOSE KEEPS THE OLD SENTENCE, which is the whole reason the branch
     * splits. Where housekeeping closed it, the APP closed it, and a sentence beginning "You" would
     * hand the writer an act they never performed.
     */
    case QueryStatus.NO_RESPONSE:
      head = byWriter
        ? [{ t: "You closed your query" }, ...to, ...(msTitle ? [{ t: " for" }, ...book] : [])]
        : [{ t: "No reply recorded from " }, ...they, { t: " about" }, ...book];
      break;
    default:
      return null;
  }
  const clause = elapsedClause(elapsedMs);
  if (clause && status !== QueryStatus.QUERIED) {
    /* a close the writer made reads "after N without a reply"; everything else keeps "after you
       queried", which is the anchor those sentences are counted from */
    head.push(status === QueryStatus.NO_RESPONSE && byWriter
      ? { t: ` after ${clause} without a reply` }
      : { t: `, ${clause} after you queried` });
  }
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

/** "Today" / "Yesterday" / "Wed 19 Aug" — the ref's three forms. */
export const dayLabelFor = (at: number, now: Date): string => {
  const d = new Date(at);
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((midnight(now) - midnight(d)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${WD[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
};

export const feedEntries = (i: FeedInput): FeedEntry[] => {
  const nowMs = i.now.getTime();
  const from = nowMs - FEED_DAYS * DAY;
  /* built over the WHOLE activity list, not the window: a query sent two months ago still anchors an
     event from last week, and windowing the anchor loses the elapsed clause on every older query */
  const queriedAt = queriedTimes(i.activities);
  const out: FeedEntry[] = [];

  for (const { a, t } of i.activities
    .map((x) => ({ a: x, t: new Date(x.date).getTime() }))
    .filter((x) => Number.isFinite(x.t) && x.t >= from && x.t <= nowMs)
    .sort((x, y) => y.t - x.t)) {
    const shape = eventShape(a);
    const pill = feedPill(a);
    if (!pill) continue;

    let who = "";
    let say: FeedSeg[] | null = null;
    let provenance = "";

    if (AGENT_TYPES.has(a.activityType)) {
      const desc = a.description;
      let best: Agent | undefined;
      let bestLen = 0;
      for (const ag of i.agents) {
        for (const token of [agentPrimary(ag), ag.agency]) {
          const tok = (token ?? "").trim();
          if (tok.length > bestLen && desc.includes(tok)) { best = ag; bestLen = tok.length; }
        }
      }
      who = best ? agentPrimary(best) : desc.trim();
      provenance = best ? provenanceOf(who, best.agency, agentEventContext(a.activityType)) : "";
      say = [{ t: a.description?.trim() || who }];
    } else if (MS_TYPES.has(a.activityType)) {
      who = i.manuscripts.find((m) => m.id === a.manuscriptId)?.title?.trim() || a.description.trim();
      say = [{ t: a.description?.trim() || who }];
      provenance = provenanceOf(who, "your manuscripts");
    } else {
      const q = i.queries.find((x) => x.id === a.queryId);
      const agent = q ? i.agents.find((x) => x.id === q.agentId) : undefined;
      who = (agent?.name || agent?.agency || "").trim();
      const msTitle = i.manuscripts.find((m) => m.id === a.manuscriptId)?.title;
      const anchorAt = querySentAt(a.queryId ?? "", queriedAt, q);
      say = describeEvent(
        shape.status, who, (msTitle ?? "").trim(), trustedElapsed(anchorAt, t, nowMs),
        String(a.activityType),
        q?.ifNoResponse === "Mark as no response automatically",
      )
        ?? [{ t: a.description?.trim() || who }];
      provenance = (agent?.agency ?? "").trim();
    }

    /* ⚠️ NEVER AN EM DASH WHERE A NAME BELONGS — an unresolvable subject drops the row */
    if (!who) continue;

    const d = new Date(t);
    out.push({
      id: a.id,
      at: t,
      time: d.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true }).replace(" ", "").toLowerCase(),
      dayLabel: dayLabelFor(t, i.now),
      pill,
      status: shape.status,
      state: shape.state,
      app: shape.kind === "housekeeping",
      say,
      provenance,
      action: markSentOffered(a, i.queries) ? { label: "Send it →", queryId: a.queryId } : null,
      queryId: a.queryId ?? null,
      /* ⚠️ A DEVICE THAT HAS NEVER SHOWN THE PAGE MARKS NOTHING. Everything would be new, which puts a
         rust rule beside all thirty days of it and says nothing at all. */
      isNew: i.seenAt !== null && t > i.seenAt,
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
