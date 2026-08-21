/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the broadsheet layout, driven.
 * ⚠️ Every selector scoped inside `.pkg-root`; workspace pages stay mounted and toggle `display`.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "reports/pkg-broadsheet"; const ART = "run-artifacts/pkg-broadsheet";
mkdirSync(OUT, { recursive: true }); mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";

test("recon — the page after the header session's rework", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    if (!root) return { error: "no .pkg-root" };
    const box = (s) => { const el = root.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
    return {
      masthead: box(".wsh") || box(".wsh-wrap"),
      scroller: box(".wpg-scroll"),
      controlRow: box(".wpg-tools") || box("[class*=wpg-control]"),
      railPresent: !!root.querySelector(".pkgo-rail"),
      railPanels: Array.from(root.querySelectorAll(".pkgo-rail .pkgo-lbl")).map((l) => (l.textContent||"").trim()),
      tiles: root.querySelectorAll(".pkgf-tile:not(.pkgf-tile--ghost)").length,
      dashboard: !!root.querySelector(".pkgf-statstrip"),
      classesOnScrollChildren: Array.from(root.querySelector(".wpg-scroll")?.children ?? [])
        .map((c) => c.className?.toString().slice(0, 40)),
    };
  })()`);
  await page.screenshot({ path: `${OUT}/recon-1440.png`, fullPage: true });
  writeFileSync(`${ART}/recon.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});
