/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { nextStep, normAction } from "./rowActions";

describe("nextStep (v18.3.3 §B): one next step, nothing twice", () => {
  it("normalises a leading +, whitespace and case", () => {
    expect(normAction("  +  Log   a QUERY ")).toBe("log a query");
  });
  it("a status cell offering '+ Log a query' leaves no next step", () => {
    expect(nextStep({ label: "Log a query" }, ["+ Log a query"])).toBeNull();
  });
  it("every other status keeps its one action", () => {
    for (const label of ["Send a nudge", "Record a response", "Answer the offer", "Send the partial", "Send the full", "Remind me when they reopen"]) {
      expect(nextStep({ label }, [])).toBe(label);
    }
  });
  it("a ghost step (a way out) offers nothing", () => {
    expect(nextStep({ label: "Open in Query Centre", ghost: true }, [])).toBeNull();
  });
  it("any status-cell action is covered, not only Log a query", () => {
    expect(nextStep({ label: "Send a nudge" }, ["+ send a  nudge"])).toBeNull();
    expect(nextStep({ label: "Send a nudge" }, ["Something else"])).toBe("Send a nudge");
  });
});
