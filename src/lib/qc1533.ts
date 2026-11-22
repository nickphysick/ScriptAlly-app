/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v153.3 (design-refs/query-centre-v153-3.html) — THE PAPERCLIP TAB: what went, grouped by when it went,
 * for the slip header's tab and its pop-up. It replaces v153.1's materials strip (`slipMaterials`).
 *
 *   With the query   the pieces recorded against the query (`materialsWanted`), then the package's name
 *   Asked [date]     what the agent asked for that has not gone yet (a partial, the full, a revision)
 *   Sent [date]      later pieces that have gone, one group per day, oldest first; "Sent later" with no date
 *
 * ⚠️ THE DATES ARE THE QUERY'S OWN: a partial or full request carries `partialRequestedDate` / `fullRequestedDate`,
 *    a send `partialSentDate` / `fullSentDate`. A revision has neither, so an R&R's ask and a resubmission's send are
 *    dated by the day the stage began (`stageStartMs`), as is an ask whose request date is missing. Nothing undated is
 *    given a date: an undated send is "Sent later", an undated ask is "Asked".
 * ⚠️ Empty groups are left out. With no pieces and no package there is no tab at all, never an empty one.
 */
import { QueryStatus, type Query } from "../types";
import { formatQueryMaterial } from "./materials";
import { partialAsked } from "./qcCardStory";
import { anyToMs } from "./qcStages";
import { shortDate } from "./qc151";
import { stageOf, type Stage } from "./stageColours";
import { materialIconKind, type MaterialIconKind } from "./materialIcon";
import { SAMPLE_MATERIAL } from "./sentSample";

/** `mark`: the material's icon (Material icons v1), "full" for the full / revised manuscript's own sheet, null for free text */
export interface TabChip { name: string; asked: boolean; mark: MaterialIconKind | "full" | null }
export interface MatGroup { kind: "query" | "asked" | "sent"; label: string; chips: TabChip[]; pkg: string | null }
export interface MatGroups { count: number; groups: MatGroup[] }

type MatQuery = Pick<Query, "materialsWanted" | "materialsRequestedType" | "materialsRequestedQuantity" | "requestFrom" | "requestFromUnit"
  | "partialRequestedDate" | "partialSentDate" | "fullRequestedDate" | "fullSentDate">;

const FULL_SENT: readonly QueryStatus[] = [QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED, QueryStatus.REVISE_RESUBMIT, QueryStatus.OFFER, QueryStatus.SIGNED];
const DAY = 86_400_000;

export function materialGroups(q: MatQuery, status: QueryStatus | string, packageName: string | null, stageStartMs: number | null, nowMs: number): MatGroups | null {
  const seen = new Set<string>();
  const fresh = (name: string) => { const k = name.trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true; };
  const withQuery: TabChip[] = [];
  for (const item of q.materialsWanted ?? []) {
    const n = formatQueryMaterial(item).trim();
    if (!fresh(n)) continue;
    const token = String(typeof item === "string" ? item : item?.material ?? "").trim().toLowerCase();
    withQuery.push({ name: n, asked: false, mark: materialIconKind(item) ?? (token === "full manuscript" ? "full" : null) });
  }
  type Piece = { name: string; ms: number | null; mark: TabChip["mark"] };
  const asks: Piece[] = [];
  const sends: Piece[] = [];
  const st = status as QueryStatus;
  const partial = partialAsked(q);
  const unit = (["pages", "chapters", "words"] as const).find((u) => u === String(q.materialsRequestedType ?? "").toLowerCase());
  const pmark = materialIconKind({ material: SAMPLE_MATERIAL, type: unit });
  if (st === QueryStatus.PARTIAL_REQUESTED) asks.push({ name: partial, ms: anyToMs(q.partialRequestedDate) ?? stageStartMs, mark: pmark });
  else if (st === QueryStatus.PARTIAL_SENT || q.partialSentDate) sends.push({ name: partial, ms: anyToMs(q.partialSentDate) ?? (st === QueryStatus.PARTIAL_SENT ? stageStartMs : null), mark: pmark });
  if (st === QueryStatus.FULL_REQUESTED) asks.push({ name: "Full manuscript", ms: anyToMs(q.fullRequestedDate) ?? stageStartMs, mark: "full" });
  else if (FULL_SENT.includes(st) || q.fullSentDate) sends.push({ name: "Full manuscript", ms: anyToMs(q.fullSentDate) ?? (st === QueryStatus.FULL_SENT ? stageStartMs : null), mark: "full" });
  if (st === QueryStatus.REVISE_RESUBMIT) asks.push({ name: "Revised manuscript", ms: stageStartMs, mark: "full" });
  else if (st === QueryStatus.RESUBMITTED) sends.push({ name: "Revised manuscript", ms: stageStartMs, mark: "full" });

  const groups: MatGroup[] = [];
  const pkg = packageName?.trim() || null;
  if (withQuery.length || pkg) groups.push({ kind: "query", label: "With the query", chips: withQuery, pkg });
  const byDay = (items: Piece[], kind: "asked" | "sent", undated: string, word: string) => {
    const days = new Map<string, MatGroup & { at: number }>();
    for (const it of items) {
      if (!fresh(it.name)) continue;
      const day = it.ms == null ? null : Math.floor(it.ms / DAY);
      const key = day == null ? "none" : String(day);
      if (!days.has(key)) days.set(key, { kind, label: it.ms == null ? undated : `${word} ${shortDate(it.ms, nowMs)}`, chips: [], pkg: null, at: day ?? Number.MAX_SAFE_INTEGER });
      days.get(key)!.chips.push({ name: it.name, asked: kind === "asked", mark: it.mark });
    }
    return [...days.values()].sort((a, b) => a.at - b.at).map(({ at: _at, ...g }) => g);
  };
  groups.push(...byDay(asks, "asked", "Asked", "Asked"), ...byDay(sends, "sent", "Sent later", "Sent"));
  const count = groups.reduce((n, g) => n + g.chips.length, 0);
  if (!groups.length) return null;
  return { count: count || 1, groups };
}

/* ── the tab's accent: a deeper shade of the slip header's colour ──────────────────────────────────────────────── */

export interface TabAccent { accent: string; ink: string; rest: string }
/* `rest` is the ink 82% over white, worked out here rather than with `color-mix()` at run time. Stage colours v1: the
   slip preview takes the grid card's stage accent too (the v153 tone accents are gone). */
/** Plumage colours v1 — the accent is the stage's edge, the ink the JSON's `accentInk` (the offer's the paper, on navy). Closed keeps Queried's sand accent (the pack
 *  names four; a closed card's was sand before, and stays so). */
export const TAB_ACCENT_157: Record<Stage, TabAccent> = {
  queried: { accent: "#e0d2bb", ink: "#5e4c36", rest: "#7b6c5a" },
  partial: { accent: "#e2b09c", ink: "#7a4532", rest: "#926657" },
  full: { accent: "#a0a0ae", ink: "#524a5e", rest: "#716b7b" },
  offer: { accent: "#243247", ink: "#f4eee5", rest: "#f6f1ea" },
  closed: { accent: "#e0d2bb", ink: "#5e4c36", rest: "#7b6c5a" },
};
export const tabAccent157 = (status: QueryStatus | string): TabAccent => TAB_ACCENT_157[stageOf(status)];

/** "3 materials", "1 material" — the tab's accessible name */
export const materialsName = (n: number): string => `${n} material${n === 1 ? "" : "s"}`;
