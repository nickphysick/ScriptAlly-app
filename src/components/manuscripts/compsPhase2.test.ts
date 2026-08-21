/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 2 locks — the scroll conversion and the row alignment.
 *
 * The page RENDERS in materialsPageSmoke (seeded and unseeded); these assert the two things a render
 * cannot see: a stylesheet rule that is absent, and a prop that is not passed.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "comps.css"), "utf8");
const tsx = readFileSync(join(here, "ComparableTitlesPage.tsx"), "utf8");
/**
 * ⚠️ COMMENTS STRIPPED FROM BOTH SOURCES, and for the same reason twice. A rule or an attribute
 * worth asserting is usually worth EXPLAINING beside it, so its name appears in the prose recording
 * the decision — and a whole-file scan cannot tell a declaration from a mention. It has now caught
 * this suite twice: once on a deleted CSS rule named in the comment documenting its deletion, once
 * counting `aria-live` and finding the comment above the attribute.
 */
const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const src = tsx.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every declaration block for a selector, joined; throws when the selector is missing. */
function rule(selector: string): string {
  const out: string[] = [];
  const needle = `${selector} {`;
  let i = css.indexOf(needle);
  expect(i, `no rule found for "${selector}" — the lock is reading nothing`).toBeGreaterThan(-1);
  while (i > -1) {
    const end = css.indexOf("}", i);
    out.push(css.slice(i + needle.length, end));
    i = css.indexOf(needle, end);
  }
  return out.join("\n");
}

describe("Phase 2 — the page scrolls, and it stopped doing the grid's job", () => {
  /**
   * ⚠️ THE DELETION IS THE POINT. `.ctpage .wpg-scroll { display:flex }` was this page doing the
   * grid's `fill` work from its own sheet at identical specificity (0-2-0), winning only because a
   * page stylesheet lands later in the bundle. That is the shape that cost three other pages their
   * scroll-invariance padding.
   */
  it("no longer restyles the grid's scroll row from the page stylesheet", () => {
    expect(rules).not.toContain(".ctpage .wpg-scroll");
  });

  /**
   * ⚠️ AND NOTHING REPLACED IT. `fill` is for content that FILLS the row and scrolls in its own
   * panes; this page flows past it, and the grid's own note says a `flex: 1` child on a flowing page
   * "would start filling the row instead of flowing past it, which changes what scrolls".
   */
  it("passes no fill prop — this page flows, it does not fill", () => {
    const grid = sliceBetween(tsx, "<WorkspacePageGrid", "masthead={");
    expect(grid).not.toContain("fill");
  });

  /**
   * ⚠️ THE SCROLLER'S `padding-bottom` IS A SUM OF TWO TOKENS — the page's `--wpg-foot` and the
   * working state's `--wpg-reclaim-pad`. Declaring the property here REPLACES both contributions
   * rather than adding to one, which is exactly the collision the sum was built to end. The page's
   * foot padding goes on an inner element instead.
   */
  it("never declares padding-bottom on the scroll row", () => {
    for (const block of rules.split("}")) {
      if (!block.includes(".wpg-scroll")) continue;
      expect(block, "this page must not set padding-bottom on .wpg-scroll").not.toMatch(/padding-bottom\s*:/);
      expect(block, "this page must not set the grid's own reclaim term").not.toContain("--wpg-reclaim-pad");
    }
  });

  it("carries its foot padding on an inner element", () => {
    expect(rule(".ct-pagebody")).toMatch(/padding\s*:/);
  });
});

describe("Phase 2 — the row alignment fix (baked decision 4)", () => {
  /**
   * ⚠️ BOTH GRIDS, AND THE VALUE IS EXTRACTED RATHER THAN PATTERN-EXCLUDED. Rows used to centre, so
   * any row carrying a match line dragged its neighbours' tick and buttons out of line.
   */
  /**
   * ⚠️ RETARGETED (v2 §3), AND THE CLAIM IS NOW STRUCTURAL RATHER THAN A VALUE.
   *
   * The old lock required `align-items: start` on a FIVE-TRACK row (grip · tick · text · chips ·
   * actions) where every cell shared one line box, so a row carrying a match line really could drag
   * its neighbours' controls out of line. The card has three tracks — spine · main · aside — each
   * with its own padding, so that failure is no longer reachable by content: nothing in `main` can
   * move anything in `aside`.
   *
   * ⚠️ AND THE VALUE HAD TO CHANGE TO `stretch`, DELIBERATELY. The spine is a full-height coloured
   * edge; `start` would collapse it to the height of its own rotated text and leave the card's left
   * edge part-painted. So the lock asserts what actually matters now — three independent tracks,
   * and a spine that fills the card.
   */
  it("the card's three tracks are independent, and the spine fills its height", () => {
    const block = rule(".ct-crow");
    const cols = block.match(/grid-template-columns\s*:([^;]*);/);
    expect(cols, ".ct-crow states no grid-template-columns").not.toBeNull();
    /* ⚠️ `minmax(0, 1fr)` ON THE MIDDLE TRACK, never a bare `1fr` — a `1fr` track's automatic
       minimum is min-content, so one long unbroken title would push the aside off the card. */
    expect(cols![1]).toContain("minmax(0, 1fr)");
    const align = block.match(/align-items\s*:([^;]*);/);
    expect(align, ".ct-crow states no align-items").not.toBeNull();
    expect(align![1].trim(), "the spine must fill the card, not hug its own text").toBe("stretch");
    /* the retired header must not come back — it named columns this layout does not have */
    expect(rules).not.toMatch(/["\s`]ct-thead["\s`]|\.ct-thead\s*\{/);
  });

  /**
   * ⚠️ THE ASIDE IS A FIXED WIDTH, never content-sized — that is what keeps every card's right edge
   * flush regardless of title length. `auto` here reverts the fix.
   *
   * ⚠️ RETARGETED (v2 §3): the second grid was `.ct-thead`, which is retired — the card layout has
   * no column header to keep in step. ONE grid now, so there is nothing left to disagree with.
   *
   * ⚠️ AND THE VALUE IS EXTRACTED AND COMPARED, never pattern-excluded. A regex written as
   * `grid-template-columns\s*:\s*(?!auto)` would pass on `auto` — `\s*` backtracks to zero width so
   * the lookahead is tested against the space, which is the exact shape this repo has been bitten by
   * twice. Take the value, then compare it in code.
   */
  it("the card's aside is a fixed width, never content-sized", () => {
    const cols = rule(".ct-crow").match(/grid-template-columns\s*:([^;]*);/);
    expect(cols, ".ct-crow states no grid-template-columns").not.toBeNull();
    const tracks = cols![1].trim();
    const last = tracks.split(/\s+/).pop()!;
    expect(["auto", "min-content", "max-content"], "the aside sizes to content").not.toContain(last);
    expect(last).toMatch(/^\d+px$/);
    /* and the spine is fixed too — a spine that grew with its year would stagger the cards */
    const first = tracks.split(/\s+/)[0];
    expect(first, "the spine sizes to content").toMatch(/^\d+px$/);
  });

  /**
   * ⚠️ REVEALED ON HOVER **AND** FOCUS-WITHIN. A hover-only reveal makes edit, remove and the
   * reorder grip unreachable without a pointer.
   */
  /**
   * ⚠️ RETARGETED (v2 §3): `.acts` and `.grip` became ONE revealed cluster, `.ct-cacts`, in the
   * card's aside — the grip moved in beside Edit and Remove rather than sitting in its own track.
   * One selector now covers all three controls, so the claim is unchanged and there is one fewer
   * way for them to disagree.
   *
   * ⚠️ AND A COARSE POINTER IS ASSERTED TOO. `:hover` and `:focus-within` between them still leave
   * a touch device with no way to reveal the actions — it has no hover and does not focus on tap —
   * so the cluster is unconditionally visible under `(hover: none)`. That case was never covered.
   */
  it("card actions reveal on focus as well as hover, and are always on without a pointer", () => {
    expect(rules).toContain(".ct-crow:hover .ct-cacts, .ct-crow:focus-within .ct-cacts");
    expect(rules).toContain("@media (hover: none)");
    /* the grip lives inside the revealed cluster, so it cannot be left behind by a future edit */
    expect(tsx).toMatch(/className="ct-cacts"[\s\S]{0,400}className="ct-grip"/);
  });
});

describe("Phase 2 — accessibility carried into the build, not after it", () => {
  it("the tick is a switch that names its comp and states whether it is on", () => {
    expect(tsx).toContain('role="switch"');
    expect(tsx).toContain("aria-checked={!!c.inQuery}");
    expect(tsx).toContain("aria-label={`Use ${c.title} in your query line`}");
  });

  /**
   * ⚠️ THE REGION IS LIVE, NOT THE SEGMENTS — the recomposed sentence is announced once per tick
   * rather than fragment by fragment as each `<span>` arrives.
   *
   * ⚠️ RETARGETED (Prompt 2), NOT RELAXED. The count was `1` because the hero line was the page's
   * only live region; the Scout's run narration is legitimately a second one — a writer who cannot
   * see the steps advancing should still be told the Scout is working. Counting live regions was
   * never the rule; where they sit is. So this now asserts the hero line's own region and that the
   * segments carry none of their own.
   */
  it("the query line is one live region, and its segments are not", () => {
    /* ⚠️ ANCHORS RETARGETED (v2 §3) — the block is `.ct-qline-text` inside its own card now, and
       what follows it is the tick-chip row rather than the format control. `sliceBetween` failed
       loudly naming the missing anchor rather than silently widening to the rest of the file,
       which is exactly what it exists for. */
    const hero = sliceBetween(src, 'className={`ct-qline-text', "ct-qchips");
    expect(hero, "the query line lost its live region").toContain('aria-live="polite"');
    expect((hero.match(/aria-live/g) ?? []).length, "the segments announce individually").toBe(1);
  });

  it("reorder is reachable from the keyboard, and says so", () => {
    expect(tsx).toContain("e.altKey");
    expect(tsx).toContain('e.key === "ArrowUp"');
    expect(tsx).toContain('e.key === "ArrowDown"');
    expect(tsx).toMatch(/aria-label=\{`Reorder \$\{c\.title\}/);
  });

  /** reduced motion drops the tweening; the states themselves must survive */
  it("reduced motion suppresses transitions only", () => {
    expect(rules).toContain("@media (prefers-reduced-motion: reduce)");
    const block = rules.slice(rules.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(block).not.toMatch(/display\s*:\s*none/);
  });
});

describe("the page advertises no shortcut it does not have", () => {
  /**
   * ⚠️ INVERTED BY PHASE 3, NOT DELETED — the RULE never moved. Phase 2 rendered no `N` hint because
   * the shortcut did not exist; a hint for a dead key is the fault, in either direction. Now that
   * the handler is here the hint is correct, so the gate asserts the PAIR rather than the absence:
   * the affordance and the key ship together or neither ships. (Same rule that kept ⌘L/⌘N off the
   * shell's quick actions while no registry existed.)
   */
  it("the N affordance and the N handler exist together", () => {
    const add = sliceBetween(src, 'className="ct-addrow"', "ct-cfoot");
    const hintShown = add.includes("ct-kbd");
    const handlerExists = /e\.key\.toLowerCase\(\) !== "n"/.test(src);
    expect(hintShown, "the add row hints a key the page does not handle").toBe(handlerExists);
  });

  /** ⚠️ AND IT MUST NOT FIRE WHILE SOMEONE IS TYPING — a bare letter shortcut inside a field. */
  it("the N shortcut stands down inside an editable", () => {
    expect(src).toMatch(/INPUT\|TEXTAREA\|SELECT/);
    expect(src).toContain("isContentEditable");
  });
});
