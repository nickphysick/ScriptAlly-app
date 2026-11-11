/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v55 — TD55 L1–L10 on the rendered page (design-refs/todo-list-v55/todo-tray-head-v2.html), at 1440 × 900,
 * 1920 × 1080 and 1366 × 768 where the lock is about layout, once otherwise.
 *   SA_E2E_BASE_URL=http://127.0.0.1:3000 npx playwright test tests/e2e/todoV55.measure.ts --project=measure --no-deps --workers=1
 * against `npm run dev:emu`. L9 is todoV54.measure.ts itself, run beside this file.
 *
 * `TD55_MUTATE=<lock>` applies that lock's page-side break; tests/e2e/td55Mutate.sh runs each, and the source breaks.
 * The saved tray prefs are read before the run and written back in afterAll (tests/e2e/seedTd55.mjs).
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved grouping and collapse.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openPhone } from "./pa2Lib";

test.describe.configure({ mode: "serial" });
const DIR = "reports/todo-list-v55";
const READ = `${DIR}/readings`;
const SHOTS = `${DIR}/shots`;
mkdirSync(READ, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const MUT = process.env.TD55_MUTATE ?? "";
const SIZES = [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 1366, height: 768 }] as const;
const PG = '[data-tws="page"]:visible';
const DAY = 86400000;
const held = new Map<string, unknown>();
const note = (name: string, v: unknown) => { held.set(name, v); };

/* ── the fixture (seedTd55.mjs): the saved prefs go back as they were ── */
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd55.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  return JSON.parse(out.trim().split("\n").pop()!);
};
let before: Record<string, unknown> | null = null;
test.beforeAll(() => { before = seed("prefs", { trayGrouping: null, trayCollapsed: null }); });
test.afterAll(() => {
  for (const [name, v] of held) writeFileSync(`${READ}/${name}${MUT ? `-${MUT}` : ""}.json`, JSON.stringify(v, null, 1));
  if (before) seed("prefs", before);
});
/** poll the store until the saved prefs say what `want` says (a save lands a moment after the click) */
const settlePrefs = async (page: Page, want: Record<string, unknown>) => {
  let got: Record<string, unknown> = {};
  for (let i = 0; i < 15; i++) { got = seed("read-prefs", null); if (Object.entries(want).every(([k, v]) => got[k] === v)) break; await page.waitForTimeout(700); }
  return got;
};

async function open(page: Page, vp: { width: number; height: number }, fresh = true) {
  /* every case starts from the defaults: Category, the tray open (a save from the case before can land late) */
  if (fresh) seed("prefs", { trayGrouping: null, trayCollapsed: null });
  await openRoute(page, "/todo", vp);
  await expect(page.locator(PG)).toHaveCount(1, { timeout: 30_000 });
  await expect(page.locator(`${PG} [data-tws-row], ${PG} [data-tws55-strip]`).first()).toBeVisible({ timeout: 30_000 });
  /* the board settles over a few seconds as the account's collections arrive: wait until the count holds still */
  let last = -1;
  for (let i = 0; i < 20; i++) {
    const n = await page.evaluate(() => Number([...document.querySelectorAll('[data-tws="todo-count"]')].find((e) => (e as HTMLElement).offsetParent)?.textContent ?? -2));
    if (n === last && n > 0) break;
    last = n;
    await page.waitForTimeout(1200);
  }
  await mutate(page);
}

/* ── the named breaks (page-side) ── */
async function mutate(page: Page) {
  if (!MUT) return;
  await page.evaluate((l) => {
    const css = (t: string) => { const s = document.createElement("style"); s.textContent = t; document.head.appendChild(s); };
    /* a break that must outlive re-renders runs now AND on a timer (a timer alone fires after an immediate read) */
    const keep = (f: () => void) => { f(); window.setInterval(f, 50); };
    if (l === "L1") css(".tws .tws55-head { flex-wrap: wrap !important; } .tws .tws55-icons { flex-basis: 100% !important; }");
    if (l === "L2") window.addEventListener("keydown", (e) => { if (e.key === "/") e.stopImmediatePropagation(); }, true);
    if (l === "L3") css(".tws .tws55-pip { display: none !important; }");
    if (l === "L4") keep(() => { const c = document.querySelector('[data-tws="todo-count"]'); const agent = document.querySelector('[data-tws55-group="agent"][aria-checked="true"]'); if (c && agent && c.textContent !== "1") c.textContent = "1"; });
    if (l === "L5") css(".tws .tws-ws[data-slim] { grid-template-columns: 112px minmax(0, 1fr) !important; }");
    if (l === "L7") keep(() => { const r = document.querySelector('[data-tws-row="task-full-cv25-q-09"] [data-tws="figure"] b'); if (r && r.textContent !== "0") r.textContent = "0"; });
    if (l === "L8") keep(() => { const t = document.querySelector('[data-tws="tray"]'); if (t && !t.querySelector("[data-stray]")) { const s = document.createElement("span"); s.setAttribute("data-stray", ""); s.textContent = "To-do list"; s.style.textTransform = "uppercase"; t.prepend(s); } });
  }, MUT);
}

const visibleRows = (page: Page) => page.locator(`${PG} [data-tws="list"] [data-tws-row]`);
const todoCount = async (page: Page) => Number(await page.locator(`${PG} [data-tws="todo-count"]`).textContent({ timeout: 10_000 }));

/* ══ L1 · the head is one line ═══════════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L1 · the tray's head is one line, the bar and the counts line gone (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const head = root.querySelector<HTMLElement>('[data-tws55="head"]')!.getBoundingClientRect();
      const parts = [...root.querySelectorAll<HTMLElement>('[data-tws55-tab], [data-tws55="search-btn"], [data-tws55="menu-btn"], [data-tws="collapse"]')]
        .map((e) => { const b = e.getBoundingClientRect(); return { name: e.getAttribute("data-tws55-tab") ?? e.getAttribute("data-tws55") ?? e.getAttribute("data-tws"), mid: b.top + b.height / 2, top: b.top, bottom: b.bottom }; });
      const tray = root.querySelector<HTMLElement>('[data-tws="tray"]')!;
      return {
        head: { top: head.top, bottom: head.bottom, h: head.height },
        parts,
        gone: {
          bar: tray.querySelectorAll('[data-tws="breakdown"], [data-tws="bar"], [data-tws="bar-words"]').length,
          oldTabs: tray.querySelectorAll(".tws-seg").length,
          oldSearch: tray.querySelectorAll(".tws-find, .tws-chips").length,
          oldButtons: tray.querySelectorAll(".tws-ib").length,
        },
        between: (() => { const l = root.querySelector('[data-tws="list"]')!.getBoundingClientRect(); return l.top - head.bottom; })(),
      };
    });
    expect(r.parts.map((p) => p.name), "L1 · the tabs and the three icons, in order").toEqual(["todo", "snoozed", "done", "search-btn", "menu-btn", "collapse"]);
    const mids = r.parts.map((p) => p.mid);
    expect(Math.max(...mids) - Math.min(...mids), "L1 · they share one row").toBeLessThanOrEqual(3);
    for (const p of r.parts) expect(p.top >= r.head.top - 0.5 && p.bottom <= r.head.bottom + 2.5, `L1 · ${p.name} inside the head's line`).toBe(true);
    expect(r.head.h, "L1 · the head is one line tall").toBeLessThanOrEqual(48);
    expect(r.gone, "L1 · the bar, the counts line, the old tabs, search box and buttons are gone").toEqual({ bar: 0, oldTabs: 0, oldSearch: 0, oldButtons: 0 });
    expect(r.between, "L1 · nothing sits between the head and the list").toBeLessThanOrEqual(1);
    note(`L1-${vp.width}`, r);
  });
}

/* ══ L2 · search ═══════════════════════════════════════════════════════════════════════════════════════════ */
test("L2 · '/' and the icon open search; an agency narrows the list; Esc brings the tabs and the list back", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const full = await visibleRows(page).count();
  const total = await todoCount(page);
  /* an agency from a row on show, in lower case (the match ignores case) */
  const agency = ((await page.locator(`${PG} [data-tws-row="task-full-cv25-q-09"] .tws-tx > span`).textContent({ timeout: 10_000 })) ?? "").trim();
  expect(agency, "L2 · the fixture's agency").toBe("The Marsh Agency");
  await page.keyboard.press("/");
  const field = page.locator(`${PG} [data-tws55="search"] input`);
  await expect(field, "L2 · '/' opens the search field").toBeVisible({ timeout: 3_000 });
  await expect(field, "L2 · and puts the caret in it").toBeFocused();
  await expect(field).toHaveAttribute("placeholder", "Search tasks, agents or agencies");
  await expect(page.locator(`${PG} [data-tws55-tab]`), "L2 · the tabs give way to the field").toHaveCount(0);
  await field.pressSequentially("marsh agency", { delay: 20 });
  await page.waitForTimeout(300);
  const hits = await visibleRows(page).allTextContents();
  expect(hits.length, "L2 · it narrows the list").toBeGreaterThan(0);
  expect(hits.length, "L2 · to fewer rows").toBeLessThan(full);
  for (const h of hits) expect(h.toLowerCase(), "L2 · every row left names the agency").toContain("marsh agency");
  await page.keyboard.press("Escape");
  await expect(field, "L2 · Esc closes it").toHaveCount(0);
  await expect(page.locator(`${PG} [data-tws55-tab]`), "L2 · the tabs are back").toHaveCount(3);
  await expect(visibleRows(page), "L2 · and the full list").toHaveCount(full);
  /* the icon does the same, and ✕ clears and closes */
  await page.locator(`${PG} [data-tws55="search-btn"]`).click();
  await expect(field, "L2 · the icon opens it").toBeFocused();
  await field.fill("marsh agency");
  await page.locator(`${PG} [data-tws55="search-close"]`).click();
  await expect(visibleRows(page), "L2 · ✕ brings the full list back").toHaveCount(full);
  note("L2", { full, total, hits: hits.length, agency });
});

/* ══ L3 · a filter says so; a grouping alone does not ═══════════════════════════════════════════════════════ */
test("L3 · a filter shows the dot and 'Showing x of y'; Clear removes both; grouping alone shows neither", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const total = await todoCount(page);
  const dot = page.locator(`${PG} [data-tws55="menu-btn"] [data-tws55="dot"]`);
  const line = page.locator(`${PG} [data-tws55="fline"]`);
  const pipShown = () => dot.evaluate((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0).catch(() => false);
  await expect(dot).toHaveCount(0);
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await page.locator(`${PG} [data-tws55-type="Nudge"]`).click();
  await page.mouse.click(1000, 600);
  await expect(page.locator(`${PG} [data-tws55="menu"]`), "L3 · a click outside closes the menu").toHaveCount(0);
  const shown = await visibleRows(page).count();
  expect(await pipShown(), "L3 · the rust dot is on the icon").toBe(true);
  expect(await dot.evaluate((e) => getComputedStyle(e).backgroundColor), "L3 · rust").toBe("rgb(155, 67, 48)");
  await expect(line, "L3 · the line says what is showing").toHaveText(`Showing ${shown} of ${total}: Nudge · Clear`);
  expect(await todoCount(page), "L3 · the To do count stays the full count").toBe(total);
  for (const t of await visibleRows(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-kind")))) expect(t, "L3 · only nudges").toBe("nudge");
  await page.locator(`${PG} [data-tws55="fline-clear"]`).click();
  await expect(dot, "L3 · Clear takes the dot").toHaveCount(0);
  await expect(line, "L3 · and the line").toHaveCount(0);
  /* a grouping on its own is not a filter */
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await page.locator(`${PG} [data-tws55-group="agent"]`).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(`${PG} [data-tws55="menu"]`), "L3 · Esc closes the menu").toHaveCount(0);
  await expect(dot, "L3 · grouping alone: no dot").toHaveCount(0);
  await expect(line, "L3 · grouping alone: no line").toHaveCount(0);
  /* nothing matching: the list says so, with a way back */
  /* housekeeping has no date, so "Fill in" and "Overdue" together match nothing */
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await page.locator(`${PG} [data-tws55-type="Fill in"]`).click();
  await page.locator(`${PG} [data-tws55-when="Overdue"]`).click();
  await page.keyboard.press("Escape");
  const none = page.locator(`${PG} [data-tws55="none"]`);
  await expect(none, "L3 · nothing matching says so").toHaveText("No tasks match. Clear the filters");
  await expect(line, "L3 · and the line reads 0 of the total").toHaveText(`Showing 0 of ${total}: Fill in, Overdue · Clear`);
  await none.locator("button").click();
  await expect(dot, "L3 · the link clears the filters").toHaveCount(0);
  expect(await visibleRows(page).count(), "L3 · and the list is back").toBeGreaterThan(0);
  note("L3", { total, shown });
});

/* ══ L4 · every grouping regroups, and the count never moves ═════════════════════════════════════════════════ */
test("L4 · each Group by option regroups the list and the To do count never changes", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const total = await todoCount(page);
  const out: Record<string, string[]> = {};
  const want: Record<string, (h: string[]) => boolean> = {
    category: (h) => h[0] === "Agents are waiting" && h.includes("Housekeeping"),
    urgency: (h) => h[0] === "Needs you now" && h.includes("Housekeeping"),
    when: (h) => h.every((x) => ["Overdue", "Due this week", "Coming up", "Not dated"].includes(x)) && h.length >= 2,
    agent: (h) => h.includes("Jonathan Marsh"),
    none: (h) => h.length === 1,
  };
  for (const g of ["urgency", "when", "agent", "none", "category"]) {
    await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
    await expect(page.locator(`${PG} [data-tws55-group]`), "L4 · five options").toHaveCount(5);
    await page.locator(`${PG} [data-tws55-group="${g}"]`).click();
    await expect(page.locator(`${PG} [data-tws55-group="${g}"]`)).toHaveAttribute("aria-checked", "true");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const heads = await page.locator(`${PG} [data-tws="list"] .tws-gb b`).allTextContents();
    out[g] = heads;
    expect(want[g](heads), `L4 · ${g} groups the list (${heads.join(" / ")})`).toBe(true);
    expect(await todoCount(page), `L4 · ${g}: the To do count is unchanged`).toBe(total);
    expect(await page.locator(`${PG} [data-tws55="dot"]`).count(), `L4 · ${g}: no dot`).toBe(0);
  }
  await settlePrefs(page, { trayGrouping: "category" });
  note("L4", { total, out });
});

/* ══ L5 · the strip ════════════════════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L5 · collapse gives a 64px strip of the group counts, a click reopens it, the footer stays pinned (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const read = () => page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const d = root.querySelector<HTMLElement>('[data-tws="desk"]')!.getBoundingClientRect();
      const f = root.querySelector<HTMLElement>('[data-tws="footer"]')!.getBoundingClientRect();
      const leg = (k: string) => Number(root.querySelector(`[data-tws54="legend-row"][data-k="${k}"] [data-tws54="legend-n"]`)?.textContent ?? NaN);
      return {
        tray: root.querySelector<HTMLElement>('[data-tws="tray"]')!.getBoundingClientRect().width,
        desk: d.width,
        foot: { gap: Math.abs(d.bottom - f.bottom), onScreen: f.bottom <= window.innerHeight + 0.5 && f.top >= 0 },
        strip: Object.fromEntries([...root.querySelectorAll<HTMLElement>("[data-tws55-strip]")].map((e) => [e.getAttribute("data-tws55-strip"), { n: Number(e.textContent), title: e.getAttribute("title") }])),
        legend: { wait: leg("wait"), nudge: leg("nudge"), quiet: leg("quiet"), house: leg("house") },
      };
    });
    /* bring the frame to its pinned place first (the header scrolls away), so the footer is measured where it pins */
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop = sc.scrollHeight; });
    await page.waitForTimeout(300);
    const open0 = await read();
    expect(Math.abs(open0.tray - 340), "L5 · the tray is 340 open").toBeLessThanOrEqual(1);
    expect(open0.foot.gap, "L5 · open: the footer on the desk's foot").toBeLessThanOrEqual(2);
    expect(open0.foot.onScreen, "L5 · open: on screen").toBe(true);
    await page.locator(`${PG} [data-tws="collapse"]`).click();
    await page.waitForTimeout(450);
    const slim = await read();
    expect(Math.abs(slim.tray - 64), "L5 · the strip is 64px").toBeLessThanOrEqual(1);
    expect(Math.round(slim.desk - open0.desk), "L5 · the desk gains the width").toBe(Math.round(open0.tray - slim.tray));
    expect(Object.fromEntries(Object.entries(slim.strip).map(([k, v]) => [k, v.n])), "L5 · one count per group, equal to the group counts").toEqual(slim.legend);
    expect(Object.fromEntries(Object.entries(slim.strip).map(([k, v]) => [k, v.title])), "L5 · the group's name is the tooltip")
      .toEqual({ wait: "Agents are waiting", nudge: "Nudges", quiet: "Gone quiet", house: "Housekeeping" });
    expect(slim.foot.gap, "L5 · collapsed: the footer on the desk's foot").toBeLessThanOrEqual(2);
    expect(slim.foot.onScreen, "L5 · collapsed: on screen").toBe(true);
    if (vp.width === 1440) await page.locator(`${PG} [data-tws="workspace"]`).screenshot({ path: `${SHOTS}/collapsed-strip${MUT ? `-${MUT}` : ""}.png` });
    /* a click anywhere on the strip opens it */
    await page.locator(`${PG} [data-tws55-strip="quiet"]`).click();
    await page.waitForTimeout(450);
    expect(Math.abs((await read()).tray - 340), "L5 · a click on the strip opens the tray").toBeLessThanOrEqual(1);
    await settlePrefs(page, { trayCollapsed: false });
    note(`L5-${vp.width}`, { open0, slim });
  });
}

/* ══ L6 · saved and not saved ═════════════════════════════════════════════════════════════════════════════ */
test("L6 · the grouping and the collapse survive a reload; the filters and the search don't", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await page.locator(`${PG} [data-tws55-group="agent"]`).click();
  await page.locator(`${PG} [data-tws55-type="Nudge"]`).click();
  await page.keyboard.press("Escape");
  await page.locator(`${PG} [data-tws="collapse"]`).click();
  const saved = await settlePrefs(page, { trayGrouping: "agent", trayCollapsed: true });
  expect(saved, "L6 · both are written to the account's prefs").toEqual({ trayGrouping: "agent", trayCollapsed: true });
  await page.reload();
  await expect(page.locator(`${PG} [data-tws55-strip]`).first(), "L6 · the collapse is back after a reload").toBeVisible({ timeout: 30_000 });
  const w = await page.locator(`${PG} [data-tws="tray"]`).evaluate((e) => e.getBoundingClientRect().width);
  expect(Math.abs(w - 64), "L6 · at 64px").toBeLessThanOrEqual(1);
  await page.locator(`${PG} [data-tws="expand"]`).click();
  await page.waitForTimeout(400);
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await expect(page.locator(`${PG} [data-tws55-group="agent"]`), "L6 · the grouping is back").toHaveAttribute("aria-checked", "true");
  await expect(page.locator(`${PG} [data-tws55-type="Nudge"]`), "L6 · the filter is not").toHaveAttribute("aria-pressed", "false");
  await page.keyboard.press("Escape");
  await expect(page.locator(`${PG} [data-tws55="dot"]`), "L6 · no dot").toHaveCount(0);
  await expect(page.locator(`${PG} [data-tws55="search"]`), "L6 · no search open").toHaveCount(0);
  note("L6", { saved, w });
});

/* ══ L7 · a request's days waiting ═════════════════════════════════════════════════════════════════════════ */
test("L7 · a request reads its true days waiting (not 0) in the tray and the legend", async ({ page }) => {
  await open(page, { width: 1440, height: 900 });
  const q = seed("query", ["cv25-q-09"])["cv25-q-09"] as { status: string; fullRequestedDate: string | null; lastStatusChange: string };
  expect(q.status, "L7 · the fixture: Jonathan's full request").toBe("Full Requested");
  const asked = Date.parse(q.fullRequestedDate ?? q.lastStatusChange);
  /* whole days elapsed (lib/elapsed `daysBetween`, the figure's own rule) */
  const days = Math.max(0, Math.floor((Date.now() - asked) / DAY));
  const row = page.locator(`${PG} [data-tws-row="task-full-cv25-q-09"]`);
  await row.scrollIntoViewIfNeeded();
  const fig = (await row.locator('[data-tws="figure"]').textContent({ timeout: 10_000 }) ?? "").replace(/\s+/g, " ").trim();
  expect(fig, "L7 · Jonathan's row: its true days waiting").toBe(`${days}days waiting`);
  expect(days, "L7 · and that is not 0").toBeGreaterThan(0);
  /* the legend's note is the longest of the waiting rows' own figures — the same function */
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const figs = [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row]')]
      .filter((e) => /days? waiting/.test(e.querySelector('[data-tws="figure"]')?.textContent ?? ""))
      .map((e) => Number(e.querySelector('[data-tws="figure"] b')?.textContent ?? NaN));
    const note = root.querySelector('[data-tws54="legend-row"][data-k="wait"]')?.textContent ?? "";
    return { figs, note };
  });
  expect(r.figs, "L7 · no request reads 0 days waiting").not.toContain(0);
  expect(r.note, "L7 · the legend's note is the longest wait the rows show").toContain(`${Math.max(...r.figs)} days`);
  expect(Math.max(...r.figs), "L7 · which is at least Jonathan's").toBeGreaterThanOrEqual(days);
  await row.click();
  await page.mouse.move(1100, 120);
  await page.waitForTimeout(400);
  await page.locator(`${PG} [data-tws="tray"]`).screenshot({ path: `${SHOTS}/jonathan-days${MUT ? `-${MUT}` : ""}.png` });
  note("L7", { q, days, fig, ...r });
});

/* ══ L8 · no stray "TO-DO LIST" ═══════════════════════════════════════════════════════════════════════════ */
for (const vp of SIZES) {
  test(`L8 · no "To-do list" label in the tray, at rest or scrolled (${vp.width})`, async ({ page }) => {
    await open(page, vp);
    const read = () => page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const tray = root.querySelector<HTMLElement>('[data-tws="tray"]')!;
      const tr = tray.getBoundingClientRect();
      /* anything drawn over the tray's box that says "to-do list", from anywhere in the document */
      const over = [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => {
        const own = [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
        if (!/to-?do list/i.test(own)) return false;
        const b = e.getBoundingClientRect();
        const vis = (e as unknown as { checkVisibility: (o: object) => boolean }).checkVisibility({ opacityProperty: true, visibilityProperty: true });
        return vis && b.width > 0 && b.right > tr.left && b.left < tr.right && b.bottom > tr.top && b.top < tr.bottom;
      }).map((e) => `${e.tagName}.${e.className}`);
      return { inTray: /to-?do list/i.test(tray.innerText), over };
    });
    const rest = await read();
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().height > 0)!; sc.scrollTop = sc.scrollHeight; });
    await page.waitForTimeout(300);
    const scrolled = await read();
    expect(rest, "L8 · at rest").toEqual({ inTray: false, over: [] });
    expect(scrolled, "L8 · scrolled").toEqual({ inTray: false, over: [] });
  });
}

/* ══ L10 · the phone ═════════════════════════════════════════════════════════════════════════════════════════ */
test("L10 · the phone To-do is unchanged: none of v55 on it, and no phone file touched", async ({ page }) => {
  const touched = execFileSync("git", ["diff", "--name-only", "510c1cec3", "--", "src/components/todo/phone", "src/components/phone"], { encoding: "utf8" }).trim();
  expect(touched, "L10 · no phone file differs from the base").toBe("");
  await openPhone(page, "/todo", { width: 390, height: 844 });
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => ({
    phone: !!document.querySelector("[data-tdp]"),
    v55: document.querySelectorAll("[data-tws55], [data-tws55-strip], .tws55-head").length,
  }));
  expect(r.phone, "L10 · the phone's own To-do").toBe(true);
  expect(r.v55, "L10 · no v55 parts on the phone").toBe(0);
});

/* ══ the screenshots ═══════════════════════════════════════════════════════════════════════════════════════ */
test("shots · the head at rest, search, the open menu, a filtered list", async ({ page }) => {
  test.skip(!!MUT, "screenshots only on the clean run");
  await open(page, { width: 1440, height: 900 });
  const tray = page.locator(`${PG} [data-tws="tray"]`);
  await tray.screenshot({ path: `${SHOTS}/head-at-rest.png` });
  await page.keyboard.press("/");
  await page.locator(`${PG} [data-tws55="search"] input`).pressSequentially("marsh", { delay: 20 });
  await page.waitForTimeout(300);
  await tray.screenshot({ path: `${SHOTS}/search.png` });
  await page.keyboard.press("Escape");
  await page.locator(`${PG} [data-tws55="menu-btn"]`).click();
  await page.locator(`${PG} [data-tws55-type="Nudge"]`).click();
  await page.locator(`${PG} [data-tws55-when="Overdue"]`).click();
  await page.waitForTimeout(200);
  await tray.screenshot({ path: `${SHOTS}/menu-open.png` });
  await page.mouse.click(1000, 600);
  await page.waitForTimeout(200);
  await tray.screenshot({ path: `${SHOTS}/filtered.png` });
  await page.locator(`${PG} [data-tws55="fline-clear"]`).click();
  await page.screenshot({ path: `${SHOTS}/page-1440.png` });
});
