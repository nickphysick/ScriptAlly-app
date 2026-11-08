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
import { slipTone, type SlipTone } from "./qc153";

export interface TabChip { name: string; asked: boolean }
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
  for (const item of q.materialsWanted ?? []) { const n = formatQueryMaterial(item).trim(); if (fresh(n)) withQuery.push({ name: n, asked: false }); }
  const asks: { name: string; ms: number | null }[] = [];
  const sends: { name: string; ms: number | null }[] = [];
  const st = status as QueryStatus;
  const partial = partialAsked(q);
  if (st === QueryStatus.PARTIAL_REQUESTED) asks.push({ name: partial, ms: anyToMs(q.partialRequestedDate) ?? stageStartMs });
  else if (st === QueryStatus.PARTIAL_SENT || q.partialSentDate) sends.push({ name: partial, ms: anyToMs(q.partialSentDate) ?? (st === QueryStatus.PARTIAL_SENT ? stageStartMs : null) });
  if (st === QueryStatus.FULL_REQUESTED) asks.push({ name: "Full manuscript", ms: anyToMs(q.fullRequestedDate) ?? stageStartMs });
  else if (FULL_SENT.includes(st) || q.fullSentDate) sends.push({ name: "Full manuscript", ms: anyToMs(q.fullSentDate) ?? (st === QueryStatus.FULL_SENT ? stageStartMs : null) });
  if (st === QueryStatus.REVISE_RESUBMIT) asks.push({ name: "Revised manuscript", ms: stageStartMs });
  else if (st === QueryStatus.RESUBMITTED) sends.push({ name: "Revised manuscript", ms: stageStartMs });

  const groups: MatGroup[] = [];
  const pkg = packageName?.trim() || null;
  if (withQuery.length || pkg) groups.push({ kind: "query", label: "With the query", chips: withQuery, pkg });
  const byDay = (items: { name: string; ms: number | null }[], kind: "asked" | "sent", undated: string, word: string) => {
    const days = new Map<string, MatGroup & { at: number }>();
    for (const it of items) {
      if (!fresh(it.name)) continue;
      const day = it.ms == null ? null : Math.floor(it.ms / DAY);
      const key = day == null ? "none" : String(day);
      if (!days.has(key)) days.set(key, { kind, label: it.ms == null ? undated : `${word} ${shortDate(it.ms, nowMs)}`, chips: [], pkg: null, at: day ?? Number.MAX_SAFE_INTEGER });
      days.get(key)!.chips.push({ name: it.name, asked: kind === "asked" });
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
/** `rest` is the ink 82% over white, worked out here rather than with `color-mix()` at run time */
export const TAB_ACCENT: Record<SlipTone, TabAccent> = {
  sand: { accent: "#e0d2bb", ink: "#5e4c36", rest: "#7b6c5a" },
  rose: { accent: "#ddb9b1", ink: "#5f433d", rest: "#7c6560" },
  blue: { accent: "#bccbdc", ink: "#2e4864", rest: "#546980" },
  heather: { accent: "#d4b7c2", ink: "#653f56", rest: "#816274" },
};
export const tabAccent = (status: QueryStatus | string): TabAccent => TAB_ACCENT[slipTone(status)];

/** "3 materials", "1 material" — the tab's accessible name */
export const materialsName = (n: number): string => `${n} material${n === 1 ? "" : "s"}`;
