/**
 * The expanded card's box, moved here from `qcRail.test.tsx` when the rail retired (v126 §4). The
 * cases are unchanged; only the stacking width is now a stated constant rather than the rail's.
 */
import { describe, expect, it } from "vitest";
import { EXPANDED_MIN_WINDOW, expandedBox } from "./qcWindow";

const WIN = { top: 96, left: 290, right: 1418, height: 700, width: 1128 };

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
    expect(expandedBox({ ...WIN, width: EXPANDED_MIN_WINDOW - 1 }, GROUP, VH), "stacked: there is no card to grow").toBeNull();
    expect(expandedBox(WIN, { left: 400, right: 400 }, VH), "a group with no width").toBeNull();
    expect(expandedBox(WIN, GROUP, 0), "a viewport with no height is a page before layout").toBeNull();
    expect(expandedBox(WIN, GROUP, 20), "…and one shorter than its own insets").toBeNull();
  });
});

