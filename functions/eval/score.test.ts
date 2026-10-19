import { describe, it, expect } from "vitest";
import { scoreFixture, disagreements, FIELDS } from "./score";
import type { ExpectedFile } from "./types";

const EXPECTED: ExpectedFile = {
  id: "t",
  queries: [
    { label: "q1 Clara Voss / Pemberton", agentName: "Clara Voss", agency: "Pemberton", status: "Queried", sentDate: "2024-03-14", timeline: [], reasons: [] },
    { label: "q2 Jamal Carter / Carter & Vale", agentName: "Jamal Carter", agency: "Carter & Vale", status: "Full Requested", sentDate: "2024-02-01",
      timeline: [{ type: "Full Requested", date: "2024-03-20" }], reasons: ["two-dates"] },
    { label: "q3 (no name) / Wren & Co", agentName: "", agency: "Wren & Co", status: "Rejected", sentDate: null, timeline: [], reasons: ["check-name", "no-date"] },
  ],
};

/** The assembled result a perfect import produces for EXPECTED. */
const perfect = () => ({
  agents: [
    { ref: "a1", name: "Clara Voss", agency: "Pemberton" },
    { ref: "a2", name: "jamal carter ", agency: "Carter & Vale" },
    { ref: "a3", name: "", agency: "Wren & Co" },
  ],
  queries: [
    { agentRef: "a1", status: "Queried", sentDate: "2024-03-14", timeline: [], reasons: [] },
    { agentRef: "a2", status: "Full Requested", sentDate: "2024-02-01", timeline: [{ type: "Full Requested", date: "2024-03-20", raw: "20/3" }], reasons: ["two-dates"] },
    { agentRef: "a3", status: "Rejected", sentDate: null, timeline: [], reasons: ["no-date", "check-name"] },
  ],
});

const fieldsPerQuery = FIELDS.length - 1; // no website on these

describe("scoreFixture", () => {
  it("passes a perfect result, comparing every field of every query", () => {
    const s = scoreFixture(EXPECTED, perfect());
    expect(s.pass).toBe(true);
    expect(s.wrong).toEqual([]);
    expect(s.fieldsCompared).toBe(3 * fieldsPerQuery);
    expect(s.fieldsCorrect).toBe(s.fieldsCompared);
    expect(s.byField.status).toEqual({ compared: 3, correct: 3 });
    expect(s.byField.website).toEqual({ compared: 0, correct: 0 });
  });

  it("fails a DROPPED row, and counts all its fields wrong", () => {
    const r = perfect(); r.queries.splice(1, 1);
    const s = scoreFixture(EXPECTED, r);
    expect(s.pass).toBe(false);
    expect(s.dropped).toEqual(["q2 Jamal Carter / Carter & Vale"]);
    expect(s.invented).toEqual([]);
    expect(s.fieldsCompared).toBe(3 * fieldsPerQuery);
    expect(s.fieldsCorrect).toBe(2 * fieldsPerQuery);
    expect(s.wrong).toEqual([]); // a dropped query is reported as dropped, not as eight wrong fields
  });

  it("fails an INVENTED row", () => {
    const r = perfect();
    r.agents.push({ ref: "a9", name: "Total queries sent: 3", agency: "" });
    r.queries.push({ agentRef: "a9", status: "Queried", sentDate: null, timeline: [], reasons: [] });
    const s = scoreFixture(EXPECTED, r);
    expect(s.pass).toBe(false);
    expect(s.invented).toHaveLength(1);
    expect(s.dropped).toEqual([]);
    expect(s.fieldsCorrect).toBe(s.fieldsCompared); // every expected query is still right
  });

  it("fails a WRONG STATUS, on that field only", () => {
    const r = perfect(); r.queries[0].status = "Rejected";
    const s = scoreFixture(EXPECTED, r);
    expect(s.pass).toBe(false);
    expect(s.wrong.map((w) => [w.query, w.field])).toEqual([["q1 Clara Voss / Pemberton", "status"]]);
    expect(s.byField.status).toEqual({ compared: 3, correct: 2 });
  });

  it("accepts any status the truth allows, and only those", () => {
    const exp: ExpectedFile = { id: "t", queries: [{ ...EXPECTED.queries[0], status: "Full Sent", statusAccept: ["Full Requested", "Full Sent"], reasons: ["status-direction"] }] };
    const r = { agents: [perfect().agents[0]], queries: [{ ...perfect().queries[0], status: "Full Requested", reasons: ["status-direction"] }] };
    expect(scoreFixture(exp, r).pass).toBe(true);
    r.queries[0].status = "Partial Sent";
    expect(scoreFixture(exp, r).wrong.map((w) => w.field)).toEqual(["status"]);
  });

  it("fails a WRONG DATE, on that field only — and a wrong timeline date separately", () => {
    const r = perfect(); r.queries[0].sentDate = "2024-14-03" as any;
    let s = scoreFixture(EXPECTED, r);
    expect(s.wrong.map((w) => w.field)).toEqual(["sentDate"]);
    const r2 = perfect(); r2.queries[1].timeline[0].date = "2025-03-20";
    s = scoreFixture(EXPECTED, r2);
    expect(s.wrong.map((w) => w.field)).toEqual(["timeline"]);
  });

  it("fails a MISSING FLAG", () => {
    const r = perfect(); r.queries[2].reasons = ["no-date"];
    const s = scoreFixture(EXPECTED, r);
    expect(s.pass).toBe(false);
    expect(s.wrong).toEqual([{ query: "q3 (no name) / Wren & Co", field: "reasonsMissing", expected: ["check-name", "no-date"], actual: ["check-name"] }]);
  });

  it("fails a SPURIOUS FLAG, and tolerates only what the truth tolerates", () => {
    const r = perfect(); r.queries[0].reasons = ["status-wording"];
    const s = scoreFixture(EXPECTED, r);
    expect(s.wrong.map((w) => w.field)).toEqual(["reasonsSpurious"]);
    const tolerant: ExpectedFile = { id: "t", queries: EXPECTED.queries.map((q, i) => (i === 0 ? { ...q, reasonsTolerated: ["status-wording"] } : q)) };
    expect(scoreFixture(tolerant, r).pass).toBe(true);
  });

  it("still matches a row whose name was filed wrong, and reports the field rather than a drop", () => {
    const r = perfect(); r.agents[2].name = "agent TBC"; // the annotation kept as a name
    const s = scoreFixture(EXPECTED, r);
    expect(s.dropped).toEqual([]);
    expect(s.invented).toEqual([]);
    expect(s.wrong.map((w) => [w.query, w.field])).toEqual([["q3 (no name) / Wren & Co", "agentName"]]);
  });

  it("reports an AMBIGUOUS match instead of guessing silently", () => {
    const exp: ExpectedFile = { id: "t", queries: [EXPECTED.queries[0], { ...EXPECTED.queries[0], label: "q1b twin" }] };
    const r = { agents: [perfect().agents[0], { ...perfect().agents[0], ref: "a2" }],
      queries: [perfect().queries[0], { ...perfect().queries[0], agentRef: "a2" }] };
    const s = scoreFixture(exp, r);
    expect(s.ambiguous).toEqual(["q1 Clara Voss / Pemberton"]);
    expect(s.pass).toBe(false);
  });

  it("scores a website only where the truth states one", () => {
    const exp: ExpectedFile = { id: "t", queries: [{ ...EXPECTED.queries[0], website: "https://www.pemberton.co.uk" }] };
    const r = { agents: [{ ...perfect().agents[0], website: "<https://www.pemberton.co.uk/>" }], queries: [perfect().queries[0]] };
    expect(scoreFixture(exp, r).pass).toBe(true);
    r.agents[0].website = "";
    expect(scoreFixture(exp, r).wrong.map((w) => w.field)).toEqual(["website"]);
  });

  it("drops everything on a failed mapping", () => {
    const s = scoreFixture(EXPECTED, null);
    expect(s.dropped).toHaveLength(3);
    expect(s.fieldsCorrect).toBe(0);
  });
});

describe("disagreements across runs", () => {
  it("names each field whose value changed between runs, and nothing else", () => {
    const a = scoreFixture(EXPECTED, perfect());
    const r = perfect(); r.queries[0].status = "Rejected";
    const b = scoreFixture(EXPECTED, r);
    const d = disagreements([a, b, a]);
    expect(d).toEqual([{ field: "status", query: "q1 Clara Voss / Pemberton", values: ['"Queried"', '"Rejected"'] }]);
    expect(disagreements([a, a])).toEqual([]);
  });
});
