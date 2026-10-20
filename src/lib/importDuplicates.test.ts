/**
 * IT1 · R1 and R2 — importing the same sheet twice does not double the history, and the same
 * agent with a different manuscript is a new query.
 *
 * Red on the baseline: no import path looked for a query that already existed, so a second import
 * of the same file wrote every query, and its history, again.
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
import { parseModel, modelToResult, seedUnidentifiedSetAside } from "./smartImportReviewModel";
import { summaryModel } from "./importSummary";
import { splitDuplicates, sameAgent, findExistingAgent, isSameQuery, ALREADY_REASON } from "./importDuplicates";
import { buildImportNotice, noticeWhy, CHOSE_REASON } from "./importNotice";
import { validateSmartImport } from "./smartImport";
import { LOG } from "./importMatcher";
import type { SmartImportResult } from "../types/smartImport";

const root = (...p: string[]) => resolve(process.cwd(), ...p);
const fx = (name: string) => new Uint8Array(readFileSync(root("tests/fixtures/import", name)));
const code = (p: string) => readFileSync(root(p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

async function reviewed(name: string): Promise<SmartImportResult> {
  const parsed = await readTemplateBuffer(fx(name));
  const model = parseModel(parsed.result);
  const seeded = seedUnidentifiedSetAside(model.agents, model.queries);
  return modelToResult(parsed.result, seeded.agents, seeded.queries);
}

/** A stand-in account: what addAgent and addQuery were asked to write, kept as the app would hold it. */
function account() {
  const agents: any[] = [], queries: any[] = [];
  const addAgent = vi.fn(async (doc: any) => { const id = `ag-${agents.length + 1}`; agents.push({ ...doc, id }); return { success: true, id }; });
  const addQuery = vi.fn(async (doc: any) => { const id = `q-${queries.length + 1}`; queries.push({ ...doc, id }); return { success: true, id }; });
  const run = (result: SmartImportResult, manuscriptId = "ms1") => commitSmartImport(
    { userId: "u1", existingAgents: [...agents], existingQueries: [...queries], manuscriptTitle: "The Salt Road", addAgent, addQuery } as any,
    result, manuscriptId, "template",
  );
  return { agents, queries, addAgent, addQuery, run };
}

beforeEach(() => { vi.mocked(setDoc).mockClear(); });

describe("R1 · the same sheet, twice", () => {
  for (const file of ["template-iso.csv", "template-mixed.csv"]) {
    it(`${file}: the second import writes nothing, and every row is listed as already in your queries`, async () => {
      const result = await reviewed(file);
      const rows = validateSmartImport(result).importable.length;
      expect(rows, "the file holds queries").toBeGreaterThanOrEqual(2);
      const acc = account();
      const first = await acc.run(result);
      expect(first.queriesImported).toBe(rows);
      expect(first.already).toEqual([]);
      const afterOne = { agents: acc.agents.length, queries: acc.queries.length };
      const writesAfterOne = vi.mocked(setDoc).mock.calls.length;
      expect(writesAfterOne, "the first import wrote history").toBeGreaterThan(0);

      /* what the flow shows before the second commit: nothing left to write */
      const split = splitDuplicates(result, acc.agents, acc.queries, "ms1");
      expect(split.duplicates.length).toBe(rows);
      expect(split.fresh.queries).toEqual([]);
      expect(split.fresh.agents, "an agent already on the list with no new query is not counted").toEqual([]);
      const summary = summaryModel(split.fresh);
      expect(summary.queries.length).toBe(0);
      expect(summary.agents.length).toBe(0);

      /* and the commit itself, handed the whole file again: still nothing */
      const second = await acc.run(result);
      expect({ agents: acc.agents.length, queries: acc.queries.length }, "counts equal one import").toEqual(afterOne);
      expect(second.queriesImported).toBe(0);
      expect(second.agentsCreated).toBe(0);
      expect(second.already!.length).toBe(rows);
      expect(vi.mocked(setDoc).mock.calls.length, "no history step and no activity line was written").toBe(writesAfterOne);

      const notice = buildImportNotice([], second, result.agents, [], 0, second.already)!;
      expect(notice.count).toBe(rows);
      expect(notice.rows.every((r) => r.reason === ALREADY_REASON)).toBe(true);
      expect(notice.rows.every((r) => r.who.length > 0), "each row names its agent").toBe(true);
      expect(noticeWhy(notice), "the no-name sentence is not said").toBeNull();
    });
  }

  it("template-mixed.csv holds undated queries, and they are matched as both having no sent date", async () => {
    const result = await reviewed("template-mixed.csv");
    const undated = result.queries.filter((q) => !q.sentDate).length;
    expect(undated, "population").toBeGreaterThanOrEqual(1);
    const acc = account();
    await acc.run(result);
    const split = splitDuplicates(result, acc.agents, acc.queries, "ms1");
    expect(split.duplicates.filter((d) => !d.query.sentDate).length).toBe(undated);
  });

  it("the activity line counts what was written: one after the first import, none after the second", async () => {
    const result = await reviewed("template-iso.csv");
    const acc = account();
    const isLine = (c: unknown[]) => typeof (c[1] as any)?.description === "string";
    await acc.run(result);
    const lines = vi.mocked(setDoc).mock.calls.filter(isLine);
    expect(lines.length).toBe(1);
    expect((lines[0][1] as any).description).toBe(`Template import · ${acc.agents.length} agents added, ${acc.queries.length} queries logged`);
    await acc.run(result);
    expect(vi.mocked(setDoc).mock.calls.filter(isLine).length).toBe(1);
  });

  it("a file that is partly new: only the new rows are written, and the rest are listed", async () => {
    const iso = await reviewed("template-iso.csv");
    const acc = account();
    const half: SmartImportResult = { ...iso, queries: iso.queries.slice(0, 2) };
    await acc.run(half);
    const before = acc.queries.length;
    const split = splitDuplicates(iso, acc.agents, acc.queries, "ms1");
    expect(split.duplicates.length).toBe(2);
    expect(split.fresh.queries.length).toBe(iso.queries.length - 2);
    const out = await acc.run(iso);
    expect(acc.queries.length - before).toBe(iso.queries.length - 2);
    expect(out.already!.length).toBe(2);
    expect(out.queriesImported).toBe(iso.queries.length - 2);
  });
});

describe("R2 · what is not a duplicate", () => {
  it("the same agent with a different manuscript is written as a new query", async () => {
    const result = await reviewed("template-iso.csv");
    const acc = account();
    await acc.run(result, "ms1");
    const n = acc.queries.length;
    expect(splitDuplicates(result, acc.agents, acc.queries, "ms2").duplicates).toEqual([]);
    const second = await acc.run(result, "ms2");
    expect(second.queriesImported).toBe(n);
    expect(second.already).toEqual([]);
    expect(acc.queries.length).toBe(n * 2);
    expect(acc.agents.length, "the agents are not added again").toBe(result.agents.length);
    expect(acc.queries.filter((q) => q.manuscriptId === "ms2").length).toBe(n);
  });
  it("the same agent and manuscript on a different day is a new query; one dated and one undated are different", () => {
    const ex = { agentId: "a1", manuscriptId: "ms1", dateSent: "2026-08-02T09:30:00.000Z" };
    expect(isSameQuery(ex, { agentId: "a1", manuscriptId: "ms1", sentDate: "2026-08-02T00:00:00.000Z" }), "same day").toBe(true);
    expect(isSameQuery(ex, { agentId: "a1", manuscriptId: "ms1", sentDate: "2026-08-03T00:00:00.000Z" })).toBe(false);
    expect(isSameQuery(ex, { agentId: "a1", manuscriptId: "ms1", sentDate: null })).toBe(false);
    expect(isSameQuery({ agentId: "a1", manuscriptId: "ms1" } as any, { agentId: "a1", manuscriptId: "ms1", sentDate: null }), "both undated").toBe(true);
    expect(isSameQuery(ex, { agentId: "a2", manuscriptId: "ms1", sentDate: ex.dateSent })).toBe(false);
    expect(isSameQuery({ agentId: "", manuscriptId: "", dateSent: undefined } as any, { agentId: "", manuscriptId: "", sentDate: null }), "unlinked rows are never matched").toBe(false);
  });
  it("with no manuscript yet (set-up), nothing is a duplicate", async () => {
    const result = await reviewed("template-iso.csv");
    const acc = account();
    await acc.run(result);
    expect(splitDuplicates(result, acc.agents, acc.queries, null).duplicates).toEqual([]);
  });
});

describe("R1 · one agent match on all three tiles", () => {
  const clara = { id: "a1", name: "Clara Voss", agency: "Pemberton Literary" };
  it("same name; the agencies match or one side gives none", () => {
    expect(sameAgent(clara, { name: "clara voss ", agency: "PEMBERTON LITERARY" })).toBe(true);
    expect(sameAgent(clara, { name: "Clara Voss" }), "the file gives no agency").toBe(true);
    expect(sameAgent({ name: "Clara Voss", agency: "" }, { name: "Clara Voss", agency: "Pemberton Literary" })).toBe(true);
    expect(sameAgent(clara, { name: "Clara Voss", agency: "Carter & Vale" }), "a different agency is a different agent").toBe(false);
    expect(sameAgent(clara, { name: "Owen Hale", agency: "Pemberton Literary" })).toBe(false);
  });
  it("an agent known only by agency matches only that agency", () => {
    const house = { id: "a2", name: "", agency: "The Greenhouse" };
    expect(sameAgent(house, { name: "", agency: "the greenhouse" })).toBe(true);
    expect(sameAgent(house, { name: "", agency: "" })).toBe(false);
    expect(findExistingAgent([house, clara], { name: "", agency: "" })).toBeUndefined();
  });
  it("the commit, the review's note, the flow and the matcher all use it", () => {
    const commit = code("src/lib/smartImportCommit.ts");
    expect((commit.match(/findExistingAgent\(/g) ?? []).length, "the commit and countExistingMatches").toBe(2);
    expect(commit).not.toMatch(/norm\(ex\.name\)/);
    const matcher = code("src/components/ImportCsv.tsx");
    expect((matcher.match(/findExistingAgent\(/g) ?? []).length, "the agents sheet and the queries sheet").toBe(2);
    expect(matcher).not.toMatch(/a\.name\.toLowerCase\(\) ===/);
    expect(matcher).toMatch(/isSameQuery\(/);
    const flow = code("src/components/import/ImportFlow.tsx");
    expect(flow).toMatch(/splitDuplicates\(result, agents, queries, manuscriptId\)/);
    expect(flow).toMatch(/existingQueries: queries/);
    expect(code("src/components/import/ImportPage.tsx")).toMatch(/manuscriptId=\{manuscript\?\.id \?\? null\}/);
    expect(LOG.queryExists("The Salt Road", "Clara Voss")).toBe('"The Salt Road" to Clara Voss is already in your queries. Row not imported.');
  });
});

describe("N1 · the notice gains the rows already here", () => {
  const already = [{ who: "Clara Voss", status: "Queried", sentDate: "2026-08-02T00:00:00.000Z" }];
  it("a duplicate is a row with the reason \"Already in your queries\"", () => {
    const n = buildImportNotice([], { errors: [] }, [], [], 5, already)!;
    expect(n).toEqual({ count: 1, at: 5, rows: [{ who: "Clara Voss", status: "Queried", sentDate: "2026-08-02T00:00:00.000Z", reason: "Already in your queries" }] });
    expect(ALREADY_REASON).toBe("Already in your queries");
  });
  /* Import review v1: a row the writer removed in the deck carries the writer's own reason, so no
     "it had no name" sentence is added for it (that sentence's own cases are in importNotice.test). */
  it("the second sentence is said only when every row has the no-name reason", () => {
    const removed = [{ status: "Queried", sentDate: null }];
    expect(noticeWhy(buildImportNotice([], { errors: [] }, [], removed, 0)!)).toBeNull();
    const mixed = buildImportNotice([], { errors: [] }, [], removed, 0, already)!;
    expect(mixed.count).toBe(2);
    expect(mixed.rows.map((r) => r.reason)).toEqual([CHOSE_REASON, ALREADY_REASON]);
    expect(noticeWhy(mixed)).toBeNull();
    expect(noticeWhy(buildImportNotice([], { errors: [] }, [], [], 0, already)!)).toBeNull();
  });
  it("nothing skipped and nothing already here: no notice", () => {
    expect(buildImportNotice([], { errors: [] }, [], [], 0, [])).toBeNull();
  });
});

describe("R1 · a file whose every row is already here", () => {
  it("shows the existing nothing-imported card, saying nothing was new — not that it failed", async () => {
    const React = (await import("react")).default;
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { NothingImported, NOTHING_NEW_TITLE, NOTHING_TITLE } = await import("../components/onboarding/DeadEnd");
    const outcome = { queriesImported: 0, agentsCreated: 0, agentsMerged: 0, queriesSkipped: 5, errors: [] };
    const html = renderToStaticMarkup(React.createElement(NothingImported, { outcome, skippedReasons: [ALREADY_REASON], onBackToReview: () => {}, backLabel: "Back", nothingNew: true }));
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    expect(NOTHING_NEW_TITLE).toBe("Nothing new to import.");
    expect(text).toContain("Nothing new to import.");
    expect(text).not.toContain(NOTHING_TITLE);
    expect(text).toContain("0 queries imported · 0 agents added");
    expect(text).toContain("5 rows were skipped: already in your queries.");
    expect(text).toMatch(/Back\s*$/);
    expect(text).not.toContain("Back to the review");
    const flow = code("src/components/import/ImportFlow.tsx");
    expect(flow).toMatch(/if \(nothingNew\) return <NothingImported[^;]*backLabel="Back" nothingNew \/>;/);
    expect(flow, "it is reached from the read, before anything is written").toMatch(/setNothingNew\(true\);\s*setScreen\("done"\);\s*return "nothing";/);
  });
});

describe("N3 · the dashboard learns of a new notice without a reload", () => {
  it("saving or clearing the notice announces it, and the dashboard subscribes", async () => {
    const { saveImportNotice, clearImportNotice, onImportNoticeChange, readImportNotice } = await import("./importNotice");
    const store = new Map<string, string>();
    const listeners = new Map<string, Set<() => void>>();
    vi.stubGlobal("localStorage", { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) });
    vi.stubGlobal("window", {
      addEventListener: (t: string, f: () => void) => { (listeners.get(t) ?? listeners.set(t, new Set()).get(t)!).add(f); },
      removeEventListener: (t: string, f: () => void) => { listeners.get(t)?.delete(f); },
      dispatchEvent: (e: { type: string }) => { for (const f of listeners.get(e.type) ?? []) f(); return true; },
    });
    vi.stubGlobal("Event", class { constructor(public type: string) {} });
    try {
      const seen: (number | null)[] = [];
      const off = onImportNoticeChange(() => seen.push(readImportNotice("u1")?.count ?? null));
      saveImportNotice("u1", buildImportNotice([], { errors: [] }, [], [], 1, [{ who: "Clara Voss", status: "Queried", sentDate: null }]));
      saveImportNotice("u1", buildImportNotice([], { errors: [] }, [], [{ status: "Queried", sentDate: null }, { status: "Queried", sentDate: null }], 2));
      clearImportNotice("u1");
      expect(seen, "each change was heard, with the notice as it then stood").toEqual([1, 2, null]);
      off();
      saveImportNotice("u1", null);
      expect(seen.length, "nothing is heard after unsubscribing").toBe(3);
    } finally { vi.unstubAllGlobals(); }
    const dash = code("src/components/dashboard/v58/Dash58.tsx");
    expect(dash).toMatch(/return onImportNoticeChange\(\(\) => setNotice\(readImportNotice\(uid\)\)\);/);
    expect(dash, "no read-once guard").not.toMatch(/noticeRead/);
  });
});
