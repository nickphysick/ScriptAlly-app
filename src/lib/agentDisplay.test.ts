import { describe, it, expect } from "vitest";
import { agentLabel, agentAgencyLine, isAgencyLess } from "./agentDisplay";

describe("agentDisplay — agency-less agents render cleanly", () => {
  const priya = { name: "Priya Raman", agency: "" };       // named, no agency (empty-and-valid)
  const penhallow = { name: "", agency: "Penhallow Literary" }; // agency-only (no name)
  const both = { name: "Clara Voss", agency: "Pemberton Literary" };
  const neither = { name: "", agency: "" };

  it("agentLabel: no dangling separator for an agency-less agent", () => {
    expect(agentLabel(priya)).toBe("Priya Raman");          // not "Priya Raman — "
    expect(agentLabel(penhallow)).toBe("Penhallow Literary");
    expect(agentLabel(both)).toBe("Clara Voss — Pemberton Literary");
    expect(agentLabel(neither)).toBe("Unnamed agent");
  });

  it("agentAgencyLine: 'No agency' for a named agent — never blank, never 'agency only'", () => {
    expect(agentAgencyLine(priya)).toBe("No agency");        // the mislabel fix
    expect(agentAgencyLine(priya)).not.toMatch(/only/i);
    expect(agentAgencyLine(both)).toBe("Pemberton Literary");
    expect(agentAgencyLine(penhallow)).toBe("Agency · no named agent"); // the genuine agency-only case
    expect(agentAgencyLine(neither)).toBe("");
  });

  it("isAgencyLess flags only a named record with no agency", () => {
    expect(isAgencyLess(priya)).toBe(true);
    expect(isAgencyLess(penhallow)).toBe(false); // no name → not the agency-less-named state
    expect(isAgencyLess(both)).toBe(false);
  });
});
