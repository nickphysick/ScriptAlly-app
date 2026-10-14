/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * hkReviewAid — DEV ONLY (Contact list v17.1). `window.__SA_HK_ALL_FILLED = true` before the page mounts runs
 * Housekeeping's own model over only the agents that already have no gap, so List health reads 100% and the tab
 * has nothing to show. It fabricates INPUT, never output: the ring, the words and the tab all come out of the real
 * derivation. The call site is gated on `import.meta.env.MODE`, so a production build carries none of this.
 */
export const hkAllFilled = (): boolean =>
  typeof window !== "undefined" && (window as unknown as { __SA_HK_ALL_FILLED?: unknown }).__SA_HK_ALL_FILLED === true;
