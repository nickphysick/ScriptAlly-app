/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2 pairs — every shot in design-refs/phone-round-two-v1/shots/ beside the app at the same place, at 390 × 844 and
 * 360 × 780, written to reports/phone-round-two-v1/pairs/<shot>-<width>.png (board left, app right, at the app's scale).
 * The board's sample names and numbers are illustrative; the app's are the harness account's. Read-only: nothing here
 * writes. Pixel (Chromium) only — the pairs are a picture, not a lock.
 */
import { test, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { go, phone } from "./pr2Lib";
import { engine } from "./touch";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as {
  PNG: { new (o: { width: number; height: number }): { data: Buffer; width: number; height: number }; sync: { read(b: Buffer): { width: number; height: number; data: Buffer }; write(p: unknown): Buffer } };
};
const OUT = "reports/phone-round-two-v1/pairs";

/** nearest-neighbour scale of an RGBA image to a given width */
function scaleTo(src: { width: number; height: number; data: Buffer }, w: number) {
  const k = src.width / w, h = Math.round(src.height / k);
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const si = (Math.min(src.height - 1, Math.floor(y * k)) * src.width + Math.min(src.width - 1, Math.floor(x * k))) * 4, di = (y * w + x) * 4;
    src.data.copy(out.data, di, si, si + 4);
  }
  return out;
}
function pair(boardFile: string, app: Buffer, file: string) {
  const a0 = PNG.sync.read(app);
  const b = scaleTo(PNG.sync.read(readFileSync(boardFile)), a0.width);
  const gap = 24, w = b.width + gap + a0.width, h = Math.max(b.height, a0.height);
  const out = new PNG({ width: w, height: h });
  out.data.fill(255);
  const blit = (img: { width: number; height: number; data: Buffer }, ox: number) => {
    for (let y = 0; y < img.height; y++) img.data.copy(out.data, (y * w + ox) * 4, y * img.width * 4, (y + 1) * img.width * 4);
  };
  blit(b, 0); blit(a0, b.width + gap);
  writeFileSync(file, PNG.sync.write(out));
}

type Place = (page: Page) => Promise<void>;
const at = (path: string, sel?: string): Place => async (page) => {
  await go(page, path); await page.waitForTimeout(700);
  if (sel) { const el = page.locator(sel).first(); if (await el.count()) { await el.scrollIntoViewIfNeeded(); await page.evaluate(() => document.getElementById("app-stage-scroll")?.scrollBy(0, -12)); await page.waitForTimeout(400); } }
};
const PLACES: Record<string, Place> = {
  "1C-queries-band-filters": at("/queries"),
  "1C-queries-filtered": async (page) => { await at("/queries")(page); await page.locator('[data-pa="band-tile"][data-key="you"]').tap(); await page.waitForTimeout(400); },
  "2A-activity-page": at("/dashboard?activity=1"),
  "2A-home-activity": at("/dashboard", '[data-pa="home-activity"]'),
  "2B-home-todo": at("/dashboard", '[data-pa="home-todo-head"]'),
  "3A-hub-top": at("/queries/packages"),
  "3A-hub-middle": at("/queries/packages", '[data-pa="pk-list"]'),
  "3A-hub-shelves": at("/queries/packages", '[data-pa="pk-shelf"][data-kind="ver"]'),
  "3D-agents": at("/agents"),
  "3D-agents-tiles": at("/agents", '[data-pa="ag-tiles"]'),
  "4A-todo": at("/todo"),
  "4A-whats-landing": at("/queries/packages", '[data-pa="pk-land"]'),
  "5B-builder": at("/queries/packages?build=new"),
  "comps": at("/queries/packages?comps=1"),
  "comps-in-letter": async (page) => { await at("/queries/packages")(page); const id = await page.locator('[data-pa="pk-shelf"][data-kind="let"] [data-pa="pk-sheet"]').first().getAttribute("data-id"); await at(`/queries/packages?compsin=${id}`)(page); },
  "letter": async (page) => { await at("/queries/packages")(page); const id = await page.locator('[data-pa="pk-shelf"][data-kind="let"] [data-pa="pk-sheet"]').first().getAttribute("data-id"); await at(`/queries/packages?mat=${id}`)(page); },
  "editor": async (page) => { await at("/queries/packages")(page); const id = await page.locator('[data-pa="pk-shelf"][data-kind="let"] [data-pa="pk-sheet"]').first().getAttribute("data-id"); await at(`/queries/packages?edit=${id}`)(page); },
  "package": async (page) => { await at("/queries/packages")(page); await page.locator('[data-pa="pk-row"][data-stage="out"]').first().tap(); await page.waitForTimeout(700); },
  "version": async (page) => { await at("/queries/packages")(page); const id = await page.locator('[data-pa="pk-shelf"][data-kind="ver"] [data-pa="pk-sheet"]').first().getAttribute("data-id"); await at(`/queries/packages?ver=${id}`)(page); },
  "log-what-did-you-send": async (page) => {
    await at("/queries")(page);
    await page.locator('[data-pa="plus"]').tap(); await page.locator('[data-pa="plus-sent"]').tap();
    await page.locator('.pa-flow[data-pf="log"]').waitFor({ timeout: 15_000 });
    await page.locator("[data-qad-agent-input]").fill("a"); await page.waitForTimeout(500);
    await page.locator("[data-qad-sugg] button").first().tap();
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(450);
      if ((await page.evaluate(() => document.querySelector("[data-pf-step]")?.getAttribute("data-pf-step"))) === "What you sent") break;
      const pri = page.locator('[data-pf="primary"]');
      if (await pri.count() && await pri.isEnabled()) await pri.tap(); else await page.locator("[data-pf-step] button").first().tap();
    }
  },
};

test("PR2 pairs: every board shot beside the app, at 390 and 360", async ({ page }) => {
  test.skip(engine(page) !== "chromium", "the pairs are taken on the Pixel");
  test.setTimeout(900_000);
  mkdirSync(OUT, { recursive: true });
  await phone(page, "/dashboard");
  for (const [w, h] of [[390, 844], [360, 780]] as const) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, place] of Object.entries(PLACES)) {
      try { await place(page); } catch { /* a place that cannot be reached is still paired, with whatever is on screen */ }
      pair(`design-refs/phone-round-two-v1/shots/${name}.png`, await page.screenshot(), `${OUT}/${name}-${w}.png`);
      /* leave a flow by its ×, and discard what it holds — Escape would PARK it (decision 8) */
      if (await page.locator(".pa-flow").count()) {
        await page.locator('.pa-flow [data-pf="close"]').tap().catch(() => {}); await page.waitForTimeout(300);
        const discard = page.locator(".pa-flow button").filter({ hasText: /^Discard$/ });
        if (await discard.count()) { await discard.first().tap().catch(() => {}); await page.waitForTimeout(300); }
      }
    }
  }
});
