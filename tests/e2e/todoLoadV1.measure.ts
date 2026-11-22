/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do load v1 (design-refs/todo-load-v1/) — the To-do page's loading state, read off the rendered page.
 *   TL_TAG=before SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoLoadV1.measure.ts --project=measure --workers=1
 * BEFORE (the base build): reproduces the flash. A cold load (the Firestore cache emptied, the listen channel slowed)
 * and a warm one, each with a log of every moment the page drew an empty state ("Nothing to do yet", "You're all
 * caught up.", "Nothing snoozed.") while it had no task rows, and a frame sequence into reports/todo-load-v1/before/.
 * AFTER (TL_TAG unset): the four cases through the review switch (`/todo?load=fast|normal|slow|fail`) — a frame
 * sequence each into after/, the B6.2 measurements (the header's height, the workspace's top and the tray's width while
 * loading and once loaded, and the layout shift at the swap), and the cold load again, which must draw no empty state.
 * Nothing here writes a record.
 * ⚠️ RUN AT ONE WORKER.
 */
import { expect, test, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/todo-load-v1";
const TAG = process.env.TL_TAG ?? "after";
const AFTER = TAG !== "before";
const SHOTS = `${DIR}/${TAG}`;
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/readings`, { recursive: true });
const VP = { width: 1512, height: 900 };

const readings: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { readings[k] = v; };
test.afterAll(() => {
  const file = `${DIR}/readings/${TAG}.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
});

/** a log, from the first script on the page, of what the visible To-do page drew and when (ms since navigation) */
const WATCH = () => {
  const w = window as unknown as { __twl: { t: number; what: string }[] };
  w.__twl = [];
  let last = "";
  const look = () => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    if (!root) return;
    const text = root.innerText || "";
    const rows = root.querySelectorAll('[data-tws="list"] [data-tws-row]').length;
    const parts = [
      /You’re all caught up/.test(text) ? "CAUGHT-UP" : "", /Nothing to do yet/.test(text) ? "NOTHING-YET" : "", /Nothing snoozed/.test(text) ? "NOTHING-SNOOZED" : "",
      root.querySelector('[data-twl-out][data-on]') ? "outline" : "", /Still loading your tasks/.test(text) ? "still" : "", /didn’t load/.test(text) ? "failed" : "",
      `rows=${rows}`,
    ].filter(Boolean).join(" ");
    if (parts !== last) { last = parts; w.__twl.push({ t: Math.round(performance.now()), what: parts }); }
  };
  new MutationObserver(look).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
  const raf = () => { look(); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);
};

/** empty the Firestore cache (IndexedDB) from a same-origin page that holds no connection to it */
async function coldCache(page: Page) {
  await page.goto("/favicon.ico").catch(() => {});
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(dbs.filter((d) => d.name?.startsWith("firestore/")).map((d) => new Promise((res) => { const r = indexedDB.deleteDatabase(d.name!); r.onsuccess = r.onerror = r.onblocked = () => res(null); })));
  });
}
/** slow every Firestore listen request by `ms` */
async function slowListen(page: Page, ms: number) {
  await page.route(/google\.firestore\.v1\.Firestore\/(Listen|Write)\/channel/, async (route) => { await new Promise((r) => setTimeout(r, ms)); await route.continue().catch(() => {}); });
}
/** a frame sequence of the visible page, every ~`step` ms for `forMs` */
async function frames(page: Page, name: string, forMs: number, step = 120) {
  const t0 = Date.now();
  const out: string[] = [];
  for (let i = 0; Date.now() - t0 < forMs; i++) {
    const f = `${SHOTS}/${name}-${String(i).padStart(2, "0")}-${String(Date.now() - t0).padStart(4, "0")}ms.jpg`;
    await page.screenshot({ path: f, type: "jpeg", quality: 55, scale: "css" }).catch(() => {});
    out.push(f);
    const wait = step - ((Date.now() - t0) % step);
    await page.waitForTimeout(Math.max(10, wait));
  }
  return out.length;
}
const log = (page: Page) => page.evaluate(() => (window as unknown as { __twl?: { t: number; what: string }[] }).__twl ?? []);
const emptyWhileNoRows = (l: { what: string }[]) => l.filter((e) => /CAUGHT-UP|NOTHING-YET|NOTHING-SNOOZED/.test(e.what) && /rows=0/.test(e.what));

test("a cold load (cache emptied, listen slowed 900ms)", async ({ page }) => {
  await openRoute(page, "/dashboard", VP);
  await coldCache(page);
  await page.addInitScript(WATCH);
  await slowListen(page, 900);
  await page.goto("/todo");
  const n = await frames(page, "cold", 4000);
  await page.waitForTimeout(3000);
  const l = await log(page);
  note("cold", { frames: n, log: l, emptyWhileNoRows: emptyWhileNoRows(l) });
  if (AFTER) expect(emptyWhileNoRows(l)).toEqual([]);
});

test("a warm load (cache kept)", async ({ page }) => {
  await openRoute(page, "/dashboard", VP);
  await page.addInitScript(WATCH);
  await page.goto("/todo");
  const n = await frames(page, "warm", 2500);
  await page.waitForTimeout(1500);
  const l = await log(page);
  note("warm", { frames: n, log: l, emptyWhileNoRows: emptyWhileNoRows(l) });
  if (AFTER) expect(emptyWhileNoRows(l)).toEqual([]);
});

/* ── AFTER: the four cases through the review switch, and B6.2 ── */
const geom = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const r = (s: string) => root.querySelector<HTMLElement>(s)?.getBoundingClientRect() ?? null;
  const hd = r('[data-tws="header"]'), ws = r('[data-tws="workspace"]'), tray = r('[data-tws="tray"]'), wh = r('[data-tws="desk-col"] .tws-wh');
  const p = (n: number | undefined) => (n == null ? null : Math.round(n * 100) / 100);
  return { headerH: p(hd?.height), wsTop: p(ws?.top), trayW: p(tray?.width), deskBarH: p(wh?.height), phase: root.querySelector('[data-tws="workspace"]')?.getAttribute("data-twl-phase") ?? null };
});
for (const c of ["fast", "normal", "slow", "fail"] as const) {
  test(`the switch: load=${c}`, async ({ page }) => {
    test.skip(!AFTER, "the switch exists only on the after build");
    await openRoute(page, "/dashboard", VP);
    await page.addInitScript(WATCH);
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: { t: number; v: number }[] };
      w.__cls = [];
      new PerformanceObserver((list) => { for (const e of list.getEntries() as unknown as { startTime: number; value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls.push({ t: Math.round(e.startTime), v: e.value }); })
        .observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(`/todo?load=${c}`);
    const geo: Record<string, unknown> = {};
    const t0 = Date.now();
    const n = await frames(page, c, c === "fail" ? 6500 : c === "slow" ? 5600 : 2000, c === "fast" ? 60 : 150);
    void t0;
    /* the geometry while loading (taken from the log's phase) and once loaded */
    await page.waitForTimeout(800);
    geo.loaded = await geom(page);
    const l = await log(page);
    const cls = await page.evaluate(() => (window as unknown as { __cls: { t: number; v: number }[] }).__cls);
    note(`switch-${c}`, { frames: n, log: l, cls, geo });
    expect(emptyWhileNoRows(l)).toEqual([]);
    if (c === "fast") expect(l.some((e) => e.what.includes("outline"))).toBe(false);
    if (c === "normal" || c === "slow") expect(l.some((e) => e.what.includes("outline"))).toBe(true);
    if (c === "slow") expect(l.some((e) => e.what.includes("still"))).toBe(true);
    if (c === "fail") expect(l.some((e) => e.what.includes("failed"))).toBe(true);
  });
}

test("B6.2 — nothing moves at the swap (load=slow, measured while loading and once loaded)", async ({ page }) => {
  test.skip(!AFTER, "the switch exists only on the after build");
  await openRoute(page, "/dashboard", VP);
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: { t: number; v: number }[] };
    w.__cls = [];
    new PerformanceObserver((list) => { for (const e of list.getEntries() as unknown as { startTime: number; value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls.push({ t: Math.round(e.startTime), v: e.value }); })
      .observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/todo?load=slow");
  await page.waitForTimeout(1500);
  const loading = await geom(page);
  const swapAt = await page.evaluate(() => performance.now());
  await page.waitForTimeout(4500);
  const loaded = await geom(page);
  const cls = (await page.evaluate(() => (window as unknown as { __cls: { t: number; v: number }[] }).__cls));
  const atSwap = cls.filter((e) => e.t >= swapAt);
  note("b62", { loading, loaded, clsAll: cls, clsAfterOutline: atSwap });
  expect(loading.phase).toBe("outline");
  expect(loaded.phase).toBe("loaded");
  expect(loaded.headerH).toBe(loading.headerH);
  expect(loaded.wsTop).toBe(loading.wsTop);
  expect(loaded.trayW).toBe(loading.trayW);
  expect(loaded.deskBarH).toBe(loading.deskBarH);
  expect(atSwap.reduce((a, e) => a + e.v, 0)).toBe(0);
});
