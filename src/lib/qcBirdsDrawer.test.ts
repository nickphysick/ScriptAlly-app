import { describe, expect, it } from "vitest";
import { QueryStatus, type Agent, type Query } from "../types";
import { buildQcRows } from "./qcSummary";
import { eyeRows } from "./qcBirdsEye";
import { BVD_DEFAULT, bvdCounts, bvdFilterCount, bvdGroups, bvdMatches, pickSort, whenOf } from "./qcBirdsDrawer";

const NOW = Date.UTC(2026, 8, 23, 12);
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const mkQ = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  status: QueryStatus.QUERIED, dateSent: iso(20), ...over,
} as Query);
const agents: Agent[] = [
  { id: "a1", userId: "u", name: "Zara Ash", agency: "Bramble", responseTimeWeeks: 8 } as Agent,
  { id: "a2", userId: "u", name: "Ann Cole", agency: "Alder", responseTimeWeeks: 2 } as Agent,
  { id: "a3", userId: "u", name: "Mia Bell", agency: "Cedar" } as Agent,
];
/* built out of order: no order claim passes by luck */
const qs = [
  mkQ({ agentId: "a1", dateSent: iso(5) }),
  mkQ({ agentId: "a2", dateSent: iso(40) }),
  mkQ({ agentId: "a3", dateSent: iso(10) }),
  mkQ({ agentId: "a1", status: QueryStatus.FULL_REQUESTED, dateSent: iso(60) }),
  mkQ({ agentId: "a2", status: QueryStatus.PARTIAL_SENT, dateSent: iso(90), partialSentDate: iso(30) }),
  mkQ({ agentId: "a3", status: QueryStatus.OFFER, dateSent: iso(120) }),
  mkQ({ agentId: "a1", status: QueryStatus.REJECTED, dateSent: iso(70) }),
];
const rows = buildQcRows(qs, agents, [], NOW);

describe("the Birds-eye drawer's model (v126 §6)", () => {
  it("When has a No date bucket, and the four partition the live rows", () => {
    const live = eyeRows(rows, NOW);
    const c = bvdCounts(live, NOW);
    expect(c.when.overdue + c.when.upcoming + c.when.watch + c.when.nodate).toBe(live.length);
    expect(c.when.nodate, "the agency with no stated window").toBeGreaterThan(0);
    expect(c.when.overdue, "the two-week window sent 40 days ago").toBeGreaterThan(0);
    expect(live.some((r) => whenOf(r.row, NOW) === "nodate" && r.row.withYou), "a with-you query is never No date").toBe(false);
  });
  it("filters only what it is asked to, and counts what is on", () => {
    const live = eyeRows(rows, NOW);
    const v = { ...BVD_DEFAULT, stage: ["queried" as const], when: ["overdue" as const] };
    expect(bvdFilterCount(v)).toBe(2);
    expect(live.filter((r) => bvdMatches(r, v, NOW)).every((r) => r.row.status === QueryStatus.QUERIED && whenOf(r.row, NOW) === "overdue")).toBe(true);
    expect(live.filter((r) => bvdMatches(r, { ...BVD_DEFAULT, find: "cedar" }, NOW)).every((r) => r.row.agency === "Cedar")).toBe(true);
  });
  it("groups by Stage in pipeline order, and a filtered group states 'n of m'", () => {
    const g = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "stage" }, NOW);
    expect(g.map((x) => x.label)).toEqual(["Queried", "Partial sent", "Full requested", "Offer"]);
    const f = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "stage", find: "zara" }, NOW);
    const q = f.find((x) => x.label === "Queried")!;
    expect([q.shown, q.of]).toEqual([1, 3]);
    expect(f.some((x) => x.label === "Offer"), "an emptied group hides").toBe(false);
  });
  it("the direction toggle reverses each group exactly, and a new sort resets it", () => {
    for (const sortBy of ["due", "moved", "agent", "agency"] as const) {
      const a = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "none", sortBy }, NOW)[0].rows.map((r) => r.id);
      const b = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "none", sortBy, reversed: true }, NOW)[0].rows.map((r) => r.id);
      expect(b, sortBy).toEqual(a.slice().reverse());
    }
    expect(pickSort({ ...BVD_DEFAULT, reversed: true }, "agent").reversed).toBe(false);
    const byAgent = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "none", sortBy: "agent" }, NOW)[0].rows.map((r) => r.row.agentName);
    expect(byAgent).toEqual(byAgent.slice().sort((x, y) => x.localeCompare(y)));
  });
  it("No grouping is one group with no label", () => {
    const g = bvdGroups(rows, { ...BVD_DEFAULT, groupBy: "none" }, NOW);
    expect(g).toHaveLength(1);
    expect(g[0].label).toBe("");
  });
});
