/**
 * Smart Import v1.2.1: a duplicate set that becomes one agent keeps the fuller name and agency.
 * Locks FN-1…FN-5. The rendered half (the headline, the merged bar, Undo on the page) is in
 * tests/e2e/importFullerName.measure.ts.
 */
import { describe, it, expect } from "vitest";
import type { SmartImportResult } from "../types/smartImport";
import { QueryStatus } from "../types";
import {
  parseModel, originalsOf, fullerIdentity, abbreviates,
  applyDuplicateCollapse, removeDuplicateRecord, type ReviewAgent,
} from "./smartImportReviewModel";

type Row = { name: string; agency: string };
/** Two rows, one query each at different stages: the reconcile card's pair. */
const pair = (a: Row, b: Row) => parseModel({
  agents: [{ ref: "a", ...a }, { ref: "b", ...b }],
  queries: [
    { agentRef: "a", status: QueryStatus.QUERIED, sentDate: "2026-08-12", sentDateRaw: "12/8" },
    { agentRef: "b", status: QueryStatus.FULL_REQUESTED, sentDate: "2026-08-20", sentDateRaw: "20/8" },
  ],
} as unknown as SmartImportResult);
const kept = (agents: ReviewAgent[]) => agents.filter((x) => !x.deleted).map((x) => `${x.name} / ${x.agency}`);
const P = { name: "Jonah P.", agency: "Heron" }, F = { name: "Jonah Petrakis", agency: "Heron Lit" };

describe("FN-1 the Jonah pair becomes Jonah Petrakis at Heron Lit, in either order, by either answer", () => {
  for (const [label, a, b] of [["short row first", P, F], ["full row first", F, P]] as const) {
    it(label, () => {
      const m = pair(a, b);
      expect(m.agents[0].mergeWith).toEqual(["b"]);              // the pair is one set
      const fill = { originals: originalsOf(m.agents) };
      const looksRight = applyDuplicateCollapse(m.agents, m.queries, "b", QueryStatus.FULL_REQUESTED, fill);
      expect(kept(looksRight.agents)).toEqual(["Jonah Petrakis / Heron Lit"]);
      const split = removeDuplicateRecord(m.agents, m.queries, "b", fill);
      expect(kept(split.agents)).toEqual(["Jonah Petrakis / Heron Lit"]);
    });
  }
  it("every other field is the kept row's, as before", () => {
    const m = pair(P, F);
    m.agents[0].website = "heron.example"; m.agents[1].website = "other.example";
    const out = applyDuplicateCollapse(m.agents, m.queries, "b", undefined, { originals: originalsOf(m.agents) });
    expect(out.agents.find((x) => x.id === "a")!.website).toBe("heron.example");
  });
});

describe("FN-2 the fullest form among the set's names and agencies", () => {
  it("J. Petrakis and Jonah give Jonah Petrakis; Heron gives Heron Lit; Lit gives Literary", () => {
    const set = [{ name: "J. Petrakis", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron Lit" }, { name: "Jonah", agency: "Heron Literary" }];
    expect(fullerIdentity(set, set[0])).toEqual({ name: "Jonah Petrakis", agency: "Heron Literary" });
    expect(fullerIdentity(set, set[2])).toEqual({ name: "Jonah Petrakis", agency: "Heron Literary" });
  });
  it("J. Petrakis as a real pair", () => {
    const m = pair({ name: "J. Petrakis", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron Lit" });
    const out = applyDuplicateCollapse(m.agents, m.queries, "b", undefined, { originals: originalsOf(m.agents) });
    expect(kept(out.agents)).toEqual(["Jonah Petrakis / Heron Lit"]);
  });
  it("abbreviation is word by word, never the same form", () => {
    expect(abbreviates("Jonah P.", "Jonah Petrakis")).toBe(true);
    expect(abbreviates("Jonah", "Jonah Petrakis")).toBe(true);
    expect(abbreviates("Heron", "Heron Lit")).toBe(true);
    expect(abbreviates("Jonah P", "Jonah P.")).toBe(false);
    expect(abbreviates("Jonah Petrakis", "Jonah P.")).toBe(false);
    expect(abbreviates("Jonah Pell", "Jonah Petrakis")).toBe(false);
  });
});

describe("FN-3 the writer's word wins", () => {
  it("an edited name or agency on any row: the kept row stays as it is", () => {
    const m = pair(P, F);
    const fill = { originals: originalsOf(m.agents) };
    m.agents[1] = { ...m.agents[1], agency: "Heron Literary Ltd" };   // the writer edited the other row
    const out = applyDuplicateCollapse(m.agents, m.queries, "b", undefined, fill);
    expect(kept(out.agents)).toEqual(["Jonah P. / Heron"]);
    const m2 = pair(P, F); const fill2 = { originals: originalsOf(m2.agents) };
    m2.agents[0] = { ...m2.agents[0], name: "Jonah Q." };             // or the kept one
    expect(kept(applyDuplicateCollapse(m2.agents, m2.queries, "b", undefined, fill2).agents)).toEqual(["Jonah Q. / Heron"]);
  });
  it("removing the other rows is choosing: Remove this one keeps the kept row's own", () => {
    const m = pair(P, F);
    expect(kept(removeDuplicateRecord(m.agents, m.queries, "b").agents)).toEqual(["Jonah P. / Heron"]);
    expect(kept(removeDuplicateRecord(m.agents, m.queries, "a").agents)).toEqual(["Jonah Petrakis / Heron Lit"]);
  });
});

describe("FN-3b a row the writer removed never lends its name", () => {
  it("a three-way: remove the fullest row, then answer the last pair; the removed name stays gone", () => {
    const m = parseModel({
      agents: [{ ref: "a", name: "Jonah P.", agency: "Heron" }, { ref: "b", name: "Jonah Petr", agency: "Heron" }, { ref: "c", name: "Jonah Petrakis", agency: "Heron Literary" }],
      queries: [
        { agentRef: "a", status: QueryStatus.QUERIED, sentDate: "2026-08-12", sentDateRaw: "12/8" },
        { agentRef: "b", status: QueryStatus.FULL_REQUESTED, sentDate: "2026-08-20", sentDateRaw: "20/8" },
        { agentRef: "c", status: QueryStatus.QUERIED, sentDate: "2026-08-02", sentDateRaw: "2/8" },
      ],
    } as unknown as SmartImportResult);
    expect(m.agents[0].mergeWith).toEqual(["b", "c"]);
    const fill = { originals: originalsOf(m.agents) };
    const one = removeDuplicateRecord(m.agents, m.queries, "c");              // the writer removes Petrakis
    const out = applyDuplicateCollapse(one.agents, one.queries, "b", undefined, fill);
    expect(kept(out.agents)).toEqual(["Jonah Petr / Heron"]);
  });
});

describe("FN-4 two different full forms keep the kept row's", () => {
  it("names", () => {
    const set = [{ name: "Jonah Petrakis", agency: "Heron" }, { name: "Jonah Peters", agency: "Heron" }, { name: "Jonah P.", agency: "Heron" }];
    expect(fullerIdentity(set, set[2]).name).toBe("Jonah P.");
    expect(fullerIdentity(set, set[0]).name).toBe("Jonah Petrakis");
  });
  it("agencies", () => {
    const set = [{ name: "Jonah P.", agency: "Kite & Assoc." }, { name: "Jonah Petrakis", agency: "Kite Associates" }];
    expect(fullerIdentity(set, set[0])).toEqual({ name: "Jonah Petrakis", agency: "Kite & Assoc." });
  });
});

describe("FN-5 undo restores both rows with their own names", () => {
  it("the merge changes no input row, and the merged-away row keeps its own name", () => {
    const m = pair(P, F);
    const before = JSON.stringify(m.agents);
    const out = applyDuplicateCollapse(m.agents, m.queries, "b", undefined, { originals: originalsOf(m.agents) });
    expect(JSON.stringify(m.agents)).toBe(before);           // the review's snapshot is the input
    const gone = out.agents.find((x) => x.id === "b")!;
    expect(gone.deleted && `${gone.name} / ${gone.agency}`).toBe("Jonah Petrakis / Heron Lit");
    const restored = out.agents.map((x) => m.agents.find((o) => o.id === x.id) ?? x);  // undo by id
    expect(kept(restored)).toEqual(["Jonah P. / Heron", "Jonah Petrakis / Heron Lit"]);
  });
});
