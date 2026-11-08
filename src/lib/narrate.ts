/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NARRATION NEVER DECIDES WHETHER AN ACTION SUCCEEDED (timeline writer fix v1, 8 Nov 2026).
 *
 * The activity feed entry written after a save is narration: the save already landed, and the
 * entry only tells the story. `narrate` runs it after the write and turns ANY failure — a resolved
 * `{ success: false }` or a thrown error — into a console line, so the caller's own result is
 * decided by its own write alone. addActivity no longer throws, but this does not depend on it.
 */
export async function narrate(write: () => Promise<{ success: boolean; error?: string } | unknown>, what: string): Promise<void> {
  try {
    const r = await write();
    if (r && typeof r === "object" && "success" in r && (r as { success: boolean }).success === false) {
      console.error(`[feed] ${what}: the entry was not written (${(r as { error?: string }).error ?? "unknown error"}); the action itself stands.`);
    }
  } catch (e) {
    console.error(`[feed] ${what}: the entry was not written (${e instanceof Error ? e.message : String(e)}); the action itself stands.`);
  }
}
