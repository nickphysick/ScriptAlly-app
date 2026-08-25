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

  /**
   * ⚠️ THIS CASE PINNED A RULE THE READER HAD TO APPLY, AND HALF OF IT WAS FALSE (D4).
   *
   * It required "without reopening it" — the old copy's flat claim. `deriveStatus` takes the LAST
   * status-bearing activity chronologically, so that holds only for an event dated BEFORE the
   * closure. The notice is given the event now and states which of three cases applies.
   *
   * THE LAW IS UNCHANGED: *the notice says what moving THIS event to THIS query does.* What it may
   * no longer do is recite a rule and leave the reader to compare two dates the app already has.
   */
  it("⚠️ names the closure, and states the case rather than the rule (card 11)", () => {
    const n = moveNotices(closed, "", "Marcus Reed");
    expect(n.closedNote).toContain("is closed");
  });

  it("an entry carrying no status cannot move where the query stands", () => {
    const n = moveNotices(closed, "", "Marcus Reed",
      { date: "2026-08-01", resultingStatus: null }, "2026-06-01");
    expect(n.closedNote).toContain("carries no status");
  });

  it("dated BEFORE the closure: it slots in and the query stays closed", () => {
    const n = moveNotices(closed, "", "Marcus Reed",
      { date: "2026-05-01", resultingStatus: "Full Sent" }, "2026-06-01");
    expect(n.closedNote).toContain("dated before that closure");
    expect(n.closedNote).toContain("stays closed");
  });

  it("⚠️ dated AFTER the closure: it becomes the latest event and the status changes", () => {
    /* The case the old copy denied. Naming the resulting status is the point — "something will
       change" would be the same homework one step along. */
    const n = moveNotices(closed, "", "Marcus Reed",
      { date: "2026-07-01", resultingStatus: "Full Sent" }, "2026-06-01");
    expect(n.closedNote).toContain("dated after that closure");
    expect(n.closedNote).toContain("Full Sent");
  });

  it("⚠️ an unknown date is SAID, not folded into the reassuring branch (D9)", () => {
    for (const [ev, closedAt] of [
      [{ date: undefined, resultingStatus: "Full Sent" }, "2026-06-01"],
      [{ date: "2026-07-01", resultingStatus: "Full Sent" }, null],
    ] as const) {
      const n = moveNotices(closed, "", "Marcus Reed", ev, closedAt);
      expect(n.closedNote).toContain("cannot be stated here");
      expect(n.closedNote, "an unknown fell into the 'stays closed' branch").not.toContain("stays closed");
    }
  });

  it("⚠️ and it carries no verdict — a correction is what this flow is for", () => {
    const n = moveNotices(closed, "", "Marcus Reed",
      { date: "2026-07-01", resultingStatus: "Full Sent" }, "2026-06-01") ;
    for (const w of ["should", "careful", "warning", "make sure", "consider", "avoid", "correct this"]) {
      expect((n.closedNote ?? "").toLowerCase(), `the notice urges: "${w}"`).not.toContain(w);
    }
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
