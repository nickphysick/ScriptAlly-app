/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do load v1 — THE LOAD'S CLOCK AND ITS REVIEW SWITCH. The clock runs on fake timers here exactly as it runs in the
 * page (`useTodoLoad` wraps it): no outline for tasks inside 150ms; the outline at 150ms; "Still loading" at 3s; the
 * failed state at 5s; and tasks that arrive after that still load the page. The review switch answers nothing on a
 * production build, and its one call site is gated on the same build constant.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { TODO_LOAD, loadHoldFor, todoLoadClock, todoLoadPhase, type TodoLoadState } from "./todoLoad";

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-11-22T09:00:00Z")); });
afterEach(() => { vi.useRealTimers(); });

/** a clock and every state it announced, in order */
function run(opts: Parameters<typeof todoLoadClock>[1] = {}) {
  const seen: TodoLoadState[] = [];
  const c = todoLoadClock((s) => seen.push(s), opts);
  const first = c.get().phase;
  return { c, seen, phases: () => [first, ...seen.map((s) => s.phase)] };
}

describe("the timings live in one place", () => {
  it("150ms, 220ms, 3s, 5s", () => {
    expect([TODO_LOAD.outlineAfterMs, TODO_LOAD.fadeInMs, TODO_LOAD.stillAfterMs, TODO_LOAD.failAfterMs]).toEqual([150, 220, 3000, 5000]);
  });
});

describe("the clock, on fake timers", () => {
  it("ready at 100ms: straight to loaded, no outline ever shown", () => {
    const r = run();
    vi.advanceTimersByTime(100);
    r.c.setReady(true);
    vi.advanceTimersByTime(6000);
    expect(r.seen.length).toBeGreaterThan(0);
    /* every state it was ever in, its first included: blank, then loaded — never the outline */
    expect(r.phases()).toEqual(["blank", "loaded"]);
  });
  it("not ready at 150ms: the outline", () => {
    const r = run();
    vi.advanceTimersByTime(149);
    expect(r.c.get().phase).toBe("blank");
    vi.advanceTimersByTime(1);
    expect(r.c.get()).toEqual({ phase: "outline", still: false });
  });
  it("3s: the still-loading line; 5s: the failed state", () => {
    const r = run();
    vi.advanceTimersByTime(2999);
    expect(r.c.get().still).toBe(false);
    vi.advanceTimersByTime(1);
    expect(r.c.get()).toEqual({ phase: "outline", still: true });
    vi.advanceTimersByTime(2000);
    expect(r.c.get().phase).toBe("failed");
  });
  it("tasks arriving at 6s replace the failed state with the loaded page", () => {
    const r = run();
    vi.advanceTimersByTime(6000);
    expect(r.c.get().phase).toBe("failed");
    r.c.setReady(true);
    expect(r.c.get().phase).toBe("loaded");
    expect(r.seen.map((s) => s.phase)).toEqual(["outline", "outline", "failed", "loaded"]);
  });
  it("a listener error fails at once; Try again starts the clock over", () => {
    const r = run();
    vi.advanceTimersByTime(40);
    r.c.setFailed(true);
    expect(r.c.get().phase).toBe("failed");
    r.c.restart();
    expect(r.c.get().phase).toBe("blank");
    vi.advanceTimersByTime(150);
    expect(r.c.get().phase).toBe("outline");
  });
  it("the pure phase agrees: ready always wins", () => {
    expect(todoLoadPhase({ ready: true, failed: true, sinceMs: 9000 }).phase).toBe("loaded");
    expect(todoLoadPhase({ ready: false, failed: false, sinceMs: 0 }).phase).toBe("blank");
  });
});

describe("B5 — the review switch is impossible on prod", () => {
  it("dev and emulator builds read ?load=fast|normal|slow|fail", () => {
    expect(loadHoldFor("?load=fast", "development")).toBe(110);
    expect(loadHoldFor("?load=normal", "emulator")).toBe(900);
    expect(loadHoldFor("?x=1&load=slow", "development")).toBe(4500);
    expect(loadHoldFor("?load=fail", "development")).toBe(Infinity);
    expect(loadHoldFor("?load=other", "development")).toBeNull();
  });
  it("a production build answers null whatever the URL says", () => {
    for (const v of ["fast", "normal", "slow", "fail"]) expect(loadHoldFor(`?load=${v}`, "production")).toBeNull();
  });
  it("the one call site carries the build gate, so production compiles the branch out", () => {
    const src = readFileSync("src/components/todo/ws/TodoWorkspace.tsx", "utf8");
    const calls = src.match(/loadHoldFor\(/g) ?? [];
    expect(calls.length).toBe(1);
    expect(src).toContain('import.meta.env.MODE !== "production" ? loadHoldFor(location.search, import.meta.env.MODE) : null');
  });
  it("a held load keeps the page loading until the hold ends, even with the tasks in", () => {
    const r = run({ ready: true, hold: 900 });
    expect(r.c.get().phase).toBe("blank");
    vi.advanceTimersByTime(899);
    expect(r.c.get().phase).toBe("outline");
    vi.advanceTimersByTime(1);
    expect(r.c.get().phase).toBe("loaded");
  });
});
