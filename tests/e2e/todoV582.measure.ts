/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58.2 — the figures tell the truth, read off the rendered page:
 *   SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoV582.measure.ts --project=measure --workers=1
 * At 1512 and 1280 it counts the tray titles that wrap to two lines and records every row's figure. At 1512 it opens a
 * nudge counted from the reply window, a nudge counted from the writer's reminder, an offer and an own task, takes a
 * shot of each (reports/todo-list-v58-2/after/), and asserts the desk chip says what the row says.
 * Nothing here writes a record: the only write is the tray prefs (grouping, collapse), read first and put back after.
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved tray state.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute, startFirstTodoTask } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-list-v58-2";
const SHOTS = `${DIR}/after`;
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
  const file = `${DIR}/readings/after.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
  if (prefs) seed("prefs", prefs);
});

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
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
async function openGroup(page: Page, id: string) {
  const gb = page.locator(`${PG} [data-tws-group="${id}"] .tws-gb`);
  if ((await gb.count()) && (await gb.first().getAttribute("aria-expanded")) === "false") { await gb.first().click(); await page.waitForTimeout(300); }
}

/** every row: kind, title lines, the figure's text */
const rowsOf = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const tray = root.querySelector<HTMLElement>('[data-tws="tray"]')!;
  const list = root.querySelector<HTMLElement>('[data-tws="list"]')!;
  return {
    trayW: Math.round(tray.getBoundingClientRect().width * 10) / 10,
    rows: [...list.querySelectorAll<HTMLElement>("[data-tws-row]")].map((r) => {
      const b = r.querySelector<HTMLElement>(".tws-tx b")!;
      const du = r.querySelector<HTMLElement>(".tws-du");
      return {
        key: r.getAttribute("data-tws-row"), kind: r.getAttribute("data-kind"), title: (b.textContent ?? "").trim(),
        titleLines: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight)),
        fig: du ? [...du.children].map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" ") : null,
      };
    }),
  };
});
const chipText = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const c = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-dchip');
  /* the chip is `<b>{n}</b> {words}`: its whole text, spaces folded (the row's figure is read the same way) */
  return c ? (c.textContent ?? "").replace(/\s+/g, " ").trim() : null;
});

for (const vp of SIZES) {
  test(`wrapped titles and figures at ${vp.width}`, async ({ page }) => {
    await openTodo(page, vp);
    const load = await rowsOf(page);
    note(`load-${vp.width}`, load);
    const wraps = load.rows.filter((r) => r.titleLines > 1).length;
    note(`wraps-${vp.width}`, { wraps, of: load.rows.length, trayW: load.trayW });
    expect(load.rows.length).toBeGreaterThan(0);
    for (const r of load.rows) if (r.fig) expect(r.fig, r.key!).not.toMatch(/late/i);
  });
}

test("1512: the four opens, and the desk chip says what the row says", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  for (const g of ["wait", "nudge", "quiet", "yours", "house"]) await openGroup(page, g);
  const { rows } = await rowsOf(page);
  const want: [string, (r: (typeof rows)[number]) => boolean][] = [
    ["nudge-window", (r) => r.kind === "nudge" && /past expected/.test(r.fig ?? "")],
    ["nudge-reminder", (r) => r.kind === "nudge" && /since your reminder/.test(r.fig ?? "")],
    ["offer", (r) => r.kind === "offer" && !!r.fig],
    ["own", (r) => r.kind === "own" && /past its date|left|Today/.test(r.fig ?? "")],
  ];
  const opened: Record<string, unknown> = {};
  for (const [name, is] of want) {
    const r = rows.find(is);
    expect(r, `${name} row`).toBeTruthy();
    const row = page.locator(`${PG} [data-tws="list"] [data-tws-row="${r!.key}"]`).first();
    await row.scrollIntoViewIfNeeded();
    await row.click();
    await page.waitForTimeout(800);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(200);
    const chip = await chipText(page);
    opened[name] = { key: r!.key, title: r!.title, row: r!.fig, chip };
    await page.screenshot({ path: `${SHOTS}/${name}-open-1512.png` });
    expect(chip, `${name} chip`).toBe(r!.fig);
  }
  note("opens-1512", opened);
});
