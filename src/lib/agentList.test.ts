/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the Agent list derivations: the relationship vocabulary (Offer is ACTIVE, not
 * terminal), the awaiting-your-pages cut, the retired-UNKNOWN door rule (Unknown reads OPEN),
 * chip counts over the whole list, search reach, and the absence-aware meta line.
 */
import { describe, it, expect } from "vitest";
import {
  TERMINAL_STATUSES,
  AWAITING_PAGES_STATUSES,
  agentRelationship,
  relationshipLabel,
  awaitingYourPages,
  isDoorOpen,
  agentStateClass,
  matchesAgentFilter,
  matchesAgentSearch,
  visibleAgents,
  agentListCounts,
  agentCountLine,
  methodShort,
  metaTokens,
  AGENT_LIST_CHIPS,
} from "./agentList";
import { Agent, Query, QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";

const mkAgent = (over: Partial<Agent>): Agent => ({
  id: "a1",
  userId: "u1",
  name: "Rosalind Achebe",
  agency: "Hartley & Co",
  email: "",
  website: "",
  genres: [],
  mswlNotes: "",
  submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00.000Z",
  lastCheckedDate: "2026-01-01T00:00:00.000Z",
  notes: "",
  ...over,
});

const mkQuery = (over: Partial<Query>): Query =>
  ({ id: "q1", userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED, dateSent: "2026-04-03T00:00:00.000Z", ...over }) as Query;

describe("agentList · relationship vocabulary", () => {
  it("terminal set is exactly Rejected / Withdrawn / No Response — Offer stays ACTIVE", () => {
    expect([...TERMINAL_STATUSES]).toEqual([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]);
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.OFFER })])).toBe("active");
  });

  it("never / prev / active", () => {
    expect(agentRelationship("a1", [])).toBe("never");
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.REJECTED })])).toBe("prev");
    expect(agentRelationship("a1", [mkQuery({ status: QueryStatus.REJECTED }), mkQuery({ id: "q2", status: QueryStatus.QUERIED })])).toBe("active");
  });

  it("labels are worded once and shared by pill, chips and empty line", () => {
    expect(relationshipLabel("active")).toBe("Active queries");
    expect(relationshipLabel("prev")).toBe("No active queries");
    expect(relationshipLabel("never")).toBe("Never queried");
    // the chip row reuses the same three words
    const chipLabels = AGENT_LIST_CHIPS.map((c) => c.label);
    expect(chipLabels).toContain("Active queries");
    expect(chipLabels).toContain("No active queries");
    expect(chipLabels).toContain("Never queried");
  });
});

describe("agentList · awaiting your pages", () => {
  it("is exactly the three request statuses", () => {
    expect([...AWAITING_PAGES_STATUSES]).toEqual([
      QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.FULL_REQUESTED,
      QueryStatus.REVISE_RESUBMIT,
    ]);
  });
  it("cuts across relationship — a queried-only agent is not awaiting", () => {
    expect(awaitingYourPages("a1", [mkQuery({ status: QueryStatus.QUERIED })])).toBe(false);
    expect(awaitingYourPages("a1", [mkQuery({ status: QueryStatus.FULL_REQUESTED })])).toBe(true);
  });
});

describe("agentList · the door (UNKNOWN is retired — reads OPEN)", () => {
  it("only an explicit Closed shuts the door", () => {
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.OPEN }))).toBe(true);
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.UNKNOWN }))).toBe(true);
    expect(isDoorOpen(mkAgent({ submissionStatus: SubmissionStatus.CLOSED }))).toBe(false);
  });

  it("an Unknown agent is NOT in the closed chip, gets no grey state, and stays queryable", () => {
    const unknown = mkAgent({ id: "u", submissionStatus: SubmissionStatus.UNKNOWN });
    expect(matchesAgentFilter(unknown, [], "closed")).toBe(false);
    expect(agentStateClass(unknown, [])).toBe("s-pink");
    expect(agentListCounts([unknown], []).closed).toBe(0);
  });

  it("closed overrides sage/pink", () => {
    const closed = mkAgent({ submissionStatus: SubmissionStatus.CLOSED });
    expect(agentStateClass(closed, [mkQuery({})])).toBe("s-grey");
    expect(agentStateClass(mkAgent({}), [mkQuery({})])).toBe("s-sage");
  });
});

describe("agentList · filters, search and counts", () => {
  const active = mkAgent({ id: "act", name: "Active Ann" });
  const waiting = mkAgent({ id: "wait", name: "Waiting Wes" });
  const prev = mkAgent({ id: "prev", name: "Past Pat" });
  const never = mkAgent({ id: "nev", name: "New Nell", agency: "Foxglove" });
  const closed = mkAgent({ id: "shut", name: "Shut Sam", submissionStatus: SubmissionStatus.CLOSED });
  const agents = [active, waiting, prev, never, closed];
  const queries = [
    mkQuery({ id: "q1", agentId: "act", status: QueryStatus.QUERIED }),
    mkQuery({ id: "q2", agentId: "wait", status: QueryStatus.PARTIAL_REQUESTED }),
    mkQuery({ id: "q3", agentId: "prev", status: QueryStatus.REJECTED }),
    mkQuery({ id: "q4", agentId: "shut", status: QueryStatus.WITHDRAWN }),
  ];

  it("counts run over the whole list and the relationship buckets partition it", () => {
    const c = agentListCounts(agents, queries);
    expect(c.all).toBe(5);
    expect(c.active + c.prev + c.notq).toBe(5); // partition
    expect(c).toMatchObject({ active: 2, waiting: 1, prev: 2, notq: 1, closed: 1 });
  });

  it("each chip selects its own bucket", () => {
    const ids = (f: Parameters<typeof matchesAgentFilter>[2]) => agents.filter((a) => matchesAgentFilter(a, queries, f)).map((a) => a.id);
    expect(ids("all")).toEqual(["act", "wait", "prev", "nev", "shut"]);
    expect(ids("active")).toEqual(["act", "wait"]);
    expect(ids("waiting")).toEqual(["wait"]);
    expect(ids("prev")).toEqual(["prev", "shut"]);
    expect(ids("notq")).toEqual(["nev"]);
    expect(ids("closed")).toEqual(["shut"]);
  });

  it("search matches name OR agency, case-insensitively, and composes with the filter", () => {
    expect(matchesAgentSearch(never, "foxglove")).toBe(true);
    expect(matchesAgentSearch(never, "NELL")).toBe(true);
    expect(matchesAgentSearch(never, "hartley")).toBe(false);
    expect(visibleAgents(agents, queries, "active", "wes").map((a) => a.id)).toEqual(["wait"]);
  });

  it("count line is singular-safe", () => {
    expect(agentCountLine(5, 5)).toBe("5 of 5 agents");
    expect(agentCountLine(0, 1)).toBe("0 of 1 agent");
  });
});

describe("agentList · meta line (absence is a first-class state)", () => {
  it("no stated response time reads 'response unknown' — never an invented number", () => {
    expect(metaTokens(mkAgent({}))[0]).toBe("response unknown");
    expect(metaTokens(mkAgent({ responseTimeWeeks: 8 }))[0]).toBe("~8 wks");
  });

  it("the no-reply token appears only when explicitly set true", () => {
    expect(metaTokens(mkAgent({}))).not.toContain("No reply = no");
    expect(metaTokens(mkAgent({ noResponseMeansNo: false }))).not.toContain("No reply = no");
    expect(metaTokens(mkAgent({ noResponseMeansNo: true }))).toContain("No reply = no");
  });

  it("method shortens to Form / the Other text / Email", () => {
    expect(methodShort(mkAgent({ submissionMethod: SubmissionMethod.ONLINE_FORM }))).toBe("Form");
    expect(methodShort(mkAgent({ submissionMethod: SubmissionMethod.EMAIL }))).toBe("Email");
    expect(methodShort({ submissionMethod: "Other" as SubmissionMethod, agentNotes: "QueryManager" })).toBe("QueryManager");
    expect(methodShort({ submissionMethod: "Other" as SubmissionMethod, agentNotes: "" })).toBe("Other");
  });
});
