/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — the agent card's face, the pure half: the band's status chip,
 * the next-step box, the head's meta line, the four "How {first} works" tiles and the materials chips. Nothing stored;
 * every word comes from the agent, the list's facts or the existing call box (`callBox`).
 */
import { QueryStatus, SubmissionMethod, type Agent } from "../types";
import type { AgentFacts } from "./contactList";
import type { CallBox } from "./contactV24";
import { STAGE_NAME } from "./qcSummary";
import { formatDate, MONTHS_SHORT } from "./dates";
import { materialRowsFromAgent } from "./agentMaterials";
import { materialWords } from "./agentPanel";

const stageOf = (x: Pick<AgentFacts, "q">): string => (x.q ? STAGE_NAME[x.q.status as QueryStatus] ?? String(x.q.status) : "");

/** the band's chip: "Your move · {Stage}", "With the agent · {Stage}", "Closed · {Outcome}", "Not yet queried",
 *  "Closed to queries" */
export function bandWords(x: Pick<AgentFacts, "stand" | "q" | "door">): string {
  if (x.stand === "you") return `Your move · ${stageOf(x)}`;
  if (x.stand === "agent") return `With the agent · ${stageOf(x)}`;
  if (x.stand === "closed") return `Closed · ${stageOf(x)}`;
  return x.door === "closed" ? "Closed to queries" : "Not yet queried";
}

/** the next-step box: one per card, its tone by who it's with; its words and verbs are the call box's where it has
 *  them (your move, not queried, hold off), and the list's facts otherwise */
export type StepTone = "you" | "agent" | "closed" | "none";
export interface NextStep {
  tone: StepTone;
  bold: string;
  sub: string;
  /** the stage whose glyph the disc holds; null: not queried (the dotted ring) */
  status: QueryStatus | null;
  /** the button, and what it starts; null: no button */
  button: { label: string; act: { kind: "journey"; mode: string; queryId: string } | { kind: "log" } | { kind: "open"; queryId: string } } | null;
}
const dm = (ms: number) => formatDate(ms, { day: "numeric", month: "short" });
export function nextStep(x: AgentFacts, first: string, call: CallBox | null, nowMs: number): NextStep {
  const q = x.q;
  if (x.stand === "you" && q && call?.kind === "you") {
    return { tone: "you", bold: call.bold, sub: call.sub, status: q.status as QueryStatus, button: { label: call.button, act: { kind: "journey", mode: call.door.mode, queryId: call.queryId } } };
  }
  if (x.stand === "you" && q) {
    return { tone: "you", bold: `${first} is waiting on you.`, sub: stageOf(x), status: q.status as QueryStatus, button: null };
  }
  if (x.stand === "agent" && q) {
    const sub = q.expectedMs != null ? (q.expectedMs < nowMs ? `${stageOf(x)} · expected by ${dm(q.expectedMs)}` : `${stageOf(x)} · expect a reply by ${dm(q.expectedMs)}`)
      : q.sentMs != null ? `${stageOf(x)} · sent ${dm(q.sentMs)}` : stageOf(x);
    return { tone: "agent", bold: `Waiting to hear from ${first}.`, sub: `${sub}.`, status: q.status as QueryStatus, button: { label: "Record a response", act: { kind: "journey", mode: "resp", queryId: q.id } } };
  }
  if (x.stand === "closed" && q) {
    return { tone: "closed", bold: `${stageOf(x)}.`, sub: q.lastMs ? `Closed ${dm(q.lastMs)}.` : "This query is closed.", status: q.status as QueryStatus, button: { label: "See the query", act: { kind: "open", queryId: q.id } } };
  }
  /* not queried */
  if (call?.kind === "hold") return { tone: "none", bold: call.bold, sub: call.sub, status: null, button: null };
  if (x.door === "closed") {
    const t = typeof x.agent.reopensOn === "string" ? Date.parse(x.agent.reopensOn) : NaN;
    return { tone: "none", bold: "Closed to queries.", sub: Number.isFinite(t) ? `${first} reopens ${dm(t)}.` : `Check back before you query ${first}.`, status: null, button: null };
  }
  return { tone: "none", bold: call?.bold ?? `You haven’t queried ${first} yet.`, sub: call?.sub ?? "Check the wishlist before you send.", status: null, button: { label: "Log a query", act: { kind: "log" } } };
}

/** the head's meta: "{City} · replies in about {n} weeks", either half omitted when unknown */
export function metaLine(a: Pick<Agent, "city" | "responseTimeWeeks">, loc: string | null): string | null {
  const w = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const parts = [(a.city ?? "").trim() || loc || "", w ? `replies in about ${w} ${w === 1 ? "week" : "weeks"}` : ""].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** the four "How {first} works" tiles, in order: replies, door, method, policy — `known: false` is the italic gap */
export interface Tile { k: "reply" | "door" | "method" | "policy"; known: boolean; pre: string; bold: string; post: string }
const monthOf = (v: unknown): string | null => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? MONTHS_SHORT[new Date(t).getMonth()] : null;
};
const METHOD: Partial<Record<string, string>> = {
  [SubmissionMethod.EMAIL]: "by email", [SubmissionMethod.QUERY_MANAGER]: "via QueryManager",
  [SubmissionMethod.ONLINE_FORM]: "via an online form", [SubmissionMethod.POST]: "by post",
};
export function howTiles(a: Agent, door: AgentFacts["door"]): Tile[] {
  const w = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const checked = monthOf(a.lastCheckedDate);
  const reopens = monthOf(a.reopensOn);
  /* Add agent v1 — an Other method: "Takes queries via {its words}" (or "via Other") */
  const m = a.submissionMethod === SubmissionMethod.OTHER ? `via ${(a.submissionMethodOther ?? "").trim() || "Other"}` : METHOD[String(a.submissionMethod ?? "")];
  return [
    w ? { k: "reply", known: true, pre: "Replies in about ", bold: `${w} ${w === 1 ? "week" : "weeks"}`, post: "" }
      : { k: "reply", known: false, pre: "Reply time not known", bold: "", post: "" },
    door === "open" ? { k: "door", known: true, pre: "", bold: "Open", post: ` to queries${checked ? ` · checked ${checked}` : ""}` }
      : door === "closed" ? { k: "door", known: true, pre: "", bold: "Closed", post: ` to queries${reopens ? ` · reopens ${reopens}` : ""}` }
      : { k: "door", known: false, pre: "Not known if open", bold: "", post: "" },
    m ? { k: "method", known: true, pre: "Takes queries ", bold: m, post: "" } : { k: "method", known: false, pre: "How they take queries not known", bold: "", post: "" },
    a.noResponseMeansNo === true ? { k: "policy", known: true, pre: "No reply means ", bold: "no", post: "" }
      : a.noResponseMeansNo === false ? { k: "policy", known: true, pre: "", bold: "Always", post: " replies" }
      : { k: "policy", known: false, pre: "Response policy not stated", bold: "", post: "" },
  ];
}

/** the materials chips, in the materials model's own words, with the doc or pages icon */
export function materialChips(a: Pick<Agent, "materialsWanted">): { label: string; kind: "doc" | "pages" }[] {
  return materialRowsFromAgent(a.materialsWanted).filter((r) => r.on).map((r) => ({ label: materialWords(r), kind: r.key === "sample" ? "pages" : "doc" }));
}
