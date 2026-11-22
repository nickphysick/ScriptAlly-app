/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part E — THE EXAMPLE DASHBOARD'S SAMPLE DATA.
 *
 * "See what a busy dashboard looks like" opens the real querying dashboard over THIS data, under a yellow bar that says
 * so. The content is the reference's querying state; every name is invented, and the writer is a sample writer.
 *
 * ⚠️ NOTHING HERE IS THE WRITER'S. The dates are relative to the moment the example is opened, so the page looks the
 * same whenever it is opened. Nothing reads the account to build it and nothing it draws can write (`Dash58`'s
 * `example` flag, and an `inert` wrapper).
 */
import {
  ActivityType, ManuscriptStatus, QueryStatus, SubmissionMethod,
  type Activity, type Agent, type Manuscript, type Query, type User,
} from "../types";
import { appendGoalEntry, type ResolvedGoal } from "./queryingGoals";
import { deriveQueryFields } from "./queryDerivation";

export const EXAMPLE_BAR = "This is an example dashboard with made-up queries, so you can see where things go.";
export const EXAMPLE_BACK = "Back to yours";

const UID = "example-writer";
const MS = "example-ms";
const DAY = 86_400_000;

interface Row {
  id: string; name: string; agency: string;
  status: QueryStatus;
  /** days ago, for each stage the query has reached (sent first) */
  sent: number; partialReq?: number; partialSent?: number; fullReq?: number; fullSent?: number; offer?: number; closed?: number;
  /** days ahead */
  sendBy?: number; replyBy?: number;
}

const ROWS: readonly Row[] = [
  { id: "nh", name: "Nadia Hussain", agency: "Hussain Literary", status: QueryStatus.FULL_REQUESTED, sent: 32, partialReq: 21, partialSent: 19, fullReq: 0, sendBy: 27 },
  { id: "ap", name: "Ada Penhallow", agency: "Penhallow & Co", status: QueryStatus.QUERIED, sent: 0 },
  { id: "te", name: "Tom Ellery", agency: "Ellery & Hart", status: QueryStatus.OFFER, sent: 61, fullReq: 40, fullSent: 36, offer: 1, replyBy: 13 },
  { id: "tr", name: "Tessa Rowe", agency: "Rowe Literary", status: QueryStatus.QUERIED, sent: 14 },
  { id: "ps", name: "Priya Shah", agency: "Lantern Lit", status: QueryStatus.PARTIAL_SENT, sent: 38, partialReq: 12, partialSent: 9 },
  { id: "ew", name: "Eleanor Whitfield", agency: "Whitfield Associates", status: QueryStatus.QUERIED, sent: 231 },
  { id: "jb", name: "Jonah Blake", agency: "Blake & Finch", status: QueryStatus.REJECTED, sent: 48, closed: 20 },
  { id: "om", name: "Owen Marsh", agency: "The Marsh Agency", status: QueryStatus.NO_RESPONSE, sent: 120, closed: 30 },
  { id: "lk", name: "Lena Kowal", agency: "Kowal Books", status: QueryStatus.QUERIED, sent: 6 },
];

export interface ExampleData {
  user: User; manuscript: Manuscript; agents: Agent[]; queries: Query[]; activities: Activity[];
}

/** The sample, dated against `now`. Pure: the same `now` gives the same data. */
export function exampleData(now: Date): ExampleData {
  const t = now.getTime();
  const ago = (d: number) => new Date(t - d * DAY).toISOString();
  const ahead = (d: number) => new Date(t + d * DAY).toISOString();
  const manuscript = {
    id: MS, userId: UID, title: "Murphy's Day Out", genre: "Literary Fiction", ageCategory: "Adult", wordCount: 84_000,
    logline: "", status: ManuscriptStatus.QUERYING, statusChangedDate: ago(70), comps: [],
  } as unknown as Manuscript;
  /* a weekly goal of five, set ten weeks ago, and Getting started long since hidden: the goal sheet has the slot */
  const user = {
    id: UID, name: "Bethany Carter", plan: "Free",
    queryingGoals: appendGoalEntry([], { target: 5, cadence: "week" } as ResolvedGoal, new Date(t - 70 * DAY)),
    todoPrefs: { dash: { tour: "done", gsHidden: { [MS]: true } } },
  } as unknown as User;
  const agents = ROWS.map((r) => ({
    id: `example-a-${r.id}`, userId: UID, name: r.name, agency: r.agency, email: "", website: "", genres: [], mswlNotes: "",
    responseTimeWeeks: 8, dateAdded: ago(r.sent + 3),
  }) as unknown as Agent);
  const queries: Query[] = [];
  const activities: Activity[] = [];
  for (const r of ROWS) {
    const qid = `example-q-${r.id}`;
    const log: Activity[] = [];
    const ev = (n: number, days: number, type: ActivityType, status: QueryStatus, description: string) => log.push({
      id: `example-act-${r.id}-${n}`, userId: UID, queryId: qid, manuscriptId: MS, activityType: type,
      description, date: ago(days), details: "", resultingStatus: status,
    });
    ev(0, r.sent, ActivityType.QUERY_SENT, QueryStatus.QUERIED, `Query sent to ${r.name} at ${r.agency}`);
    if (r.partialReq !== undefined) ev(1, r.partialReq, ActivityType.STATUS_CHANGED, QueryStatus.PARTIAL_REQUESTED, `${r.name} requested a partial`);
    if (r.partialSent !== undefined) ev(2, r.partialSent, ActivityType.MATERIALS_SENT, QueryStatus.PARTIAL_SENT, `Partial sent to ${r.name}`);
    if (r.fullReq !== undefined) ev(3, r.fullReq, ActivityType.STATUS_CHANGED, QueryStatus.FULL_REQUESTED, `${r.name} requested the full manuscript`);
    if (r.fullSent !== undefined) ev(4, r.fullSent, ActivityType.MATERIALS_SENT, QueryStatus.FULL_SENT, `Full manuscript sent to ${r.name}`);
    if (r.offer !== undefined) ev(5, r.offer, ActivityType.STATUS_CHANGED, QueryStatus.OFFER, `${r.name} made an offer`);
    if (r.closed !== undefined) ev(6, r.closed, ActivityType.STATUS_CHANGED, r.status, r.status === QueryStatus.REJECTED ? `${r.name} passed` : `Closed with no reply from ${r.name}`);
    activities.push(...log);
    /* ⚠️ EVERY DERIVED FIELD IS DERIVED, AS ON A REAL QUERY: the status, the stage dates and the close dates come from the
       sample's own log through the one derivation (`deriveQueryFields`), never set here by hand (the single-writer lock). */
    const derived = deriveQueryFields(log);
    queries.push({
      id: qid, userId: UID, manuscriptId: MS, agentId: `example-a-${r.id}`, packageId: "",
      dateSent: ago(r.sent), personalisationNotes: "", sendMethod: SubmissionMethod.EMAIL,
      ...Object.fromEntries(Object.entries(derived).filter(([, v]) => v !== null && v !== undefined)),
      ...(r.offer !== undefined ? { offerDate: ago(r.offer) } : {}),
      ...(r.replyBy !== undefined ? { offerResponseDeadline: ahead(r.replyBy) } : {}),
      ...(r.sendBy !== undefined ? { expectedSendDate: ahead(r.sendBy) } : {}),
    } as unknown as Query);
  }
  return { user, manuscript, agents, queries, activities };
}
