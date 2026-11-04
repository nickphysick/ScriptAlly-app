/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26.2 (design-refs/contact-list-v26-2/) — the CL262 locks, at 1512 × 900 and 1280 × 800. Helpers:
 * cl262Lib.ts. Mutations: `CL262_MUTATE=<lock>`.
 */
import { test } from "@playwright/test";
import { SIZES, openCard, shotDir } from "./cl262Lib";

test.describe.configure({ mode: "serial" });

test("CL262 shots — the card", async ({ page }) => {
  test.setTimeout(240_000);
  for (const [name, stand] of [["01-card-you", "you"], ["02-card-none", "none"]] as const) {
    await openCard(page, SIZES[0], { stand });
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
});
