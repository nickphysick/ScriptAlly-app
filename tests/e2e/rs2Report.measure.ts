/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v2 — the report's shots, one beside each design-refs/responses-v4/screens/* file, plus 1920 and 1024.
 * `RS2_SET=base` takes the shots on the account's own manuscripts; `RS2_SET=fixtures` the ones that need seedRs2.mjs
 * (it seeds and cleans itself). Not a lock.
 */
import { test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/responses-v2/shots";
const SET = process.env.RS2_SET ?? "base";
const SCROLLER = `[...document.querySelectorAll('.wpg-scroll')].find((x) => x.querySelector('[data-rsp="page"]'))`;
type Shot = { name: string; ms: string; sizes: { width: number; height: number }[]; go?: (p: Page) => Promise<void> };
const W2 = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const W1 = [{ width: 1512, height: 900 }];
const toSel = async (p: Page, sel: string, off = 0) => {
  await p.evaluate(`(() => { const s = ${SCROLLER}; const e = document.querySelector('${sel}'); s.scrollTop += e.getBoundingClientRect().top - s.getBoundingClientRect().top - ${off}; })()`);
  await p.waitForTimeout(600);
};
const BASE: Shot[] = [
  { name: "01-top", ms: "seed-ms-1", sizes: W2 },
  { name: "02-carousel", ms: "seed-ms-1", sizes: W2, go: (p) => toSel(p, '[data-rsp="carousel"]', 20) },
  { name: "03-carousel-next", ms: "seed-ms-1", sizes: W2, go: async (p) => { await toSel(p, '[data-rsp="carousel"]', 20); await p.locator('[data-rsp="next"]').click(); await p.waitForTimeout(900); } },
  { name: "04-tally-and-nos", ms: "seed-ms-1", sizes: W2, go: (p) => toSel(p, '[data-rsp="banner"]', 0) },
  { name: "05-filtered-passed", ms: "seed-ms-1", sizes: W2, go: async (p) => { await p.locator('[data-rsp="card-row"][data-k="passed"]').click(); await toSel(p, '[data-rsp="list"]', 30); } },
  { name: "06-panel-request", ms: "seed-ms-1", sizes: W2, go: async (p) => { await toSel(p, '[data-rsp="carousel"]', 20); await p.locator('[data-rsp="pcard-open"]').first().click(); await p.waitForTimeout(900); } },
  { name: "07-panel-no-feedback", ms: "seed-ms-1", sizes: W2, go: async (p) => { await toSel(p, '[data-rsp="list"]', 30); await p.locator('[data-rsp="row"]').first().click({ position: { x: 30, y: 20 } }); await p.waitForTimeout(900); } },
  { name: "08-panel-timeline", ms: "seed-ms-1", sizes: W1, go: async (p) => { await toSel(p, '[data-rsp="list"]', 30); await p.locator('[data-rsp="row"]').first().click({ position: { x: 30, y: 20 } }); await p.waitForTimeout(700); await p.locator('[data-rsn-tab="time"]').click(); await p.waitForTimeout(1200); } },
  { name: "09-act-record", ms: "seed-ms-1", sizes: W1, go: async (p) => { await toSel(p, '[data-rsp="carousel"]', 20); await p.locator('[data-rsp="pcard"][data-state="sent"] [data-rsp="pcard-act"]').first().click(); await p.waitForTimeout(1200); } },
  { name: "10-share", ms: "seed-ms-1", sizes: W2, go: (p) => toSel(p, '[data-rsp="share"]', 30) },
  { name: "11-header-picker", ms: "seed-ms-1", sizes: W1, go: async (p) => { await p.locator('[data-rsp="record"]').click(); await p.waitForTimeout(1200); } },
  { name: "13-zero-nos", ms: "seed-ms-2", sizes: W1, go: (p) => toSel(p, '[data-rsp="banner"]', 0) },
  { name: "x-1920", ms: "seed-ms-1", sizes: [{ width: 1920, height: 1080 }] },
  { name: "x-1920-list", ms: "seed-ms-1", sizes: [{ width: 1920, height: 1080 }], go: (p) => toSel(p, '[data-rsp="banner"]', 0) },
  { name: "x-1024", ms: "seed-ms-1", sizes: [{ width: 1024, height: 768 }] },
  { name: "x-1024-list", ms: "seed-ms-1", sizes: [{ width: 1024, height: 768 }], go: (p) => toSel(p, '[data-rsp="list"]', 20) },
];
const FIX: Shot[] = [
  { name: "11-top-140", ms: "rs2-ms-140", sizes: W1 },
  { name: "12-pinned-140", ms: "rs2-ms-140", sizes: W1, go: async (p) => { await toSel(p, '[data-rsp="list"]', -1400); } },
  { name: "14-two-nos", ms: "rs2-ms-two", sizes: W1, go: (p) => toSel(p, '[data-rsp="banner"]', 0) },
  { name: "14b-two-carousel", ms: "rs2-ms-two", sizes: W1, go: (p) => toSel(p, '[data-rsp="carousel"]', 20) },
  { name: "06b-panel-personal-note", ms: "rs2-ms-two", sizes: W1, go: async (p) => { await toSel(p, '[data-rsp="list"]', 30); await p.locator('[data-rsp="row"][data-id="rs2-q-note"]').click({ position: { x: 30, y: 20 } }); await p.waitForTimeout(900); } },
  { name: "15-empty", ms: "rs2-ms-empty", sizes: W1 },
  { name: "16-empty-lower", ms: "rs2-ms-empty", sizes: W1, go: (p) => toSel(p, '[data-rsp="ways"]', 160) },
  { name: "17-top-390", ms: "seed-ms-1", sizes: [{ width: 390, height: 844 }] },
  { name: "18-carousel-390", ms: "seed-ms-1", sizes: [{ width: 390, height: 844 }], go: (p) => toSel(p, '[data-rsp="carousel"]', 20) },
];

if (SET === "fixtures") {
  test.beforeAll(() => { execFileSync("node", ["tests/e2e/seedRs2.mjs"], { stdio: "inherit" }); });
  test.afterAll(() => { execFileSync("node", ["tests/e2e/seedRs2.mjs", "--clean"], { stdio: "inherit" }); });
}
for (const s of SET === "fixtures" ? FIX : BASE) {
  test(`shot ${s.name}`, async ({ page }) => {
    test.setTimeout(240_000);
    mkdirSync(DIR, { recursive: true });
    for (const size of s.sizes) {
      await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, s.ms);
      if (size.width <= 760) { await openRoute(page, "/queries/responses", { width: 1440, height: 900 }); await page.setViewportSize(size); await page.reload(); }
      else await openRoute(page, "/queries/responses", size);
      await page.locator('[data-rsp="page"]').waitFor();
      await page.waitForTimeout(1500);
      if (s.go) await s.go(page);
      await page.screenshot({ path: `${DIR}/${s.name}-${size.width}.png` });
      await page.keyboard.press("Escape").catch(() => {});
      await page.keyboard.press("Escape").catch(() => {});
    }
  });
}
