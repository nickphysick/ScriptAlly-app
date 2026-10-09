/**
 * DASHBOARD v58 — the fixed order (lock R2, the pure half).
 *
 * The rendered half is tests/e2e/dashV58.measure.ts. Here the five fixtures from the pack are
 * walked through the plan itself: which group is in focus, what the label says, what › does.
 */
import { describe, expect, it } from "vitest";
import { LIST_LABEL, LIST_ORDER, focusOf, groupHeading, listPlan, type ListGroupKey, type ListItem } from "./dashList";

const item = (group: ListGroupKey, n: number): ListItem => ({
  key: `${group}-${n}`, group, tone: "house", pre: "", who: `${group} ${n}`, post: "", initials: "", fact: "", agency: "",
  status: null, when: "", foot: "", actLabel: "", action: { kind: "route", tab: "todo" }, stages: null, note: null, date: null,
});
const make = (n: Partial<Record<ListGroupKey, number>>) =>
  Object.fromEntries(LIST_ORDER.map((k) => [k, Array.from({ length: n[k] ?? 0 }, (_, i) => item(k, i + 1))])) as Record<ListGroupKey, ListItem[]>;

describe("dashList — the order is fixed: waiting → nudge → gone quiet → housekeeping → ready → coming up", () => {
  it("A (3 waiting, 4 nudge, 2 quiet, 3 housekeeping): the focus is waiting #1, 1 OF 3; › makes it #2 and lists #1 and #3 first", () => {
    const plan = listPlan(make({ req: 3, nudge: 4, quiet: 2, house: 3, ready: 5, coming: 2 }));
    expect(plan.groups.map((g) => g.key)).toEqual(["req", "nudge", "quiet", "house"]);
    const f = focusOf(plan, 0);
    expect([f.item?.key, f.index + 1, f.of]).toEqual(["req-1", 1, 3]);
    expect(LIST_LABEL[f.item!.group].toUpperCase()).toBe("AGENTS ARE WAITING");
    expect(plan.thenLabel).toBe("Then");
    expect(plan.items.length).toBe(12);
    const g = focusOf(plan, 1);
    expect(g.item?.key).toBe("req-2");
    expect(g.rest[0].items.map((x) => x.key)).toEqual(["req-1", "req-3"]);
    expect(g.rest.map((x) => x.key)).toEqual(["req", "nudge", "quiet", "house"]);
    expect(groupHeading(g.rest[0], g.item)).toBe("Also waiting");
    expect(groupHeading(g.rest[1], g.item)).toBe("Worth a nudge");
  });

  it("B (0 / 2 / 0 / 5): the focus is a nudge, and empty groups are not shown", () => {
    const plan = listPlan(make({ nudge: 2, house: 5, ready: 3 }));
    expect(plan.groups.map((g) => g.key)).toEqual(["nudge", "house"]);
    expect(focusOf(plan, 0).item?.group).toBe("nudge");
  });

  it("C (housekeeping only): the focus is housekeeping", () => {
    const plan = listPlan(make({ house: 4, ready: 3, coming: 1 }));
    expect(plan.groups.map((g) => g.key)).toEqual(["house"]);
    expect(focusOf(plan, 0).item?.group).toBe("house");
    expect(plan.all).toEqual({ label: "All", tab: "todo" });
  });

  it("D (nothing in 1–4, unqueried agents exist): READY TO QUERY, and it says Also", () => {
    const plan = listPlan(make({ ready: 5, coming: 2 }));
    expect(plan.groups.map((g) => g.key)).toEqual(["ready"]);
    expect(LIST_LABEL[focusOf(plan, 0).item!.group].toUpperCase()).toBe("READY TO QUERY");
    expect(plan.thenLabel).toBe("Also");
    expect(plan.all.label).toBe("Contact list");
  });

  it("E (nothing in 1–5): COMING UP", () => {
    const plan = listPlan(make({ coming: 3 }));
    expect(plan.groups.map((g) => g.key)).toEqual(["coming"]);
    expect(LIST_LABEL[focusOf(plan, 0).item!.group].toUpperCase()).toBe("COMING UP");
    expect(plan.all.label).toBe("Calendar");
  });

  it("ready to query never shows beside work, and coming up never beside anything", () => {
    for (const k of ["req", "nudge", "quiet", "house"] as const) {
      const plan = listPlan(make({ [k]: 1, ready: 9, coming: 9 }));
      expect(plan.groups.map((g) => g.key), k).toEqual([k]);
    }
    expect(listPlan(make({ ready: 1, coming: 9 })).groups.map((g) => g.key)).toEqual(["ready"]);
  });

  it("the groups never appear out of order, whatever is found", () => {
    for (let mask = 0; mask < 64; mask += 1) {
      const n = Object.fromEntries(LIST_ORDER.map((k, i) => [k, (mask >> i) & 1 ? 2 : 0]));
      const keys = listPlan(make(n)).groups.map((g) => LIST_ORDER.indexOf(g.key));
      expect([...keys].sort((a, b) => a - b), `mask ${mask}`).toEqual(keys);
    }
  });

  it("nothing at all is the coming-up state with no item, never a crash", () => {
    const plan = listPlan(make({}));
    expect(plan.groups.map((g) => g.key)).toEqual(["coming"]);
    expect(focusOf(plan, 0)).toEqual({ item: null, index: 0, of: 0, rest: [] });
  });

  it("the step is clamped when the first group shrinks", () => {
    const plan = listPlan(make({ req: 2 }));
    expect(focusOf(plan, 7).item?.key).toBe("req-2");
    expect(focusOf(plan, -3).item?.key).toBe("req-1");
  });
});
