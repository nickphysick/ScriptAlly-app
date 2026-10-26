/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part B (design-refs/contact-list-v25/, screens 01 and 04) — "At a glance": the four cards under the
 * header, as a pure derivation. The page renders them through the shared `GlanceCards` (the Query Centre v150.1's
 * stat cards); the unit suite calls this.
 *
 *   List health   Housekeeping's own percentage and gap total; a press opens Housekeeping, never a filter
 *   Not queried   the "none" set
 *   Querying      Your move + With the agent; the faces Your move's first
 *   Closed        the "closed" set
 *
 * ⚠️ EVERY SET IS `AgentFacts.stand` (lib/contactV24), the predicate the list's group headings, the address book's
 *    band and every disc read, so a card's count is its rows' count.
 * ⚠️ THE FACES ARE CAPPED HERE AND CUT AGAIN TO THE MEASURED ROOM BY THE CARD; "+N" is always the count less the faces
 *    drawn, so the row accounts for every agent.
 */
import { agentInitials, agentPrimary } from "./agentDisplay";
import type { AgentFacts } from "./contactList";
import type { SetKey } from "./contactV24";

export type GlanceKey = "health" | "none" | "querying" | "closed";
export const GLANCE_ORDER: readonly GlanceKey[] = ["health", "none", "querying", "closed"];
export const GLANCE_LABEL: Record<GlanceKey, string> = { health: "List health", none: "Not queried", querying: "Querying", closed: "Closed" };
/** the sets each filtering card shows (List health filters nothing) */
export const GLANCE_SETS: Record<GlanceKey, readonly SetKey[] | null> = { health: null, none: ["none"], querying: ["you", "agent"], closed: ["closed"] };
/** how many discs at most, before the room is measured */
export const GLANCE_FACE_CAP = 6;

export interface GlanceFace { key: string; initials: string; title: string }
export interface GlanceCardModel {
  key: GlanceKey;
  label: string;
  /** the figure drawn: List health's percentage, else the agents in the card's sets */
  count: number;
  /** the agents the faces stand for (0 on List health, which draws no faces) */
  total: number;
  faces: GlanceFace[];
  /** List health only: Housekeeping's gap total */
  gaps: number | null;
}

const byName = (a: AgentFacts, b: AgentFacts) => agentPrimary(a.agent).localeCompare(agentPrimary(b.agent), "en", { sensitivity: "base" });
const face = (x: AgentFacts): GlanceFace => {
  const agency = (x.agent.agency ?? "").trim();
  return { key: x.agent.id, initials: agentInitials(x.agent).slice(0, 2), title: `${agentPrimary(x.agent)}${agency ? `, ${agency}` : ""}` };
};

/** the four cards, in order; `health` is null while Housekeeping has not run (the card then draws no figure) */
export function glanceCards(facts: readonly AgentFacts[], health: { pct: number } | null, gaps: number): GlanceCardModel[] {
  return GLANCE_ORDER.map((k) => {
    const sets = GLANCE_SETS[k];
    if (!sets) return { key: k, label: GLANCE_LABEL[k], count: health?.pct ?? 0, total: 0, faces: [], gaps };
    /* Querying: the Your move faces first, then With the agent's; each run by name */
    const mine = sets.flatMap((s) => facts.filter((x) => x.stand === s).sort(byName));
    return { key: k, label: GLANCE_LABEL[k], count: mine.length, total: mine.length, faces: mine.slice(0, GLANCE_FACE_CAP).map(face), gaps: null };
  });
}

/** "20 gaps" / "1 gap" */
export const gapsWord = (n: number): string => `${n} ${n === 1 ? "gap" : "gaps"}`;
