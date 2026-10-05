/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactCarousel — what "Who to query next" shows (Contact list v13 §3–4).
 *
 *   The selector:  Best fits · Recently added · Reopening soon
 *   A pressed figure (§3):  Fit your book · Open now · Added this month
 *
 * ⚠️ THESE ARE ORDERED LISTS OF AGENTS AND NOTHING ELSE. They read the agents and the page's own
 * facts; they never touch the list's filters, search, grouping or sort — a figure fills the carousel
 * and leaves the list exactly as it was (lock 3).
 */
import type { Agent } from "../types";
import { agentPrimary } from "./agentDisplay";
import { isDoorOpen } from "./agentList";
import { fitsGenre } from "./contactStrip";

export type CarouselSet = "fit" | "new" | "reopen";
export type FigureSet = "fit" | "open" | "added";

export const SET_LABEL: Record<CarouselSet, string> = {
  fit: "Best fits",
  new: "Recently added",
  reopen: "Reopening soon",
};
export const FIGURE_LABEL: Record<FigureSet, string> = {
  fit: "Fit your book",
  open: "Open now",
  added: "Added this month",
};
/** "the last 8 you added" — the mock's own count */
export const RECENT_N = 8;

export interface CarouselInput {
  agents: readonly Agent[];
  /** has this agent been queried for the manuscript in scope? (`AgentFacts.standing.kind !== "none"`) */
  queried: (a: Agent) => boolean;
  msGenre: string | null | undefined;
  nowMs: number;
}

const rating = (a: Agent) => (typeof a.starRating === "number" ? a.starRating : 0);
const added = (a: Agent) => { const t = a.dateAdded ? Date.parse(a.dateAdded) : NaN; return Number.isFinite(t) ? t : -Infinity; };
const reopen = (a: Agent) => { const s = (a.reopensOn ?? "").trim(); const t = s ? Date.parse(s.length <= 10 ? `${s}T00:00:00` : s) : NaN; return Number.isFinite(t) ? t : Infinity; };
const byName = (a: Agent, b: Agent) => agentPrimary(a).localeCompare(agentPrimary(b));
/** not queried first, then the writer's rating, then the name */
const freshThenRated = (q: (a: Agent) => boolean) => (a: Agent, b: Agent) =>
  Number(q(a)) - Number(q(b)) || rating(b) - rating(a) || byName(a, b);

export function carouselSet(k: CarouselSet, x: CarouselInput): Agent[] {
  const { agents, queried, msGenre } = x;
  switch (k) {
    case "fit":
      return agents.filter((a) => fitsGenre(a, msGenre) && isDoorOpen(a) && !queried(a))
        .sort((a, b) => rating(b) - rating(a) || byName(a, b));
    case "new":
      return [...agents].sort((a, b) => added(b) - added(a) || byName(a, b)).slice(0, RECENT_N);
    case "reopen":
      return agents.filter((a) => !isDoorOpen(a)).sort((a, b) => reopen(a) - reopen(b) || byName(a, b));
  }
}

export function figureSet(k: FigureSet, x: CarouselInput): Agent[] {
  const { agents, queried, msGenre, nowMs } = x;
  switch (k) {
    case "fit":
      return agents.filter((a) => fitsGenre(a, msGenre)).sort(freshThenRated(queried));
    case "open":
      return agents.filter((a) => isDoorOpen(a)).sort(freshThenRated(queried));
    case "added": {
      const now = new Date(nowMs);
      const key = now.getFullYear() * 12 + now.getMonth();
      return agents
        .filter((a) => { const t = added(a); if (!Number.isFinite(t)) return false; const d = new Date(t); return d.getFullYear() * 12 + d.getMonth() === key; })
        .sort((a, b) => added(b) - added(a) || byName(a, b));
    }
  }
}
