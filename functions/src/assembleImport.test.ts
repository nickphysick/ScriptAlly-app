import { describe, it, expect } from "vitest";
import { assembleResult, QueryOut } from "./assembleImport";

/**
 * Assembly tests: feed a model-shaped proposal (status + sentDateRaw verbatim + timeline + semantic
 * reason codes) and assert the function's deterministic output — dates resolved in code, mechanical
 * reason codes appended, model codes preserved. Mirrors the query-tracker-messy.xlsx rows that matter.
 */

const byRef = (qs: QueryOut[], ref: string) => qs.find((q) => q.agentRef === ref)!;

/** Most-recent-past occurrence of a day/month, computed relative to now (mirrors the parser). A
 *  year-less note date like "20/3" resolves this way — today-anchored, not file-anchored (the modal-
 *  year refinement is deferred), so the expectation tracks the run date instead of rotting. */
function inferredIso(month: number, day: number, now = new Date()): string {
  const y = now.getFullYear();
  const yy = Date.UTC(y, month - 1, day) <= Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) ? y : y - 1;
  return `${yy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

describe("assembleResult", () => {
  it("resolves dates, appends mechanical codes, preserves the model's semantic codes", () => {
    const model = {
      agents: [
        { ref: "a1", name: "Jamal Carter", agency: "Carter & Vale" },
        { ref: "a2", name: "Gregory Salt", agency: "Penhallow Literary" },
        { ref: "a3", name: "Marianne Webb", agency: "The Greenhouse" },
        { ref: "a4", name: "Tomas Vidal", agency: "The Quill Agency" },
        { ref: "a5", name: "", agency: "Penhallow Literary" },
        { ref: "a6", name: "Priya Raman", agency: "" },
        { ref: "a7", name: "Eleanor Whitcombe", agency: "Hartley & Finch" },
      ],
      queries: [
        // Jamal: sent 14 Mar from the Date-sent column; the note's "20/3" is a full-requested event.
        { agentRef: "a1", status: "Full Requested", sentDateRaw: "14/03/2024",
          timeline: [{ type: "Full Requested", rawDate: "20/3" }], notes: "requested full ms 20/3" },
        // Gregory: an Excel serial well outside the 2024 span → resolved but flagged.
        { agentRef: "a2", status: "No Response", sentDateRaw: "44621" },
        // Marianne: a bare direction the model couldn't resolve → status-direction (best-guess kept).
        { agentRef: "a3", status: "Full Requested", sentDateRaw: "15/5/24", reasons: ["status-direction"] },
        // Tomas: month + year, no day → missing-day.
        { agentRef: "a4", status: "No Response", sentDateRaw: "March 2024" },
        // Penhallow no-name: blank date → no-date.
        { agentRef: "a5", status: "Rejected" },
        // Priya: a note resolves the partial direction, so NO status-direction; clean date.
        { agentRef: "a6", status: "Partial Sent", sentDateRaw: "12.4.24", notes: "sent first 50pp" },
        // Eleanor: clean ISO, nothing to flag.
        { agentRef: "a7", status: "Queried", sentDateRaw: "2024-03-02" },
      ],
    };

    const out = assembleResult(model);
    const qs = out.queries as QueryOut[];

    // Agents pass through untouched.
    expect(out.agents).toBe(model.agents);

    // Jamal — the silent-wrong-before row. Sent date is 14 Mar (NOT 20 Mar from the note); the note's
    // event is a parsed timeline entry; both dates present → two-dates.
    const jamal = byRef(qs, "a1");
    expect(jamal.sentDate).toBe("2024-03-14");
    expect(jamal.sentDateRaw).toBe("14/03/2024");
    // The note's year-less "20/3" anchors to the query's sent year (2024) — NOT today's year — and
    // never overwrites the 14 Mar sent date.
    expect(jamal.timeline).toEqual([{ type: "Full Requested", date: "2024-03-20", raw: "20/3" }]);
    expect(jamal.reasons).toContain("two-dates");

    // Gregory — serial resolved to 2022, flagged as an outlier against the 2024 file.
    const gregory = byRef(qs, "a2");
    expect(gregory.sentDate).toBe("2022-03-01");
    expect(gregory.reasons).toEqual(["serial-outlier"]);

    // Marianne — date now parses (was dropped before); model's status-direction preserved.
    const marianne = byRef(qs, "a3");
    expect(marianne.sentDate).toBe("2024-05-15");
    expect(marianne.reasons).toContain("status-direction");

    // Tomas — missing-day.
    expect(byRef(qs, "a4").reasons).toEqual(["missing-day"]);
    expect(byRef(qs, "a4").sentDate).toBeNull();

    // Penhallow no-name — blank → no-date.
    expect(byRef(qs, "a5").reasons).toEqual(["no-date"]);
    expect(byRef(qs, "a5").sentDateRaw).toBeNull();

    // Priya — note resolved the direction, so the model emits no code; clean date, no reasons.
    const priya = byRef(qs, "a6");
    expect(priya.sentDate).toBe("2024-04-12");
    expect(priya.reasons).toEqual([]);

    // Eleanor — clean, no reasons.
    expect(byRef(qs, "a7").reasons).toEqual([]);
    expect(byRef(qs, "a7").sentDate).toBe("2024-03-02");
  });

  it("drops reason codes the model invents but keeps the allowed ones", () => {
    const out = assembleResult({ agents: [], queries: [
      { agentRef: "a1", status: "Queried", reasons: ["status-wording", "made-up-code", "duplicate"] },
    ] });
    expect((out.queries as QueryOut[])[0].reasons).toEqual(["status-wording", "no-date"]);
  });

  it("a timeline event WITHOUT a sent date does not raise two-dates", () => {
    const out = assembleResult({ agents: [], queries: [
      { agentRef: "a1", status: "Full Requested", timeline: [{ type: "Full Requested", rawDate: "20/3" }] },
    ] });
    const q = (out.queries as QueryOut[])[0];
    expect(q.reasons).not.toContain("two-dates");
    expect(q.reasons).toContain("no-date"); // no sent date at all
    expect(q.timeline[0].date).not.toBeNull();
  });

  it("name/agency discrimination: check-name + needs-identifying flow through, notes preserved", () => {
    const model = {
      agents: [
        { ref: "a1", name: "", agency: "Wren & Co" }, // Wren: real agency extracted, name left empty
        { ref: "a2", name: "", agency: "" },           // QueryManager: nothing identifiable
      ],
      queries: [
        { agentRef: "a1", status: "Queried", sentDateRaw: "18/04/2024", notes: "submitted, agent TBC", reasons: ["check-name"] },
        { agentRef: "a2", status: "Queried", notes: "submitted via QueryManager", reasons: ["needs-identifying"] },
      ],
    };
    const out = assembleResult(model);
    const qs = out.queries as QueryOut[];
    expect(out.agents).toBe(model.agents); // agents pass through (agency-only Wren; empty a2 → needs-agency on review)
    const wren = byRef(qs, "a1");
    expect(wren.reasons).toContain("check-name"); // junk-name flag survives the allow-list
    expect(wren.sentDate).toBe("2024-04-18");
    expect(wren.notes).toBe("submitted, agent TBC"); // annotation kept, not imported as a name
    const qm = byRef(qs, "a2");
    expect(qm.reasons).toContain("needs-identifying");
    expect(qm.notes).toBe("submitted via QueryManager"); // method kept as a hint, not imported as agency
  });

  it("returns a malformed proposal untouched (client re-validates)", () => {
    expect(assembleResult(null)).toBeNull();
    expect(assembleResult({ nope: true })).toEqual({ nope: true });
  });

  describe("year-less note events anchor to the query's sent year", () => {
    it("Jamal: sent 14 Mar 2024, note event '20/3' → 2024-03-20 (same year as the send)", () => {
      const out = assembleResult({ agents: [], queries: [
        { agentRef: "a1", status: "Full Requested", sentDateRaw: "14/03/2024",
          timeline: [{ type: "Full Requested", rawDate: "20/3" }] },
      ] });
      expect((out.queries as QueryOut[])[0].timeline[0].date).toBe("2024-03-20");
    });

    it("roll-forward: sent 20 Dec 2023, year-less event '5/1' falls before → rolls to 2024-01-05", () => {
      const out = assembleResult({ agents: [], queries: [
        { agentRef: "a1", status: "Partial Requested", sentDateRaw: "20/12/2023",
          timeline: [{ type: "Partial Requested", rawDate: "5/1" }] },
      ] });
      expect((out.queries as QueryOut[])[0].sentDate).toBe("2023-12-20");
      expect((out.queries as QueryOut[])[0].timeline[0].date).toBe("2024-01-05");
    });

    it("sent-undated fallback: year-less event with no sent date → most-recent-past", () => {
      const out = assembleResult({ agents: [], queries: [
        { agentRef: "a1", status: "Full Requested",
          timeline: [{ type: "Full Requested", rawDate: "20/3" }] }, // no sentDateRaw
      ] });
      expect((out.queries as QueryOut[])[0].sentDate).toBeNull();
      expect((out.queries as QueryOut[])[0].timeline[0].date).toBe(inferredIso(3, 20));
    });
  });
});
