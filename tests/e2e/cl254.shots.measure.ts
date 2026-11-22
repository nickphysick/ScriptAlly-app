/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.4 — the report's screens from dev, one beside each reference screen. Writes nothing to the account
 * except the sparse fixtures (`seedCl254Sparse.mjs`), removed in the same run.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { openCl24, shot } from "./cl254Lib";

const toGroup = async (page: Page, k: string | null, sel?: string) => {
  await page.evaluate(([g, s]) => {
    const el = s ? document.querySelector<HTMLElement>(s) : g ? document.querySelector<HTMLElement>(`[data-cl24='group-head'][data-k='${g}']`) : document.querySelector<HTMLElement>("[data-cl25='title']");
    const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth);
    if (el && sc) sc.scrollBy(0, el.getBoundingClientRect().top - sc.getBoundingClientRect().top - 120);
  }, [k, sel ?? ""]);
  await page.waitForTimeout(500);
  await page.mouse.move(3, 3);
};

test("CL254 shots", async ({ page }) => {
  test.setTimeout(300_000);
  execFileSync("node", ["tests/e2e/seedCl254Sparse.mjs"]);
  try {
    for (const vp of [{ width: 1512, height: 900 }, { width: 1280, height: 800 }]) {
      await openCl24(page, vp);
      await toGroup(page, null);
      await shot(page, `01-rows-sparse-${vp.width}`);
    }
    await openCl24(page, { width: 1512, height: 900 });
    await toGroup(page, "agent");
    await shot(page, "02-rows-full-1512");
    await toGroup(page, null, "[data-cl24='row'][data-id='cl254fx-rep']");
    await shot(page, "03-not-queried-1512");
  } finally { execFileSync("node", ["tests/e2e/seedCl254Sparse.mjs", "--clean"]); }
});
