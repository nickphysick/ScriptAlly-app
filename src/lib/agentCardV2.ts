/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent card v2 (design-refs/agent-card-v2/) — THE AGENT CARD'S FACE, THE PURE HALF. Everything the card shows that is
 * not a component: the stage it is coloured by, the pill's word, the query box's line, the footer (the pack's table),
 * the three fact boxes, what the agent asks for, and the "Finish {first}'s profile" block's gaps. Nothing stored.
 *
 * ⚠️ THE FOOTER'S BUTTONS OPEN THE JOURNEYS THE NEXT-STEP BOX OPENED (`nextStep(...).button.act`): only the words are
 *    the pack's. Nothing on the card writes a status.
 * ⚠️ NO PRONOUNS FOR THE AGENT: every line names them.
 */
import { materialIconKind, type MaterialIconKind } from "./materialIcon";
import { SAMPLE_MATERIAL } from "./sentSample";
import { QueryStatus, SubmissionMethod, type Agent } from "../types";
import type { AgentFacts } from "./contactList";
import type { CallBox } from "./contactV24";
import { STAGE_NAME } from "./qcSummary";
import { STAGE_COLOURS, stageOf, type Stage } from "./stageColours";
import { formatDate, MONTHS_SHORT } from "./dates";
import { nextStep, type NextStep } from "./contactCard262";
import { materialRowsFromAgent } from "./agentMaterials";
import { GAP_FOCUS, type GapKey } from "./contactHousekeeping";

/** "16 Nov", with the year only when it is not this one */
export const acDay = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`}`;
};

/** what colours the card's disc ring, pill and query box: the live query's stage; "nq" for an agent not queried */
export type AcTone = Stage | "nq";
export function acTone(x: Pick<AgentFacts, "stand" | "q">): AcTone {
  if (x.stand === "none" || !x.q) return "nq";
  if (x.stand === "closed") return "closed";
  return stageOf(x.q.status);
}
/** the four colours a tone paints with (not queried: the partial tint's pale, as the reference's dotted pill) */
export const acColours = (t: AcTone) => (t === "nq" ? { band: "#f3f6f9", tint: "#ffffff", edge: "#2a3a52", mark: "#2a3a52" } : STAGE_COLOURS[t]);

/** the pill beside the name: the query's stage word, or "Not queried" */
export function acPill(x: Pick<AgentFacts, "stand" | "q">): { status: QueryStatus | null; word: string } {
  if (x.stand === "none" || !x.q) return { status: null, word: "Not queried" };
  const st = x.q.status as QueryStatus;
  return { status: st, word: STAGE_NAME[st] ?? String(st) };
}

/** the query box's italic line: "Full requested 16 Nov", "Offer made 12 Nov · answer by 26 Nov", "Passed 12 Sep" */
export function queryBoxLine(q: NonNullable<AgentFacts["q"]>, nowMs: number): string {
  const st = q.status as QueryStatus;
  const on = q.stageStartMs ?? q.lastMs ?? q.sentMs;
  const at = on != null && Number.isFinite(on) ? ` ${acDay(on, nowMs)}` : "";
  if (st === QueryStatus.OFFER) {
    const by = q.expectedMs != null ? ` · answer by ${acDay(q.expectedMs, nowMs)}` : "";
    return `Offer made${at}${by}`;
  }
  if (st === QueryStatus.QUERIED) return q.sentMs != null ? `Queried ${acDay(q.sentMs, nowMs)}` : "Queried";
  return `${STAGE_NAME[st] ?? String(st)}${at}`;
}

/* ── the footer: the pack's table ─────────────────────────────────────────────────────────────────────────────── */

export type AcAct = NonNullable<NextStep["button"]>["act"] | { kind: "task"; queryId: string };
export interface AcFoot {
  /** which row of the table */
  row: "none" | "agent" | "send" | "offer" | "closed" | "other";
  icon: { k: "clock" } | { k: "ring"; p: number } | { k: "stage"; status: QueryStatus } | { k: "grey"; status: QueryStatus } | { k: "nq" };
  lead: string;
  sub: string;
  button: { label: string; tone: "navy" | "outline"; act: AcAct } | null;
  /** a second-row link (the offer's "Make it a task") */
  link: { label: string; act: AcAct } | null;
}

export function acFoot(x: AgentFacts, first: string, call: CallBox | null, nowMs: number): AcFoot {
  const step = nextStep(x, first, call, nowMs);
  const q = x.q;
  const act = step.button?.act ?? null;
  if (x.stand === "none" || !q) {
    const sub = x.door === "open" ? `${first} is open to queries`
      : x.door === "closed" ? (() => { const t = typeof x.agent.reopensOn === "string" ? Date.parse(x.agent.reopensOn) : NaN; return Number.isFinite(t) ? `${first} reopens ${acDay(t, nowMs)}` : `${first} is closed to queries`; })()
      : `Not known if ${first} is open to queries`;
    return { row: "none", icon: { k: "nq" }, lead: "Not queried yet", sub, button: { label: "Log a query", tone: "navy", act: { kind: "log" } }, link: null };
  }
  const st = q.status as QueryStatus;
  if (x.stand === "closed") {
    const how = st === QueryStatus.REJECTED ? `${first} passed` : st === QueryStatus.WITHDRAWN ? "You withdrew it" : st === QueryStatus.SIGNED ? `Signed with ${first}` : "No response";
    const on = q.lastMs ? ` · ${acDay(q.lastMs, nowMs)}` : "";
    return { row: "closed", icon: { k: "grey", status: st }, lead: "Closed", sub: `${how}${on}`,
      button: st === QueryStatus.SIGNED ? null : { label: "Query again", tone: "outline", act: { kind: "log" } }, link: null };
  }
  if (x.stand === "agent") {
    const sub = q.expectedMs != null ? `Reply expected by ${acDay(q.expectedMs, nowMs)}` : q.sentMs != null ? `Sent ${acDay(q.sentMs, nowMs)}` : "No reply date";
    return { row: "agent", icon: { k: "clock" }, lead: `Waiting on ${first}`, sub,
      button: { label: "Record a response", tone: "outline", act: act ?? { kind: "journey", mode: "resp", queryId: q.id } }, link: null };
  }
  /* your move */
  if (st === QueryStatus.PARTIAL_REQUESTED || st === QueryStatus.FULL_REQUESTED) {
    const full = st === QueryStatus.FULL_REQUESTED;
    return { row: "send", icon: { k: "stage", status: st }, lead: `${first} asked for your ${full ? "full" : "partial"}`, sub: "Send it, then log it here",
      button: act ? { label: full ? "Mark full sent" : "Mark partial sent", tone: "navy", act } : null, link: null };
  }
  if (st === QueryStatus.OFFER) {
    return { row: "offer", icon: { k: "stage", status: st }, lead: `${first} made an offer`,
      sub: q.expectedMs != null ? `Answer by ${acDay(q.expectedMs, nowMs)}` : `${first} hasn’t given an answer-by date`,
      button: act ? { label: "Record your answer", tone: "navy", act } : null, link: { label: "Make it a task", act: { kind: "task", queryId: q.id } } };
  }
  /* anything else on your move (an R&R): the next-step box's own words and button */
  return { row: "other", icon: { k: "stage", status: st }, lead: step.bold.replace(/\.$/, ""), sub: step.sub.replace(/\.$/, ""),
    button: step.button ? { label: step.button.label, tone: "navy", act: step.button.act } : null, link: null };
}

/* ── Profile ──────────────────────────────────────────────────────────────────────────────────────────────────── */

const METHOD: Partial<Record<string, string>> = {
  [SubmissionMethod.EMAIL]: "By email", [SubmissionMethod.QUERY_MANAGER]: "Via QueryManager",
  [SubmissionMethod.ONLINE_FORM]: "By online form", [SubmissionMethod.POST]: "By post",
};
const monthOf = (v: unknown): string | null => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? MONTHS_SHORT[new Date(t).getMonth()] : null;
};
export interface FactBoxIn { k: "reply" | "method" | "door"; label: string; value: string | null; sub: string | null }
/** the three fact boxes: Replies in (with the response policy beneath), Takes queries, Open to queries. An unknown
 *  value is null ("Not known yet"); all three null and the row is not drawn (`factBoxesShown`). */
export function factBoxes(a: Agent, door: AgentFacts["door"]): FactBoxIn[] {
  const w = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;
  const policy = a.noResponseMeansNo === true ? "no reply means no" : a.noResponseMeansNo === false ? "always replies" : null;
  const m = a.submissionMethod === SubmissionMethod.OTHER ? `Via ${(a.submissionMethodOther ?? "").trim() || "Other"}` : METHOD[String(a.submissionMethod ?? "")] ?? null;
  const checked = monthOf(a.lastCheckedDate), reopens = monthOf(a.reopensOn);
  return [
    { k: "reply", label: "Replies in", value: w ? `About ${w} ${w === 1 ? "week" : "weeks"}` : null, sub: policy },
    { k: "method", label: "Takes queries", value: m, sub: null },
    { k: "door", label: "Open to queries", value: door === "open" ? "Open" : door === "closed" ? "Closed" : null,
      sub: door === "open" && checked ? `checked ${checked}` : door === "closed" && reopens ? `reopens ${reopens}` : null },
  ];
}
export const factBoxesShown = (boxes: readonly FactBoxIn[]): boolean => boxes.some((b) => b.value != null);

/** "What {first} asks for": one line each, the quantity at the right ("2 pages", "3 chapters").
 *  `icon` (Material icons v1): the row's material drawing — the sample's by its unit; Other is free text and has none. */
export function askList(a: Pick<Agent, "materialsWanted">): { label: string; qty: string | null; kind: "letter" | "doc" | "pages"; icon: MaterialIconKind | null }[] {
  return materialRowsFromAgent(a.materialsWanted).filter((r) => r.on).map((r) => {
    if (r.key === "sample") {
      const n = parseInt(r.amount, 10);
      const icon = materialIconKind({ material: SAMPLE_MATERIAL, type: r.unit.toLowerCase() as "pages" | "chapters" | "words" });
      return Number.isFinite(n) && n > 0 ? { label: `First ${r.amount} ${r.unit.toLowerCase()}`, qty: null, kind: "pages" as const, icon } : { label: "Opening sample", qty: null, kind: "pages" as const, icon };
    }
    if (r.key === "synopsis") return { label: "Synopsis", qty: r.pages ? `${r.pages} ${String(r.pages) === "1" ? "page" : "pages"}` : null, kind: "doc" as const, icon: "synopsis" as const };
    if (r.key === "other") return { label: (r.text ?? "").trim() || "Something else", qty: null, kind: "doc" as const, icon: null };
    return { label: r.name, qty: null, kind: "letter" as const, icon: "letter" as const };
  });
}

/** the "Finish {first}'s profile" block's buttons, one per Housekeeping item for the agent, in Housekeeping's order */
export const FINISH_WORDS: Record<GapKey, string> = {
  reply: "Reply time", materials: "What they ask for", genres: "Genres", wishlist: "Wishlist", reopen: "Reopening date", agency: "Agency",
};
export function finishItems(keys: readonly GapKey[]): { key: GapKey; label: string; tab: (typeof GAP_FOCUS)[GapKey]["tab"]; focus: (typeof GAP_FOCUS)[GapKey]["focus"] }[] {
  return keys.map((k) => ({ key: k, label: `+ ${FINISH_WORDS[k]}`, tab: GAP_FOCUS[k].tab, focus: GAP_FOCUS[k].focus }));
}
/** the completion ring's share: of the six details Housekeeping asks about, how many are in */
export const finishShare = (n: number): number => Math.max(0, Math.min(1, (6 - n) / 6));

/** the save's snackbar: "Saved 2 changes to Clara", plus ", and moved the query's dates" when it did (Card offers v1's
 *  other outcomes keep their own words after the count) */
export function savedWords(n: number, first: string, plan: { moved: number; kept: number; close: readonly unknown[] } | null | undefined): string {
  const base = `Saved ${n} ${n === 1 ? "change" : "changes"} to ${first}`;
  if (!plan) return base;
  if (plan.close.length) return `${base}, and closed ${plan.close.length === 1 ? "the query" : `${plan.close.length} queries`} as no reply`;
  if (plan.moved) return `${base}, and moved ${plan.moved === 1 ? "the query’s dates" : `${plan.moved} queries’ dates`}`;
  return base;
}
/** Agent card v2.1 — the offer's tail on a save's snackbar: what it did to the queries already out */
function planTail(plan: { moved: number; kept: number; close: readonly unknown[] } | null | undefined): string {
  if (!plan) return "";
  if (plan.close.length) return `, and closed ${plan.close.length === 1 ? "the query" : `${plan.close.length} queries`} as no reply`;
  if (plan.moved) return `, and moved ${plan.moved === 1 ? "the query’s dates" : `${plan.moved} queries’ dates`}`;
  return "";
}
/** Agent card v2.1 — one section saved: "Saved {section} for {first}", plus what it did to the query */
export function sectionSavedWords(section: string, first: string, plan: { moved: number; kept: number; close: readonly unknown[] } | null | undefined): string {
  return `Saved ${section} for ${first}${planTail(plan)}`;
}
/** Agent card v2.1 — Save all: "Saved {n} sections for {first}" ("Saved {section} for {first}" for one) */
export function sectionsSavedWords(sections: readonly string[], first: string, plan: { moved: number; kept: number; close: readonly unknown[] } | null | undefined): string {
  return sections.length === 1 ? sectionSavedWords(sections[0], first, plan) : `Saved ${sections.length} sections for ${first}${planTail(plan)}`;
}
export const UNDONE_WORDS = "Changes undone";
