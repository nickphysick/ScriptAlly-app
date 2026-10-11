/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The review's gate (onboarding v9): what counts as a question, what counts as an answer, and the
 * words that count them. Pure; no React.
 *
 * NOTHING FLAGGED IS OPTIONAL. v5's review was advisory: every "chance to sharpen" could be walked
 * past. Now each flag is a question, a step's primary is disabled until every question on it has an
 * answer, and "I don't have this date" / "Carry on without an agency" ARE answers.
 *
 * ONE DEFINITION, READ BY THE SUMMARY, THE DECK, THE STEPPER AND THE BUTTON. They are four places
 * a writer sees a count of what is left; they read `openAgentQuestions` / `openQueryQuestions`
 * and nothing else, so they cannot disagree.
 */
import type { ReviewReasonCode } from "../types/smartImport";
import type { ReviewAgent, ReviewQuery } from "./smartImportReviewModel";

// ── Agents ─────────────────────────────────────────────────────────────────────────────────────
/** What an agent row is asked. A row with neither a name nor an agency cannot be tracked, so it is
 *  asked first and cannot be left blank: it is named, or removed. */
export type AgentAsk = "nameless" | "no-agency" | "mapping";

export function agentAsk(a: ReviewAgent): AgentAsk | null {
  if (a.deleted) return null;
  const name = a.name.trim(), agency = a.agency.trim();
  if (!name && !agency) return "nameless";
  if (name && !agency && !a.agencyWaived) return "no-agency";
  if (a.reasons.some((r) => r.kind === "mapping" && !r.resolved)) return "mapping";
  return null;
}
export interface AgentQuestion { id: string; ask: AgentAsk }
export const openAgentQuestions = (agents: readonly ReviewAgent[]): AgentQuestion[] =>
  agents.flatMap((a) => { const ask = agentAsk(a); return ask ? [{ id: a.id, ask }] : []; });

// ── Queries ────────────────────────────────────────────────────────────────────────────────────
export interface QueryQuestion { id: string; code: ReviewReasonCode }
/** One entry per QUERY that still asks something, carrying its first open reason. The gate counts
 *  records, as the summary's tiers do: a query with two things unclear is one query to answer, and
 *  its card asks the second once the first is settled. */
export const openQueryQuestions = (queries: readonly ReviewQuery[]): QueryQuestion[] =>
  queries.filter((q) => !q.removed).flatMap((q) => { const r = q.reasons.find((x) => !x.resolved); return r ? [{ id: q.id, code: r.code }] : []; });

/** The four families the queries step's questions fall into. */
export type QuestionFamily = "confirm" | "missing" | "status" | "other";
export function questionFamily(code: ReviewReasonCode): QuestionFamily {
  switch (code) {
    case "ambiguous-date": case "ambiguous-response-date": case "serial-outlier": case "two-dates": return "confirm";
    case "no-date": case "unreadable-date": case "unreadable-response-date": case "missing-day": return "missing";
    case "status-direction": case "status-wording": return "status";
    default: return "other";
  }
}
export type FamilyCounts = Record<QuestionFamily, number>;
export function familyCounts(questions: readonly QueryQuestion[]): FamilyCounts {
  const out: FamilyCounts = { confirm: 0, missing: 0, status: 0, other: 0 };
  for (const q of questions) out[questionFamily(q.code)] += 1;
  return out;
}

// ── Words ──────────────────────────────────────────────────────────────────────────────────────
const s = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
const sentence = (parts: string[]) => parts.join(", ");

/** The summary's line for the agents that need an answer. Zero parts are dropped. */
export function agentsAnswerLine(questions: readonly AgentQuestion[]): string {
  const n = (ask: AgentAsk) => questions.filter((q) => q.ask === ask).length;
  const noAgency = n("no-agency"), nameless = n("nameless"), mapping = n("mapping");
  const parts: string[] = [];
  if (noAgency > 0) parts.push(`${noAgency} ${noAgency === 1 ? "has" : "have"} no agency. Add it, or say you're carrying on without one.`);
  if (nameless > 0) parts.push(`${s(nameless, "row has", "rows have")} no agent or agency. Name ${nameless === 1 ? "it" : "them"}, or remove ${nameless === 1 ? "it" : "them"}.`);
  if (mapping > 0) parts.push(`${mapping} ${mapping === 1 ? "has a detail" : "have a detail"} to check.`);
  return parts.join(" ");
}
/** The summary's line for the queries that need an answer. Zero parts are dropped. */
export function queriesAnswerLine(questions: readonly QueryQuestion[]): string {
  const c = familyCounts(questions);
  const parts: string[] = [];
  if (c.confirm > 0) parts.push(s(c.confirm, "date to confirm", "dates to confirm"));
  if (c.missing > 0) parts.push(s(c.missing, "date missing", "dates missing"));
  if (c.status > 0) parts.push(s(c.status, "status to clarify", "statuses to clarify"));
  if (c.other > 0) parts.push(s(c.other, "detail to check", "details to check"));
  return parts.length ? `${sentence(parts)}. One pick each.` : "";
}

/** "Coming up": what is left after the question on show, as chips. */
export function comingUpQueries(rest: readonly QueryQuestion[]): string[] {
  const c = familyCounts(rest);
  const out: string[] = [];
  if (c.confirm > 0) out.push(s(c.confirm, "more date to confirm", "more dates to confirm"));
  if (c.missing > 0) out.push(s(c.missing, "more date needed", "more dates needed"));
  if (c.status > 0) out.push(s(c.status, "more status to clarify", "more statuses to clarify"));
  if (c.other > 0) out.push(s(c.other, "more detail to check", "more details to check"));
  return out;
}
export const AGENT_ASK_CHIP: Record<AgentAsk, string> = { "no-agency": "No agency name", nameless: "No agent or agency", mapping: "Detail to check" };
export function comingUpAgents(rest: readonly AgentQuestion[], nameOf: (id: string) => string): string[] {
  return rest.map((q) => `${nameOf(q.id) || "A row"} · ${AGENT_ASK_CHIP[q.ask].toLowerCase()}`);
}

/** The review subline: how many need an answer, and how many are ready. */
export function reviewSubline(open: number, ready: number, step: "agents" | "queries"): string {
  if (open === 0) return step === "agents" ? "Add as much or as little detail as you like." : "Every question answered. Nothing is saved yet.";
  const need = `${open} ${open === 1 ? "needs" : "need"} an answer before ${step === "agents" ? "you go on" : "anything is saved"}.`;
  const rest = ready === 0 ? "" : ready === 1 ? " The other 1 is ready." : ` The other ${ready} are ready.`;
  return need + rest;
}

/** The bar's primary: its label carries the count while anything is open. */
export const gatePrimary = (step: "agents" | "queries", open: number): string => {
  const base = step === "agents" ? "Continue to queries" : "Import and get started";
  return open > 0 ? `${base} · ${open} to answer first` : base;
};
export const gateHint = (step: "agents" | "queries", open: number): string =>
  step === "agents"
    ? `Answer the ${open} above first. "Carry on without an agency" counts as an answer.`
    : `Answer the ${open} above first. If you don't have a date, say so on its card and the query is kept undated.`;

/** How a settled queries question was answered, for the "All {n} answered" line. */
export type AnswerKind = "confirmed" | "added" | "blank" | "status" | "checked";
export function answerKind(code: ReviewReasonCode, q: ReviewQuery): AnswerKind {
  const family = questionFamily(code);
  if (family === "status") return "status";
  if (code === "unreadable-response-date" || code === "ambiguous-response-date") {
    const d = q.timeline[0]?.date ?? null;
    return !d ? "blank" : family === "confirm" ? "confirmed" : "added";
  }
  if (family === "other" || code === "two-dates" || code === "missing-day") return "checked";
  if (!q.sentDate) return "blank";
  return family === "confirm" ? "confirmed" : "added";
}
/** "2 dates confirmed, 2 dates added, 1 left blank on purpose, 4 statuses set." Zero parts dropped. */
export function answeredLine(kinds: readonly AnswerKind[]): string {
  const n = (k: AnswerKind) => kinds.filter((x) => x === k).length;
  const parts: string[] = [];
  if (n("confirmed") > 0) parts.push(s(n("confirmed"), "date confirmed", "dates confirmed"));
  if (n("added") > 0) parts.push(s(n("added"), "date added", "dates added"));
  if (n("blank") > 0) parts.push(`${n("blank")} left blank on purpose`);
  if (n("status") > 0) parts.push(s(n("status"), "status set", "statuses set"));
  if (n("checked") > 0) parts.push(s(n("checked"), "detail checked", "details checked"));
  return parts.length ? `${sentence(parts)}.` : "";
}
export const allAnsweredHead = (n: number): string => `All ${n} answered.`;
export const writeHint = (agents: number, queries: number): string =>
  `${s(agents, "agent", "agents")} and ${s(queries, "query", "queries")} will be written. The dashboard opens when it's done.`;

/** The summary's paragraph. Clauses whose count is 0 are dropped; with none, the file read cleanly. */
export function summaryLead(n: { decisions: number; agentAnswers: number; queryAnswers: number }): { before: string; clauses: string[]; after: string } | { clean: string } {
  const clauses: string[] = [];
  if (n.decisions > 0) clauses.push(n.decisions === 1 ? "1 agent needs a decision" : `${n.decisions} agents need a decision`);
  if (n.agentAnswers > 0) clauses.push(n.agentAnswers === 1 ? "1 agent needs an answer" : `${n.agentAnswers} agents need an answer`);
  if (n.queryAnswers > 0) clauses.push(n.queryAnswers === 1 ? "1 query needs an answer" : `${n.queryAnswers} queries need an answer`);
  if (clauses.length === 0) return { clean: "It all read cleanly. Your history's ready to come straight in." };
  return { before: "Most of it's ready to go. ", clauses, after: ". Each one is a quick pick, and then everything lands at once." };
}
/** The mark's line: the row count where the path knows it. */
export const readLine = (rows: number | null | undefined): string =>
  typeof rows === "number" ? `${s(rows, "row", "rows")}, read and sorted. Nothing is saved yet.` : "Read and sorted. Nothing is saved yet.";

/** Duplicates, all sorted: what was decided, and how many agents go forward. */
export function duplicatesDoneLine(n: { merged: number; kept: number; forward: number }): string {
  const parts: string[] = [];
  if (n.merged > 0) parts.push(`${s(n.merged, "set", "sets")} merged. Their queries moved across, nothing lost.`);
  if (n.kept > 0) parts.push(`${s(n.kept, "set", "sets")} kept as separate agents.`);
  parts.push(`${s(n.forward, "agent goes", "agents go")} forward.`);
  return parts.join(" ");
}
export const duplicatesNextHint = (agentAnswers: number): string =>
  agentAnswers > 0 ? `Next, ${agentAnswers === 1 ? "1 agent needs" : `${agentAnswers} agents need`} an answer.` : "Next, your agents.";
