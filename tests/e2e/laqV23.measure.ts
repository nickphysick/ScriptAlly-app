/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.3 (design-refs/log-a-query-v2-3, decisions page v1) — the measurement.
 *   V23-D  the Sent box's words against the materials tile: every card at 1280, 1440, 1512 and 1920 on the Queries
 *          page's grid and on Responses — how many words are cut, on how many cards, and each card's width (recon 0.5d;
 *          after Phase 2 the gate: none cut, population non-zero at each width)
 *   V23-DW the same in WebKit (a launched browser: desktop WebKit signs in with Enter, as pc3.measure.ts PC3-W does)
 *   V23-E  Escape on the materials pop-up — opened by hover, by focus and by click, on the Queries page, Responses and
 *          Log a query's preview: is it closed 400ms later? (recon 0.5e; after Phase 3 the gate)
 *   V23-S  one count (Phase 1): on the seeded book (seedLaq2 + 21 + 22: 24 queries, three undated) the Dashboard's
 *          "{n} queries sent", the Queries page header and Log a query's review ("queries sent" before this one, and
 *          "Query number {n}" after it) agree; the Dashboard's line under the Sent weeks and "Add the dates" → the Queries
 *          page showing only the undated; without the undated (seedLaq2 + 21) no line. Shots of the Sent card, both.
 *   V23-T  the held task on the To-do page (Phase 4): its title is not a field, no unlink, "I've sent it" there, and
 *          after a reload. Shot of the desk.
 * Readings to reports/log-a-query-v2-3/<tag>/readings.json. Run only through `npm run e2e:emu`.
 */
import { expect, test, webkit, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { ensureSignedIn } from "./measure";
import { queriesSent } from "../../src/lib/dash2";
import type { Query } from "../../src/types";

const TAG = process.env.LAQ23_TAG ?? "after";
const ONLY = (process.env.LAQ23_ONLY ?? "").split(",").filter(Boolean);
const run = (k: string) => ONLY.length === 0 || ONLY.includes(k);
const OUT = `reports/log-a-query-v2-3/${TAG}`;
const READ: Record<string, unknown> = {};
let checks = 0;
const ok = (cond: boolean, label: string, got = "") => { checks++; console.log(`${cond ? "✓" : "✗"} ${label}${got ? ` — ${got}` : ""}`); expect.soft(cond, `${label} — ${got}`).toBe(true); };
const BASE = process.env.SA_E2E_BASE_URL ?? "http://127.0.0.1:4321";
const PAGE = ".qc151.qc153";
const COMPACT_MAX = 340;
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
        const wrongForm = withTile.filter((x) => x.compact !== (x.w <= COMPACT_MAX));
        ok(wrongForm.length === 0, `${where} ${vp.width}: the compact tile on cards ${COMPACT_MAX}px and under, the 44 × 50 tile on wider`, `${withTile.filter((x) => x.compact).length} compact of ${withTile.length}${wrongForm.length ? ` — wrong: ${wrongForm.slice(0, 3).map((x) => `${x.id}@${x.w}`).join(" ")}` : ""}`);
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

const SEED = (extra: string) => execSync(`node tests/e2e/seedLaq2.mjs --clean && node tests/e2e/seedLaq2.mjs && node tests/e2e/seedLaq21.mjs${extra}`, { stdio: "ignore", timeout: 180_000 });
const CLEAN = () => execSync("node tests/e2e/seedLaq2.mjs --clean", { stdio: "ignore", timeout: 180_000 });
async function bookCtx(browser: Browser, vp = { width: 1512, height: 982 }) {
  const r = await ctxAt(browser, vp);
  await r.p.evaluate(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "laq2-ms"); } catch { /* none */ } });
  return r;
}
/** the Dashboard's chart card in its Sent view: the count, the line (if any), a shot */
async function sentCard(p: Page, shot: string) {
  await p.goto("/dashboard");
  const tog = p.locator('.d2 [data-d2="chart-toggle"] button[data-m="sent"]');
  await tog.waitFor({ state: "visible", timeout: 60_000 });
  await p.waitForTimeout(800);
  await tog.click();
  await p.waitForTimeout(700);
  const card = p.locator('.d2 [data-d2-card="active"]').first();
  await card.scrollIntoViewIfNeeded();
  mkdirSync(OUT, { recursive: true });
  await card.screenshot({ path: `${OUT}/${shot}.png`, animations: "disabled" });
  return p.evaluate(() => {
    const line = document.querySelector<HTMLElement>('.d2 [data-d2="undated"]');
    const a = line?.querySelector<HTMLAnchorElement>('[data-d2="add-dates"]');
    const cs = line ? getComputedStyle(line) : null;
    const axis = document.querySelector<HTMLElement>('.d2 .d2-plot.is-sent .d2-axis span');
    return { head: document.querySelector('.d2 [data-d2="chart-count"]')?.textContent?.trim() ?? "", line: line?.textContent?.trim() ?? null, href: a?.getAttribute("href") ?? null,
      size: cs ? parseFloat(cs.fontSize) : null, color: cs?.color ?? null, axisSize: axis ? parseFloat(getComputedStyle(axis).fontSize) : null, axisColor: axis ? getComputedStyle(axis).color : null,
      underPlot: (() => { const pl = document.querySelector('.d2 [data-d2="plot"]')?.getBoundingClientRect(); const l = line?.getBoundingClientRect(); return pl && l ? l.top - pl.bottom : null; })() };
  });
}
const num = (t: string | null | undefined) => Number((t ?? "").match(/\d+/)?.[0] ?? NaN);

if (run("S")) test("V23-S · one count of queries sent, the line under the Sent weeks, Add the dates", async ({ browser }) => {
  try {
    /* without undated queries: no line */
    SEED("");
    let { c, p } = await bookCtx(browser);
    const none = await sentCard(p, "dashboard-sent-no-undated");
    READ.sentNoUndated = none;
    if (TAG !== "before") ok(none.line === null, "no undated: no line under the weeks", `${none.line}`);
    await c.close();
    /* with three undated among 24 */
    SEED(" && node tests/e2e/seedLaq22.mjs");
    ({ c, p } = await bookCtx(browser));
    const s = await sentCard(p, "dashboard-sent-with-undated");
    READ.sentWithUndated = s;
    await p.goto("/queries");
    await p.waitForSelector(`${PAGE} [data-qc151="title"]`, { timeout: 60_000 });
    await p.waitForTimeout(1500);
    const qHead = (await p.locator(`${PAGE} [data-qc151="title"]`).first().textContent())?.trim() ?? "";
    /* Log a query's review, for one more agent on this book */
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
    await p.waitForTimeout(1200);
    const review = await p.locator('[data-qls="count"][data-k="sent"]').getAttribute("aria-label").catch(() => null);
    await p.locator('[data-qls="log"]').click();
    await p.locator('.laq-cnt[data-qls="count"]').waitFor({ state: "visible", timeout: 30_000 });
    await p.waitForTimeout(2500);
    const qnum = (await p.locator('.laq-cnt[data-qls="count"] [data-qls="odometer"]').getAttribute("aria-label")) ?? "";
    const undo = p.getByRole("button", { name: /^Undo$/ }).first();
    if (await undo.isVisible().catch(() => false)) { await undo.click(); await p.waitForTimeout(1500); }
    /* the desktop Queries page has no book scope: its header is the one count over every query of the account */
    const all = JSON.parse(execSync("node tests/e2e/laq23Queries.mjs", { timeout: 60_000 }).toString().trim().split("\n").pop()!) as Query[];
    const wantAll = queriesSent(all, new Date());
    const wantBook = queriesSent(all.filter((x) => x.manuscriptId === "laq2-ms"), new Date());
    READ.oneCount = { dashboard: s.head, queriesPage: qHead, review, queryNumber: qnum, wantBook, wantAll, accountQueries: all.length, accountUndated: all.filter((x) => !x.dateSent).length };
    console.log(`one count: dashboard "${s.head}" · queries page "${qHead}" · review "${review}" · "${qnum}"`);
    if (TAG !== "before") {
      ok(num(s.head) === 24 && wantBook === 24, "the seeded book (24, three undated): the Dashboard says 24, the one count over the book", `${s.head} / ${wantBook}`);
      ok(num(qHead) === wantAll, "the Queries page header is the one count over its own scope (every manuscript on desktop)", `${qHead} / ${wantAll} of ${all.length} queries`);
      ok(num(review) === 25 && num(qnum) === 25, "Log a query: the review's queries sent with this one, and Query number, are 25", `${review} / ${qnum}`);
      ok(s.line === "3 queries have no sent date, so they aren’t in the weeks above. Add the dates", "the line under the weeks, and the link", `${s.line}`);
      ok(s.underPlot !== null && s.underPlot >= 0 && s.underPlot <= 16, "directly beneath the plot", `${s.underPlot}`);
      ok(s.size !== null && s.size >= 12 && s.size === s.axisSize && s.color === s.axisColor, "in the card's small print (the axis's size and colour), nothing under 12px", `${s.size}px ${s.color} / axis ${s.axisSize}px ${s.axisColor}`);
      /* Add the dates → the Queries page showing only those three */
      await p.goto("/dashboard");
      await p.locator('.d2 [data-d2="chart-toggle"] button[data-m="sent"]').click();
      await p.waitForTimeout(600);
      await p.locator('.d2 [data-d2="add-dates"]').click();
      await p.waitForURL(/\/queries\?ids=/, { timeout: 30_000 });
      await p.waitForTimeout(2500);
      const shown = await p.evaluate((root) => [...document.querySelectorAll<HTMLElement>(`${root} [data-qc154="card"]`)].filter((c) => c.getBoundingClientRect().width > 0).map((c) => c.dataset.id ?? ""), PAGE);
      const chip = await p.evaluate(() => [...document.querySelectorAll<HTMLElement>("button, span")].map((e) => e.textContent?.trim() ?? "").find((t) => /^No sent date · \d+/.test(t)) ?? null);
      READ.addTheDates = { url: p.url(), shown, chip };
      await p.screenshot({ path: `${OUT}/add-the-dates-queries-page.png` });
      ok(shown.length === 3 && shown.every((id) => /^laq2-mi0[1-3]$|^laq2-/.test(id)), "Add the dates: the Queries page showing only the three undated", `${shown.join(",")}`);
      ok(!!chip && /^No sent date · 3\b/.test(chip), "with the removable chip that says so", `${chip}`);
    }
    await c.close();
  } finally { CLEAN(); }
});

if (run("T")) test("V23-T · the held task on the To-do page: fixed words, no unlink, I've sent it, after a reload", async ({ browser }) => {
  try {
    SEED("");
    const { c, p } = await bookCtx(browser);
    await p.goto("/dashboard");
    const d = p.getByRole("button", { name: /^\+?\s*Log a query$/ }).locator("visible=true").first();
    await d.waitFor({ state: "visible", timeout: 60_000 });
    await d.click();
    const R = p.locator('[data-qls="root"]');
    await R.waitFor({ state: "visible", timeout: 30_000 });
    await p.locator('[data-qls="find"]').fill("Harriet");
    await p.locator('[data-qls="agent"][data-id="laq2-hv"]').click();
    await p.locator('[data-qls="not-sent"]').click();
    await p.locator('[data-qls="not-sent-task"]').waitFor({ state: "visible", timeout: 10_000 });
    await p.waitForTimeout(800);
    await p.locator('[data-qls="not-sent-done"]').click();
    await R.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    const read = async () => {
      const row = p.locator("[data-tws-row]", { hasText: "Send your query to Harriet Vance" }).first();
      await row.waitFor({ state: "visible", timeout: 60_000 });
      await row.click();
      await p.waitForTimeout(600);
      return p.evaluate(() => {
        const own = document.querySelector<HTMLElement>('[data-tws="own"]');
        return { fixed: own?.querySelector('[data-tws="fixed-title"]')?.textContent ?? null, field: !!own?.querySelector('textarea[aria-label="What needs doing"]'),
          editable: !!own?.querySelector('[contenteditable="true"]'), unlink: !!own?.querySelector('[aria-label="Unlink"]'), sent: !!document.querySelector('[data-tws="held-sent"]'),
          size: own?.querySelector('[data-tws="fixed-title"]') ? parseFloat(getComputedStyle(own.querySelector('[data-tws="fixed-title"]')!).fontSize) : null };
      });
    };
    await p.goto("/todo");
    const a = await read();
    mkdirSync(OUT, { recursive: true });
    await p.screenshot({ path: `${OUT}/todo-held-task.png` });
    await p.reload();
    const b = await read();
    READ.heldTask = { a, b };
    if (TAG !== "before") {
      ok(a.fixed === "Send your query to Harriet Vance" && !a.field && !a.editable, "the title is the task's words, not a field", JSON.stringify(a));
      ok(!a.unlink, "its agent cannot be unlinked", `${a.unlink}`);
      ok(a.sent, "I've sent it is there");
      ok(b.sent && b.fixed === a.fixed && !b.field, "after a reload: the same, and the button", JSON.stringify(b));
      ok(a.size !== null && a.size >= 12, "the title ≥ 12px", `${a.size}`);
    }
    await c.close();
  } finally { CLEAN(); }
});

function envLocal(k: string): string | null {
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const m = new RegExp(`^\\s*${k}\\s*=\\s*(.*)$`).exec(line);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "") || null;
    }
  } catch { /* none */ }
  return null;
}

if (run("DW")) test("V23-DW · the Sent box's words and the tile at 1280, 1440, 1512, 1920 — Queries grid and Responses, WebKit", async () => {
  const b = await webkit.launch();
  const rows: Record<string, unknown> = {};
  try {
    const c = await b.newContext({ baseURL: BASE, viewport: WIDTHS[0] });
    /* ⚠️ A LAUNCHED CONTEXT HAS NO ACTION TIMEOUT, and desktop WebKit cannot click the harness's Sign in */
    c.setDefaultTimeout(45_000);
    const p = await c.newPage();
    await p.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); sessionStorage.removeItem("qh.qc.filters"); sessionStorage.removeItem("qh.qc.collapsed1511"); } catch { /* private */ } });
    await p.goto("/#/signin");
    await p.locator("#au-email").fill(process.env.SA_E2E_EMAIL ?? "harness@scriptally.test");
    await p.locator("#au-pw").fill(process.env.SA_E2E_PASSWORD ?? envLocal("SA_E2E_PASSWORD") ?? "");
    await p.locator("#au-pw").press("Enter");
    await p.locator("#ws-sidebar, .ws-work, #app-stage-scroll").first().waitFor({ state: "attached", timeout: 60_000 });
    for (const vp of WIDTHS) {
      await p.setViewportSize(vp);
      for (const where of ["grid", "responses"] as const) {
        if (where === "grid") await openGrid(p); else await openResponses(p);
        const cards = await readSent(p);
        const withTile = cards.filter((x) => x.tile);
        const cutCards = withTile.filter((x) => x.cut.length);
        const words = cutCards.reduce((n, x) => n + x.cut.length, 0);
        rows[`${where}-${vp.width}`] = { cards: cards.length, withTile: withTile.length, compact: withTile.filter((x) => x.compact).length, cutWords: words, widths: [...new Set(cards.map((x) => x.w))] };
        console.log(`webkit ${where} ${vp.width}: ${cards.length} cards (${withTile.length} with a tile, ${withTile.filter((x) => x.compact).length} compact), ${words} words cut`);
        ok(withTile.length > 0, `webkit ${where} ${vp.width}: cards with materials on show (population)`, `${withTile.length}`);
        const wrongForm = withTile.filter((x) => x.compact !== (x.w <= COMPACT_MAX));
        ok(wrongForm.length === 0, `webkit ${where} ${vp.width}: the compact tile on cards ${COMPACT_MAX}px and under, the 44 × 50 tile on wider`, `${wrongForm.length} wrong`);
        ok(words === 0, `webkit ${where} ${vp.width}: no Sent word cut`, `${words}${cutCards.length ? ` — ${cutCards.slice(0, 3).map((x) => x.cut.join(" ")).join(" | ")}` : ""}`);
        if (where === "grid") { const hs = cards.map((x) => x.h); ok(Math.max(...hs) - Math.min(...hs) <= 0.5, `webkit grid ${vp.width}: every card one height`, `${Math.min(...hs)}–${Math.max(...hs)}`); }
      }
    }
  } finally { await b.close(); }
  READ.sentWebkit = rows;
});
