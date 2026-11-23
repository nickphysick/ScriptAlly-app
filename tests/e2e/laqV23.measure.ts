/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 (design-refs/log-a-query-v2-3, decisions page v1) — the measurement.
 *   V23-D  the Sent box's words against the materials tile: every card at 1280, 1440, 1512 and 1920 on the Queries
 *          page's grid and on Responses — how many words are cut, on how many cards, and each card's width (recon 0.5d;
 *          after Phase 2 the gate: none cut, population non-zero at each width)
 *   V23-E  Escape on the materials pop-up — opened by hover, by focus and by click, on the Queries page, Responses and
 *          Log a query's preview: is it closed 400ms later? (recon 0.5e; after Phase 3 the gate)
 *   (more below as the phases land)
 * Readings to reports/log-a-query-v2-3/<tag>/readings.json. Run only through `npm run e2e:emu`.
 */
import { expect, test, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";

const TAG = process.env.LAQ23_TAG ?? "after";
const ONLY = (process.env.LAQ23_ONLY ?? "").split(",").filter(Boolean);
const run = (k: string) => ONLY.length === 0 || ONLY.includes(k);
const OUT = `reports/log-a-query-v2-3/${TAG}`;
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string, got = "") => { checks++; console.log(`${cond ? "✓" : "✗"} ${label}${got ? ` — ${got}` : ""}`); expect.soft(cond, `${label} — ${got}`).toBe(true); };
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
const PAGE = ".qc151.qc153";
const WIDTHS = [{ width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 982 }, { width: 1920, height: 1080 }];

test.setTimeout(900_000);
test.afterAll(() => {
  mkdirSync(OUT, { recursive: true });
  const f = `${OUT}/readings.json`;
  const was = (() => { try { return JSON.parse(readFileSync(f, "utf8")); } catch { return {}; } })();
  writeFileSync(f, JSON.stringify({ ...was, ...READ, checks, at: new Date().toISOString() }, null, 2));
});

async function ctxAt(browser: Browser, vp: { width: number; height: number }): Promise<{ c: BrowserContext; p: Page }> {
  const c = await browser.newContext({ baseURL: BASE, viewport: vp });
  const p = await c.newPage();
  p.on("pageerror", (e) => console.log(`[pageerror] ${e.message.slice(0, 300)}`));
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
const domClick = (p: Page, sel: string) => p.locator(sel).first().evaluate((e) => (e as HTMLElement).click());

async function openGrid(p: Page) {
  await p.goto("/queries");
  await p.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = p.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await domClick(p, `${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  await expect(p.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  for (let i = 0; i < 6 && (await p.locator(`${PAGE} [data-qc153='show-all']`).count()) > 0; i++) { await domClick(p, `${PAGE} [data-qc153='show-all']`); await p.waitForTimeout(300); }
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  await p.mouse.move(2, 2);
}
async function openResponses(p: Page) {
  await p.goto("/queries/responses");
  await p.locator(`[data-qc154="card"]`).first().waitFor({ state: "attached", timeout: 60_000 }).catch(() => {});
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1500);
  await p.mouse.move(2, 2);
}

/** every card on show: its width, whether it has the tile (and which form), and every Sent word cut short */
const readSent = (p: Page) => p.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qc154="card"]')].filter((c) => c.getBoundingClientRect().width > 0 && !c.closest('[data-qls="root"]')).map((c) => {
  const box = c.querySelector<HTMLElement>('[data-k="sent"]')!;
  const words = [...box.querySelectorAll<HTMLElement>(":scope > span.qc154-fl, :scope > b, :scope > em, :scope > .qc154-fh > span.qc154-fl")];
  const cut = words.filter((e) => e.scrollWidth > e.clientWidth + 0.5).map((e) => `${e.textContent}(+${e.scrollWidth - e.clientWidth})`);
  const tile = c.querySelector<HTMLElement>('[data-pc3="tile"]');
  const tb = tile?.getBoundingClientRect();
  return { id: c.dataset.id ?? "", w: +c.getBoundingClientRect().width.toFixed(1), h: +c.getBoundingClientRect().height.toFixed(1), tile: !!tile,
    compact: tile ? tile.hasAttribute("data-compact") || getComputedStyle(tile).height !== "50px" : false, tileBox: tb ? { w: +tb.width.toFixed(1), h: +tb.height.toFixed(1) } : null,
    cut, over: Math.max(0, ...words.map((e) => e.scrollWidth - e.clientWidth)) };
}));

if (run("D")) test("V23-D · the Sent box's words and the tile at 1280, 1440, 1512, 1920 — Queries grid and Responses", async ({ browser }) => {
  const rows: Record<string, unknown> = {};
  for (const vp of WIDTHS) {
    const { c, p } = await ctxAt(browser, vp);
    for (const where of ["grid", "responses"] as const) {
      if (where === "grid") await openGrid(p); else await openResponses(p);
      const cards = await readSent(p);
      const withTile = cards.filter((x) => x.tile);
      const cutCards = withTile.filter((x) => x.cut.length);
      const words = cutCards.reduce((n, x) => n + x.cut.length, 0);
      const widths = [...new Set(cards.map((x) => x.w))].sort((a, b) => a - b);
      const need = Math.max(0, ...withTile.map((x) => x.w + x.over));
      rows[`${where}-${vp.width}`] = { cards: cards.length, withTile: withTile.length, cutCards: cutCards.length, cutWords: words, widths, needForNoCut: need,
        compact: withTile.filter((x) => x.compact).length, sample: cutCards.slice(0, 5).map((x) => `${x.id}@${x.w}: ${x.cut.join(" ")}`) };
      console.log(`${where} ${vp.width}: ${cards.length} cards (${withTile.length} with a tile, ${withTile.filter((x) => x.compact).length} compact), ${words} words cut on ${cutCards.length}; widths ${widths.join("/")}`);
      if (TAG !== "before") {
        ok(withTile.length > 0, `${where} ${vp.width}: cards with materials on show (population)`, `${withTile.length}`);
        ok(words === 0, `${where} ${vp.width}: no Sent word cut`, `${words} on ${cutCards.length}${cutCards.length ? ` — ${cutCards.slice(0, 3).map((x) => x.cut.join(" ")).join(" | ")}` : ""}`);
        const hs = cards.filter((x) => where === "grid").map((x) => x.h);
        if (hs.length) ok(Math.max(...hs) - Math.min(...hs) <= 0.5, `${where} ${vp.width}: every grid card one height (with and without the tile)`, `${Math.min(...hs)}–${Math.max(...hs)}`);
      }
    }
    await c.close();
  }
  READ.sent = rows;
});

/** open the first card's pop-up on the page, by hover, focus or click; Escape; is it closed 400ms later? */
async function escapeOn(p: Page, scope: string, how: "hover" | "focus" | "click") {
  await p.mouse.move(2, 2);
  await p.keyboard.press("Tab").catch(() => {});
  await p.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await p.waitForTimeout(250);
  const tile = p.locator(`${scope} [data-pc3="tile"] >> visible=true`).first();
  if (!(await tile.count())) return { how, found: false, opened: false, closed: false, stays: false, focused: false };
  await tile.scrollIntoViewIfNeeded();
  if (how === "hover") await tile.hover();
  else if (how === "focus") await tile.focus();
  else await tile.click();
  await p.waitForTimeout(400);
  const opened = await p.locator('[data-pc3="hover"]').count() > 0;
  await p.keyboard.press("Escape");
  await p.waitForTimeout(60);
  const closed = await p.locator('[data-pc3="hover"]').count() === 0;
  await p.waitForTimeout(400);
  const stays = await p.locator('[data-pc3="hover"]').count() === 0;
  const focused = await tile.evaluate((e) => document.activeElement === e);
  return { how, found: true, opened, closed, stays, focused };
}

if (run("E")) test("V23-E · Escape on the materials pop-up: Queries page, Responses, Log a query's preview", async ({ browser }) => {
  const res: unknown[] = [];
  const { c, p } = await ctxAt(browser, { width: 1512, height: 982 });
  await openGrid(p);
  for (const how of ["hover", "focus", "click"] as const) res.push({ where: "queries", ...(await escapeOn(p, PAGE, how)) });
  await openResponses(p);
  for (const how of ["hover", "focus", "click"] as const) res.push({ where: "responses", ...(await escapeOn(p, "body", how)) });
  /* Log a query's preview: Harriet's three materials (seedLaq2) */
  execSync("node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs", { stdio: "ignore", timeout: 120_000 });
  try {
    await p.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq2-ms"); } catch { /* none */ } });
    await p.goto("/dashboard");
    const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
    await d.waitFor({ state: "visible", timeout: 60_000 });
    await d.click();
    const R = p.locator('[data-qls="root"]');
    await R.waitFor({ state: "visible", timeout: 30_000 });
    await p.locator('[data-qls="find"]').fill("Harriet");
    await p.locator('[data-qls="agent"][data-id="laq2-hv"]').click();
    await p.locator('[data-qls="when-opt"][data-k="today"]').click();
    await p.locator('[data-qls="use-ask"]').click();
    await p.locator('[data-qls="how-opt"]').first().click();
    await p.locator('[data-qls="nudge-continue"]').click();
    await expect(R).toHaveAttribute("data-step", "check");
    await p.waitForTimeout(800);
    for (const how of ["hover", "focus", "click"] as const) {
      const r = await escapeOn(p, '[data-qls="preview"]', how);
      const still = await R.isVisible();
      res.push({ where: "log-a-query", ...r, journeyStillOpen: still });
      if (!still) break;
    }
    /* the next Escape is the surface's: the leave check */
    await p.mouse.move(2, 2);
    await p.keyboard.press("Escape");
    await p.waitForTimeout(400);
    READ.laqNextEscape = { leaveCheck: await p.locator('[data-qls="leave-discard"]').isVisible().catch(() => false) };
    if (await p.locator('[data-qls="leave-discard"]').isVisible().catch(() => false)) await p.locator('[data-qls="leave-discard"]').click();
  } finally {
    execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore", timeout: 120_000 });
  }
  await c.close();
  READ.escape = res;
  for (const r of res as { where: string; how: string; found: boolean; opened: boolean; closed: boolean; stays: boolean; focused: boolean }[]) {
    console.log(`escape ${r.where} ${r.how}: found ${r.found}, opened ${r.opened}, closed ${r.closed}, stays closed ${r.stays}, tile focused ${r.focused}`);
    if (TAG !== "before" && r.found) {
      ok(r.opened, `${r.where} ${r.how}: the pop-up opens`);
      ok(r.closed && r.stays, `${r.where} ${r.how}: Escape closes it and it stays closed`, `closed ${r.closed}, 400ms later ${r.stays}`);
      if (r.how === "focus") ok(r.focused, `${r.where} focus: the tile keeps focus`);
    }
  }
  if (TAG !== "before") ok((READ.laqNextEscape as { leaveCheck: boolean }).leaveCheck, "log a query: the next Escape is the leave check");
});
