/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHONE APP v2, PART 8 — THE WHOLE-APP SWEEP, PA2-8. Every workspace route at 390 × 844 and 360 × 780, on the harness
 * account and on the empty fixture account. On every page:
 *   W1 the band is present · W2 the colour laws · W3 no image twice · W4 no uppercase labels (a computed
 *   `text-transform: uppercase`, or all-caps text under 13px) · W5 nothing runs past the screen's edge (no sideways
 *   scroll, nothing cut off — a scroller the design means to scroll sideways is allowed) · W6 every tap target at
 *   least 44px · W7 every input at least 16px (the mobileShell law).
 * And the first run: R1 the empty Home's faded example and never the ruled-out words · R2 the empty Queries' first-query
 * card with inert examples · R3 every getting-started step is the dashboard's own source.
 */
import { expect, test, type Page } from "@playwright/test";
import { Ledger, PHONES, colourSweep, emptyPhone, imageSweep, openPhone, shot, tag } from "./pa2Lib";
import { GETTING_STARTED } from "../../src/lib/dashEmpty";

test.setTimeout(900_000);
const PART = "part-8";

/** PA2_SWEEP_ROUTES narrows a run to some routes (how each mutation is proved on the route it breaks) */
const ALL_ROUTES = [
  "/dashboard", "/queries", "/queries/analytics", "/queries/responses", "/queries/packages",
  "/todo", "/todo/corkboard", "/agents", "/agents/discover",
  "/manuscripts", "/manuscripts/comps", "/manuscripts/versions", "/goals",
  "/import", "/help", "/plans", "/account",
  "/account/profile", "/account/security", "/account/plan", "/account/notifications", "/account/preferences", "/account/tasks", "/account/data",
];
const SWEEP_ROUTES = process.env.PA2_SWEEP_ROUTES ? process.env.PA2_SWEEP_ROUTES.split(",") : ALL_ROUTES;

/** W4–W7 in the page: the uppercase census, the edge, the tap targets and the input sizes */
const uiSweep = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => {
    const r = e.getBoundingClientRect(); if (r.width === 0 || r.height === 0) return false;
    const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) return false;
    return !e.closest("[inert], [aria-hidden='true']");
  };
  const name = (e: Element) => `${e.tagName.toLowerCase()}.${String(e.getAttribute("class") ?? "").split(" ").filter(Boolean).slice(0, 2).join(".")}`;
  const roots = [...document.querySelectorAll<HTMLElement>(".pa-band, .ws-wbody, .pa-layer, .pa-tabbar")];
  const all = new Set<HTMLElement>();
  for (const r of roots) for (const el of [r, ...r.querySelectorAll<HTMLElement>("*")]) all.add(el);
  const W = window.innerWidth;
  const out = { upper: [] as string[], edge: [] as string[], taps: [] as string[], inputs: [] as string[], counted: { text: 0, taps: 0 } };
  for (const el of all) {
    if (!vis(el)) continue;
    const cs = getComputedStyle(el);
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
    if (text) {
      out.counted.text++;
      const letters = text.replace(/[^A-Za-z]/g, "");
      if (cs.textTransform === "uppercase" && letters.length >= 2) out.upper.push(`${name(el)} "${text.slice(0, 24)}" (text-transform)`);
      else if (letters.length >= 4 && letters === letters.toUpperCase() && parseFloat(cs.fontSize) < 13) out.upper.push(`${name(el)} "${text.slice(0, 24)}" (${cs.fontSize})`);
    }
    /* the edge: past the screen, and not inside a scroller the design means to scroll sideways */
    const r = el.getBoundingClientRect();
    /* only what is partly on screen: a drawer parked wholly off-screen is not seen; content clipped by an ancestor
       is judged by that ancestor; a sideways scroller the design means to scroll is allowed */
    if ((r.right > W + 1 && r.left < W) || (r.left < -1 && r.right > 0)) {
      let ok = false;
      for (let x = el.parentElement; x; x = x.parentElement) {
        const o = getComputedStyle(x).overflowX;
        if (o === "auto" || o === "scroll") { ok = x.scrollWidth > x.clientWidth; break; }
        if (o === "hidden" || o === "clip") { ok = true; break; }
      }
      if (!ok && !el.closest(".pa-sw .acts, .pa-acts")) out.edge.push(`${name(el)} ${Math.round(r.left)}–${Math.round(r.right)} of ${W}`);
    }
    const tappable = el.matches("button, a[href], [role='button'], [role='switch'], [role='tab'], select, input:not([type='hidden']), textarea");
    if (tappable && cs.pointerEvents !== "none" && !(el as HTMLButtonElement).disabled) {
      out.counted.taps++;
      if (r.height < 43.5 || r.width < 43.5) out.taps.push(`${name(el)} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 18)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    if (el.matches("input:not([type='hidden']):not([type='checkbox']):not([type='radio']), select, textarea") && parseFloat(cs.fontSize) < 15.5) out.inputs.push(`${name(el)} ${cs.fontSize}`);
  }
  const de = document.scrollingElement as HTMLElement;
  if (de.scrollWidth > de.clientWidth + 1) out.edge.push(`the document scrolls sideways (${de.scrollWidth} of ${de.clientWidth})`);
  return out;
});

async function sweepRoute(page: Page, L: Ledger, who: string, route: string, vp: { width: number; height: number }) {
  const where = `${who} ${tag(vp)} ${route}`;
  L.check("W1", `${where}: the band is present`, (await page.locator('[data-pa="band"]:visible').count()) === 1, "");
  const col = await colourSweep(page, { roots: ".pa-band, .ws-wbody, .pa-layer, .pa-tabbar" });
  L.check("W2", `${where}: white on navy, ink on blush, no green or red`, col.bad.length === 0, col.bad.slice(0, 20).join(" | "));
  for (const s of await imageSweep(page)) L.check("W3", `${where}: no image twice`, new Set(s).size === s.length, JSON.stringify(s.filter((x, i) => s.indexOf(x) !== i)));
  const ui = await uiSweep(page);
  L.check("pop", `${where}: text and targets were read`, ui.counted.text > 3 && ui.counted.taps > 2, JSON.stringify(ui.counted));
  L.check("W4", `${where}: no uppercase labels`, ui.upper.length === 0, ui.upper.slice(0, 20).join(" | "));
  L.check("W5", `${where}: nothing past the screen's edge`, ui.edge.length === 0, ui.edge.slice(0, 12).join(" | "));
  L.check("W6", `${where}: every tap target at least 44px`, ui.taps.length === 0, `${ui.taps.length}: ${ui.taps.slice(0, 40).join(" | ")}`);
  L.check("W7", `${where}: every input at least 16px`, ui.inputs.length === 0, ui.inputs.slice(0, 4).join(" | "));
}

for (const vp of PHONES) {
  test(`PA2-8 · the sweep · harness · ${tag(vp)}`, async ({ page }) => {
    const L = new Ledger(PART, `sweep-harness-${tag(vp)}`);
    for (const route of SWEEP_ROUTES) {
      await openPhone(page, route, vp);
      await page.waitForTimeout(600);
      await sweepRoute(page, L, "harness", route, vp);
    }
    L.done(SWEEP_ROUTES.length * 6);
  });

  test(`PA2-8 · the sweep and the first run · empty account · ${tag(vp)}`, async ({ browser, baseURL }) => {
    const L = new Ledger(PART, `sweep-empty-${tag(vp)}`);
    const { ctx, page } = await emptyPhone(browser, baseURL!, "/dashboard", vp);
    try {
      /* R1 — Home before the first query */
      await page.locator('[data-pa="first-run"]').waitFor({ timeout: 20_000 });
      const home = await page.evaluate(() => ({
        title: document.querySelector('[data-pa="first-run-title"]')?.textContent ?? "",
        fade: (() => { const f = document.querySelector<HTMLElement>(".pa-exfade"); if (!f) return null; const cs = getComputedStyle(f); return { o: cs.opacity, filter: cs.filter, pe: cs.pointerEvents, inert: f.hasAttribute("inert") }; })(),
        example: !!document.querySelector('[data-pa="stand-example"] .pa-extag'),
        body: document.body.innerText,
      }));
      L.check("R1", `${tag(vp)} the band's hero is drawn faded behind "Let’s start tracking your campaign"`, home.title === "Let’s start tracking your campaign" && !!home.fade && Number(home.fade.o) < 0.2 && /blur/.test(home.fade.filter) && home.fade.pe === "none" && home.fade.inert, JSON.stringify(home.fade));
      L.check("R1", `${tag(vp)} "Where they stand" is tagged Example`, home.example, "");
      L.check("R1", `${tag(vp)} never the words "Your campaign chart starts here"`, !/your campaign chart starts here/i.test(home.body), "");
      /* R3 — the getting-started steps are the dashboard's own */
      const steps = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa="gs-step"]')].map((s) => ({ k: s.dataset.k!, done: s.dataset.done, text: s.querySelector("b")?.textContent ?? "" })));
      L.check("R3", `${tag(vp)} every getting-started step is the dashboard's own, in its order`, JSON.stringify(steps.map((s) => [s.k, s.text])) === JSON.stringify(GETTING_STARTED.map((g) => [g.key, g.deed])), JSON.stringify(steps.map((s) => s.k)));
      L.check("R3", `${tag(vp)} on an account with nothing, no step is done`, steps.length > 0 && steps.every((s) => s.done === "0"), JSON.stringify(steps.map((s) => s.done)));
      await shot(page, PART, `45-home-first-run-${tag(vp)}`);
      /* R2 — Queries before the first query */
      await page.goto("/queries"); await page.locator('[data-pa="queries-first-run"]').waitFor({ timeout: 20_000 }); await page.waitForTimeout(600);
      const q = await page.evaluate(() => {
        const ex = document.querySelector<HTMLElement>('[data-pa="examples"]');
        return { band: document.querySelector('[data-pa="band-empty"]')?.textContent ?? "", card: !!document.querySelector('[data-pa="first-card"] [data-pa="first-log"]'),
          rows: ex ? ex.querySelectorAll('[data-qm1="row"]').length : 0, inert: !!ex?.hasAttribute("inert"), op: ex ? getComputedStyle(ex).opacity : "", pe: ex ? getComputedStyle(ex).pointerEvents : "" };
      });
      L.check("R2", `${tag(vp)} "Nothing logged yet." and the first-query card`, q.band === "Nothing logged yet." && q.card, JSON.stringify(q));
      L.check("R2", `${tag(vp)} three example rows, faded and inert`, q.rows === 3 && q.inert && Number(q.op) <= 0.56 && q.pe === "none", JSON.stringify(q));
      await shot(page, PART, `46-queries-first-run-${tag(vp)}`);
      /* the sweep on the empty account */
      for (const route of SWEEP_ROUTES) {
        await page.goto(route); await page.locator('[data-pa="band"]').first().waitFor({ timeout: 30_000 }); await page.waitForTimeout(900);
        await sweepRoute(page, L, "empty", route, vp);
      }
    } finally { await ctx.close(); }
    L.done(SWEEP_ROUTES.length * 6 + 6);
  });
}
