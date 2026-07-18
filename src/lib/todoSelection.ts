/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * todoSelection — the pure ledger-selection reducer (workbench pack Phase 5). Selection lives
 * over the ledger's VISIBLE top-level row order (card keys + `group-{rule}` parents — one key per
 * batch parent, so a parent always selects as ONE; children are never in the order, so they are
 * never selectable by construction). Shift-click ADDS the inclusive span between the anchor and
 * the target (additive — forgiving over the file-manager replace convention); plain click
 * toggles and re-anchors. Keys that fell out of the visible order prune on the next interaction.
 */
export interface SelState {
  selected: string[];
  anchor: string | null;
}

export const EMPTY_SEL: SelState = { selected: [], anchor: null };

export function applySelectClick(state: SelState, order: string[], key: string, shift: boolean): SelState {
  if (!order.includes(key)) return state; // not a selectable row
  const live = state.selected.filter((k) => order.includes(k)); // prune stale keys
  if (shift && state.anchor && order.includes(state.anchor)) {
    const a = order.indexOf(state.anchor);
    const b = order.indexOf(key);
    const span = order.slice(Math.min(a, b), Math.max(a, b) + 1);
    return { selected: Array.from(new Set([...live, ...span])), anchor: state.anchor };
  }
  const has = live.includes(key);
  return { selected: has ? live.filter((k) => k !== key) : [...live, key], anchor: key };
}

/** The keyboard focus walker: clamped move over the visible order (−1 = nothing focused). */
export function moveFocus(idx: number, delta: 1 | -1, orderLength: number): number {
  if (orderLength === 0) return -1;
  if (idx < 0) return delta === 1 ? 0 : orderLength - 1;
  return Math.max(0, Math.min(orderLength - 1, idx + delta));
}
