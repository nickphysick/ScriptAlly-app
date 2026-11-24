/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Add an agent v2, Phase A3 (design-refs/add-agent-v2, screen 01) — "QUICK ACTIONS", measured on the rendered page at
 * 1280 × 800 and 1512 × 900, on the Dashboard, Queries and Agents:
 *
 *   QA1  the button's left and right edges and its vertical centre are the same on all three pages
 *   QA2  each of the menu's three rows opens its journey, the route unchanged and the desk dimmed
 *   QA3  nothing of the old split button remains (its chevron segment, its "Log a query" half)
 *   QA4  the keyboard: opening focuses the first row, ↓ moves, Escape closes and gives focus back to the button; Add a
 *        manuscript is not a row and reads "coming soon"
 *
 * ⚠️ RED FIRST: `QA_BREAK=qa1|qa2|qa3|qa4` breaks the fix each lock holds, in the page, and the lock must fail.
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/quickActions.measure.ts --project=measure`.
 * ⚠️ A SUBJECT THE RUN CANNOT FIND IS A RED, never a skip.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const DIR = "reports/add-agent-v2";
const VPS = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
const ROUTES = ["/dashboard", "/queries", "/agents"] as const;
const BREAK = process.env.QA_BREAK ?? "";

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${BREAK ? `-break-${BREAK}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}${BREAK ? ` BREAK=${BREAK}` : ""}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the breaks, applied before the app loads — only those named in the running test's title, so one run can prove
 *  every lock red on its own (`QA_BREAK=qa1,qa2,qa3,qa4`) */
async function breakIt(page: Page, title: string) {
  const mine = BREAK.split(",").filter((k) => k && title.includes(k.toUpperCase()));
  for (const one of mine) await page.addInitScript((k: string) => {
    const style = (css: string) => { const s = document.createElement("style"); s.textContent = css; (document.head ?? document.documentElement).appendChild(s); };
    window.addEventListener("DOMContentLoaded", () => {
      /* qa1: the button sits 6px further right on Queries only */
      if (k === "qa1" && location.pathname === "/queries") style("[data-shell=quick-btn] { margin-right: 6px !important; }");
      /* qa2: a row press also moves the route */
      if (k === "qa2") document.addEventListener("click", (e) => { if ((e.target as Element | null)?.closest?.("[data-quick]")) history.pushState(null, "", "/broken"); }, true);
      /* qa3: the old chevron half is back in the bar */
      if (k === "qa3") setInterval(() => { const b = document.querySelector("[data-shell=quick]"); if (b && !b.querySelector(".ws-capr")) { const c = document.createElement("button"); c.className = "ws-capr"; c.textContent = "v"; b.appendChild(c); } }, 100);
      /* qa4: opening the menu leaves focus on the button */
      if (k === "qa4") document.addEventListener("focusin", (e) => { if ((e.target as Element | null)?.closest?.("[data-shell=quick-menu]")) (document.querySelector("[data-shell=quick-btn]") as HTMLElement | null)?.focus(); }, true);
    });
  }, one);
}

const btnBox = (page: Page) => page.evaluate(() => {
  const b = [...document.querySelectorAll<HTMLElement>("[data-shell=quick-btn]")].find((e) => e.getBoundingClientRect().width > 0);
  if (!b) return null;
  const r = b.getBoundingClientRect();
  return { l: r.left, r: r.right, cy: r.top + r.height / 2, h: r.height, text: b.textContent?.trim() ?? "" };
});

const onScreen = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== "hidden"; };
  return {
    path: location.pathname + location.search,
    laq: [...document.querySelectorAll(".laq:not(.rar):not(.aag) .laq-trk")].some(shown),
    rar: [...document.querySelectorAll('[data-rar="root"]')].some(shown),
    aag: [...document.querySelectorAll('[data-aag="root"]')].some(shown),
    dim: document.body.classList.contains("spanel-dim"),
  };
});

async function closeAll(page: Page) {
  for (let i = 0; i < 5; i++) {
    if (!(await page.locator("[data-side-panel]").count())) break;
    await page.keyboard.press("Escape"); await page.waitForTimeout(350);
    for (const d of ['[data-rar="leave-discard"]', '[data-qls="leave-discard"]', '[data-aag="leave-discard"]']) {
      const x = page.locator(d).filter({ visible: true });
      if (await x.count()) { await x.first().click(); await page.waitForTimeout(350); }
    }
  }
}

test.describe("Add an agent v2 · Quick actions", () => {
  test.beforeEach(async ({ page }, info) => { await breakIt(page, info.title); });

  test("QA1 · one button, one place, on every page", async ({ page }) => {
    const L = new Ledger("QA1");
    for (const vp of VPS) {
      const seen: Record<string, NonNullable<Awaited<ReturnType<typeof btnBox>>>> = {};
      for (const route of ROUTES) {
        await openApp(page, route, vp);
        const b = await btnBox(page);
        L.check(`${vp.width} ${route} the button is drawn`, !!b, "missing");
        if (!b) continue;
        L.check(`${vp.width} ${route} it reads Quick actions`, b.text === "Quick actions", b.text);
        L.check(`${vp.width} ${route} 36px high`, Math.abs(b.h - 36) < 0.6, String(b.h));
        /* a page's guide pill (the bar's page slot) sits left of Search, 10px off, so it moves nothing here */
        const pill = await page.evaluate(() => {
          const v = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0) ?? null;
          const p = v("[data-pck='pill']"), s = v(".ws-sfield");
          return p && s ? { gap: s.getBoundingClientRect().left - p.getBoundingClientRect().right } : null;
        });
        if (pill) L.check(`${vp.width} ${route} the guide pill sits left of Search, 10px off`, Math.abs(pill.gap - 10) <= 1, String(pill.gap));
        seen[route] = b;
      }
      const ref = seen["/dashboard"];
      for (const route of ROUTES.slice(1)) {
        const b = seen[route];
        L.check(`${vp.width} ${route} left = Dashboard's`, !!ref && !!b && Math.abs(b.l - ref.l) < 0.5, `${b?.l} vs ${ref?.l}`);
        L.check(`${vp.width} ${route} right = Dashboard's`, !!ref && !!b && Math.abs(b.r - ref.r) < 0.5, `${b?.r} vs ${ref?.r}`);
        L.check(`${vp.width} ${route} centre = Dashboard's`, !!ref && !!b && Math.abs(b.cy - ref.cy) < 0.5, `${b?.cy} vs ${ref?.cy}`);
      }
    }
    L.done(24);
  });

  test("QA2 · each row opens its journey in place, the desk dimmed", async ({ page }) => {
    const L = new Ledger("QA2");
    for (const vp of VPS) {
      for (const route of ROUTES) {
        for (const [row, key] of [["query", "laq"], ["record", "rar"], ["agent", "aag"]] as const) {
          await openApp(page, route, vp);
          const before = await onScreen(page);
          await page.locator("[data-shell=quick-btn]").filter({ visible: true }).first().click();
          await page.waitForTimeout(300);
          const r = page.locator(`[data-shell=quick-menu] [data-quick='${row}']`);
          L.check(`${vp.width} ${route} ${row}: the row is there`, (await r.count()) === 1, "missing");
          if (!(await r.count())) continue;
          await r.click();
          await page.waitForTimeout(900);
          const after = await onScreen(page);
          L.check(`${vp.width} ${route} ${row}: the journey is on screen`, after[key], JSON.stringify(after));
          L.check(`${vp.width} ${route} ${row}: the route is unchanged`, after.path === before.path, `${before.path} → ${after.path}`);
          L.check(`${vp.width} ${route} ${row}: the desk is dimmed`, after.dim, JSON.stringify(after));
          await closeAll(page);
        }
      }
    }
    L.done(72);
  });

  test("QA3 · no part of the split button is left", async ({ page }) => {
    const L = new Ledger("QA3");
    for (const vp of VPS) for (const route of ROUTES) {
      await openApp(page, route, vp);
      await page.waitForTimeout(400);
      const n = await page.evaluate(() => document.querySelectorAll('.ws-capr, .ws-capl, .ws-cap--bar, [aria-label="More ways to add"], [data-shell="capture"]').length);
      L.check(`${vp.width} ${route}: no chevron segment`, n === 0, `${n} found`);
      L.check(`${vp.width} ${route}: one Quick actions`, (await page.locator("[data-shell=quick]").count()) === 1, "count");
    }
    L.done(12);
  });

  test("QA4 · the keyboard, and the coming-soon line", async ({ page }) => {
    const L = new Ledger("QA4");
    await openApp(page, "/dashboard", VPS[0]);
    const btn = page.locator("[data-shell=quick-btn]").filter({ visible: true }).first();
    await btn.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const at = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-quick") ?? document.activeElement?.getAttribute("data-shell") ?? null);
    L.check("Enter opens with focus on the first row", (await at()) === "query", String(await at()));
    L.check("the button says it is open", (await btn.getAttribute("aria-expanded")) === "true", "aria-expanded");
    await page.keyboard.press("ArrowDown");
    L.check("↓ moves to Record a response", (await at()) === "record", String(await at()));
    await page.keyboard.press("ArrowDown");
    L.check("↓ moves to Add an agent", (await at()) === "agent", String(await at()));
    await page.keyboard.press("ArrowDown");
    L.check("↓ wraps, never to Add a manuscript", (await at()) === "query", String(await at()));
    const soon = page.locator("[data-shell=quick-menu] [data-quick='manuscript']");
    L.check("Add a manuscript is shown", (await soon.count()) === 1, "missing");
    L.check("it is not a row", (await soon.getAttribute("role")) === null, String(await soon.getAttribute("role")));
    L.check("it reads coming soon", /Add a manuscript\s*coming soon/.test((await soon.innerText()).replace(/\s+/g, " ")), await soon.innerText());
    await page.keyboard.press("Escape");
    await page.waitForTimeout(250);
    L.check("Escape closes it", (await page.locator("[data-shell=quick-menu].is-open").count()) === 0, "still open");
    L.check("and focus is back on the button", (await at()) === "quick-btn", String(await at()));
    await btn.click(); await page.waitForTimeout(250);
    await page.mouse.click(400, 500); await page.waitForTimeout(250);
    L.check("a click outside closes it", (await page.locator("[data-shell=quick-menu].is-open").count()) === 0, "still open");
    L.done(11);
  });
});
