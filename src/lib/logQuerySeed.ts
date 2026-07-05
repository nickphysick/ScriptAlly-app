/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log-a-Query manuscript preselect — the resolution rule behind LogQueryFocusForm's
 * `initialManuscriptId` seam (the manuscripts-page mirror of the agents seam, `abd4d87`).
 *
 * Seeds only when the id is actually IN the picker — overlay-shelved books are excluded by
 * pickableManuscripts (lifecycle.ts), so an unpickable id falls back silently to today's
 * default: the first pickable manuscript, or "" with an empty library. Preselection is a
 * starting value, never a lock — the picker stays editable either way.
 */
export function resolveInitialManuscriptId(
  initialId: string | undefined,
  pickable: { id: string }[]
): string {
  if (initialId && pickable.some((m) => m.id === initialId)) return initialId;
  return pickable.length > 0 ? pickable[0].id : "";
}
