/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.3 §B — ONE NEXT STEP, NOTHING TWICE (the rule carries forward from v18.3.2 §C). The open row offers
 * the status's own primary action as a link on its details line, unless the Query status cell already offers that
 * action. Labels compare ignoring a leading "+", whitespace and case. A ghost step (a way out rather than an action)
 * offers nothing; there is no "Open card" (clicking the row opens it).
 *
 * ⚠️ THE STATUS CELL'S LABELS ARE READ FROM WHAT IT RENDERED (its buttons and links), never inferred from the row's
 *    standing, so any future status-cell action is covered without touching this file.
 */
export interface TrayStep { label: string; ghost?: boolean }

export const normAction = (s: string): string => s.replace(/^\s*\+\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();

export function nextStep(step: TrayStep, statusLabels: readonly string[]): string | null {
  if (step.ghost || !step.label.trim()) return null;
  const taken = new Set(statusLabels.map(normAction).filter(Boolean));
  return taken.has(normAction(step.label)) ? null : step.label;
}
