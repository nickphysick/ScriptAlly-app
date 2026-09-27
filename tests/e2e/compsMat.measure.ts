/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v2 — the conformance locks (S1–S7) and the page locks (C1–C9), measured on the
 * signed-in app against design-refs/materials/comps-v2.html. Probes live in compsMatLib.ts.
 *
 * ⚠️ IT WRITES, SO IT RESTORES: every page lock re-seeds the fixture before it starts (the seeder is
 * delete-before-write), and `afterAll` deletes both fixture manuscripts. A run that cannot restore
 * says so in the language of a failure.
 *
 * ⚠️ THE POPULATION FLOOR IS PER CASE. A case that found nothing to measure has failed, not skipped.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { judge, probeShell } from "./shellV3Lib";
import { openApp, readBar, readTops } from "./pageHeaderV2Lib";
import {
  CompsLedger as Ledger, EMPTY, FILLED, FIXTURE_TITLES, SIZES, on, openComps, pageText, readFrame, readList, readMock,
  restore, scrollPage, seed, waitForOrder,
} from "./compsMatLib";

test.describe.configure({ mode: "default", timeout: Number(process.env.CM_TIMEOUT ?? 900_000) });
/* ⚠️ A LOCK FAILS, IT NEVER HANGS: an action on an absent subject gives up in 10s (C5 waited out its
   whole 15-minute timeout on main before this line existed). */
test.use({ actionTimeout: 10_000 });

test.beforeAll(() => seed());
test.afterAll(() => restore());

const n = (a: number | null | undefined, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const f1 = (x: unknown) => (typeof x === "number" ? x.toFixed(1) : String(x));
const TRANSPARENT = /^rgba\(\d+, \d+, \d+, 0\)$|^transparent$/;

/**
 * Assert a case's ledger at its end — every row, then the floor. ⚠️ ROWS FIRST: with the floor first,
 * a case whose subject was absent reported "population floor" and hid the claims it had recorded red
 * (the first red run against main did exactly that for the frame cases).
 */
function close(L: InstanceType<typeof Ledger>, floor: number) {
  L.write();
  expect(L.failures().map((f) => `${f.lock} · ${f.route} · ${f.size} · ${f.state} — ${f.detail}`)).toEqual([]);
  expect(L.rows.length, `${L.name}: population floor`).toBeGreaterThanOrEqual(floor);
}

/* ══ S1 · the shell as built, on this route, both sidebar states, all three sizes ══ */
for (const vp of SIZES) {
  for (const collapsed of [false, true]) {
    const state = collapsed ? "collapsed" : "expanded";
    test(`S1 · shell · ${vp.width} · ${state}`, async ({ page }) => {
      const L = new Ledger(`comps-S1-${vp.width}-${state}`);
      await openComps(page, FILLED, vp, collapsed);
      const ctx = { route: "/manuscripts/comps", size: `${vp.width}`, state };
      judge(L, await probeShell(page), { ...ctx, route: "Comparable titles" }, collapsed, vp.width === 1280);
      const b = await readBar(page);
      L.check("S1 · pageHeaderV2 §1 bar found", ctx, !!b, "");
      if (b) {
        L.check("S1 · §1 bar is the sidebar's colour", ctx, b.barBg === b.sideBg, `${b.barBg} / ${b.sideBg}`);
        L.check("S1 · §1 bar 64 tall", ctx, n(b.barH, 64, 0.5), `${b.barH}`);
        L.check("S1 · §1 one switcher, in the bar", ctx, b.switchers === 1 && b.inSidebar === 0, `${b.switchers}/${b.inSidebar}`);
        L.check("S1 · §1 no bar item overlaps another", ctx, b.overlaps.length === 0, JSON.stringify(b.overlaps));
      }
      const r = await readFrame(page);
      L.check("S1 · the bar reads MATERIALS above the page name", ctx,
        (r.pnameSection ?? "").toUpperCase() === "MATERIALS" && r.pnameName === "Comparable titles", `${r.pnameSection} / ${r.pnameName}`);
      L.check("S1 · the page was found", ctx, r.found, "");
      /* ⚠️ THE SCROLLER CHILD AND THE PAGE ROOT PAINT NOTHING — the window has dissolved, so a surface
         here is a card the shell does not draw (the mutation: a white background on the child). */
      for (const [k, s] of [["scroller child", r.childSurf], ["page root", r.pageSurf]] as const) {
        L.check(`S1 · the ${k} paints no surface`, ctx,
          !!s && (TRANSPARENT.test(s.bg) || s.bg === r.pageGround) && s.img === "none" && s.shadow === "none",
          JSON.stringify(s));
      }
      close(L, 40);
    });
  }
}

/* ══ S2 · S3 · S5 · S6 — the full header, the panel below its rule, one gutter, no art ══ */
for (const vp of SIZES) {
  for (const collapsed of [false, true]) {
    const state = collapsed ? "collapsed" : "expanded";
    test(`S2/S3/S5/S6 · frame · ${vp.width} · ${state}`, async ({ page, browser }) => {
      const L = new Ledger(`comps-frame-${vp.width}-${state}`);
      /* the two full headers this one must open level with */
      await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* */ } }, ["scriptally:sidebar-collapsed", collapsed ? "1" : "0"]);
      await openApp(page, "/queries", vp); const qc = await readTops(page);
      await openApp(page, "/agents", vp); const cl = await readTops(page);
      const mp = await browser.newPage();
      const mock = { filled: await readMock(mp, vp, "filled"), empty: await readMock(mp, vp, "empty") };
      await mp.close();
      for (const [ms, which] of [[FILLED, "filled"], [EMPTY, "empty"]] as const) {
        await openComps(page, ms, vp, collapsed);
        const r = await readFrame(page);
        const ctx = { route: `/manuscripts/comps (${which})`, size: `${vp.width}`, state };
        const tops = await readTops(page);
        /* S2 */
        L.check("S2 · the full PageHeader renders", ctx, r.headerSize === "full", `${r.headerSize}`);
        L.check("S2 · its top = the Query Centre's (±1)", ctx, n(tops.header, qc.header, 1), `comps ${f1(tops.header)} qc ${f1(qc.header)}`);
        L.check("S2 · its top = the Contact list's (±1)", ctx, n(tops.header, cl.header, 1), `comps ${f1(tops.header)} contact ${f1(cl.header)}`);
        L.check("S2 · title and eyebrow tops = the Query Centre's (±1)", ctx, n(tops.title, qc.title, 1) && n(tops.eyebrow, qc.eyebrow, 1), `title ${f1(tops.title)}/${f1(qc.title)} eyebrow ${f1(tops.eyebrow)}/${f1(qc.eyebrow)}`);
        L.check("S2 · the title is Special Elite, on one line", ctx, /^"?Special Elite"?/.test(r.titleFam ?? "") && r.titleLines === 1, `${r.titleFam} lines ${r.titleLines}`);
        L.check("S2 · the eyebrow is MATERIALS / COMPARABLE TITLES", ctx, (r.eyebrow ?? "").toUpperCase() === "MATERIALS / COMPARABLE TITLES", `${r.eyebrow}`);
        L.check("S2 · the primary reads + Add a comp", ctx, r.primary === "+ Add a comp", `${r.primary}`);
        const lede = which === "filled"
          ? "Books, films and shows like Murphy's Day Out, and why. 5 on your list, 2 named in your query letter."
          : "Books, films and shows like Murphy's Day Out, with a line on why each compares. The ones you switch on build your query line.";
        L.check("S2 · the intro is the mock's, the name in .ph-ms", ctx, r.intro === lede && r.introMs === "Murphy's Day Out", `${JSON.stringify(r.intro)} ms ${r.introMs}`);
        if (which === "filled") L.check("S2 · the counts are <strong>", ctx, JSON.stringify(r.introStrong) === JSON.stringify(["5", "2"]), JSON.stringify(r.introStrong));
        /* S3 */
        L.check("S3 · the panel starts at the rule + 24 (±1)", ctx, !!r.rail && n(r.rail.t, r.rule + 24, 1), `rail ${f1(r.rail?.t)} rule ${f1(r.rule)}`);
        L.check("S3 · the main column's first box starts at the rule + 24 (±1)", ctx, !!r.first && n(r.first.t, r.rule + 24, 1), `first ${f1(r.first?.t)} rule ${f1(r.rule)}`);
        L.check("S3 · the panel is 340 wide (±1)", ctx, !!r.rail && n(r.rail.w, 340, 1), `${f1(r.rail?.w)}`);
        L.check("S3 · a 28 gap between the column and the panel (±1)", ctx, !!r.rail && !!r.main && n(r.rail.l - r.main.r, 28, 1), `${f1(r.rail && r.main ? r.rail.l - r.main.r : NaN)}`);
        L.check("S3 · the panel's right is the header's right (±1)", ctx, !!r.rail && !!r.header && n(r.rail.r, r.header.r, 1), `${f1(r.rail?.r)} ${f1(r.header?.r)}`);
        /* S5 */
        L.check("S5 · the scroller child pays the gutter, inline, on both sides", ctx, n(r.childPadL, r.gutter, 0.6) && n(r.childPadR, r.gutter, 0.6), `pad ${f1(r.childPadL)}/${f1(r.childPadR)} gutter ${f1(r.gutter)}`);
        L.check("S5 · the header's left = the child's left + the gutter (±1)", ctx, !!r.header && !!r.child && n(r.header.l, r.child.l + r.gutter, 1), `hd ${f1(r.header?.l)} child ${f1(r.child?.l)}`);
        L.check("S5 · the column's left = the header's left (±1)", ctx, !!r.main && !!r.header && n(r.main.l, r.header.l, 1), `main ${f1(r.main?.l)} hd ${f1(r.header?.l)}`);
        /* S6 — no art yet (D6): no art slot is reserved */
        L.check("S6 · no art slot (WITHOUT_ART)", ctx, !r.hasArt, "");
        /* against the mock, by the same ruler (vertical numbers relative to the bar) */
        const m = mock[which];
        L.check("mock · the mock rendered with its fonts", ctx, m.fonts, "");
        const barB = await page.evaluate(() => ([...document.querySelectorAll('[data-probe="navrow"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement).getBoundingClientRect().bottom);
        if (r.header && m.header) L.check("mock · header height ±2", ctx, n(r.header.h, m.header.h, 2), `app ${f1(r.header.h)} mock ${f1(m.header.h)}`);
        if (r.rail && m.rail) L.check("mock · panel top (bar-relative) ±2", ctx, n(r.rail.t - barB, m.rail.t, 2), `app ${f1(r.rail.t - barB)} mock ${f1(m.rail.t)}`);
        console.log(`GEOM ${which} ${vp.width} ${state} ${JSON.stringify({
          app: { header: r.header && { l: r.header.l, t: r.header.t - barB, w: r.header.w, h: r.header.h }, main: r.main && { l: r.main.l, w: r.main.w }, first: r.first && { t: r.first.t - barB }, rail: r.rail && { l: r.rail.l, t: r.rail.t - barB, w: r.rail.w, h: r.rail.h } },
          mock: { header: m.header && { l: m.header.l, t: m.header.t, w: m.header.w, h: m.header.h }, main: m.main && { l: m.main.l, w: m.main.w }, first: m.first && { t: m.first.t }, rail: m.rail && { l: m.rail.l, t: m.rail.t, w: m.rail.w, h: m.rail.h } },
        })}`);
      }
      close(L, 30);
    });
  }
}

/* ══ S4 · the panel is sticky inside the scroller, never fixed ══ */
for (const vp of SIZES) {
  test(`S4 · sticky panel · ${vp.width}`, async ({ page }) => {
    const L = new Ledger(`comps-S4-${vp.width}`);
    const ctx = { route: "/manuscripts/comps", size: `${vp.width}`, state: "scrolled 600" };
    await openComps(page, FILLED, vp);
    const rest = await readFrame(page);
    const did = await scrollPage(page, 600);
    const r = await readFrame(page);
    L.check("S4 · precondition: the page scrolled 600", ctx, did >= 600, `scrollTop ${did}`);
    L.check("S4 · the panel's top = the window's top + 16 (±1)", ctx, !!r.rail && n(r.rail.t, r.scrollerTop + 16, 1), `rail ${f1(r.rail?.t)} window ${f1(r.scrollerTop)}`);
    L.check("S4 · it is sticky, not fixed", ctx, r.railPos === "sticky", `${r.railPos}`);
    L.check("S4 · it stayed in its column", ctx, !!rest.rail && !!r.rail && n(r.rail.l, rest.rail.l, 0.5), `${f1(rest.rail?.l)} → ${f1(r.rail?.l)}`);
    L.check("S4 · stuck, it ends above the fold", ctx, !!r.rail && r.rail.b <= vp.height - 15, `${f1(r.rail?.b)} / ${vp.height}`);
    close(L, 5);
  });
}

/* ══ S7 · no shell edits: the run's diff, and the page's own sheet ══ */
test("S7 · the run touches no G4 file, and the page's sheet names no shell selector", async () => {
  const L = new Ledger("comps-S7");
  const ctx = { route: "repo", size: "-", state: "-" };
  const G4 = [
    "WorkspaceShell.tsx", "workspaceShell.css", "AppShell.tsx", "BarSwitcher.tsx", "SidebarNav.tsx", "ShellSidebar.tsx",
    "ShellV2.tsx", "TopNavShell.tsx", "TopNavHost.tsx", "PageHeader.tsx", "pageHeader.css", "WorkspacePageGrid.tsx",
    "workspacePageGrid.css", "contentColumn.css", "f12.css", "lib/workspaceShell.ts", "lib/workspaceNav.ts",
    "QcRail.tsx", "ContactRail.tsx",
  ];
  const changed = execFileSync("git", ["diff", "--name-only", "770881f4"], { encoding: "utf8" }).split("\n").filter(Boolean);
  const hit = changed.filter((f) => G4.some((g) => f.endsWith(`/${g}`) || f.endsWith(g)));
  L.check("S7 · no G4 file changed since 770881f", ctx, hit.length === 0, JSON.stringify(hit));
  let css = "";
  try { css = readFileSync("src/components/manuscripts/compsV2.css", "utf8"); } catch { /* absent on main */ }
  L.check("S7 · the page's sheet exists", ctx, css.length > 0, "");
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const shellSel = decls.match(/(^|[\s,}>+~])\.(ws-[\w-]+|ph(?:-[\w-]+|--[\w-]+)?|wpg(?:-[\w-]+)?)(?=[\s,{.:>[])/gm) ?? [];
  L.check("S7 · the page's sheet restyles no shell or header selector", ctx, shellSel.length === 0, JSON.stringify(shellSel));
  close(L, 3);
});

/* ── helpers for the page locks ── */
async function freshFilled(page: Page, vp = { width: 1440, height: 900 }) {
  seed();
  await openComps(page, FILLED, vp);
  await waitForOrder(page, FIXTURE_TITLES);
}
const grip = (page: Page, i: number) => on(page, `[data-cpv="list"] [data-cpv="comp"]:nth-child(${i + 1}) [data-cpv="grip"]`);
const card = (page: Page, title: string) => on(page, `[data-cpv="list"] [data-cpv="comp"][data-title="${title}"]`);

/* ══ C1 · the line follows the switches, in list order ══ */
test("C1 · line", async ({ page }) => {
  const L = new Ledger("comps-C1");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  await freshFilled(page);
  let r = await readList(page);
  L.check("C1 · readers-of line from the two switched on, in list order", ctx,
    r?.line === "Murphy's Day Out will appeal to readers of The Tidewater Line and Salt Road." && r?.lineKind === "line", `${r?.line}`);
  L.check("C1 · titles italic", ctx, JSON.stringify(r?.lineItalics) === JSON.stringify(["Murphy's Day Out", "The Tidewater Line", "Salt Road"]), JSON.stringify(r?.lineItalics));
  L.check("C1 · caption", ctx, r?.cap === "Built from 2 comps switched on below, in list order", `${r?.cap}`);
  L.check("C1 · ordinals 1st and 2nd", ctx, r?.cards[0]?.pos === "1st" && r?.cards[1]?.pos === "2nd" && r?.cards[2]?.pos === null, JSON.stringify(r?.cards.map((c) => c.pos)));
  /* reorder: Salt Road above The Tidewater Line */
  await grip(page, 0).focus();
  await page.keyboard.press("Alt+ArrowDown");
  await waitForOrder(page, ["Salt Road", "The Tidewater Line", ...FIXTURE_TITLES.slice(2)]);
  r = await readList(page);
  L.check("C1 · reordering changes the line", ctx, r?.line === "Murphy's Day Out will appeal to readers of Salt Road and The Tidewater Line.", `${r?.line}`);
  /* A meets B */
  await on(page, '[data-fmt="meets"]').click();
  r = await readList(page);
  L.check("C1 · A meets B with two on", ctx, r?.line === "Salt Road meets The Tidewater Line.", `${r?.line}`);
  await card(page, "Nine Miles Out").locator('[data-cpv="inq"]').click();
  await expect.poll(async () => (await readList(page))?.lineKind, { timeout: 8000 }).toBe("unavailable");
  r = await readList(page);
  L.check("C1 · ≠2 on shows the unavailable copy", ctx, r?.line === "“A meets B” takes exactly two comps. 3 are switched on.", `${r?.line}`);
  L.check("C1 · …and disables Copy", ctx, r?.copyDisabled === true, `${r?.copyDisabled}`);
  await card(page, "Nine Miles Out").locator('[data-cpv="inq"]').click();
  await card(page, "Salt Road").locator('[data-cpv="inq"]').click();
  await expect.poll(async () => (await readList(page))?.lineKind, { timeout: 8000 }).toBe("unavailable");
  r = await readList(page);
  L.check("C1 · one on reads 'is'", ctx, r?.line === "“A meets B” takes exactly two comps. 1 is switched on.", `${r?.line}`);
  await on(page, '[data-fmt="readers"]').click();
  await card(page, "The Tidewater Line").locator('[data-cpv="inq"]').click();
  await expect.poll(async () => (await readList(page))?.lineKind, { timeout: 8000 }).toBe("empty");
  r = await readList(page);
  L.check("C1 · none on: the empty copy, Copy disabled", ctx, r?.line === "Switch on In query letter for a comp to start your line." && r?.copyDisabled === true, `${r?.line} ${r?.copyDisabled}`);
  close(L, 10);
});

/* ══ C2 · the order is the array, and it survives a reload ══ */
test("C2 · order persists", async ({ page }) => {
  const L = new Ledger("comps-C2");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  await freshFilled(page);
  await grip(page, 0).focus();
  await page.keyboard.press("Alt+ArrowDown");
  const want1 = ["Salt Road", "The Tidewater Line", ...FIXTURE_TITLES.slice(2)];
  await waitForOrder(page, want1).catch(() => {});
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForTimeout(2500);
  L.check("C2 · Alt+↓ survives a reload", ctx, JSON.stringify((await readList(page))?.cards.map((c) => c.title)) === JSON.stringify(want1), JSON.stringify((await readList(page))?.cards.map((c) => c.title)));
  /* pointer drag: the last card's grip to above the first card */
  const g = grip(page, 4);
  const first = on(page, '[data-cpv="list"] [data-cpv="comp"]').first();
  const gb = await g.boundingBox(); const fb = await first.boundingBox();
  if (gb && fb) {
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.mouse.down();
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2 - 2, { steps: 2 });
    const mid = await page.evaluate(() => getComputedStyle(document.body).userSelect);
    L.check("C2 · no text selection while dragging", ctx, mid === "none", mid);
    await page.mouse.move(fb.x + 40, fb.y + 6, { steps: 12 });
    await page.mouse.up();
  }
  const want2 = ["Kestrel Hour", ...want1.slice(0, 4)];
  await waitForOrder(page, want2).catch(() => {});
  await page.waitForTimeout(1500);
  await page.reload();
  await page.waitForTimeout(2500);
  L.check("C2 · a pointer drag survives a reload", ctx, JSON.stringify((await readList(page))?.cards.map((c) => c.title)) === JSON.stringify(want2), JSON.stringify((await readList(page))?.cards.map((c) => c.title)));
  const stored = JSON.parse(execFileSync("node", ["tests/e2e/seedCompsFixture.mjs", "--dump", FILLED], { encoding: "utf8" }).trim().split("\n").pop() ?? "[]");
  L.check("C2 · the stored array is in that order", ctx, JSON.stringify(stored.map((c: { title: string }) => c.title)) === JSON.stringify(want2), JSON.stringify(stored.map((c: { title: string }) => c.title)));
  close(L, 4);
});

/* ══ C3 · the form: required title, four-digit year, tags, duplicates ══ */
test("C3 · form", async ({ page }) => {
  const L = new Ledger("comps-C3");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  await freshFilled(page);
  await on(page, '[data-cpv="add"]').click();
  const f = on(page, '[data-cpv="form"]');
  L.check("C3 · the add button opens the form", ctx, (await f.count()) === 1, "");
  await on(page, '[data-cpv="save"]').click();
  L.check("C3 · no title: the inline error", ctx, (await on(page, '[data-cpv="err-title"]').textContent().catch(() => null)) === "Add a title to save this comp.", "");
  await page.locator("#cpv-f-title:visible").fill("Harbour Lights");
  await page.locator("#cpv-f-year:visible").fill("20");
  await on(page, '[data-cpv="save"]').click();
  L.check("C3 · a bad year: the inline error", ctx, (await on(page, '[data-cpv="err-year"]').textContent().catch(() => null)) === "Use four digits, like 2021.", "");
  await page.locator("#cpv-f-year:visible").fill("2020");
  const tag = page.locator("#cpv-f-tag:visible");
  await tag.fill("harbour town"); await tag.press("Enter");
  await tag.fill("tides"); await tag.press(",");
  await tag.fill("oops"); await tag.press("Enter");
  await tag.press("Backspace");
  const chips = await on(page, '[data-cpv="form"] [data-cpv="tag"]').allTextContents();
  L.check("C3 · Enter and comma add a tag, Backspace on empty removes the last", ctx, JSON.stringify(chips.map((c) => c.replace("×", "").trim())) === JSON.stringify(["harbour town", "tides"]), JSON.stringify(chips));
  await on(page, '[data-cpv="save"]').click();
  await card(page, "Harbour Lights").waitFor({ timeout: 10_000 }).catch(() => {});
  let stored = JSON.parse(execFileSync("node", ["tests/e2e/seedCompsFixture.mjs", "--dump", FILLED], { encoding: "utf8" }).trim().split("\n").pop() ?? "[]");
  const hl = stored.find((c: { title: string }) => c.title === "Harbour Lights");
  L.check("C3 · tags are stored as 'a · b'", ctx, hl?.matchAxis === "harbour town · tides" && hl?.year === 2020, JSON.stringify(hl));
  const toast = await page.locator(".sa-toast").last().textContent().catch(() => null);
  L.check("C3 · the toast reads Added {title}. with Undo", ctx, !!toast && toast.includes("Added Harbour Lights.") && /UNDO/.test(toast), `${toast}`);
  /* duplicate, case-insensitive */
  await on(page, '[data-cpv="add"]').click();
  await page.locator("#cpv-f-title:visible").fill("salt road");
  await on(page, '[data-cpv="save"]').click();
  const dupe = await on(page, '[data-cpv="dupe"]').textContent().catch(() => null);
  L.check("C3 · a duplicate title asks first", ctx, !!dupe && dupe.includes("Salt Road is already on your list."), `${dupe}`);
  stored = JSON.parse(execFileSync("node", ["tests/e2e/seedCompsFixture.mjs", "--dump", FILLED], { encoding: "utf8" }).trim().split("\n").pop() ?? "[]");
  L.check("C3 · …and nothing was written", ctx, stored.filter((c: { title: string }) => c.title.toLowerCase() === "salt road").length === 1, `${stored.length}`);
  await on(page, '[data-cpv="dupe"] button:has-text("Add anyway")').click();
  await expect.poll(async () => (await readList(page))?.cards.filter((c) => (c.title ?? "").toLowerCase() === "salt road").length, { timeout: 10_000 }).toBe(2).catch(() => {});
  L.check("C3 · Add anyway adds it", ctx, ((await readList(page))?.cards.filter((c) => (c.title ?? "").toLowerCase() === "salt road").length ?? 0) === 2, "");
  close(L, 8);
});

/* ══ C4 · Remove then Undo restores the same comp at the same index ══ */
test("C4 · undo", async ({ page }) => {
  const L = new Ledger("comps-C4");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  await freshFilled(page);
  await card(page, "Nine Miles Out").locator('[data-cpv="remove"]').click();
  await waitForOrder(page, FIXTURE_TITLES.filter((t) => t !== "Nine Miles Out")).catch(() => {});
  const toast = await page.locator(".sa-toast").last().textContent().catch(() => null);
  L.check("C4 · the toast reads Removed {title}.", ctx, !!toast && toast.includes("Removed Nine Miles Out."), `${toast}`);
  await page.locator(".sa-toast-undo").last().click();
  await waitForOrder(page, FIXTURE_TITLES).catch(() => {});
  const r = await readList(page);
  L.check("C4 · Undo restores it at index 2", ctx, JSON.stringify(r?.cards.map((c) => c.title)) === JSON.stringify(FIXTURE_TITLES), JSON.stringify(r?.cards.map((c) => c.title)));
  const stored = JSON.parse(execFileSync("node", ["tests/e2e/seedCompsFixture.mjs", "--dump", FILLED], { encoding: "utf8" }).trim().split("\n").pop() ?? "[]");
  L.check("C4 · …with every field it had", ctx, stored[2]?.title === "Nine Miles Out" && stored[2]?.media === "tv" && stored[2]?.matchAxis === "ticking clock · tides" && stored[2]?.year === 2022, JSON.stringify(stored[2]));
  close(L, 3);
});

/* ══ C5 · the Scout is inert: no call, no enabled control ══ */
test("C5 · scout inert", async ({ page }) => {
  const L = new Ledger("comps-C5");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  const calls: string[] = [];
  page.on("request", (q) => { if (/suggestComps/i.test(q.url())) calls.push(q.url()); });
  seed();
  await openComps(page, FILLED, { width: 1440, height: 900 });
  const rail = on(page, '[data-cpv="rail"]');
  L.check("C5 · the rail renders", ctx, (await rail.count()) === 1, "");
  const r = await page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-cpv="rail"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!el) return null;
    const controls = [...el.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")].filter((c) => !(c as HTMLButtonElement).disabled && c.getAttribute("tabindex") !== "-1");
    const ex = el.querySelector('[data-cpv="rail-examples"]') as HTMLElement | null;
    return {
      controls: controls.map((c) => c.outerHTML.slice(0, 80)),
      title: el.querySelector("h2, h3")?.textContent?.trim() ?? null,
      soon: el.querySelector('[data-cpv="soon"]')?.textContent?.trim() ?? null,
      exHidden: ex?.getAttribute("aria-hidden") === "true", exPE: ex ? getComputedStyle(ex).pointerEvents : null,
      exCards: ex?.querySelectorAll('[data-cpv="sug"]').length ?? 0,
      scoutPanel: !!document.querySelector(".ct-sbody, .ct-upsell"),
      text: el.innerText,
    };
  });
  L.check("C5 · The Scout, Coming soon", ctx, r?.title === "The Scout" && /coming soon/i.test(r?.soon ?? ""), `${r?.title} / ${r?.soon}`);
  L.check("C5 · no enabled control in the rail", ctx, !!r && r.controls.length === 0, JSON.stringify(r?.controls));
  L.check("C5 · two example suggestions, aria-hidden and inert", ctx, !!r && r.exHidden && r.exPE === "none" && r.exCards === 2, JSON.stringify(r && { h: r.exHidden, pe: r.exPE, n: r.exCards }));
  L.check("C5 · ScoutPanel is not mounted", ctx, !!r && !r.scoutPanel, "");
  /* press around the rail: its tray, its examples, its body */
  /* ⚠️ BOUNDED: an absent rail must make this case FAIL, not hang for the test timeout (it did, on main) */
  for (const sel of ['[data-cpv="tray"]', '[data-cpv="rail-examples"]', '[data-cpv="rail"]']) await on(page, sel).first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(800);
  L.check("C5 · no request to suggestComps from this route", ctx, calls.length === 0, JSON.stringify(calls));
  close(L, 5);
});

/* ══ C6 · no appraisal; age is a plain fact ══ */
test("C6 · no appraisal", async ({ page }) => {
  const L = new Ledger("comps-C6");
  const now = new Date().getFullYear();
  for (const ms of [FILLED, EMPTY]) {
    const ctx = { route: "/manuscripts/comps", size: "1440", state: ms === FILLED ? "filled" : "empty" };
    seed();
    await openComps(page, ms, { width: 1440, height: 900 });
    const text = await pageText(page);
    L.check("C6 · the page has text", ctx, text.length > 200, `${text.length}`);
    /* ⚠️ NOT "only": the mock's own form hint reads "Only the title is needed", which states a
       requirement rather than appraising anything. */
    const hit = text.match(/\b(dated|outdated|old|older|stale|too old|good|great|strong|weak|poor|bad|fresh|current|relevant|should|must|already|still|just|finally|recent enough)\b/i);
    L.check("C6 · no appraisal word", ctx, !hit, `${hit?.[0]} in …${hit ? text.slice(Math.max(0, (hit.index ?? 0) - 40), (hit.index ?? 0) + 40) : ""}…`);
    if (ms === FILLED) {
      const r = await readList(page);
      const want = [2021, 2023, 2022, 2024, 2019].map((y) => { const d = now - y; return `${y} · ${d <= 0 ? "this year" : d === 1 ? "1 year ago" : `${d} years ago`}`; });
      L.check("C6 · age reads '{year} · {n} years ago'", ctx, JSON.stringify(r?.cards.map((c) => c.age)) === JSON.stringify(want), JSON.stringify(r?.cards.map((c) => c.age)));
      L.check("C6 · the library fact counts, and judges nothing", ctx, r?.libFact === `${[2021, 2023, 2024, 2019].filter((y) => now - y <= 5).length} of 4 books published in the last five years · 1 film or TV`, `${r?.libFact}`);
    }
  }
  close(L, 6);
});

/* ══ C7 · the empty state ══ */
test("C7 · empty", async ({ page }) => {
  const L = new Ledger("comps-C7");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "empty" };
  seed();
  await openComps(page, EMPTY, { width: 1440, height: 900 });
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-cpv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const main = root?.querySelector('[data-cpv="main"]');
    const order = main ? [...main.querySelectorAll('[data-cpv="form"], [data-cpv="how"], [data-cpv="ex-line"], [data-cpv="ex-comps"]')].map((e) => e.getAttribute("data-cpv")) : [];
    const ex = main ? [...main.querySelectorAll('[data-cpv="ex-line"], [data-cpv="ex-comps"]')] as HTMLElement[] : [];
    return {
      order,
      focused: (document.activeElement as HTMLElement | null)?.id ?? null,
      exHidden: ex.length > 0 && ex.every((e) => e.getAttribute("aria-hidden") === "true" || !!e.querySelector('[aria-hidden="true"]')),
      exInert: ex.length > 0 && ex.every((e) => { const g = e.querySelector(".cpv-ghost") ?? e; return getComputedStyle(g).pointerEvents === "none"; }),
      exTags: main ? main.querySelectorAll('[data-cpv="ex-comps"] [data-cpv="ex-tag"]').length : 0,
      exLineCap: main?.querySelector('[data-cpv="ex-line"] .cpv-qcap')?.textContent?.trim() ?? null,
      exControls: ex.flatMap((e) => [...e.querySelectorAll("button, a[href], input")].filter((c) => !(c as HTMLButtonElement).disabled && !c.closest('[inert]'))).length,
      exCards: main?.querySelectorAll('[data-cpv="ex-comps"] [data-cpv="comp"]').length ?? 0,
      oldBlocks: !!document.querySelector(".ct-stages, .ct-feature"),
    };
  });
  L.check("C7 · order: form, how it works, example line, example comps", ctx, JSON.stringify(r.order) === JSON.stringify(["form", "how", "ex-line", "ex-comps"]), JSON.stringify(r.order));
  L.check("C7 · the form is open with the title focused", ctx, r.focused === "cpv-f-title", `${r.focused}`);
  L.check("C7 · examples are aria-hidden and inert", ctx, r.exHidden && r.exInert && r.exControls === 0, JSON.stringify(r));
  /* the mock's marking: an Example tag on the example comps, and the example line's caption */
  L.check("C7 · examples are marked Example", ctx, r.exTags === 1 && /^Example · /.test(r.exLineCap ?? ""), `tags ${r.exTags} cap ${r.exLineCap}`);
  L.check("C7 · two example comp cards", ctx, r.exCards === 2, `${r.exCards}`);
  L.check("C7 · the old StagesBlock / FeatureBlock are gone", ctx, !r.oldBlocks, "");
  await page.locator("#cpv-f-title:visible").fill("First Light");
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await readList(page))?.cards.map((c) => c.title), { timeout: 10_000 }).toEqual(["First Light"]).catch(() => {});
  const after = await readFrame(page);
  const list = await readList(page);
  L.check("C7 · the first save flips to filled", ctx, JSON.stringify(list?.cards.map((c) => c.title)) === JSON.stringify(["First Light"]) && (after.intro ?? "").includes("1 on your list"), `${JSON.stringify(list?.cards.map((c) => c.title))} ${after.intro}`);
  const flashed = await on(page, '[data-cpv="comp"][data-title="First Light"]').getAttribute("class").catch(() => null);
  L.check("C7 · …with the new card flashed", ctx, /\bflash\b/.test(flashed ?? ""), `${flashed}`);
  close(L, 8);
});

/* ══ C8 · keys ══ */
test("C8 · keys", async ({ page }) => {
  const L = new Ledger("comps-C8");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  await freshFilled(page);
  await page.locator("body").click({ position: { x: 5, y: 300 } }).catch(() => {});
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.keyboard.press("n");
  L.check("C8 · N opens the form", ctx, (await on(page, '[data-cpv="form"]').count()) === 1, "");
  L.check("C8 · …with the title focused", ctx, (await readList(page))?.focused === "cpv-f-title", `${(await readList(page))?.focused}`);
  await page.keyboard.type("nnn");
  L.check("C8 · N inside a field types, and opens nothing", ctx, (await page.locator("#cpv-f-title:visible").inputValue()) === "nnn" && (await on(page, '[data-cpv="form"]').count()) === 1, "");
  await page.keyboard.press("Escape");
  L.check("C8 · Esc cancels", ctx, (await on(page, '[data-cpv="form"]').count()) === 0, "");
  L.check("C8 · …and focus returns to what opened it", ctx, await page.evaluate(() => document.activeElement?.getAttribute("data-cpv") === "add"), `${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))}`);
  /* Edit returns focus to its own Edit button */
  await card(page, "Salt Road").locator('[data-cpv="edit"]').click();
  await page.keyboard.press("Escape");
  L.check("C8 · Esc from Edit returns focus to that Edit", ctx, await page.evaluate(() => { const a = document.activeElement; return a?.getAttribute("data-cpv") === "edit" && a.closest('[data-cpv="comp"]')?.getAttribute("data-title") === "Salt Road"; }), "");
  close(L, 6);
});

/* ══ C9 · a save that fails reverts and says so ══ */
test("C9 · save failure", async ({ page }) => {
  const L = new Ledger("comps-C9");
  const ctx = { route: "/manuscripts/comps", size: "1440", state: "filled" };
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await freshFilled(page);
  /* ⚠️ A REAL REJECTION, NOT A HOOK: Firestore's backend refuses a document over 1 MiB, so a 1.1 MB
     note is a write the server denies with no test seam in the product. */
  await card(page, "Bright Water").locator('[data-cpv="add-note"]').click();
  L.check("C9 · Add a note opens the edit form, note focused", ctx, (await readList(page))?.focused === "cpv-f-note", `${(await readList(page))?.focused}`);
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("#cpv-f-note")].find((e) => e.getBoundingClientRect().height > 0) as HTMLTextAreaElement;
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
    set.call(t, "x".repeat(1_150_000));
    t.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await on(page, '[data-cpv="save"]').click();
  const fail = page.locator(".sa-toast", { hasText: "Couldn't save that change. Check your connection and try again." });
  const shown = await fail.first().waitFor({ timeout: 25_000 }).then(() => true).catch(() => false);
  L.check("C9 · the failure toast shows", ctx, shown, "");
  await page.waitForTimeout(1500);
  const r = await readList(page);
  const bw = r?.cards.find((c) => c.title === "Bright Water");
  L.check("C9 · the change is reverted on the page", ctx, !!bw && bw.addNote && (bw.note ?? "").length < 200, `${(bw?.note ?? "").length} chars`);
  L.check("C9 · no unhandled rejection", ctx, errors.length === 0, JSON.stringify(errors.slice(0, 3)));
  close(L, 4);
});
