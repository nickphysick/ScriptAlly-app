import { describe, it, expect } from "vitest";
import { TAB_ORDER, TAB_LABEL, tabOf, rowInTab, type TimelineTab } from "./timelineViews";
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

  it("⚠️ A TASK ROW IS THE WRITER'S OWN, dated or not", () => {
    /* it belongs to no query, so it has no group; it can never be with an agent or closed */
    expect(tabOf(null, true)).toBe("needs");
    expect(tabOf(null, false)).toBe("needs");
    expect(rowInTab("agents", null, true)).toBe(false);
    expect(rowInTab("closed", null, false)).toBe(false);
  });

  it("every view has a label, and `All` leads", () => {
    expect(TAB_ORDER[0]).toBe("all");
    for (const t of TAB_ORDER) expect(TAB_LABEL[t], `${t} has no label`).toBeTruthy();
    expect(Object.keys(TAB_LABEL)).toHaveLength(TAB_ORDER.length);
  });
});
