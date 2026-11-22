/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part F — A SMART IMPORT REVIEW, KEPT: the pure half (what is kept, how it is counted and
 * split). The Firestore half is `lib/importDraft.ts`.
 *
 * What is kept: the file's NAME (never the file), the read result the review started from, every decision made so far
 * (the review's working model), the step reached and the row it was on, and counts. It lives at `importDrafts/{uid}`
 * (one live draft per writer) with its JSON split into ordered parts, so a long file never meets the 1MB limit.
 *
 * ⚠️ "CHECKED" IS THE REVIEW'S OWN GATE: an agent row is checked when it has no open question (`openAgentQuestions`),
 * a query row likewise (`openQueryQuestions`). Nothing here re-decides what a question is.
 */
import type { SmartImportResult } from "../types/smartImport";
import type { ReviewAgent, ReviewQuery } from "./smartImportReviewModel";
import { openAgentQuestions, openQueryQuestions } from "./reviewGate";
import { MONTHS_SHORT } from "./dates";

export type ReviewStep = "duplicates" | "agents" | "queries";

/** The review's working model at a moment (SmartImportReview's own state). */
export interface ReviewSnapshot {
  agents: ReviewAgent[];
  queries: ReviewQuery[];
  reconciled: Record<string, { keptId: string; kind: "collapsed" | "split" }>;
  touched: string[];
  screen: ReviewStep;
}

export interface DraftPayload {
  /** the read the review began from */
  result: SmartImportResult;
  review: ReviewSnapshot;
  /** rows already in the account, taken out before the review (the skipped-rows notice reads them) */
  already: { who: string; status: string; sentDate: string | null }[];
}

export interface DraftCounts { agentsChecked: number; agentsTotal: number; queriesChecked: number; queriesTotal: number; queriesStarted: boolean }

export function draftCounts(r: Pick<ReviewSnapshot, "agents" | "queries" | "screen">): DraftCounts {
  const agents = r.agents.filter((a) => !a.deleted);
  const queries = r.queries.filter((q) => !q.removed);
  return {
    agentsTotal: agents.length,
    agentsChecked: agents.length - openAgentQuestions(agents).length,
    queriesTotal: queries.length,
    queriesChecked: queries.length - openQueryQuestions(queries).length,
    queriesStarted: r.screen === "queries",
  };
}

/**
 * Where "Carry on checking" reopens: the first row on the step reached that still has an open question — so a writer
 * who left after checking 23 of 31 agents comes back to the 24th. Null when every row on the step is answered.
 */
export function resumeRow(r: Pick<ReviewSnapshot, "agents" | "queries" | "screen">): string | null {
  if (r.screen === "queries") return openQueryQuestions(r.queries.filter((q) => !q.removed))[0]?.id ?? null;
  if (r.screen === "agents") return openAgentQuestions(r.agents.filter((a) => !a.deleted))[0]?.id ?? null;
  return null;
}

/** The size of one part: well inside the rules' 900,000-character cap and Firestore's 1MB document limit. */
export const PART_SIZE = 700_000;
export const splitParts = (json: string, size = PART_SIZE): string[] => {
  const out: string[] = [];
  for (let i = 0; i < json.length; i += size) out.push(json.slice(i, i + size));
  return out.length ? out : [""];
};
export const joinParts = (parts: readonly { i: number; data: string }[]): string =>
  [...parts].sort((a, b) => a.i - b.i).map((p) => p.data).join("");

/** How long a draft is kept: 7 days from its last change. */
export const DRAFT_DAYS = 7;
export const DRAFT_MS = DRAFT_DAYS * 86_400_000;

/* ── the resume card's words ── */

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "today at 09:30", "yesterday at 21:14", "Monday at 09:30" (within the week), else "3 Nov at 09:30". */
export function startedWhen(startedIso: string, now: Date): string {
  const s = new Date(startedIso);
  if (Number.isNaN(s.getTime())) return "";
  const days = Math.round((dayStart(now) - dayStart(s)) / 86_400_000);
  const at = `at ${hhmm(s)}`;
  if (days <= 0) return `today ${at}`;
  if (days === 1) return `yesterday ${at}`;
  if (days < 7) return `${WEEKDAY[s.getDay()]} ${at}`;
  return `${s.getDate()} ${MONTHS_SHORT[s.getMonth()]} ${at}`;
}

/** "6 November": the day the draft will be cleared (7 days from its last change). */
export function keptUntil(updatedMs: number): string {
  const d = new Date(updatedMs + DRAFT_MS);
  return `${d.getDate()} ${d.toLocaleString("en-GB", { month: "long" })}`;
}

export const RESUME = {
  title: "Pick up where you left off",
  source: (when: string) => `Smart Import · started ${when}`,
  agents: "Agents",
  queries: "Queries",
  checked: (n: number, m: number) => `${n} of ${m} checked`,
  notStarted: "not started",
  text: (until: string) => `Nothing from this file is saved until you finish, so carry on and bring it in. We'll keep your progress until ${until}.`,
  carryOn: "Carry on checking",
  startAgain: "Start again with a different file",
  confirm: (file: string) => `Start again? Your progress with ${file} will be lost.`,
  confirmYes: "Start again",
  confirmNo: "Keep it",
} as const;
