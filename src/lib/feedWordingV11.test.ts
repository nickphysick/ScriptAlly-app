/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FEED WORDING v1.1 — Part 1: the rulings on the v1 report, locked.
 *   · Others told: "You told {n} other agents about the offer from [X]" ("1 other agent"); the count is CARRIED on the
 *     feed row (`toldCount`), never read back out of its description.
 *   · Offer call: "You booked a call with [X] about [T]" ("You booked a call with [X]" with no title).
 *   · Open status Unknown has no sentence of its own: "You updated [X]'s details".
 *   · The collapsed headline has no line cap (source half; the rendered half is tests/e2e/feedWordingV11.measure.ts).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../types";
import { feedEntries, sayText } from "./dashFeed";
import { houseSay } from "./feedHouse";

const NOW = new Date(2026, 10, 24, 15, 0, 0);
const at = (minsAgo: number) => new Date(NOW.getTime() - minsAgo * 60_000).toISOString();
const agent = { id: "ag1", name: "Nadia Hussain", agency: "Hussain Literary" } as Agent;
const ms = { id: "m1", title: "Tidewrack" } as Manuscript;
const query = { id: "q1", agentId: "ag1", manuscriptId: "m1", status: QueryStatus.OFFER, dateSent: at(60 * 24 * 40) } as Query;
let seq = 0;
const row = (over: Partial<Activity>): Activity => ({
  id: `v11-${++seq}`, userId: "u", queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED, date: at(30),
  details: "", description: "stored words", ...over,
} as Activity);
const one = (a: Activity, manuscripts: Manuscript[] = [ms]) => {
  const e = feedEntries({ activities: [a], queries: [query], agents: [agent], manuscripts, now: NOW, seenAt: null });
  expect(e, "population: the row is on the feed").toHaveLength(1);
  return e[0];
};

describe("Part 1 — Others told", () => {
  it.each([
    [3, "You told 3 other agents about the offer from Nadia Hussain"],
    [1, "You told 1 other agent about the offer from Nadia Hussain"],
  ])("a count of %i", (n, want) => {
    const e = one(row({ eventKey: "offer_told", toldCount: n, description: `You told ${n} agents about Nadia’s offer` }));
    expect(sayText(e.say)).toBe(want);
    expect(e.say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
  });
  it("the count is the carried field, not the description's figure", () => {
    const e = one(row({ eventKey: "offer_told", toldCount: 4, description: "You told 9 agents about Nadia’s offer" }));
    expect(sayText(e.say)).toBe("You told 4 other agents about the offer from Nadia Hussain");
  });
  it("the told write carries the count on the feed row, and the step's edit keeps it there", () => {
    const src = readFileSync("src/lib/qc152Write.ts", "utf8");
    const feedRow = src.slice(src.indexOf("const feedRow: DocumentData"), src.indexOf("return { queryId: q.id, set: [{ path: `queries/${q.id}/activity/${id}`, data: sub }"));
    expect(feedRow).toContain("toldCount: count");
    expect(src).toMatch(/s\.kind === "told" && typeof next\.toldCount === "number"\) \{[^}]*f\.toldCount = next\.toldCount/);
  });
  it("the rules allow the count on the feed row, on create and on the step's edit", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    const top = rules.slice(rules.indexOf("function isValidActivity(data, userId)"), rules.indexOf("function isValidJournalEntry"));
    expect(top).toContain("(!data.keys().hasAny(['toldCount']) || (data.toldCount is int && data.toldCount >= 1 && data.toldCount <= 500))");
    const upd = rules.slice(rules.indexOf("match /activities/{activityId}"), rules.indexOf("// The top-level users/{uid}/activity store is RETIRED"));
    expect(upd).toMatch(/affectedKeys\(\)\.hasOnly\(\[[^\]]*'toldCount'/);
  });
});

describe("Part 1 — Offer call", () => {
  it("with a title", () => {
    const e = one(row({ eventKey: "offer_call", description: "Offer call booked with Nadia Hussain" }));
    expect(sayText(e.say)).toBe("You booked a call with Nadia Hussain about Tidewrack");
    expect(e.say.filter((s) => s.who).map((s) => s.t)).toEqual(["Nadia Hussain"]);
    expect(e.say.filter((s) => s.em).map((s) => s.t)).toEqual(["Tidewrack"]);
  });
  it("without one", () => {
    const e = one(row({ eventKey: "offer_call", manuscriptId: "", description: "Offer call booked with Nadia Hussain" }), []);
    expect(sayText(e.say)).toBe("You booked a call with Nadia Hussain");
  });
});

describe("Part 1 — open status Unknown has no sentence of its own", () => {
  const P = { t: "Nadia Hussain", who: true } as const;
  it("a change to Unknown reads as the details sentence", () => {
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Unknown" }, P)!)).toBe("You updated Nadia Hussain's details");
  });
  it("Open and Closed keep theirs", () => {
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Open" }, P)!)).toBe("You marked Nadia Hussain as open to queries");
    expect(sayText(houseSay({ activityType: ActivityType.AGENT_UPDATED, changed: ["open"], changedTo: "Closed" }, P)!)).toBe("You marked Nadia Hussain as closed to queries");
  });
  it("no sentence says 'not known'", () => {
    expect(readFileSync("src/lib/feedHouse.ts", "utf8")).not.toContain("not known");
  });
});

describe("Part 1 — the collapsed headline has no line cap", () => {
  const css = readFileSync("src/components/dashboard/v2/dash2Feed.css", "utf8") + readFileSync("src/components/dashboard/f1/df1.css", "utf8");
  it("no line clamp and no ellipsis anywhere in the feed's headline rules", () => {
    const feedRules = css.split("}").filter((r) => /df1-(ctx|hl|crow)/.test(r));
    expect(feedRules.length, "population: the collapsed row's rules").toBeGreaterThan(0);
    for (const r of feedRules.filter((x) => /df1-(ctx b|hl)/.test(x))) {
      expect(r, r).not.toMatch(/line-clamp/);
      expect(r, r).not.toMatch(/text-overflow:\s*ellipsis/);
    }
  });
});
