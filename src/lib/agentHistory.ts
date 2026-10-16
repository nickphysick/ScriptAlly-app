/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * agentHistory — Contact list v18.2 §B: THE AGENT PANEL'S HISTORY TAB. Every letter, request and reply between the
 * writer and one agent, across every manuscript, as one dated list, newest first. Derived, never stored.
 *
 * ⚠️ THE STAGES COME FROM THE QUERY DOCUMENTS, THROUGH `stageHistory`, NEVER FROM THE GLOBAL FEED ALONE. The feed is a
 *    projection that can carry residue (a send recorded and then undone can survive there); `stageHistory` is the one
 *    reading that takes each stage's date from the document and only falls back to the feed where the document dates
 *    nothing. A stage with no date is LEFT OUT, never given one.
 * ⚠️ NUDGES ARE THE FEED'S, keyed to the query: the document keeps only the last one (`lastNudgeSentDate`), and every
 *    nudge is a fact. Notes are the agent's own notes, as the Notes tab reads them.
 * ⚠️ QUERYHAWK WRITES NOTHING HERE: every title is a fixed app label filled with the agent's first name, and every
 *    detail is a stored value (the method, the materials, a date the writer gave, the writer's own note).
 */
import { QueryStatus, SubmissionMethod, type Activity, type Agent, type Query } from "../types";
import { anyToMs, stageHistory } from "./qcStages";
import { formatQueryMaterial } from "./materials";
import { formatDate } from "./dates";
import type { DerivableActivity } from "./queryDerivation";

/** who did it: the agent (`in`), the writer to the agent (`out`), or the writer's own record (`you`) */
export type HistDir = "in" | "out" | "you";
export type HistIcon = "added" | "note" | "nudge" | "offer";

export interface HistEntry {
  id: string;
  ms: number;
  dir: HistDir;
  /** a query stage is drawn by StatusDot; anything else by a line icon */
  status: QueryStatus | null;
  icon: HistIcon | null;
  title: string;
  detail: string | null;
  /** the writer's own words, shown in quotes */
  quote: string | null;
  chips: string[];
  /** the manuscript's title, or null where none applies (added, notes) */
  manuscript: string | null;
}

export interface HistNext {
  /** "you": the writer's move (rust); "agent": waiting on the agent (navy) */
  who: "you" | "agent";
  title: string;
  due: string | null;
}

export interface HistoryInput {
  agent: Agent;
  /** every query to this agent, on any manuscript */
  queries: readonly Query[];
  /** the global feed (any subset that includes these queries' rows) */
  activities: readonly Activity[];
  notes: readonly { id: string; text: string; createdAt: string }[];
  titleOf: (manuscriptId: string) => string | null;
  nowMs: number;
}

export const firstOf = (a: Agent): string => ((a.name ?? "").trim().split(/\s+/)[0] || (a.agency ?? "").trim() || "this agent");

/** the app's own method words, as a sentence: "By email" */
export function methodWords(m: SubmissionMethod | string | undefined | null): string | null {
  switch (m) {
    case SubmissionMethod.EMAIL: return "By email";
    case SubmissionMethod.QUERY_MANAGER: return "By QueryManager";
    case SubmissionMethod.ONLINE_FORM: return "By online form";
    case SubmissionMethod.POST: return "By post";
    default: return null;
  }
}

/** "30 Sep", with the year when it is not this year */
export const histDay = (ms: number, nowMs: number): string =>
  formatDate(new Date(ms), new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" });

/** a stage entry's words, from the status it entered. Null = a stage History does not draw. */
function stageWords(st: QueryStatus, f: string): { title: string; dir: HistDir; icon: HistIcon | null } | null {
  switch (st) {
    case QueryStatus.QUERIED: return { title: `You queried ${f}`, dir: "out", icon: null };
    case QueryStatus.PARTIAL_REQUESTED: return { title: `${f} asked for a partial`, dir: "in", icon: null };
    case QueryStatus.FULL_REQUESTED: return { title: `${f} asked for the full manuscript`, dir: "in", icon: null };
    case QueryStatus.REVISE_RESUBMIT: return { title: `${f} asked for a new version`, dir: "in", icon: null };
    case QueryStatus.PARTIAL_SENT: return { title: "You sent the partial", dir: "out", icon: null };
    case QueryStatus.FULL_SENT: return { title: "You sent the full manuscript", dir: "out", icon: null };
    case QueryStatus.RESUBMITTED: return { title: "You sent the new version", dir: "out", icon: null };
    case QueryStatus.OFFER: return { title: `${f} offered representation`, dir: "in", icon: "offer" };
    case QueryStatus.REJECTED: return { title: `${f} passed`, dir: "in", icon: null };
    case QueryStatus.NO_RESPONSE: return { title: `No reply from ${f}`, dir: "in", icon: null };
    case QueryStatus.WITHDRAWN: return { title: "Withdrawn", dir: "you", icon: null };
    case QueryStatus.SIGNED: return { title: "Signed", dir: "you", icon: null };
    default: return null;
  }
}
/** the response type, in the app's existing words (the drawer's EVENT_LABEL) */
const CLOSED_WORD: Partial<Record<QueryStatus, string>> = { [QueryStatus.REJECTED]: "Passed", [QueryStatus.NO_RESPONSE]: "No reply" };

const isNudge = (a: Activity) => a.eventKey === "nudge_sent" || (!a.eventKey && a.activityType === "Nudge Sent");

export function agentHistory({ agent, queries, activities, notes, titleOf, nowMs }: HistoryInput): HistEntry[] {
  const f = firstOf(agent);
  const out: HistEntry[] = [];
  const mine = new Set(queries.map((q) => q.id));
  const log = new Map<string, Activity[]>();
  for (const a of activities) if (mine.has(a.queryId)) (log.get(a.queryId) ?? log.set(a.queryId, []).get(a.queryId)!).push(a);

  const added = anyToMs(agent.dateAdded);
  if (added != null) out.push({ id: `added:${agent.id}`, ms: added, dir: "you", status: null, icon: "added", title: `You added ${f} to your contact list`, detail: null, quote: null, chips: [], manuscript: null });

  for (const q of queries) {
    const ms = titleOf(q.manuscriptId);
    const h = stageHistory(q, log.get(q.id) as DerivableActivity[] | undefined);
    h.spans.forEach((s, i) => {
      /* the current stage with nothing to date it: its span start is a fallback, not a fact — left out */
      if (s.current && !h.dated) return;
      const w = stageWords(s.status, f);
      if (!w) return;
      let detail: string | null = null, quote: string | null = null;
      let chips: string[] = [];
      if (s.status === QueryStatus.QUERIED) {
        detail = methodWords(q.sendMethod);
        chips = (q.materialsWanted ?? []).map((m) => formatQueryMaterial(m)).filter((x): x is string => !!x && !!x.trim());
      } else if ((s.status === QueryStatus.PARTIAL_REQUESTED || s.status === QueryStatus.FULL_REQUESTED || s.status === QueryStatus.REVISE_RESUBMIT) && s.current) {
        const due = anyToMs(q.expectedSendDate);
        detail = due != null ? `By ${histDay(due, nowMs)}` : null;
      } else if (s.status === QueryStatus.OFFER) {
        const by = anyToMs(q.offerResponseDeadline);
        detail = by != null ? `You said you’d answer by ${histDay(by, nowMs)}` : null;
      } else if (CLOSED_WORD[s.status]) {
        detail = CLOSED_WORD[s.status]!;
        quote = (q.agentComments ?? "").trim() || null;
      }
      out.push({ id: `${q.id}:${s.status}:${i}`, ms: s.startMs, dir: w.dir, status: w.icon ? null : s.status, icon: w.icon, title: w.title, detail, quote, chips, manuscript: ms });
    });
    for (const a of log.get(q.id) ?? []) {
      if (!isNudge(a)) continue;
      const t = anyToMs(a.date);
      if (t == null) continue;
      out.push({ id: `nudge:${a.id}`, ms: t, dir: "out", status: null, icon: "nudge", title: `You nudged ${f}`, detail: null, quote: null, chips: [], manuscript: ms });
    }
  }

  for (const n of notes) {
    const t = anyToMs(n.createdAt);
    if (t == null || !n.text.trim()) continue;
    out.push({ id: `note:${n.id}`, ms: t, dir: "you", status: null, icon: "note", title: "You added a note", detail: null, quote: n.text.trim(), chips: [], manuscript: null });
  }
  /* newest first; on one instant, the later stage of the journey first (a reply landed after the send it answers) */
  return out.map((e, i) => ({ e, i })).sort((x, y) => y.e.ms - x.e.ms || y.i - x.i).map((x) => x.e);
}

/** "{One query | n queries} · {k} letters and replies" — k counts what passed between you, not your own records */
export function historySummary(entries: readonly HistEntry[], queryCount: number, first: string): string {
  if (queryCount === 0) return `Nothing sent to ${first} yet`;
  const k = entries.filter((e) => e.dir !== "you").length;
  return `${queryCount === 1 ? "One query" : `${queryCount} queries`} · ${k} letters and replies`;
}

/** the month a divider names: "September", or "March 2025" when it is not this year */
export const monthLabel = (ms: number, nowMs: number): string =>
  formatDate(new Date(ms), new Date(ms).getFullYear() === new Date(nowMs).getFullYear() ? { month: "long" } : { month: "long", year: "numeric" });
export const monthKey = (ms: number): string => { const d = new Date(ms); return `${d.getFullYear()}-${d.getMonth()}`; };
