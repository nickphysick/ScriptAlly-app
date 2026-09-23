/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The expanded Birds-eye view (v65 §7, §8.1, §8.2) — the card, the Courier's column, the title and
 * the three stat cards.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
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
    expect(src).toContain('aria-disabled={count === 0 || undefined}');
  });
  it("⚠️ the name and the hint MAY WRAP — at 1280 a card is 87px and 'Watch and wait' does not fit", () => {
    expect(rule(".qcv-xp-nm"), "a nowrap here makes the card a scrollbar").not.toContain("nowrap");
    expect(rule(".qcv-xp-hint")).not.toContain("nowrap");
    /* the hints are the lib's, so the header and the groups cannot disagree about what they mean */
    for (const h of Object.values(ATTENTION_HINT)) expect(src.includes("ATTENTION_HINT"), h).toBe(true);
  });
});
