/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoFilters — the pure layer of the workbench's drawer filters + masthead search (workbench
 * pack Phase 4). The checkbox list is the ref's, verbatim: Urgent → Offers · Over to you;
 * Housekeeping → Missing materials · Missing wish lists · Stale queries · Snoozed; plus "On
 * today's list only". Everything composes AND-wise with the search, which matches title, agent,
 * agency and manuscript across BOTH views.
 *
 * Decisions (reported):
 * - DEFAULTS ARE ALL-VISIBLE (every type checked, todayOnly off) — the mock sketches Snoozed
 *   unchecked, but an unchecked default would silently hide previously-snoozed live cards on
 *   first paint; hiding is the writer's act, never the default.
 * - "Snoozed" is an AXIS, not a bucket: a card with snoozes > 0 still belongs to its type; the
 *   checkbox suppresses those cards on top of the type filters when un-ticked.
 * - Reply-window groups (dq_responseTime) have NO checkbox — the ref's list omits them (as Task
 *   Settings v2 dropped that row), so they always render; muting them is Task Settings' job.
 * - todayOnly shows committed CARDS only; batch groups aren't committable and drop out.
 */
import { BoardCard } from "./todoBoard";
import { HkGroup } from "./todoHousekeeping";
import { Agent, Manuscript, Query } from "../types";

export interface TodoFilterState {
  offers: boolean;
  overToYou: boolean;
  materials: boolean;
  mswl: boolean;
  stale: boolean;
  snoozed: boolean;
  todayOnly: boolean;
}

export const DEFAULT_FILTERS: TodoFilterState = {
  offers: true, overToYou: true, materials: true, mswl: true, stale: true, snoozed: true, todayOnly: false,
};

export const filtersActive = (f: TodoFilterState, search: string): boolean =>
  search.trim().length > 0 || (Object.keys(DEFAULT_FILTERS) as Array<keyof TodoFilterState>).some((k) => f[k] !== DEFAULT_FILTERS[k]);

export interface SearchCtx {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
}

/** The searchable haystack for one card: title · agent (who/record) · agency · manuscript. */
export function cardText(card: BoardCard, ctx: SearchCtx): string {
  const q = card.relatedRecordId ? ctx.queries.find((x) => x.id === card.relatedRecordId) : undefined;
  const ag = q ? ctx.agents.find((a) => a.id === q.agentId) : undefined;
  const ms = q ? ctx.manuscripts.find((m) => m.id === q.manuscriptId) : undefined;
  return [card.title, card.who, card.record, card.subtitle, ag?.agency ?? "", ms?.title ?? ""].join(" · ").toLowerCase();
}

export const matchesSearch = (card: BoardCard, search: string, ctx: SearchCtx): boolean => {
  const q = search.trim().toLowerCase();
  return !q || cardText(card, ctx).includes(q);
};

/** A batch group matches on its label or any member's name/agency. */
export const groupMatchesSearch = (group: HkGroup, search: string): boolean => {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  if (group.meta.label.toLowerCase().includes(q)) return true;
  return group.members.some((m) => `${m.agentName} ${m.agency ?? ""}`.toLowerCase().includes(q));
};

const passesAxes = (c: BoardCard, f: TodoFilterState, today: string): boolean => {
  if (!f.snoozed && c.snoozes > 0) return false;
  if (f.todayOnly && c.committedDate !== today) return false;
  return true;
};

/** Urgent cards: Offers vs Over to you (everything non-offer in the lane), then the axes. */
export function visibleDoCard(c: BoardCard, f: TodoFilterState, today: string): boolean {
  const isOffer = c.taskType === "offer_received";
  if (isOffer && !f.offers) return false;
  if (!isOffer && !f.overToYou) return false;
  return passesAxes(c, f, today);
}

/** Stale cards: the Stale queries box, then the axes. */
export function visibleStaleCard(c: BoardCard, f: TodoFilterState, today: string): boolean {
  if (!f.stale) return false;
  return passesAxes(c, f, today);
}

/** Notes have no type checkbox — only the axes apply. */
export function visibleNoteCard(c: BoardCard, f: TodoFilterState, today: string): boolean {
  return passesAxes(c, f, today);
}

/** Batch groups: materials/mswl boxes; reply-window groups always pass; none survive todayOnly. */
export function visibleGroup(g: HkGroup, f: TodoFilterState): boolean {
  if (f.todayOnly) return false;
  if (g.rule === "dq_materials" && !f.materials) return false;
  if (g.rule === "dq_mswl" && !f.mswl) return false;
  return true;
}

export interface FilterCounts {
  offers: number;
  overToYou: number;
  materials: number;
  mswl: number;
  stale: number;
  snoozed: number;
  today: number;
}

/** The drawer's derived counts — read from the live board sets, never stored. */
export function filterCounts(input: {
  doCards: BoardCard[];
  hkGroups: HkGroup[];
  staleCards: BoardCard[];
  ntCards: BoardCard[];
  committedCount: number;
}): FilterCounts {
  const doReal = input.doCards.filter((c) => c.taskType !== "weekly_review");
  const all = [...doReal, ...input.staleCards, ...input.ntCards];
  return {
    offers: doReal.filter((c) => c.taskType === "offer_received").length,
    overToYou: doReal.filter((c) => c.taskType !== "offer_received").length,
    materials: input.hkGroups.find((g) => g.rule === "dq_materials")?.members.length ?? 0,
    mswl: input.hkGroups.find((g) => g.rule === "dq_mswl")?.members.length ?? 0,
    stale: input.staleCards.length,
    snoozed: all.filter((c) => c.snoozes > 0).length,
    today: input.committedCount,
  };
}
