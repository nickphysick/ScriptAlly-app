/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages — the broadsheet layout, driven.
 * ⚠️ Every selector scoped inside `.pkg-root`; workspace pages stay mounted and toggle `display`.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";
const OUT = "reports/pkg-broadsheet"; const ART = "run-artifacts/pkg-broadsheet";
mkdirSync(OUT, { recursive: true }); mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";

/** The hero, measured. */
export const HERO = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const cs = (el, p) => el ? getComputedStyle(el).getPropertyValue(p).trim() : null;
  const box = (s) => { const el = root.querySelector(s); if (!el) return null;
    const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
  const hero = root.querySelector(".pkgb-hero");
  const ph = root.querySelector(".wsh");
  const body = root.querySelector(".pkgw-body") || root.querySelector(".pkgo-grid");
  return {
    heroPresent: !!hero,
    /* the shared PageHeader must still be here — this page CONFORMS (F-E) */
    pageHeaderPresent: !!ph,
    pageHeaderTitle: (root.querySelector(".wsh-title")?.textContent || "").trim(),
    pageHeaderBox: (() => { if (!ph) return null; const b = ph.getBoundingClientRect();
      return { x: Math.round(b.x), w: Math.round(b.width) }; })(),
    /* one Pro marker, not two */
    waxInHeader: !!root.querySelector(".wsh .pkgb-wax"),
    proPillPresent: !!root.querySelector(".pkgw-propill"),
    bandHasTitle: !!root.querySelector(".pkgb-hero h1"),
    controlRowPresent: !!root.querySelector(".wpg-tools"),
    hero: box(".pkgb-hero"),
    body: body ? { x: Math.round(body.getBoundingClientRect().x), w: Math.round(body.getBoundingClientRect().width) } : null,
    topBorder: cs(hero, "border-top-width"),
    topColor: cs(hero, "border-top-color"),
    cols: cs(hero, "grid-template-columns"),
    title: (root.querySelector(".pkgb-hero-l h1")?.textContent || "").trim(),
    titleLH: cs(root.querySelector(".pkgb-hero-l h1"), "line-height"),
    wax: !!root.querySelector(".pkgb-wax"),
    waxBox: box(".pkgb-wax"),
    statline: (root.querySelector(".pkgb-statline")?.textContent || "").trim(),
    prob: (root.querySelector(".pkgb-prob")?.textContent || "").trim(),
    heroSlot: (root.querySelector(".pkgb-hero-r .pkgb-plate")?.textContent || "").trim(),
    heroSlotBox: box(".pkgb-hero-r .pkgb-plate"),
    actions: Array.from(root.querySelectorAll(".pkgb-hero-actions button")).map((b) => ({
      label: (b.textContent || "").trim().slice(0, 30),
      bg: getComputedStyle(b).backgroundColor,
      disabled: b.disabled,
    })),
    /* the old shared header must be gone from this page */
    controlRow: !!root.querySelector(".wpg-tools"),
    /* ⚠️ THE SERIF-CLIP CHECK, WITH A SUB-PIXEL TOLERANCE — and the tolerance is the finding, not a
       loosening. Playfair at 38px with line-height 1.3 gives a 49.4px line box in a 49px content
       box, so a bare scrollHeight > clientHeight reports "clipped" on text that is not: overflow is
       visible, and the descender in "packages" paints in full (confirmed in the screenshot). The
       house serifClip measure uses a ratio for exactly this reason. 2px is rounding; more is real. */
    titleOverflowPx: (() => { const h = root.querySelector(".pkgb-hero-l h1");
      return h ? h.scrollHeight - h.clientHeight : null; })(),
    titleClipped: (() => { const h = root.querySelector(".pkgb-hero-l h1");
      return h ? (h.scrollHeight - h.clientHeight) > 2 : null; })(),
  };
})()`;

test("phase 1 — the hero", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(HERO);
  await page.screenshot({ path: `${OUT}/p1-hero-1440.png`, fullPage: true });
  writeFileSync(`${ART}/p1-hero.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

test("recon — the page after the header session's rework", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r = await page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    if (!root) return { error: "no .pkg-root" };
    const box = (s) => { const el = root.querySelector(s); if (!el) return null;
      const b = el.getBoundingClientRect(); return { x: Math.round(b.x), w: Math.round(b.width) }; };
    return {
      masthead: box(".wsh") || box(".wsh-wrap"),
      scroller: box(".wpg-scroll"),
      controlRow: box(".wpg-tools") || box("[class*=wpg-control]"),
      railPresent: !!root.querySelector(".pkgo-rail"),
      railPanels: Array.from(root.querySelectorAll(".pkgo-rail .pkgo-lbl")).map((l) => (l.textContent||"").trim()),
      tiles: root.querySelectorAll(".pkgf-tile:not(.pkgf-tile--ghost)").length,
      dashboard: !!root.querySelector(".pkgf-statstrip"),
      classesOnScrollChildren: Array.from(root.querySelector(".wpg-scroll")?.children ?? [])
        .map((c) => c.className?.toString().slice(0, 40)),
    };
  })()`);
  await page.screenshot({ path: `${OUT}/recon-1440.png`, fullPage: true });
  writeFileSync(`${ART}/recon.txt`, JSON.stringify(r, null, 2) + "\n");
  console.log(JSON.stringify(r, null, 2));
});

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`phase 1b — conformed header + band at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r = await page.evaluate(HERO);
    await page.screenshot({ path: `${OUT}/p1b-${vp.w}.png`, fullPage: true });
    writeFileSync(`${ART}/p1b-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
  });
}

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE 2 — THE MATERIALS BAND
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ THE POPULATION FLOOR COMES FIRST. A band that rendered nothing would satisfy every "no column
 * is wider than its third" and "no sheet overflows" check by having nothing to measure — the
 * vacuous-pass family that has caught this repo through an off-screen `elementsFromPoint`, an
 * empty `sliceBetween` and a zero-box overlap scan. `cols` is asserted at 3 before anything else.
 */
export const BAND = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const band = root.querySelector(".pkgb-band");
  const grid = root.querySelector(".pkgb-matcols");
  const cols = Array.from(root.querySelectorAll(".pkgb-matcol"));
  const rect = (el) => { const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
  return {
    bandHead: (root.querySelector(".pkgb-bandhead h2")?.textContent || "").trim(),
    bandTag: (root.querySelector(".pkgb-bandhead .pkgb-tag")?.textContent || "").trim(),
    bandBox: band ? rect(band) : null,
    gridTemplate: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    railPanels: Array.from(root.querySelectorAll(".pkgo-rail .pkgo-lbl")).map((l) => (l.textContent||"").trim()),
    colCount: cols.length,
    columns: cols.map((c) => ({
      heading: (c.querySelector(".pkgb-eyebrow")?.textContent || "").trim(),
      held: (c.querySelector(".pkgb-matcolhead .pkgb-statline")?.textContent || "").trim(),
      slot: (c.querySelector(".pkgb-matcolhead .pkgb-plate")?.getAttribute("data-slot") || ""),
      slotBox: c.querySelector(".pkgb-matcolhead .pkgb-plate") ? rect(c.querySelector(".pkgb-matcolhead .pkgb-plate")) : null,
      addLabel: (c.querySelector(".pkgb-add")?.textContent || "").trim(),
      ghost: (c.querySelector(".pkgb-ghost")?.textContent || "").trim(),
      box: rect(c),
      sheets: Array.from(c.querySelectorAll(".pkgb-sheet")).map((s) => ({
        type: (s.querySelector(".pkgb-stype")?.textContent || "").trim(),
        name: (s.querySelector(".pkgb-sname")?.textContent || "").trim(),
        src: (s.querySelector(".pkgb-ssrc")?.textContent || "").trim(),
        use: (s.querySelector(".pkgb-suse")?.textContent || "").trim(),
        box: rect(s),
        /* the dog-ear is a ::before, so it is measured as a computed style rather than an element */
        dogEar: getComputedStyle(s, "::before").backgroundImage.slice(0, 40),
        /* a sheet that crops its own text is the serif-clip family one level down */
        overflowPx: s.scrollHeight - s.clientHeight,
      })),
    })),
    /* no delete affordance until the archive model (Phase 3) */
    delControls: root.querySelectorAll(".pkgb-sheet button").length,
    /* zero horizontal overflow inside the band */
    gridOverflowPx: grid ? grid.scrollWidth - grid.clientWidth : null,
  };
})()`;

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`phase 2 — the materials band at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r: any = await page.evaluate(BAND);
    writeFileSync(`${ART}/p2-band-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
    await page.screenshot({ path: `${OUT}/p2-band-${vp.w}.png`, fullPage: true });

    /* ⚠️ THE FLOOR, BEFORE ANY PROPERTY. Three columns or the rest of this test measured nothing. */
    expect(r.colCount, "three type columns").toBe(3);
    expect(r.railPanels, "the rail's Materials register is gone").not.toContain("Materials");

    /* Equal thirds — the property `minmax(0, 1fr)` exists to make structural rather than incidental. */
    const widths = r.columns.map((c: any) => c.box.w);
    expect(Math.max(...widths) - Math.min(...widths), `column widths ${widths}`).toBeLessThanOrEqual(1);

    /* No sheet crops its own text, and nothing overflows the band sideways. */
    for (const c of r.columns) {
      expect(c.slotBox, `${c.heading} has an illustration slot`).toBeTruthy();
      for (const s of c.sheets) {
        expect(s.overflowPx, `sheet "${s.name}" crops its own content`).toBeLessThanOrEqual(2);
        expect(s.dogEar, `sheet "${s.name}" lost its dog-ear`).toContain("gradient");
      }
    }
    expect(r.gridOverflowPx, "the band overflows sideways").toBeLessThanOrEqual(0);
    expect(r.delControls, "no delete control until the archive model").toBe(0);
  });
}

/**
 * ⚠️ DRIVEN, NOT READ. That the modal takes a `preselect` prop is a source claim and is already
 * locked as one; that clicking `+ ADD` under Synopses lands on the Synopsis form is a claim about
 * a running page, and the only way to know it is to click the button.
 */
test("phase 2 — every entry point opens the modal on its own type", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const headings = await page.evaluate(`Array.from(document.querySelectorAll(".pkg-root .pkgb-matcol .pkgb-eyebrow")).map(e => e.textContent.trim())`) as string[];
  expect(headings, "three columns to drive").toHaveLength(3);

  const results: Record<string, unknown>[] = [];
  for (let i = 0; i < 3; i++) {
    for (const entry of ["add", "ghost"] as const) {
      const sel = `.pkg-root .pkgb-matcol:nth-of-type(${i + 1}) ${entry === "add" ? ".pkgb-add" : ".pkgb-ghost"}`;
      await page.click(sel);
      await page.waitForTimeout(200);
      const state = await page.evaluate(`(() => {
        const m = document.querySelector(".pkgf-modal");
        if (!m) return { open: false };
        return {
          open: true,
          title: (m.querySelector(".pkgf-title")?.textContent || "").trim(),
          /* ⚠️ THE PROBE NAMES THE CLASSES THE MODAL ACTUALLY RENDERS. Written first against
           .pkgm-*, which exists nowhere: both drives reported "the modal did not open" about a
           modal that opened every time. A probe that names an element is a claim to check before
           its answer means anything — the same family as elementsFromPoint off screen.
           The type step is the grid of type choices; its ABSENCE is the preselect landing. */
          onTypeStep: !!m.querySelector(".pkgf-typegrid"),
          nameValue: (m.querySelector("input")?.value || "").trim(),
          text: (m.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 160),
        };
      })()`);
      results.push({ column: headings[i], entry, ...(state as object) });
      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
  }
  writeFileSync(`${ART}/p2-preselect.txt`, JSON.stringify(results, null, 2) + "\n");
  console.log(JSON.stringify(results, null, 2));

  for (const r of results as any[]) {
    expect(r.open, `${r.column} / ${r.entry} did not open the modal`).toBe(true);
    expect(r.onTypeStep, `${r.column} / ${r.entry} landed on the type picker`).toBe(false);
  }
});

/** The sheets still open for edit — the entry point the band inherited from the retired register. */
test("phase 2 — a sheet opens its material for editing", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const first = await page.evaluate(`(() => {
    const s = document.querySelector(".pkg-root .pkgb-sheet");
    return s ? { name: s.querySelector(".pkgb-sname").textContent.trim(), id: s.dataset.material } : null;
  })()`) as { name: string; id: string } | null;
  expect(first, "a sheet to click — seed materials first").toBeTruthy();

  await page.click(`.pkg-root .pkgb-sheet[data-material="${first!.id}"]`);
  await page.waitForTimeout(250);
  const state = await page.evaluate(`(() => {
    const m = document.querySelector(".pkgf-modal");
    if (!m) return { open: false };
    return {
      open: true,
      onTypeStep: !!m.querySelector(".pkgf-typegrid"),
      nameValue: (m.querySelector("input")?.value || "").trim(),
      text: (m.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 140),
    };
  })()`) as any;
  writeFileSync(`${ART}/p2-edit.txt`, JSON.stringify({ clicked: first, state }, null, 2) + "\n");
  console.log(JSON.stringify({ clicked: first, state }, null, 2));
  expect(state.open, "clicking a sheet opened nothing").toBe(true);
  expect(state.onTypeStep, "editing flashed the type picker").toBe(false);
  expect(state.nameValue, "the modal did not open on the clicked material").toBe(first!.name);
});
