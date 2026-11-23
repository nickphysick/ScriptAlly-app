/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 — the compare sheet's frames, the same spec on the base and on the branch (LAQ23_TAG=before|after):
 * a narrow card (1280) and a wide card (1512) with the materials tile, the pop-up opened from the narrow card's tile, the
 * Dashboard's Sent card with and without undated queries (seedLaq2 + 21 [+ 22]), and the held task on the To-do page.
 * No assertions: tests/e2e/laqV23.measure.ts holds the locks. Reads only DOM hooks both builds have.
 */
import { test, type Browser, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const TAG = process.env.LAQ23_TAG ?? "after";
const OUT = `reports/log-a-query-v2-3/compare/${TAG}`;
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
const PAGE = ".qc151.qc153";
test.setTimeout(900_000);
mkdirSync(OUT, { recursive: true });

async function ctx(browser: Browser, vp: { width: number; height: number }) {
  const c = await browser.newContext({ baseURL: BASE, viewport: vp });
  const p = await c.newPage();
  await p.addInitScript(() => {
    try {
      localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1");
      sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511");
    } catch { /* private */ }
  });
  await p.goto("/dashboard");
  await ensureSignedIn(p);
  return { c, p };
}
async function grid(p: Page) {
  await p.goto("/queries");
  await p.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = p.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true") await b.evaluate((e) => (e as HTMLElement).click());
  await p.locator(`${PAGE} [data-qc154="card"]`).first().waitFor({ state: "visible", timeout: 60_000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(900);
  await p.mouse.move(2, 2);
}
/** the same card on both builds: the first on show with a tile and an "over a year ago" line (the longest Sent words) */
const pick = (p: Page) => p.evaluate((root) => {
  const cs = [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0 && c.querySelector('[data-pc3="tile"]'));
  return (cs.find((c) => /over a year ago/.test(c.querySelector('[data-k="sent"]')?.textContent ?? "")) ?? cs[0])?.dataset.id ?? null;
}, PAGE);
async function frameCard(p: Page, id: string, name: string) {
  const el = p.locator(`${PAGE} [data-qc154="card"][data-id="${id}"] >> visible=true`).first();
  await el.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
  await p.waitForTimeout(300);
  const b = (await el.boundingBox())!;
  await p.screenshot({ path: `${OUT}/${name}.png`, clip: { x: b.x - 10, y: b.y - 16, width: b.width + 20, height: b.height + 26 } });
  return el;
}

test("V23 shots · narrow and wide cards, the pop-up from the narrow card", async ({ browser }) => {
  for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 982 }]) {
    const { c, p } = await ctx(browser, vp);
    await grid(p);
    const id = await pick(p);
    if (id) {
      const el = await frameCard(p, id, `card-${vp.width}`);
      if (vp.width === 1280) {
        const t = (await el.locator('[data-pc3="tile"]').boundingBox())!;
        await p.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 3 });
        await p.waitForTimeout(600);
        const h = await p.locator('[data-pc3="hover"]').boundingBox();
        const cb = (await el.boundingBox())!;
        const x0 = Math.max(0, Math.min(cb.x, h?.x ?? cb.x) - 12), y0 = Math.max(0, Math.min(cb.y, h?.y ?? cb.y) - 18);
        const x1 = Math.min(vp.width, Math.max(cb.x + cb.width, (h?.x ?? 0) + (h?.width ?? 0)) + 12), y1 = Math.min(vp.height, Math.max(cb.y + cb.height, (h?.y ?? 0) + (h?.height ?? 0)) + 12);
        await p.screenshot({ path: `${OUT}/popup-${vp.width}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } });
      }
    }
    await c.close();
  }
});

const SEED = (extra: string) => execSync(`node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs${extra}`, { stdio: "ignore", timeout: 180_000 });
async function sentShot(browser: Browser, name: string) {
  const { c, p } = await ctx(browser, { width: 1512, height: 982 });
  await p.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq2-ms"); } catch { /* none */ } });
  await p.goto("/dashboard");
  const tog = p.locator('.d2 [data-d2="chart-toggle"] button[data-m="sent"]');
  await tog.waitFor({ state: "visible", timeout: 60_000 });
  await p.waitForTimeout(900);
  await tog.click();
  await p.waitForTimeout(800);
  const card = p.locator('.d2 [data-d2-card="active"]').first();
  await card.scrollIntoViewIfNeeded();
  await card.screenshot({ path: `${OUT}/${name}.png`, animations: "disabled" });
  return { c, p };
}

test("V23 shots · the Dashboard's Sent card, with and without undated queries; the held task on the To-do page", async ({ browser }) => {
  try {
    SEED("");
    let r = await sentShot(browser, "dashboard-sent-no-undated");
    await r.c.close();
    SEED(" && node tests/e2e/seedLaq22.mjs");
    r = await sentShot(browser, "dashboard-sent-with-undated");
    await r.c.close();
    SEED("");
    const { c, p } = await ctx(browser, { width: 1512, height: 982 });
    await p.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq2-ms"); } catch { /* none */ } });
    await p.goto("/dashboard");
    const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
    await d.waitFor({ state: "visible", timeout: 60_000 });
    await d.click();
    await p.locator('[data-qls="root"]').waitFor({ state: "visible", timeout: 30_000 });
    await p.locator('[data-qls="find"]').fill("Harriet");
    await p.locator('[data-qls="agent"][data-id="laq2-hv"]').click();
    await p.locator('[data-qls="not-sent"]').click();
    await p.locator('[data-qls="not-sent-task"]').waitFor({ state: "visible", timeout: 10_000 });
    await p.waitForTimeout(800);
    await p.locator('[data-qls="not-sent-done"]').click();
    await p.goto("/todo");
    const row = p.locator("[data-tws-row]", { hasText: "Send your query to Harriet Vance" }).first();
    await row.waitFor({ state: "visible", timeout: 60_000 });
    await row.click();
    await p.waitForTimeout(800);
    const desk = p.locator('[data-tws="own"]').first();
    const b = await desk.boundingBox();
    if (b) await p.screenshot({ path: `${OUT}/todo-held-task.png`, clip: { x: Math.max(0, b.x - 16), y: Math.max(0, b.y - 16), width: Math.min(b.width + 32, 1512 - b.x + 16), height: Math.min(b.height + 32, 420) } });
    await c.close();
  } finally {
    execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore", timeout: 180_000 });
  }
});
