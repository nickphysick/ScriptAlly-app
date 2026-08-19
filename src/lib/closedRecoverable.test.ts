/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ PHASE B REMOVED CLOSED QUERIES FROM THE TASK LIST ON A PROMISE — that their materials stay
 * fixable ON DEMAND from the query's own reading pane. This is that promise, asserted.
 *
 * ⚠️ AND THE SECOND SURFACE WAS NOT BUILT, BECAUSE IT ALREADY EXISTED. `Queries.tsx` carries the §2
 * materials editor — the same four rows, writing through `toggleDocMaterial`. The brief asked to
 * "reuse the component; do not fork it", and the honest reading of that is to add nothing: a second
 * editor beside this one IS the fork.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isTerminalStatus } from "./agentList";
import { queriesMissingMaterials } from "./queryMaterialsGap";
import { QueryStatus } from "../types";

const SRC = readFileSync(join(__dirname, "..", "components", "Queries.tsx"), "utf8");
/** ⚠️ comments stripped before asserting — this repo's prose names everything it retired. */
const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the query reading pane keeps the four material rows", () => {
  it("names all four, and the covering letter through the display map", () => {
    expect(code).toContain('label: materialLabel("Query letter")');
    expect(code).toContain('label: "Synopsis"');
    expect(code).toContain('label: "Opening sample"');
    expect(code).toMatch(/label: "Other/);
  });

  it("and writes through the existing toggle, not a second path", () => {
    expect(code).toContain("toggleDocMaterial");
  });
});

describe("⚠️ the editor is NOT gated on status — that is what makes the exclusion safe", () => {
  it("no terminal-status guard stands between the pane and its materials editor", () => {
    /* the materials block is `sentExtra`; a status gate anywhere inside it would strand exactly the
       queries Phase B stopped raising tasks for. */
    const i = code.indexOf("sentExtra={");
    expect(i, "sentExtra not found — the anchor moved").toBeGreaterThan(-1);
    const block = code.slice(i, i + 9000);
    expect(block).not.toContain("isTerminalStatus");
    expect(block).not.toContain("QueryStatus.REJECTED");
    expect(block).not.toContain("QueryStatus.WITHDRAWN");
    expect(block).not.toContain("QueryStatus.NO_RESPONSE");
  });

  it("⚠️ the two halves reconcile: what the task list drops, the pane still reaches", () => {
    /* Stated as a relationship rather than two literals — if the exclusion ever widens, this says
       the recovery surface must widen with it. */
    const excluded = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];
    for (const st of excluded) expect(isTerminalStatus(st)).toBe(true);
    // and the derivation really does drop them
    const gaps = queriesMissingMaterials({
      queries: excluded.map((st, i) => ({
        id: `q${i}`, userId: "u", manuscriptId: "m1", agentId: "ag1", packageId: "",
        status: st, dateSent: "2026-02-14",
      })) as never,
      activities: [], agents: [{ id: "ag1", name: "A", agency: "B" }] as never,
      manuscripts: [{ id: "m1", title: "T" }], displayName: (a) => a.name,
    });
    expect(gaps).toHaveLength(0);
  });
});
