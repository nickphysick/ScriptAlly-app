/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD ON THE PHONE v1 — the DM1 locks. Phones at 390×844 and 375×667; the desktop checks at 1512×900 and
 * 1280×800. Every lock is a rendered reading, written to a ledger with a floor so a run that measured nothing fails.
 *
 * Named breaks: `DM1_MUTATE=<name>` (dm1Lib's CSS_MUTATIONS, or the in-test ones below).
 */
import { test, type Page } from "@playwright/test";
import { DESKTOPS, Ledger, MUT, PHONES, openDash, tag, type VP } from "./dm1Lib";

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

/** The visible dashboard root's box, or null. */
const rectOf = (page: Page, sel: string) => page.evaluate((s) => {
  const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, r: r.right, b: r.bottom };
}, sel);

/** What is open over the page: the query drawer, the agent panel, the response picker, any visible dialog. */
const openedState = (page: Page) => page.evaluate(() => {
  const vis = (e: Element) => { const r = (e as HTMLElement).getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e as HTMLElement).visibility !== "hidden"; };
  const dialogs = [...document.querySelectorAll('[role="dialog"]')].filter(vis).map((e) => (e.getAttribute("aria-label") || e.className || "").toString().slice(0, 60));
  return {
    path: location.pathname + location.search,
    drawer: [...document.querySelectorAll(".qad-root.is-open, [data-qad-drawer]")].some(vis),
    agentPanel: [...document.querySelectorAll('[data-ac="overlay"], [data-acp], .acp-root, [data-ac="panel"]')].some(vis),
    dialogs,
  };
});

const closeEverything = async (page: Page) => {
  for (let i = 0; i < 3; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
};

test("DM1-A1 · the phone top bar", async ({ page }) => {
  const L = new Ledger("A1");
  for (const vp of PHONES) {
    await openDash(page, vp);
    const where = tag(vp);
    const top = await rectOf(page, '[data-dm1="top"]');
    L.check("A1", `${where} population: the top bar`, !!top, JSON.stringify(top));
    if (!top) continue;
    if (MUT === "A1-overlap") await page.addStyleTag({ content: `.dm1-tools { margin-left: -120px !important; }` });
    if (MUT === "A1-no-rotate") await page.addStyleTag({ content: `.dm1-plus.is-open .dm1-plusdisc > svg { transform: none !important; }` });
    if (MUT === "A1-no-outside") await page.addInitScript(() => { /* no-op: the break is applied below */ });
    /* the four controls: the name, Search, Feedback, Add — each visible, inside the bar and the window */
    const ctl = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>('[data-dm1="top"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const name = bar.querySelector(".sv2-scopet");
      /* the name's INK: a range over its text, clipped by its own box (it ellipsises) */
      let ink: ReturnType<typeof box> = null;
      if (name) { const nb = name.getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(name); const rr = rg.getBoundingClientRect(); ink = { l: rr.left, t: rr.top, r: Math.min(rr.right, nb.right), b: rr.bottom, w: Math.min(rr.right, nb.right) - rr.left, h: rr.height }; }
      return {
        bar: box(bar), name: box(name), ink, text: name?.textContent ?? "",
        search: box(bar.querySelector('[aria-label="Search"]')),
        feedback: box(bar.querySelector('[aria-label="Feedback"]')),
        add: box(bar.querySelector('[aria-label="Add"]')),
        mark: box(bar.querySelector(".dm1-mark")),
      };
    });
    const vw = vp.width;
    for (const k of ["name", "search", "feedback", "add"] as const) {
      const b = ctl[k];
      L.check("A1", `${where} ${k} visible and inside the window`, !!b && b.w > 0 && b.h > 0 && b.l >= 0 && b.r <= vw + 0.5, JSON.stringify(b));
    }
    for (const k of ["search", "feedback", "add"] as const) {
      const b = ctl[k]!;
      L.check("A1", `${where} ${k} hit area ≥ 40`, !!b && b.w >= 40 && b.h >= 40, `${b?.w}×${b?.h}`);
      const ink = ctl.ink;
      const hit = !!ink && !!b && ink.r > b.l + 0.5 && ink.l < b.r - 0.5 && ink.b > b.t && ink.t < b.b;
      L.check("A1", `${where} the name never runs under ${k}`, !hit, `ink ${JSON.stringify(ink)} vs ${JSON.stringify(b)}`);
    }
    L.check("A1", `${where} the controls in order: Search, Feedback, Add`, !!ctl.search && !!ctl.feedback && !!ctl.add && ctl.search.l < ctl.feedback.l && ctl.feedback.l < ctl.add.l, "");
    L.check("A1", `${where} the bar is 50 tall`, Math.abs((ctl.bar?.h ?? 0) - 50) <= 1, String(ctl.bar?.h));
    L.check("A1", `${where} the mark is a 30px circle`, Math.abs((ctl.mark?.w ?? 0) - 30) <= 0.5, String(ctl.mark?.w));
    /* a long title ellipsises and never pushes the icons off */
    const long = await page.evaluate(() => {
      const bar = [...document.querySelectorAll<HTMLElement>('[data-dm1="top"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const n = bar.querySelector<HTMLElement>(".sv2-scopet")!;
      const was = n.textContent;
      n.textContent = "The Extraordinarily Long and Winding Title of a Very Ambitious Debut Novel";
      const nb = n.getBoundingClientRect(), s = bar.querySelector('[aria-label="Search"]')!.getBoundingClientRect(), a = bar.querySelector('[aria-label="Add"]')!.getBoundingClientRect();
      const out = { nameR: nb.right, searchL: s.left, addR: a.right, ell: getComputedStyle(n).textOverflow, clipped: n.scrollWidth > n.clientWidth };
      n.textContent = was;
      return out;
    });
    L.check("A1", `${where} a long title ellipsises before Search`, long.nameR <= long.searchL + 0.5 && long.ell === "ellipsis" && long.clipped, JSON.stringify(long));
    L.check("A1", `${where} a long title leaves + inside the window`, long.addR <= vw + 0.5, JSON.stringify(long));
    L.check("A1", `${where} the shell's generic phone bar is gone on Home`, (await rectOf(page, ".ws-mobilebar")) === null, "");

    /* the + menu: click opens, outside tap closes, Esc closes and focus returns, an item opens its flow */
    const plus = page.locator('[data-dm1="top"] [aria-label="Add"]').first();
    await plus.click();
    const menu = await page.evaluate(() => {
      const m = document.querySelector<HTMLElement>('[data-dm1="menu"]');
      const svg = document.querySelector<SVGElement>('[data-dm1="plus"] .dm1-plusdisc > svg');
      const r = m?.getBoundingClientRect();
      return {
        open: !!m, role: m?.getAttribute("role"), items: [...(m?.querySelectorAll('[role="menuitem"]') ?? [])].map((e) => e.textContent?.trim()),
        w: r?.width ?? 0, right: r?.right ?? 0, rot: svg ? getComputedStyle(svg).transform : "none",
        expanded: document.querySelector('[data-dm1="plus"]')?.getAttribute("aria-expanded"),
      };
    });
    L.check("A1", `${where} + opens a role=menu`, menu.open && menu.role === "menu", JSON.stringify(menu));
    L.check("A1", `${where} the menu's three items`, JSON.stringify(menu.items) === JSON.stringify(["Log a query", "Record a response", "Add an agent"]), JSON.stringify(menu.items));
    L.check("A1", `${where} the menu is 230 wide, inside the window`, Math.abs(menu.w - 230) <= 1 && menu.right <= vw, `${menu.w} → ${menu.right}`);
    L.check("A1", `${where} + reads × while open (rotated 45°)`, /matrix\(0\.7071/.test(menu.rot), menu.rot);
    L.check("A1", `${where} aria-expanded true while open`, menu.expanded === "true", String(menu.expanded));
    /* outside tap */
    await page.mouse.click(vp.width / 2, vp.height - 200);
    await page.waitForTimeout(200);
    const afterOutside = await page.locator('[data-dm1="menu"]').count();
    L.check("A1", `${where} an outside tap closes the menu`, afterOutside === 0, String(afterOutside));
    /* Esc, and focus back on + */
    await plus.click();
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const esc = await page.evaluate(() => ({ menu: !!document.querySelector('[data-dm1="menu"]'), focus: document.activeElement?.getAttribute("aria-label") }));
    L.check("A1", `${where} Esc closes the menu and returns focus to +`, !esc.menu && esc.focus === "Add", JSON.stringify(esc));

    if (vp.width === 390) {
      for (const [label, expect] of [["Log a query", "drawer"], ["Record a response", "drawer"], ["Add an agent", "agentPanel"]] as const) {
        await openDash(page, vp);
        const before = await openedState(page);
        await page.locator('[data-dm1="top"] [aria-label="Add"]').first().click();
        await page.getByRole("menuitem", { name: label }).click();
        await page.waitForTimeout(1500);
        const after = await openedState(page);
        /* the flow's own dialog, by its accessible name: the log journey, the response picker (the drawer's "Query"), the new-agent panel */
        const want = label === "Log a query" ? /^Log a query$/ : label === "Add an agent" ? /^Add an agent$/ : /^Query$/;
        void expect;
        const opened = before.dialogs.length === 0 && after.dialogs.some((d) => want.test(d));
        L.check("A1", `${where} "${label}" opens its flow`, opened, JSON.stringify({ before, after }));
        L.check("A1", `${where} "${label}" closes the menu`, (await page.locator('[data-dm1="menu"]').count()) === 0, "");
        await closeEverything(page);
      }
    }
  }
  /* absent at 768 and wider */
  for (const vp of [...DESKTOPS, { width: 768, height: 900 }] as VP[]) {
    await openDash(page, vp);
    const n = await page.locator('[data-dm1="top"]').count();
    const d58 = await rectOf(page, '[data-d58="page"]');
    L.check("A1", `${tag(vp)} no phone top bar`, n === 0, String(n));
    L.check("A1", `${tag(vp)} the desktop page renders`, !!d58, JSON.stringify(d58));
  }
  L.done(60);
});
