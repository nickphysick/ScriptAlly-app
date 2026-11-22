/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part A — the "waiting on you" banner and the quick-view chips, as pure derivations.
 *
 * ⚠️ BOTH READ `whereItStands`, the one definition of the four sets (v141.1). The chips' counts are `whereCounts` over
 *    the manuscript-scoped rows, so they sum to All; the banner's n IS the With you chip's count.
 * ⚠️ THE BANNER'S "Next" IS THE MOST URGENT WITH-YOU ROW: the earliest date first (an overdue one is earliest), undated
 *    last, ties by name. Its words are the row's own next move (`nextLine`'s phrase), so the banner and the row agree.
 */
import { whereItStands, type QcRow, type WhereKey } from "./qcSummary";
import { nextLine } from "./qcRowLines";

export type ViewKey = WhereKey | null;

/** "today" · "tomorrow" · "in 6 days" · "yesterday" · "3 days over" · "no date set" */
export function whenWords(dueMs: number | null, nowMs: number): string {
  if (dueMs == null) return "no date set";
  const day = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const n = Math.round((day(dueMs) - day(nowMs)) / 86_400_000);
  if (n === 0) return "today";
  if (n === 1) return "tomorrow";
  if (n === -1) return "yesterday";
  if (n > 1) return `in ${n} days`;
  return `${-n} days over`;
}

export interface WaitingBanner {
  n: number;
  /** the headline's words after the number: "query is" / "queries are" */
  noun: string;
  /** "Decide on offer for Tom Ellery · tomorrow" (null when nothing is waiting) */
  next: string | null;
  /** up to five agents, the most urgent first, one disc each */
  faces: { key: string; initials: string; title: string }[];
}

/** the rows that are waiting on the writer, most urgent first */
export function waitingRows(rows: readonly QcRow[], nowMs: number): QcRow[] {
  return rows
    .filter((r) => whereItStands(r, nowMs) === "you")
    .sort((a, b) => {
      const da = a.expectedMs ?? Infinity, db = b.expectedMs ?? Infinity;
      return da !== db ? da - db : a.agentName.localeCompare(b.agentName);
    });
}

export function waitingBanner(rows: readonly QcRow[], nowMs: number): WaitingBanner {
  const mine = waitingRows(rows, nowMs);
  const top = mine[0] ?? null;
  const faces: WaitingBanner["faces"] = [];
  const seen = new Set<string>();
  for (const r of mine) {
    const k = r.query.agentId || r.agentName;
    if (seen.has(k)) continue;
    seen.add(k);
    faces.push({ key: r.id, initials: r.initials, title: `${r.agentName}${r.agency ? `, ${r.agency}` : ""}` });
    if (faces.length === 5) break;
  }
  return {
    n: mine.length,
    noun: mine.length === 1 ? "query is" : "queries are",
    next: top ? `${nextLine(top, null, nowMs).phrase} for ${top.agentName} · ${whenWords(top.expectedMs, nowMs)}` : null,
    faces,
  };
}

/** a chip press: pressing the chosen one goes back to All */
export const pressView = (current: ViewKey, k: ViewKey): ViewKey => (k === null || k === current ? null : k);

/**
 * v149.1 B4 — THE SAME AGENT TWICE, FOR THE SAME BOOK. When two queries go to one agent for one manuscript, every one
 * after the first is tagged from the record: "RESUBMISSION" when it says it is a requery (`requery`), "V{n}" when it
 * went with a different book version than the ones before it (n counts the versions in the order they were first
 * sent). Neither — the record cannot tell them apart — is a true duplicate and gets no tag (reported, never guessed).
 */
export function twinTags(queries: readonly { id: string; agentId: string; manuscriptId: string; dateSent?: string | null; requery?: boolean; bookVersionId?: string | null }[]): Map<string, string> {
  const out = new Map<string, string>();
  const groups = new Map<string, typeof queries[number][]>();
  for (const q of queries) {
    if (!q.agentId || !q.manuscriptId) continue;
    const k = `${q.agentId}|${q.manuscriptId}`;
    groups.set(k, [...(groups.get(k) ?? []), q]);
  }
  const t = (v: string | null | undefined) => { const x = v ? Date.parse(v) : NaN; return Number.isFinite(x) ? x : Infinity; };
  for (const g of groups.values()) {
    if (g.length < 2) continue;
    const ordered = [...g].sort((a, b) => t(a.dateSent) - t(b.dateSent) || a.id.localeCompare(b.id));
    const versions: string[] = [];
    ordered.forEach((q, i) => {
      const v = q.bookVersionId ?? "";
      const seen = versions.includes(v);
      if (!seen) versions.push(v);
      if (i === 0) return;
      if (q.requery) out.set(q.id, "RESUBMISSION");
      else if (!seen && v) out.set(q.id, `V${versions.indexOf(v) + 1}`);
    });
  }
  return out;
}
