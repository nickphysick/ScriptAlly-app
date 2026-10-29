/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DFV-C — Dashboard first visit v1, Part C: real tasks always outrank Getting started and housekeeping, the last page
 * names nothing after it, and the pager states its count at every size.
 *
 * ⚠️ THE PACK'S TWO FIXTURES WERE NOT ORDERING FAULTS (see the report's false premises): S4's "partial request" was a
 * response the dev rules refused, so no request exists on that account; S5x's overdue query has no reply window on its
 * agent, so `replyTask` raises nothing to order. The ORDER they were meant to prove is locked here on the plan itself.
 */
import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { LIST_ORDER, gettingStartedItem, listPlan, type ListGroupKey, type ListItem } from "./dashList";
import { posText, thenIndex } from "../components/dashboard/v71/Dash71Task";

const item = (group: ListGroupKey, n: number): ListItem => ({
  key: `${group}:${n}`, group, tone: "house", pre: `${group} ${n}`, who: "", post: "", initials: "", fact: "", agency: "",
  status: null, when: "", foot: "", actLabel: "", action: { kind: "route", tab: "todo" }, stages: null, note: null, date: null,
});

describe("DFV-C · the order", () => {
  it("is: your move, nudges, closes, Getting started, housekeeping — then the two caught-up groups", () => {
    expect(LIST_ORDER).toEqual(["req", "nudge", "quiet", "start", "house", "ready", "coming"]);
    const plan = listPlan({ house: [item("house", 1)], start: [gettingStartedItem()], quiet: [item("quiet", 1)], nudge: [item("nudge", 1)], req: [item("req", 1)] });
    expect(plan.groups.map((g) => g.key)).toEqual(["req", "nudge", "quiet", "start", "house"]);
  });
  it("a request is page 1 whatever housekeeping is waiting (the S4 case)", () => {
    const plan = listPlan({ house: [item("house", 1), item("house", 2), item("house", 3), item("house", 4)], req: [item("req", 1)] });
    expect(plan.items[0].group).toBe("req");
  });
  it("an overdue close comes before housekeeping (the S5x case)", () => {
    const plan = listPlan({ house: [item("house", 1)], quiet: [item("quiet", 1)] });
    expect(plan.items.map((i) => i.group)).toEqual(["quiet", "house"]);
  });
  it("Getting started comes after every real task and before housekeeping", () => {
    const plan = listPlan({ house: [item("house", 1)], start: [gettingStartedItem()], nudge: [item("nudge", 1)] });
    expect(plan.items.map((i) => i.group)).toEqual(["nudge", "start", "house"]);
  });
  it("is work: while Getting started is open, Ready to query and Coming up wait", () => {
    const plan = listPlan({ start: [gettingStartedItem()], ready: [item("ready", 1)], coming: [item("coming", 1)] });
    expect(plan.groups.map((g) => g.key)).toEqual(["start"]);
  });
});

describe("DFV-C · the last page names nothing after it", () => {
  it("Then is the next page, and on the last page nothing — never the first again", () => {
    expect(thenIndex(4, 0)).toBe(1);
    expect(thenIndex(4, 2)).toBe(3);
    expect(thenIndex(4, 3)).toBeNull();
    expect(thenIndex(1, 0)).toBeNull();
  });
});

describe("DFV-C · the pager at every size", () => {
  it("reads \"2 of 4\"", () => {
    expect(posText(1, 4)).toBe("2 of 4");
  });
  it("no rule hides the pager's count in a narrow card (it was hidden below 420px — every window under 1920)", () => {
    const css = readFileSync("src/components/dashboard/v71/dash71.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/\.d71-pos\s*>\s*span\s*\{\s*display:\s*none/);
  });
});
