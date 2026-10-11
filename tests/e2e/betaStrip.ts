/**
 * The beta strip and the two "out of scope" header locks (import-truth, lock H1).
 *
 * The strip is mounted above the shell on every workspace route while the beta runs, and it is
 * there by design. It is 41.8px tall, so it pushes every header down by that much. The baselines
 * of headerPanelV2 P2 and headerV3 H11 were captured with no strip, so both locks read "moved by
 * 41.8" on four correct pages.
 *
 * A header's place is now measured FROM BELOW THE STRIP when it is shown: the strip's bottom edge
 * is taken off the header's y. A header that really moves still fails (its y under the strip
 * changes); the strip arriving or going no longer does.
 *
 * `H1_MUTATE=pagetop` measures from the page's top again (the lock's own mutation).
 * `H1_MUTATE=shift4` moves the shell 4px down under the strip, to show the locks still catch a move.
 */
import type { Page } from "@playwright/test";

/** The bottom edge of the beta strip when it is on screen, else 0. */
export async function stripOffset(page: Page): Promise<number> {
  const shown = await page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".sa-betastrip");
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r.bottom : 0;
  });
  return process.env.H1_MUTATE === "pagetop" ? 0 : shown;
}
/** Whether the strip is on screen at all (not affected by the mutation). */
export async function stripShown(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const el = document.querySelector<HTMLElement>(".sa-betastrip");
    return !!el && el.getBoundingClientRect().height > 0;
  });
}
/** [left, top, width, height] with the top measured from below the strip. */
export function underStrip<T extends number[] | null | undefined>(box: T, off: number): T {
  if (!box) return box;
  const out = [...box]; out[1] = Math.round((out[1] - off) * 10) / 10;
  return out as T;
}
/** The move mutation: the whole shell under the strip (bar and page) sits 4px lower. The strip does
 *  not move, so the offset is unchanged and the header's place under it is 4px out. */
export async function applyShift(page: Page): Promise<void> {
  if (process.env.H1_MUTATE !== "shift4") return;
  await page.addStyleTag({ content: ".ws-app { position: relative !important; top: 4px !important; }" });
  await page.waitForTimeout(100);
}
