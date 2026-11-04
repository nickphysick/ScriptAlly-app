/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/) — the CL26 locks, on the rendered page at 1512 × 900 and 1280 × 800.
 * Helpers: cl26Lib.ts. Mutations: `CL26_MUTATE=<lock>`.
 */
import { test } from "@playwright/test";
import { SIZES, openCl26, shotDir } from "./cl26Lib";

test.describe.configure({ mode: "serial" });

test("CL26 shots — the page at both sizes", async ({ page }) => {
  test.setTimeout(240_000);
  for (const vp of SIZES) {
    await openCl26(page, vp);
    await page.screenshot({ path: `${shotDir()}/page-${vp.width}.png` });
  }
});
