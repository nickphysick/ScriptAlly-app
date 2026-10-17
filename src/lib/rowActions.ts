/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.2 §C — NO ACTION TWICE. A row's actions (the next step, then Open card) never repeat an action the
 * Query status cell already offers. Labels compare ignoring a leading "+", whitespace and case; a match drops that
 * action, and when only Open card is left it shows alone.
 *
 * ⚠️ THE STATUS CELL'S LABELS ARE READ FROM WHAT IT RENDERED (its buttons and links), never inferred from the row's
 *    standing, so any future status-cell action is covered without touching this file.
 */
export interface TrayStep { label: string; ghost?: boolean }
export interface RowAction { kind: "act" | "open"; label: string }

export const OPEN_CARD = "Open card";

export const normAction = (s: string): string => s.replace(/^\s*\+\s*/, "").replace(/\s+/g, " ").trim().toLowerCase();

export function rowActions(step: TrayStep, statusLabels: readonly string[]): RowAction[] {
  const taken = new Set(statusLabels.map(normAction).filter(Boolean));
  const all: RowAction[] = [...(step.ghost ? [] : [{ kind: "act" as const, label: step.label }]), { kind: "open", label: OPEN_CARD }];
  return all.filter((a) => !taken.has(normAction(a.label)));
}
