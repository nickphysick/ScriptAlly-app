/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v1 (design-refs/todo-nudge-desk-v1/) — read off the rendered page at 1280×800, 1512×900, 1920×1080:
 *   · the way back: the tray with "Where to start" open, with a task open, and Esc going back;
 *   · the nudge desk before a pick, "Another day" open, and after a pick (settled): no column scroll with the timeline
 *     card shown, the card centred in its space within 2px, no label overlapping another label or a point, the hawk's
 *     height 0 after the fold, and the layout shifts after the pick recorded;
 *   · frames at 0.2s / 0.6s / 1.0s / 1.6s after a pick at 1512.
 * ⚠️ NOTHING IS LOGGED: answers are picked, Log it is never pressed. The only write is the tray's prefs, restored.
 *   SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoNudgeDesk.measure.ts --project=measure --workers=1
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(240_000);
const DIR = "reports/todo-nudge-desk-v1";
mkdirSync(`${DIR}/shots`, { recursive: true });
const PG = '[data-tws="page"]:visible';
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }];

const readings: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { readings[k] = v; };
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd55.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 });
  return JSON.parse(out.trim().split("\n").pop()!);
};
let prefs: Record<string, unknown> | null = null;
test.beforeAll(() => { prefs = seed("prefs", { trayGrouping: null, trayCollapsed: null }); });
test.afterAll(() => {
  const file = `${DIR}/readings.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
  if (prefs) seed("prefs", prefs);
});

async function settle(page: Page, ms = 600) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
  await page.mouse.move(2, 2);
}
async function pin(page: Page) {
  await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  });
  await page.waitForTimeout(400);
}
/** open /todo fresh (Where to start), the workspace pinned, the layout-shift log running from the first script */
async function openTodo(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/dashboard", vp);
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: { t: number; v: number; recent: boolean; who: string[] }[] };
    w.__cls = [];
    new PerformanceObserver((list) => {
      for (const e of list.getEntries() as unknown as { startTime: number; value: number; hadRecentInput: boolean; sources?: { node?: Element }[] }[]) {
        w.__cls.push({ t: Math.round(e.startTime), v: e.value, recent: e.hadRecentInput, who: (e.sources ?? []).map((s) => (s.node as HTMLElement | undefined)?.className?.toString().slice(0, 60) ?? "?") });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/todo");
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${PG} [data-twa="run"]`)).toBeVisible({ timeout: 30_000 });
  await settle(page);
  await pin(page);
}

const desk = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const R = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
  const wq = q('[data-tws="questions"]');
  const wrap = q('[data-twn="tlwrap"]'), card = q('[data-twn="timeline"]');
  const pad = wrap ? getComputedStyle(wrap) : null;
  const inner = wrap && pad ? { t: wrap.getBoundingClientRect().top + parseFloat(pad.paddingTop), b: wrap.getBoundingClientRect().bottom - parseFloat(pad.paddingBottom), l: wrap.getBoundingClientRect().left, r: wrap.getBoundingClientRect().right } : null;
  const cr = card?.getBoundingClientRect();
  const labs = [...root.querySelectorAll<HTMLElement>("[data-twn-lab]")].map((e) => ({ k: e.getAttribute("data-twn-lab"), ...R(e)! }));
  const pts = [...root.querySelectorAll<HTMLElement>("[data-twn-pt]")].map((e) => ({ k: e.getAttribute("data-twn-pt"), ...R(e)! }));
  const hit = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  const overlaps: string[] = [];
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (hit(labs[i], labs[j])) overlaps.push(`${labs[i].k}×${labs[j].k}`);
  for (const l of labs) for (const p of pts) if (hit(l, p)) overlaps.push(`${l.k}×pt:${p.k}`);
  const hawk = q('[data-twn="hawk"]');
  return {
    title: q('[data-tws="desk-title"]')?.textContent ?? null,
    hawkH: hawk ? hawk.getBoundingClientRect().height : 0, hawkDrawn: !!hawk,
    sentence: (q('[data-twn="sentence"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
    quiet: q('[data-twn="quiet"]')?.textContent ?? null,
    answers: [...root.querySelectorAll('[data-twn-when]')].map((b) => `${b.getAttribute("data-twn-when")}:${b.getAttribute("aria-checked")}`),
    logDisabled: (q('[data-tws="footer"] [data-log]') as HTMLButtonElement | null)?.disabled ?? null,
    footer: (q('[data-tws="footer"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
    column: wq ? { scrollH: wq.scrollHeight, clientH: wq.clientHeight } : null,
    card: cr ? { ...R(card)!, band: getComputedStyle(q('[data-twn="band"]')!).backgroundColor } : null,
    centre: inner && cr ? { dy: Math.round(((cr.top + cr.bottom) / 2 - (inner.t + inner.b) / 2) * 10) / 10, dx: Math.round(((cr.left + cr.right) / 2 - (inner.l + inner.r) / 2) * 10) / 10, roomAbove: Math.round(cr.top - wrap!.getBoundingClientRect().top), roomBelow: Math.round(wrap!.getBoundingClientRect().bottom - cr.bottom) } : null,
    labels: labs.map((l) => `${l.k}:${Math.round(l.l)}-${Math.round(l.r)}`), overlaps,
    run: !!q('[data-twa="run"]'), backOpen: q('[data-twn="back"]')?.getAttribute("aria-current") ?? null,
    openRows: [...root.querySelectorAll('[data-tws-row][aria-current="true"]')].map((r) => r.getAttribute("data-tws-row")),
  };
});
const clsSince = (page: Page, t0: number) => page.evaluate((t) => (window as unknown as { __cls: { t: number; v: number; recent: boolean; who: string[] }[] }).__cls.filter((e) => e.t >= t), t0);

for (const vp of SIZES) {
  test(`the way back and the nudge desk at ${vp.width}`, async ({ page }) => {
    await openTodo(page, vp);
    const w = vp.width;
    /* the tray with Where to start open */
    await page.locator(`${PG} [data-tws="tray"]`).screenshot({ path: `${DIR}/shots/tray-start-${w}.png` });
    const start = await desk(page);
    note(`start-${w}`, { backOpen: start.backOpen, openRows: start.openRows, run: start.run });
    expect(start.backOpen).toBe("true");
    expect(start.openRows).toEqual([]);

    /* a nudge, before a pick */
    const nudge = page.locator(`${PG} [data-tws-row][data-kind="nudge"]`).first();
    await nudge.click();
    await expect(page.locator(`${PG} [data-twn="desk"]`)).toBeVisible({ timeout: 10_000 });
    await settle(page);
    const before = await desk(page);
    note(`before-${w}`, before);
    await page.screenshot({ path: `${DIR}/shots/desk-before-${w}.png` });
    await page.locator(`${PG} [data-tws="tray"]`).screenshot({ path: `${DIR}/shots/tray-task-${w}.png` });
    expect(before.backOpen).toBeNull();
    expect(before.openRows.length).toBe(1);
    expect(before.hawkDrawn).toBe(true);
    expect(before.logDisabled).toBe(true);
    expect(before.card).toBeNull();

    /* "Another day" opens the app's picker (nothing logged; the sentence stays blank) */
    await page.locator(`${PG} [data-twn-when="other"]`).click();
    await settle(page, 900);
    const other = await desk(page);
    note(`other-${w}`, { sentence: other.sentence, logDisabled: other.logDisabled, picker: await page.locator(`${PG} [data-twn="other"] [data-tws="date"]`).count() });
    await page.screenshot({ path: `${DIR}/shots/another-day-${w}.png` });
    expect(other.logDisabled).toBe(true);

    /* a fresh opening of the same task, then Today: the fold, the sentence, the card's arrival, settled */
    await page.keyboard.press("Escape");
    await settle(page, 300);
    const back = await desk(page);
    note(`esc-${w}`, { run: back.run, backOpen: back.backOpen, openRows: back.openRows });
    expect(back.run).toBe(true);
    expect(back.backOpen).toBe("true");
    await nudge.click();
    await settle(page);
    const t0 = await page.evaluate(() => performance.now());
    await page.keyboard.press("1");
    await page.waitForTimeout(2200);
    await settle(page, 200);
    const after = await desk(page);
    const cls = await clsSince(page, t0);
    note(`after-${w}`, { ...after, cls });
    await page.screenshot({ path: `${DIR}/shots/desk-after-${w}.png` });
    expect(after.hawkH).toBe(0);
    expect(after.answers).toEqual(["today:true", "yesterday:false", "other:false"]);
    expect(after.logDisabled).toBe(false);
    expect(after.card).not.toBeNull();
    expect(after.column!.scrollH, "no column scroll with the card shown").toBeLessThanOrEqual(after.column!.clientH + 1);
    expect(Math.abs(after.centre!.dy), "card centred vertically in its room").toBeLessThanOrEqual(2);
    expect(Math.abs(after.centre!.dx), "card centred horizontally").toBeLessThanOrEqual(2);
    expect(after.overlaps).toEqual([]);

    /* Esc from the open nudge goes back; nothing was logged */
    await page.keyboard.press("Escape");
    await settle(page, 300);
    expect((await desk(page)).run).toBe(true);
  });
}

test("frames after a pick at 1512 (0.2s, 0.6s, 1.0s, 1.6s)", async ({ page }) => {
  await openTodo(page, SIZES[1]);
  await page.locator(`${PG} [data-tws-row][data-kind="nudge"]`).first().click();
  await settle(page);
  const t0 = Date.now();
  await page.locator(`${PG} [data-twn-when="today"]`).click();
  for (const at of [200, 600, 1000, 1600]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${DIR}/shots/frame-${String(at).padStart(4, "0")}ms-1512.png` });
    note(`frame-${at}`, { tookAt: Date.now() - t0 });
  }
  await page.keyboard.press("Escape");
});
