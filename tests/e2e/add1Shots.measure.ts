/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retire the add-agent pop-up — the report's screenshots: the slide-in new-agent panel opened from the Dashboard (the
 * header's "Add an agent" at 1512; the top bar's capture at 1280, where the header button is hidden by design), from the
 * Query Centre (Log a query's picker: the panel over the drawer, the typed name carried in) and from Discover (the top
 * bar's capture), at 1512 × 900 and 1280 × 800. Nothing is saved: every panel is cancelled and the log discarded.
 * The Contact list's page guide is marked seen for the shots and put back exactly.
 */
import { test } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const OUT = "reports/retire-add-agent-modal/shots";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const sh = (c: string) => execSync(c, { encoding: "utf8" });

test("ADD1 shots · the new-agent panel from the Dashboard, the Query Centre and Discover", async ({ page }) => {
  test.setTimeout(420_000);
  mkdirSync(OUT, { recursive: true });
  const g0 = sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
  const q0 = sh("node tests/e2e/guideFlags.mjs --page queries").trim().split("\n").pop()!;
  const vis = (s: string) => page.locator(s).filter({ visible: true }).first();
  const panel = () => vis("[data-ap='panel-new'] [data-ap='edit']").waitFor({ timeout: 8000 });
  const cancel = async () => {
    await vis("[data-ap='panel-new'] [data-ae='cancel']").click();
    await page.waitForTimeout(300);
    if (await page.locator("[data-ap='panel-new'] [data-ae='discard']").filter({ visible: true }).count()) await vis("[data-ap='panel-new'] [data-ae='discard']").click();
    await page.waitForTimeout(500);
  };
  const capture = async () => { await vis(".ws-capr").click(); await page.waitForTimeout(300); await vis("[data-cap='agent']").click(); };
  try {
    sh("node tests/e2e/guideFlags.mjs --seen");
    for (const vp of SIZES) {
      await openRoute(page, "/dashboard", vp);
      if (vp.width >= 1440) await vis("[data-d58='btn-agent']").click(); else await capture();
      await panel(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/dashboard-${vp.width}.png` });
      await cancel();

      await openRoute(page, "/queries", vp);
      await vis(".ws-capl").click();
      await vis("[data-qad-agent-input]").fill("Imogen Ashcombe");
      await page.waitForTimeout(400);
      await vis("[data-qad-new-agent]").dispatchEvent("mousedown");
      await panel(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/query-centre-log-${vp.width}.png` });
      await cancel();
      await vis("[data-qad-drawer='log'] .qad-dx").click();
      await page.waitForTimeout(400);
      if (await page.locator("[data-qad-drawer='log'] .disc").filter({ visible: true }).count()) await vis("[data-qad-drawer='log'] .disc").click();
      await page.waitForTimeout(500);

      await openRoute(page, "/agents/discover", vp);
      await capture();
      await panel(); await page.waitForTimeout(700);
      await page.screenshot({ path: `${OUT}/discover-${vp.width}.png` });
      await cancel();
    }
  } finally {
    await new Promise((r) => setTimeout(r, 1500));
    sh(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
    sh(`node tests/e2e/guideFlags.mjs --page queries --restore '${q0}'`);
  }
});
