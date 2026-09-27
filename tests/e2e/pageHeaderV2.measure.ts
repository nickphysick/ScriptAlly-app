/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV2 — the app-wide bar (sidebar colour, page name, the manuscript switcher, ghost tools),
 * the full header across the column with a centred 920 hero frame, and the Contact list's header.
 * Measured on the signed-in app against design-refs/page-header/contact-list-header-v5.html.
 *
 * ⚠️ EVERY CHECK IS A LEDGER ROW, AND A CASE ASSERTS ONLY AT ITS END — so a first failing claim does
 * not leave the ones below it unproved, and "red before" is a per-lock statement. Each case asserts a
 * population floor too: a probe that finds no subject has failed, not skipped.
 *
 * ⚠️ VERTICAL NUMBERS ARE RELATIVE TO THE BAR. The mock's 10px dark strip stands for dev's beta
 * strip and is not part of this design.
 *
 * ⚠️ READS ONLY on the fixture: the one flow that could write (choosing a book) writes localStorage,
 * never Firestore, and the case puts the original book back.
 */
import { expect, test, type Page } from "@playwright/test";
import { openRoute } from "./measure";
import { Ledger } from "./shellV3Lib";

export const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

/** Every workspace route the shell renders (routeTiers' WORKSPACE_PATHS). */
export const BAR_ROUTES = [
  "/dashboard", "/queries", "/queries/analytics", "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/packages",
  "/todo", "/todo/calendar", "/todo/noteboard", "/import", "/account/profile", "/plans", "/help",
] as const;

export async function openApp(page: Page, path: string, vp: { width: number; height: number }) {
  await openRoute(page, path, vp);
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}

/** One read of the bar, from measured boxes and computed styles. A real function, never a template. */
export async function readBar(page: Page) {
  return page.evaluate(() => {
    const shown = (e: Element | null) => {
      if (!e) return false;
      const r = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return r.width > 0.5 && r.height > 0.5 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0.02;
    };
    const bar = [...document.querySelectorAll('[data-probe="navrow"]')].find(shown) as HTMLElement | undefined;
    const main = [...document.querySelectorAll(".ws-main")].find(shown) as HTMLElement | undefined;
    const side = document.getElementById("ws-sidebar");
    if (!bar || !main || !side) return null;
    const b = bar.getBoundingClientRect(); const m = main.getBoundingClientRect();
    const bs = getComputedStyle(bar); const ss = getComputedStyle(side);
    const box = (e: Element | null) => { if (!e || !shown(e)) return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
    const toggle = box(bar.querySelector('[aria-controls="ws-sidebar"]'));
    const help = box(bar.querySelector('[aria-label="Help"]'));
    const name = bar.querySelector('[data-shell="pagename"]');
    const nameText = name?.querySelector(".ws-pname-n") ?? null;
    const nameLines = (() => {
      if (!nameText) return 0;
      const range = document.createRange(); range.selectNodeContents(nameText);
      const tops = new Set([...range.getClientRects()].map((r) => Math.round(r.top)));
      return tops.size;
    })();
    /* the bar's items: its toggle, divider, page name, switcher button and each tool */
    const items = [
      ...[...bar.querySelectorAll('[aria-controls="ws-sidebar"], .ws-bvr, [data-shell="pagename"], [data-shell="switcher"] > button, .ws-bright > *, .ws-bright button')],
    ].filter(shown).map((e) => ({ k: (e.className || e.tagName).toString().split(" ")[0], ...box(e)! }));
    const overlaps: string[] = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], c = items[j];
      /* a child inside its own wrapper is not an overlap */
      const nested = (a.l <= c.l + 0.5 && a.r >= c.r - 0.5 && a.t <= c.t + 0.5 && a.b >= c.b - 0.5) || (c.l <= a.l + 0.5 && c.r >= a.r - 0.5 && c.t <= a.t + 0.5 && c.b >= a.b - 0.5);
      if (nested) continue;
      if (a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.b - 0.5 && c.t < a.b - 0.5) overlaps.push(`${a.k}×${c.k}`);
    }
    const sideRule = /inset/.test(ss.boxShadow) && /-1px 0px 0px/.test(ss.boxShadow) || parseFloat(ss.borderRightWidth) === 1;
    const switchers = [...document.querySelectorAll('[data-shell="switcher"], .sv2-scope, .ws-mspill')].filter(shown);
    return {
      barL: b.left, barR: b.right, barT: b.top, barH: b.height, mainL: m.left, winR: window.innerWidth,
      barBg: bs.backgroundColor, sideBg: ss.backgroundColor,
      radii: [bs.borderTopLeftRadius, bs.borderTopRightRadius, bs.borderBottomLeftRadius, bs.borderBottomRightRadius],
      sideRule, sideShadow: ss.boxShadow,
      toggleL: toggle ? toggle.l - b.left : null, helpR: help ? b.right - help.r : null,
      nameShown: shown(name), nameLines, nameText: nameText?.textContent ?? null,
      eyebrow: name?.querySelector(".ws-pname-s")?.textContent ?? null,
      switchers: switchers.length,
      inSidebar: [...side.querySelectorAll('[data-shell="switcher"], .ws-mspill, .ws-phead')].filter(shown).length,
      overlaps, items: items.length,
    };
  });
}

/** Scroll whatever the page scrolls by up to `by`, and read the bar's top before and after. */
async function scrollAndRead(page: Page, by: number) {
  return page.evaluate((amount) => {
    const bar = [...document.querySelectorAll('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const before = bar.getBoundingClientRect().top;
    const cands = [...document.querySelectorAll(".ws-wbody, .ws-wbody *")]
      .filter((e) => { const s = getComputedStyle(e); return /(auto|scroll)/.test(s.overflowY) && e.scrollHeight - e.clientHeight > 40 && e.getBoundingClientRect().height > 100; }) as HTMLElement[];
    cands.sort((a, b) => (b.scrollHeight - b.clientHeight) - (a.scrollHeight - a.clientHeight));
    const sc = cands[0];
    if (!sc) return { before, after: before, scrolled: 0 };
    sc.scrollTop = amount;
    const scrolled = sc.scrollTop;
    const after = bar.getBoundingClientRect().top;
    sc.scrollTop = 0;
    return { before, after, scrolled };
  }, by);
}

test.describe.configure({ timeout: Number(process.env.PH_TIMEOUT ?? 600_000) });

/* ── §1 · the bar, on every route ── */
for (const vp of SIZES) {
  test(`§1 · the bar at ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`v2-bar-${vp.width}`);
    let scrolledEnough = 0;
    for (const route of BAR_ROUTES) {
      await openApp(page, route, vp);
      const ctx = { route, size: `${vp.width}`, state: "expanded" };
      const r = await readBar(page);
      L.check("§1 bar · found", ctx, !!r, JSON.stringify(r));
      if (!r) continue;
      L.check("§1 bar · box: left = main, right = window, 64 tall", ctx,
        Math.abs(r.barL - r.mainL) <= 0.5 && Math.abs(r.barR - r.winR) <= 0.5 && Math.abs(r.barH - 64) <= 0.5,
        `l ${r.barL}/${r.mainL} r ${r.barR}/${r.winR} h ${r.barH}`);
      L.check("§1 bar · background = the sidebar's", ctx, r.barBg === r.sideBg && !/rgba\([^)]*,\s*0\)$/.test(r.barBg), `bar ${r.barBg} side ${r.sideBg}`);
      L.check("§1 bar · no radius", ctx, r.radii.every((x) => parseFloat(x) === 0), r.radii.join("/"));
      L.check("§1 bar · the sidebar has a 1px right hairline", ctx, r.sideRule, r.sideShadow);
      L.check("§1 bar · toggle at left + 24", ctx, r.toggleL != null && Math.abs(r.toggleL - 24) <= 1, `${r.toggleL}`);
      L.check("§1 bar · Help at right − 24", ctx, r.helpR != null && Math.abs(r.helpR - 24) <= 1, `${r.helpR}`);
      L.check("§1 bar · the page name is visible, one line", ctx, r.nameShown && r.nameLines === 1, `${JSON.stringify(r.eyebrow)} / ${JSON.stringify(r.nameText)} lines ${r.nameLines}`);
      L.check("§1 bar · exactly one visible switcher, none in the sidebar", ctx, r.switchers === 1 && r.inSidebar === 0, `visible ${r.switchers} sidebar ${r.inSidebar}`);
      L.check("§1 bar · no item overlaps another", ctx, r.items >= 5 && r.overlaps.length === 0, `items ${r.items} overlaps ${JSON.stringify(r.overlaps)}`);
      const s = await scrollAndRead(page, 800);
      if (s.scrolled >= 800) scrolledEnough++;
      L.check("§1 bar · its top is unchanged after the page scrolls", ctx, Math.abs(s.after - s.before) <= 0.5, `scrolled ${s.scrolled}: ${s.before} → ${s.after}`);
    }
    L.check("§1 bar · at least one route scrolled the full 800", { route: "*", size: `${vp.width}`, state: "expanded" }, scrolledEnough > 0, `${scrolledEnough} routes`);
    L.write();
    expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(BAR_ROUTES.length * 11);
    expect(L.failures().map((f) => `${f.lock} · ${f.route} — ${f.detail}`)).toEqual([]);
  });
}

/* ── §4.5 · the switcher: choosing a book changes it everywhere, outside press and Escape close, and
   "+ Add a manuscript" opens the add flow. Reads only — the choice is localStorage, put back after.

   ⚠️ "THE PAGE FOLLOWS" IS ASSERTED AS: after a switch, the page shows exactly what a FRESH LOAD with
   that book shows. Asserting that the page names the book fails on a correct page — the fixture's
   second book has no comps, so Comparable titles shows its empty state and names nothing — and a page
   that did not follow the switch passes that claim whenever the two books share a word. */
export async function visiblePageText(page: Page) {
  return page.evaluate(() => {
    const w = [...document.querySelectorAll(".ws-wbody > *")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    return (w?.innerText ?? "").replace(/\s+/g, " ").slice(0, 600);
  });
}
export const KEY = "scriptally_active_manuscript_id";

export async function switchAndCompare(page: Page, L: Ledger, route: string) {
  const ctx = { route, size: "1440", state: "switcher" };
  await openApp(page, route, { width: 1440, height: 900 });
  const original = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const before = await visiblePageText(page);
  const btn = page.locator('[data-shell="switcher"] > button').first();
  await btn.click();
  const target = page.locator(".ws-ms-it").filter({ hasNot: page.locator(".ws-ms-ck") }).first();
  const targetTitle = ((await target.locator(".ws-ms-t").textContent()) ?? "").trim();
  await target.click();
  await page.waitForTimeout(1200);
  const after = await visiblePageText(page);
  const stored = await page.evaluate((k) => localStorage.getItem(k), KEY);
  const barTitle = ((await page.locator('[data-shell="switcher"] .ws-ms-btn .ws-ms-t').textContent()) ?? "").trim();
  await page.reload();
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const fresh = await visiblePageText(page);
  L.check("§4.5 · choosing a book writes the shared key", ctx, !!stored && stored !== original, `${original} → ${stored}`);
  L.check("§4.5 · …the switcher shows the new book", ctx, barTitle === targetTitle, `${barTitle} / ${targetTitle}`);
  L.check("§4.5 · …and the page shows what a fresh load of that book shows", ctx, after === fresh && after !== before,
    `changed ${after !== before} · equals fresh ${after === fresh}`);
  await page.evaluate(([k, v]) => { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); }, [KEY, original] as const);
  return { btn };
}

test("§4.5 · the switcher", async ({ page }) => {
  const L = new Ledger("v2-switcher");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "switcher" };
  await switchAndCompare(page, L, "/manuscripts/comps");
  await openApp(page, "/manuscripts/comps", { width: 1440, height: 900 });
  const btn = page.locator('[data-shell="switcher"] > button').first();
  const menu = page.locator(".ws-ms-menu");
  await btn.click();
  L.check("§4.5 · a click opens the menu", ctx, await menu.isVisible(), "");
  const n = await page.locator(".ws-ms-it").count();
  L.check("§4.5 · one row per manuscript, and more than one to choose", ctx, n > 1, `${n} rows`);
  /* an outside press on something inert — the bar's page name; a press on the page could open a row */
  await page.locator('[data-shell="pagename"]').click();
  await page.waitForTimeout(150);
  L.check("§4.5 · an outside press closes it", ctx, !(await menu.isVisible()), "");
  await btn.click();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
  L.check("§4.5 · Escape closes it", ctx, !(await menu.isVisible()), "");
  await btn.click();
  await page.locator(".ws-ms-add").click();
  const opened = await page.getByRole("heading", { name: "Add manuscript" }).first().waitFor({ state: "visible", timeout: 5000 }).then(() => true).catch(() => false);
  L.check("§4.5 · + Add a manuscript opens the add flow", ctx, opened, "");
  L.write();
  expect(L.rows.length).toBe(8);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});
