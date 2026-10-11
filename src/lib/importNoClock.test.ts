/**
 * IT1 · T1 — the column matcher and the email import write no date the file didn't give.
 * The clock is frozen at a distinctive moment; that moment may appear nowhere in what either path
 * writes for an undated query. A dated query keeps the day the file wrote.
 *
 * Red on the baseline: the matcher stored `dateSent: now` for a blank date cell and called
 * addQuery without the import flag, so addQuery stamped its own history now; the email import
 * ordered its undated steps from `Date.now()` and did not pass the flag either.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const batchSets: unknown[][] = [];
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
  writeBatch: vi.fn(() => ({ set: (...a: unknown[]) => { batchSets.push(a); }, commit: vi.fn(async () => {}) })),
  Timestamp: { fromMillis: (ms: number) => ({ _ts: ms }), fromDate: (d: Date) => ({ _ts: d.getTime() }) },
}));
vi.mock("./firebase", () => ({ db: {} }));
vi.mock("./recomputeQuery", () => ({ recomputeQuery: vi.fn(async () => {}) }));

import { setDoc } from "firebase/firestore";
import { writeImportedHistory } from "./smartImportCommit";
import { commitEmailImport } from "./emailImportCommit";
import { matcherDate, undatedQueryLine, ERR } from "./importMatcher";
import { importedSentDate, seedsOwnHistory } from "./addQueryShape";
import { QueryStatus } from "../types";

const FROZEN = new Date("2031-07-04T05:06:07.890Z");
const root = (...p: string[]) => resolve(process.cwd(), ...p);
const code = (p: string) => readFileSync(root(p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
function mentionsNow(value: unknown): boolean {
  const text = JSON.stringify(value);
  if (text.includes("2031-07-04")) return true;
  return (text.match(/\d{13}/g) ?? []).some((n) => Math.abs(Number(n) - FROZEN.getTime()) < 1000);
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FROZEN); vi.mocked(setDoc).mockClear(); batchSets.length = 0; });
afterEach(() => { vi.useRealTimers(); });

describe("T1 · the column matcher", () => {
  const rows = readFileSync(root("tests/fixtures/import/matcher-queries.csv"), "utf8").trim().split("\n").slice(1).map((l) => l.split(","));
  const STATUS: Record<string, QueryStatus> = {
    Queried: QueryStatus.QUERIED, "Partial Requested": QueryStatus.PARTIAL_REQUESTED, "Full Sent": QueryStatus.FULL_SENT, Rejected: QueryStatus.REJECTED,
  };

  it("matcher-queries.csv: each date cell is the day the file wrote, or no date", () => {
    const read = rows.map((r) => matcherDate(r[3]));
    expect(read[0]).toEqual({ iso: "2026-08-02T00:00:00.000Z" });
    expect(read[1]).toEqual({ iso: null, why: "blank" });
    expect(read[2]).toEqual({ iso: null, why: "unreadable" });
    expect(read[3]).toEqual({ iso: null, why: "ambiguous" });
    expect(read[4], "day first").toEqual({ iso: "2026-03-14T00:00:00.000Z" });
    for (const r of read) expect(mentionsNow(r)).toBe(false);
    expect(undatedQueryLine(3, "", "blank")).toBeNull();
    expect(undatedQueryLine(4, "sometime in May", "unreadable")).toBe('Row 4: the date "sometime in May" couldn\'t be read. Imported with no sent date.');
    expect(undatedQueryLine(5, "03/04/2026", "ambiguous")).toBe('Row 5: the date "03/04/2026" could mean two days. Imported with no sent date.');
  });

  it("the history written for every row carries the file's day or none, and never the clock", async () => {
    let undatedRows = 0, datedRows = 0;
    for (const [ms, agent, status, raw] of rows) {
      vi.mocked(setDoc).mockClear();
      const sent = matcherDate(raw);
      await writeImportedHistory("u1", "q1", { agentRef: "", status: STATUS[status], sentDate: sent.iso }, agent, ms);
      const steps = vi.mocked(setDoc).mock.calls.map((c) => c[1] as any);
      expect(steps.length, `${agent}: steps were written`).toBeGreaterThanOrEqual(1);
      for (const s of steps) expect(mentionsNow(s), JSON.stringify(s)).toBe(false);
      const queried = steps.find((s) => s.resultingStatus === QueryStatus.QUERIED)!;
      if (sent.iso) {
        datedRows++;
        expect(queried.createdAt._ts, `${agent} keeps the file's day`).toBe(Date.parse(sent.iso));
        expect(queried.dateProvisional).toBeUndefined();
      } else {
        undatedRows++;
        for (const s of steps) expect(s.dateProvisional, `${agent}: every step is undated`).toBe(true);
      }
    }
    expect(undatedRows, "undated rows were exercised").toBe(3);
    expect(datedRows, "dated rows were exercised").toBe(2);
  });

  it("what addQuery does with an undated matcher row: no sent date, no history of its own", () => {
    expect(importedSentDate(undefined, { imported: true }, () => FROZEN.toISOString())).toBeUndefined();
    expect(seedsOwnHistory({ imported: true })).toBe(false);
  });

  it("the matcher passes the import flag, writes the history from the sheet, and falls back to the clock nowhere", () => {
    const src = code("src/components/ImportCsv.tsx");
    expect(src).toMatch(/addQuery\(\{ \.\.\.queryData, id: queryId \}, true, \{ imported: true \}\)/);
    expect(src).toMatch(/writeImportedHistory\(/);
    expect(src, "no `: new Date().toISOString()` fallback").not.toMatch(/:\s*new Date\(\)\.toISOString\(\)\s*[;}]/);
    expect(src).not.toMatch(/new Date\(dateSentInput\)|new Date\(getMappedValue\("date"\)\)/);
    expect(src).toMatch(/matcherDate\(dateSentInput\)/);
    expect(src).toMatch(/matcherDate\(getMappedValue\("date"\)\)/);
    expect(ERR.eventNoDate(7)).toBe("Row 7 has no date that could be read, so the event can't be placed in a query's history. Row not imported.");
  });
});

describe("T1 · the email import", () => {
  const run = async (records: any[]) => {
    const addAgent = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "ag-1" }));
    const addQuery = vi.fn(async (..._a: unknown[]) => ({ success: true, id: "q-1" }));
    await commitEmailImport(
      { userId: "u1", manuscriptTitle: "The Salt Road", addAgent, addQuery } as any,
      { kind: "new_agent", agentName: "Owen Hale", agency: "Hale & Finch" } as any, "ms1", records,
    );
    return { addAgent, addQuery };
  };

  it("an undated email: no sent date, the import flag, and the clock nowhere in the history", async () => {
    const { addQuery } = await run([
      { resultingStatus: QueryStatus.QUERIED, date: null, dateProvisional: true },
      { resultingStatus: QueryStatus.PARTIAL_REQUESTED, date: null, dateProvisional: true },
    ]);
    const [doc, , opts] = addQuery.mock.calls[0] as [Record<string, unknown>, boolean, { imported?: boolean }];
    expect("dateSent" in doc).toBe(false);
    expect(opts?.imported, "addQuery is told this is an import").toBe(true);
    expect(mentionsNow(doc)).toBe(false);
    const steps = batchSets.map((c) => c[1] as any).filter((d) => d.resultingStatus && d.createdAt);
    expect(steps.length, "history steps were written").toBe(2);
    for (const s of steps) { expect(mentionsNow(s), JSON.stringify(s)).toBe(false); expect(s.dateProvisional).toBe(true); }
    expect(batchSets.every((c) => !mentionsNow(c[1])), "nothing written holds the clock").toBe(true);
    expect(batchSets.every((c) => !mentionsNow((c[0] as any)?.path ?? "")), "no document id holds the clock").toBe(true);
  });

  it("a dated email keeps its date", async () => {
    const { addQuery } = await run([{ resultingStatus: QueryStatus.QUERIED, date: "2026-03-14T00:00:00.000Z", dateProvisional: false }]);
    expect((addQuery.mock.calls[0][0] as any).dateSent).toBe("2026-03-14T00:00:00.000Z");
    const steps = batchSets.map((c) => c[1] as any).filter((d) => d.resultingStatus && d.createdAt);
    expect(steps[0].createdAt._ts).toBe(Date.parse("2026-03-14T00:00:00.000Z"));
    expect(batchSets.some((c) => mentionsNow(c[1]))).toBe(false);
  });

  it("the commit reads the clock nowhere", () => {
    expect(code("src/lib/emailImportCommit.ts")).not.toMatch(/Date\.now\(\)|new Date\(\)/);
  });
});
