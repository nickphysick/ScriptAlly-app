/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do arrival v1 (design-refs/todo-arrival-v1/) — read off the rendered page at 1280×800, 1512×900 and 1920×1080:
 *   · arrival: no row open, no desk card, "Where to start" fits the workspace's one-screen height (the waiting line
 *     included, or stepped aside and said so), its heading top-aligned with where the desk's bar starts;
 *   · a pile hovered: its group's rows lit, every other row at 45%;
 *   · Start: the task opens; a send task shows its steps ahead with one button (none in the footer);
 *   · a nudge opened: its footer as before (Next);
 *   · the tray: no title wraps where it did not at 1920 before (an in-page control restores the old one-line figure),
 *     and the figure column never overlaps the title column;
 *   · the load outline (load=slow): heading top and pile tops identical loading and loaded, no layout shift.
 * Screenshots into reports/todo-arrival-v1/. The only write is the tray's prefs (grouping, collapse), restored at the end.
 *   SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoArrival.measure.ts --project=measure --workers=1
 * ⚠️ RUN AT ONE WORKER.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(240_000);
const DIR = "reports/todo-arrival-v1";
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

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
/** the page's own scroller to its end: the navy header gone under the slim bar, the workspace pinned (as v56 settles) */
async function pin(page: Page) {
  await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  });
  await page.waitForTimeout(400);
}
async function openTodo(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/todo", vp);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.locator(`${PG} [data-twa="run"]`)).toBeVisible({ timeout: 30_000 });
  await settle(page);
}

/** the run-through and its surroundings, measured */
const arrival = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const q = <T extends Element = HTMLElement>(s: string) => root.querySelector<T & HTMLElement>(s);
  const R = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { top: Math.round(r.top * 10) / 10, bottom: Math.round(r.bottom * 10) / 10, left: Math.round(r.left * 10) / 10, right: Math.round(r.right * 10) / 10, h: Math.round(r.height * 10) / 10 } : null; };
  const run = q('[data-twa="run"]')!;
  const deskCol = q('[data-tws="desk-col"]')!;
  const line = q(".twa-line");
  const sc = root.closest<HTMLElement>(".wpg-scroll");
  return {
    openRows: root.querySelectorAll('[data-tws-row][aria-current="true"]').length,
    deskCards: deskCol.querySelectorAll(".tws-wsx").length,
    navyBars: deskCol.querySelectorAll(".tws-wh").length,
    run: R(run), runScrollH: run.scrollHeight, runClientH: run.clientHeight,
    deskCol: R(deskCol), deskPadTop: parseFloat(getComputedStyle(deskCol).paddingTop),
    head: R(q(".twa-head h2")), headRow: R(q(".twa-head")),
    piles: [...root.querySelectorAll('[data-twa-pile]')].map((p) => ({ id: p.getAttribute("data-twa-pile"), ...R(p), count: p.querySelector('[data-twa="count"]')?.textContent, discs: p.querySelectorAll(".twa-av").length, more: p.querySelector(".twa-more")?.textContent ?? null })),
    line: line ? { ...R(line), visible: getComputedStyle(line).display !== "none", dots: line.querySelectorAll("[data-twa-dot]").length, labels: [...line.querySelectorAll(".twa-lab")].map((l) => l.textContent), bracket: !!line.querySelector('[data-twa="bracket"]') } : null,
    hawk: q('[data-twa="say"]')?.textContent ?? null,
    start: q('[data-twa="start"]')?.textContent ?? null,
    pageScroll: sc ? { scrollH: sc.scrollHeight, clientH: sc.clientHeight, top: sc.scrollTop } : null,
    workspace: R(q('[data-tws="workspace"]')),
  };
});

/** every tray row: title lines, and the title and figure columns' edges */
const trayRows = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  return [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row]')].map((r) => {
    const b = r.querySelector<HTMLElement>(".tws-tx b")!, tx = r.querySelector<HTMLElement>(".tws-tx")!, du = r.querySelector<HTMLElement>(".tws-du");
    const ag = r.querySelector<HTMLElement>(".tws-tx > span");
    return {
      key: r.getAttribute("data-tws-row"), title: (b.textContent ?? "").trim(),
      titleLines: Math.round(b.getBoundingClientRect().height / parseFloat(getComputedStyle(b).lineHeight)),
      txRight: Math.round(tx.getBoundingClientRect().right * 10) / 10, duLeft: du ? Math.round(du.getBoundingClientRect().left * 10) / 10 : null,
      fig: du ? [...du.children].map((c) => (c.textContent ?? "").trim()).filter(Boolean).join(" ") : null,
      figDir: du ? getComputedStyle(du).flexDirection : null,
      agencyCut: ag ? ag.scrollWidth > ag.clientWidth + 1 : false,
      h: Math.round(r.getBoundingClientRect().height),
    };
  });
});

for (const vp of SIZES) {
  test(`arrival, a pile, Start, a nudge and the tray at ${vp.width}`, async ({ page }) => {
    await openTodo(page, vp);
    await pin(page);
    const a = await arrival(page);
    note(`arrival-${vp.width}`, a);
    await page.screenshot({ path: `${DIR}/shots/arrival-${vp.width}.png` });
    expect(a.openRows, "no row open").toBe(0);
    expect(a.deskCards, "no desk card").toBe(0);
    expect(a.navyBars, "no navy bar").toBe(0);
    expect(a.runScrollH, "the run-through fits its height").toBeLessThanOrEqual(a.runClientH + 1);
    /* top-aligned with where the desk's bar starts: the desk column's own padding */
    expect(Math.abs(a.headRow!.top - (a.deskCol!.top + a.deskPadTop)), "heading row starts where the desk bar does").toBeLessThanOrEqual(1);
    expect(a.piles.length).toBeGreaterThan(0);
    if (a.line?.visible) expect(a.line.bottom, "the waiting line inside the run-through").toBeLessThanOrEqual(a.run!.bottom + 1);

    /* a pile hovered: its group's rows lit, every other row at 45% */
    const pile = page.locator(`${PG} [data-twa-pile]`).first();
    const pid = await pile.getAttribute("data-twa-pile");
    await pile.hover();
    await page.waitForTimeout(300);
    const lit = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const rows = [...root.querySelectorAll<HTMLElement>('[data-tws="list"] [data-tws-row]')];
      return { lit: rows.filter((r) => r.hasAttribute("data-twa-lit")).length, litOpacity: [...new Set(rows.filter((r) => r.hasAttribute("data-twa-lit")).map((r) => getComputedStyle(r).opacity))], restOpacity: [...new Set(rows.filter((r) => !r.hasAttribute("data-twa-lit")).map((r) => getComputedStyle(r).opacity))], pileLit: !!root.querySelector("[data-twa-pile][data-lit]") };
    });
    note(`pile-${vp.width}`, { pid, ...lit });
    await page.screenshot({ path: `${DIR}/shots/pile-hover-${vp.width}.png` });
    expect(lit.lit).toBeGreaterThan(0);
    expect(lit.litOpacity).toEqual(["1"]);
    if (lit.restOpacity.length) expect(lit.restOpacity).toEqual(["0.45"]);
    expect(lit.pileLit).toBe(true);
    await page.mouse.move(2, 2);

    /* the tray, close up, while Where to start shows */
    await page.locator(`${PG} [data-tws="tray"]`).screenshot({ path: `${DIR}/shots/tray-${vp.width}.png` });
    const rows = await trayRows(page);
    note(`tray-${vp.width}`, rows);
    for (const r of rows) if (r.duLeft != null) expect(r.duLeft, `${r.title}: figure clear of the title column`).toBeGreaterThanOrEqual(r.txRight - 0.5);
    for (const r of rows) if (r.fig && r.fig.includes(" ")) expect(r.figDir, `${r.title} tucked`).toBe("column");
    if (vp.width === 1920) {
      /* the control: the old one-line figure (v58.1 · 4 above 360px), restored in-page, at 1920 */
      const tag = await page.addStyleTag({ content: ".tws .tws-ti .tws-du { flex-direction: row !important; align-items: baseline !important; gap: 5px !important; } .tws .tws-ti .tws-du small { font: 13.5px var(--tw-serif) !important; }" });
      await page.waitForTimeout(300);
      note("tray-1920-control", await trayRows(page));
      await tag.evaluate((n) => (n as Element).remove());
      await page.waitForTimeout(300);
    }

    /* Start: the first task opens with the 220ms fade */
    const start = (await page.locator(`${PG} [data-twa="start"]`).textContent()) ?? "";
    await page.locator(`${PG} [data-twa="start"]`).click();
    await expect(page.locator(`${PG} [data-tws="desk-title"]`)).toBeVisible({ timeout: 10_000 });
    await settle(page);
    const opened = await page.evaluate(() => {
      const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const f = root.querySelector('[data-tws="footer"]');
      return {
        title: root.querySelector('[data-tws="desk-title"]')?.textContent, ahead: !!root.querySelector('[data-twa="ahead"]'),
        steps: [...root.querySelectorAll("[data-twa-step]")].map((s) => (s.textContent ?? "").replace(/\s+/g, " ").trim()),
        doors: root.querySelectorAll('[data-twa="door"]').length, footer: (f?.textContent ?? "").replace(/\s+/g, " ").trim(),
        run: !!root.querySelector('[data-twa="run"]'), lit: root.querySelectorAll("[data-twa-lit]").length,
      };
    });
    note(`start-${vp.width}`, { start, ...opened });
    await page.screenshot({ path: `${DIR}/shots/start-opened-${vp.width}.png` });
    expect(opened.run).toBe(false);
    expect(opened.lit, "nothing lights once a task is open").toBe(0);
    if (opened.ahead) {
      expect(opened.doors).toBe(1);
      expect(opened.footer).toMatch(/Snooze/);
      expect(opened.footer).not.toMatch(/Mark sent|Mark resubmitted|Answer the offer/);
    }

    /* a send task's steps ahead, opened from its row (if Start was not one) */
    const send = page.locator(`${PG} [data-tws-row][data-kind="send"]`).first();
    if (await send.count()) {
      await send.click();
      await settle(page);
      note(`send-${vp.width}`, await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        return { steps: [...root.querySelectorAll("[data-twa-step]")].map((s) => (s.textContent ?? "").replace(/\s+/g, " ").trim()), doors: root.querySelectorAll('[data-twa="door"]').length, footer: (root.querySelector('[data-tws="footer"]')?.textContent ?? "").replace(/\s+/g, " ").trim() };
      }));
      await page.screenshot({ path: `${DIR}/shots/send-steps-${vp.width}.png` });
    }

    /* a nudge: its footer as before */
    const nudge = page.locator(`${PG} [data-tws-row][data-kind="nudge"]`).first();
    if (await nudge.count()) {
      await nudge.click();
      await settle(page);
      const nf = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        return { title: root.querySelector('[data-tws="desk-title"]')?.textContent, footer: (root.querySelector('[data-tws="footer"]')?.textContent ?? "").replace(/\s+/g, " ").trim(), ahead: !!root.querySelector('[data-twa="ahead"]') };
      });
      note(`nudge-${vp.width}`, nf);
      await page.screenshot({ path: `${DIR}/shots/nudge-${vp.width}.png` });
      expect(nf.ahead).toBe(false);
      /* RE-POINTED (To-do nudge desk v1): a nudge is one step; its footer holds Log it where Next was */
      expect(nf.footer).toMatch(/Log it/);
    }
  });
}

test("the tray's titles: none wraps where it did not at 1920 before", () => {
  const before = readings["tray-1920-control"] as { title: string; titleLines: number }[] | undefined;
  expect(before, "the 1920 control was read").toBeTruthy();
  const wrapBefore = new Map(before!.map((r) => [r.title, r.titleLines > 1]));
  const out: Record<string, string[]> = {};
  for (const vp of SIZES) {
    const now = readings[`tray-${vp.width}`] as { title: string; titleLines: number }[];
    out[vp.width] = now.filter((r) => r.titleLines > 1 && !wrapBefore.get(r.title)).map((r) => r.title);
  }
  note("title-wraps-new", out);
  for (const vp of SIZES) expect(out[vp.width], `${vp.width}: titles that wrap now and did not at 1920 before`).toEqual([]);
});

test("the load outline takes the run-through's shape: nothing moves when the tasks land (load=slow, 1512)", async ({ page }) => {
  const VP = SIZES[1];
  await openRoute(page, "/dashboard", VP);
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: { t: number; v: number }[] };
    w.__cls = [];
    new PerformanceObserver((list) => { for (const e of list.getEntries() as unknown as { startTime: number; value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls.push({ t: Math.round(e.startTime), v: e.value }); })
      .observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/todo?load=slow");
  await page.waitForTimeout(1500);
  const geom = () => page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const t = (e: Element | null) => (e ? Math.round(e.getBoundingClientRect().top * 100) / 100 : null);
    return {
      phase: root.querySelector('[data-tws="workspace"]')?.getAttribute("data-twl-phase") ?? null,
      outline: root.querySelector('[data-tws="desk-col"] [data-twl-out]')?.getAttribute("data-twl-out") ?? null,
      head: t(root.querySelector('[data-tws="desk-col"] .twa-head h2')), headRow: t(root.querySelector('[data-tws="desk-col"] .twa-head')),
      piles: [...root.querySelectorAll('[data-tws="desk-col"] .twa-pile')].map(t),
    };
  });
  const loading = await geom();
  await page.screenshot({ path: `${DIR}/shots/load-outline-1512.png` });
  const swapAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(6000);
  const loaded = await geom();
  await page.screenshot({ path: `${DIR}/shots/load-loaded-1512.png` });
  const cls = await page.evaluate(() => (window as unknown as { __cls: { t: number; v: number }[] }).__cls);
  const atSwap = cls.filter((e) => e.t >= swapAt);
  note("load", { loading, loaded, clsAll: cls, clsAfterOutline: atSwap });
  expect(loading.phase).toBe("outline");
  expect(loading.outline).toBe("run");
  expect(loaded.phase).toBe("loaded");
  expect(loaded.headRow).toBe(loading.headRow);
  expect(loaded.head).toBe(loading.head);
  expect(loaded.piles[0]).toBe(loading.piles[0]);
  expect(atSwap.reduce((s, e) => s + e.v, 0)).toBe(0);
});
