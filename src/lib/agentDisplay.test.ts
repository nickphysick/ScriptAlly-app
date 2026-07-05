import { describe, it, expect } from "vitest";
import {
  agentLabel,
  agentAgencyLine,
  isAgencyLess,
  agentPrimary,
  agentSecondary,
  agentInitials,
  AGENT_NOT_SPECIFIED,
} from "./agentDisplay";

describe("agentDisplay — agency-less agents render cleanly", () => {
  const priya = { name: "Priya Raman", agency: "" };       // named, no agency (empty-and-valid)
  const penhallow = { name: "", agency: "Penhallow Literary" }; // agency-only (no name)
  const both = { name: "Clara Voss", agency: "Pemberton Literary" };
  const neither = { name: "", agency: "" };

  it("agentLabel: no dangling separator for an agency-less agent", () => {
    expect(agentLabel(priya)).toBe("Priya Raman");          // not "Priya Raman — "
    expect(agentLabel(penhallow)).toBe("Penhallow Literary");
    expect(agentLabel(both)).toBe("Clara Voss — Pemberton Literary");
    expect(agentLabel(neither)).toBe(AGENT_NOT_SPECIFIED);  // canonical — never "Unnamed agent"
  });

  it("agentAgencyLine: 'No agency' for a named agent — never blank, never 'agency only'", () => {
    expect(agentAgencyLine(priya)).toBe("No agency");        // the mislabel fix
    expect(agentAgencyLine(priya)).not.toMatch(/only/i);
    expect(agentAgencyLine(both)).toBe("Pemberton Literary");
    expect(agentAgencyLine(penhallow)).toBe(AGENT_NOT_SPECIFIED); // canonical missing-name kicker
    expect(agentAgencyLine(neither)).toBe("");
  });

  it("isAgencyLess flags only a named record with no agency", () => {
    expect(isAgencyLess(priya)).toBe(true);
    expect(isAgencyLess(penhallow)).toBe(false); // no name → not the agency-less-named state
    expect(isAgencyLess(both)).toBe(false);
  });
});

describe("agentDisplay — agency-primary fallback (app-wide display rule)", () => {
  const named = { name: "Clara Voss", agency: "Pemberton Literary" };
  const unnamed = { name: "", agency: "Hartley & Co" };
  const agencyless = { name: "Priya Raman", agency: "" };
  const neither = { name: "", agency: "" };

  it("agentPrimary: name first, agency promoted when unnamed — never the missing-name string", () => {
    expect(agentPrimary(named)).toBe("Clara Voss");
    expect(agentPrimary(unnamed)).toBe("Hartley & Co");
    expect(agentPrimary(agencyless)).toBe("Priya Raman");
    expect(agentPrimary(named)).not.toBe(AGENT_NOT_SPECIFIED);
  });

  it("agentSecondary: agency beneath a named agent; the canonical string once agency is primary", () => {
    expect(agentSecondary(named)).toBe("Pemberton Literary");
    expect(agentSecondary(unnamed)).toBe(AGENT_NOT_SPECIFIED);
    expect(agentSecondary(agencyless)).toBe(""); // surfaces keep their own empty treatment
  });

  it("agentInitials: derives from the PRIMARY — the agency's initials when unnamed, never '?'", () => {
    expect(agentInitials(named)).toBe("CV");
    expect(agentInitials(unnamed)).toBe("HC");   // Hartley … Co (first + last token)
    expect(agentInitials({ name: "", agency: "Penhallow" })).toBe("P");
    expect(agentInitials(neither)).toBe("?");    // rules-impossible anchor-less guard only
  });

  it("the canonical string is exactly 'Agent not specified'", () => {
    expect(AGENT_NOT_SPECIFIED).toBe("Agent not specified");
  });
});
