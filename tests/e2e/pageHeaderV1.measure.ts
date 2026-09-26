/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * pageHeaderV1 — the bar without its breadcrumb, the centred content column, and the one page
 * header, measured on the signed-in app against `design-refs/page-headers-v6.html`.
 *
 * ⚠️ EVERY VERTICAL NUMBER IS RELATIVE TO THE BAR, NEVER THE VIEWPORT. The mock draws a 10px dark
 * strip at the very top to stand for dev's beta strip; it is not part of this design, so a claim
 * measured from the window's top would be a claim about that strip.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";

const OUT = resolve("test-results/page-header-v1");
const REPORT = resolve(OUT, "report.json");
const REF = "file://" + resolve("design-refs/page-headers-v6.html");

type Entry = { area: string; what: string; got: unknown; want: unknown; ok: boolean };
const ledger: Entry[] = [];
const save = () => { mkdirSync(OUT, { recursive: true }); writeFileSync(REPORT, JSON.stringify({ ledger, assertions: ledger.filter((e) => e.want !== "reported").length }, null, 2)); };
const record = (e: Omit<Entry, "ok">) => { ledger.push({ ...e, ok: true }); save(); };
const is = (area: string, what: string, got: unknown, want: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ledger.push({ area, what, got, want, ok }); save();
  expect(ok, `${area}: ${what} is ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`).toBe(true);
};
const near = (area: string, what: string, got: number | undefined, want: number, tol: number) => {
  const ok = got != null && Math.abs(got - want) <= tol;
  ledger.push({ area, what, got, want: `${want} ±${tol}`, ok }); save();
  expect(ok, `${area}: ${what} is ${got}, wanted ${want} ±${tol}`).toBe(true);
};
const yes = (area: string, what: string, ok: boolean, got: unknown) => {
  ledger.push({ area, what, got, want: true, ok }); save();
  expect(ok, `${area}: ${what} — ${JSON.stringify(got)}`).toBe(true);
};

async function openApp(page: Page, path: string, w: number, h: number) {
  await openRoute(page, path, { width: w, height: h });
  await expect(page.locator(".os-skelpage")).toHaveCount(0, { timeout: 15_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(700);
}

/* ── §1 · the bar ── */
test("§1 · the bar is full width, 64px, and carries no breadcrumb", async ({ page }) => {
  for (const w of [1280, 1440, 1920]) {
    await openApp(page, "/queries", w, 900);
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
      const bar = vis(".ws-pagebar"); const main = vis(".ws-main");
      if (!bar || !main) return null;
      const b = bar.getBoundingClientRect(), m = main.getBoundingClientRect();
      const tog = bar.querySelector(".sb-toggle")?.getBoundingClientRect();
      const tools = [...bar.querySelectorAll("button, a")].map((e) => e.getBoundingClientRect());
      const help = tools.length ? tools.reduce((a, c) => (c.right > a.right ? c : a)) : null;
      const cs = getComputedStyle(bar);
      return {
        barL: Math.round(b.left), barR: Math.round(b.right), mainL: Math.round(m.left), winR: window.innerWidth,
        h: Math.round(b.height), pos: cs.position, bg: cs.backgroundColor, shadow: cs.boxShadow,
        togL: tog ? Math.round(tog.left) : null, helpR: help ? Math.round(help.right) : null,
        /* ⚠️ THE CLAIM IS THAT NOTHING IN THE BAR IS A CRUMB, which is two questions: no separator,
           and not the page's own title. A check for the class alone would pass on a bar that had
           been rebuilt with the same trail under a new name. */
        crumbEls: bar.querySelectorAll(".ws-crumb, .ws-seg, .ws-sep, .ws-cur, .ws-croot").length,
        seps: (bar.textContent ?? "").split("/").length - 1,
        text: (bar.textContent ?? "").replace(/\s+/g, " ").trim(),
      };
    });
    yes("bar", `§1 · the bar was found at ${w}`, r != null, JSON.stringify(r));
    if (!r) continue;
    record({ area: "bar", what: `§1 · the bar at ${w}`, got: r, want: "reported" });
    is("bar", `§1 · left edge = the main area's left (${w})`, r.barL, r.mainL);
    is("bar", `§1 · right edge = the window's right (${w})`, r.barR, r.winR);
    is("bar", `§1 · 64px tall (${w})`, r.h, 64);
    is("bar", `§1 · the toggle is 24px in (${w})`, r.togL! - r.barL, 24);
    is("bar", `§1 · …and Help's right edge is 24px in (${w})`, r.barR - r.helpR!, 24);
    is("bar", `§1 · no breadcrumb element (${w})`, r.crumbEls, 0);
    is("bar", `§1 · …no separator in its text (${w})`, r.seps, 0);
    yes("bar", `§1 · …and it does not state the page's title (${w})`, !/Query Centre/i.test(r.text), r.text);
  }
});

/**
 * ⚠️ §1 ASKS FOR "STICKY AT THE TOP OF THE SCROLL CONTAINER", AND THE BAR IS ABOVE IT INSTEAD.
 *
 * `.ws-main` is a flex COLUMN holding the bar and then `.ws-winwrap`; every page's scroller lives
 * inside the wrap. So the bar is not in the scroll container at all — it cannot move, and
 * `position: sticky` on it would be a declaration that can never do anything. This repo's own law
 * is that a sticky on a box that cannot scroll claims a behaviour that cannot occur, and a dead
 * claim is how the next reader is misled into hanging an offset off it.
 *
 * The requirement — the bar stays at the top while the page scrolls — is what is asserted, by
 * scrolling the page and measuring that the bar has not moved. That is true of the shell as built,
 * and it stays true if anyone ever does put it inside the scroller.
 */
test("§1 · the bar holds its place while the page scrolls, and gains its shadow", async ({ page }) => {
  /**
   * ⚠️ THE ROUTE HAS TO BE ONE THAT REALLY SCROLLS, and several do not: the Tasks family and the
   * Query Centre FILL the row and scroll inside their panes, so a scroll driven at the row moves
   * nothing and the shadow is never asked for. The first route whose scroller genuinely overflows
   * is used, and which one it was is reported.
   */
  let on: string | null = null;
  for (const route of ["/agents/discover", "/manuscripts/packages", "/manuscripts/comps", "/agents"]) {
    await openApp(page, route, 1440, 900);
    const can = await page.evaluate(() => [...document.querySelectorAll("*")].some((e) => {
      const c = getComputedStyle(e);
      return (c.overflowY === "auto" || c.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 80;
    }));
    if (can) { on = route; break; }
  }
  yes("bar", `§1 · a route that really scrolls was found (${on})`, on != null, String(on));
  if (!on) return;
  const read = () => page.evaluate(() => {
    const bar = [...document.querySelectorAll(".ws-pagebar")].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const cs = getComputedStyle(bar);
    return { top: Math.round(bar.getBoundingClientRect().top), pos: cs.position, shadow: cs.boxShadow };
  });
  const rest = await read();
  record({ area: "bar", what: "§1 · at rest", got: rest, want: "reported" });
  yes("bar", `§1 · the bar is out of the scroller, above it (${rest.pos})`, rest.pos === "static" || rest.pos === "sticky", rest.pos);
  yes("bar", "§1 · …and at rest it carries the hairline only", !/rgba\(28, 19, 15, 0\.35\)/.test(rest.shadow), rest.shadow);

  /* ⚠️ SCROLL THE SCROLL CONTAINER, NOT THE WINDOW. The workspace scrolls inside its own element;
     `window.scrollBy` on a page whose body never scrolls moves nothing and the check passes on a
     bar that was never asked the question. */
  const moved = await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => {
      const c = getComputedStyle(e);
      return (c.overflowY === "auto" || c.overflowY === "scroll") && e.scrollHeight > e.clientHeight + 80;
    }) as HTMLElement | undefined;
    if (!el) return { scrolled: -1, on: null as string | null };
    el.scrollTop = 240;
    return { scrolled: Math.round(el.scrollTop), on: (el.className || el.tagName).toString().slice(0, 40) };
  });
  await page.waitForTimeout(400);
  record({ area: "bar", what: "§1 · the scroll", got: moved, want: "reported" });
  yes("bar", `§1 · the page really scrolled (${moved.scrolled} on ${moved.on})`, moved.scrolled > 100, JSON.stringify(moved));
  const after = await read();
  record({ area: "bar", what: "§1 · scrolled", got: after, want: "reported" });
  yes("bar", `§1 · …and the bar gains its shadow (${after.shadow})`, /rgba\(28, 19, 15, 0\.35\)/.test(after.shadow), after.shadow);
  is("bar", "§1 · …and stays at the top of its scroller", after.top, rest.top);
});


/* ── §2 · the centred content column ── */

/**
 * ⚠️ §2 · THE COLUMN IS ASSERTED AS A RELATION, NEVER AS THE BRIEF'S ABSOLUTE x VALUES.
 *
 * The brief's 301 / 306 / 462 are the MOCK's, and the mock draws a 260px sidebar where this app's
 * is 248 — so every absolute number is 12px out while the column itself is exactly right. A lock
 * on the numbers would fail on a correct page and, worse, would have to be "corrected" by moving
 * the column to match a sidebar the app does not have.
 */
test("§2 · the content column is centred, capped and equally margined", async ({ page }) => {
  for (const w of [1280, 1440, 1920]) {
    for (const route of ["/queries", "/agents", "/queries/analytics"]) {
      await openApp(page, route, w, 900);
      const r = await page.evaluate(() => {
        const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
        const main = vis(".ws-main"); const sc = vis(".wpg-scroll");
        if (!main || !sc) return null;
        /* the column is the first child of the scroller that actually takes the cap — the
           full-bleed chrome (the slab, the mini bar, the reclaim spacer) states `max-width: none`
           on purpose, and measuring one of those would be measuring the page's background. */
        const col = [...sc.children].map((e) => e as HTMLElement)
          .find((e) => e.getBoundingClientRect().width > 0 && getComputedStyle(e).maxWidth !== "none");
        if (!col) return null;
        const b = col.getBoundingClientRect(), m = main.getBoundingClientRect(), cs = getComputedStyle(col);
        const gut = parseFloat(cs.paddingLeft);
        return {
          left: Math.round(b.left * 10) / 10, right: Math.round(b.right * 10) / 10,
          mainL: Math.round(m.left * 10) / 10, mainW: Math.round(m.width * 10) / 10,
          winW: window.innerWidth, gut: Math.round(gut * 10) / 10,
          max: cs.maxWidth, boxSizing: cs.boxSizing,
          contentW: Math.round((b.width - gut - parseFloat(cs.paddingRight)) * 10) / 10,
          cls: (col.className || col.tagName).toString().slice(0, 30),
        };
      });
      yes("column", `§2 · a capped column was found on ${route} at ${w}`, r != null, JSON.stringify(r));
      if (!r) continue;
      record({ area: "column", what: `§2 · ${route} at ${w}`, got: r, want: "reported" });
      /* equal margins, ±1 */
      const leftGap = r.left - r.mainL, rightGap = r.winW - r.right;
      near("column", `§2 · equal left and right margins on ${route} at ${w} (${leftGap} / ${rightGap})`, leftGap - rightGap, 0, 1);
      /* the gutter is the clamp, of the WINDOW */
      near("column", `§2 · the gutter is clamp(28, 3.2vw, 52) at ${w}`, r.gut, Math.min(52, Math.max(28, w * 0.032)), 0.6);
      /* content width = min(1360, main) − 2 × gutter */
      near("column", `§2 · the content is min(1360, main) − 2 gutters on ${route} at ${w}`,
        r.contentW, Math.min(1360, r.mainW) - 2 * r.gut, 1.2);
      is("column", `§2 · …capped at 1360 (${route} at ${w})`, r.max, "1360px");
      /* ⚠️ AND `border-box`, or the padding is ADDED to the cap and every margin reading still passes */
      is("column", `§2 · …with the gutter inside the cap (${route} at ${w})`, r.boxSizing, "border-box");
    }
  }
});

/* ⚠️ THE RAIL'S RIGHT EDGE IS THE COLUMN'S — a sticky panel that sat outside it would be the one
   element on the page not in the column, and nothing else would say so. */
test("§2 · the Query Centre's rail ends where the column ends, and sticks 16 below the bar", async ({ page }) => {
  for (const w of [1440, 1920]) {
    await openApp(page, "/queries", w, 900);
    const r = await page.evaluate(() => {
      const vis = (s: string) => [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
      const group = vis(".qcv-group"); const rail = vis("[data-qcv='rail']"); const sc = vis(".wpg-scroll");
      if (!group || !rail || !sc) return null;
      const g = group.getBoundingClientRect(), rr = rail.getBoundingClientRect(), s2 = sc.getBoundingClientRect();
      const cs = getComputedStyle(group);
      return {
        colRight: Math.round((g.right - parseFloat(cs.paddingRight)) * 10) / 10,
        railRight: Math.round(rr.right * 10) / 10,
        stickyTop: Math.round(parseFloat(getComputedStyle(rail).top) * 10) / 10,
        railTopFromScroller: Math.round((rr.top - s2.top) * 10) / 10,
        footGap: Math.round((s2.top + window.innerHeight - s2.top - rr.bottom) * 10) / 10,
        pos: getComputedStyle(rail).position,
      };
    });
    yes("column", `§2 · the rail was found at ${w}`, r != null, JSON.stringify(r));
    if (!r) continue;
    record({ area: "column", what: `§2 · the rail at ${w}`, got: r, want: "reported" });
    near("column", `§2 · the rail's right edge is the column's at ${w}`, r.railRight, r.colRight, 1);
    is("column", `§2 · …and it is sticky at ${w}`, r.pos, "sticky");
    /**
     * ⚠️ 16 FROM THE SCROLLER, NOT 80. §2 says "bar height + 16 (80px from the scroll container's
     * top)", which is true of the MOCK, where the bar scrolls inside the same column as the
     * content. Here the bar is a flex sibling ABOVE the scroller, so the scroller already starts at
     * the bar's bottom and 80 would sit the rail 64px lower than the design draws it. The
     * requirement — 16 below the bar — is what is asserted.
     */
    near("column", `§2 · …16 below the bar at ${w}`, r.stickyTop, 16, 1);
  }
});

/* ⚠️ THE CRUMB IS GONE FROM THE SHELL, not merely from the bar — a trail rendered anywhere else in
   the workspace chrome is the same fact wearing a different parent. */
test("§1 · no breadcrumb anywhere in the workspace shell", async ({ page }) => {
  for (const path of ["/queries", "/todo", "/agents", "/queries/analytics"]) {
    await openApp(page, path, 1440, 900);
    const n = await page.evaluate(() =>
      document.querySelectorAll(".ws-crumb, .ws-seg, .ws-sep, .ws-croot, [aria-label='Breadcrumb']").length);
    is("bar", `§1 · no breadcrumb on ${path}`, n, 0);
  }
});
void REF;
