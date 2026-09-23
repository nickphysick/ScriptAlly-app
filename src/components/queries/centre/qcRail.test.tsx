/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The rail's placement (v65 §2, §6) — the arithmetic, the sentinels, and the two shell rules that
 * reserve its column and narrow the bar above it.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LEDGER_MIN, QcBirdsEyePlaceholder, QcRail, RAIL_INSET_X, RAIL_INSET_Y, RAIL_RESERVE, RAIL_STACK_BELOW, RAIL_W, railBox } from "./QcRail";

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (rel: string) => decls(readFileSync(join(process.cwd(), rel), "utf8"));
const railCss = read("src/components/queries/centre/qcvRail.css");
const pageCss = read("src/components/queries/centre/qcvPage.css");
const shellCss = read("src/components/shell/workspaceShell.css");

/** A window capsule 1128 wide, 16px down the viewport, in a 1440 × 860 window. */
/** The app's real window at 1440 × 860 with the sidebar open: 1128 wide, measured. */
const WIN = { top: 96, right: 1418, height: 700, width: 1128 };

describe("⚠️ the rail is placed from the WINDOW's measured box, never the viewport", () => {
  /**
   * The mockup writes `top: 16; bottom: 16; right: 22` against the viewport because in a drawn page
   * the viewport IS the window. Here the shell's window sits under a bar and a strip and inside the
   * app's own insets, so those three constants would be a guess at everything above and beside the
   * card. This is the house law that has now been paid for four times.
   */
  it("top is the window's top + 16; height is its height − 32; right is an inset from the VIEWPORT", () => {
    const box = railBox(WIN, 1440)!;
    expect(box.top).toBe(WIN.top + RAIL_INSET_Y);
    expect(box.height).toBe(WIN.height - RAIL_INSET_Y * 2);
    /* the card is `position: fixed`, so its `right` is measured from the viewport's edge — the
       window's own right edge plus the 22px gutter, which is 1440 − 1418 + 22 */
    expect(box.right).toBe(1440 - WIN.right + RAIL_INSET_X);
    /* and the bottom edge that produces: window.bottom − 16 */
    expect(box.top + box.height).toBe(WIN.top + WIN.height - RAIL_INSET_Y);
  });
  it("⚠️ a window that has not been laid out is REFUSED, not stored", () => {
    /* a zero rect is the page before layout, or a window the loading cover has display:none'd.
       Publishing it puts a card with no height on the page and then leaves it there. */
    expect(railBox({ ...WIN, height: 0 }, 1440)).toBeNull();
    expect(railBox({ ...WIN, width: 0 }, 1440)).toBeNull();
    expect(railBox({ ...WIN, height: -12 }, 1440)).toBeNull();
    /* ⚠️ AND NaN, WHICH IS THE CASE THE FIRST GUARD EXISTS FOR AND THE OTHERS CANNOT CATCH. A
       comparison against NaN is false, so `width < RAIL_STACK_BELOW` lets it straight through —
       found by mutation: removing that clause reddened nothing until this line was added. */
    expect(railBox({ ...WIN, width: NaN }, 1440)).toBeNull();
    expect(railBox({ ...WIN, height: NaN }, 1440)).toBeNull();
    /* …and a window shorter than its own two insets has no room for a card either */
    expect(railBox({ ...WIN, height: 2 * RAIL_INSET_Y }, 1440)).toBeNull();
  });
  it("⚠️ the threshold is DERIVED from what has to fit, and it is a WINDOW width — not the ref's 1180", () => {
    /* ⚠️ THE REF'S 1180 IS A FACT ABOUT THE REF'S OWN FRAME — a viewport query in a page whose
       window is the viewport less a 224px nav and 44px of insets. Carried across as a window width
       it stacks the card at a 1440 viewport, where this app's window measures 1128: the everyday
       case. Measured, not reasoned — and this assertion is what caught it. */
    expect(RAIL_STACK_BELOW, "the ref's viewport number was carried across as a window width").not.toBe(1180);
    expect(RAIL_STACK_BELOW).toBe(RAIL_RESERVE + LEDGER_MIN);
    expect(railBox(WIN, 1440), "the app's own 1440 window must hold the card").not.toBeNull();
    expect(railBox({ ...WIN, width: RAIL_STACK_BELOW }, 1440), "exactly at the threshold the card is still fixed").not.toBeNull();
    expect(railBox({ ...WIN, width: RAIL_STACK_BELOW - 1 }, 1440), "below it the card stacks").toBeNull();
    /* ⚠️ AND THE LEDGER'S FLOOR IS THE ONE `qcvList.css` STATES, read rather than restated: below
       it the ledger would be dropping its date tile to make room for a card, which is backwards. */
    const listCss = read("src/components/queries/centre/qcvList.css");
    const declared = +(/@container \(max-width: (\d+)px\)/.exec(listCss)?.[1] ?? -1);
    expect(LEDGER_MIN, "the ledger's floor and the rail's threshold disagree").toBe(declared + 1);
  });
});

describe("the card, rendered", () => {
  const rail = (over: Partial<React.ComponentProps<typeof QcRail>> = {}) =>
    renderToStaticMarkup(<QcRail birdsEye={<QcBirdsEyePlaceholder />} {...over} />);

  it("⚠️ it renders UNPLACED before the first measurement, and that state must look finished", () => {
    /* server-rendered, so no layout effect has run: this is the one frame a reader can see */
    const html = rail();
    expect(html).toContain('data-qcv="rail"');
    expect(html).toContain("qcv-rail--stacked");
    expect(html).not.toContain("qcv-rail--fixed");
    expect(html, "an unplaced card must not carry a half-written inline box").not.toMatch(/style="[^"]*top:/);
  });
  it("one card, two contents — and it says which it is showing", () => {
    expect(rail()).toContain('data-showing="birdseye"');
    expect(rail()).toContain('data-qcv="railcal"');
    const withCard = rail({ openCard: <aside id="card" /> });
    expect(withCard).toContain('data-showing="query"');
    expect(withCard).toContain('id="card"');
    /* ⚠️ THE BIRDS-EYE VIEW IS REPLACED, NOT HIDDEN BESIDE IT. Two contents in one card, both
       mounted, is two scroll positions and two things claiming the same 340px. */
    expect(withCard, "the Birds-eye view is still mounted behind the query").not.toContain('data-qcv="railcal"');
  });
  it("⚠️ no ⤢ until there is something for it to open (phase 4)", () => {
    /* a disabled control advertises a thing that does not exist; a dead one is worse — it looks
       live and does nothing, the fault this repo records against an undo that restores nothing */
    expect(rail()).not.toContain("<button");
  });
});

describe("the sheet, and the two shell rules", () => {
  it("§6 · no border, no rim: the shadow IS the card", () => {
    const m = railCss.match(/(?:^|\n)\s*\.qcv-rail\s*\{([^}]*)\}/);
    expect(m, ".qcv-rail has no rule").toBeTruthy();
    expect(m![1]).toMatch(/border-radius:\s*20px/);
    expect(m![1]).toMatch(/border:\s*0/);
    expect(m![1]).toMatch(/box-shadow:\s*0 1px 2px rgba\(28, 19, 15, 0\.05\), 0 18px 40px -22px rgba\(28, 19, 15, 0\.28\)/);
    /* ⚠️ the framed treatment is the three court tiles' alone (§1.5) — a rim here makes a fourth */
    expect(m![1], "the rail grew the framed treatment").not.toMatch(/inset 0 0 0 \d+px/);
  });
  it("⚠️ the sheet states the POSITION and nothing about WHERE — the placement is measured", () => {
    expect(railCss).toMatch(/\.qcv-rail--fixed \{ position: fixed;/);
    /* a `top`, `right` or `bottom` here would be a second opinion about a box JS has measured, and
       whichever won it would be wrong on the page where the other was right */
    const fixed = railCss.match(/(?:^|\n)\s*\.qcv-rail--fixed\s*\{([^}]*)\}/)![1];
    for (const p of ["top:", "right:", "bottom:", "left:", "height:", "width:"]) {
      expect(fixed, `${p} is stated in CSS as well as measured`).not.toContain(p);
    }
  });
  it("§2 · one measurement owns both sides — the card publishes the reservation, the page reads it", () => {
    /* ⚠️ NOT A MEDIA QUERY. A media query knows the VIEWPORT; whether there is room for a card
       depends on the WINDOW. Two askers, two answers, and between them either 384px of nothing
       down the right of a stacked page or a fixed card over the ledger's last column. */
    expect(pageCss).toMatch(/padding-right:\s*var\(--qcv-rail-pad,\s*384px\)/);
    expect(pageCss, "the page asks a media query about a window question").not.toMatch(/@media[^{]*\{\s*\.qcv-page \{ padding-right/);
    const rail = read("src/components/queries/centre/QcRail.tsx");
    expect(rail).toMatch(/setProperty\("--qcv-rail-pad", next \? `\$\{RAIL_RESERVE\}px` : "0px"\)/);
    /* the reservation is the card's own width plus two 22px gutters — derived, not a fourth number */
    expect(RAIL_RESERVE).toBe(RAIL_W + RAIL_INSET_X * 2);
    expect(RAIL_RESERVE).toBe(384);
  });
  it("⚠️ the narrow bar is PAGE-SCOPED: the other fourteen routes keep the whisper", () => {
    expect(shellCss).toMatch(/\.ground-mode \.ws-sync, \.ground-mode \.ws-pagebar > \.ws-vdiv \{ display: none; \}/);
    /* ⚠️ A SHRINK, NOT A GROW — the search is not a flex item of the BAR (it sits inside
       `.ws-bright`, which is content-sized), so a `flex-grow` there had nothing to grow into and
       measured 210px at 1280 and 210px at 1440: a rule that reads as doing something and does
       nothing. With the whisper gone the bar has 140px of slack at 1280 and nothing overflows. */
    expect(shellCss).toMatch(/\.ground-mode \.ws-pagebar \.sp-search \{ flex-shrink: 1; min-width: 0; \}/);
    expect(shellCss, "a grow that has nothing to grow into").not.toMatch(/\.ground-mode[^\n]*\.sp-search \{[^}]*flex-grow: 1/);
    /* ⚠️ AND THE SHARED BAR'S OWN RULES ARE UNTOUCHED. A shared control that changes between routes
       is worse than a page starting lower — the standing ruling behind `--sp-ctl`. */
    const base = shellCss.match(/(?:^|\n)\s*\.ws-sync\s*\{([^}]*)\}/);
    expect(base, ".ws-sync lost its own rule").toBeTruthy();
    expect(base![1], "the whisper was hidden for everyone").not.toContain("display: none");
    const prim = read("src/components/shell/primitives.css").match(/(?:^|\n)\s*\.sp-search\s*\{([^}]*)\}/)![1];
    expect(prim, "the search pill stopped being a fixed-size shared control").toMatch(/flex:\s*none/);
  });
});

/* ── §4 · the courts, as markup ─────────────────────────────────────────────────────────────── */

describe("the court tiles", () => {
  it("⚠️ each states its name ONCE to a reader, though the design draws it twice", async () => {
    const { QcCourts } = await import("./QcCourts");
    const { courtTiles } = await import("../../../lib/qcSummary");
    const html = renderToStaticMarkup(<QcCourts tiles={courtTiles([])} onCourt={() => {}} />);
    /* the label is a sentence, not the visible parts concatenated */
    expect(html).toContain('aria-label="With you: 0 queries. none yet."');
    expect(html).toContain('aria-label="Closed: 0 queries. none yet."');
    /* …and the visible text is hidden, or a reader hears the court's name twice per tile */
    expect(html.split('aria-hidden="true"').length - 1, "the drawn text is not hidden from the label").toBeGreaterThanOrEqual(6);
    /* singular agrees with its verb */
    const one = renderToStaticMarkup(<QcCourts tiles={[{ key: "you", name: "With you", count: 1, fact: "your move on these", urgent: false, rust: true }]} onCourt={() => {}} />);
    expect(one).toContain("1 query.");
  });
  /**
   * ⚠️ EVERY LINE IN A TILE STATES ITS `line-height`, so the tile's height does not depend on when
   * the fonts arrive. Left at `normal` a box takes the FONT's own metrics — one height while the
   * face is still loading, another once it lands — and the loading ghost measured 2px short of the
   * real tile for exactly as long as that took, which the page showed as the sentence below jumping
   * when the cover lifted.
   */
  it("⚠️ no line in a tile is left at `line-height: normal`", () => {
    const css = read("src/components/queries/centre/qcvCourts.css");
    /* ⚠️ "or states a height" is the honest form: the band is 26px whatever its text does, so its
       line box cannot move the tile. Anything that is sized BY its text must state the leading. */
    for (const sel of [".qcv-court-n", ".qcv-court-lbl", ".qcv-court-fact", ".qcv-court-band"]) {
      const m = css.match(new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*\\{([^}]*)\\}`));
      expect(m, `${sel} has no rule`).toBeTruthy();
      const ok = /line-height:\s*[\d.]+(px)?/.test(m![1]) || /\bheight:\s*[\d.]+px/.test(m![1]);
      expect(ok, `${sel} is sized by its text and leaves the line box to the font's metrics`).toBe(true);
    }
  });
  /**
   * ⚠️ THE HEAD'S HEIGHT AND THE COUNT'S LINE BOX ARE AN ARTEFACT-LOCKED PAIR. The head states a
   * height because a baseline-aligned row's own height comes from FONT METRICS, and until both
   * faces have loaded those are the fallback's — measured, the tile was 109.4 before the fonts
   * landed and 111.4 after, so the page moved 2px under the reader as the cover lifted. Stating the
   * height fixes the box; the two numbers must then agree, or the stated height crops the count.
   */
  it("⚠️ the head's stated height IS the count's line box — read from the sheet on both sides", () => {
    const css = read("src/components/queries/centre/qcvCourts.css");
    const head = css.match(/(?:^|\n)\s*\.qcv-court-head\s*\{([^}]*)\}/)![1];
    const n = css.match(/(?:^|\n)\s*\.qcv-court-n\s*\{([^}]*)\}/)![1];
    const stated = +(/height:\s*(\d+(?:\.\d+)?)px/.exec(head)?.[1] ?? -1);
    const size = +(/font-size:\s*(\d+(?:\.\d+)?)px/.exec(n)?.[1] ?? -1);
    const lh = /line-height:\s*([\d.]+)(px)?/.exec(n);
    expect(stated, "the head states no height, so its box is the fonts'").toBeGreaterThan(0);
    expect(lh, "the count states no line-height").toBeTruthy();
    const box = lh![2] === "px" ? +lh![1] : size * +lh![1];
    expect(stated, `the head is ${stated} and the count's line box is ${box}`).toBe(box);
  });
  it("the three tiles are buttons, and a disabled one cannot deal", async () => {
    const { QcCourts, QcCourtsSkeleton } = await import("./QcCourts");
    const { courtTiles } = await import("../../../lib/qcSummary");
    const live = renderToStaticMarkup(<QcCourts tiles={courtTiles([])} onCourt={() => {}} />);
    expect(live.split("<button").length - 1).toBe(3);
    expect(renderToStaticMarkup(<QcCourts tiles={courtTiles([])} onCourt={() => {}} loading />).split("disabled=").length - 1).toBe(3);
    /* ⚠️ THE GHOST IS NOT A BUTTON AT ALL — a placeholder that can be pressed deals an empty hand */
    expect(renderToStaticMarkup(<QcCourtsSkeleton />)).not.toContain("<button");
  });
});
