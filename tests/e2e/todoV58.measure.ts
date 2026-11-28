/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58 — the tray restyle and the hawk's bubble, read off the rendered page (design-refs/todo-list-v58/).
 *   TD58_TAG=before SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoV58.measure.ts --project=measure --workers=1
 * on the BASE build records the "before" shots and readings and asserts nothing v58-specific. Without TD58_TAG
 * (= "after") it takes the after shots, records the 8.3 readings and asserts them.
 * Nothing here writes a record: the only write is the tray prefs (grouping, collapse), read first and put back after.
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved tray state.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute, startFirstTodoTask } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-list-v58";
const TAG = process.env.TD58_TAG ?? "after";
const AFTER = TAG !== "before";
const SHOTS = `${DIR}/${TAG}`;
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/readings`, { recursive: true });
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const PG = '[data-tws="page"]:visible';

const readings: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { readings[k] = v; };
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd55.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 });
  return JSON.parse(out.trim().split("\n").pop()!);
};
let prefs: Record<string, unknown> | null = null;
test.beforeAll(() => { prefs = seed("prefs", { trayGrouping: null, trayCollapsed: null }); });
test.afterAll(() => {
  const file = `${DIR}/readings/${TAG}.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
  if (prefs) seed("prefs", prefs);
});

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
async function openTodo(page: Page, vp: { width: number; height: number }) {
  seed("prefs", { trayGrouping: null, trayCollapsed: null });
  await openRoute(page, "/todo", vp);
  /* RE-POINTED (To-do arrival v1): arrival opens no task; Start opens the one it used to */
  await startFirstTodoTask(page);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  let last = "";
  for (let i = 0; i < 20; i++) {
    const t = (await page.locator(`${PG} [data-tws="desk-title"]`).first().textContent().catch(() => "")) ?? "";
    if (t === last && t) break;
    last = t;
    await page.waitForTimeout(1200);
  }
  await settle(page);
}
async function openGroup(page: Page, id: string) {
  const gb = page.locator(`${PG} [data-tws-group="${id}"] .tws-gb`);
  if ((await gb.count()) && (await gb.first().getAttribute("aria-expanded")) === "false") { await gb.first().click(); await page.waitForTimeout(300); }
}
async function pick(page: Page, kind: string): Promise<string | null> {
  for (const g of ["wait", "nudge", "quiet", "yours"]) await openGroup(page, g);
  const row = page.locator(`${PG} [data-tws="list"] [data-tws-row][data-kind="${kind}"]`).first();
  if (!(await row.count())) return null;
  const title = ((await row.locator(".tws-tx b").textContent()) ?? "").trim();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
  return title;
}
async function scrollToGroup(page: Page, id: string) {
  await page.evaluate((id) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const g = root.querySelector<HTMLElement>(`[data-tws-group="${id}"]`);
    const list = root.querySelector<HTMLElement>('[data-tws="list"]');
    if (g && list) list.scrollTop = g.offsetTop - list.offsetTop - 8;
  }, id);
  await page.waitForTimeout(500);
}

/** every 8.3 reading off the visible page, plus what the 8.1 browser half needs */
const readTray = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const list = root.querySelector<HTMLElement>('[data-tws="list"]')!;
  const rows = [...list.querySelectorAll<HTMLElement>("[data-tws-row]")];
  const rowRead = rows.map((r) => {
    const av = r.querySelector<HTMLElement>(".tws-av")!;
    const b = r.querySelector<HTMLElement>(".tws-tx b")!;
    const du = r.querySelector<HTMLElement>(".tws-du");
    const lh = parseFloat(getComputedStyle(b).lineHeight);
    const after = getComputedStyle(r, "::after");
    return {
      key: r.getAttribute("data-tws-row"), kind: r.getAttribute("data-kind"), open: r.getAttribute("aria-current") === "true",
      h: r1(r.getBoundingClientRect().height), titleLines: Math.round(b.getBoundingClientRect().height / lh),
      av: { k: av.getAttribute("data-k"), w: r1(av.getBoundingClientRect().width), h: r1(av.getBoundingClientRect().height), bg: getComputedStyle(av).backgroundColor, bgImage: getComputedStyle(av).backgroundImage, edge: getComputedStyle(av).boxShadow },
      stage: r.getAttribute("data-tws58-stage"),
      fig: du ? { text: [...du.children].map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" "), display: getComputedStyle(du).display, colour: du.querySelector("b") ? getComputedStyle(du.querySelector("b")!).color : null } : null,
      bar: after.content !== "none" && after.content !== "" ? { w: parseFloat(after.width), top: parseFloat(after.top), bottom: parseFloat(after.bottom), bg: after.backgroundColor } : null,
    };
  });
  const heads = [...list.querySelectorAll<HTMLElement>(".tws-gbw")].map((g) => {
    const gb = g.querySelector<HTMLElement>(".tws-gb")!;
    const prev = g.previousElementSibling as HTMLElement | null;
    return {
      id: g.getAttribute("data-tws-group"), h: r1(gb.getBoundingClientRect().height),
      gapAbove: prev ? r1(g.getBoundingClientRect().top - prev.getBoundingClientRect().bottom) : r1(g.getBoundingClientRect().top - list.getBoundingClientRect().top),
      first: !prev, bg: getComputedStyle(gb).backgroundColor, bgImage: getComputedStyle(gb).backgroundImage,
      rule: (() => { const s = gb.querySelector<HTMLElement>("[data-tws58='rule']"); return s ? { w: r1(s.getBoundingClientRect().width), h: r1(s.getBoundingClientRect().height), bg: getComputedStyle(s).backgroundColor } : null; })(),
    };
  });
  const chip = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-dchip');
  const mnote = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-mnote p');
  return {
    rows: rowRead, heads,
    chip: chip ? (chip.textContent ?? "").replace(/\s+/g, " ").trim() : null,
    hawk: mnote ? { bg: getComputedStyle(mnote).backgroundColor, bgImage: getComputedStyle(mnote).backgroundImage, edge: getComputedStyle(mnote).boxShadow, ink: getComputedStyle(mnote).color, w: r1(mnote.getBoundingClientRect().width) } : null,
    deskTitle: (root.querySelector('[data-tws="desk-title"]')?.textContent ?? "").trim(),
  };
});

for (const vp of SIZES) {
  test(`shots and readings at ${vp.width}`, async ({ page }) => {
    await openTodo(page, vp);
    await page.screenshot({ path: `${SHOTS}/load-${vp.width}.png` });
    const load = await readTray(page);
    note(`load-${vp.width}`, load);

    const nudge = await pick(page, "nudge");
    if (nudge) {
      await page.screenshot({ path: `${SHOTS}/nudge-open-${vp.width}.png` });
      note(`nudge-${vp.width}`, { title: nudge, ...(await readTray(page)) });
    }
    if (AFTER) {
      const offer = await pick(page, "offer");
      if (offer) { await page.screenshot({ path: `${SHOTS}/offer-open-${vp.width}.png` }); note(`offer-${vp.width}`, { title: offer, ...(await readTray(page)) }); }
    }
    await openGroup(page, "house");
    await scrollToGroup(page, "house");
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${SHOTS}/housekeeping-${vp.width}.png` });

    if (!AFTER) return;
    /* 8.3 — rows 58 unless the title wraps, the disc 32 × 32, the bar 3 wide, 24 above each heading but the first */
    const all = load.rows;
    expect(all.length).toBeGreaterThan(0);
    for (const r of all) if (r.titleLines <= 1 && !r.open) expect(r.h, `${r.key} height`).toBe(58);
    const discs = all.filter((r) => r.av.k === "glyph" && r.stage);
    expect(discs.length).toBeGreaterThan(0);
    for (const r of discs) expect([r.av.w, r.av.h], `${r.key} disc`).toEqual([32, 32]);
    for (const r of all) expect(r.av.w, `${r.key} glyph cell`).toBe(32);
    const open = load.rows.filter((r) => r.open);
    expect(open.length).toBe(1);
    expect(open[0].bar?.w).toBe(3);
    const heads = load.heads.filter((h) => !h.first);
    expect(heads.length).toBeGreaterThan(0);
    for (const h of heads) expect(h.gapAbove, `${h.id} gap`).toBe(24);
    for (const h of load.heads) { expect(h.rule, `${h.id} rule`).not.toBeNull(); expect(h.bg).toBe("rgba(0, 0, 0, 0)"); expect(h.bgImage).toBe("none"); expect(h.h).toBe(32); }
    /* the chip says what the row says */
    const openRow = open[0];
    if (openRow.fig?.text) expect(load.chip).toBe(openRow.fig.text);
    else expect(load.chip).toBeNull();
    /* no row reads "late", and the figure is one ink on every row */
    for (const r of all) if (r.fig) expect(r.fig.text).not.toMatch(/\blate\b/);
    expect(new Set(all.filter((r) => r.fig?.colour).map((r) => r.fig!.colour)).size).toBeLessThanOrEqual(1);
  });
}

test("hover: the quick actions swap in without moving the row", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  const row = page.locator(`${PG} [data-tws="list"] [data-tws-row]:not([aria-current="true"])`).first();
  const box = async () => row.evaluate((r) => ({ h: r.getBoundingClientRect().height, t: r.querySelector(".tws-tx")!.getBoundingClientRect().width }));
  const rest = await box();
  await row.hover();
  await page.waitForTimeout(300);
  const hov = await box();
  const vis = await row.evaluate((r) => ({ du: getComputedStyle(r.querySelector(".tws-du") ?? r).visibility, qact: getComputedStyle(r.querySelector(".tws-qact")!).display }));
  note("hover", { rest, hov, vis });
  if (AFTER) { expect(hov).toEqual(rest); expect(vis.qact).toBe("flex"); }
});

test("phase 4: send rows with no figure", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  await openGroup(page, "wait");
  const sends = await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row][data-kind="send"]')].map((r) => ({
      key: r.getAttribute("data-tws-row"), title: (r.querySelector(".tws-tx b")?.textContent ?? "").trim(),
      fig: (r.querySelector(".tws-du")?.textContent ?? "").trim(),
    }));
  });
  note("sends", sends);
});
