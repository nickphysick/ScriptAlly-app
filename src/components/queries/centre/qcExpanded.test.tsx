/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The expanded Birds-eye view (v65 §7, §8.1, §8.2) — the card, the Courier's column, the title and
 * the three stat cards.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { sliceBetween } from "../../../test/sliceBetween";
import { HEAD_W } from "./QcExpanded";
import { ATTENTION_LABEL } from "../../../lib/qcBirdsEye";
import { ATTENTION_HINT } from "../../../lib/qcBirdsEye";

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (rel: string) => decls(readFileSync(join(process.cwd(), rel), "utf8"));
const css = read("src/components/queries/centre/qcvExpanded.css");
const src = read("src/components/queries/centre/QcExpanded.tsx");
const rule = (sel: string) => {
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  expect(m, `${sel} has no rule`).toBeTruthy();
  return m![1];
};

describe("§7 · the card", () => {
  it("⚠️ the REVEAL is a clip-path from the rail's own width — it is the same card, grown", () => {
    /* a fade or a slide would be a NEW card appearing where the old one was, which is a different
       thing to say about the same view */
    const card = rule(".qcv-xp-card");
    expect(card).toMatch(/clip-path:\s*inset\(0 0 0 calc\(100% - 340px\) round 20px\)/);
    expect(rule(".qcv-xp-card--in")).toMatch(/clip-path:\s*inset\(0 round 20px\)/);
    expect(card).toMatch(/transition:\s*clip-path 380ms cubic-bezier\(0\.2, 0\.75, 0\.2, 1\)/);
    expect(card, "an opacity transition would make it a new card").not.toMatch(/transition:[^;]*opacity/);
    /* …and none of it under reduced motion, with the card at its final clip rather than its first */
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.qcv-xp-card \{ transition: none; clip-path: inset\(0 round 20px\); \}/);
  });
  it("⚠️ the sheet states no top, left, width or height — the box is MEASURED off the window", () => {
    const card = rule(".qcv-xp-card");
    /* ⚠️ ANCHORED AT A PROPERTY BOUNDARY, or `min-height: 0` reads as a stated `height` — the same
       prefix-match fault this repo records against class-name locks, in a stylesheet. */
    for (const prop of ["top", "left", "right", "bottom", "width", "height"]) {
      expect(card, `${prop} is stated in CSS as well as measured`).not.toMatch(new RegExp(`(^|[;{\\s])${prop}\\s*:`));
    }
    /* …and the two that ARE stated are the floors, which are not a position */
    expect(card).toMatch(/min-height:\s*0/);
    /* ⚠️ RETARGETED IN v65.2 §2 — IT USED TO READ `expandedBox(win, window.innerWidth)`. The claim
       was never about `innerWidth`: it is that every term of this box is MEASURED. Now that the page
       is centred at 1480 the card's horizontal extent belongs to the GROUP, not the screen, so the
       second term is the group's own rect and the first is still the window capsule's. Both are
       read; neither is stated. Widening from the viewport would have put the card's right edge
       against the screen with the ledger hundreds of pixels to its left. */
    expect(src, "the card must read the window capsule's own box").toContain("const win = readWindow(");
    expect(src, "the card's width must come from the group it belongs to").toMatch(/expandedBox\(win, \{ left: gb\.left, right: gb\.right \}, window\.innerHeight\)/);
    /**
     * ⚠️ §4.1 · THE HEIGHT IS THE VIEWPORT'S, AND THIS CASE USED TO FORBID THAT. The card is an
     * OVERLAY on a dimmed page and sits OVER the shell's bar, so the window capsule is not its
     * frame — which is the one condition under which the house viewport law does not apply. The
     * exception is NAMED here rather than left as a silently loosened assertion: the viewport may
     * supply the HEIGHT and nothing else, and the edges are still the group's.
     */
    expect(src, "only the height may come from the viewport").not.toMatch(/window\.innerWidth/);
    expect(src, "and it comes from there deliberately").toMatch(/window\.innerHeight/);
    expect(src, "a viewport width would run it off the screen when the sidebar collapses").not.toMatch(/100vw/);
    /**
     * ⚠️ AND IT FINDS THE WINDOW THROUGH THE DOCUMENT, BECAUSE IT IS A PORTAL. Walking UP from a
     * card rendered into `document.body` never reaches the shell: `closest` returned nothing, the
     * box came back null, and the card drew itself at the viewport's top-left — measured at top 0
     * against the rail's 137.8. The fallback lives in `readWindow`, so every caller gets it.
     */
    const rail = read("src/components/queries/centre/QcRail.tsx");
    expect(rail).toContain('el?.closest(".ws-window") ?? document.querySelector(".ws-window")');
    expect(src, "it must go through the shared reader rather than walking up itself").not.toContain('closest(".ws-window")');
  });
  it("⚠️ BOTH scrollers are locked — the shell's stage AND this page's own", () => {
    /* `lockStageScroll` reaches the stage, which is what every overlay in this app has needed since
       the AppShell migration. The Query Centre does not scroll there: its page scrolls inside
       `.wpg-scroll`, and a wheel over the backdrop moved the ledger behind the card. The shared
       lock was applied and correct, and the page scrolled anyway. */
    expect(src).toContain("lockStageScroll()");
    /* ⚠️ THE LOCK HALF, NOT JUST THE SELECTOR. Checking for `.wpg-scroll` alone passes on a
       component that only RELEASES it — the release names the same selector, so deleting the lock
       reddened nothing until this asserted the assignment. */
    expect(src).toMatch(/port\.style\.overflow = "hidden";/);
    expect(src).toContain('closest(".wpg-scroll")');
    /* never the body's own overflow — the fault `stageScroll` exists to have replaced */
    expect(src).not.toMatch(/body\.style\.overflow|document\.body\.style/);
    /* ⚠️ AND THE RELEASE RESTORES THE EMPTY STRING rather than a captured value, so a second lock
       or a route change between the two halves cannot wedge it. */
    expect(src).toMatch(/el\.style\.overflow = "";/);
    expect(src, "a captured value is how a lock gets wedged").not.toMatch(/const \w*[Pp]rev\w*\s*=\s*\w+\.style\.overflow/);
  });
  it("⚠️ Escape is CAPTURED and stopped here — one key must not do two things", () => {
    /* the page's own Escape closes an open query; this is a modal over it */
    expect(src).toMatch(/addEventListener\("keydown", onKey, true\)/);
    expect(src).toContain("stopImmediatePropagation()");
  });
  it("the backdrop dims and is a way out, like the ✕", () => {
    expect(rule(".qcv-xp-back")).toMatch(/background:\s*rgba\(28, 19, 15, 0\.22\)/);
    expect(src).toMatch(/data-qcv="xp-back"[^>]*onClick=\{close\}/s);
  });
});

/**
 * ⚠️ RETIRED IN v65.2 §6 — "§8.1 · the Courier's column" AND EVERYTHING IT ASSERTED. The column was
 * v65.1 phase 1's whole subject: the names column's width, from the tray's top edge down through
 * the date row, holding the drawing, the ✕ and the controls, with negative margins cancelling the
 * tray's padding and carrying on by `--qcv-xp-ext`. §6 replaces it wholesale — a two-column tray,
 * the head placed from the title's measured width, the controls on white, and a date row that is
 * white rather than a continuation of the tray's colour (§1.5).
 *
 * The cases are not weakened, they are about a thing that no longer exists; what replaces them is
 * below, and the geometry is measured in `qcV65.measure.ts` because that is the artefact that can
 * carry it.
 */
describe("§4.2 · the expanded header, layout A", () => {
  it("the tray states its own box and POSITIONS EVERYTHING ABSOLUTELY inside it", () => {
    const tray = rule(".qcv-xp-tray");
    expect(tray).toMatch(/margin: 18px 22px 0/);
    expect(tray).toMatch(/height: 166px/);
    expect(tray).toMatch(/position: relative/);
    expect(tray).toMatch(/border-radius: 18px/);
    expect(tray).toMatch(/background: var\(--be-accent\)/);
    /* ⚠️ A GRID WAS RIGHT FOR TWO THINGS SIDE BY SIDE AND IS WRONG FOR SEVEN AT STATED OFFSETS —
       a grid that has to produce those is a grid with a hole in it for every one of them. */
    expect(tray, "layout A places its children, not its tracks").not.toMatch(/grid-template-columns/);
    /* ⚠️ THE TRAY DOES NOT CLIP; the clip layer does. The ✕'s focus ring reaches outside it. */
    expect(tray, "the tray clips, so it will cut the focus ring").not.toMatch(/overflow:\s*hidden/);
    const clip = rule(".qcv-xp-clip");
    expect(clip).toMatch(/overflow: hidden/);
    expect(clip).toMatch(/border-radius: 18px/);
    expect(clip).toMatch(/pointer-events: none/);
  });
  it("§4.2 · every one of layout A's seven placements, from the tray's own edges", () => {
    expect(rule(".qcv-xp-ttl"), "title top-left").toMatch(/left: 30px; top: 26px/);
    expect(rule(".qcv-xp-ttl")).toMatch(/font-size: 46px/);
    expect(rule(".qcv-xp-ttl"), "a title that wrapped would sit over the picture").toMatch(/white-space: nowrap/);
    expect(rule(".qcv-xp-find"), "Find is 200 × 32 inside the ✕").toMatch(/top: 16px; right: 60px/);
    expect(rule(".qcv-xp-find")).toMatch(/width: 200px; height: 32px/);
    expect(rule(".qcv-xp-find")).toMatch(/border-radius: 16px/);
    expect(rule(".qcv-xp-x"), "the ✕ is 32px at the corner").toMatch(/top: 16px; right: 16px/);
    expect(rule(".qcv-xp-x")).toMatch(/width: 32px; height: 32px/);
    expect(rule(".qcv-xp-hawk"), "the head is bottom-left in layout A").toMatch(/left: 26px; top: 82px/);
    expect(rule(".qcv-xp-hawk")).toMatch(new RegExp(`width: ${HEAD_W}px`));
    expect(rule(".qcv-xp-stats"), "the cards sit along the foot").toMatch(/bottom: 18px/);
    expect(rule(".qcv-xp-stats")).toMatch(/gap: 10px/);
    expect(rule(".qcv-xp-time"), "the time controls are right-aligned at the foot").toMatch(/right: 20px; bottom: 25px/);
  });
  /**
   * ⚠️ THE MEASURED-TEXT LAW SURVIVED, AND ITS SUBJECT MOVED. In v65.2 the head sat beside the
   * title and had to be placed from the title's measured right edge; layout A puts the head
   * bottom-left, and the title's neighbour is now "today & next up". A constant here would be right
   * for one string, at one size, in the one font that happened to be loaded when it was measured.
   */
  it("§4.2 · today & next up is placed from the title's MEASURED width, never a constant", () => {
    const sub = rule(".qcv-xp-sub");
    expect(sub).toMatch(/left: calc\(30px \+ var\(--qcv-xp-tw, \d+px\) \+ 24px\)/);
    expect(sub).toMatch(/top: 32px/);
    expect(sub, "it stops 280px short of the tray's right, where Find begins").toMatch(/right: 280px/);
    /* ⚠️ AND THE HEAD IS A CONSTANT NOW, which is only right because nothing measured is beside it */
    expect(rule(".qcv-xp-hawk"), "the head no longer follows the title").not.toMatch(/--qcv-xp-tw/);
    /**
     * …and the card is what publishes it, once the face has landed.
     *
     * ⚠️ THIS HALF IS THE MECHANISM, NOT THE BEHAVIOUR, AND A MUTATION PROVED THE DIFFERENCE.
     * Guarding the write into deadness leaves every string here intact and this case green, because
     * a source lock can only see that the code was WRITTEN. What catches it is the rendered
     * assertion in `qcV65.measure.ts`.
     */
    expect(src).toMatch(/card\.style\.setProperty\("--qcv-xp-tw"/);
    expect(src, "a zero reading would put the sentence under the title's first letter").toMatch(/if \(w > 0\)/);
    expect(src, "the fallback font's width is a real number about the wrong font").toMatch(/document\.fonts\?\.ready\?\.then\(put\)/);
  });
  it("§4.2 · the count cards are compact: 118 × 54, the figure beside two lines", () => {
    const stat = rule(".qcv-xp-stat");
    expect(stat).toMatch(/width: 118px; height: 54px/);
    expect(stat).toMatch(/border-radius: 12px/);
    expect(stat, "a two-column grid, the count spanning both rows").toMatch(/grid-template-columns: auto minmax\(0, 1fr\)/);
    expect(rule(".qcv-xp-n")).toMatch(/grid-row: 1 \/ 3/);
    expect(rule(".qcv-xp-n")).toMatch(/font-size: 26px/);
    expect(css, "wider from 1500, where the tray has the room").toMatch(/@media \(min-width: 1500px\)[^}]*\.qcv-xp-stat \{ width: 156px/);
    /* ⚠️ AND THEY ARE A FIXED WIDTH NOW, not `flex: 1 1 0` — layout A gives them a stated place at
       the tray's foot rather than a share of a row, and a card that grew would reach the controls. */
    expect(stat, "a growing card would run into the time controls").not.toMatch(/flex: 1 1 0/);
  });
  it("§6 · the ✕ is a ring at the tray's top right, above the picture", () => {
    const x = rule(".qcv-xp-x");
    expect(x).toMatch(/top: 16px; right: 16px/);
    expect(x).toMatch(/width: 32px/);
    expect(x).toMatch(/z-index: 4/);
    expect(x).toMatch(/background: none/);
    expect(x).toMatch(/box-shadow: inset 0 0 0 1px var\(--be-mute\)/);
    /* ⚠️ THE PICTURE SITS AT `z-index: 0` AND EVERY WORD ABOVE IT. In layout A the head is
       bottom-left, under the count cards' row, so "claims no stacking order" is no longer enough —
       it has to claim the LOWEST one, and each text layer above it is asserted by name below. */
    expect(rule(".qcv-xp-hawk")).toMatch(/z-index: 0/);
    for (const sel of [".qcv-xp-ttl", ".qcv-xp-sub", ".qcv-xp-stats", ".qcv-xp-find", ".qcv-xp-time"]) {
      const z = /z-index:\s*(\d+)/.exec(rule(sel))?.[1];
      expect(z, `${sel} states no stacking order, so the drawing may climb over it`).toBeTruthy();
      expect(Number(z), `${sel} is not above the picture`).toBeGreaterThan(0);
    }
    /* ⚠️ DRAWN, NOT TYPED — the same rule the rail's ⤢ needed: a glyph a font may not have is a
       picture that may not arrive, and this one is the only way out of the view. */
    expect(src).toMatch(/data-qcv="xp-close"[\s\S]{0,260}<svg/);
  });
  /**
   * §6 — FILTER, SORT AND ↺ ARE AN OVERLAY IN THE DATE ROW'S TOP LANE, not a row in the flow.
   *
   * ⚠️ A FLOW ROW BENEATH THE TRAY WAS THE FIRST CUT AND IT WAS WRONG IN TWO WAYS. It pushed the
   * date row down by its own height, and it put the controls outside the one element that survives
   * a rebuild — the rows are rewritten on every zoom, filter and group change, and the lane is not.
   * The measurement caught it: the cluster read 42px ABOVE the tray's foot, from a `bottom: 10px`
   * left over from its life at the Courier's column.
   */
  it("§5–§6 · Filter, Sort and ↺ ride the date row's CORNER CELL, over the names", () => {
    /**
     * ⚠️ THE LANE THEY USED TO RIDE HAS NO HEIGHT NOW (§5). It was a 52px row above the dates; the
     * date row carries its own 60px with a corner cell inside it, so a second row would be 52px of
     * white nobody asked for. The cluster therefore sits in the CORNER, which is what §6 asks for
     * and what makes "over the names" a structural fact rather than an offset that happens to land.
     */
    const tl = read("src/components/queries/centre/qcvTimeline.css");
    const corner = /\.qcv-tl-corner \{([^}]*)\}/.exec(tl)?.[1] ?? "";
    /* §7 — ONE NUMBER: the row's height IS the group bands' sticky offset, so a band cannot slide
       under the dates or float below them. Four rules read it. */
    expect(/(?:^|\n)\s*\.qcv-tl \{([^}]*)\}/.exec(tl)?.[1] ?? "").toMatch(/--qcv-tl-daterow-h: 60px/);
    expect(corner, "the corner is sticky-left, or the dates run out from under it").toMatch(/position: sticky/);
    expect(corner).toMatch(/left: 0/);
    expect(corner).toMatch(/width: var\(--qcv-tl-names\)/);
    expect(corner).toMatch(/height: var\(--qcv-tl-daterow-h\)/);
    /* ⚠️ OPAQUE. The dates pass UNDER it, so a transparent corner is a column of dates behind the
       controls — the same claim the names cell carries one row down. */
    expect(corner).toMatch(/background: #fff/);
    /* …and it is handed the controls as a slot rather than positioned against them from outside */
    expect(src).toMatch(/leftControls=\{<QcCalControls/);
    expect(read("src/components/queries/centre/QcTimeline.tsx")).toMatch(/data-qcv="tl-corner">\{leftControls\}/);
    /* §5 — the lane survives as a zero-height overlay for what must not scroll with the dates */
    const lane = /\.qcv-tl-lane \{([^}]*)\}/.exec(tl)?.[1] ?? "";
    expect(lane).toMatch(/height: 0/);
  });
  it("⚠️ the Courier's column, its drawing and its extent are GONE, not merely unmounted", () => {
    for (const dead of [".qcv-xp-col", ".qcv-xp-art"]) expect(css, `${dead} outlived the column it styled`).not.toContain(dead);
    expect(src, "the Courier is still imported").not.toContain("COURIER_CUTOUT");
    /* ⚠️ AND THE PUBLICATION GOES WITH ITS READER. A token nobody reads is a knob the next person
       goes looking for — this repo has paid for one of those already. */
    expect(read("src/components/queries/centre/QcTimeline.tsx"), "--qcv-xp-ext outlived the column it sized").not.toContain("--qcv-xp-ext");
    expect(css).not.toContain("--qcv-xp-ext");
    expect(css, "the one-block ground outlived the date row it ran into").not.toContain("--qcv-xp-lcol");
  });

  /**
   * ⚠️ THE CARD LABELS ARE LOWERCASED BY THE SHEET, NOT BY THE STRING. The mock types them in lower
   * case; `ATTENTION_LABEL` is also a group heading and a Filter option, where "overdue" reads as a
   * mistake. A sentence-case string can be quietened by a stylesheet; a shouting one cannot, which
   * is why the due column's strings go the other way.
   */
  it("§6 · the stat cards' labels are lowercased by the sheet, and the string stays sentence case", () => {
    expect(rule(".qcv-xp-nm")).toMatch(/text-transform:\s*lowercase/);
    expect(ATTENTION_LABEL.overdue, "the string is read by the group headings and the Filter too").toBe("Overdue");
  });

});

describe("§8.2 · the title and the stat cards", () => {
  it("§4.2 · the title is 46px typewriter on one line, at the tray's top left", () => {
    /* ⚠️ IT IS PLACED NOW, NOT CENTRED. v65.1 centred it on the tray because the tray was a grid
       with two columns; layout A states its corner, so the mechanism is a position rather than an
       alignment — and the equality of midpoints that case asserted no longer describes anything. */
    const t = rule(".qcv-xp-ttl");
    expect(t).toMatch(/font-size:\s*46px/);
    /* ⚠️ `!important`: the title is an `<h2>` and `brand.tsx` forces headings to the serif at
       runtime, also with `!important`. Without it the typewriter title renders in Playfair. */
    expect(t).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
    expect(t).toMatch(/white-space:\s*nowrap/);
    expect(t).toMatch(/left: 30px; top: 26px/);
  });
  it("three cards, Overdue in ink, a group at zero drawn and faded", () => {
    expect(rule(".qcv-xp-stat")).toMatch(/width: 118px; height: 54px/);
    expect(rule(".qcv-xp-stat--overdue")).toMatch(/background:\s*var\(--qcv-ink\)/);
    expect(rule(".qcv-xp-stat--overdue .qcv-xp-n, .qcv-xp-stat--overdue .qcv-xp-nm")).toMatch(/color:\s*#f5f1eb/);
    /* ⚠️ A GROUP WITH NOTHING IN IT IS DRAWN, NOT HIDDEN — a row of three that sometimes has two
       teaches a reader the set changes, when what changed is one number */
    expect(rule(".qcv-xp-stat--none")).toMatch(/opacity:\s*0\.45/);
    /**
     * ⚠️ RETARGETED IN PHASE 6, AND THE CLAIM IS THE SAME ONE: a group at zero is drawn and cannot
     * be acted on. It was `aria-disabled` on a `div`, which was all a non-interactive card could
     * say; the cards are buttons now that they are the filter, so the honest form is the real
     * attribute — which also stops the click rather than only announcing that it should not happen.
     */
    expect(src).toContain("disabled={count === 0}");
    expect(src, "the card is still DRAWN at zero — only inert").not.toMatch(/count === 0 \?\s*null/);
  });
  it("⚠️ the name and the hint MAY WRAP — at 1280 a card is 87px and 'Watch and wait' does not fit", () => {
    expect(rule(".qcv-xp-nm"), "a nowrap here makes the card a scrollbar").not.toContain("nowrap");
    expect(rule(".qcv-xp-hint")).not.toContain("nowrap");
    /* the hints are the lib's, so the header and the groups cannot disagree about what they mean */
    for (const h of Object.values(ATTENTION_HINT)) expect(src.includes("ATTENTION_HINT"), h).toBe(true);
  });
});

/* ── §8.4–§8.9 · the body ───────────────────────────────────────────────────────────────────── */

describe("the timeline", () => {
  const tlCss = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const tlRule = (sel: string) => {
    const m = tlCss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  /**
   * ⚠️ THE CLOCK IS FROZEN AT OPEN, and the reason is the sharpest lesson of this phase. `nowMs`
   * arrives as `Date.now()` written inline at the mount, so it is a NEW value on every render of
   * the page; every memo in the body rebuilt each time, and the animation frame that places the
   * initial scroll was cancelled by its own effect re-running before it could fire. The view opened
   * two and a half years in the past with `scrollLeft` at 0 — and all twenty-five cases passed,
   * because the line, the pill and twenty-four bar ends all agreed with each other out there.
   */
  it("⚠️ the expanded card freezes its clock, and EVERY derivation reads that rather than the prop", () => {
    expect(src).toMatch(/const \[clock\] = useState\(\(\) => nowMs\);/);
    expect(src).toMatch(/<QcTimeline[^>]*nowMs=\{clock\}/);
    expect(src, "a live clock here re-derives everything on every parent render").not.toMatch(/<QcTimeline[^>]*nowMs=\{nowMs\}/);
    /**
     * ⚠️ STATED AS A SWEEP RATHER THAN AS ONE CALL SITE, because phase 6 moved the one it used to
     * name. It required `eyeGroups(rows, clock)`; grouping is `groupRows`' job now and it runs
     * inside the body, so a lock on that spelling would have gone red over a change that touched
     * nothing about the clock. The LAW is that `nowMs` is read exactly once — to seed `clock` — and
     * that is what a sweep can say and a call site cannot.
     */
    const body = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    /* the prop's own NAME is not a read of it: `nowMs:` declares the type and `nowMs={` passes
       something to a child, which here is `clock`. Both are excluded by name rather than by a
       looser pattern, so a real `nowMs === …` comparison would still be counted. */
    const reads = [...body.matchAll(/\bnowMs\b(?![:=])/g)].length;
    expect(reads, `nowMs is read ${reads} times; it may only be destructured and used to seed the clock`).toBeLessThanOrEqual(2);
    expect(body).toContain("attentionCounts(rows, clock)");
  });
  it("⚠️ …and the initial scroll is CONFIRMED, not assumed — a clamped write reports nothing", () => {
    /* `scrollLeft` set before the track's thousands of pixels exist is clamped to zero and lost
       silently. It is read back and retried on the next frame. */
    expect(tlSrc).toMatch(/if \(Math\.abs\(node\.scrollLeft - want\) < 1\)/);
    expect(tlSrc).toMatch(/requestAnimationFrame\(\(\) => \{ if \(!put\(\)\) requestAnimationFrame\(put\); \}\)/);
  });
  /**
   * ⚠️ AND ITS DEPS ARE ONE NUMBER, because an effect that depends on a value rebuilt every render
   * CANCELS ITS OWN ANIMATION FRAME FOR EVER. Written `[boxW, ext, pxd, nowMs, focusId, tl]` it
   * looked exhaustive and correct; `rows` arrives as a fresh array from the page's render, so `ext`
   * and `tl` were new objects every time, the cleanup cancelled the frame the effect had just
   * armed, and the next render armed another. Twenty-five cases stayed green and the view opened
   * two and a half years in the past.
   */
  it("⚠️ the placement's effect depends on a NUMBER, and reads the rest from a ref when it fires", () => {
    const at = tlSrc.indexOf("const placedFor = useRef<string | null>(null);");
    expect(at, "the placement has moved").toBeGreaterThan(-1);
    const block = tlSrc.slice(at, tlSrc.indexOf("const pan = ", at));
    /**
     * ⚠️ THE DEPS ARE PRIMITIVES, which is the whole of the rule this case states. `ext` itself is a
     * fresh object every render and putting IT here is what cancelled the animation frame for ever;
     * its `fromMs` and (since §A1) its `toMs` are numbers, and they change only when the extent
     * really moves — which is exactly when the view needs placing again.
     */
    expect(block, "the deps are objects that change identity every render").toMatch(/\}, \[boxW, rows\.length, ext\.fromMs, ext\.toMs\]\);/);
    expect(block, "`ext` itself would be a new object on every render").not.toMatch(/\}, \[[^\]]*[^.]\bext\b[^.][^\]]*\]\);/);
    /**
     * ⚠️ AND IT WAITS FOR ROWS. With no data the extent is three weeks wide, today's x is about 220
     * and `scrollForToday` correctly answers ZERO; the write then succeeds — 0 is 0 — `placed`
     * records a success, and the view never places itself again once fifty queries arrive and the
     * track becomes twelve thousand pixels long. A guard that fires against an empty account locks
     * in an answer that was right for nothing. Found by instrumenting the component after three
     * wrong diagnoses; the trace read `put:want=0,got=0` followed by `placed=true`.
     */
    expect(block, "it places itself against an empty account and records that as done").toContain("rows.length === 0");
    /* ⚠️ AND IT RE-PLACES WHEN THE EXTENT MOVES, unless the reader has touched the track: rows can
       arrive in more than one batch, and a scroll placed against a first batch of recent queries is
       the extent's START once the older ones land. */
    /**
     * ⚠️ AND THE KEY IS THE EXTENT **AND THE MEASURED WIDTH**. A `clientWidth` read before the card
     * has laid out is the CONTENT's width, not the box's — measured on a re-open, 12050 where the
     * box is 1128 — so the placement is computed against a 11750px viewport, lands two years early,
     * SUCCEEDS its own check, and is recorded as done. Keying on the pair lets a corrected width
     * re-place; keying on the extent alone cannot, because the extent never changed.
     */
    expect(block).toContain("const key = `${ext.fromMs}:${ext.toMs}:${boxW}`;");
    expect(block).toContain("if (placedFor.current === key) return undefined;");
    expect(block, "a success must record the width it was placed against").toMatch(/placedFor\.current = `\$\{L\.ext\.fromMs\}:\$\{L\.ext\.toMs\}:\$\{L\.boxW\}`/);
    expect(block).toContain("if (touched.current ||");
    expect(tlSrc, "every deliberate move marks the view as the reader's").toMatch(/const mine = useCallback\(\(\) => \{ touched\.current = true; \}, \[\]\);/);
    expect((tlSrc.match(/\bmine\(\);/g) ?? []).length, "the wheel, the pan, the zoom, the glide and Today").toBeGreaterThanOrEqual(5);
    expect(block, "it must read the live values at the moment it fires").toContain("const L = latest.current;");
    expect(tlSrc).toMatch(/const latest = useRef\(\{ ext, pxd, boxW, nowMs, focusId, tl \}\);/);
  });
  it("⚠️ §4.2 · the time controls are ONE element in two homes — never two copies", () => {
    /**
     * ⚠️ THE CLAIM CHANGED WITH THE LAYOUT, AND THE FAULT IT GUARDS DID NOT. In the mockup these
     * lived inside the axis and a re-render lost them; v65.2 made them a sibling of the scroller in
     * the lane. Layout A wants them in the TRAY, which is a different component — so they are
     * rendered ONCE here, beside the scroll state they drive, and PORTALLED into the tray's host.
     *
     * Two `Today` buttons would be two controls that have to agree about one scroller, and the
     * second one written is the one that forgets. The ordering claim is therefore replaced by a
     * counting one: the source builds the cluster exactly once.
     */
    expect((tlSrc.match(/data-qcv="tl-controls"/g) ?? []).length, "two copies of the time controls").toBe(1);
    expect((tlSrc.match(/data-qcv="tl-today"|className="qcv-tl-today"/g) ?? []).length, "two Today buttons").toBe(1);
    expect(tlSrc, "the controls must be built as a value, so one element can have two homes").toMatch(/const timeControls = \(/);
    expect(tlSrc, "…and placed by a portal where a host is given").toMatch(/timeHost \? createPortal\(timeControls, timeHost\) : timeControls/);
    /**
     * ⚠️ AND THE HOST UNDOES THE LANE'S POSITIONING, because a portal carries its own rules with it.
     * `.qcv-tl-controls` is absolutely placed for the lane, so inside the tray it put itself 318px
     * from the TRAY's left and overflowed the card — which made the CARD scrollable (`overflow:
     * hidden` hides overflow and still scrolls), and the first click on a zoom button scrolled it
     * 235px to bring the focused control into view, moving everything else in the card with it.
     */
    expect(rule(".qcv-xp-time .qcv-tl-controls")).toMatch(/position:\s*static/);
    /* and they are still OUTSIDE the scroller wherever they land, so a rebuild cannot take them */
    const controls = tlSrc.indexOf("{timeHost ? createPortal");
    const scroll = tlSrc.indexOf('data-qcv="tl-scroll"');
    expect(controls, "the controls are inside the scroller").toBeLessThan(scroll);
  });
  it("⚠️ §8.4 · the today line is placed from the ROWS' own track — one derivation, not three", () => {
    /* the line, the TODAY pill and an overdue bar's end all come from `xAt` against the same extent
       and the same scale, so they meet on the same pixel at every zoom because they are ONE
       derivation. Padding arithmetic is how the mockup's line came to sit beside the pill. */
    expect(tlSrc).toMatch(/const todayX = xAt\(ext, pxd, new Date\(nowMs\)\.setHours\(0, 0, 0, 0\)\);/);
    expect(tlSrc).toMatch(/data-qcv="tl-todayline"[^>]*style=\{\{ left: NAMES_W \+ todayX \}\}/s);
    expect(tlSrc).toMatch(/data-qcv="tl-todaypill"[^>]*style=\{\{ left: todayX \}\}/s);
    /* and nothing here computes an x any other way */
    expect(tlSrc, "a second way of turning a date into a pixel").not.toMatch(/PX_PER_DAY|\/ DAY\) \* \d/);
  });
  it("⚠️ §8.6 · the names cell is sticky AND opaque", () => {
    const n = tlRule(".qcv-tl-names");
    expect(n).toMatch(/position:\s*sticky/);
    expect(n).toMatch(/left:\s*0/);
    /* a transparent sticky cell has the dates scrolling visibly behind the names */
    expect(n).toMatch(/background:\s*#fff/);
    expect(n).toMatch(/border-right/);
  });
  it("§8.7 · a bar's overrun and its hollow stretch are CHILDREN of the bar", () => {
    /* two sibling bars would fight over hover and let a reader point "between" one query's pieces */
    const bar = tlSrc.slice(tlSrc.indexOf('data-qcv="tl-bar"'), tlSrc.indexOf("</button>", tlSrc.indexOf('data-qcv="tl-bar"')));
    expect(bar).toContain('data-qcv="tl-over"');
    expect(bar).toContain('data-qcv="tl-ahead"');
    expect(tlRule(".qcv-tl-over")).toMatch(/position:\s*absolute/);
    expect(tlRule(".qcv-tl-ahead"), "the stretch beyond today is hollow, not filled").toMatch(/background:\s*rgba\(255, 255, 255, 0\.68\)/);
  });
  it("§8.7 · the nudge chip and the action ghost are the lib's decision, not the view's", () => {
    expect(tlSrc).toContain("{t.nudge && (");
    expect(tlSrc).toContain("{t.ghost && (");
    /* the view must not decide WHO gets a chip — that is `tlRow`'s, and it is locked there */
    expect(tlSrc, "the view is deciding whose bar gets a chip").not.toMatch(/tileCourt|isWithYou/);
  });
  /**
   * ⚠️ RETARGETED IN v65.2 §10 — IT PINNED THE SELECTOR STRING, AND THE LIST GREW. §10 adds a
   * popover and the lane's left-hand cluster to what the crosshair hides over, so a lock matching
   * the three-item literal went red over a change that made its own claim MORE true. The claim is
   * the MEMBERSHIP, not the spelling, and it is asserted per element in "§10 · it hides over
   * everything a reader could be looking at instead" below.
   */
  it("⚠️ §8.9 · the crosshair's today tag is rust", () => {
    expect(tlRule(".qcv-tl-tag--today")).toMatch(/background:\s*var\(--qcv-rust\)/);
  });
  it("⚠️ THE v21 CALENDAR IS DELETED, not left unmounted — its replacement is here", () => {
    for (const f of ["src/components/queries/centre/QcCalendar.tsx", "src/components/queries/centre/qcvCalendar.css", "src/lib/qcCalendar.ts"]) {
      expect(existsSync(join(process.cwd(), f)), `${f} is still in the tree`).toBe(false);
    }
  });
});

/* ── §8.1 / §8.3 · Filter, Sort and Reset ───────────────────────────────────────────────────── */

describe("§8.1 · the controls at the column's foot", () => {
  const ctl = read("src/components/queries/centre/QcCalControls.tsx");

  /**
   * §6 — THE COMPACT SET, because there are THREE buttons and a ↺ in a 330px corner now. At 40px
   * tall with 17px of padding and a 1px edge the cluster is wider than the column it sits in; and
   * an outline on a control that sits on white beside two others reads as three boxes rather than
   * one row. The ref's own: 34 tall, 9px padding, 12.5px type, no border, `#f7f3ee`.
   */
  it("§6 · the buttons are 34px, borderless #f7f3ee, 20px corners, typewriter 12.5px — and no shadow", () => {
    const b = rule(".qcv-xp-btn, .qcv-xp-reset");
    expect(b).toMatch(/height:\s*34px/);
    expect(b).toMatch(/border-radius:\s*20px/);
    expect(b).toMatch(/border:\s*0/);
    expect(b).toMatch(/background:\s*#f7f3ee/);
    expect(b).toMatch(/font-size:\s*12\.5px/);
    expect(b).toMatch(/padding:\s*0 9px/);
    expect(b).toMatch(/font-family:\s*var\(--qcv-type\)/);
    expect(b, "§8.1 says no shadow").not.toContain("box-shadow");
    /* the ↺ is a 30px disc, smaller than the three it follows */
    expect(rule(".qcv-xp-reset")).toMatch(/width:\s*30px/);
    expect(rule(".qcv-xp-reset")).toMatch(/height:\s*30px/);
  });
  /**
   * ⚠️ RETIRED IN v65.2 §6 — "the cluster is CENTRED ON THE COLUMN, so the reset appearing
   * re-centres all three". It filled the Courier's column and centred its contents, which was
   * right: a cluster pinned by one edge would shunt the pair sideways the moment ↺ arrived. §6
   * retires the column and pins the cluster to the card's own inner LEFT, in the date row's lane —
   * so the reset now appears to the right of Sort and nothing moves when it does, which is the
   * same concern answered by the opposite arrangement. The claim lives in "§6 · Filter, Sort and ↺
   * ride the date row's lane" above.
   */
  it("§6 · each of the THREE buttons goes ink while open OR while its own settings differ — and ↺ for any", () => {
    expect(ctl).toMatch(/filterOn \|\| menu === "filter"/);
    expect(ctl).toMatch(/groupOn \|\| menu === "group"/);
    expect(ctl).toMatch(/sortOn \|\| menu === "sort"/);
    expect(ctl).toMatch(/\{anyDiffers\(view\) && \(/);
    expect(rule(".qcv-xp-btn--on")).toMatch(/background:\s*var\(--qcv-ink\)/);
    expect(rule(".qcv-xp-btn--on")).toMatch(/color:\s*#f5f1eb/);
    /* the reset is rust on white, and rust-filled on hover */
    expect(rule(".qcv-xp-reset")).toMatch(/color:\s*var\(--qcv-rust\)/);
    expect(rule(".qcv-xp-reset:hover")).toMatch(/background:\s*var\(--qcv-rust\)/);
  });
  it("⚠️ ↺ resets the VIEW and nothing else — it never touches zoom or scroll", () => {
    expect(ctl).toMatch(/onClick=\{\(\) => \{ onView\(CAL_DEFAULT\); onMenu\(null\); \}\}/);
    /**
     * ⚠️ BOUNDED, BECAUSE `scrollTop` CONTAINS `scrollTo`. §D2 gives the Filter panel's body a
     * remembered vertical position, and a bare substring forbade it — a red on a correct file, over
     * a property that is not the API this claim is about. The claim is that the RESET does not move
     * the TRACK: `scrollTo(`, `scrollLeft`, the zoom and the pixels-per-day it is expressed in.
     */
    for (const forbidden of ["scrollLeft", "pxd", "zoom"]) {
      expect(ctl, `the reset must not reach ${forbidden}`).not.toContain(forbidden);
    }
    expect(ctl, "the reset must not reach scrollTo()").not.toMatch(/\bscrollTo\s*\(/);
  });
});

describe("§8.3 · one popover", () => {
  const ctl = read("src/components/queries/centre/QcCalControls.tsx");

  it("§6 · 300px, 12px corners, opening from the cluster's LEFT EDGE, over the names", () => {
    const p = rule(".qcv-xp-pop");
    expect(p).toMatch(/width:\s*300px/);
    /* §D1 — the sectioned Filter panel is 340 and states so in its OWN rule; Group and Sort keep
       the base width. One rule per selector, so the two widths cannot be read as a duplicate. */
    const f = rule('.qcv-xp-pop[data-menu="filter"]');
    expect(f).toMatch(/width:\s*340px/);
    expect(f, "the cap is the card's own box, 16 + header + corner + 16").toMatch(/max-height:\s*calc\(100vh - 380px\)/);
    expect(f, "head and foot stay put, so the panel is a column and the BODY scrolls").toMatch(/flex-direction:\s*column/);
    expect(rule(".qcv-xp-fbody"), "a flex child's min-height: auto is its content, so the foot leaves the screen")
      .toMatch(/min-height:\s*0/);
    expect(rule(".qcv-xp-fbody")).toMatch(/overflow-y:\s*auto/);
    expect(p).toMatch(/border-radius:\s*12px/);
    expect(p).toMatch(/top:\s*calc\(100% \+ 8px\)/);
    /* ⚠️ LEFT, NOT CENTRED. The cluster sat centred on the Courier's column; §6 puts it at the
       corner's left, where a centred panel hangs half of itself over the dates. */
    expect(p).toMatch(/left:\s*0/);
    expect(p, "a centring transform survived the move").not.toMatch(/transform:\s*translateX/);
    /**
     * ⚠️ THE DATE ROW'S STACKING AND THE PANEL'S ARE ONE MECHANISM. The rows are positioned and
     * later in the tree, so a panel that did not outrank them would paint BEHIND them — present,
     * correct and invisible. Asserted together, because either alone is meaningless.
     */
    const row = /(?:^|\n)\s*\.qcv-tl-daterow \{([^}]*)\}/.exec(read("src/components/queries/centre/qcvTimeline.css"))?.[1] ?? "";
    expect(+(/z-index:\s*(\d+)/.exec(row)?.[1] ?? 0)).toBeGreaterThan(5);
    expect(+(/z-index:\s*(\d+)/.exec(p)?.[1] ?? 0)).toBeGreaterThan(5);
  });
  it("⚠️ ONE panel with two contents — never two components agreeing to close each other", () => {
    /* one element, whose contents are chosen by the open menu */
    expect((ctl.match(/className="qcv-xp-pop"/g) ?? []).length).toBe(1);
    expect(ctl).toMatch(/\{menu && \(/);
    expect(ctl).toMatch(/menu === "filter" \? \(/);
  });
  it("§D1 · Filter's five sections, Group's one, Sort's one; and the words are the libs'", () => {
    /* §D1 — Status, Whose court, Attention, Next action due, Submission package */
    expect(ctl).toContain("Whose court");
    expect(ctl).toContain("Attention");
    expect(ctl).toContain("Next action due");
    expect(ctl).toContain("Submission package");
    expect(ctl).toContain("Clear all");
    expect(ctl).toContain("Group by");
    expect(ctl).toContain("Reset grouping");
    expect(ctl).toContain("Sort by");
    expect(ctl).toContain("Reset sort");
    expect(ctl).toContain("· flip");
    /* the options are read from the libs so the popover and the rows cannot name different sets */
    expect(ctl).toMatch(/EYE_FOCUS\.map/);
    expect(ctl).toMatch(/ATTENTION_ORDER\.map/);
    expect(ctl).toMatch(/GROUP_BY_OPTIONS\.map/);
    expect(ctl).toMatch(/SORT_BY_OPTIONS\.map/);
    expect(ctl, "a hand-written option list is how two surfaces come to disagree").not.toMatch(/"Watch and wait"/);
    expect(ctl, "the due windows are the lib's, not a second list of dates").toMatch(/DUE_OPTIONS\.map/);
    /**
     * ⚠️ AND THE STATUS AND PACKAGE LISTS ARE HANDED IN, NOT DERIVED HERE. The statuses come from
     * `stageOrder`, so the section runs in pipeline order and a live R&R brings its own row; the
     * packages come from `packageNames`, which is what the grouping already uses. A list built in
     * this component would be the one place in the app deciding for itself what the pipeline is.
     */
    expect(ctl).toMatch(/statuses\.map/);
    expect(ctl).toMatch(/packages\.map/);
    expect(ctl, "a second pipeline order here is a second answer").not.toMatch(/stageOrder\(/);
  });
  it("§D1 · the counts are FACETED, and the head, the badge and the foot are one derivation", () => {
    /**
     * ⚠️ AN OPTION'S COUNT IS "what would I have if I chose this as well" — every OTHER facet
     * applies and its own does not. With all five applied every unticked option in a narrowed facet
     * reads 0, which tells a reader that choosing any of them empties the list; with none applied
     * it ignores the filtering they have already done. Both are one argument from correct.
     */
    expect(ctl, "the panel must not recount: the card derives it once").not.toMatch(/facetCounts\(/);
    expect(ctl).toMatch(/facets\.status\[k\]/);
    expect(ctl).toMatch(/facets\.court\[f\.key\]/);
    expect(ctl).toMatch(/facets\.attention\[k\]/);
    expect(ctl).toMatch(/facets\.due\[o\.key\]/);
    expect(ctl).toMatch(/facets\.package\[n\]/);
    /* "Any time" is the ABSENCE of the facet, so it states no count — a number there reads as a
       sixth window rather than as no window at all */
    expect(ctl).toMatch(/o\.key !== "any" && <u>/);
    /* the head's "N active", the button's badge and "is anything filtering" are ONE function */
    expect(ctl).toMatch(/\{activeFacets\(view\)\} active/);
    expect(ctl).toMatch(/activeFacets\(view\) > 0 && <i className="qcv-xp-badge"/);
    expect(read("src/lib/qcCalView.ts")).toMatch(/filterDiffers = \(v: CalView\): boolean => activeFacets\(v\) > 0/);
    /* the foot states what is showing, from the same match as the rows */
    expect(ctl).toMatch(/\{facets\.shown\}<\/b> of \{facets\.total\}/);
  });
  it("⚠️ the checkbox and the card are ONE state, read and written through `toggleAttention`", () => {
    expect(ctl).toMatch(/aria-checked=\{view\.attention\.includes\(k\)\}/);
    expect(ctl).toMatch(/onView\(toggleAttention\(view, k\)\)/);
    /* …and the counts it shows are the whole pipeline's, handed in rather than re-derived here */
    expect(ctl).toMatch(/counts: Record<Attention, number>/);
    expect(ctl, "a second count in the popover is a second answer to one question").not.toContain("attentionCounts(");
  });
  it("⚠️ ESCAPE CASCADES FROM ONE HANDLER — the popover has no `document` listener of its own", () => {
    /**
     * Two capture-phase listeners on `document` are decided by REGISTRATION ORDER, which is a fact
     * about which element mounted last rather than about what is on screen. The card owns the key
     * and asks whether a panel is open first.
     */
    expect(ctl, "the popover must not listen for Escape itself").not.toContain("Escape");
    expect(src).toMatch(/if \(menuRef\.current\) \{ setMenu\(null\); return; \}/);
    /**
     * The dismissal idiom it DOES own: pointerdown outside, with the trigger counting as inside.
     * ⚠️ THE CLAIM IS THE IDIOM, NOT THE SPELLING. This pinned the call verbatim and went red over
     * §A5 adding a capture-phase argument — a change that makes the idiom MORE reliable, not less.
     * A lock that fails on an edit which strengthens what it guards is a lock that trains the next
     * reader to rebaseline it without looking.
     */
    expect(ctl).toMatch(/addEventListener\("pointerdown", onDown(, true)?\)/);
    expect(ctl, "the trigger counts as inside, or its button closes and reopens").toMatch(/ref\.current\?\.contains/);
    expect(ctl).toMatch(/!ref\.current\?\.contains\(e\.target as Node\)/);
  });
});

/**
 * §6 · GROUP IS ITS OWN CONTROL. It rode inside Sort's popover, where it lit the Sort button for a
 * setting Sort does not own and buried the page's most useful arrangement two clicks down.
 */
describe("§6 · the Group control", () => {
  const ctl = read("src/components/queries/centre/QcCalControls.tsx");

  it("§6 · three buttons in the corner, in order: Filter · Group · Sort, then ↺", () => {
    const order = ["xp-filter", "xp-group", "xp-sort", "xp-reset"].map((k) => ctl.indexOf(`data-qcv="${k}"`));
    expect(order.every((i) => i > 0), JSON.stringify(order)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("§6 · Group opens the SAME one panel, with its own contents", () => {
    /* still one element — the reason only one can be open is structural, not two components
       agreeing to close each other */
    expect((ctl.match(/className="qcv-xp-pop"/g) ?? []).length).toBe(1);
    expect(ctl).toMatch(/menu === "group" \? \(/);
    expect(ctl).toMatch(/aria-label=\{menu === "filter" \? "Filter" : menu === "group" \? "Group" : "Sort"\}/);
    expect(ctl).toMatch(/export type CalMenu = "filter" \| "group" \| "sort" \| null;/);
  });

  it("⚠️ §6 · Sort no longer carries the grouping — one section, and its reset touches only the sort", () => {
    const sortArm = ctl.slice(ctl.indexOf('data-qcv="xp-clearfilter"'));
    expect(sortArm, "Group by is still rendered inside Sort's arm").not.toContain("Group by");
    expect(ctl).toMatch(/onClick=\{\(\) => set\(\{ sortBy: CAL_DEFAULT\.sortBy, asc: CAL_DEFAULT\.asc \}\)\}/);
    expect(ctl, "Sort's reset still reaches the grouping").not.toMatch(/xp-clearsort[\s\S]{0,200}groupBy: CAL_DEFAULT\.groupBy/);
  });

  it("§6 · a Next-action band names the action and says what it is", () => {
    const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
    expect(tlSrc).toMatch(/\{g\.hint && <em>\{g\.hint\}<\/em>\}/);
    /* the hint is the GROUP's, never the view's — the other groupings carry none */
    expect(read("src/components/queries/centre/qcvTimeline.css")).toMatch(/\.qcv-tl-band em \{/);
  });
});

describe("§8.2 · the cards are the filter", () => {
  it("the ring is a shadow, never a border — a 2px border would move the card's content", () => {
    expect(rule(".qcv-xp-stat--on")).toMatch(/box-shadow:\s*0 0 0 2px var\(--qcv-ink\)/);
    /* ⚠️ and the ink card's ring is INSIDE it, because ink on ink is invisible */
    expect(rule(".qcv-xp-stat--overdue.qcv-xp-stat--on")).toMatch(/box-shadow:\s*inset 0 0 0 2px #f5f1eb/);
    expect(rule(".qcv-xp-stat--on"), "a border would nudge the row sideways").not.toContain("border");
  });
  it("⚠️ the fade is on the ROW, so one rule serves all three", () => {
    /* a per-card rule is how a card gets left bright because its own handler forgot */
    expect(rule(".qcv-xp-stats--filtered .qcv-xp-stat:not(.qcv-xp-stat--on)")).toMatch(/opacity:\s*0\.45/);
    expect(src).toMatch(/view\.attention\.length \? " qcv-xp-stats--filtered" : ""/);
  });
  it("the card is a button, multi-select, and click-again releases", () => {
    expect(src).toMatch(/aria-pressed=\{on\}/);
    expect(src).toMatch(/v\.attention\.includes\(k\) \? v\.attention\.filter\(\(a\) => a !== k\) : \[\.\.\.v\.attention, k\]/);
  });
});

describe("the sheet's own invariant", () => {
  /**
   * ⚠️ ONE BASE RULE PER SELECTOR, because `rule()` above takes the FIRST match. A selector declared
   * twice silently repoints every assertion at whichever block comes first while the browser paints
   * the last — the fault this repo has hit in three sheets, and hit again in this one during phase
   * 6, when `.qcv-xp-tray` and `.qcv-xp-stat` each gained a second block at the file's foot.
   */
  it("no selector is declared twice outside a media query", () => {
    const flat = css.replace(/@media[^{]*\{[\s\S]*?\n\}/g, "");
    const sels = [...flat.matchAll(/(?:^|\n)([^@\n{][^{\n]*)\{/g)].map((m) => m[1].trim());
    const dupes = sels.filter((s2, i) => sels.indexOf(s2) !== i);
    expect(dupes, `declared twice: ${dupes.join(" · ")}`).toEqual([]);
  });
});

describe("§8.9 · the crosshair tag's guard", () => {
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const tlCss = read("src/components/queries/centre/qcvTimeline.css");
  /**
   * ⚠️ THE GEOMETRY IS MEASURED ON THE PAGE (`qcV65.measure.ts`, §10 lock 7) — this is the half a
   * source lock can honestly carry.
   */
  it("§5 · the tag's left bound is the NAMES COLUMN, and the controls' clearance went with them", () => {
    /**
     * ⚠️ THE CLEARANCE WAS MEASURED OFF THE CONTROLS, AND THE CONTROLS LEFT THE LANE (§4.2). It was
     * `NAMES_W + 18 + <their measured width> + 8`, which was right while they sat there; with them
     * in the tray, keeping it would clamp the tag away from a strip of empty lane for no reason a
     * reader could see. What remains is the names column, which is OPAQUE and would hide the tag.
     *
     * The measured half of this claim lives in `qcV65.measure.ts`; this is the source half.
     */
    expect(tlSrc).toMatch(/const guard = NAMES_W \+ 8;/);
    expect(tlSrc, "a measurement of a cluster that is no longer in the lane").not.toMatch(/ctlW/);
    /* ⚠️ AND THE TRIGGER COMPARES THE TAG'S LEFT EDGE, NOT ITS CENTRE. The rule centres the tag, so
       a centre one pixel clear of the bound still puts half of it underneath — measured at 561.5
       against a bound of 591. The width is the tag's own, read off the element. */
    expect(tlSrc).toMatch(/const under = at - tagW \/ 2 < guard;/);
  });
  it("⚠️ …and under the controls it LEFT-ALIGNS — a clamped centre still puts half of it under them", () => {
    expect(tlCss).toMatch(/\.qcv-tl-tag \{[^}]*transform: translateX\(-50%\)/);
    expect(tlSrc).toMatch(/style=\{under \? \{ left: guard, transform: "none" \} : \{ left: at \}\}/);
    /* and the old one-sided clamp is gone rather than left beside the new one */
    expect(tlSrc, "the names-column-only clamp is superseded").not.toMatch(/Math\.max\(NAMES_W \+ 8,/);
  });
});

/**
 * ⚠️ RETIRED IN v65.2 §6 — "§8.1 · the Courier's column spans the tray AND the date row (v65.1)".
 * Four cases, and every one of them was about the column's EXTENT: that the timeline published the
 * distance from the lane's top to the date tier's foot, that the column stated no height of its
 * own, that its negative margins cancelled the tray's padding and carried on by that extent, and
 * that it was opaque because it had become the date row's corner cell.
 *
 * §6 retires the column, so all four are about a thing that does not exist. The lesson they were
 * written for is not lost and is stated where it now applies: the tray's height must not be set by
 * something sitting inside its padding — which is why §6's tray states `min-height` and nothing in
 * it states a height at all. What replaced them is `describe("§6 · the expanded header")` above,
 * and the geometry is measured in `qcV65.measure.ts`.
 */

describe("the dev review — d, e, f (v65.1)", () => {
  const tlCss = read("src/components/queries/centre/qcvTimeline.css");
  const tlRuleOf = (sel: string) => {
    const m = tlCss.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("d · the nudge chip is TYPEWRITER and lowercase — it is a sentence, not a system tag", () => {
    const chip = tlRuleOf(".qcv-tl-nudge");
    expect(chip).toMatch(/font-family:\s*var\(--qcv-type\)/);
    expect(chip, "mono uppercase is this page's grammar for a tag the app computed").not.toMatch(/text-transform:\s*uppercase/);
    expect(chip).not.toMatch(/font-family:\s*var\(--qcv-mono\)/);
    /* and the words are the lib's, with the envelope before them */
    const tlSrc2 = read("src/lib/qcTimeline.ts");
    /* the string is built, so the literal in the source is the tail of the template.
       §C3 — it carries two endings now, and the SWITCH is asserted in the lib's own spec against
       `CLOSE_OVER_DAYS` rather than pinned here as a string. */
    expect(tlSrc2).toContain("overdue · ${");
    expect(tlSrc2).toContain('"nudge or close" : "nudge"');
    expect(tlSrc2, "singulars agree — one day, not 1 days").toMatch(/overdueDays === 1 \? "day" : "days"/);
    expect(tlSrc2, "the app does not shout at the reader").not.toMatch(/OVERDUE · NUDGE/);
    expect(tlSrc2, "the app does not shout at the reader").not.toMatch(/NUDGE OR CLOSE/);
    expect(read("src/components/queries/centre/QcTimeline.tsx")).toMatch(/<span aria-hidden="true">✉<\/span> \{t\.nudge\.text\}/);
  });

  it("e · the rail's expand mark is DRAWN, never a character a font may not carry", () => {
    const be = read("src/components/queries/centre/QcBirdsEye.tsx");
    expect(be, "⤢ (U+2922) is in neither Special Elite nor the mono face — it rendered as a dot").not.toContain("⤢");
    const slice = be.slice(be.indexOf('data-qcv="be-expand"'), be.indexOf('data-qcv="be-expand"') + 700);
    expect(slice).toMatch(/<svg width="13" height="13"/);
    expect(slice).toMatch(/stroke="currentColor"/);
  });

  it("f · an undated ledger tile is blank with a dash — not a dash over a dot", () => {
    const list = read("src/components/queries/centre/QcList.tsx");
    expect(list, "an em dash where the month goes and an interpunct where the day goes is two marks, neither a date").not.toMatch(/\{sent \? MON\[sent\.getMonth\(\)\] : "—"\}/);
    expect(list).toMatch(/sent \? <><u>\{MON\[sent\.getMonth\(\)\]\}<\/u><b>\{sent\.getDate\(\)\}<\/b><\/> : <i aria-hidden="true">–<\/i>/);
    expect(list).toMatch(/data-dated=\{sent \? "true" : "false"\}/);
    const listCss = read("src/components/queries/centre/qcvList.css");
    expect(listCss).toMatch(/\.qcv-date--none \{[^}]*justify-content: center/);
  });
});

/* ── v65.2 §7 · the expanded rows ─────────────────────────────────────────────────────────────── */

describe("§7 · the rows", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const tlRule = (sel: string) => {
    const m = tl.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };
  it("§6 · the names column is 330, because it carries the due date, its distance AND the controls", () => {
    /* 300 while the corner above it held two buttons; §6 puts three and a ↺ there, and the corner
       IS this column — one token, so widening it moves both or neither. */
    expect(tlSrc).toMatch(/export const NAMES_W = 330;/);
  });
  /**
   * §7 / §1.8 — THE DUE DATE AND ITS DISTANCE COME FROM THE RAIL'S OWN `dueCell`. Two surfaces, one
   * derivation: a second formatter here is how "9 Sep · 10d over" comes to read differently in two
   * places that are showing the same query.
   */
  it("§7 · the names cell states the due date and its distance, from the shared derivation", () => {
    expect(tlSrc).toMatch(/import \{ dueCell \} from "\.\.\/\.\.\/\.\.\/lib\/qcBirdsEye"/);
    expect(tlSrc).toMatch(/data-qcv="tl-due" data-due=\{d\.kind\}/);
    expect(tlRule(".qcv-tl-due")).toMatch(/margin-left: auto/);
    expect(tlRule(".qcv-tl-due")).toMatch(/text-align: right/);
    expect(tlRule(".qcv-tl-names"), "§7 states 14px of padding at the cell's right").toMatch(/padding: 0 14px 0 18px/);
    /* the same type as the rail's column, so the two read as one thing stated twice */
    expect(tlRule(".qcv-tl-due b")).toMatch(/font-size: 12px/);
    expect(tlRule(".qcv-tl-due u")).toMatch(/font-size: 7px/);
    expect(tlRule(".qcv-tl-due u")).toMatch(/text-transform: uppercase/);
  });
  /**
   * ⚠️ THE STICKY CELL NEEDS ITS OWN FILL, NOT THE ROW'S. It carries an opaque white so the dates
   * do not scroll visibly behind the names; a wash on the row alone leaves a white rectangle
   * sliding over a blush row, which is worse than no wash at all.
   */
  it("§B2 · an overdue row's ONLY mark is a 4px ink edge down the names cell", () => {
    /**
     * v65.3 drew a blush pill inside the cell with an ink tab at its left — two marks and a fill for
     * one fact, on the one column a reader scans down. A wash makes the row look like a different
     * KIND of row; an edge says "this one" without changing what the row is.
     *
     * ⚠️ THE EDGE IS ON THE CELL, NEVER THE ROW. The cell is `position: sticky` with an opaque white
     * of its own, so a mark on the row alone slides underneath it — the same reason the wash it
     * replaces needed the cell in the first place.
     */
    const late = /\.qcv-tl-row--late \.qcv-tl-names \{([^}]*)\}/.exec(tl)?.[1] ?? "";
    expect(late, "the overdue mark has no rule").toBeTruthy();
    expect(late).toMatch(/box-shadow: inset 4px 0 0 var\(--qcv-ink\)/);
    /* the pill, its tab and the z-index that lifted the contents over them are GONE, not overridden */
    expect(tl, "the blush pill is back").not.toMatch(/\.qcv-tl-row--late \.qcv-tl-names::before/);
    expect(tl, "the ink tab is back").not.toMatch(/\.qcv-tl-row--late \.qcv-tl-names::after/);
    expect(tl, "a wash on the row is back").not.toMatch(/\.qcv-tl-row--late \{/);
    /* …and the cell keeps the opaque white that stops the dates scrolling visibly behind the names */
    expect(/\.qcv-tl-names \{([^}]*)\}/.exec(tl)?.[1] ?? "").toMatch(/background: #fff/);
  });
  /**
   * §1.9 — THE OVERRUN IS INK AT FULL OPACITY, IN BOTH VIEWS. It was `rgba(28, 19, 15, 0.55)` in
   * each, which renders taupe over a bar's own colour — reported as a token failing to resolve and
   * diagnosed as the alpha itself. Both are asserted here because they state the same fact, and a
   * lock on one is how the other drifts.
   */
  it("§1.9 · the overrun is ink at full opacity — in the expanded view AND the rail", () => {
    for (const [sheet, sel] of [[tl, ".qcv-tl-over"], [read("src/components/queries/centre/qcvBirdsEye.css"), ".qcv-be-over"]] as const) {
      const m = sheet.match(new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*\\{([^}]*)\\}`));
      expect(m, `${sel} has no rule`).toBeTruthy();
      expect(m![1], `${sel} is a tint of ink rather than ink`).toMatch(/background: var\(--qcv-ink\)/);
      expect(m![1], `${sel} still carries an alpha`).not.toMatch(/rgba\(28, 19, 15, 0\.\d+\)\s*;?\s*(?:border|$)/);
    }
  });
  /**
   * §7 — THE SENTENCE IS ANCHORED TO THE VISIBLE PART OF ITS BAR. A bar beginning off-screen left
   * took its words with it and slid them under the sticky names cell: on dev an offer read "ur
   * decision was due 31 Jul", a sentence with its first half eaten. `position: sticky` clamps them
   * to the scrollport — the track's visible left edge plus 10 — and the bar's own `overflow:
   * hidden` ellipsises what will not fit.
   */
  it("§7 · a sentence never slides under the names column", () => {
    /**
     * ⚠️ THE OFFSET IS COMPUTED, NOT DECLARED, and `position: sticky` was the first answer. The bar
     * carries `overflow: hidden`, so the bar IS the sticky child's nearest scrollport: the words
     * stuck to a box that never scrolls and a bar beginning off-screen still took them with it.
     * Measured at −8360 against a visible edge of 568. The rendered claim is in `qcV65.measure.ts`;
     * what belongs here is the arithmetic and the reason it is a margin.
     */
    expect(tlSrc).toMatch(/marginLeft: Math\.max\(0, Math\.min\(scrollLeft \+ 10 - left, w - 24\)\)/);
    expect(tlSrc, "a transform does not take the width away, so nothing ellipsises").not.toMatch(/translateX\(\$\{?inset/);
    /* the bar clips, which is what turns "does not fit" into an ellipsis rather than an overflow */
    expect(tlRule(".qcv-tl-bar")).toMatch(/overflow: hidden/);
    expect(tlRule(".qcv-tl-words")).toMatch(/text-overflow: ellipsis/);
  });
});

/* ── v65.2 §9 · the drag, the zoom and the heat's look ────────────────────────────────────────── */

describe("§9 · dragging the dates", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  /**
   * ⚠️ THE HIT AREA EXCLUDES EVERYTHING INTERACTIVE, AND IT IS THE HALF THAT WAS A REAL FAULT IN THE
   * MOCK: the drag captured the pointer and swallowed the lane's own clicks. A press on Today, ‹, ›,
   * the zoom or an edge marker must behave as a CLICK — so the drag refuses to start on any of
   * them rather than starting and then trying to tell them apart afterwards.
   */
  it("§9 · a press on anything interactive is a click, not a drag", () => {
    expect(tlSrc).toMatch(/const onPointerDown = useCallback/);
    const guard = /if \(t\.closest\("([^"]+)"\)\) return;/.exec(tlSrc.slice(tlSrc.indexOf("const onPointerDown")))?.[1] ?? "";
    for (const sel of ["button", "[data-qcv='tl-marker']", "[data-qcv='tl-names']", "[data-qcv='xp-ctl']"]) {
      expect(guard, `${sel} is a drag handle`).toContain(sel);
    }
    /* and only the primary button starts one */
    expect(tlSrc).toMatch(/e\.button !== 0\) return/);
  });
  it("§9 · the pan is 1:1 and horizontal, with no inertia and a 3px floor", () => {
    expect(tlSrc, "the pan is not 1:1 with the pointer").toMatch(/el\.scrollLeft = d\.scroll - dx;/);
    expect(tlSrc, "a press under 3px is a click").toMatch(/if \(Math\.abs\(dx\) < 3\) return;/);
    /* ⚠️ NO INERTIA: nothing keeps moving after the pointer stops, because a flick that carries on
       is a second model of where the dates are and this view already has one. */
    expect(tlSrc, "an inertia term entered the pan").not.toMatch(/velocit|momentum|inertia|decay/i);
    /* the vertical position is untouched — `scrollTop` is not written anywhere in the drag */
    const body = tlSrc.slice(tlSrc.indexOf("const onPointerMove"), tlSrc.indexOf("const endDrag"));
    expect(body, "the drag writes a vertical position").not.toContain("scrollTop");
  });
  it("§9 · capture is taken and given back, and the selection is restored", () => {
    expect(tlSrc).toMatch(/setPointerCapture\(e\.pointerId\)/);
    expect(tlSrc).toMatch(/document\.body\.style\.userSelect = "none"/);
    expect(tlSrc).toMatch(/document\.body\.style\.userSelect = ""/);
    expect(tlSrc).toMatch(/releasePointerCapture\(e\.pointerId\)/);
    /* ⚠️ BOTH ENDINGS. `pointercancel` is what fires when the browser takes the gesture away — a
       drag that only listens for `pointerup` leaves the body unselectable and the cursor grabbing. */
    expect(tlSrc).toMatch(/onPointerUp=\{endDrag\} onPointerCancel=\{endDrag\}/);
  });
  it("§9 · the crosshair hides during a drag, and the cursor says which state it is in", () => {
    expect(tlSrc).toMatch(/if \(!el \|\| drag\.current\?\.moved\) return;/);
    expect(tlSrc).toMatch(/setCross\(null\);\s*\n\s*mine\(\);/);
    const tier = /\.qcv-tl-tier \{([^}]*)\}/.exec(tl)?.[1] ?? "";
    expect(tier).toMatch(/cursor: grab/);
    /* ⚠️ `pan-y`, NOT `none`: a horizontal drag pans the dates and a vertical one still scrolls the
       page, which is what a reader on a phone expects of a wide thing inside a tall one. */
    expect(tier).toMatch(/touch-action: pan-y/);
    expect(tl, "grabbing must cover the whole body, not just the tier the press began on").toMatch(/\.qcv-tl-scroll--drag, \.qcv-tl-scroll--drag \* \{ cursor: grabbing/);
  });
  /**
   * §9 — THE ZOOM'S CURVE IS `e^(−deltaY × 0.008)`, NOT A FIXED STEP PER NOTCH. A pinch arrives as a
   * stream of ctrl-wheels whose `deltaY` carries how far the fingers moved, so a constant factor
   * per event makes the zoom a function of how many events the hardware sends.
   */
  it("§9 · the zoom is exponential in deltaY, about the pointer, one re-render per frame", () => {
    expect(tlSrc).toMatch(/Math\.exp\(-e\.deltaY \* 0\.008\)/);
    expect(tlSrc, "a fixed step per notch is a function of the hardware").not.toMatch(/1\.12/);
    expect(tlSrc).toMatch(/zoomAbout\(ext, pxd, p\.pxd, sc\.scrollLeft, p\.at\)/);
    /* coalesced: a pinch delivers events faster than the browser paints */
    expect(tlSrc).toMatch(/if \(zoomFrame\.current\) return;/);
    expect(tlSrc).toMatch(/zoomPend\.current = \{ pxd: clampPxd\(from \* Math\.exp/);
  });
  it("⚠️ §B1 · NOTHING UNDER THE DATES — the heat strip and its derivation are GONE", () => {
    /**
     * §B1 — the row is month bands, Monday dates and TODAY. The strip said with a pixel of navy
     * what the bands and the bars say with everything they draw, and it was the one thing in the
     * row a reader could not act on.
     *
     * ⚠️ AND THE DERIVATION WENT WITH IT, which is the half worth locking. A pure function nothing
     * calls is a thing the next reader has to trace to a rendered root before they can touch the
     * row it used to draw in — the reachability fault this repo has paid for twice.
     */
    expect(tl, "the strip's rules are back").not.toMatch(/[".\s`]qcv-tl-heat[\s{,"`]/);
    expect(tlSrc, "the strip is rendered again").not.toContain("qcv-tl-heat");
    const lib = read("src/lib/qcTimeline.ts");
    for (const gone of ["heatWeeks", "HeatWeek", "HEAT_CURRENT", "HEAT_EXPECTED"]) {
      expect(lib, `${gone} survived the removal`).not.toContain(gone);
    }
    /* …and the three things that DO draw in the row are still there.
       ⚠️ BOUNDED, because `toContain("tl-month")` is satisfied by `tl-monthX` — the prefix-match
       fault this file records, and it went green on exactly that mutation before this line. */
    for (const kept of ["tl-month", "tl-monday", "tl-todaypill"]) {
      expect(tlSrc, kept).toMatch(new RegExp(`["\\s\`]${kept}["\\s\`]`));
    }
  });
});

/* ── v65.2 §10 · the crosshair ─────────────────────────────────────────────────────────────────── */

/**
 * §5 · THE DATE ROW. One sticky row of two cells — the corner over the names and the tier over the
 * dates — carrying month bands, every Monday's date, a 6px density strip and the TODAY pill.
 *
 * ⚠️ WHAT IT RETIRED, AND WHY IT IS RECORDED HERE: the month LABELS used to be points that had to
 * dodge the TODAY pill, and the clearance was written as a share of the TRACK — which on a
 * three-year pipeline is 376px of hole either side of today, thirty-five labels rendered and not
 * one of them visible. A band has somewhere else to put its name, so there is nothing to dodge.
 */
describe("§5 · the date row", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const trule = (sel: string) => {
    const m = tl.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("§5 · it is ONE row of two cells, sticky at the body's top, 60px tall", () => {
    /* ⚠️ THE CORNER AND THE TIER ARE SIBLINGS INSIDE THE SCROLLER — the only arrangement in which
       the two cannot disagree about where the names column ends. A corner drawn outside the
       scroller would be a second element that has to be TOLD how wide that column is. */
    expect(tlSrc).toMatch(/<div className="qcv-tl-daterow"[^>]*>\s*<div className="qcv-tl-corner"/);
    const row = trule(".qcv-tl-daterow");
    expect(row, "the dates scroll away with the rows").toMatch(/position: sticky/);
    expect(row).toMatch(/top: 0/);
    expect(row, "the rows would show through it").toMatch(/background: #fff/);
    expect(row).toMatch(/height: var\(--qcv-tl-daterow-h\)/);
    const corner = trule(".qcv-tl-corner"), tier = trule(".qcv-tl-tier");
    expect(corner).toMatch(/height: var\(--qcv-tl-daterow-h\)/);
    expect(tier).toMatch(/height: var\(--qcv-tl-daterow-h\)/);
    /* the corner outranks the dates running under it, and the row outranks the rows under IT */
    expect(+(/z-index: (\d+)/.exec(corner)?.[1] ?? 0)).toBeGreaterThan(+(/z-index: (\d+)/.exec(row)?.[1] ?? 0));
  });

  it("⚠️ §5 · the TIER IS TRANSPARENT — the bands are what colour it", () => {
    /* A fill here paints over the month bands, which is the whole of the row's colour. The white
       belongs to the ROW beneath, so an empty extent still reads as part of the card. */
    expect(trule(".qcv-tl-tier")).toMatch(/background: transparent/);
  });

  it("§5 · the bands are contiguous and their labels are STUCK at the names column's right", () => {
    expect(tlSrc).toMatch(/monthBands\(ext, pxd\)/);
    expect(tlSrc).toMatch(/style=\{\{ left: m\.x, width: m\.width \}\}/);
    const b = trule(".qcv-tl-mb b");
    expect(b, "a label that scrolls away names a month nobody is looking at").toMatch(/position: sticky/);
    expect(b).toMatch(/left: calc\(var\(--qcv-tl-names\) \+ 8px\)/);
    /* ⚠️ THE OFFSET IS THE NAMES COLUMN'S OWN WIDTH, never the 330 it happens to be: the column and
       the corner both read that token, so the three cannot come apart at a retune. */
    expect(b, "the label's stuck position restates a width it does not own").not.toMatch(/left: 3\d\dpx/);
  });

  it("§5 · every Monday states its date, and its tick is the label's own top", () => {
    expect(tlSrc).toMatch(/className="qcv-tl-wk" data-qcv="tl-monday"/);
    const wk = trule(".qcv-tl-wk");
    expect(wk).toMatch(/top: 30px/);
    expect(wk).toMatch(/padding-top: 6px/);
    /* one element, so the tick and the date it belongs to cannot drift apart */
    expect(trule(".qcv-tl-wk::before")).toMatch(/top: 0/);
    expect(trule(".qcv-tl-wk::before")).toMatch(/height: 4px/);
  });

  it("§5 · TODAY is an ink pill on the dates' line", () => {
    const t = trule(".qcv-tl-todaypill");
    expect(t).toMatch(/top: 32px/);
    expect(t).toMatch(/background: var\(--qcv-ink\)/);
    expect(t).toMatch(/border-radius: 9px/);
    /* above the bands it sits on, or it is a pill with a month band drawn through it */
    expect(+(/z-index: (\d+)/.exec(t)?.[1] ?? 0)).toBeGreaterThan(0);
  });

  it("⚠️ §5 · the month POINTS and their track-share clearance are GONE, not merely unused", () => {
    expect(tl, "the retired point label still has a rule").not.toMatch(/[".\s]qcv-tl-mon[\s{,]/);
    expect(tlSrc).not.toMatch(/monthTicks/);
    expect(read("src/lib/qcTimeline.ts")).not.toMatch(/monthTicks/);
  });
});

/**
 * §7 · THE GROUP BANDS, and what closing does.
 */
describe("§7 · the group bands", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const r = (sel: string) => {
    const m = tl.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("§7 · anthracite, sticky BELOW the date row, running the track's full width", () => {
    const b = r(".qcv-tl-band");
    expect(b).toMatch(/background: var\(--sp-anthracite\)/);
    expect(b).toMatch(/position: sticky/);
    /**
     * ⚠️ IT STICKS AT THE DATE ROW'S OWN HEIGHT, NOT AT 0 — and it reads the token rather than the
     * number, because a band stuck at anything else either slides under the dates (and the reader
     * loses the heading exactly when the rows they are reading belong to it) or floats below them.
     */
    expect(b).toMatch(/top: var\(--qcv-tl-daterow-h\)/);
    /* ⚠️ AND NO WIDTH: it is a block in the rows' own box, which IS the track. A band that stopped
       at the names column would let rows show beside it, which reads as a row, not a heading. */
    expect(b, "a band that states a width is a band that can stop short of the track").not.toMatch(/width:/);
    /* it must outrank the rows it holds back, and sit under the date row it hangs from */
    const z = +(/z-index: (\d+)/.exec(b)?.[1] ?? 0);
    expect(z).toBeGreaterThan(0);
    expect(z).toBeLessThan(+(/z-index: (\d+)/.exec(r(".qcv-tl-daterow"))?.[1] ?? 0));
  });

  it("§7 · white bold name, the count at 62%, and the 14px gap belongs to the BAND", () => {
    expect(r(".qcv-tl-band span")).toMatch(/color: #fff/);
    expect(r(".qcv-tl-band span")).toMatch(/font-weight: 700/);
    expect(r(".qcv-tl-band i")).toMatch(/color: rgba\(255, 255, 255, 0\.62\)/);
    /* ⚠️ A `margin-top` ON THE BAND, cleared on the first — the air between groups belongs to the
       band that starts the next one. As a padding on the section it would appear above the FIRST
       band too, against the date row. */
    expect(r(".qcv-tl-band")).toMatch(/margin-top: 14px/);
    /* ⚠️ `:first-of-type`: the today line and the crosshair are `<i>` siblings ahead of the first
       section, so `:first-child` matches nothing and the gap appears against the date row. */
    expect(tl).toMatch(/\.qcv-tl-group:first-of-type \.qcv-tl-band \{[^}]*margin-top: 0/);
    expect(tl, "a :first-child rule cannot reach the first group here").not.toMatch(/\.qcv-tl-group:first-child/);
    expect(tlSrc).toMatch(/className="qcv-tl-group"/);
  });
});

describe("§7 · closing", () => {
  it("⚠️ §7 · closing LIFTS THE OVERLAYS OUT before it clears the card", () => {
    /**
     * The time controls live in a portal into the tray; the popover and Find are the card's own.
     * The lift is set first and the page's close deferred to the next frame, so the overlays leave
     * the tree BEFORE the card does — one synchronous call would batch both into a single commit
     * and the order would mean nothing.
     */
    const body = src.slice(src.indexOf("const close = useCallback"), src.indexOf("exitRef.current = close;"));
    for (const step of ["setMenu(null)", 'setFind("")', "setTimeReady(false)"]) expect(body, step).toContain(step);
    expect(body).toMatch(/requestAnimationFrame\(\(\) => closeRef\.current\(\)\)/);
    /* …and the three lifts come BEFORE the frame that closes */
    expect(body.indexOf("setTimeReady(false)")).toBeLessThan(body.indexOf("requestAnimationFrame"));
  });

  it("⚠️ §7 · every way out uses that ONE exit — a second path is a second behaviour", () => {
    /* the ✕ and the backdrop take `close` directly; Escape reaches it through a ref, because its
       handler is registered once with no dependencies */
    expect(src).toMatch(/onClick=\{close\}/);
    expect(src).toMatch(/exitRef\.current\(\);/);
    expect(src, "Escape still closes by its own route").not.toMatch(/if \(menuRef\.current\) \{ setMenu\(null\); return; \}\s*\n\s*closeRef\.current\(\);/);
  });

  it("⚠️ §7 · every OPEN starts from nothing, because the card is unmounted rather than hidden", () => {
    /**
     * "Every open resets the zoom to 3m with today at 56–58%" is true by CONSTRUCTION here: the
     * page renders the card only while it is open, so `pxd`, the scroll, the view, Find and the
     * menu are all fresh state. This asserts the construction — a card kept mounted and hidden
     * would keep all five, and nothing else in the file would notice.
     */
    const q = read("src/components/Queries.tsx");
    expect(q).toMatch(/overlay=\{beOpen \? \(/);
    expect(q, "the card is kept mounted, so a re-open restores the last zoom").not.toMatch(/<QcExpanded[^>]*hidden/);
    /* …and the default IS 3m: the zoom's own state starts at the scale the preset names */
    const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
    expect(tlSrc).toMatch(/useState\(PXD_DEFAULT\)/);
    const lib = read("src/lib/qcTimeline.ts");
    expect(lib).toMatch(/export const PXD_DEFAULT = 10\.5;/);
    expect(lib).toMatch(/\{ key: "3m", label: "3m", pxd: 10\.5 \}/);
    expect(lib).toMatch(/export const TODAY_AT = 0\.58;/);
  });
});

describe("§A2–§A3 · the bars and the bands", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const r = (sel: string) => {
    const m = tl.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("§A2 · a past stage is the SAME bar as the current one, set back to 42%", () => {
    /**
     * It was a 10px hairline with 9px words — which reads as a different KIND of thing from the
     * stage beside it rather than as the same thing, earlier. The mock draws one bar.
     */
    const past = r(".qcv-tl-bar--past");
    expect(past).toMatch(/opacity: 0\.42/);
    expect(r(".qcv-tl-row:hover .qcv-tl-bar--past")).toMatch(/opacity: 0\.7/);
    /* ⚠️ THE SHAPE IS ASSERTED AS AN ABSENCE, which is the only form that cannot drift: the past
       bar states no height, no top and no radius, so it IS the base bar's 22/11 by construction
       rather than by two numbers somebody has to keep in step. */
    for (const own of ["height", "top", "border-radius"]) {
      expect(past, `a past bar restates its own ${own}`).not.toMatch(new RegExp(`${own}:`));
    }
    const base = r(".qcv-tl-bar");
    expect(base).toMatch(/height: 22px/);
    expect(base).toMatch(/border-radius: 11px/);
    /* the words are the current bar's own 11.5px typewriter, in ink-70 */
    const w = r(".qcv-tl-bar--past .qcv-tl-words");
    expect(w).toMatch(/color: var\(--qcv-ink-70\)/);
    expect(w, "a past bar shrinks its own words again").not.toMatch(/font-size|line-height/);
    expect(r(".qcv-tl-words")).toMatch(/font-size: 11\.5px/);
    expect(r(".qcv-tl-words")).toMatch(/font-family: var\(--qcv-type\)/);
  });

  it("⚠️ §A3 · a month band CLIPS its own contents — with `clip-path`, never `overflow`", () => {
    /**
     * A label that bleeds into the next band is the fault ("326" at an edge on dev). The fix cannot
     * be `overflow: hidden`: the label is `position: sticky`, and an `overflow` of any value makes
     * its ancestor the scrollport it sticks to — so it would stick to the BAND, which never
     * scrolls, and leave with it. That is the law this repo already records for a sticky inside a
     * clipping ancestor, arriving from the other side.
     */
    const mb = r(".qcv-tl-mb");
    expect(mb).toMatch(/clip-path: inset\(0\)/);
    expect(mb, "an `overflow` on the band kills its sticky label").not.toMatch(/overflow/);
    /* …and the label really is sticky, or the warning above is about nothing */
    expect(r(".qcv-tl-mb b")).toMatch(/position: sticky/);
  });
});

describe("§C1–§C3 · your move", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const be = read("src/components/queries/centre/qcvBirdsEye.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const r = (css: string, sel: string) => {
    const m = css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("⚠️ §C1 · NO RUST on any bar, fill or ring — in either view", () => {
    /**
     * Rust marked your move in three places at once: a 3px inset on the bar, the same on the rail's
     * fill, and the next-step ring's whole border. A colour used nowhere else for this had to be
     * learnt before it meant anything, and on a bar it competed with the stage colour beneath it.
     * Your move is said ONCE now, in words (§C2) or as a dot (§C2 rail).
     */
    expect(r(tl, ".qcv-tl-bar--you"), "the bar's rust edge is back").not.toMatch(/--qcv-rust|8a4a3c/);
    expect(r(be, ".qcv-be-track--you .qcv-be-fill"), "the rail fill's rust edge is back").not.toMatch(/--qcv-rust|8a4a3c/);
    const ghost = r(tl, ".qcv-tl-ghost");
    expect(ghost, "the next-step ring is rust again").not.toMatch(/--qcv-rust|8a4a3c/);
    expect(ghost, "§C1 · the ring is a 1.4px dashed ink at 55%").toMatch(/border: 1\.4px dashed rgba\(28, 19, 15, 0\.55\)/);
    /* ⚠️ THE CROSSHAIR'S TODAY TAG IS STILL RUST AND MUST STAY — it is not a your-move mark, and a
       sweep for "no rust in this sheet" would take it with everything else. */
    expect(tl).toMatch(/\.qcv-tl-tag--today \{[^}]*var\(--qcv-rust\)/);
  });

  it("§C2 · the tag hangs OUTSIDE the bar, 30px from the ring's own left edge", () => {
    const tag = r(tl, ".qcv-tl-ghost--you::after");
    expect(tag).toMatch(/content: "YOUR MOVE"/);
    expect(tag).toMatch(/left: 30px/);
    expect(tag).toMatch(/background: var\(--sp-anthracite\)/);
    expect(tag).toMatch(/font-size: 7\.5px/);
    expect(tag).toMatch(/font-weight: 700/);
    expect(tag).toMatch(/letter-spacing: 0\.12em/);
    expect(tag).toMatch(/border-radius: 6px/);
    expect(tag).toMatch(/padding: 3px 6px/);
    /* ⚠️ AND THE RING MUST NOT CLIP IT, or the tag is drawn and invisible — the fault this repo
       records for a `::after` inside a box whose `overflow` nobody thought about. */
    expect(r(tl, ".qcv-tl-ghost")).toMatch(/overflow: visible/);
    expect(tlSrc).toContain("qcv-tl-ghost qcv-tl-ghost--you");
  });

  it("§C2 · the rail says it with a 6px anthracite dot after the due date", () => {
    const dot = r(be, ".qcv-be-due--ym b::after");
    expect(dot).toMatch(/width: 6px/);
    expect(dot).toMatch(/height: 6px/);
    expect(dot).toMatch(/border-radius: 50%/);
    expect(dot).toMatch(/background: var\(--sp-anthracite\)/);
    /* …after the DATE, which is what `b::after` says: the distance beneath it is a second line */
    expect(read("src/components/queries/centre/QcBirdsEye.tsx")).toMatch(/r\.yourMove \? " qcv-be-due--ym" : ""/);
  });

  it("§C3 · an overdue agent-side row carries the tag 8px after its nudge chip", () => {
    const tag = r(tl, ".qcv-tl-nudge--ym::after");
    expect(tag).toMatch(/content: "YOUR MOVE"/);
    expect(tag).toMatch(/left: calc\(100% \+ 8px\)/);
    expect(tag).toMatch(/background: var\(--sp-anthracite\)/);
    expect(r(tl, ".qcv-tl-nudge--ym"), "the chip clips its own tag").toMatch(/overflow: visible/);
    expect(tlSrc).toMatch(/t\.nudge\.yourMove \? " qcv-tl-nudge--ym" : ""/);
  });
});

describe("§B3 · the torn edges, drawn", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const rawTl = readFileSync(join(process.cwd(), "src/components/queries/centre/qcvTimeline.css"), "utf8");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  const r = (sel: string) => {
    const m = tl.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
    expect(m, `${sel} has no rule`).toBeTruthy();
    return m![1];
  };

  it("⚠️ §B3 · THE STRIPES AND THE DASHES ARE GONE from both views", () => {
    /**
     * A striped or dashed bar reads as a different KIND of thing — the page's dashed grammar
     * already means "provisional", so a whole bar in it said the STAGE was provisional, when the
     * only provisional thing is one of its two ends. It also threw the stage colour away, which is
     * the one thing about the bar that is certain.
     */
    expect(tl, "the undated bar's whole treatment is back").not.toMatch(/[".\s`]qcv-tl-bar--undated[\s{,"`]/);
    expect(tlSrc, "the undated modifier is rendered again").not.toContain("qcv-tl-bar--undated");
    const be = read("src/components/queries/centre/qcvBirdsEye.css");
    expect(/\.qcv-be-track--none \{([^}]*)\}/.exec(be)?.[1] ?? "", "the rail's dashes are back").not.toMatch(/repeating-linear-gradient/);
  });

  it("§B3 · the two torn ends: square at the tear, round at the fact", () => {
    /* start torn → square LEFT, round right; end torn → round left, square RIGHT */
    expect(r(".qcv-tl-bar--torn-start")).toMatch(/border-radius: 0 11px 11px 0/);
    expect(r(".qcv-tl-bar--torn-end")).toMatch(/border-radius: 11px 0 0 11px/);
    /* the zig-zag is drawn in WHITE over the bar's own end, 8px wide, at the torn side */
    const st = r(".qcv-tl-bar--torn-start::before"), en = r(".qcv-tl-bar--torn-end::after");
    for (const [side, rule2] of [["left", st], ["right", en]] as const) {
      expect(rule2).toMatch(new RegExp(`${side}: -1px`));
      expect(rule2).toMatch(/width: 8px/);
      /* ⚠️ THE FILL IS CHECKED ON THE RAW FILE. `read()` strips comments, and the data-URI carries
         `http://www.w3.org` — whose `//` the line-comment stripper eats, taking the rest of the
         declaration with it. A stripper is right for prose and wrong for a URL. */
      expect(rawTl).toMatch(new RegExp(`${side}: -1px`));
    }
    /* …and they are MIRRORS: the two paths differ only in which side the teeth point, and both are
       white — read RAW, because `read()`'s comment stripper eats the `//` in the SVG's namespace */
    expect(rawTl).toContain("M0 0H6L2 3.7");
    expect(rawTl).toContain("M8 0H2L6 3.7");
    expect((rawTl.match(/fill='white'/g) ?? []).length, "a tooth stopped being white").toBe(2);
    /* the bar keeps its stage colour — the tear says where knowledge stops, not what stage it is */
    expect(r(".qcv-tl-bar")).toMatch(/background: var\(--qcv-state/);
    expect(st, "the torn bar paints over its own colour").not.toMatch(/background-color|background:/);
  });

  it("§B3 · Add date is a mono 8px tag with a 1px inset ring, opening the card's TRACKING tab", () => {
    const a = r(".qcv-tl-adddate");
    expect(a).toMatch(/font-family: var\(--qcv-mono\)/);
    expect(a).toMatch(/font-size: 8px/);
    expect(a).toMatch(/text-transform: uppercase/);
    expect(a).toMatch(/background: #fff/);
    expect(a).toMatch(/box-shadow: inset 0 0 0 1px rgba\(28, 19, 15, 0\.2\)/);
    expect(a).toMatch(/border-radius: 8px/);
    /**
     * ⚠️ IT WRITES THE TAB THROUGH THE CARD'S OWN SEAM, never a new prop. `TAB_KEY` is the
     * sessionStorage key `readTab` reads, so there is one answer to "which tab is open"; a second
     * way to choose one is a second thing that can disagree with the card.
     */
    expect(tlSrc).toMatch(/sessionStorage\.setItem\(TAB_KEY, "tracking"\)/);
    expect(tlSrc).toMatch(/\{b\.torn && \(/);
    /* …and it is only ever drawn on a torn bar */
    expect(tlSrc, "Add date is drawn on every bar").not.toMatch(/qcv-tl-adddate[\s\S]{0,80}\{b\.current/);
  });
});

describe("§A1 · opening on today", () => {
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");

  it("⚠️ §A1 · the placement's guard is the WHOLE extent and the measured width", () => {
    /**
     * The extent is a PAIR and only `fromMs` was watched, so an extent that grew on its RIGHT — a
     * query dated further out than anything else on the account — changed the track's width, and
     * therefore where 58% of it falls, while the guard said the view was already placed.
     */
    expect(tlSrc).toMatch(/const key = `\$\{ext\.fromMs\}:\$\{ext\.toMs\}:\$\{boxW\}`/);
    /* …and what it RECORDS is the same three things, or the guard compares two different keys */
    expect(tlSrc).toMatch(/placedFor\.current = `\$\{L\.ext\.fromMs\}:\$\{L\.ext\.toMs\}:\$\{L\.boxW\}`/);
    /* …and both ends are in the deps, or the effect never runs to compare them */
    expect(tlSrc).toMatch(/\}, \[boxW, rows\.length, ext\.fromMs, ext\.toMs\]\)/);
  });

  it("⚠️ §A1 · the reveal's end re-places, and a ResizeObserver could never have caught it", () => {
    /**
     * The card grows under this component with a `clip-path` transition, which changes what is
     * PAINTED without changing any box — so no observer fires and `boxW` stays whatever was
     * measured mid-reveal. Anything that settles with the transition lands after the placement and
     * is invisible to it.
     */
    const body = sliceBetween(tlSrc, "const settle = (e: Event) =>", "card.addEventListener");
    expect(body).toMatch(/propertyName !== "clip-path"/);
    expect(body, "it re-places for any transition on any descendant").toMatch(/e\.target !== card/);
    expect(body).toMatch(/placedFor\.current = null/);
    expect(tlSrc).toMatch(/card\.addEventListener\("transitionend", settle\)/);
    expect(tlSrc, "the listener is never removed").toMatch(/card\.removeEventListener\("transitionend", settle\)/);
  });

  it("⚠️ §A1 · every re-placement still yields to the reader", () => {
    /**
     * A reader who drags during the 380ms reveal has moved the view, and a placement that ignored
     * them would be the view fighting back. `touched` is checked in the placement itself, so the
     * `transitionend` path cannot route around it — which is why it clears the key and re-reads the
     * width rather than writing a scroll position of its own.
     */
    expect(tlSrc).toMatch(/if \(touched\.current \|\| boxW <= 0 \|\| rows\.length === 0\) return undefined;/);
    const settle = sliceBetween(tlSrc, "const settle = (e: Event) =>", "card.addEventListener");
    expect(settle, "the reveal path writes a scroll position of its own, around `touched`").not.toMatch(/scrollLeft\s*=/);
  });
});

describe("§10 · the crosshair", () => {
  const tl = read("src/components/queries/centre/qcvTimeline.css");
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  it("§10 · a 1px line at 28% ink, through the date tier AND the rows", () => {
    expect(/\.qcv-tl-cross \{([^}]*)\}/.exec(tl)?.[1] ?? "").toMatch(/width: 1px; background: rgba\(28, 19, 15, 0\.28\)/);
    /* ⚠️ BOTH, AND THE TIER WAS MISSING. A line that stopped at the tier's foot leaves the tag it
       belongs to floating over nothing — the tag rides the LANE, above the tier. */
    expect(tlSrc).toMatch(/data-qcv="tl-cross-tier"/);
    expect(tlSrc).toMatch(/data-qcv="tl-cross"/);
  });
  it("§10 · the tag is an ink pill in the lane, rust on today", () => {
    const tag = /\.qcv-tl-tag \{([^}]*)\}/.exec(tl)?.[1] ?? "";
    expect(tag).toMatch(/font-size: 8px/);
    expect(tag).toMatch(/background: var\(--qcv-ink\); color: #f5f1eb/);
    expect(/\.qcv-tl-tag--today \{([^}]*)\}/.exec(tl)?.[1] ?? "").toMatch(/background: var\(--qcv-rust\)/);
  });
  /**
   * §10 — IT HIDES OVER THE NAMES COLUMN, THE LANE'S CONTROLS, A POPOVER AND A MARKER.
   *
   * ⚠️ THE POPOVER WAS THE ONE MISSING. It hangs OVER the rows, so a crosshair drawn under it is a
   * line a reader can see through the panel they are reading — and the left-hand cluster joined the
   * lane this round, so it is named here too.
   */
  it("§10 · it hides over everything a reader could be looking at instead", () => {
    const guard = /if \(t\.closest\("([^"]+)"\)\) \{ setCross\(null\); return; \}/.exec(tlSrc)?.[1] ?? "";
    for (const sel of ["[data-qcv='tl-names']", "[data-qcv='tl-controls']", "[data-qcv='tl-marker']", "[data-qcv='xp-pop']", "[data-qcv='xp-ctl']"]) {
      expect(guard, `it is drawn over ${sel}`).toContain(sel);
    }
    /* …and during a drag, which is §9's half of the same rule */
    expect(tlSrc).toMatch(/if \(!el \|\| drag\.current\?\.moved\) return;/);
  });
  /**
   * §10 — CLAMPED CLEAR OF THE CONTROLS, AND THE CLAMP DROPS THE CENTRING. The rule centres the tag
   * with `translateX(-50%)`, so clamping the CENTRE would still put half of it under the zoom pill;
   * dropping the transform is what makes the guard mean the tag's own left edge.
   */
  it("§10 · at its left bound the tag left-aligns rather than centring on it", () => {
    expect(tlSrc).toMatch(/const guard = NAMES_W \+ 8;/);
    expect(tlSrc).toMatch(/const under = at - tagW \/ 2 < guard;/);
    expect(tlSrc).toMatch(/style=\{under \? \{ left: guard, transform: "none" \} : \{ left: at \}\}/);
  });
});
