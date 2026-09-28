/**
 * 1e · THE DASHBOARD FEED AND THE FORTNIGHT VIEW READ THE SAME "ADDED" ROWS THE SAME WAY (clean-up
 * pass, 28 Sep). The Fortnight view used to hide a second "Added" row for one agent; the feed never
 * did, so the two disagreed whenever a duplicate existed. With the duplicate-hiding gone, each row is
 * one event in both — including a duplicate, should one ever be written again.
 */
import { describe, expect, it } from "vitest";
import { ActivityType, type Activity, type Agent } from "../types";
import { feedEntries } from "./dashFeed";
import { deriveFortnightEvents } from "../components/dashboard/fortnightEvents";

const now = new Date("2026-09-28T12:00:00Z");
const day = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();
const agents = [
  { id: "a1", name: "Rowan Cleaver", agency: "Cleaver & Co" },
  { id: "a2", name: "Imogen Vale", agency: "Vale Literary" },
] as unknown as Agent[];
const row = (id: string, desc: string, d: number) =>
  ({ id, userId: "u", activityType: ActivityType.AGENT_ADDED, description: desc, manuscriptId: "", queryId: "", date: day(d), details: "" }) as Activity;

describe("the feed and the Fortnight view agree on 'Added' rows", () => {
  const cases: [string, Activity[]][] = [
    ["one row per agent", [row("act-added-agent-a1", "Added Rowan Cleaver at Cleaver & Co", 2), row("act-added-agent-a2", "Added Imogen Vale at Vale Literary", 3)]],
    ["a duplicate, should one be written again", [row("act-added-agent-a1", "Added Rowan Cleaver at Cleaver & Co", 2), row("act-old", "Added Rowan Cleaver at Cleaver & Co", 2)]],
  ];
  for (const [name, acts] of cases) {
    it(name, () => {
      const feed = feedEntries({ activities: acts, queries: [], agents, manuscripts: [], now, seenAt: null })
        .filter((e) => /added/i.test(e.pill)).length;
      const fortnight = deriveFortnightEvents([], agents, [], acts, now).filter((e) => e.type === "agent_added").length;
      expect(feed, "the feed drew no 'Added' rows — the fixture is not being read").toBeGreaterThan(0);
      expect(fortnight).toBe(feed);
    });
  }
});
