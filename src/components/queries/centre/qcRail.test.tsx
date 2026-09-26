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
import { GROUP_GAP, GROUP_MAX, LEDGER_MIN, QcRail, RAIL_INSET_X, RAIL_INSET_Y, RAIL_RESERVE, RAIL_STACK_BELOW, RAIL_W, expandedBox, railBox, railStick } from "./QcRail";
import { QcBirdsEye } from "./QcBirdsEye";

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (rel: string) => decls(readFileSync(join(process.cwd(), rel), "utf8"));
const railCss = read("src/components/queries/centre/qcvRail.css");
const pageCss = read("src/components/queries/centre/qcvPage.css");
const shellCss = read("src/components/shell/workspaceShell.css");

/** A window capsule 1128 wide, 16px down the viewport, in a 1440 × 860 window. */
/** The app's real window at 1440 × 860 with the sidebar open: 1128 wide, measured. */
const WIN = { top: 96, left: 290, right: 1418, height: 700, width: 1128 };

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
    renderToStaticMarkup(<QcRail birdsEye={<QcBirdsEye rows={[]} nowMs={Date.now()} onExpand={() => {}} />} {...over} />);

  it("⚠️ it renders UNPLACED before the first measurement, and that state must look finished", () => {
    /* server-rendered, so no layout effect has run: this is the one frame a reader can see */
    const html = rail();
    expect(html).toContain('data-qcv="rail"');
    expect(html).toContain("qcv-rail--stacked");
    expect(html).not.toContain("qcv-rail--beside");
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
  it("⚠️ the ⤢ is drawn now that there is something for it to open (§6.4)", () => {
    /* it was absent through phase 3 on the standing rule that a control arrives with its
       destination: drawn before one exists it is either disabled — advertising a thing that is not
       there — or dead, which is worse. */
    expect(rail()).toContain('data-qcv="be-expand"');
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
    expect(railCss).toMatch(/\.qcv-rail--beside \{[^}]*position: sticky/);
    /* a `top`, `right` or `bottom` here would be a second opinion about a box JS has measured, and
       whichever won it would be wrong on the page where the other was right */
    /**
     * ⚠️ RETARGETED IN v65.2 §2, AND THE RULE IS UNCHANGED: the sheet may name the position and not
     * the place. What changed is that a sticky card MUST state a `top` and a `height` — that is
     * what sticky is — so the claim is that both READ A PUBLISHED MEASUREMENT rather than stating a
     * number. `top: 16px` and `calc(100vh - 32px)` are the mock's, and both are facts about a page
     * whose scrollport is its viewport.
     */
    const beside = railCss.match(/(?:^|\n)\s*\.qcv-rail--beside\s*\{([^}]*)\}/)![1];
    expect(beside).toMatch(/top:\s*var\(--be-rail-top/);
    expect(beside).toMatch(/height:\s*var\(--be-rail-h/);
    for (const p of ["right:", "bottom:", "left:", "width:"]) {
      expect(beside, `${p} is stated in CSS as well as measured`).not.toContain(p);
    }
    expect(beside, "a constant offset is a guess at everything above the card").not.toMatch(/top:\s*\d/);
    expect(beside, "100vh is the viewport, and the card does not start at y 0").not.toContain("100vh");
  });
  it("§2 · one measurement owns both sides — the card publishes, the group reads", () => {
    /**
     * ⚠️ THE RESERVATION BECAME A TRACK (v65.2). The page used to pay `padding-right` for a card
     * placed against the window's right edge; the two are one grid now, so the width is stated
     * once and nothing can disagree with it. What did NOT change is the law underneath: whether
     * there is room is a question about the WINDOW, and a media query knows the VIEWPORT — the same
     * 1440 viewport gives 1128 of window with the sidebar open and 1312 with it shut. The card
     * still answers it, and now publishes the answer as the group's own attribute.
     */
    expect(pageCss, "the reservation is a track now").not.toMatch(/padding-right:\s*var\(--qcv-rail-pad/);
    expect(pageCss).toMatch(/\.qcv-group \{[^}]*grid-template-columns: minmax\(0, 1fr\) 340px/);
    expect(pageCss).toMatch(/\.qcv-group \{[^}]*column-gap: 28px/);
    /* ⚠️ THE CAP IS THE PAGE'S `--wpg-measure`, not a `max-width` here: the shared grid computes the
       cap and the gutter reduction in ONE `min()`, and a second cap on this element beat the gutter
       — the page started at the window's edge, 246 against the dashboard's 268. */
    expect(pageCss).toMatch(/--wpg-measure: 1480px/);
    expect(pageCss, "a second cap contests the grid's gutter reduction").not.toMatch(/\.qcv-group \{[^}]*max-width/);
    expect(pageCss).toMatch(/\.qcv-group\[data-rail="stacked"\] \{ grid-template-columns: minmax\(0, 1fr\); \}/);
    expect(pageCss, "the group asks a media query about a window question").not.toMatch(/@media[^{]*\{\s*\.qcv-group/);
    const rail = read("src/components/queries/centre/QcRail.tsx");
    expect(rail).toMatch(/group\?\.setAttribute\("data-rail", next \? "beside" : "stacked"\)/);
    /* the group's own numbers are the card's width and the gutter, stated once each */
    expect(GROUP_MAX).toBe(1480);
    expect(GROUP_GAP).toBe(28);
    expect(RAIL_RESERVE).toBe(RAIL_W + RAIL_INSET_X * 2);
  });
  /* ⚠️ RETIRED (app shell v3, 26 Sep). The Query Centre's narrow-bar variant dropped the save whisper
     and let the search pill shrink. The whisper is gone on EVERY route (D5) and the search is a 36px
     icon, so the variant had nothing left to do; asserted gone so it cannot quietly return. */
  it("⚠️ the Query Centre's narrow-bar variant is retired with the whisper it hid", () => {
    expect(shellCss).not.toMatch(/\.ground-mode \.ws-sync/);
    expect(shellCss).not.toMatch(/\.ground-mode \.ws-pagebar \.sp-search/);
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

/* ── §7 · the expanded card's box ───────────────────────────────────────────────────────────── */

/**
 * ⚠️ RETARGETED TWICE, AND EACH TIME THE CLAIM CHANGED RATHER THAN THE SIGNATURE. v65.2 §2 moved
 * the card's horizontal extent from the WINDOW to the centred GROUP, because a card grown to the
 * window leaves the page it belongs to behind — on a 2560 screen by hundreds of pixels of desk.
 * v65.3 §4.1 moves its VERTICAL extent from the window to the VIEWPORT, because the card now sits
 * OVER the shell's bar: it is an overlay on a dimmed page, so the window capsule is not its frame.
 *
 * ⚠️ THAT SECOND MOVE IS AN EXCEPTION TO THIS APP'S OWN VIEWPORT LAW, AND IT IS STATED AS ONE. The
 * law exists because something is normally above an element and a constant offset guesses at it;
 * here nothing is, which is exactly the condition under which the law does not apply.
 */
describe("⚠️ the expanded card spans the GROUP, and takes its height from the VIEWPORT (§4.1)", () => {
  const GROUP = { left: 300, right: 1380 };
  const VH = 900;
  it("its left and right are the group's, to the pixel", () => {
    const wide = expandedBox(WIN, GROUP, VH)!;
    expect(wide.left).toBe(GROUP.left);
    expect(wide.left + wide.width).toBe(GROUP.right);
    /* ⚠️ AND IT STATES NO `right`. The card is placed by left + width; a third number about the same
       edge is a third thing that can disagree, and computing it would need `window` — which a pure
       function a unit test calls does not have. */
    expect("right" in wide).toBe(false);
  });
  it("§4.1 · ⚠️ its top and height are the VIEWPORT's, inset 16 — never the window's", () => {
    const b = expandedBox(WIN, GROUP, VH)!;
    expect(b.top, "viewport top + 16").toBe(16);
    expect(b.height, "viewport bottom − 16").toBe(VH - 32);
    /* the precondition that makes this a real claim: the window is NOT at the viewport's top */
    expect(WIN.top, "a window flush with the viewport would make the two indistinguishable").toBeGreaterThan(0);
    expect(b.top).not.toBe(WIN.top + 16);
  });
  it("⚠️ …and a group narrower than the window does NOT give it the window's edges", () => {
    /* the fault this closes: on a wide screen the group is capped and the window is not, so a card
       taking the window's edges is the one thing on the page not centred with everything else */
    const narrow = expandedBox(WIN, { left: 500, right: 1000 }, VH)!;
    expect(narrow.width).toBe(500);
    expect(narrow.left).toBe(500);
    expect(narrow.left).toBeGreaterThan(WIN.left);
  });
  it("it refuses the same readings the rail refuses", () => {
    expect(expandedBox({ ...WIN, width: NaN }, GROUP, VH)).toBeNull();
    expect(expandedBox({ ...WIN, width: RAIL_STACK_BELOW - 1 }, GROUP, VH), "stacked: there is no card to grow").toBeNull();
    expect(expandedBox(WIN, { left: 400, right: 400 }, VH), "a group with no width").toBeNull();
    expect(expandedBox(WIN, GROUP, 0), "a viewport with no height is a page before layout").toBeNull();
    expect(expandedBox(WIN, GROUP, 20), "…and one shorter than its own insets").toBeNull();
  });
});

/* ── §2 · the sticky placement ───────────────────────────────────────────────────────────────── */

describe("§2 · the card is sticky in the group, at a measured offset and height", () => {
  /* the window sits 100px down the viewport; the scrollport starts 60px below the viewport's top */
  it("⚠️ the sticky offset is measured from the SCROLLPORT, never the 16 itself", () => {
    const st = railStick(WIN, WIN.top - 40, WIN.top + 200)!;
    /* the card must come to rest at window.top + 16; the scrollport starts 40px above that window,
       so the offset is 56 — writing `top: 16px` would park it 40px too high */
    expect(st.stickyTop).toBe(RAIL_INSET_Y + 40);
  });
  it("⚠️ the height runs from the card's OWN top, and `Math.max` serves both states with no state", () => {
    /* before it sticks, its top is where it happens to sit */
    const loose = railStick(WIN, 0, WIN.top + 200)!;
    expect(loose.height).toBe(WIN.top + WIN.height - RAIL_INSET_Y - (WIN.top + 200));
    /* once stuck, it is the rest position, and the height is the window less both insets */
    const stuck = railStick(WIN, 0, WIN.top + RAIL_INSET_Y)!;
    expect(stuck.height).toBe(WIN.height - RAIL_INSET_Y * 2);
    /* and a card scrolled ABOVE its rest position does not grow past it */
    const above = railStick(WIN, 0, WIN.top - 300)!;
    expect(above.height).toBe(stuck.height);
  });
  /**
   * ⚠️ THE LATCH, AND IT SHIPPED FOR ONE BUILD. The card renders stacked until it has measured, so
   * on the first read its top is far below the window's bottom. A height derived from that top is
   * negative; a placement refused for a negative height leaves the card stacked; and the stacked
   * card measures the same top on the next read. The page stayed one column at 1440 with every
   * rule correct, and the only symptom was a measurement reporting the ledger 390px too wide.
   */
  it("⚠️ a card that has not been placed yet is still placeable — the state must not decide the measurement", () => {
    const wayBelow = WIN.top + WIN.height + 900;
    const st = railStick(WIN, 0, wayBelow);
    expect(st, "an unplaced card refuses its own placement for ever").not.toBeNull();
    /* …and it is given the full resting height, not a negative one */
    expect(st!.height).toBe(WIN.height - RAIL_INSET_Y * 2);
  });
  it("…and it refuses what the fixed card refused", () => {
    expect(railStick({ ...WIN, height: 0 }, 0, 0)).toBeNull();
    expect(railStick({ ...WIN, width: RAIL_STACK_BELOW - 1 }, 0, 0)).toBeNull();
  });
});

