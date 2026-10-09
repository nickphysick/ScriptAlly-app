/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v15.3 §3 — THE HEADER'S FACES, as data. Pure; `ContactOpenHeader` draws them.
 *
 * Up to 8 discs, in this order: up to 4 ACTIVE (most recent query activity first), up to 2 CLOSED (most recent first),
 * up to 2 NOT QUERIED (most recently added first).
 *
 * ⚠️ A GROUP NEVER FILLS ANOTHER GROUP'S EMPTY SLOTS: one active agent and nine unqueried ones is 1 + 0 + 2 = 3 discs.
 * ⚠️ THE KEY COUNTS EVERY AGENT, NEVER THE DISCS SHOWN: its three numbers always sum to the count on file.
 * ⚠️ STATUS IS `agentQueryStates` (lib/contactDesk), the Queried desk card's own derivation — one function, so the key
 *    and the ring cannot disagree.
 */
import type { Agent, Query } from "../types";
import { agentInitials, agentPrimary } from "./agentDisplay";
import { agentQueryStates, type AgentQueryState } from "./contactDesk";

export const FACE_SLOTS: Record<AgentQueryState, number> = { active: 4, closed: 2, none: 2 };
export const FACE_ORDER: AgentQueryState[] = ["active", "closed", "none"];
export const FACE_WORDS: Record<AgentQueryState, { key: string; tip: string }> = {
  active: { key: "active", tip: "query active" },
  closed: { key: "closed", tip: "query closed" },
  none: { key: "not queried", tip: "not queried yet" },
};

export interface Face { id: string; name: string; initials: string; state: AgentQueryState; tip: string }
export interface FacesModel {
  faces: Face[];
  /** every agent, by status: active + closed + none = total */
  counts: Record<AgentQueryState, number>;
  total: number;
}

const added = (a: Agent): number => { const t = Date.parse(String(a.dateAdded ?? "")); return Number.isFinite(t) ? t : 0; };

export function facesModel(agents: readonly Agent[], queries: readonly Query[], msId: string | null): FacesModel {
  const states = agentQueryStates(agents, queries, msId);
  const groups: Record<AgentQueryState, Agent[]> = { active: [], closed: [], none: [] };
  for (const a of agents) groups[states.get(a.id)?.state ?? "none"].push(a);
  const at = (a: Agent) => states.get(a.id)?.at ?? 0;
  groups.active.sort((p, q) => at(q) - at(p));
  groups.closed.sort((p, q) => at(q) - at(p));
  groups.none.sort((p, q) => added(q) - added(p));
  const faces: Face[] = FACE_ORDER.flatMap((state) => groups[state].slice(0, FACE_SLOTS[state]).map((a) => {
    const name = agentPrimary(a);
    return { id: a.id, name, initials: agentInitials(a).slice(0, 2), state, tip: `${name} · ${FACE_WORDS[state].tip}` };
  }));
  return {
    faces,
    counts: { active: groups.active.length, closed: groups.closed.length, none: groups.none.length },
    total: agents.length,
  };
}
