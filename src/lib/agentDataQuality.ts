/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The `data_quality_poor` housekeeping predicate, in ONE place. It returns the per-FIELD deficiency
 * list (not just a boolean) so the SAME source of truth drives all three:
 *   - the derived to-do task (db.tsx) — emitted while the list is non-empty,
 *   - the Edit Agent drawer's "needs attention" highlight (which fields pulse),
 *   - clear-on-fill + task-clearing — re-run on the live draft; empty list ⇒ task gone.
 *
 * Lifted verbatim from the original inline predicate so behaviour is unchanged.
 */
import { QueryMaterial } from "../types";

export type AgentDataNeed = "mswl" | "materials";

export interface AgentDataQualityInput {
  mswlNotes?: string;
  /** Stored shape (string[] | legacy map) OR a freshly-built string[] from the drawer draft. */
  materialsWanted?: (string | QueryMaterial)[] | Record<string, unknown> | undefined;
}

function hasNoMaterials(m: AgentDataQualityInput["materialsWanted"]): boolean {
  if (!m) return true;
  if (Array.isArray(m)) return m.length === 0;
  // Legacy map shape: deficient unless some entry is selected.
  return !Object.values(m).some((v) => v === true || (v as { selected?: boolean })?.selected === true);
}

/** Which "Complete MSWL details" fields are still deficient. Empty ⇒ the agent is clean. */
export function agentDataQualityNeeds(a: AgentDataQualityInput): AgentDataNeed[] {
  const needs: AgentDataNeed[] = [];
  if ((a.mswlNotes ?? "").trim().length === 0) needs.push("mswl");
  if (hasNoMaterials(a.materialsWanted)) needs.push("materials");
  return needs;
}
