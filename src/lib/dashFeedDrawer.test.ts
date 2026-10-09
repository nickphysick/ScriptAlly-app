/** DASHBOARD v58 — the feed drawer's arrangement: filter, summary, day headings, the step back. */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import type { FeedEntry } from "./dashFeed";
import { drawerDays, drawerEvents, drawerSummary, earlierWindow, todayCount, windowEndLine, defaultFrom } from "./dashFeedDrawer";

const NOW = new Date(2026, 9, 9, 15, 0, 0);
const at = (d: number, h = 10) => new Date(2026, 9, d, h).getTime();
const e = (id: string, t: number, dir: "in" | "out", over: Partial<FeedEntry> = {}): FeedEntry => ({
  id, at: t, time: "10:00am", dayLabel: "", pill: "Partial requested", status: QueryStatus.PARTIAL_REQUESTED, state: "you", app: false,
  say: [{ t: "x" }], provenance: "", action: null, requery: null, queryId: "q1", isNew: false,
  dir, activityType: "Status Changed", who: "A", agency: "Agency", need: null, met: null, ...over,
});

describe("the feed drawer", () => {
  const entries = [
    e("a", at(9), "in", { need: { label: "Send the partial" } }),
    e("b", at(9, 8), "out", { status: null, pill: "Added" }),
    e("c", at(8), "out", { status: QueryStatus.QUERIED }),
    e("d", at(7), "in", { met: "8 Oct" }),
    e("r", at(6), "in", { status: QueryStatus.REJECTED, pill: "Passed", state: "closed" }),
  ];

  it("From agents shows only replies; By you only the writer's own", () => {
    expect(drawerEvents(entries, [], "in").map((x) => x.entry.id)).toEqual(["a", "d", "r"]);
    expect(drawerEvents(entries, [], "out").map((x) => x.entry.id)).toEqual(["b", "c"]);
    expect(drawerEvents(entries, [], "all").length).toBe(5);
  });

  it("the three figures are over the whole window", () => {
    expect(drawerSummary(entries)).toEqual({ replies: 3, did: 2, need: 1 });
  });

  it("a pass names how far it got; with no row it is the query", () => {
    expect(drawerEvents(entries, []).find((x) => x.entry.id === "r")?.tag).toBe("Passed on query");
  });

  it("days carry the full date, and today says so", () => {
    const days = drawerDays(drawerEvents(entries, []), NOW);
    expect(days.map((d) => [d.heading, d.count])).toEqual([
      ["Today · Friday 9 October", "2 updates"], ["Thursday 8 October", "1 update"], ["Wednesday 7 October", "1 update"], ["Tuesday 6 October", "1 update"],
    ]);
    expect(todayCount(entries, NOW)).toBe(2);
  });

  it("the step back is the month before the window, from its first day", () => {
    const step = earlierWindow(defaultFrom(NOW));
    expect(step.label).toBe("September");
    expect(new Date(step.from).getDate()).toBe(1);
    expect(windowEndLine(defaultFrom(NOW), NOW)).toBe("That's the last 30 days.");
    expect(windowEndLine(step.from, NOW)).toBe("That's everything since 1 Sep.");
  });
});
