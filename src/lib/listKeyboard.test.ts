/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Query Centre list's navigation model (pairing pack §4c).
 *
 * ⚠️ THE SCROLLING IS NOT HERE, AND THAT IS STATED RATHER THAN IMPLIED. jsdom does not exist in this
 * repo and would not lay the list out if it did, so "the focused row is never hidden under a
 * heading" and "Down from a group's last row reaches the next group's first" on the PAGE are
 * `tests/e2e/qcListKeys.measure.ts`. What is here is every decision the widget makes.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  nextIndex, typeAheadIndex, nearestSurvivor, pageSizeFor,
  isListNavKey, isTypeAheadKey, LIST_NAV_KEYS, TYPEAHEAD_MS,
} from "./listKeyboard";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

describe("nextIndex — movement through one visual order", () => {
  it("Down and Up step by one", () => {
    expect(nextIndex("ArrowDown", 2, 10, 5)).toBe(3);
    expect(nextIndex("ArrowUp", 2, 10, 5)).toBe(1);
  });

  /* ⚠️ CLAMPS, NEVER WRAPS. In a master–detail list a wrap ALSO changes what the pane is reading,
     so a held-down arrow would cycle the whole database past the reader. */
  it("the ends hold", () => {
    expect(nextIndex("ArrowDown", 9, 10, 5), "Down at the bottom wrapped to the top").toBe(9);
    expect(nextIndex("ArrowUp", 0, 10, 5), "Up at the top wrapped to the bottom").toBe(0);
  });

  it("from nowhere, Down lands first and Up lands last", () => {
    expect(nextIndex("ArrowDown", -1, 10, 5)).toBe(0);
    expect(nextIndex("ArrowUp", -1, 10, 5)).toBe(9);
  });

  it("Home and End reach the ends of the filtered list", () => {
    expect(nextIndex("Home", 7, 10, 5)).toBe(0);
    expect(nextIndex("End", 2, 10, 5)).toBe(9);
    /* ⚠️ "THE FILTERED LIST" IS WHATEVER `count` IS — the caller passes the order it renders, so
       End on a filtered list is that list's end, not the database's. */
    expect(nextIndex("End", 0, 3, 5)).toBe(2);
  });

  it("Page keys move by a page and stop at the ends", () => {
    expect(nextIndex("PageDown", 1, 40, 12)).toBe(13);
    expect(nextIndex("PageUp", 20, 40, 12)).toBe(8);
    expect(nextIndex("PageDown", 35, 40, 12), "PageDown ran past the end").toBe(39);
    expect(nextIndex("PageUp", 3, 40, 12), "PageUp ran past the start").toBe(0);
  });

  it("an empty list answers nothing rather than 0", () => {
    for (const k of LIST_NAV_KEYS) expect(nextIndex(k, -1, 0, 5), `${k} landed on a row in an empty list`).toBeNull();
  });

  /* an index left over from a longer list must not escape the current one */
  it("a stale index outside the list is treated as no position", () => {
    expect(nextIndex("ArrowDown", 99, 10, 5)).toBe(0);
    expect(nextIndex("ArrowUp", 99, 10, 5)).toBe(9);
  });

  it("only the six keys are the list's", () => {
    for (const k of LIST_NAV_KEYS) expect(isListNavKey(k)).toBe(true);
    for (const k of ["Enter", " ", "Tab", "Escape", "a", "ArrowLeft"]) {
      expect(isListNavKey(k), `${k} was claimed by the list`).toBe(false);
    }
  });
});

describe("typeAheadIndex — letters jump to the next matching agent", () => {
  const names = ["Aisha Kapoor", "Marcus Reed", "Priya Raman", "Sophie Dunn", "Anna Bell", "William Tan"];

  it("a letter finds the next match after the current row", () => {
    expect(typeAheadIndex(names, "m", 0)).toBe(1);
    expect(typeAheadIndex(names, "p", 0)).toBe(2);
  });

  /* ⚠️ IT WRAPS. A search that gives up at the end of the list has failed to search. */
  it("it wraps past the end", () => {
    expect(typeAheadIndex(names, "m", 3), "the search stopped at the end instead of wrapping").toBe(1);
    expect(typeAheadIndex(names, "a", 5)).toBe(0);
  });

  /* ⚠️ A REPEATED LETTER CYCLES THROUGH THE MATCHES — the ARIA convention. Without it a second
     press sits on the first match and the key looks broken. */
  it("a repeated letter steps through the matches", () => {
    expect(typeAheadIndex(names, "a", -1)).toBe(0);   // Aisha
    expect(typeAheadIndex(names, "aa", 0)).toBe(4);   // Anna
    expect(typeAheadIndex(names, "aaa", 4)).toBe(0);  // back to Aisha
  });

  /* ⚠️ A GROWING BUFFER NARROWS IN PLACE. "so" typed after "s" must be allowed to match the row it
     already found, or the second letter would step past the answer. */
  it("a growing buffer may match where it already is", () => {
    expect(typeAheadIndex(names, "s", 2)).toBe(3);
    expect(typeAheadIndex(names, "so", 3), "the second letter stepped past its own match").toBe(3);
  });

  it("case does not matter, and no match answers nothing", () => {
    expect(typeAheadIndex(names, "WIL", 0)).toBe(5);
    expect(typeAheadIndex(names, "z", 0)).toBeNull();
    expect(typeAheadIndex([], "a", 0)).toBeNull();
    expect(typeAheadIndex(names, "", 0)).toBeNull();
  });

  /* ⚠️ A MODIFIER MEANS THE KEY IS SOMEONE ELSE'S. ⌘K is the page's search; treating its letter as
     type-ahead would move the reader's selection every time they reached for a shortcut. */
  it("only bare printable characters type ahead", () => {
    expect(isTypeAheadKey("a", {})).toBe(true);
    expect(isTypeAheadKey("A", {})).toBe(true);
    expect(isTypeAheadKey("k", { meta: true }), "⌘K typed ahead").toBe(false);
    expect(isTypeAheadKey("f", { ctrl: true })).toBe(false);
    expect(isTypeAheadKey("f", { alt: true })).toBe(false);
    expect(isTypeAheadKey("ArrowDown", {})).toBe(false);
    expect(isTypeAheadKey(" ", {}), "Space is a no-op, not a search").toBe(false);
  });

  it("the buffer's life is one stated figure", () => {
    expect(TYPEAHEAD_MS).toBe(500);
  });
});

describe("nearestSurvivor — focus after the list changes underneath it", () => {
  const before = ["a", "b", "c", "d", "e"];

  it("a row that survives keeps focus", () => {
    expect(nearestSurvivor(before, ["a", "c", "e"], "c")).toBe("c");
  });

  /* ⚠️ FORWARD FIRST: filtering REMOVES rows, so the row that took the missing one's place is the
     one now under the writer's eye. */
  it("a removed row hands focus to the row that took its place", () => {
    expect(nearestSurvivor(before, ["a", "b", "d", "e"], "c")).toBe("d");
  });

  it("a removal at the end falls back to the previous survivor", () => {
    expect(nearestSurvivor(before, ["a", "b", "c"], "e")).toBe("c");
  });

  /* ⚠️ NEVER THE TOP BY DEFAULT — that is the fault this function exists to prevent. It is the top
     only when there is genuinely nothing nearer. */
  it("it lands on the top only when the old position is unknown", () => {
    expect(nearestSurvivor(before, ["x", "y"], "c"), "an unrelated list still went to the top").toBe("x");
    expect(nearestSurvivor(before, ["a", "b"], null)).toBe("a");
    expect(nearestSurvivor(before, ["a", "b"], "zzz")).toBe("a");
  });

  it("an empty list answers nothing — there is no row to focus", () => {
    expect(nearestSurvivor(before, [], "c")).toBeNull();
  });
});

describe("pageSizeFor — a page is a viewport, not a constant", () => {
  it("it is the number of rows the scroller shows", () => {
    expect(pageSizeFor(600, 60)).toBe(10);
    expect(pageSizeFor(455, 60)).toBe(7);
  });

  /* ⚠️ AT LEAST ONE. A list measured before layout reports 0 and would make PageDown a key that
     does nothing — indistinguishable from a broken handler. */
  it("an unlaid-out list still moves", () => {
    expect(pageSizeFor(0, 60)).toBe(1);
    expect(pageSizeFor(600, 0)).toBe(1);
    expect(pageSizeFor(30, 60)).toBe(1);
  });
});

/**
 * ⚠️ THE RING RULE, LOCKED AFTER A DIAGNOSIS THAT FOUND NO FAULT. §4a expected `:focus` where
 * `:focus-visible` was meant. Measured on both localhost and the deployed build, in five paths
 * (cold click, keyboard-then-click, repeated clicks, programmatic focus after a click, programmatic
 * focus after a key): the clicked row matches `:focus` but never `:focus-visible`, and draws no
 * outline. The page's only ring rule is already `:focus-visible`.
 *
 * ⚠️ SO WHAT IS LOCKED IS THE CONDITION UNDER WHICH THE FAULT WOULD APPEAR — §4c calls `.focus()`
 * on rows, and a `:focus` ring rule anywhere near them would then draw for mouse users too.
 */
describe("§4a · the ring belongs to the keyboard", () => {
  const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("no rule on this page draws a ring on a plain `:focus`", () => {
    const drawing = css
      .split("}")
      .filter((b) => /:focus\b(?!-)/.test(b.split("{")[0] ?? ""))
      .filter((b) => /outline\s*:\s*(?!none)/.test(b) || /box-shadow\s*:\s*(?!none)/.test(b))
      /* a text field SHOULD show focus on click — `:focus` is correct there, and only there */
      .filter((b) => !/input|textarea|select|\.qc-note|\.qc-qain|\.qc-pickfield|\.qr-date/.test(b.split("{")[0] ?? ""));
    expect(drawing, `a non-field draws a ring on :focus: ${drawing.join(" ⁄ ")}`).toHaveLength(0);
  });

  it("the row's ring is the shared `:focus-visible` rule, unchanged", () => {
    expect(css, "the keyboard ring went").toContain("button:focus-visible { outline: 2px solid var(--ink)");
  });
});

/**
 * ⚠️ THE COMPONENT'S HALF, ASSERTED AT SOURCE BECAUSE THERE IS NO DOM HERE. These are the wirings a
 * pure module cannot own: which element the handler sits on, that the roving index is a tabindex
 * rather than a stack of tab stops, and that Enter and Space are stopped rather than left to
 * activate a `<button>` a second time.
 */
describe("§4c · the list is one composite widget", () => {
  const src = read("../components/Queries.tsx").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");

  it("the handler is on the listbox, not on every row", () => {
    expect(src, "the list stopped being a listbox").toContain('className="f12-rows" role="listbox"');
    expect(src, "the keyboard model is not wired to the list").toContain("onKeyDown={onListKeyDown}");
  });

  it("one tab stop: the rows rove", () => {
    /* ⚠️ IT READS THE *RESOLVED* ROVING, NOT THE RAW STATE. `rovingId` is null until the first
       keystroke, so a row comparing against it would leave NO row with `tabIndex={0}` and the list
       unreachable by Tab — a roving tabindex that has roved off the widget entirely. */
    expect(src, "the rows do not rove — every row would be a tab stop")
      .toContain("tabIndex={q.id === rovingResolved ? 0 : -1}");
    expect(src, "the roving falls back to nothing — Tab could not enter the list")
      .toContain("const rovingResolved = rovingId && visibleIds.includes(rovingId) ? rovingId");
  });

  /* ⚠️ SELECTION FOLLOWS FOCUS, so Enter and Space have nothing left to do — and a `<button>`
     activates on both by default, which would fire `pickRow` a second time for the row that is
     already selected. Stopped, not left to be harmless. */
  it("Enter and Space are no-ops, not a second mechanism", () => {
    expect(src, "Enter and Space still activate the row").toContain('if (e.key === "Enter" || e.key === " ") { e.preventDefault(); return; }');
  });

  it("the groups are groups, and their headings are not stops in the option flow", () => {
    expect(src, "the groups have no role").toContain('role="group"');
    expect(src, "a group has no accessible name").toContain("aria-label={`${GROUP_LABEL[g]}, ${items.length}`}");
  });

  /* ⚠️ ONE VISUAL ORDER, READ BY BOTH THE ARROWS AND THE RENDER. Two derivations of "which rows are
     showing" is how Down skips a row that is on screen. */
  it("the arrows and the render read the same list", () => {
    expect(src, "the visible order is not derived once").toContain("const visibleIds =");
    expect(src, "the render walks a different derivation than the arrows")
      .toContain("listGroups.map(({ g, items, foldable, shut })");
    expect(src, "the folded state is computed twice — once for the arrows and once for the render")
      .toContain("shut: foldable && !closedOpen && !holdsSelection");
  });
});
