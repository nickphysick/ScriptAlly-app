/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v54 (design-refs/todo-list-v54/todo-batch-v3.html) — HOUSEKEEPING BATCHES, the pure half: what went with
 * each query in a "Fill in what you sent" batch, pre-filled from the agent's saved guidelines, and the writes.
 *
 * ⚠️ THE SAMPLE IS `lib/queryActions/sample`'s (unit, amount, and where it started) and its words are `sampleName`'s.
 *    The stored shape is `materialsToQuery`'s (lib/queryActions/logSave), the one the log journey writes, so a query
 *    filled in here reads exactly as one logged in the Query Centre.
 * ⚠️ GUIDELINES ARE WHAT THE AGENT ASKS FOR, NEVER PROOF OF WHAT WENT. They only pre-fill; nothing here changes an
 *    answer because the guidelines differ from it (D8) — the mismatch is a note, never a correction.
 * ⚠️ THE MATERIALS ARE THE APP'S THREE (query letter, synopsis, opening sample). The mock's fourth tile, "Bio", is a
 *    material this app dropped on purpose (CLAUDE.md, Agent list); "Other" was never on the batch's tiles.
 */
import type { Agent, Query, QueryMaterial } from "../types";
import { materialRowsFromAgent, parseAmount } from "./agentMaterials";
import { materialsToQuery } from "./queryActions/logSave";
import { blankSample, sampleName, type Sample, type SampleUnit } from "./queryActions/sample";

export type BatchMat = "ql" | "syn" | "samp";
export const BATCH_MATS: readonly { k: BatchMat; label: string }[] = [
  { k: "ql", label: "Query letter" },
  { k: "syn", label: "Synopsis" },
  { k: "samp", label: "Opening sample" },
];

/** what one query's row holds */
export interface BatchAnswer { ql: boolean; syn: boolean; samp: boolean; s: Sample }
export const emptyAnswer = (): BatchAnswer => ({ ql: false, syn: false, samp: false, s: blankSample() });
export const hasAnswer = (a: BatchAnswer | undefined): boolean => !!a && (a.ql || a.syn || a.samp);

/** What an agent's saved guidelines ask for: null where nothing is saved. `sample` is null where the guidelines ask for
 *  a sample without saying how much (or don't ask for one at all; `asksSample` tells the two apart). */
export interface Asks { ql: boolean; syn: boolean; asksSample: boolean; sample: Sample | null }

const UNIT_OF: Record<string, SampleUnit> = { Chapters: "chapters", Pages: "pages", Words: "words" };

export function asksOf(agent: Agent | null | undefined): Asks | null {
  const stored = agent?.materialsWanted ?? [];
  if (!stored.length) return null;
  const rows = materialRowsFromAgent(stored);
  const ql = rows.some((r) => r.key === "queryLetter" && r.on);
  const syn = rows.some((r) => r.key === "synopsis" && r.on);
  const qty = rows.filter((r) => r.kind === "qty" && r.on);
  let sample: Sample | null = null;
  for (const r of qty) {
    if (r.kind !== "qty") continue;
    const n = parseAmount(r.amount);
    const unit = UNIT_OF[r.unit];
    /* "3 chapters or 50 pages": the first unit with an amount is the one suggested */
    if (unit && Number.isFinite(n) && n > 0) { sample = { unit, amt: n, from: 1, sect: false, fu: null }; break; }
  }
  if (!ql && !syn && !qty.length) return null;
  return { ql, syn, asksSample: qty.length > 0, sample };
}

/** the answer the guidelines suggest (D5, D8): every material they ask for, the sample at their amount */
export function answerFromAsks(asks: Asks | null): BatchAnswer {
  if (!asks) return emptyAnswer();
  return { ql: asks.ql, syn: asks.syn, samp: asks.asksSample, s: asks.sample ? { ...asks.sample } : blankSample() };
}

/** "query letter, synopsis and first 3 chapters" — the materials in words, the sample by `sampleName` */
export function answerWords(a: BatchAnswer): string {
  const p: string[] = [];
  if (a.ql) p.push("query letter");
  if (a.syn) p.push("synopsis");
  if (a.samp) p.push(sampleName(a.s));
  return p.length > 2 ? `${p.slice(0, -1).join(", ")} and ${p[p.length - 1]}` : p.join(" and ");
}

/**
 * D8 — "{first}'s guidelines ask for {sample}", where the guidelines name a sample and what was entered differs. Null
 * otherwise. It never changes the answer.
 */
export function sampleMismatch(first: string, asks: Asks | null, a: BatchAnswer): string | null {
  if (!asks?.sample || !a.samp) return null;
  const want = sampleName(asks.sample);
  return want === sampleName(a.s) ? null : `${first}’s guidelines ask for ${want}`;
}

const DAY = 86400000;
/** the query's send, as ms (the day it went), or null */
export const sentMsOf = (q: Query | null | undefined): number | null => {
  const t = q?.dateSent ? Date.parse(q.dateSent) : NaN;
  return Number.isFinite(t) ? t : null;
};

/** two asks are "the same" when both are saved and name the same materials at the same amount */
export function sameAsks(a: Asks | null, b: Asks | null): boolean {
  if (!a || !b) return false;
  return a.ql === b.ql && a.syn === b.syn && a.asksSample === b.asksSample
    && (a.sample ? !!b.sample && sampleName(a.sample) === sampleName(b.sample) : !b.sample);
}

export type SameWhy = "week" | "asks" | null;
/** D5 step 2 — why another query is pre-ticked: queried within 3 days of this one, or its agent asks for the same */
export function sameWhy(cur: { sentMs: number | null; asks: Asks | null }, other: { sentMs: number | null; asks: Asks | null }): SameWhy {
  if (cur.sentMs != null && other.sentMs != null && Math.abs(cur.sentMs - other.sentMs) <= 3 * DAY) return "week";
  return sameAsks(cur.asks, other.asks) ? "asks" : null;
}
export const SAME_WHY_WORDS: Record<Exclude<SameWhy, null>, string> = { week: "queried the same week", asks: "asks for the same" };

/** D6 — "Copy the first row to the gaps": the first row's answer into every EMPTY row, never over a filled one */
export function copyToGaps(ids: readonly string[], answers: Readonly<Record<string, BatchAnswer>>): { answers: Record<string, BatchAnswer>; filled: number } {
  const first = answers[ids[0]];
  const out: Record<string, BatchAnswer> = { ...answers };
  let filled = 0;
  if (!hasAnswer(first)) return { answers: out, filled };
  for (const id of ids.slice(1)) {
    if (hasAnswer(out[id])) continue;
    out[id] = { ...first, s: { ...first.s } };
    filled++;
  }
  return { answers: out, filled };
}

/** D6 — "Fill from their asks again": each row with saved guidelines takes them; rows without keep what they have */
export function fillFromAsksAgain(ids: readonly string[], asks: Readonly<Record<string, Asks | null>>, answers: Readonly<Record<string, BatchAnswer>>): { answers: Record<string, BatchAnswer>; filled: number; missing: string[] } {
  const out: Record<string, BatchAnswer> = { ...answers };
  let filled = 0;
  const missing: string[] = [];
  for (const id of ids) {
    const a = asks[id];
    if (!a) { missing.push(id); continue; }
    out[id] = answerFromAsks(a);
    filled++;
  }
  return { answers: out, filled, missing };
}

/** the one write per query: the shape the log journey stores (`materialsToQuery`) */
export function answerToMaterials(a: BatchAnswer): (string | QueryMaterial)[] {
  return materialsToQuery({ ql: a.ql, syn: a.syn, s: a.samp ? a.s : { ...a.s, unit: "none" } });
}

/** D9 — which view opens: a saved choice wins; with none, under 8 is one at a time and 8 or more is the table */
export type BatchView = "one" | "table";
export const BATCH_TABLE_FROM = 8;
export function openingView(n: number, saved: BatchView | null | undefined): BatchView {
  if (saved === "one" || saved === "table") return saved;
  return n >= BATCH_TABLE_FROM ? "table" : "one";
}

/** "Sam, Ben, Ruth and Owen" */
export const andNames = (xs: readonly string[]): string =>
  xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0] ?? "";
