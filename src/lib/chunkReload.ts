/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A tab opened before a deploy asks for the previous build's hashed chunk after it. That file is
 * gone, so the import fails and the page is left half-drawn. Reloading fetches the new index.html
 * and the new chunks. This reloads ONCE: the time is kept in sessionStorage, and a second failure
 * inside the window is left alone, so a deploy that is really broken cannot loop. Where storage is
 * unavailable it does nothing, for the same reason.
 */
export const CHUNK_RELOAD_KEY = "sa.chunkReloadAt";
export const CHUNK_RELOAD_WINDOW_MS = 10_000;

type Deps = {
  storage: { getItem(k: string): string | null; setItem(k: string, v: string): void };
  now: () => number;
  reload: () => void;
};

export function reloadOnceForStaleChunk(deps?: Deps): boolean {
  const d: Deps = deps ?? { storage: window.sessionStorage, now: Date.now, reload: () => window.location.reload() };
  try {
    const last = Number(d.storage.getItem(CHUNK_RELOAD_KEY) || 0);
    const t = d.now();
    if (last && t - last < CHUNK_RELOAD_WINDOW_MS) return false;
    d.storage.setItem(CHUNK_RELOAD_KEY, String(t));
  } catch {
    return false;
  }
  d.reload();
  return true;
}
