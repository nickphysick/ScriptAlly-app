/**
 * IF1 · L1 — three labels say what is true.
 * Red on the baseline: a named agent with no agency read "Agency only"; a template import was
 * logged as "Smart import"; the manuscript error carried a dash and named the "Import desk".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("firebase/firestore", () => ({
  collection: vi.fn((...args: any[]) => ({ _kind: "collection", path: args.slice(1) })),
  doc: vi.fn((...args: any[]) => ({ _kind: "doc", path: args.slice(1) })),
  getDocs: vi.fn(async () => ({ docs: [] as any[] })),
  setDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteField: vi.fn(() => ({ _sentinel: "deleteField" })),
  Timestamp: { fromMillis: (ms: number) => ({ _ts: ms }), fromDate: (d: Date) => ({ _ts: d.getTime() }) },
}));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./recomputeQuery", () => ({ recomputeQuery: vi.fn(async () => {}) }));

import { setDoc } from "firebase/firestore";
import { commitSmartImport } from "./smartImportCommit";
import { readTemplateBuffer } from "./templateImport";
import { parseModel } from "./smartImportReviewModel";
import { queryOriginLine, MANUSCRIPT_ERROR, MANUSCRIPT_LIMIT_MESSAGE, manuscriptErrorLine } from "./importLabels";

const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const code = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("L1 · the agency line", () => {
  it("template-mixed.csv: Owen Hale, named with no agency, reads No agency", async () => {
    const { agents } = parseModel((await readTemplateBuffer(fx("template-mixed.csv"))).result);
    const owen = agents.find((a) => a.name === "Owen Hale")!;
    expect(owen, "the fixture holds a named agent with no agency").toBeTruthy();
    expect(owen.agency).toBe("");
    expect(queryOriginLine(owen)).toBe("No agency");
    expect(queryOriginLine(agents.find((a) => a.name === "Clara Voss")!)).toBe("Pemberton Literary");
  });
  it("Agency only stays for a record with an agency and no name, and nothing else", () => {
    expect(queryOriginLine({ name: "", agency: "Westbrook Literary", agencyOnly: true })).toBe("Agency only");
    expect(queryOriginLine({ name: "Owen Hale", agency: "", agencyOnly: false })).not.toBe("Agency only");
    expect(queryOriginLine(undefined)).toBe("From your file");
  });
  it("the review's row reads it from here", () => {
    const src = code("src/components/onboarding/SmartImportReview.tsx");
    expect(src).toContain("queryOriginLine(");
    expect(src).not.toContain('"Agency only"');
  });
});

/* RE-POINTED (import review v1, Part D): the "Smart import · N agents added" summary line is retired
   — nothing ever rendered it. The import writes ONE event of its own (lib/importEvent), and the route
   it names is the path the host passed. */
describe("L1 · the import's one event names its path", () => {
  beforeEach(() => vi.mocked(setDoc).mockClear());
  const run = async (source?: "smart" | "template") => {
    const parsed = await readTemplateBuffer(fx("template-iso.csv"));
    let n = 0;
    const deps = { userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road",
      addAgent: vi.fn(async () => ({ success: true, id: `ag-${++n}` })), addQuery: vi.fn(async () => ({ success: true, id: `q-${++n}` })) } as any;
    await (source ? commitSmartImport(deps, parsed.result, "ms1", source) : commitSmartImport(deps, parsed.result, "ms1"));
    const events = vi.mocked(setDoc).mock.calls.map((c) => c[1] as any).filter((d) => d?.eventKey === "imported");
    expect(events.length, "one import event").toBe(1);
    expect(vi.mocked(setDoc).mock.calls.map((c) => (c[1] as any)?.description).filter((d) => typeof d === "string" && /^(Smart|Template) import · /.test(d)), "no old summary line").toEqual([]);
    return events[0];
  };
  it("the template path", async () => { expect((await run("template")).importRoute).toBe("template"); });
  it("the Smart Import path", async () => { expect((await run("smart")).importRoute).toBe("smart"); });
  it("unnamed, it is a Smart Import, as before", async () => { expect((await run()).importRoute).toBe("smart"); });
  it("it is tied to the manuscript and counts what was written", async () => {
    const ev = await run("template");
    expect(ev.manuscriptId).toBe("ms1");
    expect(ev.queryId).toBe("");
    expect(ev.resultingStatus).toBeUndefined();
    expect(ev.importCounts.agents).toBe(5);
    expect(ev.importCounts.queries).toBe(5);
  });
  it("the host passes the path it took", () => {
    const src = code("src/components/import/ImportFlow.tsx"); // where the handlers live since part 3
    expect(src).toMatch(/pickTemplateFile[\s\S]*?setImportSource\("template"\)/);
    expect(src).toMatch(/runMapping[\s\S]*?setImportSource\("smart"\)/);
    expect(src).toMatch(/commitSmartImport\([\s\S]*?importSource\s*\)/);
  });
});

describe("L1 · the manuscript error", () => {
  it("has no dash and names the Import page", () => {
    expect(MANUSCRIPT_ERROR).toBe("Couldn't set up your manuscript. Nothing's lost. Try again, or use the Import page.");
    expect(MANUSCRIPT_ERROR).not.toMatch(/[—–]/);
  });
  it("the plan's limit shows the build's own limit message; anything else the sentence", () => {
    expect(MANUSCRIPT_LIMIT_MESSAGE.length, "the build has a limit message").toBeGreaterThan(10);
    expect(manuscriptErrorLine(MANUSCRIPT_LIMIT_MESSAGE)).toBe(MANUSCRIPT_LIMIT_MESSAGE);
    expect(manuscriptErrorLine("Database exception occurred.")).toBe(MANUSCRIPT_ERROR);
    expect(manuscriptErrorLine(null)).toBe(MANUSCRIPT_ERROR);
  });
  it("the host shows it on the review, with nothing lost", () => {
    const src = code("src/components/import/ImportFlow.tsx");
    expect(src).toContain("manuscriptFailed ? manuscriptErrorLine(hostError) : commitError");
    expect(src).not.toContain("Couldn't set up your manuscript —");
    expect(src).toMatch(/setManuscriptFailed\(true\);\s*setScreen\("review"\)/);
  });
});
