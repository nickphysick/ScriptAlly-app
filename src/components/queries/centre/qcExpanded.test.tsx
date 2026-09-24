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
import { LCOL } from "./QcExpanded";
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
    expect(src, "the card must read the window's own box").toContain("expandedBox(win, window.innerWidth)");
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

describe("§8.1 · the Courier's column", () => {
  it("its width IS the names column's, stated once", () => {
    expect(LCOL).toBe(260);
    expect(src).toContain("style={{ width: LCOL }}");
    expect(rule(".qcv-xp-tray")).toMatch(/grid-template-columns:\s*var\(--qcv-xp-lcol, 260px\) max-content minmax\(0, 1fr\)/);
    expect(rule(".qcv-xp-tray")).toMatch(/column-gap:\s*28px/);
  });
  it("⚠️ the ✕ is above the drawing — below it the one way out is unclickable while looking present", () => {
    const x = rule(".qcv-xp-x");
    expect(x).toMatch(/z-index:\s*3/);
    expect(x).toMatch(/width:\s*32px/);
    expect(x).toMatch(/top:\s*12px;\s*left:\s*12px/);
    /* the art carries no z-index of its own, so nothing can climb over it by accident */
    expect(rule(".qcv-xp-art"), "the drawing claims a stacking order").not.toContain("z-index");
  });
  it("the drawing is contained, shadowed, and takes NO blend — it is already transparent", () => {
    const art = rule(".qcv-xp-art");
    expect(art).toMatch(/object-fit:\s*contain/);
    expect(art).toMatch(/padding:\s*4px 12px 50px 22px/);
    expect(art).toMatch(/drop-shadow\(0 12px 16px rgba\(28, 19, 15, 0\.2\)\)/);
    expect(css).not.toContain("mix-blend-mode");
    expect(src).toContain('alt=""');
  });
});

describe("§8.2 · the title and the stat cards", () => {
  it("the title is 44px typewriter on one line, centred on the column by the tray's own alignment", () => {
    const t = rule(".qcv-xp-ttl");
    expect(t).toMatch(/font-size:\s*44px/);
    expect(t).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
    expect(t).toMatch(/white-space:\s*nowrap/);
    expect(rule(".qcv-xp-tray")).toMatch(/align-items:\s*center/);
  });
  it("three cards, Overdue in ink, a group at zero drawn and faded", () => {
    expect(rule(".qcv-xp-stat")).toMatch(/flex:\s*1 1 0/);
    expect(rule(".qcv-xp-stat")).toMatch(/max-width:\s*180px/);
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
    const at = tlSrc.indexOf("const placed = useRef(false);");
    expect(at, "the placement has moved").toBeGreaterThan(-1);
    const block = tlSrc.slice(at, tlSrc.indexOf("const pan = ", at));
    expect(block, "the deps are objects that change identity every render").toMatch(/\}, \[boxW, rows\.length\]\);/);
    /**
     * ⚠️ AND IT WAITS FOR ROWS. With no data the extent is three weeks wide, today's x is about 220
     * and `scrollForToday` correctly answers ZERO; the write then succeeds — 0 is 0 — `placed`
     * records a success, and the view never places itself again once fifty queries arrive and the
     * track becomes twelve thousand pixels long. A guard that fires against an empty account locks
     * in an answer that was right for nothing. Found by instrumenting the component after three
     * wrong diagnoses; the trace read `put:want=0,got=0` followed by `placed=true`.
     */
    expect(block, "it places itself against an empty account and records that as done").toContain("rows.length === 0");
    expect(block, "it must read the live values at the moment it fires").toContain("const L = latest.current;");
    expect(tlSrc).toMatch(/const latest = useRef\(\{ ext, pxd, boxW, nowMs, focusId, tl \}\);/);
  });
  it("⚠️ §8.10 · the lane's controls are SIBLINGS of the scroller, never inside it", () => {
    /* in the mockup they lived inside the axis and a re-render lost them. The fix is structural:
       a control that has to be put back after a rebuild is one that will one day not be. */
    const lane = tlSrc.indexOf('data-qcv="tl-lane"');
    const controls = tlSrc.indexOf('data-qcv="tl-controls"');
    const scroll = tlSrc.indexOf('data-qcv="tl-scroll"');
    expect(lane).toBeGreaterThan(-1);
    expect(controls).toBeGreaterThan(lane);
    expect(controls, "the controls are inside the scroller").toBeLessThan(scroll);
    expect(tlRule(".qcv-tl-controls")).toMatch(/position:\s*absolute/);
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
  it("⚠️ §8.9 · the crosshair hides over the names, the controls and a marker", () => {
    expect(tlSrc).toMatch(/closest\("\[data-qcv='tl-names'\], \[data-qcv='tl-controls'\], \[data-qcv='tl-marker'\]"\)/);
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

  it("both buttons are 40px, white, 1px edge, 20px corners, typewriter 14.5px — and no shadow", () => {
    const b = rule(".qcv-xp-btn, .qcv-xp-reset");
    expect(b).toMatch(/height:\s*40px/);
    expect(b).toMatch(/border-radius:\s*20px/);
    expect(b).toMatch(/border:\s*1px solid rgba\(28, 19, 15, 0\.12\)/);
    expect(b).toMatch(/background:\s*#fff/);
    expect(b).toMatch(/font-size:\s*14\.5px/);
    expect(b).toMatch(/font-family:\s*var\(--qcv-type\)/);
    expect(b, "§8.1 says no shadow").not.toContain("box-shadow");
  });
  it("⚠️ the cluster is CENTRED ON THE COLUMN, so the reset appearing re-centres all three", () => {
    const c = rule(".qcv-xp-ctl");
    /* it fills the column (left and right both 0) and centres its contents; a cluster pinned by one
       edge would shunt the pair sideways the moment a third button arrived */
    expect(c).toMatch(/left:\s*0/);
    expect(c).toMatch(/right:\s*0/);
    expect(c).toMatch(/justify-content:\s*center/);
    expect(c).toMatch(/bottom:\s*10px/);
  });
  it("each button goes ink while open OR while its own settings differ — and ↺ for either", () => {
    expect(ctl).toMatch(/filterOn \|\| menu === "filter"/);
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
    for (const forbidden of ["scrollLeft", "pxd", "zoom", "scrollTo"]) {
      expect(ctl, `the reset must not reach ${forbidden}`).not.toContain(forbidden);
    }
  });
});

describe("§8.3 · one popover", () => {
  const ctl = read("src/components/queries/centre/QcCalControls.tsx");

  it("300px, 12px corners, below the buttons and over the names", () => {
    const p = rule(".qcv-xp-pop");
    expect(p).toMatch(/width:\s*300px/);
    expect(p).toMatch(/border-radius:\s*12px/);
    expect(p).toMatch(/top:\s*calc\(100% \+ 10px\)/);
    /**
     * ⚠️ THE TRAY IS STACKED ABOVE THE BODY, and the two declarations are one mechanism. The date
     * row's lane is positioned and later in the tree, so without this the panel paints BEHIND the
     * rows — present, correct and invisible. Asserted together, because either alone is meaningless.
     */
    expect(rule(".qcv-xp-tray")).toMatch(/z-index:\s*5/);
    expect(p).toMatch(/z-index:\s*6/);
  });
  it("⚠️ ONE panel with two contents — never two components agreeing to close each other", () => {
    /* one element, whose contents are chosen by the open menu */
    expect((ctl.match(/className="qcv-xp-pop"/g) ?? []).length).toBe(1);
    expect(ctl).toMatch(/\{menu && \(/);
    expect(ctl).toMatch(/menu === "filter" \? \(/);
  });
  it("Filter's three sections; Sort's three; and the words are the libs'", () => {
    expect(ctl).toContain("Whose court");
    expect(ctl).toContain("Attention");
    expect(ctl).toContain("Clear filters");
    expect(ctl).toContain("Group by");
    expect(ctl).toContain("Sort by");
    expect(ctl).toContain("Reset sort");
    expect(ctl).toContain("· flip");
    /* the options are read from the libs so the popover and the rows cannot name different sets */
    expect(ctl).toMatch(/EYE_FOCUS\.map/);
    expect(ctl).toMatch(/ATTENTION_ORDER\.map/);
    expect(ctl).toMatch(/GROUP_BY_OPTIONS\.map/);
    expect(ctl).toMatch(/SORT_BY_OPTIONS\.map/);
    expect(ctl, "a hand-written option list is how two surfaces come to disagree").not.toMatch(/"Watch and wait"/);
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
    /* the dismissal idiom it DOES own: pointerdown outside, with the trigger counting as inside */
    expect(ctl).toMatch(/addEventListener\("pointerdown", onDown\)/);
    expect(ctl).toMatch(/!ref\.current\?\.contains\(e\.target as Node\)/);
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
   * source lock can honestly carry: that the controls' width is READ off the element rather than
   * restated. Three values this file does not own (nav, gap, zoom) written here as a constant would
   * be right until any one of them moved, and wrong in silence after.
   */
  it("the controls' width is measured, never restated", () => {
    expect(tlSrc).toMatch(/const ctlRef = useRef<HTMLDivElement>\(null\)/);
    expect(tlSrc).toMatch(/setCtlW\(el\.getBoundingClientRect\(\)\.width\)/);
    expect(tlSrc).toMatch(/data-qcv="tl-controls" ref=\{ctlRef\}/);
    expect(tlSrc).toMatch(/const guard = NAMES_W \+ 18 \+ ctlW \+ 8;/);
    /* the 18 is the controls' own offset, and it is the ONE number shared with the sheet */
    expect(tlCss).toMatch(/\.qcv-tl-controls \{[^}]*left: calc\(var\(--qcv-tl-names\) \+ 18px\)/);
  });
  it("⚠️ …and under the controls it LEFT-ALIGNS — a clamped centre still puts half of it under them", () => {
    expect(tlCss).toMatch(/\.qcv-tl-tag \{[^}]*transform: translateX\(-50%\)/);
    expect(tlSrc).toMatch(/style=\{under \? \{ left: guard, transform: "none" \} : \{ left: at \}\}/);
    /* and the old one-sided clamp is gone rather than left beside the new one */
    expect(tlSrc, "the names-column-only clamp is superseded").not.toMatch(/Math\.max\(NAMES_W \+ 8,/);
  });
});

describe("§8.1 · the Courier's column spans the tray AND the date row (v65.1)", () => {
  const tlSrc = read("src/components/queries/centre/QcTimeline.tsx");
  /**
   * ⚠️ THE GEOMETRY IS MEASURED (`qcV65.measure.ts`, §10 locks 4 and 5). What a source lock can
   * honestly carry is the MECHANISM: that the extent is published by the thing that measures it,
   * and that the column no longer states a height of its own.
   */
  it("the date row's height is published by the timeline, never restated in the tray", () => {
    expect(tlSrc).toMatch(/card\.style\.setProperty\("--qcv-xp-ext"/);
    expect(tlSrc).toMatch(/tier\.getBoundingClientRect\(\)\.bottom - lane\.getBoundingClientRect\(\)\.top/);
    expect(tlSrc).toMatch(/ro\.observe\(lane\);\s*\n\s*ro\.observe\(tier\);/);
    /* it crosses a component boundary, so the writer reaches the card rather than its own root */
    expect(tlSrc).toMatch(/closest\("\[data-qcv='xp-card'\]"\)/);
  });
  it("⚠️ the column states NO height — the fault was a stated one inside the tray's padding", () => {
    const col = rule(".qcv-xp-col");
    expect(col, "a stated height is what grew the tray to 290 and the header to 394").not.toMatch(/(?:^|[;{\s])(min-)?height\s*:/);
    /* the negative margins ARE the mechanism: cancel the tray's padding, then carry on by the extent */
    expect(col).toMatch(/margin:\s*-16px 0 calc\(-16px - var\(--qcv-xp-ext, 104px\)\)/);
  });
  it("⚠️ …and it is OPAQUE, because it is now the date row's corner cell", () => {
    expect(rule(".qcv-xp-col")).toMatch(/background:\s*#f5f1eb/);
    /* above the date row it covers — the tier is inset by the names column, so the dates run behind it */
    expect(rule(".qcv-xp-col")).toMatch(/z-index:\s*2/);
  });
  it("the tray keeps `align-items: center`, because the TITLE centres on the tray", () => {
    /* ⚠️ NOT ON THE COLUMN. The column now runs 258 through the date row while the tray is ~154;
       centring the title on the column would drop it below the tray's own middle. The ref renders
       the two midpoints level, and the Courier's drawn body sits in the upper part of his column,
       so they read as level. Measured as an equality in `qcV65.measure.ts`. */
    expect(rule(".qcv-xp-tray")).toMatch(/align-items:\s*center/);
  });
});
