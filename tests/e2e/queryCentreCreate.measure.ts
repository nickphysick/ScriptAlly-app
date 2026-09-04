/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 5 — the log-a-query journey, reachable, with its ghost.
 *
 * ⚠️ THE REACHABILITY CLAIM IS THE POINT OF THIS FILE. Phase 4 moved the grid to always-on and left
 * this journey inside the branch that stopped rendering, so `Log new query` set a flag and drew
 * nothing — through a clean typecheck and a green suite, because nothing asserted that clicking the
 * app's one creative verb DOES something. It does now.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { writeFileSync, mkdirSync } from "node:fs";

test("Log new query opens the journey, and the ghost previews it", async ({ page }) => {
  const out: Record<string, unknown> = {};
  mkdirSync("reports", { recursive: true });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });

  const survey = () => page.evaluate(() => {
    const cards = [...document.querySelectorAll<HTMLElement>(".qcc")];
    const ghost = document.querySelector(".qcc--ghost") as HTMLElement | null;
    const foot = document.querySelector(".qcc-foot")?.textContent ?? "";
    return {
      journeyOpen: /logging new query/i.test(document.body.innerText),
      cardCount: cards.length,
      ghostPresent: !!ghost,
      ghostIsFirst: !!ghost && cards[0] === ghost,
      ghostHidden: ghost?.getAttribute("aria-hidden") === "true",
      ghostIsButton: ghost?.tagName === "BUTTON",
      ghostFocusable: !!ghost && ghost.matches("button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"),
      foot,
    };
  });

  out.before = await survey();
  /* ⚠️ THE HERO'S PILL — the single entry point. Nothing in the page's own controls opens this. */
  await page.locator(".wsh-cta").first().click();
  await page.waitForTimeout(1400);
  out.after = await survey();
  writeFileSync("reports/query-centre-create.json", JSON.stringify(out, null, 2));

  const before = out.before as Record<string, never>;
  const after = out.after as Record<string, never>;

  expect(before.journeyOpen as unknown as boolean, "the journey was already open").toBe(false);
  expect(after.journeyOpen as unknown as boolean,
    "Log new query opened nothing — the journey is unreachable").toBe(true);

  /* ── the ghost ── */
  expect(after.ghostPresent as unknown as boolean, "no ghost tile").toBe(true);
  expect(after.ghostIsFirst as unknown as boolean, "the ghost is not at index 0").toBe(true);
  /* ⚠️ HIDDEN AND INERT: announcing a half-written record would state it as one. */
  expect(after.ghostHidden as unknown as boolean, "the ghost is exposed to assistive technology").toBe(true);
  expect(after.ghostIsButton as unknown as boolean, "the ghost is clickable").toBe(false);
  expect(after.ghostFocusable as unknown as boolean, "the ghost takes focus").toBe(false);

  /* ⚠️ AND IT IS NEVER COUNTED. A preview that added itself to the tally would state one more query
     than the writer has — the same class as a card inventing a figure. */
  const n = (s: string) => Number((s.match(/Showing\s+(\d+)/i) ?? [])[1] ?? NaN);
  expect(n(after.foot as unknown as string),
    "the ghost was counted in the footer").toBe(n(before.foot as unknown as string));
  expect(after.cardCount as unknown as number,
    "the ghost did not appear in the grid").toBe((before.cardCount as unknown as number) + 1);
});
