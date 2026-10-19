/**
 * IT1 · A1 — an imported agent carries only what the file gave.
 *
 * All four agent writers: the template and Smart Import (commitSmartImport), the email import
 * (commitEmailImport), and the column matcher's two (its agents sheet, and "Create from this row").
 * No file gives a submission status on any path, so each is written Unknown.
 *
 * Red on the baseline: commitSmartImport and commitEmailImport wrote starRating 3, status Open,
 * a response window of 0 and "no response means no: false"; the matcher's agents sheet wrote
 * a rating of 3 when the cell was empty, Open, 8 weeks, "no response means no: true", three
 * materials and the genre "General Fiction"; "Create from this row" wrote Open.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((...args: any[]) => ({ _kind: "collection", path: args.slice(1) })),
  doc: vi.fn((...args: any[]) => ({ _kind: "doc", id: "d" + Math.random().toString(36).slice(2, 8), path: args.slice(1) })),
  getDocs: vi.fn(async () => ({ docs: [] as any[] })),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteField: vi.fn(() => ({ _sentinel: "deleteField" })),
  query: vi.fn((...a: any[]) => a[0]),
  where: vi.fn(() => ({})),
  writeBatch: vi.fn(() => ({ set: vi.fn(), commit: vi.fn(async () => {}) })),
  Timestamp: { fromMillis: (ms: number) => ({ _ts: ms }), fromDate: (d: Date) => ({ _ts: d.getTime() }) },
}));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./recomputeQuery", () => ({ recomputeQuery: vi.fn(async () => {}) }));

import { commitSmartImport } from "./smartImportCommit";
import { commitEmailImport } from "./emailImportCommit";
import { readTemplateBuffer } from "./templateImport";
import { parseModel, modelToResult, seedUnidentifiedSetAside } from "./smartImportReviewModel";
import { importedAgentDoc, fileRating, matcherAgentDoc } from "./importedAgent";
import { QueryStatus, SubmissionStatus, SubmissionMethod } from "../types";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const fx = (name: string) => new Uint8Array(readFileSync(root("tests/fixtures/import", name)));
const src = (p: string) => readFileSync(root(p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** The fields an import may not make up. */
const INVENTABLE = ["starRating", "responseTimeWeeks", "noResponseMeansNo"] as const;

async function templateResult(name: string) {
  const parsed = await readTemplateBuffer(fx(name));
  const model = parseModel(parsed.result);
  const seeded = seedUnidentifiedSetAside(model.agents, model.queries);
  return modelToResult(parsed.result, seeded.agents, seeded.queries);
}

describe("A1 · the template and Smart Import", () => {
  it("template-iso.csv: every agent is written with no rating, no window, no reply rule, and status Unknown", async () => {
    const result = await templateResult("template-iso.csv");
    const addAgent = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "ag-" + Math.random().toString(36).slice(2, 8) }));
    const addQuery = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "q-" + Math.random().toString(36).slice(2, 8) }));
    await commitSmartImport({ userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road", addAgent, addQuery } as any, result, "ms1", "template");
    expect(addAgent.mock.calls.length, "agents were written").toBeGreaterThanOrEqual(4);
    for (const [doc] of addAgent.mock.calls as [Record<string, unknown>][]) {
      for (const k of INVENTABLE) expect(k in doc, `${doc.name}: ${k}`).toBe(false);
      expect(doc.submissionStatus, String(doc.name)).toBe(SubmissionStatus.UNKNOWN);
      expect(doc.materialsWanted).toEqual([]);
    }
  });

  it("template-window.csv: the window the file gave is kept; the agent whose row gave none has none", async () => {
    const result = await templateResult("template-window.csv");
    const addAgent = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "ag-" + Math.random().toString(36).slice(2, 8) }));
    const addQuery = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "q-" + Math.random().toString(36).slice(2, 8) }));
    await commitSmartImport({ userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road", addAgent, addQuery } as any, result, "ms1", "template");
    const docs = (addAgent.mock.calls as [Record<string, unknown>][]).map((c) => c[0]);
    const clara = docs.find((d) => d.name === "Clara Voss")!;
    const jamal = docs.find((d) => d.name === "Jamal Carter")!;
    expect(clara.responseTimeWeeks).toBe(6);
    expect("responseTimeWeeks" in jamal).toBe(false);
    expect("starRating" in clara).toBe(false);
  });
});

describe("A1 · the import's review", () => {
  it("template-iso.csv: the review model holds no window and no status until the file or the writer gives one", async () => {
    const parsed = await readTemplateBuffer(fx("template-iso.csv"));
    const model = parseModel(parsed.result);
    expect(model.agents.length).toBeGreaterThanOrEqual(4);
    for (const a of model.agents) {
      expect(a.weeks, a.name).toBeNull();
      expect(a.submissionsOpen, a.name).toBeNull();
      expect(a.rating, a.name).toBe(0);
    }
    const out = modelToResult(parsed.result, model.agents, model.queries);
    for (const a of out.agents) {
      expect(a.responseTimeWeeks ?? null).toBeNull();
      expect(a.starRating ?? null).toBeNull();
      expect(a.submissionStatus ?? null).toBeNull();
    }
  });

  it("what the writer sets in review is kept: a rating, a status and a window", async () => {
    const parsed = await readTemplateBuffer(fx("template-iso.csv"));
    const model = parseModel(parsed.result);
    const edited = model.agents.map((a, i) => (i === 0 ? { ...a, rating: 4, submissionsOpen: false, weeks: 9 } : a));
    const result = modelToResult(parsed.result, edited, model.queries);
    const addAgent = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "ag-" + Math.random().toString(36).slice(2, 8) }));
    const addQuery = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "q-" + Math.random().toString(36).slice(2, 8) }));
    await commitSmartImport({ userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road", addAgent, addQuery } as any, result, "ms1", "template");
    const docs = (addAgent.mock.calls as [Record<string, unknown>][]).map((c) => c[0]);
    const set = docs.find((d) => d.name === edited[0].name)!;
    expect(set.starRating).toBe(4);
    expect(set.submissionStatus).toBe(SubmissionStatus.CLOSED);
    expect(set.responseTimeWeeks).toBe(9);
    const rest = docs.filter((d) => d !== set);
    expect(rest.length).toBeGreaterThanOrEqual(3);
    for (const d of rest) { expect("starRating" in d).toBe(false); expect(d.submissionStatus).toBe(SubmissionStatus.UNKNOWN); }
  });
});

describe("A1 · the email import", () => {
  beforeEach(() => vi.clearAllMocks());
  it("a new agent from an email has no rating, no window, no reply rule, and status Unknown", async () => {
    const addAgent = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "ag-1" }));
    const addQuery = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "q-1" }));
    await commitEmailImport(
      { userId: "u1", manuscriptTitle: "The Salt Road", addAgent, addQuery } as any,
      { kind: "new_agent", agentName: "Owen Hale", agency: "Hale & Finch" } as any, "ms1",
      [{ resultingStatus: QueryStatus.QUERIED, date: null, dateProvisional: true } as any],
    );
    expect(addAgent).toHaveBeenCalledTimes(1);
    const doc = addAgent.mock.calls[0][0] as Record<string, unknown>;
    for (const k of INVENTABLE) expect(k in doc, k).toBe(false);
    expect(doc.submissionStatus).toBe(SubmissionStatus.UNKNOWN);
    expect(doc.importedNeedsReview).toBe(true);
  });
});

describe("A1 · the column matcher", () => {
  const rows = readFileSync(root("tests/fixtures/import/matcher-agents.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  const docs = rows.map(([name, agency, email, rating]) => matcherAgentDoc({ name, agency, email, starRating: rating }));

  it("matcher-agents.csv: a rating is kept only when the cell holds 1 to 5", () => {
    expect(docs).toHaveLength(3);
    expect(docs[0].starRating).toBe(5);
    expect("starRating" in docs[1], "an empty cell is no rating").toBe(false);
    expect("starRating" in docs[2], "\"seven\" is no rating").toBe(false);
    expect(fileRating("3")).toBe(3);
    expect(fileRating("")).toBeUndefined();
    expect(fileRating("0")).toBeUndefined();
    expect(fileRating("4.5")).toBeUndefined();
  });

  it("every row: status Unknown, no window, no reply rule, no materials, no genre the file did not give", () => {
    for (const d of docs) {
      expect(d.submissionStatus).toBe(SubmissionStatus.UNKNOWN);
      expect("responseTimeWeeks" in d).toBe(false);
      expect("noResponseMeansNo" in d).toBe(false);
      expect(d.materialsWanted).toEqual([]);
      expect(d.genres).toEqual([]);
      expect(d.submissionMethod).toBe(SubmissionMethod.EMAIL);
    }
  });

  /* v19.2 §E follow-up: the matcher's agents are flagged as imported, so the Contact list reads "Imported" under
     their date (red with the flag removed from matcherAgentDoc) */
  it("every row is flagged as imported (importedNeedsReview: true)", () => {
    for (const d of docs) expect(d.importedNeedsReview).toBe(true);
    expect(matcherAgentDoc({ name: "Row Only" })).toEqual(importedAgentDoc({ name: "Row Only" }, { importedNeedsReview: true }));
  });

  it("both of the matcher's agent writers build the agent with matcherAgentDoc and state no value of their own", () => {
    const code = src("src/components/ImportCsv.tsx");
    expect((code.match(/matcherAgentDoc\(/g) ?? []).length, "the agents sheet and Create from this row").toBe(2);
    expect(code).not.toMatch(/importedAgentDoc\(/);
    expect(code).not.toMatch(/SubmissionStatus\.OPEN/);
    expect(code).not.toMatch(/responseTimeWeeks\s*:/);
    expect(code).not.toMatch(/noResponseMeansNo\s*:/);
    expect(code).not.toMatch(/General Fiction/);
    expect(code).not.toMatch(/"Query Letter", "Synopsis", "Sample Pages"/);
  });

  it("the two commit functions build the agent with importedAgentDoc too", () => {
    for (const f of ["src/lib/smartImportCommit.ts", "src/lib/emailImportCommit.ts"]) {
      const code = src(f);
      expect(code, f).toMatch(/importedAgentDoc\(/);
      expect(code, f).not.toMatch(/starRating\s*:\s*\d/);
      expect(code, f).not.toMatch(/submissionStatus\s*:\s*(["']|SubmissionStatus)/);
      expect(code, f).not.toMatch(/responseTimeWeeks\s*:\s*\d|\?\?\s*0/);
    }
  });
});
