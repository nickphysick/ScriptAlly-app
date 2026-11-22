/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Overnight fixes v1, Part 7 — DR1–DR7: drawers for keyboard and screen-reader users, keyboard only, on the rendered
 * page. Subjects (recon, reports/overnight-fixes-v1/REPORT.md §Part 7), one per shell this part changed:
 *   - "query panel": the Query Centre's query panel (SidePanel, NON-MODAL while browsing), opened from a row by Enter;
 *   - "log a query": the staged Log a query (SidePanel with `dim`, MODAL), opened from "+ Log a query" by Enter;
 *   - "housekeeping": the Contact list's Housekeeping (HalfDrawer, MODAL), opened from the list-health ring by Enter.
 * `DR_MUTATE=off` sets the dev aid `__SA_DR_OFF` (the hook does nothing): DR1, DR2 and DR5 must go red.
 * DR7 screenshots each drawer opened by MOUSE with the hook on and with `__SA_DR_OFF`, and compares the bytes.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { openApp } from "./pageHeaderV2Lib";

const VP = { width: 1440, height: 900 };
const OFF = process.env.DR_MUTATE === "off";
const DIR = "reports/overnight-fixes-v1/drawers";

interface Subject { name: string; route: string; opener: string; root: string; modal: boolean; ready?: string }
const SUBJECTS: Subject[] = [
  /* probed on the emulator: the v156 list's rows are `data-qcv="row"`; "+ Log a query" runs in the query panel's own
     SidePanel, dimmed (`data-qp="panel"` holding `data-laq="track"`); the slim bar's copy of the health ring is inert */
  { name: "query panel", route: "/queries", opener: "[data-qcv='row']", root: "[data-qp='panel']", modal: false },
  { name: "log a query", route: "/queries", opener: "[data-qc151='log']:not([disabled])", root: "[data-qp='panel']:has([data-laq='track'])", modal: true },
  { name: "housekeeping", route: "/agents", opener: "button[aria-label*='Open Housekeeping']", root: "aside.hdr[role='dialog']", modal: true },
];

async function arm(page: Page, off: boolean) {
  if (off) await page.addInitScript(() => { (window as unknown as { __SA_DR_OFF?: boolean }).__SA_DR_OFF = true; });
}

/** Focus the opener (first visible one) and press Enter: opened by keyboard. Returns the opener's identity. */
async function openByKeyboard(page: Page, s: Subject) {
  await page.locator(s.ready ?? s.opener).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 30_000 });
  const tag = await page.evaluate((sel) => {
    const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0 && !e.closest("[inert]"));
    if (!el) return null;
    el.scrollIntoView({ block: "center" });
    el.setAttribute("data-dr-opener", "1");
    el.focus();
    return document.activeElement === el;
  }, s.opener);
  expect(tag, `${s.name}: the opener takes focus`).toBe(true);
  await page.keyboard.press("Enter");
  await page.locator(s.root).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForTimeout(600);
}

const inside = (page: Page, root: string) => page.evaluate((r) => {
  const el = [...document.querySelectorAll<HTMLElement>(r)].find((e) => e.getBoundingClientRect().height > 0);
  const a = document.activeElement;
  return { inside: !!el && !!a && el.contains(a), active: a ? `${a.tagName.toLowerCase()}${a.getAttribute("data-qad-rad") ? "" : ""}.${(a as HTMLElement).className?.toString().slice(0, 40)}` : "none" };
}, root);

for (const s of SUBJECTS) {
  test.describe(`DR · ${s.name}`, () => {
    test(`DR1/DR2/DR3/DR5 · ${s.name}: focus in on open, ${s.modal ? "trapped and the page inert" : "not trapped and the page live"}, back to the opener on close`, async ({ page }) => {
      test.setTimeout(180_000);
      await arm(page, OFF);
      await openApp(page, s.route, VP);
      await openByKeyboard(page, s);
      const r1 = await inside(page, s.root);
      console.log(`DR1 ${s.name}: ${JSON.stringify(r1)}`);
      expect(r1.inside, `DR1 ${s.name}: focus is inside the drawer after a keyboard open`).toBe(true);

      if (s.modal) {
        const rootInert = await page.evaluate(() => document.getElementById("root")?.hasAttribute("inert") ?? false);
        let escaped = 0;
        for (let i = 0; i < 40; i++) { await page.keyboard.press(i % 2 ? "Shift+Tab" : "Tab"); if (!(await inside(page, s.root)).inside) escaped++; }
        for (let i = 0; i < 20; i++) { await page.keyboard.press("Tab"); if (!(await inside(page, s.root)).inside) escaped++; }
        console.log(`DR2 ${s.name}: inert ${rootInert}, presses outside ${escaped}/60`);
        expect(rootInert, `DR2 ${s.name}: the page behind is inert`).toBe(true);
        expect(escaped, `DR2 ${s.name}: 40+ Tab presses never leave it`).toBe(0);
      } else {
        const rootInert = await page.evaluate(() => document.getElementById("root")?.hasAttribute("inert") ?? false);
        let reached = false;
        for (let i = 0; i < 120 && !reached; i++) {
          await page.keyboard.press("Tab");
          reached = await page.evaluate(() => !!document.activeElement && !!document.getElementById("root")?.contains(document.activeElement));
        }
        console.log(`DR3 ${s.name}: inert ${rootInert}, page reached ${reached}`);
        expect(rootInert, `DR3 ${s.name}: the page is not inert`).toBe(false);
        expect(reached, `DR3 ${s.name}: Tab can reach the page`).toBe(true);
      }

      /* DR5: close through the drawer's own Escape (focus is put back inside first, so the drawer's layer is the top) */
      await page.evaluate((r) => { const el = [...document.querySelectorAll<HTMLElement>(r)].find((e) => e.getBoundingClientRect().height > 0); (el?.querySelector<HTMLElement>("button") ?? el)?.focus(); }, s.root);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      if (await page.locator(s.root).filter({ visible: true }).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(400); }
      await expect(page.locator(s.root).filter({ visible: true }), `${s.name}: Escape closes it`).toHaveCount(0, { timeout: 8000 });
      await page.waitForTimeout(300);
      const back = await page.evaluate(() => ({ opener: document.activeElement?.getAttribute("data-dr-opener") === "1", tag: document.activeElement?.tagName ?? "none", root: document.getElementById("root")?.hasAttribute("inert") ?? false }));
      console.log(`DR5 ${s.name}: ${JSON.stringify(back)}`);
      expect(back.root, `${s.name}: the page is live again`).toBe(false);
      expect(back.opener, `DR5 ${s.name}: focus is back on the opener`).toBe(true);
    });

    test(`DR6 · ${s.name}: every field, select, textarea, slider and radio group has an accessible name`, async ({ page }) => {
      test.setTimeout(120_000);
      await openApp(page, s.route, VP);
      await openByKeyboard(page, s);
      const unnamed = await page.evaluate((r) => {
        const root = [...document.querySelectorAll<HTMLElement>(r)].find((e) => e.getBoundingClientRect().height > 0)!;
        const nameOf = (el: HTMLElement) => {
          const by = el.getAttribute("aria-labelledby");
          if (by) return by.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ").trim();
          if (el.getAttribute("aria-label")) return el.getAttribute("aria-label")!.trim();
          if (el.id) { const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`); if (l) return (l.textContent ?? "").trim(); }
          const wrap = el.closest("label"); if (wrap) return (wrap.textContent ?? "").trim();
          if (el.getAttribute("title")) return el.getAttribute("title")!.trim();
          return "";
        };
        const els = [...root.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, [role="slider"], [role="radiogroup"]')].filter((e) => e.getBoundingClientRect().height > 0);
        return { n: els.length, unnamed: els.filter((e) => !nameOf(e)).map((e) => `${e.tagName.toLowerCase()}${e.getAttribute("type") ? `[${e.getAttribute("type")}]` : ""}${e.getAttribute("role") ? `[role=${e.getAttribute("role")}]` : ""}.${e.className.toString().slice(0, 30)}`) };
      }, s.root);
      console.log(`DR6 ${s.name}: ${JSON.stringify(unnamed)}`);
      expect(unnamed.unnamed, `DR6 ${s.name}: ${unnamed.n} controls, none unnamed`).toEqual([]);
    });

    test(`DR7 · ${s.name}: opened by mouse, the drawer is pixel-identical with and without the hook`, async ({ page }) => {
      test.setTimeout(180_000);
      mkdirSync(DIR, { recursive: true });
      const shot = async (off: boolean) => {
        await page.evaluate((o) => { (window as unknown as { __SA_DR_OFF?: boolean }).__SA_DR_OFF = o; }, off);
        await page.locator(s.ready ?? s.opener).filter({ visible: true }).first().waitFor({ state: "visible", timeout: 30_000 });
        await page.evaluate((sel) => { const el = [...document.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0 && !e.closest("[inert]")); el?.scrollIntoView({ block: "center" }); el?.click(); }, s.opener);
        const root = page.locator(s.root).filter({ visible: true }).first();
        await root.waitFor({ state: "visible", timeout: 10_000 });
        await page.mouse.move(2, 2);
        await page.waitForTimeout(1200);
        /* the drawer's own pixels: a focused text field always draws its focus style (that is DR1 working, not a
           restyle), so both shots are taken with nothing focused */
        await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur?.());
        await page.waitForTimeout(300);
        const png = await root.screenshot({ path: `${DIR}/${s.name.replace(/\s+/g, "-")}-${off ? "off" : "on"}-1440.png`, animations: "disabled" });
        await page.keyboard.press("Escape"); await page.waitForTimeout(500);
        if (await page.locator(s.root).filter({ visible: true }).count()) { await page.keyboard.press("Escape"); await page.waitForTimeout(500); }
        return png;
      };
      await openApp(page, s.route, VP);
      const off = await shot(true);
      const on = await shot(false);
      console.log(`DR7 ${s.name}: off ${off.length} bytes, on ${on.length} bytes, identical ${off.equals(on)}`);
      expect(on.equals(off), `DR7 ${s.name}: pixel-identical`).toBe(true);
    });
  });
}
