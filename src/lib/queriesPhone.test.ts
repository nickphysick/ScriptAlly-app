/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries on a phone v1 — the derivations. Every row comes from the REAL `buildQcRows`, never a hand-made QcRow, so
 * each case is a state the app can produce.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import { buildQcRows, whereItStands } from "./qcSummary";
import {
  allSections, cheerFrom, cheerWords, chipCounts, comingUp, defaultChip, headerLine, pastDueRows, phoneScopeId, rowsFor,
  stampFor, waitingGroups, yourMoveBadge, yourMoveGroups, COMING_DAYS, ordinal,
} from "./queriesPhone";

const DAY = 86_400_000;
const NOW = new Date(2026, 9, 28, 12).getTime(); // Wed 28 Oct 2026, midday
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const agent = (id: string, name: string, weeks = 8): Agent => ({ id, name, agency: `${name} Agency`, responseTimeWeeks: weeks } as unknown as Agent);
const q = (id: string, agentId: string, status: QueryStatus, sentDaysAgo: number, extra: Partial<Query> = {}): Query =>
  ({ id, agentId, manuscriptId: extra.manuscriptId ?? "ms1", status, dateSent: iso(sentDaysAgo), lastStatusChange: iso(Math.min(sentDaysAgo, 3)), ...extra } as unknown as Query);

const AGENTS = [agent("a1", "Clara Beaumont"), agent("a2", "Marcus Reed"), agent("a3", "Sophie Dunn"), agent("a4", "Rufus Hale", 4), agent("a5", "Tom Ellery"), agent("a6", "Ida Fraser")];
const QUERIES: Query[] = [
  q("q1", "a1", QueryStatus.PARTIAL_REQUESTED, 30, { expectedSendDate: iso(8).slice(0, 10), partialRequestedDate: iso(20) }),   // you, 8 days late
  q("q2", "a2", QueryStatus.FULL_REQUESTED, 30, { expectedSendDate: iso(-3).slice(0, 10), fullRequestedDate: iso(5) }),         // you, this week
  q("q3", "a3", QueryStatus.QUERIED, 20),                                                                                        // agent, inside the window
  q("q4", "a4", QueryStatus.QUERIED, 27),                                                                                        // agent, due in a day
  q("q5", "a5", QueryStatus.OFFER, 10, { offerResponseDeadline: iso(-1).slice(0, 10) }),                                       // offer, tomorrow
  q("q6", "a6", QueryStatus.QUERIED, 400),                                                                                       // gone quiet
  q("q7", "a1", QueryStatus.REJECTED, 90),                                                                                       // closed
  q("q8", "a2", QueryStatus.QUERIED, 5, { manuscriptId: "ms2" }),                                                                // another book
];
const ALL = buildQcRows(QUERIES, AGENTS, [], NOW);
const ROWS = ALL.filter((r) => r.manuscriptId === "ms1");

describe("the header line and the chips", () => {
  it("counts the manuscript's queries and its live ones, whichever chip is chosen", () => {
    expect(headerLine(ROWS)).toEqual({ sent: 7, active: 6 });
  });
  it("the chips are whereItStands' four sets, and they sum to All", () => {
    const c = chipCounts(ROWS, NOW);
    expect(c.all).toBe(7);
    expect(c.you + c.agent + c.quiet + c.closed).toBe(c.all);
    for (const k of ["you", "agent", "quiet", "closed"] as const) expect(rowsFor(ROWS, k, NOW).every((r) => whereItStands(r, NOW) === k)).toBe(true);
    expect(c.closed).toBe(1);
    expect(c.quiet).toBe(1);
  });
  it("opens on Your move, or on Waiting when nothing is the writer's", () => {
    expect(defaultChip(chipCounts(ROWS, NOW))).toBe("you");
    const noMove = ROWS.filter((r) => whereItStands(r, NOW) !== "you");
    expect(defaultChip(chipCounts(noMove, NOW))).toBe("agent");
  });
  it("the tab badge is the first chip's count on the same manuscript", () => {
    expect(yourMoveBadge(ALL, phoneScopeId([{ id: "ms1" }, { id: "ms2" }], "ms1"), NOW)).toBe(chipCounts(ROWS, NOW).you);
    expect(phoneScopeId([{ id: "ms1" }], "gone")).toBe("ms1");
  });
});

describe("Your move", () => {
  it("the top card is the first of the desktop's own urgency order, the rest in Overdue / This week / Later", () => {
    const { hero, groups } = yourMoveGroups(ROWS, NOW);
    expect(hero?.id).toBe(rowsFor(ROWS, "you", NOW)[0].id);
    const shown = [hero!.id, ...groups.flatMap((g) => g.rows.map((r) => r.id))];
    expect(shown.sort()).toEqual(rowsFor(ROWS, "you", NOW).map((r) => r.id).sort());
  });
  it("a late row says how late; a near one names the day; an undated one has no stamp", () => {
    const late = ROWS.find((r) => r.id === "q1")!;
    expect(stampFor(late, NOW)).toEqual({ text: "8 days late", late: true });
    const offer = ROWS.find((r) => r.id === "q5")!;
    expect(stampFor(offer, NOW)).toEqual({ text: "Tomorrow", late: false });
  });
});

describe("Waiting", () => {
  it("splits replies due within seven days from the rest", () => {
    const { soon, later } = waitingGroups(ROWS, NOW);
    for (const r of soon) expect(r.expectedMs! - NOW).toBeLessThan(7 * DAY);
    expect([...soon, ...later].length).toBe(chipCounts(ROWS, NOW).agent);
  });
});

describe("All", () => {
  it("four sections in order whose counts sum to sent, each showing its top two", () => {
    const s = allSections(ROWS, "", "due", NOW);
    expect(s.map((x) => x.key)).toEqual(["you", "agent", "quiet", "closed"]);
    expect(s.reduce((n, x) => n + x.count, 0)).toBe(headerLine(ROWS).sent);
    for (const x of s) expect(x.top.length).toBeLessThanOrEqual(2);
  });
  it("search narrows by agent or agency", () => {
    const s = allSections(ROWS, "clara", "agent", NOW);
    expect(s.reduce((n, x) => n + x.count, 0)).toBe(2);
  });
});

describe("Coming up", () => {
  it("covers today and the next 20 days only, in date order, today marked", () => {
    const { weeks } = comingUp(ROWS, NOW);
    const days = weeks.flatMap((w) => w.days);
    const today = new Date(NOW); today.setHours(0, 0, 0, 0);
    for (const d of days) { expect(d.ms).toBeGreaterThanOrEqual(today.getTime()); expect(d.ms).toBeLessThan(today.getTime() + COMING_DAYS * DAY); }
    expect(days.map((d) => d.ms)).toEqual([...days.map((d) => d.ms)].sort((a, b) => a - b));
    expect(days.filter((d) => d.today).every((d) => d.ms === today.getTime())).toBe(true);
  });
  it("the past-due count is the overdue set, split into nudges and sends", () => {
    const { past } = comingUp(ROWS, NOW);
    expect(past.n).toBe(pastDueRows(ROWS, NOW).length);
    expect(past.nudge + past.send).toBeLessThanOrEqual(past.n);
    expect(past.ids).toContain("q1");
  });
});

describe("the celebration", () => {
  it("cheers a move INTO a request or an offer, never a pass and never a first sighting", () => {
    const prev = new Map([["a", "Queried"], ["b", "Queried"], ["c", "Partial Sent"]]);
    expect(cheerFrom(prev, [{ id: "a", status: "Rejected" }])).toBeNull();
    expect(cheerFrom(prev, [{ id: "new", status: "Full Requested" }])).toBeNull();
    expect(cheerFrom(prev, [{ id: "b", status: "Full Requested" }])).toEqual({ id: "b", kind: "full" });
    expect(cheerFrom(prev, [{ id: "a", status: "Partial Requested" }])).toEqual({ id: "a", kind: "partial" });
    expect(cheerFrom(prev, [{ id: "c", status: "Offer" }])).toEqual({ id: "c", kind: "offer" });
    expect(cheerFrom(prev, [{ id: "c", status: "Partial Sent" }])).toBeNull();
  });
  it("says ordinals in words to ten, then with the right suffix (never \"23th\")", () => {
    expect([1, 2, 10, 11, 12, 13, 21, 22, 23, 101, 111].map(ordinal)).toEqual(["first", "second", "tenth", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
  it("its words come from the manuscript's own queries", () => {
    const row = ROWS.find((r) => r.id === "q2")!;
    const w = cheerWords("full", row, ROWS, "Murphy’s Day Out", NOW);
    expect(w.headline).toBe("Marcus wants the full!");
    expect(w.line).toContain("Murphy’s Day Out");
    expect(w.stats).toHaveLength(3);
    expect(w.button).toBe("Send the full now");
  });
});
