/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages restructure — measurement (rail + infographic).
 *
 * ⚠️ THE TARGET IS A LOCAL DEV SERVER, NOT THE DEPLOYED SITE, and that is a deviation from
 * `playwright.config.ts`'s stated design. No deploys are permitted in this run, so a deployed
 * measurement could not contain the change being measured. Set SA_E2E_BASE_URL to the stream's
 * own port (3080) before running. What this keeps: a real browser, the real DOM, real computed
 * styles. What it loses: the bundled stylesheet's cascade order. The built CSS is grepped
 * separately for the same rules, which closes most of that gap.
 */
import { test, expect } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "reports/pkg-restructure";
const ART = "run-artifacts/pkg-restructure";
mkdirSync(OUT, { recursive: true });
mkdirSync(ART, { recursive: true });

const ROUTE = "/manuscripts/packages";

test("recon — current Submission packages page", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  const sbw = await scrollbarWidth(page);

  const shot = `${OUT}/recon-1440.png`;
  await page.screenshot({ path: shot, fullPage: true });

  /* what is actually on the page right now */
  const found = await page.evaluate(() => {
    const q = (s: string) => document.querySelector(s);
    const txt = (s: string) => (q(s)?.textContent ?? "").trim().slice(0, 120);
    const box = (s: string) => {
      const el = q(s) as HTMLElement | null;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    return {
      url: location.pathname,
      hasRoot: !!q(".pkg-root"),
      hasTabs: !!q(".pkgw-tabs"),
      tabLabels: Array.from(document.querySelectorAll(".pkgw-tab")).map((e) => (e.textContent ?? "").trim()),
      hasStrip: !!q(".pkgw-strip"),
      stripText: txt(".pkgw-strip"),
      hasPropill: !!q(".pkgw-propill"),
      title: txt(".wpg-plate h1, .wpg-plate h2, .pkgw h1"),
      plate: box(".wpg-plate"),
      root: box(".pkg-root"),
      /* every filled (non-transparent) control on the page */
      filledControls: Array.from(document.querySelectorAll("button")).filter((b) => {
        const bg = getComputedStyle(b).backgroundColor;
        return bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent";
      }).map((b) => ({ t: (b.textContent ?? "").trim().slice(0, 30), bg: getComputedStyle(b).backgroundColor })),
    };
  });

  writeFileSync(`${ART}/recon.txt`,
    `SCROLLBAR WIDTH: ${sbw}px\n` + JSON.stringify(found, null, 2) + "\n");
  console.log(`scrollbar=${sbw}px`);
  console.log(JSON.stringify(found, null, 2));
  expect(found.hasRoot).toBe(true);
});
