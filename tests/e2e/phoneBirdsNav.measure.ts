/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone Birds-eye nav fix v1 — BW-NAV-1, at 390 × 784 (Chromium phone, the harness's account on the emulator).
 *
 * The bug (PA5-2's 28 reds): the Queries slot stays mounted when the writer leaves it, and Birds-eye portals its
 * full-screen layer into `document.body`, so once Birds-eye had been opened (the view is remembered for the session)
 * its layer sat over Today, To do, Materials and Profile and swallowed every tap.
 *
 * BW-NAV-1: from Birds-eye, after each interaction (straight after opening, after the grow-in, a touch mid-animation,
 * pinch, pan, scrub, and opening and closing the query sheet, the long-press menu, search, the colour key, the level
 * chip and pull to refresh), a real tap on every dock tab, on +, on back and on List reaches its destination — the
 * destination is on screen AND is what a tap at its middle hits (nothing of Birds-eye on top). Then the same dock taps
 * from Today, the Queries list and Agents, after Birds-eye has been opened once.
 *
 *   NAV_ONLY=<state…>  just those states (debugging)
 * Reads only: nothing here writes to the emulator (pull to refresh reads the server once).
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = process.env.NAV_OUT ?? "reports/phone-birds-eye-nav-fix-v1";
const PHONE = { width: 390, height: 784 } as const;
const BIRDS = "/queries/all?view=birds";
const KEY = "bw1.firstLook.day";
const frame = (page: Page, ms = 450) => page.waitForTimeout(ms);

type Row = { lock: string; where: string; ok: boolean; detail: string };
const rows: Row[] = [];
const check = (lock: string, where: string, ok: boolean, detail = "") => rows.push({ lock, where, ok: !!ok, detail: String(detail).slice(0, 500) });

async function signIn(page: Page) {
  await openRoute(page, "/dashboard", { width: 1440, height: 900 }); /* the harness's shell check is the desktop's */
  await page.evaluate(() => { try { localStorage.setItem("bw1.hint.seen", "1"); localStorage.setItem("bw3.folded", "[]"); } catch { /* */ } });
  await page.setViewportSize(PHONE);
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const setDay = (page: Page, v: string | null) => page.evaluate(([k, x]) => { try { if (x == null) localStorage.removeItem(k!); else localStorage.setItem(k!, x); } catch { /* */ } }, [KEY, v] as const);
/** Birds-eye, opened by its address; `first`: as the day's first open (the grow-in plays) */
async function openBirds(page: Page, first = false) {
  await setDay(page, first ? null : today());
  await page.goto(BIRDS);
  await page.waitForFunction(() => { const l = document.querySelector<HTMLElement>('[data-bw="layer"]'); return !!l && !!l.dataset.look; }, null, { timeout: 30_000, polling: "raf" });
  await page.evaluate(() => document.fonts.ready);
}
const settle = (page: Page) => page.waitForFunction(() => document.querySelector<HTMLElement>('[data-bw="layer"]')?.dataset.look !== "playing", null, { timeout: 5000 }).catch(() => {});
/** a real tap at an element's middle (hit-tested by the browser, as a finger is) */
async function tapAt(page: Page, sel: string): Promise<boolean> {
  const b = await page.locator(sel).filter({ visible: true }).first().boundingBox().catch(() => null);
  if (!b) return false;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  return true;
}
const zoom = async (page: Page, dy: number) => { await page.mouse.move(200, 430); await page.keyboard.down("Control"); await page.mouse.wheel(0, dy); await page.keyboard.up("Control"); await frame(page, 700); };
const levelTo = async (page: Page, t: "All" | "Months" | "Weeks") => {
  await tapAt(page, '[data-bw="level-chip"]'); await frame(page, 300);
  await tapAt(page, `[data-bw="level"][data-t="${t}"]`); await frame(page, 700);
};
/** the middle of a drawn bar, for a tap or a hold */
const barAt = (page: Page) => page.evaluate(() => {
  const top = Number(document.querySelector<HTMLElement>('[data-bw="world"]')!.dataset.top);
  const bars = [...document.querySelectorAll<HTMLElement>('[data-bw="bar"]')].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 24 && r.top > top + 30 && r.bottom < 640 && r.left > 20 && r.right < 370);
  const r = bars[Math.floor(bars.length / 2)];
  return r ? { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 } : null;
});

/* ── the states, each from a fresh Birds-eye ── */
type State = { k: string; run: (page: Page) => Promise<string> };
const STATES: State[] = [
  { k: "straight after opening", run: async (p) => { await openBirds(p, true); return "opened (the grow-in playing)"; } },
  { k: "after the grow-in", run: async (p) => { await openBirds(p, true); await settle(p); await frame(p, 300); return "grown in"; } },
  { k: "after a touch mid-animation", run: async (p) => {
    await openBirds(p, true);
    const h = await p.locator('[data-bw="head"] .bw-h').first().boundingBox();
    await p.mouse.move((h?.x ?? 150) + 20, (h?.y ?? 60) + 10); await p.mouse.down(); await p.mouse.up();
    await frame(p, 200);
    return `look ${await p.evaluate(() => document.querySelector<HTMLElement>('[data-bw="layer"]')?.dataset.look)}`;
  } },
  { k: "after pinch", run: async (p) => { await openBirds(p); await zoom(p, -400); return `z ${await p.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')?.dataset.z)}`; } },
  { k: "after pan", run: async (p) => { await openBirds(p); await levelTo(p, "Months"); await p.mouse.move(200, 430); await p.mouse.wheel(160, 0); await frame(p, 500); return "panned"; } },
  { k: "after scrub", run: async (p) => {
    await openBirds(p); await p.mouse.move(200, 430); await p.mouse.down(); await frame(p, 600);
    for (let i = 1; i <= 6; i++) { await p.mouse.move(200 + i * 10, 430); await frame(p, 30); }
    const s = await p.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')?.dataset.scrub);
    await p.mouse.up(); await frame(p, 300);
    return `scrubbed (day ${s})`;
  } },
  { k: "after the query sheet opened and closed", run: async (p) => {
    await openBirds(p); await levelTo(p, "Months");
    const b = await barAt(p); if (!b) return "no bar";
    await p.mouse.click(b.x, b.y);
    const open = await p.locator('[data-pqs="sheet"]').first().waitFor({ timeout: 6000 }).then(() => true).catch(() => false);
    await p.mouse.click(195, 20); await frame(p, 700);
    return `sheet ${open ? "opened" : "NOT opened"}, now ${(await p.locator('[data-pqs="sheet"]').count()) ? "still open" : "closed"}`;
  } },
  { k: "after the long-press menu opened and closed", run: async (p) => {
    await openBirds(p); await levelTo(p, "Weeks");
    const b = await barAt(p); if (!b) return "no bar";
    await p.mouse.move(b.x, b.y); await p.mouse.down(); await frame(p, 700); await p.mouse.up();
    const open = await p.locator('[data-bw="menu"]').first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    await p.mouse.click(20, 200); await frame(p, 500);
    return `menu ${open ? "opened" : "NOT opened"}, now ${(await p.locator('[data-bw="menu"]').count()) ? "still open" : "closed"}`;
  } },
  { k: "after search opened and closed", run: async (p) => {
    await openBirds(p); await tapAt(p, '[data-bw="search"]');
    const open = await p.locator('[data-bw="sheet"][data-k="search"], [data-bw="sheet"]').first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    await p.mouse.click(195, 30); await frame(p, 500);
    if (await p.locator('[data-bw="sheet"]').count()) { await p.keyboard.press("Escape"); await frame(p, 400); }
    return `search ${open ? "opened" : "NOT opened"}, now ${(await p.locator('[data-bw="sheet"]').count()) ? "still open" : "closed"}`;
  } },
  { k: "after the colour key opened and closed", run: async (p) => {
    await openBirds(p); await tapAt(p, '[data-bw="key-btn"]');
    const open = await p.locator('[data-bw="sheet"]').first().waitFor({ timeout: 3000 }).then(() => true).catch(() => false);
    await p.mouse.click(195, 30); await frame(p, 500);
    if (await p.locator('[data-bw="sheet"]').count()) { await p.keyboard.press("Escape"); await frame(p, 400); }
    return `key ${open ? "opened" : "NOT opened"}, now ${(await p.locator('[data-bw="sheet"]').count()) ? "still open" : "closed"}`;
  } },
  { k: "after the level chip opened and closed", run: async (p) => {
    await openBirds(p); await tapAt(p, '[data-bw="level-chip"]'); await frame(p, 300);
    const open = (await p.locator('[data-bw="level-list"]').count()) > 0;
    await tapAt(p, '[data-bw="level-chip"]'); await frame(p, 300);
    return `levels ${open ? "opened" : "NOT opened"}, now ${(await p.locator('[data-bw="level-list"]').count()) ? "still open" : "closed"}`;
  } },
  { k: "after pull to refresh", run: async (p) => {
    await openBirds(p); await p.mouse.move(200, 300); await p.mouse.down();
    for (let i = 1; i <= 12; i++) { await p.mouse.move(200, 300 + i * 18); await frame(p, 30); }
    await p.mouse.up(); await frame(p, 1800);
    return `refreshes ${await p.evaluate(() => document.querySelector<HTMLElement>('[data-bw="world"]')?.dataset.refreshes)}`;
  } },
];

/* ── the targets: where each tap must land ── */
type Target = { k: string; sel: string; arrive: (page: Page) => Promise<{ ok: boolean; why: string }> };
/** the page `want` is on screen and is what a tap at (195, y) hits — nothing of Birds-eye above it */
const onTop = (page: Page, want: string, y = 520) => page.evaluate(([w, yy]) => {
  const el = document.querySelector<HTMLElement>(w as string);
  const vis = !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden";
  const hit = document.elementFromPoint(195, yy as number) as HTMLElement | null;
  const inWant = !!hit?.closest(w as string), inWorld = !!hit?.closest('[data-bw="world"]');
  return { ok: vis && inWant && !inWorld, why: `${location.pathname}${location.search} · shown ${vis} · hit ${hit ? `${hit.tagName.toLowerCase()}.${String(hit.className).slice(0, 30)}` : "none"}${inWorld ? " (Birds-eye)" : ""}` };
}, [want, y] as const);
const DOCK: Target[] = [
  { k: "Today", sel: '[data-pa5="dock-tab"][data-tab="today"]', arrive: (p) => onTop(p, '[data-pa5="today"]') },
  { k: "To do", sel: '[data-pa5="dock-tab"][data-tab="todo"]', arrive: (p) => onTop(p, '[data-pa5="todo"]') },
  { k: "Materials", sel: '[data-pa5="dock-tab"][data-tab="materials"]', arrive: (p) => onTop(p, '[data-pa5="materials"]') },
  { k: "Profile", sel: '[data-pa5="dock-tab"][data-tab="profile"]', arrive: (p) => onTop(p, '[data-pa5="profile"]') },
  { k: "+", sel: '[data-pa4="plus"]', arrive: async (p) => {
    const b = await p.locator('[data-pa3="plus-sheet"]').filter({ visible: true }).first().boundingBox().catch(() => null);
    const r = b ? await onTop(p, '[data-pa3="plus-sheet"]', b.y + Math.min(b.height / 2, 120)) : { ok: false, why: "no sheet" };
    await p.keyboard.press("Escape").catch(() => {}); await frame(p, 400);
    return r;
  } },
];
const WORLD_ONLY: Target[] = [
  { k: "back", sel: '[data-bw="back"]', arrive: async (p) => {
    const gone = (await p.locator('[data-bw="world"]').count()) === 0;
    const hit = await p.evaluate(() => { const h = document.elementFromPoint(195, 520) as HTMLElement | null; return { inWorld: !!h?.closest('[data-bw="world"]'), where: `${location.pathname}${location.search}` }; });
    return { ok: gone && !hit.inWorld, why: `${hit.where} · world ${gone ? "gone" : "still mounted"}` };
  } },
  { k: "List", sel: '[data-bw="list"]', arrive: (p) => onTop(p, '[data-pa4="queries"][data-view="list"]') },
];

test.use({ viewport: PHONE, deviceScaleFactor: 2 });
const ONLY = (process.env.NAV_ONLY ?? "").split(",").filter(Boolean);

test("Birds-eye nav fix v1 — BW-NAV-1", async ({ page }, info) => {
  test.skip(info.project.name !== "pixel", "Chromium phone only");
  test.setTimeout(1_500_000);
  page.setDefaultTimeout(15_000);
  const errs: string[] = [];
  page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
  await signIn(page);

  /* from Birds-eye, after each interaction */
  for (const s of STATES) {
    if (ONLY.length && !ONLY.some((o) => s.k.includes(o))) continue;
    for (const t of [...DOCK, ...WORLD_ONLY]) {
      const note = await s.run(page);
      const tapped = await tapAt(page, t.sel);
      await frame(page, 900);
      const r = tapped ? await t.arrive(page) : { ok: false, why: `no ${t.sel}` };
      check("BW-NAV-1", `Birds-eye ${s.k} → ${t.k}`, r.ok, `${note} · ${r.why}`);
    }
  }

  /* from Today, the Queries list and Agents, after Birds-eye has been opened once — reached IN the app (taps, no reload:
     a reload starts with the Queries slot unmounted, which hides the bug) */
  const FROM: [string, (p: Page) => Promise<void>, string][] = [
    ["Today", async (p) => { await openBirds(p); await tapAt(p, '[data-pa5="dock-tab"][data-tab="today"]'); }, '[data-pa5="today"]'],
    ["the Queries list", async (p) => { await openBirds(p); await tapAt(p, '[data-bw="list"]'); }, '[data-pa4="queries"][data-view="list"]'],
    /* the phone's Agents is Today's Agents tab (on a phone /agents goes to Today) */
    ["Agents", async (p) => { await openBirds(p); await tapAt(p, '[data-pa5="dock-tab"][data-tab="today"]'); await frame(p, 900); await tapAt(p, '[data-pa5="tab"][data-tab="agents"]'); }, '[data-pa5="agents-tab"]'],
  ];
  for (const [name, go, root] of FROM) {
    for (const t of DOCK) {
      await openBirds(page);
      await go(page);
      await page.locator(root).filter({ visible: true }).first().waitFor({ timeout: 20_000 }).catch(() => {});
      await frame(page, 1200);
      const here = await onTop(page, root, 600); /* below Today's pinned tab strip, which is not the panel */
      const tapped = await tapAt(page, t.sel);
      await frame(page, 900);
      const r = tapped ? await t.arrive(page) : { ok: false, why: `no ${t.sel}` };
      check("BW-NAV-1", `${name}, after Birds-eye was opened → ${t.k}`, here.ok && r.ok, `start: ${here.why} · ${r.why}`);
    }
  }
  check("BW-NAV-1", "no page error", errs.length === 0, errs.slice(0, 3).join(" · "));

  mkdirSync(`${DIR}/ledger`, { recursive: true });
  writeFileSync(`${DIR}/ledger/nav${process.env.NAV_TAG ? `.${process.env.NAV_TAG}` : ""}.json`, JSON.stringify(rows, null, 1));
  const red = rows.filter((r) => !r.ok);
  for (const r of red.slice(0, 60)) console.log(`  ✗ ${r.where} — ${r.detail.slice(0, 220)}`);
  console.log(`  BW-NAV-1: ${rows.length} readings, ${red.length} red`);
  if (!ONLY.length) expect(rows.length).toBeGreaterThanOrEqual(STATES.length * 7 + 15 + 1);
  expect(red.map((r) => `${r.where} — ${r.detail.slice(0, 200)}`)).toEqual([]);
});
