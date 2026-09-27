/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * A comp write that cannot fail silently (comps v2 Phase 5).
 *
 * ⚠️ THE FAULT IT CLOSES: every comp write on Comparable titles was `void updateManuscript(…)`
 * (App shell v3 report, ComparableTitlesPage.tsx ~572). `updateManuscript` rethrows through
 * `handleFirestoreError`, so a denied or refused write became an unhandled rejection and the page
 * went on showing a change that had not happened.
 *
 * `runWrite` awaits the write, NEVER rejects, and hands a failure to `onFail` — the page reverts its
 * optimistic change there and says so. Resolves `true` when the write landed.
 */
export const SAVE_FAILED = "Couldn't save that change. Check your connection and try again.";

export async function runWrite(write: () => Promise<unknown>, onFail: (e: unknown) => void): Promise<boolean> {
  try {
    await write();
    return true;
  } catch (e) {
    onFail(e);
    return false;
  }
}
