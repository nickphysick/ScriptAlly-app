import { describe, it, expect, vi, afterEach } from "vitest";
import { callWithProgress, isTransportFailure, QUIET_AFTER_MS, type ImportUpdate, type StreamableCallable } from "./smartImportStream";

afterEach(() => { vi.useRealTimers(); });

/** A fake callable: `stream` yields `chunks` then resolves `result` (or rejects `fail`); the plain
 *  call is counted, so a test can prove it was — or was not — made. */
function fake(opts: { chunks?: unknown[]; result?: unknown; fail?: unknown; failAfterChunks?: boolean; hang?: boolean }) {
  const calls = { plain: 0, stream: 0, signal: null as AbortSignal | null };
  const fn = (async () => { calls.plain++; return { data: { plain: true } }; }) as unknown as StreamableCallable<object, unknown>;
  fn.stream = async (_d, o) => {
    calls.stream++; calls.signal = o?.signal ?? null;
    const chunks = opts.chunks ?? [];
    let settle!: (v: unknown) => void, reject!: (e: unknown) => void;
    const data = new Promise((res, rej) => { settle = res; reject = rej; });
    o?.signal?.addEventListener("abort", () => reject({ code: "functions/cancelled", message: "Request was cancelled." }));
    const stream = (async function* () {
      for (const c of chunks) { await Promise.resolve(); yield c; }
      if (opts.hang) return;
      if (opts.fail) reject(opts.fail); else settle(opts.result);
    })();
    if (opts.fail && !opts.failAfterChunks && chunks.length === 0) { reject(opts.fail); }
    return { stream, data };
  };
  return { fn, calls };
}
const TRANSPORT = { code: "functions/internal", message: "internal", details: undefined };

describe("callWithProgress", () => {
  it("passes the server's counts through and resolves with the same final result", async () => {
    const seen: ImportUpdate[] = [];
    const { fn, calls } = fake({ chunks: [{ rows: 0 }, { rows: 3 }, { retry: true }, { rows: 1 }], result: { agents: [], queries: [1] } });
    const out = await callWithProgress(fn, {}, (u) => seen.push(u), 60_000);
    expect(out).toEqual({ agents: [], queries: [1] });
    expect(seen).toEqual([{ type: "rows", rows: 0 }, { type: "rows", rows: 3 }, { type: "retry" }, { type: "rows", rows: 1 }]);
    expect(calls).toMatchObject({ stream: 1, plain: 0 });
  });

  it("falls back to the plain call ONLY on a transport failure with no chunk", async () => {
    const seen: ImportUpdate[] = [];
    const { fn, calls } = fake({ fail: TRANSPORT });
    expect(await callWithProgress(fn, {}, (u) => seen.push(u), 60_000)).toEqual({ plain: true });
    expect(calls.plain).toBe(1);
    expect(seen).toContainEqual({ type: "plain" });
  });

  it("never falls back on a server's own error — those mean the server answered", async () => {
    for (const fail of [
      { code: "functions/resource-exhausted", message: "Your free Smart Import has been used.", details: { reason: "free_used" } },
      { code: "functions/internal", message: "The mapping came back malformed. Try again.", details: undefined },
      { code: "functions/unavailable", message: "Couldn't read the file right now.", details: undefined },
    ]) {
      const { fn, calls } = fake({ fail });
      await expect(callWithProgress(fn, {}, () => {}, 60_000)).rejects.toBe(fail);
      expect(calls.plain, fail.message).toBe(0);
    }
  });

  it("never falls back once a chunk has arrived — the server was reading", async () => {
    const { fn, calls } = fake({ chunks: [{ rows: 2 }], fail: TRANSPORT, failAfterChunks: true });
    await expect(callWithProgress(fn, {}, () => {}, 60_000)).rejects.toBe(TRANSPORT);
    expect(calls.plain).toBe(0);
  });

  it("keeps the call's timeout itself, since stream() ignores it — and does not fall back on it", async () => {
    vi.useFakeTimers();
    const { fn, calls } = fake({ hang: true });
    const p = callWithProgress(fn, {}, () => {}, 310_000);
    const caught = p.catch((e: { code?: string }) => e);
    await vi.advanceTimersByTimeAsync(310_000);
    expect(((await caught) as { code?: string }).code).toBe("functions/cancelled");
    expect(calls.signal?.aborted).toBe(true);
    expect(calls.plain).toBe(0);
  });

  it("says when no count has arrived for QUIET_AFTER_MS, so the loader can run on the clock", async () => {
    vi.useFakeTimers();
    const seen: ImportUpdate[] = [];
    const { fn } = fake({ hang: true });
    const p = callWithProgress(fn, {}, (u) => seen.push(u), 310_000).catch(() => {});
    await vi.advanceTimersByTimeAsync(QUIET_AFTER_MS - 1);
    expect(seen).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    expect(seen).toEqual([{ type: "quiet" }]);
    await vi.advanceTimersByTimeAsync(310_000); await p;
  });
});

describe("isTransportFailure", () => {
  it("is true only for the SDK's own failed-fetch error", () => {
    expect(isTransportFailure(TRANSPORT)).toBe(true);
    expect(isTransportFailure({ ...TRANSPORT, message: "The mapping came back malformed. Try again." })).toBe(false);
    expect(isTransportFailure({ ...TRANSPORT, details: { reason: "free_used" } })).toBe(false);
    expect(isTransportFailure({ code: "functions/unavailable", message: "internal" })).toBe(false);
    expect(isTransportFailure(null)).toBe(false);
  });
});

describe("runSmartImport keeps the 310 s limit on the streamed call (locked)", () => {
  it("hands callWithProgress the same timeout the plain call has", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/lib/smartImport.ts", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toMatch(/callWithProgress\([\s\S]*?SMART_IMPORT_CALL_TIMEOUT_MS,?\s*\)/);
    expect(src).toMatch(/onUpdate\?\.\(\{ type: "start", rowsTotal: countDataRows\(sheetText\) \}\)/);
  });
});
