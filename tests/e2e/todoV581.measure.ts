/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v58.1 — five fixes to v58, read off the rendered page (design-refs/todo-list-v58-1/).
 *   TD581_TAG=before SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoV581.measure.ts --project=measure --workers=1
 * on the BASE build records the "before" shots and readings and asserts nothing v58.1-specific. Without TD581_TAG
 * (= "after") it takes the after shots, records the 6.3 readings and asserts them.
 * Nothing here writes a record: the only write is the tray prefs (grouping, collapse), read first and put back after.
 * ⚠️ RUN AT ONE WORKER: the cases share the account's saved tray state.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-list-v58-1";
const TAG = process.env.TD581_TAG ?? "after";
const AFTER = TAG !== "before";
const SHOTS = `${DIR}/${TAG}`;
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/readings`, { recursive: true });
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const PG = '[data-tws="page"]:visible';
const NAVY = "rgb(42, 58, 82)"; // --tw-navy, #2a3a52

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
/** a MOUSE click on the first row of a kind; the pointer then leaves, so only focus can hold anything open */
async function pick(page: Page, kind: string): Promise<string | null> {
  for (const g of ["wait", "nudge", "quiet", "yours", "house"]) await openGroup(page, g);
  const row = page.locator(`${PG} [data-tws="list"] [data-tws-row][data-kind="${kind}"]`).first();
  if (!(await row.count())) return null;
  const title = ((await row.locator(".tws-tx b").textContent()) ?? "").trim();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(700);
  await page.mouse.move(2, 2);
  await page.waitForTimeout(200);
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

/** the desk header, the chip, the open row's focus state, and every row's height and title lines */
const read = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const r1 = (n: number) => Math.round(n * 10) / 10;
  const list = root.querySelector<HTMLElement>('[data-tws="list"]')!;
  const tray = root.querySelector<HTMLElement>('[data-tws="tray"]')!;
  const rows = [...list.querySelectorAll<HTMLElement>("[data-tws-row]")].map((r) => {
    const b = r.querySelector<HTMLElement>(".tws-tx b")!;
    const du = r.querySelector<HTMLElement>(".tws-du");
    const lh = parseFloat(getComputedStyle(b).lineHeight);
    return {
      key: r.getAttribute("data-tws-row"), kind: r.getAttribute("data-kind"), open: r.getAttribute("aria-current") === "true",
      h: r1(r.getBoundingClientRect().height), titleLines: Math.round(b.getBoundingClientRect().height / lh),
      fig: du ? { text: [...du.children].map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" "), dir: getComputedStyle(du).flexDirection, vis: getComputedStyle(du).visibility } : null,
    };
  });
  const wh = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-wh') ?? root.querySelector<HTMLElement>(".tws-wh");
  const chip = root.querySelector<HTMLElement>('[data-tws="desk"] .tws-dchip');
  const open = list.querySelector<HTMLElement>('[data-tws-row][aria-current="true"]');
  const focused = document.activeElement as HTMLElement | null;
  const rowOf = (e: HTMLElement | null) => e?.closest<HTMLElement>("[data-tws-row]") ?? null;
  const qfb = list.querySelector<HTMLElement>(".tws-qfb");
  const rule = qfb?.closest(".tws-gbw")?.querySelector<HTMLElement>("[data-tws58='rule']") ?? null;
  return {
    trayW: r1(tray.getBoundingClientRect().width),
    rows,
    header: wh ? { band: wh.getAttribute("data-band"), cls: wh.className, bg: getComputedStyle(wh).backgroundColor, bgImage: getComputedStyle(wh).backgroundImage, ink: getComputedStyle(wh).color,
      title: (wh.querySelector("h2")?.textContent ?? "").trim() } : null,
    chip: chip ? { text: (chip.textContent ?? "").replace(/\s+/g, " ").trim(), edge: getComputedStyle(chip).boxShadow, bg: getComputedStyle(chip).backgroundColor } : null,
    openRow: open ? {
      key: open.getAttribute("data-tws-row"), focused: rowOf(focused) === open, outline: getComputedStyle(open).outlineStyle + " " + getComputedStyle(open).outlineColor,
      figVis: getComputedStyle(open.querySelector(".tws-du") ?? open.querySelector(".tws-qf") ?? open).visibility,
      qact: getComputedStyle(open.querySelector(".tws-qact")!).display,
    } : null,
    quickFill: qfb && rule ? { ruleRight: r1(rule.getBoundingClientRect().right), qfbLeft: r1(qfb.getBoundingClientRect().left), qfbRight: r1(qfb.getBoundingClientRect().right) } : null,
  };
});

for (const vp of SIZES) {
  test(`shots and readings at ${vp.width}`, async ({ page }) => {
    await openTodo(page, vp);
    const load = await read(page);
    note(`load-${vp.width}`, load);
    const wraps = load.rows.filter((r) => r.titleLines > 1).length;
    note(`wraps-${vp.width}`, { wraps, of: load.rows.length, trayW: load.trayW });

    const headers: Record<string, unknown> = {};
    const send = await pick(page, "send");
    if (send) { await page.screenshot({ path: `${SHOTS}/send-open-${vp.width}.png` }); const r = await read(page); headers.send = r.header; note(`send-${vp.width}`, { title: send, ...r }); }
    const nudge = await pick(page, "nudge");
    if (nudge) { await page.screenshot({ path: `${SHOTS}/nudge-open-${vp.width}.png` }); const r = await read(page); headers.nudge = r.header; note(`nudge-${vp.width}`, { title: nudge, ...r }); }
    for (const kind of ["quiet", "offer", "own", "fix", "batch"]) {
      const t = await pick(page, kind);
      if (!t) continue;
      const r = await read(page);
      headers[kind] = r.header;
      note(`${kind}-${vp.width}`, { title: t, header: r.header, chip: r.chip, openRow: r.openRow });
      if (vp.width === 1512 && (kind === "batch" || kind === "fix")) await page.screenshot({ path: `${SHOTS}/${kind}-open-${vp.width}.png` });
    }
    /* "A new task" */
    await openGroup(page, "yours");
    const add = page.locator(`${PG} .tws-addt`).first();
    if (await add.count()) {
      await add.scrollIntoViewIfNeeded(); await add.click(); await page.waitForTimeout(600); await page.mouse.move(2, 2);
      const r = await read(page);
      headers.newTask = r.header;
      if (vp.width === 1512) await page.screenshot({ path: `${SHOTS}/new-task-${vp.width}.png` });
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
    note(`headers-${vp.width}`, headers);

    await openTodo(page, vp);
    await openGroup(page, "house");
    await scrollToGroup(page, "house");
    await page.mouse.move(2, 2);
    await page.screenshot({ path: `${SHOTS}/housekeeping-${vp.width}.png` });
    const hk = await read(page);
    note(`housekeeping-${vp.width}`, hk.quickFill);

    if (!AFTER) return;
    /* fix 1 — the desk header is navy on every task */
    const hs = Object.entries(headers) as [string, { bg: string; bgImage: string; ink: string } | null][];
    expect(hs.length).toBeGreaterThanOrEqual(4);
    for (const [k, h] of hs) { expect(h, k).not.toBeNull(); expect(h!.bg, `${k} ground`).toBe(NAVY); expect(h!.bgImage, `${k} image`).toBe("none"); expect(h!.ink, `${k} ink`).toBe("rgb(255, 255, 255)"); }
    /* fix 3 — no edge on the chip */
    const chipped = [readings[`send-${vp.width}`], readings[`nudge-${vp.width}`]].map((x) => (x as { chip?: { edge: string } } | undefined)?.chip).filter(Boolean);
    expect(chipped.length).toBeGreaterThan(0);
    for (const c of chipped) expect(c!.edge).toBe("none");
    /* fix 2 — a row clicked with the mouse keeps focus but shows its figure, no actions, no outline */
    const n = readings[`nudge-${vp.width}`] as { openRow: { focused: boolean; outline: string; figVis: string; qact: string } };
    expect(n.openRow.focused).toBe(true);
    expect(n.openRow.figVis).toBe("visible");
    expect(n.openRow.qact).toBe("none");
    expect(n.openRow.outline.startsWith("none")).toBe(true);
    /* fix 4 — rows stay 58; at 1280 no more titles wrap than before v58 (14) */
    for (const r of load.rows) if (r.titleLines <= 1 && !r.open) expect(r.h, `${r.key} height`).toBe(58);
    if (load.trayW <= 360) {
      expect(wraps).toBeLessThanOrEqual(14);
      for (const r of load.rows) if (r.fig?.text.includes(" ")) expect(r.fig.dir, `${r.key} stacks`).toBe("column");
    } else for (const r of load.rows) if (r.fig) expect(r.fig.dir, `${r.key} one line`).toBe("row");
    /* fix 5 — the rule stops short of Quick fill */
    expect(hk.quickFill).not.toBeNull();
    expect(hk.quickFill!.ruleRight).toBeLessThan(hk.quickFill!.qfbLeft);
  });
}

test("keyboard: a row reached by Tab shows a navy ring and its two quick actions", async ({ page }) => {
  await openTodo(page, SIZES[0]);
  await openGroup(page, "nudge");
  const rows = page.locator(`${PG} [data-tws="list"] [data-tws-row]:not([aria-current="true"])`);
  const first = await rows.nth(0).getAttribute("data-tws-row");
  /* focus a row by script, then Tab until the browser's own keyboard path lands on the NEXT row (it may pass through the
     first row's quick actions on the way): Tab is what sets :focus-visible */
  await rows.nth(0).evaluate((e) => (e as HTMLElement).focus());
  let key: string | null = null;
  const trail: string[] = [];
  for (let i = 0; i < 6 && !key; i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(150);
    trail.push(await page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? `${a.getAttribute("data-tws-row") ?? a.getAttribute("aria-label") ?? a.tagName}` : "none"; }));
    key = await page.evaluate((f) => { const a = document.activeElement as HTMLElement | null; const k = a?.getAttribute("data-tws-row"); return k && k !== f ? k : null; }, first);
  }
  expect(key, "Tab reached a second row").not.toBeNull();
  const row = page.locator(`${PG} [data-tws-row="${key}"]`).first();
  await page.waitForTimeout(250);
  const kb = await row.evaluate((r) => ({
    focused: document.activeElement === r, fv: r.matches(":focus-visible"),
    outline: `${getComputedStyle(r).outlineStyle} ${getComputedStyle(r).outlineColor} ${getComputedStyle(r).outlineWidth}`,
    qact: getComputedStyle(r.querySelector(".tws-qact")!).display, du: getComputedStyle(r.querySelector(".tws-du") ?? r).visibility,
  }));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  const inner = await row.evaluate((r) => ({
    inSnooze: r.querySelector(".tws-qact")!.contains(document.activeElement), label: document.activeElement?.getAttribute("aria-label"),
    at: (() => { const a = document.activeElement as HTMLElement | null; return a ? `${a.tagName}.${a.className}|row=${a.getAttribute("data-tws-row") ?? a.closest("[data-tws-row]")?.getAttribute("data-tws-row") ?? ""}|fv=${a.matches(":focus-visible")}` : "none"; })(),
    rowHas: r.matches(":has(:focus-visible)"), rowFw: r.matches(":focus-within"),
    qact: getComputedStyle(r.querySelector(".tws-qact")!).display,
  }));
  await page.keyboard.press("Tab");
  await page.waitForTimeout(250);
  const inner2 = await row.evaluate((r) => ({ label: document.activeElement?.getAttribute("aria-label"), qact: getComputedStyle(r.querySelector(".tws-qact")!).display }));
  note("keyboard", { first, key, trail, kb, inner, inner2 });
  if (AFTER) {
    expect(kb.focused && kb.fv).toBe(true);
    expect(kb.outline).toContain(NAVY);
    expect(kb.qact).toBe("flex");
    expect(inner.inSnooze).toBe(true);
    expect(inner.qact).toBe("flex");
    expect(inner2.qact).toBe("flex");
    expect([inner.label, inner2.label].sort()).toEqual(["Dismiss", "Snooze"].sort());
  }
});
