import { describe, it, expect } from "vitest";
import {
  TAB_ORDER, TAB_LABEL, tabOf, rowInTab, type TimelineTab,
  GROUP_MODES, GROUP_MODE_LABEL, groupKeyOf,
} from "./timelineViews";
import { GROUP_ORDER, ASKING_GROUPS, type RowGroup } from "./timelineGroups";

describe("the Calendar's four views", () => {
  it("⚠️ THE THREE VIEWS PARTITION EVERY GROUP — none omitted, none in two", () => {
    /* The reconciliation invariant, and the reason the module exists. A tab set that leaves a
       group out puts rows in `All` and nowhere else, so three counts sit beside a fourth they do
       not add up to; one that puts a group in two makes the same row appear twice. Asserted over
       `GROUP_ORDER` rather than a list written here, so a seventh group fails this case rather
       than quietly falling through a default. */
    const home = new Map<RowGroup, TimelineTab>();
    for (const g of GROUP_ORDER) home.set(g, tabOf(g));
    expect(home.size, "a group with no view").toBe(GROUP_ORDER.length);
    for (const g of GROUP_ORDER) {
      const belongs = TAB_ORDER.filter((t) => t !== "all").filter((t) => rowInTab(t, g));
      expect(belongs, `${g} belongs to ${belongs.length} views`).toHaveLength(1);
    }
    /* and every group is in `All` */
    for (const g of GROUP_ORDER) expect(rowInTab("all", g), `${g} missing from All`).toBe(true);
  });

  it("⚠️ SNOOZED AND SOON GO WITH THE AGENT, which is the decision this module makes", () => {
    /* a snooze is the writer deferring their own attention; the relationship is still out */
    expect(tabOf("snoozed")).toBe("agents");
    expect(tabOf("soon")).toBe("agents");
    expect(tabOf("watching")).toBe("agents");
  });

  it("reads the asking groups rather than re-listing them", () => {
    for (const g of ASKING_GROUPS) expect(tabOf(g), `${g} is an asking group`).toBe("needs");
    expect(tabOf("closed")).toBe("closed");
  });

  it("⚠️ A TASK ROW HAS ITS OWN VIEW, dated or not — which is what stops a double count", () => {
    /* it belongs to no query, so it has no group. It went to `needs` until v54 gave it a tab of
       its own; leaving it in both would put two of the board's rows in two views at once, and the
       four counts would no longer sum to the fifth. */
    expect(tabOf(null, true)).toBe("tasks");
    expect(tabOf(null, false)).toBe("tasks");
    expect(rowInTab("needs", null, true)).toBe(false);
    expect(rowInTab("agents", null, true)).toBe(false);
    expect(rowInTab("closed", null, false)).toBe(false);
    expect(rowInTab("all", null, false)).toBe(true);
  });

  it("every view has a label, and `All` leads", () => {
    expect(TAB_ORDER[0]).toBe("all");
    expect([...TAB_ORDER]).toEqual(["all", "needs", "agents", "tasks", "closed"]);
    for (const t of TAB_ORDER) expect(TAB_LABEL[t], `${t} has no label`).toBeTruthy();
    expect(Object.keys(TAB_LABEL)).toHaveLength(TAB_ORDER.length);
  });
});

describe("how the board is arranged", () => {
  it("⚠️ EVERY MODE BUCKETS THE SAME ROWS — grouping is never a filter", () => {
    /* the claim the whole model rests on: a mode decides where a row is DRAWN, never whether it is
       drawn. Asserted as an identity between the row sets each mode produces. */
    const rows = [
      { group: "now" as const, manuscript: "A" },
      { group: "watching" as const, manuscript: "B" },
      { group: "closed" as const, manuscript: "A" },
      { group: null, hasDatedTask: true, manuscript: null },
    ];
    for (const m of GROUP_MODES) {
      const bucketed = rows.map((r) => ({ r, k: groupKeyOf(m, r) }));
      expect(bucketed.map((b) => b.r), `${m} lost or gained a row`).toEqual(rows);
    }
  });

  it("`One list` names no bucket, because a flat list has no headings", () => {
    for (const r of [{ group: "now" as const }, { group: null }]) {
      expect(groupKeyOf("list", r)).toBeNull();
    }
  });

  it("⚠️ `Whose move` READS THE TABS' OWN ANSWER, so a heading cannot disagree with a tab", () => {
    for (const g of GROUP_ORDER) expect(groupKeyOf("move", { group: g })).toBe(tabOf(g));
    expect(groupKeyOf("move", { group: null })).toBe(tabOf(null));
  });

  it("every mode has a label, and there are exactly four", () => {
    expect(GROUP_MODES).toHaveLength(4);
    for (const m of GROUP_MODES) expect(GROUP_MODE_LABEL[m]).toBeTruthy();
    expect(Object.keys(GROUP_MODE_LABEL)).toHaveLength(4);
  });
});
