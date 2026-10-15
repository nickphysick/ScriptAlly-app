/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * listHealth — Contact list v18 §F.1: LIST HEALTH AS A SHARE OF POINTS. Each detail on an agent's profile is worth
 * points (the one table below, so the weights can change in one place); List health is the points the writer holds
 * over the points their list could hold, as a whole percentage.
 *
 * ⚠️ IT READS HOUSEKEEPING'S OWN GAPS (`HkModel.gapsById`, from `agentGaps`), NEVER RE-DERIVES THEM. A gap put off
 *    with "Later" is still a gap here: the detail is still missing, only the reminder is hidden. A reply time the
 *    writer marked "not stated" is not a gap, so its points are held.
 * ⚠️ NO AGENTS, NO SCORE: `pct` is null, and nothing shows a number.
 */
import type { Agent } from "../types";
import type { GapKey, HkModel } from "./contactHousekeeping";
import { isDoorClosed } from "./agentList";

/** points per detail, in points order (the drawer lists details in this order) */
export const POINTS: Readonly<Record<GapKey, number>> = { reply: 6, materials: 5, genres: 4, wishlist: 3, reopen: 2 };
export const POINTS_ORDER: readonly GapKey[] = ["reply", "materials", "genres", "wishlist", "reopen"];

/** does a detail count for this agent? Every detail but the reopening date counts for every agent; that one only
 *  for an agent closed for now */
export const appliesTo = (gap: GapKey, a: Agent): boolean => (gap === "reopen" ? isDoorClosed(a) : true);

/** the most one profile can hold: 18, or 20 for an agent closed for now */
export const possibleFor = (a: Agent): number => POINTS_ORDER.reduce((s, g) => s + (appliesTo(g, a) ? POINTS[g] : 0), 0);

export const missingFor = (gaps: readonly GapKey[]): number => gaps.reduce((s, g) => s + POINTS[g], 0);

export interface Health {
  possible: number;
  missing: number;
  held: number;
  /** round(100 × held ÷ possible); null with no agents */
  pct: number | null;
  /** the gaps left to fill: Housekeeping's own count (the ones not put off with Later) */
  gaps: number;
}

export function health(agents: readonly Agent[], model: Pick<HkModel, "gapsById" | "items">): Health {
  let possible = 0, missing = 0;
  for (const a of agents) {
    possible += possibleFor(a);
    missing += missingFor(model.gapsById.get(a.id) ?? []);
  }
  const held = possible - missing;
  return { possible, missing, held, pct: possible > 0 ? Math.round((100 * held) / possible) : null, gaps: model.items.length };
}

/** one agent's own share of their points, for the by-agent ring */
export function agentPct(a: Agent, gaps: readonly GapKey[]): number {
  const p = possibleFor(a);
  return p > 0 ? Math.round((100 * (p - missingFor(gaps))) / p) : 100;
}

/** "about {m} min" for {n} gaps: half a minute each, rounded up */
export const minutesFor = (n: number): number => Math.ceil(n * 0.5);

export const POINTS_LINE = "Each profile is worth up to 18 points (20 if closed for now). List health is the share you hold across your whole list, so it means the same for 5 agents or 500.";
