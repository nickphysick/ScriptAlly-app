/**
 * The folder tab's fit rules (ink shell v1, normative): full names while they fit, then icons, then
 * "+N" — the order is the sidebar's, the current page is never among the siblings (it is the paper
 * tab), and the limit is the caller's (24px short of the search field). The rendered half — real
 * widths, a real bar, an injected eight-page group — is INK6 in tests/e2e/inkShell.measure.ts.
 */
import { describe, it, expect } from "vitest";
import { planTabs } from "./FolderTab";

const ICON = 37;
const full = (n: number, w = 120) => Array.from({ length: n }, () => w);

describe("planTabs — names, then icons, then +N", () => {
  it("names every sibling while they all fit", () => {
    expect(planTabs(full(2), ICON, 300, 1000)).toEqual({ modes: ["full", "full"], overflowFrom: null });
  });

  it("drops to icons from the first name that would not fit — never back to names after it", () => {
    /* start 300, limit 780: three names (ending 420, 546, 672), then the fourth would end at 798 —
       so it and the fifth become icons (ending 715 with 58 held for a "+N", then 758 with none) */
    const plan = planTabs([120, 120, 120, 120, 120], ICON, 300, 780);
    expect(plan).toEqual({ modes: ["full", "full", "full", "ic", "ic"], overflowFrom: null });
    const firstIcon = plan.modes.indexOf("ic");
    expect(firstIcon).toBeGreaterThan(0);
    expect(plan.modes.slice(firstIcon).every((m) => m === "ic")).toBe(true);
  });

  it("ends in +N when even icons will not fit, keeping the sidebar's order", () => {
    const plan = planTabs(full(8), ICON, 300, 560);
    expect(plan.overflowFrom).not.toBeNull();
    /* everything before the overflow is placed, in order; everything from it is in the menu */
    expect(plan.modes).toHaveLength(plan.overflowFrom!);
  });

  it("names → icons → +N appear in that order and never interleave", () => {
    for (let limit = 320; limit < 1400; limit += 17) {
      const plan = planTabs([90, 140, 110, 160, 100, 130, 120, 150], ICON, 300, limit);
      const seq = plan.modes.join("");
      expect(seq, `limit ${limit}`).toMatch(/^(full)*(ic)*$/);
    }
  });

  it("with no room at all, every sibling goes to the menu — the paper tab is still the page", () => {
    expect(planTabs(full(3), ICON, 300, 300)).toEqual({ modes: [], overflowFrom: 0 });
  });
});
