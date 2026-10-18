/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v139 §B — THE PRACTICE QUERY. Pip Ledger, The Practice Desk: a query that exists only on screen, so the
 * page guide's "Record a response" can run the whole real journey with nothing written anywhere.
 *
 * ⚠️ PIP IS NEVER IN A STORE THE APP READS. He lives in this module's memory and nowhere else: not Firestore, not
 *    localStorage, not the database context's lists. Three places see him, each on purpose:
 *      - the Query Centre draws his row in its own Practice band (the list's render, never its data);
 *      - his panel is built from this module's object with the panel's real components;
 *      - the action drawer, through `PracticeOverlay`, which adds him to ITS copy of the context and nothing else's.
 *    So no count, chart, header number, glyph count, Birds-eye row, Dashboard, To-do, Analytics or Contact list figure
 *    can include him: none of them reads this module.
 * ⚠️ THE ONE WRITE IS SWAPPED, NOT THE JOURNEY. The response journey plans its write with `planResponse` (the real path's
 *    own planner) and, for Pip, `practiceRespond` applies that plan here and derives his fields with
 *    `computeRecomputedFields` — the pure half of the real recompute. Same screens, same derivations, no I/O.
 * ⚠️ HIS LIFETIME IS THE WALKTHROUGH'S. A reload, a navigation or a closed tab loses him; nothing brings him back.
 */
import { useSyncExternalStore } from "react";
import { deleteField } from "firebase/firestore";
import { ActivityType, QueryStatus, SubmissionMethod, SubmissionStatus, type Activity, type Agent, type Query } from "../types";
import { planResponse, type RecordResponseData } from "./recordResponse";
import { computeRecomputedFields, type RawActivityDoc } from "./recomputeFields";

export const PIP_ID = "practice-pip";
export const PIP_AGENT_ID = "practice-pip-agent";
export const PIP_NAME = "Pip Ledger";
export const PIP_AGENCY = "The Practice Desk";
export const PIP_AGENT_LINE = "Pip is a practice agent. Your real agents live in your Contact list.";

export interface Practice {
  query: Query;
  agent: Agent;
  /** his own log, in the shape a query's activity subcollection has (what the ledger and the recompute read) */
  log: RawActivityDoc[];
  /** the same events in the feed's shape (what the list's row derivation reads) */
  feed: Activity[];
  /** the status the practice response produced, once it is saved */
  answered: QueryStatus | null;
}

const DAY = 86_400_000;
let state: Practice | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

export const isPracticeId = (id: string | null | undefined): boolean => id === PIP_ID;
export const currentPractice = (): Practice | null => state;
export function subscribePractice(l: () => void): () => void { listeners.add(l); return () => { listeners.delete(l); }; }
export function usePractice(): Practice | null { return useSyncExternalStore(subscribePractice, currentPractice, () => null); }

const iso = (ms: number) => new Date(ms).toISOString();

/** Pip arrives: queried 12 days ago with the writer's query letter and synopsis, a reply due 30 days from today. */
export function startPractice(o: { userId: string; manuscriptId: string; manuscriptTitle?: string | null; nowMs?: number }): Practice {
  const now = o.nowMs ?? Date.now();
  const sent = now - 12 * DAY;
  const agent = {
    id: PIP_AGENT_ID, userId: o.userId, name: PIP_NAME, agency: PIP_AGENCY, email: "", website: "",
    genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query letter", "Synopsis"], dateAdded: iso(sent), lastCheckedDate: iso(sent), notes: "",
    /* 12 days in, and a reply due in 30: a six-week window */
    responseTimeWeeks: 6,
  } as unknown as Agent;
  const query = {
    id: PIP_ID, userId: o.userId, manuscriptId: o.manuscriptId, agentId: PIP_AGENT_ID, packageId: "",
    status: QueryStatus.QUERIED, dateSent: iso(sent), personalisationNotes: "", sendMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query letter", "Synopsis"], sentHow: "individual", sentMaterials: "Query letter, Synopsis",
  } as unknown as Query;
  const first: RawActivityDoc = {
    id: "practice-pip-1",
    data: { type: QueryStatus.QUERIED, resultingStatus: QueryStatus.QUERIED, createdAt: iso(sent), note: "", queryId: PIP_ID, agentName: PIP_NAME, manuscriptTitle: o.manuscriptTitle ?? "" },
  };
  /* his derived fields come from his log, through the real recompute's pure half, as they do after every response */
  state = { query: withDerived(query, [first]), agent, log: [first], feed: [feedOf(first, o.userId, o.manuscriptId)], answered: null };
  emit();
  return state;
}

export function endPractice(): void {
  if (!state) return;
  state = null;
  emit();
}

function feedOf(d: RawActivityDoc, userId: string, manuscriptId: string): Activity {
  return {
    id: `${d.id}-feed`, userId, queryId: PIP_ID, manuscriptId, activityType: ActivityType.STATUS_CHANGED,
    description: "", date: String(d.data.createdAt), details: "", resultingStatus: d.data.resultingStatus as QueryStatus,
    logEntryId: d.id,
  };
}

/** the query with its derived fields recomputed from `log` (a `null` clears the field, as the real write deletes it) */
function withDerived(q: Query, log: RawActivityDoc[]): Query {
  const next: Record<string, unknown> = { ...q };
  for (const [k, v] of Object.entries(computeRecomputedFields(log))) {
    if (v === null) delete next[k]; else next[k] = v;
  }
  return next as unknown as Query;
}

/** a Firestore sentinel (a `deleteField()` the journey asks for) clears the field here */
const isDelete = (v: unknown): boolean => {
  const f = v as { isEqual?: (o: unknown) => boolean } | null;
  return !!f && typeof f === "object" && typeof f.isEqual === "function" && f.isEqual(deleteField());
};

/**
 * THE STAND-IN FOR THE RESPONSE JOURNEY'S WRITE: the same plan the real path writes (`planResponse`), applied to Pip in
 * memory, with his derived fields recomputed from his log by the real recompute's pure half. `extra` is the journey's
 * own fields around the write (the request's section, a resubmit-by date).
 */
export function practiceRespond(data: RecordResponseData, extra: Record<string, unknown> = {}): QueryStatus {
  const s = state;
  if (!s) throw new Error("No practice query");
  const plan = planResponse({ query: s.query, agent: s.agent, manuscript: null }, data);
  const next: Record<string, unknown> = { ...s.query };
  for (const [k, v] of Object.entries({ ...plan.details, ...extra })) {
    if (v === undefined || isDelete(v)) delete next[k]; else next[k] = v;
  }
  let log = s.log;
  let feed = s.feed;
  if (plan.appendsActivity) {
    /* monotonic with his log, as the real path's `monotonicEventTime` makes it */
    const lastMs = Math.max(...s.log.map((d) => new Date(String(d.data.createdAt)).getTime()));
    const at = Math.max(plan.desiredMillis, lastMs + 1);
    const entry: RawActivityDoc = { id: `practice-pip-${s.log.length + 1}`, data: { ...plan.activityBase, createdAt: iso(at) } };
    log = [...s.log, entry];
    feed = [...s.feed, feedOf(entry, s.query.userId, s.query.manuscriptId)];
  }
  state = { ...s, query: withDerived(next as unknown as Query, log), log, feed, answered: plan.newStatus };
  emit();
  return plan.newStatus;
}
