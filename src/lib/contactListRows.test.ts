/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1 · Phase 2 — the row's next action: the query card's own words (lib/qc1512 `rowAct`), "Log a
 * query" where that has none, your move from `stand`, nothing for a closed query or a closed door never queried.
 */
import { describe, expect, it } from "vitest";
import { rowActionOf, LOG_A_QUERY } from "./contactListRows";
import { rowAct } from "./qc1512";
import { readFileSync } from "node:fs";
import type { AgentFacts } from "./contactList";

const NOW = Date.UTC(2026, 10, 26, 12);
const q = (o: Record<string, unknown>) => ({ id: "q1", status: "Queried", court: "agent", pastExpected: false, ...o }) as unknown as AgentFacts["q"];

describe("rowActionOf", () => {
  it("not queried: Log a query, quiet; closed to queries and never queried: none", () => {
    expect(rowActionOf({ q: null, stand: "none", door: "open" }, NOW)).toEqual({ label: LOG_A_QUERY, mode: "log", ym: false });
    expect(rowActionOf({ q: null, stand: "none", door: "unknown" as AgentFacts["door"] }, NOW)?.label).toBe(LOG_A_QUERY);
    expect(rowActionOf({ q: null, stand: "none", door: "closed" }, NOW)).toBeNull();
  });
  it("a closed query: none", () => {
    expect(rowActionOf({ q: q({ status: "Rejected", court: "closed" }), stand: "closed", door: "open" }, NOW)).toBeNull();
  });
  it("a live query: rowAct's label and mode, your move from stand", () => {
    for (const [o, stand] of [[{ status: "Partial Requested", court: "you" }, "you"], [{ status: "Full Requested", court: "you" }, "you"], [{}, "agent"]] as const) {
      const r = q(o)!;
      const want = rowAct(r, NOW);
      const got = rowActionOf({ q: r, stand, door: "open" }, NOW);
      expect(got).toEqual(want ? { label: want.label, mode: want.mode, ym: stand === "you" } : null);
    }
  });
  it("keeps no table of words of its own", () => {
    const src = readFileSync(new URL("./contactListRows.ts", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/Send the|Send your|Nudge|Record a response/);
  });
});
