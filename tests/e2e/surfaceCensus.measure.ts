/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SURFACE CENSUS — every major surface, OPENED, and read as computed values.
 *
 * ⚠️ IT EXISTS BECAUSE TWO FAULTS IN ONE DAY SHARED A SHAPE NO OTHER CHECK COULD SEE. On
 * 2026-09-09 a shared `SlideOver` gained a portal and a shared search field gave up its own width,
 * each to fix one page, and each silently broke another: the Contact list's drawer rendered with no
 * styling at all, and its toolbar folded onto three rows. Every gate stayed green through both —
 * tsc, the production build, the whole unit suite — because the page MOUNTED, the markup was right,
 * and `renderToStaticMarkup` cannot evaluate a stylesheet. A smoke that only loads a page passes
 * for the wrong reason.
 *
 * ⚠️ SO EVERY GROUP OPENS SOMETHING AND ASKS THE BROWSER.
 *   group 1 — every route: its page root reaches the screen, no boundary, no uncaught error.
 *   group 2 — every control row holds ONE row, and every page declared to have none still has none.
 *   group 3 — every portalled drawer opens, and its own rules demonstrably reach it.
 *
 * ⚠️ FEW TESTS, SOFT ASSERTIONS INSIDE THEM — two reasons pulling the same way. Every test
 * password-signs-in (Firebase keeps its session in IndexedDB, which `storageState` does not carry),
 * and a long run of sign-ins trips Firebase's abuse guard; `ensureSignedIn` returns early once the
 * shell is up, so one test visiting every route costs ONE sign-in. And a hard `expect` on the first
 * entry would hide every entry after it — a case whose first assertion throws is silent, not green.
 *
 * ⚠️ NOTHING HERE IS TYPED FROM MEMORY. The route roster is spliced from `barBinding.measure.ts`, and
 * every selector below was verified against the source when this file was written. Retyping a page
 * census by hand has produced two wrong classes out of three in this repo before.
 *
 * It WRITES NOTHING: it opens drawers by clicking cards and tickets, closes them with Escape, and puts
 * the To-do page's view back the way it found it.
 */
import { expect, test, type Page } from "@playwright/test";
import { openRoute, visiblePage } from "./measure";
import { openTaskInView } from "./todoOpen";

test.setTimeout(480_000);

const VIEW = { width: 1440, height: 900 };

const settle = (page: Page) =>
  page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** spliced from barBinding.measure.ts's roster, plus the dashboard's own root */
const ROUTES = [
  { name: "Query Centre", route: "/queries", root: ".qc-wpg" },
  { name: "Analytics", route: "/queries/analytics", root: ".qa-wpg" },
  { name: "Contact list", route: "/agents", root: ".agl-wpg" },
  { name: "Discover", route: "/agents/discover", root: ".dv-wpg" },
  { name: "Manuscripts", route: "/manuscripts", root: ".msv-wpg" },
  { name: "Comparable titles", route: "/manuscripts/comps", root: ".ct-wpg" },
  { name: "Submission packages", route: "/manuscripts/packages", root: ".pkgw-wpg" },
  { name: "To-do list", route: "/todo", root: ".tpl-wpg" },
  { name: "Calendar", route: "/todo/calendar", root: ".tpl-wpg" },
  { name: "Noteboard", route: "/todo/noteboard", root: ".tpl-wpg" },
  { name: "Dashboard", route: "/dashboard", root: ".sa-dashroot" },
] as const;
type RouteName = (typeof ROUTES)[number]["name"];

/**
 * The app-wide error boundary's OWN element, or null when it carries no class of its own.
 * ⚠️ NOT ITS WORDS: "Something went wrong" is rendered by seven components, most of them inline error
 * states, so a text match describes something other than the boundary. The boundary is mounted once
 * for the whole app, so when it renders it REPLACES every page — which the root check already sees.
 */
const BOUNDARY_SELECTOR: string | null = null;

const onScreenRoot = (page: Page, root: string) =>
  page
    .waitForFunction((r) => [...document.querySelectorAll(r)].some((el) => el.getBoundingClientRect().height > 0), root, { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);

test.describe("group 1 — every route renders its page", () => {
  test("each page root reaches the screen, with no boundary and no uncaught error", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(`${new URL(page.url()).pathname} :: ${String(e).slice(0, 160)}`));
    const rendered: string[] = [];
    for (const r of ROUTES) {
      await openRoute(page, r.route, VIEW);
      const visible = await onScreenRoot(page, r.root);
      /* `visiblePage` refuses NONE and refuses TWO — every workspace page stays mounted, so a root
         that is merely in the DOM proves nothing about the page on screen */
      const scoped = visible ? await visiblePage(page, r.root).then(() => true).catch(() => false) : false;
      const boundary = BOUNDARY_SELECTOR
        ? await page.evaluate((sel) => [...document.querySelectorAll(sel)].some((el) => el.getBoundingClientRect().height > 0), BOUNDARY_SELECTOR)
        : false;
      // eslint-disable-next-line no-console
      console.log(`[route] ${r.name.padEnd(20)} ${visible ? "root on screen" : "ROOT MISSING"}${visible && !scoped ? " · visiblePage refused" : ""}${boundary ? " · ⚠️ BOUNDARY" : ""}`);
      expect.soft(visible, `${r.name}: ${r.root} never reached the screen — the page did not render`).toBe(true);
      expect.soft(scoped || !visible, `${r.name}: visiblePage found none or two of ${r.root}`).toBe(true);
      expect.soft(boundary, `${r.name}: the error boundary rendered`).toBe(false);
      if (visible && scoped && !boundary) rendered.push(r.name);
    }
    // eslint-disable-next-line no-console
    console.log(`[route] rendered ${rendered.length} of ${ROUTES.length} · uncaught page errors: ${pageErrors.length}`);
    expect.soft(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
    /* the population as a number, so a roster that quietly shrank cannot pass */
    expect(rendered.length, "not every route in the roster rendered").toBe(ROUTES.length);
  });
});

/* ══ group 2 — control rows ══════════════════════════════════════════════════════════════════════ */

/** what counts as a control in a row; nested matches are dropped, so a switch counts once */
const CONTROLS = `.wpg-tally, .qcc-tb-search, .qcc-tb-btn, .qvs, .an-range, .nb-search, .tdb-export, button, input, select, [role="group"]`;

/**
 * ⚠️ EVERY ROUTE IS ACCOUNTED FOR — measured, or declared absent WITH the reason, and the absence
 * checked. A page that grows a control row later goes red here and asks to be added, rather than
 * being skipped by a roster that never heard of it.
 */
const ROWS: { name: RouteName; row: string | null; why?: string }[] = [
  { name: "Query Centre",        row: ".qcc-tb" },
  { name: "Analytics",           row: ".wpg-tools" },
  { name: "Contact list",        row: ".wpg-tools" },
  { name: "Discover",            row: null, why: "DISCOVER_LIVE is false, so no control row renders" },
  { name: "Manuscripts",         row: null, why: "passes no toolbar to the grid" },
  { name: "Comparable titles",   row: null, why: "passes no toolbar to the grid" },
  { name: "Submission packages", row: null, why: "passes no toolbar to the grid" },
  { name: "To-do list",          row: ".tdb-qtool" },
  { name: "Calendar",            row: null, why: "passes no tools to TasksPageLayout" },
  { name: "Noteboard",           row: ".wpg-tools" },
  { name: "Dashboard",           row: null, why: "exempt from the workspace grid's chrome" },
];

type RowReading = {
  rootFound: boolean; rowFound: boolean; controls: number; lines: number;
  contentH: number; tallest: number; shellRowControls: number;
};

/* ══ group 3 — portalled drawers ═════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ THE FINGERPRINT OF A SHEET THAT DOES NOT REACH ITS SUBJECT: no author layout. A browser's own
 * stylesheet never makes an element flex or grid, so the count of such elements inside a drawer
 * measures how much of its page's CSS actually arrived — without knowing a single class name.
 */
/* ⚠️ THE THRESHOLD SITS BETWEEN TWO MEASURED NUMBERS, not at a guess. First run against dev: the
   three healthy drawers laid out 7 (Contact list), 31 (To-do) and 30 (Dashboard) elements; the
   Contact list drawer with its page scope removed — 75309bbc's regression — laid out 2. Four clears
   the broken case and leaves the smallest healthy drawer room to lose a flex row to a restyle. */
const MIN_LAID_OUT = 4;

type Drawer = {
  name: string;
  /** a selector only this drawer's content carries — the drawer is found by CONTENT, since more than
      one `.slo` can be mounted and their widths do not tell them apart */
  content: string;
  /** a surface that must be painted, where the structure is known; null where it is not */
  surface: string | null;
  /** a token that must resolve on that surface — the second half of a portal escaping its scope */
  token: string | null;
  open: (page: Page) => Promise<void>;
  after?: (page: Page) => Promise<void>;
};

let todoPriorView: string | null = null;

const DRAWERS: Drawer[] = [
  {
    name: "Contact list", content: ".agl-dhead", surface: ".agl-dhead", token: "--agl-band",
    open: async (page) => {
      await openRoute(page, "/agents", VIEW);
      const scope = await visiblePage(page, ".agl-wpg");
      await page.locator(`${scope} [data-agent-card] .agl-body`).first().click({ timeout: 15_000 });
    },
  },
  {
    name: "To-do list", content: ".tpn", surface: ".dhero", token: null,
    open: async (page) => {
      await openRoute(page, "/todo", VIEW);
      const scope = await visiblePage(page, ".wpg");
      todoPriorView = ((await page.locator(`${scope} .qvs .qvs-on`).first().textContent({ timeout: 10_000 }).catch(() => null)) ?? "").trim() || null;
      await openTaskInView(page, "grid", 0, { navigate: false });
    },
    /* ⚠️ THE VIEW GOES BACK. Opening a task switches the page to Grid, and the page remembers its view;
       a census that leaves the account's page in a different state has written something. */
    after: async (page) => {
      if (!todoPriorView || todoPriorView.toLowerCase() === "grid") return;
      const scope = await visiblePage(page, ".wpg");
      await page.locator(`${scope} .qvs`).getByRole("button", { name: todoPriorView, exact: true }).first().click({ timeout: 10_000 }).catch(() => {});
    },
  },
  {
    name: "Dashboard", content: ".dash-tpn", surface: ".dhero", token: null,
    open: async (page) => {
      await openRoute(page, "/dashboard", VIEW);
      const scope = await visiblePage(page, ".sa-dashroot");
      await page.locator(`${scope} .tkt`).first().click({ timeout: 15_000 });
    },
  },
];

type DrawerReading = {
  width: number; laidOut: number; surfaceFound: boolean; bgColor: string; bgImage: string; tokenValue: string;
};

const drawerOnScreen = (content: string) =>
  [...document.querySelectorAll(".slo")].some((s) => {
    const b = s.getBoundingClientRect();
    return !!s.querySelector(content) && b.width > 0 && b.left < window.innerWidth && b.right > 0;
  });

test.describe("groups 2 and 3 — control rows and drawers, read as computed values", () => {
  test("every control row holds one row, and every drawer's own rules reach it", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(`${new URL(page.url()).pathname} :: ${String(e).slice(0, 160)}`));

    const unrostered = ROUTES.filter((r) => !ROWS.some((x) => x.name === r.name)).map((r) => r.name);
    expect.soft(unrostered, "routes with no entry in the control-row roster").toEqual([]);

    /* ── group 2 ── */
    let rowsMeasured = 0;
    for (const r of ROWS) {
      const route = ROUTES.find((x) => x.name === r.name);
      if (!route) continue;
      await openRoute(page, route.route, VIEW);
      const visible = await onScreenRoot(page, route.root);
      expect.soft(visible, `${r.name}: the page root never reached the screen`).toBe(true);
      if (!visible) continue;
      const scope = await visiblePage(page, route.root);
      await settle(page);
      const m: RowReading = await page.evaluate(({ scope, rowSel, ctlSel }) => {
        const empty = { rootFound: false, rowFound: false, controls: 0, lines: 0, contentH: 0, tallest: 0, shellRowControls: 0 };
        const root = document.querySelector(scope);
        if (!root) return empty;
        const inFlow = (el: Element) => {
          const b = el.getBoundingClientRect(); const s = getComputedStyle(el);
          return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && parseFloat(s.opacity) > 0.01
            && s.position !== "fixed" && s.position !== "absolute"
            && !el.closest('[role="dialog"], [role="menu"], [role="listbox"]');
        };
        const outermost = (els: Element[]) => els.filter((e) => !els.some((o) => o !== e && o.contains(e)));
        const shellRowControls = [...root.querySelectorAll(".wpg-tools")]
          .reduce((n, t) => n + outermost([...t.querySelectorAll(ctlSel)].filter(inFlow)).length, 0);
        if (!rowSel) return { ...empty, rootFound: true, shellRowControls };
        const row = [...root.querySelectorAll(rowSel)].find((el) => el.getBoundingClientRect().height > 0) as HTMLElement | undefined;
        if (!row) return { ...empty, rootFound: true, shellRowControls };
        const ctl = outermost([...row.querySelectorAll(ctlSel)].filter(inFlow));
        /* ⚠️ CENTRE LINES, NOT TOPS: `align-items: center` gives controls of different heights
           different tops on the SAME line. Items sharing a line share a centre. */
        const mids = ctl.map((e) => { const b = e.getBoundingClientRect(); return b.top + b.height / 2; }).sort((a, b) => a - b);
        let lines = mids.length ? 1 : 0;
        for (let i = 1; i < mids.length; i++) if (mids[i] - mids[i - 1] > 3) lines++;
        const cs = getComputedStyle(row);
        const contentH = row.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const tallest = ctl.reduce((t, e) => Math.max(t, e.getBoundingClientRect().height), 0);
        return { rootFound: true, rowFound: true, controls: ctl.length, lines, contentH: Math.round(contentH), tallest: Math.round(tallest), shellRowControls };
      }, { scope, rowSel: r.row, ctlSel: CONTROLS });

      if (r.row === null) {
        // eslint-disable-next-line no-console
        console.log(`[row] ${r.name.padEnd(20)} declared absent — ${r.why} · controls in a shell row: ${m.shellRowControls}`);
        expect.soft(m.shellRowControls, `${r.name}: a control row has appeared — add it to the census roster (was: ${r.why})`).toBe(0);
        continue;
      }
      if (!m.rowFound) {
        // eslint-disable-next-line no-console
        console.log(`[row] ${r.name.padEnd(20)} ${r.row} NOT FOUND`);
        expect.soft(m.rowFound, `${r.name}: no visible ${r.row} — a row the census cannot find has not passed`).toBe(true);
        continue;
      }
      rowsMeasured++;
      // eslint-disable-next-line no-console
      console.log(`[row] ${r.name.padEnd(20)} ${r.row.padEnd(11)} controls=${m.controls} lines=${m.lines} contentH=${m.contentH} tallest=${m.tallest}`);
      expect.soft(m.controls, `${r.name}: the row holds no controls — nothing was measured`).toBeGreaterThan(0);
      expect.soft(m.lines, `${r.name}: the control row wrapped onto ${m.lines} lines`).toBe(1);
      expect.soft(m.contentH, `${r.name}: the row is taller than one line of its controls — it has wrapped`).toBeLessThanOrEqual(Math.ceil(m.tallest * 1.5));
    }
    const declaredRows = ROWS.filter((r) => r.row !== null).length;
    // eslint-disable-next-line no-console
    console.log(`[row] measured ${rowsMeasured} of ${declaredRows} declared rows`);
    expect.soft(rowsMeasured, "not every declared control row was measured").toBe(declaredRows);

    /* ── group 3 ── */
    let drawersPassed = 0;
    for (const d of DRAWERS) {
      let opened = false;
      try { await d.open(page); opened = true; }
      catch (e) {
        // eslint-disable-next-line no-console
        console.log(`[drawer] ${d.name.padEnd(14)} opener failed: ${String(e).slice(0, 160)}`);
      }
      expect.soft(opened, `${d.name}: the drawer could not be opened — a surface nobody can open has not passed`).toBe(true);
      if (!opened) continue;
      const shown = await page.waitForFunction(drawerOnScreen, d.content, { timeout: 15_000 }).then(() => true).catch(() => false);
      expect.soft(shown, `${d.name}: no drawer holding ${d.content} reached the screen`).toBe(true);
      if (!shown) { if (d.after) await d.after(page); continue; }
      await settle(page);
      const p: DrawerReading = await page.evaluate(({ content, surface, token }) => {
        const slo = [...document.querySelectorAll(".slo")].find((s) => {
          const b = s.getBoundingClientRect();
          return !!s.querySelector(content) && b.width > 0 && b.left < window.innerWidth && b.right > 0;
        }) as HTMLElement;
        const body = slo.querySelector(content) as HTMLElement;
        const laidOut = [body, ...body.querySelectorAll("*")].filter((el) => {
          const disp = getComputedStyle(el).display;
          return disp === "flex" || disp === "inline-flex" || disp === "grid" || disp === "inline-grid";
        }).length;
        const el = surface ? (slo.querySelector(surface) as HTMLElement | null) : null;
        const cs = el ? getComputedStyle(el) : null;
        return {
          width: Math.round(slo.getBoundingClientRect().width),
          laidOut,
          surfaceFound: surface ? !!el : true,
          bgColor: cs ? cs.backgroundColor : "",
          bgImage: cs ? cs.backgroundImage : "",
          tokenValue: token && cs ? cs.getPropertyValue(token).trim() : "",
        };
      }, { content: d.content, surface: d.surface, token: d.token });
      const painted = d.surface === null
        || (p.bgColor !== "" && p.bgColor !== "rgba(0, 0, 0, 0)" && p.bgColor !== "transparent")
        || p.bgImage.includes("gradient");
      // eslint-disable-next-line no-console
      console.log(`[drawer] ${d.name.padEnd(14)} width=${p.width} laidOut=${p.laidOut}` +
        (d.surface ? ` ${d.surface} bg=${p.bgColor} img=${p.bgImage === "none" ? "none" : p.bgImage.slice(0, 24) + "…"}` : " (no surface declared)") +
        (d.token ? ` ${d.token}=${p.tokenValue || "(unresolved)"}` : ""));
      expect.soft(p.width, `${d.name}: the drawer panel has no real width`).toBeGreaterThan(400);
      expect.soft(p.laidOut, `${d.name}: almost nothing inside the drawer is laid out — its rules are not reaching it`).toBeGreaterThanOrEqual(MIN_LAID_OUT);
      if (d.surface) {
        expect.soft(p.surfaceFound, `${d.name}: ${d.surface} is not in the drawer`).toBe(true);
        expect.soft(painted, `${d.name}: ${d.surface} is unpainted (${p.bgColor} / ${p.bgImage}) — a dropped declaration`).toBe(true);
      }
      if (d.token) expect.soft(p.tokenValue, `${d.name}: ${d.token} does not resolve inside the drawer`).not.toBe("");
      if (p.width > 400 && p.laidOut >= MIN_LAID_OUT && p.surfaceFound && painted && (!d.token || p.tokenValue !== "")) drawersPassed++;
      await page.keyboard.press("Escape");
      await page.waitForFunction((c) => ![...document.querySelectorAll(".slo")].some((s) => {
        const b = s.getBoundingClientRect(); return !!s.querySelector(c) && b.width > 0 && b.left < window.innerWidth && b.right > 0;
      }), d.content, { timeout: 8_000 }).catch(() => {});
      if (d.after) await d.after(page);
    }
    // eslint-disable-next-line no-console
    console.log(`[drawer] passed ${drawersPassed} of ${DRAWERS.length} · uncaught page errors: ${pageErrors.length}`);
    expect.soft(drawersPassed, "not every drawer passed").toBe(DRAWERS.length);
    expect.soft(pageErrors, `uncaught page errors:\n${pageErrors.join("\n")}`).toEqual([]);
  });
});
