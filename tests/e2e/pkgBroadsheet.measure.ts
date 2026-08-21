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
import { deleteField } from "firebase/firestore";
import { patchDoc, readField, deleteVersionDoc } from "./devWrite";
const OUT = "reports/pkg-broadsheet"; const ART = "run-artifacts/pkg-broadsheet";
mkdirSync(OUT, { recursive: true }); mkdirSync(ART, { recursive: true });
const ROUTE = "/manuscripts/packages";

/**
 * ⚠️ EVERY DOCUMENT A TEST CREATES IS REGISTERED HERE AND SWEPT AFTERWARDS, PASS OR FAIL. The
 * delete drive creates a material and removes it through the UI at the end — which does nothing at
 * all when the drive fails half way, and three failed runs left THREE identically-named materials
 * on the harness account. That then poisoned every later run: the probe that finds "the one called
 * X" had three to choose from, and the counts other tests assert were off by three. A test that
 * creates state must remove it on the failing path too, which means a register and an afterEach —
 * not a delete at the end of the happy path.
 */
const MADE_IDS: string[] = [];
test.afterEach(async () => {
  while (MADE_IDS.length) {
    const id = MADE_IDS.pop()!;
    await deleteVersionDoc(id).catch(() => {});
  }
});

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
    /* ⚠️ ONE OPEN CONTROL AND ONE BIN PER SHEET (Phase 3). Counted separately, not as
       ".pkgb-sheet button" — that matched both and returned 8 for 4 sheets, which is a number that
       cannot answer either question. */
    sheetCount: root.querySelectorAll(".pkgb-sheet").length,
    openControls: root.querySelectorAll(".pkgb-sheet .pkgb-sopen").length,
    binControls: root.querySelectorAll(".pkgb-sheet .pkgb-rem").length,
    /* a button inside a button is invalid HTML and recovers however the parser feels like */
    nestedButtons: root.querySelectorAll(".pkgb-sheet button button").length,
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
    expect(r.openControls, "a sheet lost its open control").toBe(r.sheetCount);
    expect(r.binControls, "a sheet lost its bin").toBe(r.sheetCount);
    expect(r.nestedButtons, "a button ended up inside a button").toBe(0);
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

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE 3 — THE ARCHIVE MODEL (Ruling 2)
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠️ DRIVEN THROUGH THE REAL WRITE, THEN UNDONE. Whether the popover offers the right verb is a
 * claim about the data; whether the write lands is a claim about the deployed rules; whether the
 * band and the packages then disagree is a claim about the page. Only the third needs a browser,
 * and it is the one the whole model rests on.
 */
test("phase 3 — the bin offers archive for a held material and delete for a free one", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const sheets = await page.evaluate(`(() => Array.from(document.querySelectorAll(".pkg-root .pkgb-sheet")).map((s) => ({
    id: s.dataset.material,
    name: s.querySelector(".pkgb-sname").textContent.trim(),
    use: s.querySelector(".pkgb-suse").textContent.trim(),
  })))()`) as { id: string; name: string; use: string }[];
  expect(sheets.length, "materials to drive — seed first").toBeGreaterThan(1);

  const held = sheets.find((s) => s.use.startsWith("In "));
  const free = sheets.find((s) => s.use === "Not in a package");
  expect(held, "no held material in the fixture").toBeTruthy();

  const openPop = async (id: string) => {
    await page.hover(`.pkg-root .pkgb-sheet[data-material="${id}"]`);
    await page.click(`.pkg-root .pkgb-sheet[data-material="${id}"] .pkgb-rem`);
    await page.waitForTimeout(180);
    return page.evaluate(`(() => {
      const p = document.querySelector(".pkgb-pop");
      if (!p) return { open: false };
      const b = p.getBoundingClientRect();
      const act = Array.from(p.querySelectorAll(".pkgb-popacts button")).map((x) => x.textContent.trim());
      return {
        open: true,
        heading: p.querySelector("h5").textContent.trim(),
        body: p.querySelector("p").textContent.replace(/\\s+/g, " ").trim(),
        actions: act,
        /* on screen, or nothing below is a measurement of anything */
        onScreen: b.x >= 0 && b.y >= 0 && b.right <= innerWidth && b.bottom <= innerHeight,
        rect: { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width) },
      };
    })()`);
  };

  const heldPop: any = await openPop(held!.id);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(120);
  const freePop: any = free ? await openPop(free.id) : null;
  if (free) { await page.keyboard.press("Escape"); await page.waitForTimeout(120); }

  writeFileSync(`${ART}/p3-popovers.txt`, JSON.stringify({ sheets, heldPop, freePop }, null, 2) + "\n");
  console.log(JSON.stringify({ heldPop, freePop }, null, 2));

  expect(heldPop.open, "the bin opened nothing on a held material").toBe(true);
  expect(heldPop.onScreen, "the popover is off screen, so its stacking proves nothing").toBe(true);
  expect(heldPop.heading, "a held material was offered a delete").toMatch(/^Archive /);
  expect(heldPop.actions).toEqual(["Cancel", "Archive"]);
  /* ⚠️ THE REF'S STRUCK SENTENCE MUST NOT BE ANYWHERE NEAR THIS. D9's copy told the writer to
     dismantle a package first; Ruling 2 replaced the whole model, not the wording. */
  expect(heldPop.body.toLowerCase()).not.toContain("take it out");
  expect(heldPop.body.toLowerCase()).not.toContain("first");

  if (freePop) {
    expect(freePop.heading).toMatch(/^Delete /);
    expect(freePop.actions).toEqual(["Cancel", "Delete"]);
  }
});

/** The invariant, on the running page: archiving leaves the band and stays in the package. */
test("phase 3 — archiving removes a material from the band without touching its package", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const read = () => page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    return {
      sheets: Array.from(root.querySelectorAll(".pkgb-sheet")).map((s) => s.querySelector(".pkgb-sname").textContent.trim()),
      counts: Array.from(root.querySelectorAll(".pkgb-matcolhead .pkgb-statline")).map((e) => e.textContent.trim()),
      /* THE CARDS, NOT THE RAIL'S ROWS. This read the rail's rows — retired by section 4, which
         deleted the rail — so it silently became an empty array and the "archiving damaged a
         package" assertion compared [] to [] and passed having measured nothing. A probe outliving
         the element it names is the vacuous-pass family, and here it was my own later phase that
         aged it out. (No backticks in this comment: it is inside a template literal.) */
      packageRows: Array.from(root.querySelectorAll(".pkgb-pkgcard")).map((c) =>
        (c.querySelector(".pkgb-slots")?.textContent || "").replace(/\\s+/g, " ").trim()),
    };
  })()`);

  const before: any = await read();
  const target = await page.evaluate(`(() => {
    const s = Array.from(document.querySelectorAll(".pkg-root .pkgb-sheet"))
      .find((x) => x.querySelector(".pkgb-suse").textContent.trim().startsWith("In "));
    return s ? { id: s.dataset.material, name: s.querySelector(".pkgb-sname").textContent.trim() } : null;
  })()`) as { id: string; name: string } | null;
  expect(target, "no held material to archive").toBeTruthy();

  await page.hover(`.pkg-root .pkgb-sheet[data-material="${target!.id}"]`);
  await page.click(`.pkg-root .pkgb-sheet[data-material="${target!.id}"] .pkgb-rem`);
  await page.waitForTimeout(180);
  await page.click(`.pkgb-pop .pkgb-btn--danger`);
  await page.waitForTimeout(1200);

  const after: any = await read();
  writeFileSync(`${ART}/p3-archive.txt`, JSON.stringify({ target, before, after }, null, 2) + "\n");
  console.log(JSON.stringify({ target, before, after }, null, 2));
  await page.screenshot({ path: `${OUT}/p3-archived-1440.png`, fullPage: true });

  try {
    expect(after.sheets, "the archived material is still in the band").not.toContain(target!.name);
    expect(after.sheets.length, "the band lost more than one material").toBe(before.sheets.length - 1);
    /* ⚠️ THE HALF THAT MATTERS. Archiving must not turn a package that held it into one missing a
       slot — the whole reason the model is archive-not-delete. The rail's rows carry the
       composition, so the package's line is unchanged. */
    expect(after.packageRows, "archiving damaged a package").toEqual(before.packageRows);
  } finally {
    /* ⚠️ THE TEST UNDOES ITSELF, FROM NODE. Written first as a `page.evaluate` importing
       "firebase/firestore", which cannot resolve in a bundle — and being a cleanup it was wrapped
       in a catch, so it threw silently, restored nothing, and left the fixture archived for the
       next run. A restore that fails quietly is worse than no restore: the damage becomes the
       baseline. See tests/e2e/devWrite.ts. */
    await patchDoc("versions", target!.id, { status: deleteField() });
    await page.waitForTimeout(400);
  }
});

/**
 * The delete branch, driven end to end on a material the test creates.
 *
 * ⚠️ IT MAKES ITS OWN SUBJECT. Every seeded material is in a package, so the fixture cannot reach
 * this branch at all — and a test that skips when its subject is absent is a test that passes by
 * measuring nothing. Creating the material is also what makes the delete safe to perform: nothing
 * else references it, and the account is left as it was found.
 */
test("phase 3 — a material nothing holds is deleted, not archived", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  /**
   * ⚠️ A UNIQUE NAME PER RUN, AND A CLEAN-UP THAT RUNS ON FAILURE. A fixed name plus a delete that
   * only happens at the END left THREE identically-named materials on the harness account after
   * three failed runs — and then poisoned every later run, because the probe that finds "the one
   * called X" had three to choose from and the counts every other test asserts were off by three.
   * A test that creates state must remove it even when it fails; the id is captured as soon as it
   * exists so the finally block has something to delete.
   */
  const NAME = `Broadsheet free letter ${Date.now()}`;
  await page.locator(".pkg-root .pkgb-matcol").first().locator(".pkgb-add").click();
  await page.locator("#pkgf-mat-name").fill(NAME);
  await page.locator(".pkgf-fld textarea").fill("a body nothing will ever reference");
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(2500);

  const made = await page.evaluate(`(() => {
    const s = Array.from(document.querySelectorAll(".pkg-root .pkgb-sheet"))
      .find((x) => x.querySelector(".pkgb-sname").textContent.trim() === ${JSON.stringify(NAME)});
    return s ? { id: s.dataset.material, use: s.querySelector(".pkgb-suse").textContent.trim() } : null;
  })()`) as { id: string; use: string } | null;
  if (made?.id) MADE_IDS.push(made.id);
  expect(made, "the material was not created — nothing to delete").toBeTruthy();
  expect(made!.use, "a brand new material is in no package").toBe("Not in a package");

  await page.hover(`.pkg-root .pkgb-sheet[data-material="${made!.id}"]`);
  await page.click(`.pkg-root .pkgb-sheet[data-material="${made!.id}"] .pkgb-rem`);
  await page.waitForTimeout(180);
  const pop: any = await page.evaluate(`(() => {
    const p = document.querySelector(".pkgb-pop");
    if (!p) return { open: false };
    return {
      open: true,
      heading: p.querySelector("h5").textContent.trim(),
      body: p.querySelector("p").textContent.replace(/\\s+/g, " ").trim(),
      actions: Array.from(p.querySelectorAll(".pkgb-popacts button")).map((x) => x.textContent.trim()),
    };
  })()`);
  expect(pop.open, "the bin opened nothing").toBe(true);
  expect(pop.heading).toBe(`Delete ${NAME}?`);
  expect(pop.actions).toEqual(["Cancel", "Delete"]);

  await page.click(".pkgb-pop .pkgb-btn--danger");
  await page.waitForTimeout(1500);
  const gone = await page.evaluate(`document.querySelectorAll(".pkg-root .pkgb-sheet[data-material='${made!.id}']").length`);
  writeFileSync(`${ART}/p3-delete.txt`, JSON.stringify({ made, pop, remaining: gone }, null, 2) + "\n");
  console.log(JSON.stringify({ made, pop, remaining: gone }, null, 2));
  expect(gone, "the delete left the material on the page").toBe(0);
  MADE_IDS.length = 0; // the page's own delete succeeded; nothing left to sweep
});

/**
 * "No longer available" — the third slot state, on the page.
 *
 * ⚠️ THE STATE HAS TO BE CONSTRUCTED, AND THAT IS THE POINT. With the archive model in place the
 * app cannot produce it any more: a material a package holds is archived, and an archived material
 * still resolves. It survives only in data written before the model existed — which is exactly the
 * data nobody will think to look at. One slot is pointed at an id that does not exist, read, and put
 * straight back.
 *
 * ⚠️ AND BEFORE THE FIX THIS RENDERED AS AN EMPTY SLOT — a package that once carried a synopsis
 * looked identical to one deliberately built without one. Both resolved to `null`.
 */
test("phase 3 — a slot whose material is gone says so", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);

  const readSlots = () => page.evaluate(`(() => {
    const root = document.querySelector(".pkg-root");
    return {
      /* Same retirement: the flow pack's tiles became §4's package cards. */
      tiles: Array.from(root.querySelectorAll(".pkgb-pkgcard")).map((t) => ({
        name: (t.querySelector(".pkgb-pkgname")?.textContent || "").trim(),
        rows: Array.from(t.querySelectorAll(".pkgb-slot")).map((r) => r.textContent.replace(/\\s+/g, " ").trim()),
      })),
      /* (the rail's rows are gone — §4. Nothing reads them here; the claim is about the tiles.) */
    };
  })()`);

  const patch = (value: string) => patchDoc("packages", "seed-pkg-1", { synopsisVersionId: value });

  const before: any = await readSlots();
  const restore = await readField("packages", "seed-pkg-1", "synopsisVersionId") as string | undefined;
  expect(restore, "seed-pkg-1 is missing — seed first").toBeTruthy();

  let after: any;
  try {
    await patch("ver-this-id-does-not-exist");
    await page.waitForTimeout(1400);
    after = await readSlots();
    await page.screenshot({ path: `${OUT}/p3-missing-slot-1440.png`, fullPage: true });
  } finally {
    await patch(restore!);
    await page.waitForTimeout(900);
  }

  const restored: any = await readSlots();
  writeFileSync(`${ART}/p3-missing-slot.txt`, JSON.stringify({ before, after, restored }, null, 2) + "\n");
  console.log(JSON.stringify({ before, after, restored }, null, 2));

  /* ⚠️ THE FLOOR IS THE TILES' OWN ROWS, NOT THE PAGE'S TEXT. A first version asserted that the
     "before" reading contained "Standard UK" — which the RAIL also prints, so zero tiles would have
     satisfied it and every clause below would then have been measuring an empty list. Count the
     rows the claim is about. */
  const rowCount = (r: any) => r.tiles.reduce((n: number, t: any) => n + t.rows.length, 0);
  expect(rowCount(before), "no tile slot rows rendered — nothing was measured").toBeGreaterThanOrEqual(3);

  const flat = (r: any) => JSON.stringify(r.tiles);
  expect(flat(before), "the fixture already had a missing slot").not.toContain("No longer available");
  expect(flat(after), "a slot with a missing material said nothing").toContain("No longer available");
  expect(flat(restored), "the fixture was not put back").toEqual(flat(before));
});

/* ══════════════════════════════════════════════════════════════════════════════
   PHASE 4 — PACKAGES, TRACKING AND FOOTNOTE BANDS; THE RAIL REMOVED
   ══════════════════════════════════════════════════════════════════════════════ */

export const BANDS = `(() => {
  const root = document.querySelector(".pkg-root");
  if (!root) return { error: "no .pkg-root" };
  const rect = (el) => { const b = el.getBoundingClientRect();
    return { x: Math.round(b.x), w: Math.round(b.width), h: Math.round(b.height) }; };
  const txt = (el, s) => (el.querySelector(s)?.textContent || "").replace(/\\s+/g, " ").trim();
  const bands = Array.from(root.querySelectorAll(".pkgb-band"));
  const cards = Array.from(root.querySelectorAll(".pkgb-pkgcard"));
  const scroller = root.querySelector(".wpg-scroll");
  return {
    /* ⚠️ THE RAIL, ASSERTED GONE FROM THE RENDERED PAGE — a source lock proves it was deleted from
       a file, never that no file renders it. */
    railPresent: !!root.querySelector(".pkgo-rail"),
    railRows: root.querySelectorAll(".pkgo-row").length,
    bandHeads: bands.map((b) => txt(b, ".pkgb-bandhead h2")),
    bandTags: bands.map((b) => txt(b, ".pkgb-bandhead .pkgb-tag")),
    bandWidths: bands.map((b) => rect(b).w),
    cards: cards.map((c) => ({
      name: txt(c, ".pkgb-pkgname"),
      stamp: (c.querySelector(".pkgb-plate--stamp")?.getAttribute("data-slot") || ""),
      stampBox: c.querySelector(".pkgb-plate--stamp") ? rect(c.querySelector(".pkgb-plate--stamp")) : null,
      slots: Array.from(c.querySelectorAll(".pkgb-slot")).map((sl) => ({
        label: (sl.querySelector(".pkgb-slt")?.textContent || "").trim(),
        name: (sl.querySelector(".pkgb-sln")?.textContent || "").trim(),
        gone: !!sl.querySelector(".pkgb-sln--gone"),
        none: !!sl.querySelector(".pkgb-sln--none"),
      })),
      foot: txt(c, ".pkgb-pkgfoot"),
      bin: c.querySelectorAll(".pkgb-rem").length,
      box: rect(c),
    })),
    ghostCard: {
      present: !!root.querySelector(".pkgb-pkgghost"),
      slot: (root.querySelector(".pkgb-pkgghost .pkgb-plate")?.getAttribute("data-slot") || ""),
    },
    stats: Array.from(root.querySelectorAll(".pkgb-stat")).map((s) => ({
      n: (s.querySelector(".pkgb-statn")?.textContent || "").trim(),
      label: (s.querySelector(".pkgb-statl")?.textContent || "").replace(/\\s+/g, " ").trim(),
      slot: (s.querySelector(".pkgb-plate")?.getAttribute("data-slot") || ""),
    })),
    barPanels: Array.from(root.querySelectorAll(".pkgb-panel")).map((p) => ({
      label: txt(p, ".pkgb-eyebrow"),
      rows: Array.from(p.querySelectorAll(".pkgb-drow")).map((r) => ({
        name: txt(r, ".pkgb-drname"), meta: txt(r, ".pkgb-drmeta"),
        sentPct: r.querySelector(".pkgb-bsent")?.style.width,
        inPct: r.querySelector(".pkgb-bin")?.style.width,
      })),
    })),
    ledger: Array.from(root.querySelectorAll(".pkgb-lrow")).map((r) => ({
      date: txt(r, ".pkgb-ldate"), dir: txt(r, ".pkgb-ldir"),
      what: txt(r, ".pkgb-lwhat"), pkg: txt(r, ".pkgb-lpkg"),
    })),
    footnote: Array.from(root.querySelectorAll(".pkgb-hncell")).map((c) => ({
      title: txt(c, ".pkgb-hnt"), body: txt(c, "p").slice(0, 46),
      slot: (c.querySelector(".pkgb-plate")?.getAttribute("data-slot") || ""),
    })),
    /* the page must not scroll sideways at any width */
    pageOverflowPx: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
  };
})()`;

for (const vp of [{ w: 1440, h: 900 }, { w: 1920, h: 1200 }]) {
  test(`phase 4 — the three bands at ${vp.w}`, async ({ page }) => {
    await openRoute(page, ROUTE, { width: vp.w, height: vp.h });
    await liftMotionSuppression(page);
    const r: any = await page.evaluate(BANDS);
    writeFileSync(`${ART}/p4-bands-${vp.w}.txt`, JSON.stringify(r, null, 2) + "\n");
    console.log(`── ${vp.w} ──\n` + JSON.stringify(r, null, 2));
    await page.screenshot({ path: `${OUT}/p4-bands-${vp.w}.png`, fullPage: true });

    /* ⚠️ THE POPULATION FLOOR FIRST, or every property below is satisfied by an empty page.
       FOUR bands: the footnote is one too, and it carries an `aria-label` rather than an `h2`
       because "How these figures are counted" is a caption, not a section anyone navigates to.
       A first draft listed three heads and failed on a page that was entirely correct. */
    expect(r.bandHeads.filter(Boolean), "the three headed bands")
      .toEqual(["Your materials", "Your packages", "Tracking"]);
    expect(r.bandHeads.length, "the footnote band is missing").toBe(4);
    expect(r.cards.length, "package cards to measure").toBeGreaterThan(0);
    expect(r.footnote.length, "footnote cells").toBe(3);

    expect(r.railPresent, "the rail is still rendered").toBe(false);
    expect(r.railRows, "register rows survive somewhere").toBe(0);

    /* Every band takes the same measure — none is inset or bleeding past the others. */
    expect(new Set(r.bandWidths).size, `band widths ${r.bandWidths}`).toBe(1);
    expect(r.pageOverflowPx, "the page scrolls sideways").toBeLessThanOrEqual(0);

    for (const c of r.cards) {
      expect(c.slots.length, `${c.name} lost a slot row`).toBe(3);
      expect(c.stampBox, `${c.name} has no stamp`).toBeTruthy();
      expect(c.bin, `${c.name} has no removal control`).toBe(1);
      /* ⚠️ THE STAMP MUST NOT SIT ON THE TITLE. It is absolutely placed in the corner and the title
         reserves its width — a claim about the arrangement, so it is measured as an intersection
         rather than read off either element. */
      const title = c.box;
      expect(c.stampBox.x + c.stampBox.w, `${c.name}'s stamp escapes its card`)
        .toBeLessThanOrEqual(title.x + title.w);
    }

    expect(r.ghostCard.present, "no ghost card to build another package").toBe(true);
    expect(r.ghostCard.slot, "the ghost lost its illustration slot").toBe("pkg-ghost");
    for (const f of r.footnote) expect(f.slot, "a footnote cell lost its slot").toBeTruthy();
  });
}

/**
 * The ledger, and the join behind it.
 *
 * ⚠️ ITS ROWS ARE PROVED AGAINST THE STORES THEY CAME FROM, not against a fixture. Every row must
 * name a package the page also lists, and the panel must not exist while the counts above it are
 * zero — the two claims that make "Latest activity" mean what its heading says.
 */
test("phase 4 — the ledger names real packages and real agents", async ({ page }) => {
  await openRoute(page, ROUTE, { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const r: any = await page.evaluate(BANDS);
  writeFileSync(`${ART}/p4-ledger.txt`, JSON.stringify({ ledger: r.ledger, cards: r.cards.map((c: any) => c.name), stats: r.stats }, null, 2) + "\n");
  console.log(JSON.stringify({ ledger: r.ledger, stats: r.stats }, null, 2));

  const sent = Number(r.stats.find((s: any) => /SENT/i.test(s.label))?.n ?? 0);
  if (sent === 0) {
    expect(r.ledger.length, "a ledger under zero counts").toBe(0);
    return;
  }
  expect(r.ledger.length, "figures but no activity behind them").toBeGreaterThan(0);
  const names = new Set(r.cards.map((c: any) => c.name));
  for (const row of r.ledger) {
    expect(names.has(row.pkg), `${row.pkg} is not a package on this page`).toBe(true);
    expect(row.what.length, "a ledger row said nothing").toBeGreaterThan(0);
    expect(row.dir, "a ledger row has no direction").toMatch(/[→←]/);
    /* ⚠️ NEVER A PRONOUN FOR AN AGENT — the app does not know, and guessing is a 50% error rate on
       a real person's name. */
    expect(row.what.toLowerCase()).not.toMatch(/\\b(his|her|hers|he|she)\\b/);
  }
});
