/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { normAction, rowActions } from "./rowActions";

describe("rowActions (v18.3.2 §C): no action twice", () => {
  it("normalises a leading +, whitespace and case", () => {
    expect(normAction("  +  Log   a QUERY ")).toBe("log a query");
  });
  it("a status cell offering '+ Log a query' drops the tray's 'Log a query': Open card alone", () => {
    expect(rowActions({ label: "Log a query" }, ["+ Log a query"])).toEqual([{ kind: "open", label: "Open card" }]);
  });
  it("every other step keeps its one action, then Open card", () => {
    for (const label of ["Send a nudge", "Record a response", "Answer the offer", "Send the partial", "Send the full", "Remind me when they reopen"]) {
      expect(rowActions({ label }, [])).toEqual([{ kind: "act", label }, { kind: "open", label: "Open card" }]);
    }
  });
  it("a ghost step shows Open card alone", () => {
    expect(rowActions({ label: "Open in Query Centre", ghost: true }, [])).toEqual([{ kind: "open", label: "Open card" }]);
  });
  it("any status-cell action is covered, not only Log a query", () => {
    expect(rowActions({ label: "Send a nudge" }, ["+ send a  nudge"])).toEqual([{ kind: "open", label: "Open card" }]);
    expect(rowActions({ label: "Send a nudge" }, ["Open card"])).toEqual([{ kind: "act", label: "Send a nudge" }]);
  });
});
