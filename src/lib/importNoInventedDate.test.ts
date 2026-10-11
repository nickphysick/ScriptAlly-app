/**
 * IF1 · U1 — the commit writes no date the file didn't give.
 * The clock is frozen at a distinctive moment; that moment may appear nowhere in what is written
 * for an undated query (its document and its history). The one place the commit's own time
 * belongs is the single feed line that says an import happened, and that is checked separately.
 *
 * Red on the baseline: an undated query's history steps were stamped with the commit's time as
 * their ordering key, and nothing told addQuery the query was an import, so it stamped "now" too.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

import { setDoc, updateDoc } from "firebase/firestore";
import { commitSmartImport } from "./smartImportCommit";
import { readTemplateBuffer } from "./templateImport";
import { parseModel, modelToResult, seedUnidentifiedSetAside } from "./smartImportReviewModel";
import { importedSentDate, seedsOwnHistory } from "./addQueryShape";

const FROZEN = new Date("2031-07-04T05:06:07.890Z");
const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));

/** Every place the frozen moment could hide in a written value. */
function mentionsNow(value: unknown): boolean {
  const text = JSON.stringify(value);
  const ms = FROZEN.getTime();
  if (text.includes("2031-07-04")) return true;
  // any number within a second of the frozen clock (ordering keys were now + 0, 1, 2…)
  return (text.match(/\d{13}/g) ?? []).some((n) => Math.abs(Number(n) - ms) < 1000);
}

describe("U1 · an undated query is written with no date set to the commit's time", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FROZEN); vi.mocked(setDoc).mockClear(); vi.mocked(updateDoc).mockClear(); });
  afterEach(() => { vi.useRealTimers(); });

  it("template-mixed.csv, with the unreadable date left undated", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    const model = parseModel(parsed.result);
    const seeded = seedUnidentifiedSetAside(model.agents, model.queries);
    const result = modelToResult(parsed.result, seeded.agents, seeded.queries);
    const undated = result.queries.filter((q) => !q.sentDate);
    expect(undated.length, "the fixture holds undated queries").toBeGreaterThanOrEqual(2);

    let n = 0;
    const addQuery = vi.fn(async (..._args: unknown[]) => ({ success: true, id: `q-${++n}` }));
    const addAgent = vi.fn(async () => ({ success: true, id: `ag-${Math.random().toString(36).slice(2, 8)}` }));
    const outcome = await commitSmartImport(
      { userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road", addAgent, addQuery } as any, result, "ms1",
    );
    expect(outcome.queriesImported, "the queries were written").toBe(result.queries.length);

    // 1 · what addQuery is asked to write for each undated query
    const undatedCalls = addQuery.mock.calls.filter((c) => !(c[0] as any).dateSent);
    expect(undatedCalls.length).toBe(undated.length);
    for (const call of undatedCalls) {
      expect("dateSent" in (call[0] as object), "no sent date is passed").toBe(false);
      expect(mentionsNow(call[0])).toBe(false);
      expect((call[2] as any)?.imported, "addQuery is told this is an import").toBe(true);
    }
    // …and what addQuery does with that
    expect(importedSentDate(undefined, { imported: true }, () => FROZEN.toISOString())).toBeUndefined();
    expect(importedSentDate("2026-03-14T00:00:00.000Z", { imported: true }, () => FROZEN.toISOString())).toBe("2026-03-14T00:00:00.000Z");
    expect(seedsOwnHistory({ imported: true })).toBe(false);
    expect(seedsOwnHistory(undefined)).toBe(true);

    // 2 · every history step written, and every other write that is not the feed line
    const isFeedLine = (c: unknown[]) => typeof (c[1] as any)?.description === "string";
    const writes = [...vi.mocked(setDoc).mock.calls, ...vi.mocked(updateDoc).mock.calls].filter((c) => !isFeedLine(c));
    const steps = writes.filter((c) => (c[1] as any)?.resultingStatus && (c[1] as any)?.createdAt);
    expect(steps.length, "history steps were written").toBeGreaterThanOrEqual(result.queries.length);
    const provisional = steps.filter((c) => (c[1] as any).dateProvisional === true);
    expect(provisional.length, "undated steps were written").toBeGreaterThanOrEqual(undated.length);
    for (const c of writes) expect(mentionsNow(c[1]), JSON.stringify(c[1])).toBe(false);

    // 3 · the dated query keeps the date the file gave
    const dated = steps.filter((c) => (c[1] as any)?.dateProvisional !== true && (c[1] as any)?.createdAt);
    expect(dated.some((c) => (c[1] as any).createdAt._ts === Date.parse("2026-03-14T00:00:00.000Z")), "Owen Hale's 14 March is kept").toBe(true);

    // 4 · the commit's own time appears once, on the line that says an import happened
    const feed = vi.mocked(setDoc).mock.calls.filter(isFeedLine);
    expect(feed.length).toBe(1);
    expect((feed[0][1] as any).date).toBe(FROZEN.toISOString());
  });
});

describe("U1 · history the file did give is kept", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FROZEN); vi.mocked(setDoc).mockClear(); });
  afterEach(() => { vi.useRealTimers(); });
  it("template-iso.csv: each response date sits on its own step, each sent date on the first", async () => {
    const parsed = await readTemplateBuffer(fx("template-iso.csv"));
    let n = 0;
    await commitSmartImport(
      { userId: "u1", existingAgents: [], manuscriptTitle: "The Salt Road",
        addAgent: vi.fn(async () => ({ success: true, id: `ag-${++n}` })), addQuery: vi.fn(async () => ({ success: true, id: `q-${++n}` })) } as any,
      parsed.result, "ms1",
    );
    const steps = vi.mocked(setDoc).mock.calls.map((c) => c[1] as any).filter((d) => d?.resultingStatus && d?.createdAt);
    const at = (who: string, status: string) => steps.find((d) => d.agentName === who && d.resultingStatus === status);
    const day = (d: any) => new Date(d.createdAt._ts).toISOString().slice(0, 10);
    expect(steps.length).toBeGreaterThanOrEqual(8);
    expect(day(at("Jamal Carter", "Queried"))).toBe("2026-03-14");
    expect(day(at("Jamal Carter", "Partial Requested"))).toBe("2026-04-02");
    expect(at("Jamal Carter", "Partial Requested").dateProvisional).toBeUndefined();
    expect(day(at("Tomas Vidal", "Rejected"))).toBe("2025-12-19");
    expect(day(at("Marianne Webb", "Full Sent"))).toBe("2026-02-11");
    expect(at("Marianne Webb", "Full Requested").dateProvisional, "a step the file did not date says so").toBe(true);
    for (const d of steps) expect(mentionsNow(d), JSON.stringify(d)).toBe(false);
  });
});

describe("U1 · addQuery keeps to the same two rules", () => {
  it("reads both decisions from addQueryShape", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/db.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toContain("dateSent: importedSentDate(q.dateSent, opts,");
    expect(src).toContain("if (!seedsOwnHistory(opts)) return [];");
    expect(src).not.toContain("dateSent: q.dateSent || new Date().toISOString()");
  });
});
