/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · §2 — BOTH JOURNEYS BECOME A SHEET (ref design-refs/92-both-sheets.html; the depth
 * from 91-sheet-lift.html).
 *
 * The takeover replaced the desk. The sheet is laid ON it. Everything locked here serves that one
 * sentence, and the four things most likely to undo it quietly:
 *
 *   · the sheet stops being square, and becomes another card;
 *   · the rim moves from a pseudo-element to a border, and starts participating in layout;
 *   · one journey grows its own copy of the surface, and the two drift;
 *   · reduced motion removes the SCRIM along with the travel, and the desk stops being spoken for.
 *
 * ⚠️ SOURCE LOCKS, NOT PIXELS (`environment: 'node'` — no jsdom in this repo). Geometry is
 * browser-measured in the report; what is here is the cause each measurement follows from.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const sheet = read("../components/queries/QueryJourneySheet.tsx");
const queries = read("../components/Queries.tsx");
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const rule = (selector: string): string => {
  const i = css.indexOf("\n" + selector + " {");
  return i < 0 ? "" : css.slice(i, css.indexOf("}", i) + 1);
};

describe("§2 · the sheet is paper, not another card", () => {
  /* ⚠️ THE ONE SQUARE-CORNERED SURFACE IN THE PRODUCT. Every other surface is radiused; this one is
     not, and that difference is the entire reason it reads as a sheet of paper rather than as a
     larger card. Softening it is a one-character edit with no visible error. */
  it("square corners, stated rather than inherited", () => {
    const r = rule(".qc-sheet");
    expect(r, "the sheet rule is missing").not.toBe("");
    expect(r, "the sheet was softened — it stops reading as paper").toContain("border-radius: 0");
  });

  /* ⚠️ A RING, NOT A BORDER — the house rule about rims and children. A border participates in
     layout and in the box model of everything sized against it; a ring is drawn over the top and
     costs the content nothing. Two lines, because one line is a box and two are a cut edge. */
  it("the cut edge is two lines on a pseudo-element, and the sheet itself has no border", () => {
    const ring = rule(".qc-sheet::after");
    expect(ring, "the rim's pseudo-element is missing").not.toBe("");
    expect(ring, "the rim stopped being drawn over the top").toContain("pointer-events: none");
    expect(ring, "the ink hairline went").toContain("inset 0 0 0 1px rgba(var(--qc-ink-rgb), 0.14)");
    expect(ring, "the inner white line went — one line is a box, two are a cut sheet")
      .toContain("inset 0 0 0 2px rgba(255, 255, 255, 0.55)");
    expect(rule(".qc-sheet"), "the rim became a border — it would take part in layout")
      .not.toMatch(/(^|[;\s])border\s*:/);
  });

  /* The Lifted depth from 91-sheet-lift.html: a contact line, a mid shadow, two long ambients.
     `Laid` reads flat at a glance; `Deep` turns a weekly errand into a stage. Deep is NOT shipped
     and there is no toggle — a depth control on a journey is a preference nobody has. */
  it("the shadow is layered, and the Deep stage is not shipped", () => {
    const r = rule(".qc-sheet");
    for (const layer of ["0 1px 0 ", "0 4px 8px ", "0 22px 40px -10px ", "0 44px 80px -30px "]) {
      expect(r, `the ${layer.trim()} layer went — the depth is the stack, not one blur`).toContain(layer);
    }
    expect(css, "the Deep stage shipped").not.toContain("0 70px 120px -40px");
    expect(css, "a depth toggle arrived").not.toMatch(/data-lift/);
  });

  /* ⚠️ WARM RADIAL, FROM INK THIS STYLESHEET ALREADY USES. Flat black says "modal"; a radial that
     stays lightest behind the sheet says the lamp is on the letter. Derived from `--qc-ink-rgb`,
     which is the same ink `--float-sh` is built from — so the scrim and the shadow cannot become
     two different browns, and neither is a new colour. */
  it("the scrim is a radial built from the existing ink, never a flat fill", () => {
    const r = rule(".qc-sheet-scrim");
    expect(r, "the scrim rule is missing").not.toBe("");
    expect(r, "the scrim went flat").toContain("radial-gradient");
    expect(r, "the scrim stopped reading the shared ink").toContain("rgba(var(--qc-ink-rgb)");
    expect(css, "the ink channels are not declared").toContain("--qc-ink-rgb: 58, 28, 20");
    /* black, in any of its spellings, is what this rule exists to keep out */
    expect(r, "the scrim went to flat black").not.toMatch(/rgba\(0,\s*0,\s*0/);
  });

  it("the geometry is a relationship to the viewport, so the desk shows on all four sides", () => {
    const r = rule(".qc-sheet");
    expect(r, "the width stopped leaving room for the desk").toContain("width: min(1080px, calc(100% - 84px))");
    expect(r, "the height stopped leaving room for the desk").toContain("max-height: calc(100% - 76px)");
  });
});

describe("§2 · one surface, two registers", () => {
  it("both journeys render through the SAME component — there is only one of it", () => {
    expect(code, "the sheet is not mounted").toContain("<QueryJourneySheet");
    expect((code.match(/<QueryJourneySheet/g) ?? []).length,
      "a second sheet appeared — the two journeys would drift into two objects").toBe(1);
    /* one mount, both states: the register is a prop, not a fork */
    expect(code, "the register stopped being a prop").toContain('register={recording ? "record" : "create"}');
  });

  /* ⚠️ THE REGISTER CHOOSES COLOUR AND NOTHING STRUCTURAL. A writer who has logged a query already
     knows how to record a response, and that is only true while the object is the same object. */
  it("the register modifier carries no geometry", () => {
    for (const mod of [".qc-sheet--create", ".qc-sheet--record"]) {
      const r = rule(mod);
      if (r === "") continue; // no modifier rule yet is fine — an empty one cannot diverge
      for (const structural of ["width", "max-height", "border-radius", "box-shadow"]) {
        expect(r, `${mod} set ${structural} — the two journeys would stop being one object`)
          .not.toMatch(new RegExp(`(^|[;\\s])${structural}\\s*:`));
      }
    }
  });
});

describe("§2 · the desk stays mounted behind it", () => {
  /* The rest state's three branches used to sit at the TAIL of a chain whose head was the two
     takeovers, so opening a journey unmounted whatever was being read. They are their own
     expression now, and the sheet floats over whichever is showing. */
  it("the rest state is not a branch of the journey", () => {
    const sheetAt = code.indexOf("<QueryJourneySheet");
    const close = code.indexOf("</QueryJourneySheet>");
    const hero = code.indexOf("activeQuery && activeAgent && activeMs ?");
    expect(close, "the sheet never closes").toBeGreaterThan(sheetAt);
    expect(hero, "the selected-query branch is missing").toBeGreaterThan(-1);
    expect(hero, "the hero is INSIDE the sheet — the desk would unmount when a journey opened")
      .toBeGreaterThan(close);
  });

  /* ⚠️ PORTALLED, AND THE REASON IS SPECIFIC. StagePage's entry transform makes a page slot the
     containing block for `position: fixed`, and `.f12-root` has two `overflow: hidden` ancestors.
     Mounted in place, the sheet would be captured by one and clipped by the other. */
  it("the sheet portals to document.body", () => {
    expect(sheet, "the portal went — the sheet would be clipped by the page").toContain("createPortal");
    expect(sheet, "the portal target moved off the body").toContain("document.body");
    /* the wrapper re-establishes the token scope the portal escaped */
    expect(sheet, "the portal escaped .t-f12 — every token below it would fail to resolve")
      .toContain("t-f12 qc-sheet-layer");
  });

  it("the scrim is the sheet's sibling, never its parent", () => {
    /* a parent's opacity lands on the sheet's own compositing chain, and the sheet is not what is
       being dimmed */
    /* ⚠️ ANCHORED ON THE className, NOT ON THE BARE CLASS NAME. `qc-sheet-layer` occurs twice in
       that file — once as the layer's class and once in `scrimClasses`, where it names what counts
       as the backdrop — so a bare `indexOf` would measure whichever is written first and keep
       passing until the two moved apart. Caught by `testAnchors`, this repo's meta-lock for exactly
       this shape, on this file's first run. */
    const layer = sheet.indexOf("className={`t-f12 qc-sheet-layer");
    expect(layer, "the layer's className is missing").toBeGreaterThan(-1);
    const scrim = sheet.indexOf("qc-sheet-scrim", layer);
    const box = sheet.indexOf("className={`qc-sheet$", layer);
    expect(scrim, "the scrim is missing").toBeGreaterThan(-1);
    expect(box, "the sheet element is missing").toBeGreaterThan(scrim);
    expect(sheet, "the scrim wraps the sheet").not.toMatch(/qc-sheet-scrim[^/]*>\s*\{?\s*<div className=\{`qc-sheet\$/);
  });
});

describe("§2 · the stacking order is deliberate at both ends", () => {
  /* ⚠️ THE CEILING MATTERS AS MUCH AS THE FLOOR. Above every page popover (30–70) so nothing on the
     desk draws through it; BELOW the toast host (300) and `showConfirm` (320), because the dirty
     guard's confirm must draw over the sheet it is asking about and a receipt must be readable
     above it. Raise this above 300 and the guard opens behind the thing it guards. */
  it("the layer sits above the desk's popovers and below the toast host and the confirm", () => {
    const layer = rule(".qc-sheet-layer");
    expect(layer, "the layer rule is missing").not.toBe("");
    const z = /z-index:\s*(\d+)/.exec(layer)?.[1];
    expect(z, "the layer has no z-index").toBeTruthy();
    const n = Number(z);
    expect(n, "the sheet fell below the page's popovers (30–70)").toBeGreaterThan(70);
    const toast = readFileSync(new URL("../components/toast/toast.css", import.meta.url), "utf8");
    const hosts = [...toast.matchAll(/z-index:\s*(\d+)/g)].map((m) => Number(m[1]));
    expect(hosts.length, "the toast stylesheet declares no z-index — this comparison is testing nothing")
      .toBeGreaterThan(0);
    for (const h of hosts) {
      expect(n, `the sheet rose above a toast layer (${h}) — a confirm would open behind the sheet`)
        .toBeLessThan(h);
    }
  });

  it("the dock is inside the sheet, and no longer a row of the page grid", () => {
    expect(code, "the grid's dock row came back — the dock belongs to the composition it commits")
      .not.toContain("dock={(creating || recording)");
    const sheetAt = code.indexOf("<QueryJourneySheet");
    const close = code.indexOf(">", code.indexOf("stateClass", sheetAt));
    expect(code.slice(sheetAt, code.indexOf("</QueryJourneySheet>")), "the dock left the sheet")
      .toContain("qc-dock");
    expect(close).toBeGreaterThan(-1);
    /* and it holds its height while the body scrolls */
    expect(rule(".qc-sheet .qc-dock"), "the dock stopped holding its height inside the sheet")
      .toContain("flex: none");
  });
});

describe("§2 · motion", () => {
  it("the lay-down is a fade with a small rise, holding its final frame", () => {
    expect(css, "the lay-down keyframe is missing").toContain("@keyframes qc-sheet-lay");
    const r = rule(".qc-sheet");
    expect(r, "the sheet stopped animating in").toContain("animation: qc-sheet-lay 420ms");
    expect(r, "`both` is what stops a frame of the sheet at its `from` offset").toContain("both");
  });

  /**
   * ⚠️ THE EXITS ARE RESTATED AT 0-2-0 ON PURPOSE. `.qc-exit-cancel` / `.qc-exit-save` are 0-1-0 and
   * so is `.qc-sheet`, so which won would be decided by bundle order — the equal-specificity
   * collision this repo has recorded more than once. Naming both classes settles it in the rule.
   */
  it("the exits beat the lay-down by specificity, not by source order", () => {
    for (const name of ["qc-exit-cancel", "qc-exit-save"]) {
      expect(css, `the sheet's ${name} is not specificity-qualified — order would decide it`)
        .toContain(`.qc-sheet.${name} {`);
    }
  });

  /* ⚠️ REDUCED MOTION REMOVES THE TRAVEL, NOT THE OVERLAY. A reader who asked for less motion is
     still owed the dimmed desk that says the rest of the page is not currently theirs. */
  it("reduced motion cuts to the final frame with the scrim still applied", () => {
    /* ⚠️ ANCHORED ON THE SHEET'S OWN BLOCK, NOT ON THE LAST ONE IN THE FILE. This read
       `lastIndexOf(...)` and started measuring §5's device block the moment that was appended —
       reporting "the sheet keeps travelling" about a rule it was no longer looking at. A "last of
       its kind" anchor is a bet that nothing will ever be added below it. */
    const at = css.indexOf(".qc-sheet, .qc-sheet-scrim { animation: none; }");
    expect(at, "the sheet's reduced-motion rule is missing").toBeGreaterThan(-1);
    const open = css.lastIndexOf("@media (prefers-reduced-motion: reduce)", at);
    expect(open, "that rule is not inside a reduced-motion block").toBeGreaterThan(-1);
    const block = css.slice(open, css.indexOf("}\n", at) + 2);
    expect(block, "the sheet keeps travelling under reduced motion").toContain(".qc-sheet");
    expect(block, "the scrim keeps fading under reduced motion").toContain(".qc-sheet-scrim");
    expect(block, "reduced motion HID the scrim — the desk would stop being spoken for")
      .not.toMatch(/display:\s*none/);
    expect(block, "reduced motion zeroed the scrim's opacity — same fault, quieter")
      .not.toMatch(/opacity:\s*0\s*;/);
  });

  /* The centring is by grid, and that is what leaves `transform` free for the keyframes. The ref
     centres with `translate(-50%, -50%)`, which every keyframe then has to restate — and this
     page's exit keyframes are SHARED with the pane and do not restate it, so a transform-centred
     sheet would have snapped into the top-left quadrant on both exits, silently. */
  it("the layer centres the sheet, so no keyframe has to restate a centring transform", () => {
    const layer = rule(".qc-sheet-layer");
    expect(layer, "the layer stopped centring").toContain("place-items: center");
    expect(rule(".qc-sheet"), "the sheet went back to transform-centring — both exits would break")
      .not.toContain("translate(-50%");
  });
});
