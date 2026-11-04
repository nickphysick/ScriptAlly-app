/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v26 (design-refs/contact-list-v26/) — the CL26 locks, on the rendered page at 1512 × 900 and 1280 × 800.
 * Helpers: cl26Lib.ts. Mutations: `CL26_MUTATE=<lock>`.
 */
import { test } from "@playwright/test";
import { SIZES, openCl26, shotDir, type Open26 } from "./cl26Lib";

test.describe.configure({ mode: "serial" });

const STATES: [string, Open26][] = [
  ["01-page", {}], ["04-grouped-status", { group: "status" }], ["05-sorted-reply", { sort: "reply" }],
  ["06-sorted-added", { sort: "added" }], ["07-no-grouping", { group: "none" }], ["xx-sorted-status", { sort: "status" }], ["03-health-48", { health: 48 }],
];

test("CL26 shots — the page in each state", async ({ page }) => {
  test.setTimeout(400_000);
  for (const [name, o] of STATES) {
    await openCl26(page, SIZES[0], o);
    await page.screenshot({ path: `${shotDir()}/${name}-1512.png` });
  }
  await openCl26(page, SIZES[1]);
  await page.screenshot({ path: `${shotDir()}/02-page-1280.png` });
});
