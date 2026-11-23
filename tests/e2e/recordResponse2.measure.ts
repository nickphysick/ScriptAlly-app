/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v2 (design-refs/record-a-response-v2) — THE ROUTE LOCKS, on the rendered page, over the emulator's
 * harness account at 1440 × 900.
 *
 *   V1  every desktop door: `location.pathname` (and search) unchanged, and the journey on screen — the panel with its
 *       track ([data-rar="root"] [data-rar="track"]) — not the card's reply box, not the old "Who replied?" frame
 *   V2  every way out (✕, Escape, Cancel, the scrim, Done after a save is V-save's) leaves the route and the page's
 *       scroll where they were, and the journey gone
 *   V3  the door map: what each door does, written to reports/record-a-response-v2/ledger/doors.json
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/recordResponse2.measure.ts --project=measure`.
 * ⚠️ A DOOR THE RUN CANNOT FIND IS A RED, never a skip: each door's own presence is a reading.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

/* not serial: each lock reads on its own, so one red does not hide the next */
const DIR = "reports/record-a-response-v2";
const VP = { width: 1440, height: 900 };
/* the harness account's waiting query (Record a response v1's own subject) */
const PRIYA = { q: "cv25-q-03", agent: "cv25-agent-03", name: "Priya Raman", first: "Priya" };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const settle = (page: Page, ms = 700) => page.waitForTimeout(ms);

/** what is on screen: where we are, and which response surface (if any) the door left */
export const reading = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
  const root = [...document.querySelectorAll('[data-rar="root"]')].find(shown) ?? null;
  const scroller = document.querySelector<HTMLElement>(".ws-stage, [data-stage-scroll]") ?? document.scrollingElement;
  return {
    path: location.pathname, search: location.search,
    journey: !!root, track: !!root?.querySelector('[data-rar="track"]'),
    step: root?.getAttribute("data-step") ?? null,
    head: root?.querySelector("h2")?.textContent ?? null,
    composer: [...document.querySelectorAll("[data-qc1522='composer-title']")].filter(shown).map((e) => e.textContent).join("|") || null,
    picker: [...document.querySelectorAll("[data-qcrr='picker']")].some(shown),
    qadDrawer: [...document.querySelectorAll(".qad-drawer")].some(shown),
    scrollY: Math.round(window.scrollY + (scroller && scroller !== document.scrollingElement ? (scroller as HTMLElement).scrollTop : 0)),
  };
});
const closeAll = async (page: Page) => {
  for (let i = 0; i < 5; i++) {
    if (!(await page.locator("[data-side-panel], [data-cl262='panel'], [role='dialog'][aria-modal='true']").count())) break;
    await page.keyboard.press("Escape"); await settle(page, 350);
    const discard = page.locator('[data-rar="leave-discard"]');
    if (await discard.count()) { await discard.click(); await settle(page, 350); }
  }
};
async function clickVisible(page: Page, sel: string): Promise<boolean> {
  const el = page.locator(sel).filter({ visible: true }).first();
  if (!(await el.count())) return false;
  await el.click({ timeout: 5000 }).catch(() => {});
  return true;
}

/** each desktop door: where it lives, and how it is pressed. `at` is the step the journey should open on. */
interface Door { door: string; route: string; at: "who" | "reply"; press: (page: Page) => Promise<boolean> }
export const DOORS: Door[] = [
  { door: "Dashboard band button", route: "/dashboard", at: "who", press: (p) => clickVisible(p, "[data-d2='record']") },
  { door: "Top bar Log a query menu", route: "/dashboard", at: "who", press: async (p) => {
    if (!(await clickVisible(p, "[data-shell='capture'][data-placement='bar'] .ws-capr"))) return false;
    await settle(p, 300);
    return clickVisible(p, "[data-cap='record']");
  } },
  { door: "Top bar menu on Queries", route: "/queries", at: "who", press: async (p) => {
    if (!(await clickVisible(p, "[data-shell='capture'][data-placement='bar'] .ws-capr"))) return false;
    await settle(p, 300);
    return clickVisible(p, "[data-cap='record']");
  } },
  { door: "Queries page button", route: "/queries", at: "who", press: (p) => clickVisible(p, "[data-qc149='record'], [data-qcv='oh-record']") },
  { door: "Analytics header", route: "/queries/analytics", at: "who", press: (p) => clickVisible(p, "[data-a26='record'], button:has-text('Record a response')") },
  { door: "Responses header", route: "/queries/responses", at: "who", press: (p) => clickVisible(p, "button:has-text('Record a response')") },
  { door: "Query card footer", route: `/queries?q=${PRIYA.q}`, at: "reply", press: async (p) => {
    await p.locator("[data-qp='panel']").waitFor({ timeout: 15_000 }).catch(() => {});
    await settle(p, 600);
    const b = p.locator("[data-qp='panel'] button").filter({ hasText: new RegExp(`^\\s*(Record a response|${PRIYA.first} replied)\\s*$`) }).filter({ visible: true }).first();
    if (!(await b.count())) return false;
    await b.click({ timeout: 5000 }).catch(() => {});
    return true;
  } },
  { door: "Agent card", route: `/agents?agent=${PRIYA.agent}`, at: "reply", press: async (p) => {
    await p.locator("[data-cl262='panel']").waitFor({ timeout: 20_000 }).catch(() => {});
    return clickVisible(p, "[data-cl262='panel'] button:has-text('Record a response')");
  } },
  /* the palette's own "Record a response" action (lib/searchPalette `act:record`, a capture through openResponse). Its
     per-query "Record a response" (⌘↵ on a query row, `recordFor`) calls openResponse({ queryId }) directly and is locked
     at source in src/components/queries/recordResponse2.test.ts: a name search lists the agent row, not the query row,
     and the agent row's ⌘↵ is "Open the query", which navigates by design (the first base reading pressed that one). */
  { door: "Search palette (⌘K) action", route: "/dashboard", at: "who", press: async (p) => {
    await p.keyboard.press("Meta+k"); await settle(p, 500);
    if (!(await p.locator(".sp-pal[role='dialog']").count())) return false;
    await p.keyboard.type("Record a response"); await settle(p, 900);
    const row = p.locator(".sp-pal [role='option'][data-kind='action']").filter({ hasText: "Record a response" }).first();
    if (!(await row.count())) return false;
    await row.click();
    return true;
  } },
];

test.beforeEach(async ({ page }) => { await page.setViewportSize(VP); });

test("V1 + V3 · every door opens the journey in place", async ({ page }) => {
  const L = new Ledger("V1-doors");
  const map: Record<string, unknown>[] = [];
  L.check("the door list is not empty", DOORS.length >= 9, String(DOORS.length));
  for (const d of DOORS) {
    await openApp(page, d.route, VP);
    const before = await reading(page);
    const found = await d.press(page);
    L.check(`${d.door}: the door is on the page`, found, d.route);
    await settle(page, 1200);
    const after = await reading(page);
    map.push({ door: d.door, route: d.route, before: before.path + before.search, after: after.path + after.search, found, ...after });
    if (!found) { await closeAll(page); continue; }
    L.check(`${d.door}: the pathname is unchanged`, after.path === before.path, `${before.path} → ${after.path}`);
    L.check(`${d.door}: the journey is on screen, with its track`, after.journey && after.track, JSON.stringify(after));
    L.check(`${d.door}: not the card's reply box, not the old picker, not the old drawer`, !after.composer && !after.picker && !after.qadDrawer, JSON.stringify(after));
    L.check(`${d.door}: opens at ${d.at === "who" ? "Who replied?" : "What did {First} say?"}`, after.step === d.at, String(after.step));
    await closeAll(page);
  }
  mkdirSync(`${DIR}/ledger`, { recursive: true });
  writeFileSync(`${DIR}/ledger/doors.json`, JSON.stringify(map, null, 1));
  L.done(DOORS.length * 5);
});

test("V0 · the base: what a pick in the old frame does on the Dashboard", async ({ page }) => {
  const L = new Ledger("V0-pick");
  await openApp(page, "/dashboard", VP);
  const found = await clickVisible(page, "[data-d2='record']");
  await settle(page, 1000);
  const open = await reading(page);
  L.check("the door opened something", found && (open.picker || open.journey), JSON.stringify(open));
  await page.keyboard.type(PRIYA.name); await settle(page, 400);
  await page.keyboard.press("Enter"); await settle(page, 1400);
  const after = await reading(page);
  writeFileSync(`${DIR}/ledger/V0-pick-reading.json`, JSON.stringify({ open, after }, null, 1));
  L.check("a pick leaves the route", after.path === "/dashboard", `${open.path} → ${after.path}${after.search}`);
  await closeAll(page);
  L.done(2);
});

test("V2 · every way out leaves the route and the scroll as they were", async ({ page }) => {
  const L = new Ledger("V2-close");
  const ways: { way: string; out: (p: Page) => Promise<unknown> }[] = [
    { way: "the ✕", out: (p) => clickVisible(p, '[data-rar="root"] [data-rar="close"]') },
    { way: "Escape", out: (p) => p.keyboard.press("Escape") },
    { way: "Cancel", out: (p) => clickVisible(p, '[data-rar="root"] [data-rar="cancel"]') },
    { way: "the scrim", out: (p) => p.mouse.click(120, 500) },
  ];
  for (const w of ways) {
    await openApp(page, "/dashboard", VP);
    await page.mouse.wheel(0, 400); await settle(page, 500);
    const before = await reading(page);
    const found = await clickVisible(page, "[data-d2='record']");
    await settle(page, 1000);
    const open = await reading(page);
    L.check(`${w.way}: the journey opened`, found && open.journey, JSON.stringify(open));
    await w.out(page);
    await settle(page, 800);
    const after = await reading(page);
    L.check(`${w.way}: the journey is gone`, !after.journey, JSON.stringify(after));
    L.check(`${w.way}: the route is unchanged`, after.path + after.search === before.path + before.search, `${before.path}${before.search} → ${after.path}${after.search}`);
    L.check(`${w.way}: the page's scroll is unchanged`, Math.abs(after.scrollY - before.scrollY) <= 1, `${before.scrollY} → ${after.scrollY}`);
    await closeAll(page);
  }
  L.done(ways.length * 4);
});
