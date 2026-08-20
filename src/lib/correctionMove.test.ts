import { describe, it, expect } from "vitest";
import { moveCandidates, filterCandidates, moveNotices, MOVE_BLOCK_TITLES } from "./correctionMove";

const QUERIES = [
  { id: "a", agentId: "ag1", status: "Queried" },
  { id: "b", agentId: "ag2", status: "Rejected" },
  { id: "c", agentId: "ag3", status: "Partial Requested" },
  { id: "d", status: "Queried" },
];
const AGENTS = [
  { id: "ag1", name: "Priya Nair", agency: "Northbank Literary" },
  { id: "ag2", name: "Joan Whitfield", agency: "Whitfield Agency" },
  { id: "ag3", name: "", agency: "Okoro Bell" },
];

describe("the move's destinations", () => {
  it("⚠️ never offers the source query as its own destination", () => {
    expect(moveCandidates(QUERIES, AGENTS, "a").map((c) => c.queryId)).not.toContain("a");
    expect(moveCandidates(QUERIES, AGENTS, "a")).toHaveLength(3);
  });

  it("carries the status so a nonsensical landing shows before it is chosen", () => {
    const c = moveCandidates(QUERIES, AGENTS, "a").find((x) => x.queryId === "b")!;
    expect(c.status).toBe("Rejected");
    expect(c.closed).toBe(true);
  });

  it("⚠️ falls back to the agency when an agent has no name, and never renders blank", () => {
    const c = moveCandidates(QUERIES, AGENTS, "a").find((x) => x.queryId === "c")!;
    expect(c.agentName).toBe("Okoro Bell");
    const orphan = moveCandidates(QUERIES, AGENTS, "a").find((x) => x.queryId === "d")!;
    expect(orphan.agentName).toBe("Unnamed agent");
  });

  it("searches name, agency and status alike", () => {
    const all = moveCandidates(QUERIES, AGENTS, "a");
    expect(filterCandidates(all, "northbank")).toHaveLength(0);
    expect(filterCandidates(all, "whitfield").map((c) => c.queryId)).toEqual(["b"]);
    expect(filterCandidates(all, "rejected").map((c) => c.queryId)).toEqual(["b"]);
    expect(filterCandidates(all, "")).toHaveLength(3);
  });
});

describe("what the sheet must say first", () => {
  const all = moveCandidates(QUERIES, AGENTS, "a");
  const closed = all.find((c) => c.queryId === "b")!;
  const open = all.find((c) => c.queryId === "c")!;

  it("⚠️ states that a closed target stays closed (card 11)", () => {
    const n = moveNotices(closed, "", "Marcus Reed");
    expect(n.closedNote).toContain("is closed");
    expect(n.closedNote).toContain("without reopening it");
  });

  it("⚠️ uses NO GENDERED PRONOUN for the agent, unlike the ref's own copy", () => {
    const n = moveNotices(closed, "", "Marcus Reed");
    expect(n.closedNote).not.toMatch(/\b(she|he|her|his|hers|him)\b/i);
  });

  it("says nothing about closure when the target is open", () => {
    expect(moveNotices(open, "", "Marcus Reed").closedNote).toBeUndefined();
  });

  it("⚠️ flags a note that names the source's agent (card 10)", () => {
    const n = moveNotices(open, "Marcus asked for the first fifty pages.", "Marcus Reed");
    expect(n.staleNote).toContain("Marcus");
  });

  it("leaves a note that names nobody alone", () => {
    expect(moveNotices(open, "Sent the revised pages.", "Marcus Reed").staleNote).toBeUndefined();
  });

  it("⚠️ reads the SOURCE first — the writer opened this from the record they were looking at", () => {
    expect(MOVE_BLOCK_TITLES.source).toBe("This query");
  });
});
