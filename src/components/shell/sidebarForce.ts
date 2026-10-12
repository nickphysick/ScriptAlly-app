/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A page may hold the sidebar at its icons for a while (a full-screen list), and let go.
 *
 * ⚠️ A HOLD, NEVER A WRITE. The writer's own choice lives in `useSidebarCollapsed` (state and
 * localStorage). A page that wrote that would have to remember what it overwrote and put it back,
 * and a reload in between would lose the answer. While a hold is on, the sidebar reads collapsed;
 * the moment it is released the sidebar is whatever the writer left it — nothing to restore.
 *
 * Module scope, like `drawerStore`: nothing to mount, so nothing to forget.
 */
let holders = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Hold the sidebar collapsed. Returns the release; calling it twice releases once. */
export function holdSidebarCollapsed(): () => void {
  let live = true;
  holders++;
  emit();
  return () => {
    if (!live) return;
    live = false;
    holders = Math.max(0, holders - 1);
    emit();
  };
}

/** Drop every hold (the writer pressed the sidebar's own toggle: their choice wins). */
export function releaseSidebarHolds(): void {
  if (holders === 0) return;
  holders = 0;
  emit();
}

export const sidebarHeld = (): boolean => holders > 0;
export const subscribeSidebarHold = (l: () => void): (() => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
