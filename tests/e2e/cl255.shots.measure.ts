/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.5 — the report's screens from dev, one beside each reference screen (01–08). Writes nothing.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { openCl24, shot } from "./cl255Lib";

const D = JSON.parse(execFileSync("node", ["tests/e2e/cl255Data.mjs"], { encoding: "utf8" })) as { agents: Record<string, unknown>; queries: { agentId: string }[] };
const asked = new Set(D.queries.map((q) => q.agentId));
const NEVER: Set<string> | null = new Set(Object.keys(D.agents).filter((k) => !asked.has(k)));

const card = async (page: Page, pick: string, tab: "profile" | "history") => {
  const ids = await page.evaluate((sel) => [...document.querySelectorAll<HTMLElement>(sel)].filter((r) => r.offsetHeight).map((r) => r.dataset.id ?? ""), pick);
  /* a not-queried row may still have queries on another book: for the reference's panel, take one with none at all */
  const id = pick.includes("'none'") ? (ids.find((i) => !NEVER || NEVER.has(i)) ?? ids[0]) : ids[0];
  const row = page.locator(`[data-cl24='row'][data-id='${id}']`).first();
  await row.scrollIntoViewIfNeeded(); await row.locator("[data-cl252='name']").click(); await page.waitForTimeout(900);
  if (tab === "history") { await page.locator("[data-cl24='panel'] [data-cl24='tab'][data-tab='history']").first().click(); await page.waitForTimeout(500); }
  await page.mouse.move(3, 3);
};
test("CL255 shots", async ({ page }) => {
  test.setTimeout(300_000);
  const vp = { width: 1512, height: 1100 };
  const cases: [string, string][] = [["waiting", "[data-cl24='row'][data-k='agent']"], ["your-move", "[data-cl24='row'][data-k='you']"], ["not-queried", "[data-cl24='row'][data-k='none']"]];
  let n = 1;
  for (const [name, sel] of cases) {
    for (const tab of ["profile", "history"] as const) {
      await openCl24(page, vp);
      await card(page, sel, tab);
      await shot(page, `${String(n).padStart(2, "0")}-${tab}-${name}-1512`); n += 1;
    }
  }
  await openCl24(page, { width: 1512, height: 900 });
  await page.evaluate(() => { const h = document.querySelector<HTMLElement>("[data-cl24='group-head'][data-k='you']"); const sc = [...document.querySelectorAll<HTMLElement>(".agl-wpg .wpg-scroll")].find((e) => e.offsetWidth); if (h && sc) sc.scrollBy(0, h.getBoundingClientRect().top - sc.getBoundingClientRect().top - 140); });
  await page.waitForTimeout(400);
  await shot(page, "07-your-move-header-1512");
  await openCl24(page, { width: 1512, height: 900 }, { full: true });
  await page.waitForTimeout(800);
  await shot(page, "08-full-screen-1512");
});
