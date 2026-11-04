/**
 * Smart Import v1.2, decision 1: a likely duplicate inside one agency. "Jonah P." and "Jonah
 * Petrakis" at "Heron" and "Heron Lit" are asked about on the Duplicates step; a different first
 * name, or the same name at another agency, is not. Locks DUP-1…DUP-3.
 */
import { describe, it, expect } from "vitest";
import type { SmartImportResult } from "../types/smartImport";
import { parseModel, buildClusters, agencyKeysMatch, agencyKey, nameCompatibleAtAgency } from "./smartImportReviewModel";

const sets = (agents: { name: string; agency: string }[]) => {
  const result = { agents: agents.map((a, i) => ({ ref: `a${i}`, ...a })), queries: [] } as unknown as SmartImportResult;
  const model = parseModel(result);
  return buildClusters(model.agents).map((c) => c.members.map((m) => `${m.name} / ${m.agency}`).sort());
};

describe("DUP-1 the Jonah pair is one likely duplicate", () => {
  it("Jonah P. at Heron, Jonah Petrakis at Heron Lit", () => {
    expect(sets([{ name: "Jonah P.", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron Lit" }]))
      .toEqual([["Jonah P. / Heron", "Jonah Petrakis / Heron Lit"]]);
  });
  it("and each other written form: J. Petrakis, Jonah Petr, Heron Literary, Heron Books", () => {
    expect(sets([{ name: "J. Petrakis", agency: "Heron Literary" }, { name: "Jonah Petrakis", agency: "Heron" }])).toHaveLength(1);
    expect(sets([{ name: "Jonah Petr", agency: "Heron Lit" }, { name: "Jonah Petrakis", agency: "Heron" }])).toHaveLength(1);
    expect(sets([{ name: "Jonah P", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron Books" }])).toHaveLength(1);
    expect(sets([{ name: "Jonah P.", agency: "Kite & Assoc." }, { name: "Jonah Petrakis", agency: "Kite Associates" }])).toHaveLength(1);
  });
  it("is asked, never merged: the leader carries an open duplicate reason", () => {
    const model = parseModel({ agents: [{ ref: "a", name: "Jonah P.", agency: "Heron" }, { ref: "b", name: "Jonah Petrakis", agency: "Heron Lit" }], queries: [] } as unknown as SmartImportResult);
    expect(model.agents.filter((a) => !a.deleted)).toHaveLength(2);
    expect(model.agents[0].reasons.some((r) => r.kind === "duplicate" && !r.resolved)).toBe(true);
  });
});

describe("DUP-2 near-misses are not duplicates", () => {
  const none = (a: { name: string; agency: string }, b: { name: string; agency: string }) => expect(sets([a, b]), `${a.name}/${a.agency} vs ${b.name}/${b.agency}`).toEqual([]);
  it("a different first name at the same agency", () => {
    none({ name: "Jonah P.", agency: "Heron" }, { name: "Jane Petrakis", agency: "Heron Lit" });
    none({ name: "Jonah Petrakis", agency: "Heron" }, { name: "Joanna Petrakis", agency: "Heron" });
  });
  it("the same first name at a different agency", () => {
    none({ name: "Jonah P.", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Kestrel" });
    none({ name: "Jonah Petrakis", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Kestrel Lit" });
  });
  it("both halves shortened, a first name alone, a surname that is not a prefix", () => {
    none({ name: "J. P.", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron" });
    none({ name: "Jonah", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron" });
    none({ name: "Jonah Pell", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heron" });
  });
  it("an agency that only starts with the same letters is not the same agency", () => {
    none({ name: "Jonah P.", agency: "Heron" }, { name: "Jonah Petrakis", agency: "Heronsgate" });
  });
});

describe("DUP-3 the pieces", () => {
  it("agency suffixes go; a word prefix matches, a letter prefix does not", () => {
    expect(agencyKey("Heron Lit")).toBe("heron");
    expect(agencyKey("Kite & Assoc.")).toBe(agencyKey("Kite Associates"));
    expect(agencyKeysMatch("heron", "heron books")).toBe(true);
    expect(agencyKeysMatch("heron", "heronsgate")).toBe(false);
    expect(agencyKeysMatch("", "heron")).toBe(false);
  });
  it("the name rule inside an agency", () => {
    expect(nameCompatibleAtAgency("Jonah P.", "Jonah Petrakis")).toBe(true);
    expect(nameCompatibleAtAgency("J. Petrakis", "Jonah Petrakis")).toBe(true);
    expect(nameCompatibleAtAgency("J. P.", "Jonah Petrakis")).toBe(false);
    expect(nameCompatibleAtAgency("Jane Petrakis", "Jonah P.")).toBe(false);
  });
});
