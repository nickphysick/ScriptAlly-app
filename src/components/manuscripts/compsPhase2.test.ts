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
    const grid = tsx.slice(tsx.indexOf("<WorkspacePageGrid"), tsx.indexOf("plate={"));
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
  it("both row grids align to start, never centre", () => {
    for (const sel of [".ct-crow", ".ct-thead"]) {
      const block = rule(sel);
      const m = block.match(/align-items\s*:([^;]*);/);
      if (sel === ".ct-crow") {
        expect(m, ".ct-crow states no align-items").not.toBeNull();
        expect(m![1].trim()).toBe("start");
      }
    }
  });

  /**
   * ⚠️ THE ACTION COLUMN IS A FIXED WIDTH, never content-sized — that is what keeps every row's
   * right edge flush regardless of title length. `auto` here reverts the fix.
   */
  it("the action column is a fixed width in both grids", () => {
    for (const sel of [".ct-crow", ".ct-thead"]) {
      const cols = rule(sel).match(/grid-template-columns\s*:([^;]*);/);
      expect(cols, `${sel} states no grid-template-columns`).not.toBeNull();
      const last = cols![1].trim().split(/\s+/).pop()!;
      expect(["auto", "min-content", "max-content"], `${sel}'s action column sizes to content`).not.toContain(last);
      expect(last).toMatch(/^\d+px$/);
    }
  });

  /**
   * ⚠️ REVEALED ON HOVER **AND** FOCUS-WITHIN. A hover-only reveal makes edit, remove and the
   * reorder grip unreachable without a pointer.
   */
  it("row actions and the grip reveal on focus as well as hover", () => {
    expect(rules).toContain(".ct-crow:hover .acts, .ct-crow:focus-within .acts");
    expect(rules).toContain(".ct-crow:hover .grip, .ct-crow:focus-within .grip");
  });
});

describe("Phase 2 — accessibility carried into the build, not after it", () => {
  it("the tick is a switch that names its comp and states whether it is on", () => {
    expect(tsx).toContain('role="switch"');
    expect(tsx).toContain("aria-checked={!!c.inQuery}");
    expect(tsx).toContain("aria-label={`Use ${c.title} in your query line`}");
  });

  /** ⚠️ THE REGION IS LIVE, NOT THE SEGMENTS — the recomposed sentence is announced once per tick. */
  it("the hero line announces politely, once", () => {
    expect(tsx).toContain('aria-live="polite"');
    expect(src.match(/aria-live/g) ?? []).toHaveLength(1);
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
    const add = src.slice(src.indexOf('className="ct-addrow"'), src.indexOf("ct-cfoot"));
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
