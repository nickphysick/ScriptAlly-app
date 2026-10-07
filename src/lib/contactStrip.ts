/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactStrip — the numbers strip under the Contact list's band (Contact list v13 §3; ref
 * design-refs/contact-list-v13.html, `#statB .strip`). Five figures, each with its line:
 *
 *   On file · Fit your book · Open now · Typical reply · Added this month
 *
 * ⚠️ EVERY FIGURE IS OVER THE AGENTS THE LIST SHOWS BEFORE FILTERING (§10). The filter line and the
 * group headings count the filtered set; the strip never does, so a filter can never make the
 * strip disagree with itself between two visits.
 *
 * ⚠️ THE TYPICAL REPLY IS A MEDIAN, NOT A MEAN, and the stub `0` is outside its set (§10). A mean is
 * dragged by one sixteen-week agency; a median is the reply a writer should expect from "an agent
 * on my list". The v12 header's mean (`averageReplyWeeks`) retired with its sentence.
 */
import type { Agent } from "../types";
import { agentPrimary } from "./agentDisplay";
import { isDoorOpen } from "./agentList";
import { takesBook } from "./genreMatch";
import { joinGenres } from "./genreNoun";
import { formatDate } from "./dates";

/** A stated reply window: a positive number of weeks. The quick-add stub `0` and an absent value
 *  are both "not stated". */
export const statedWeeks = (a: Pick<Agent, "responseTimeWeeks">): number | null =>
  typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? a.responseTimeWeeks : null;

/** Does the agent take the book — its main genre or any subGenre (Contact list v14, ruling Q5; `book` is
 *  `bookGenres(manuscript)`). One definition for the strip, the section, the pills and the row ticks. */
export function fitsGenre(a: Pick<Agent, "genres">, book: readonly string[]): boolean {
  return takesBook(a.genres, book);
}

const monthKey = (d: Date) => d.getFullYear() * 12 + d.getMonth();
const addedMs = (a: Pick<Agent, "dateAdded">): number | null => {
  const t = a.dateAdded ? Date.parse(a.dateAdded) : NaN;
  return Number.isFinite(t) ? t : null;
};
const dayMonth = (ms: number) => formatDate(new Date(ms), { day: "numeric", month: "short" });

export interface StripFacts {
  onFile: number;
  agencies: number;
  /** agents added per calendar month, oldest first, the current month LAST (six bars) */
  spark: number[];
  fit: number;
  /** "take thrillers" — null when no manuscript genre is in scope */
  fitLine: string | null;
  open: number;
  closed: number;
  /** the median stated window in whole weeks, or null when nobody states one */
  medianWeeks: number | null;
  fastest: { name: string; weeks: number } | null;
  addedThisMonth: number;
  last: { name: string; date: string } | null;
}

export function stripFacts(agents: readonly Agent[], book: readonly string[], nowMs: number): StripFacts {
  const agencies = new Set(agents.map((a) => (a.agency ?? "").trim().toLowerCase()).filter(Boolean)).size;

  const now = new Date(nowMs);
  const nowKey = monthKey(now);
  const spark = [0, 0, 0, 0, 0, 0];
  let addedThisMonth = 0;
  let last: { a: Agent; t: number } | null = null;
  for (const a of agents) {
    const t = addedMs(a);
    if (t == null) continue;
    const k = monthKey(new Date(t));
    const back = nowKey - k;
    if (back >= 0 && back < 6) spark[5 - back] += 1;
    if (back === 0) addedThisMonth += 1;
    if (t <= nowMs && (!last || t > last.t)) last = { a, t };
  }

  const fit = book.length ? agents.filter((a) => fitsGenre(a, book)).length : 0;
  const open = agents.filter((a) => isDoorOpen(a)).length;

  const stated = agents
    .map((a) => ({ a, w: statedWeeks(a) }))
    .filter((x): x is { a: Agent; w: number } => x.w != null);
  let medianWeeks: number | null = null;
  let fastest: StripFacts["fastest"] = null;
  if (stated.length) {
    const ws = stated.map((x) => x.w).sort((p, q) => p - q);
    const mid = ws.length >> 1;
    medianWeeks = Math.round(ws.length % 2 ? ws[mid] : (ws[mid - 1] + ws[mid]) / 2);
    const best = [...stated].sort((p, q) => p.w - q.w || agentPrimary(p.a).localeCompare(agentPrimary(q.a)))[0];
    fastest = { name: agentPrimary(best.a), weeks: best.w };
  }

  return {
    onFile: agents.length,
    agencies,
    spark,
    fit,
    fitLine: book.length ? `take ${joinGenres(book)}` : null,
    open,
    closed: agents.length - open,
    medianWeeks,
    fastest,
    addedThisMonth,
    last: last ? { name: agentPrimary(last.a), date: dayMonth(last.t) } : null,
  };
}
