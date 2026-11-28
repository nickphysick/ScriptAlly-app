/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.4 — the list's one short arrival. It arms ONCE when the list goes from loading (or a first mount)
 * to content, and a timer clears it 700ms later — a timer, never animationend. While content is already showing,
 * nothing re-arms it: a filter, a sort, a grouping, the view switch or a selection never replays it. Under reduced
 * motion it is never set. Pure, so its timing is tested with fake timers (qcv1724.test.tsx); QcPage151 feeds it the
 * loading flag and puts `data-en172="stagger"` on the list and the rail column while it is on.
 */
export const EN172_MS = 700;

export interface Arrival172 {
  /** the list's loading flag, on every change: true while loading, false once content is drawn */
  update(loading: boolean): void;
  /** clears a pending timer (the page unmounting) */
  dispose(): void;
}

export function arrival172(set: (on: boolean) => void, reduced: () => boolean, ms = EN172_MS): Arrival172 {
  let fromLoading = true;
  let t: ReturnType<typeof setTimeout> | null = null;
  return {
    update(loading) {
      if (loading) { fromLoading = true; return; }
      if (!fromLoading) return;
      fromLoading = false;
      if (reduced()) return;
      if (t) clearTimeout(t);
      set(true);
      t = setTimeout(() => { t = null; set(false); }, ms);
    },
    dispose() { if (t) { clearTimeout(t); t = null; } },
  };
}
