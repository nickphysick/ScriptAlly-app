/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Focus-slot reducer + timeline pin persistence (overnight build Phase 4). The reducer is the
 * locked Flip choreography's brain: open / close / swap (eviction) with the animating guard and
 * reduced-motion instant paths. Timings themselves live in FLIP_TIMING / PHASE_DELAY and are
 * asserted against the v37 lock.
 */
import { describe, expect, it } from "vitest";
import { FLIP_TIMING, FOCUS_IDLE, FocusState, PHASE_DELAY, focusReducer } from "./focusSlot";
import { TIMELINE_PIN_KEY, readTimelinePinned, writeTimelinePinned } from "./TimelineDrawer";

const req = (s: FocusState, target: Parameters<typeof focusReducer>[1] extends infer _ ? any : never, reducedMotion = false) =>
  focusReducer(s, { type: "request", target, reducedMotion });

describe("focusReducer — open / close", () => {
  it("opens from idle into the opening phase", () => {
    const s = req(FOCUS_IDLE, "todo");
    expect(s).toMatchObject({ phase: "opening", focus: "todo", shown: "todo", arriving: "todo" });
  });
  it("settles opening to idle with focus retained", () => {
    const s = focusReducer(req(FOCUS_IDLE, "todo"), { type: "settle" });
    expect(s).toMatchObject({ phase: "idle", focus: "todo", shown: "todo", arriving: null });
  });
  it("close keeps the track split until the panel has flipped out", () => {
    const open = focusReducer(req(FOCUS_IDLE, "todo"), { type: "settle" });
    const closing = req(open, null);
    expect(closing).toMatchObject({ phase: "closing", focus: "todo", leaving: "todo" });
    const done = focusReducer(closing, { type: "settle" });
    expect(done).toEqual(FOCUS_IDLE);
  });
});

describe("focusReducer — swap (the slot is exclusive; new focus evicts the old)", () => {
  const open = focusReducer(req(FOCUS_IDLE, "todo"), { type: "settle" });
  it("swap-out holds the old panel and the pending target", () => {
    const s = req(open, "agents");
    expect(s).toMatchObject({ phase: "swap-out", focus: "todo", leaving: "todo", pending: "agents" });
  });
  it("switch brings the new panel in; settle normalises", () => {
    const out = req(open, "agents");
    const inn = focusReducer(out, { type: "switch" });
    expect(inn).toMatchObject({ phase: "swap-in", focus: "agents", shown: "agents", arriving: "agents", leaving: null, pending: null });
    const done = focusReducer(inn, { type: "settle" });
    expect(done).toMatchObject({ phase: "idle", focus: "agents", arriving: null });
  });
});

describe("focusReducer — guard + no-ops", () => {
  it("ignores every request while animating (any non-idle phase)", () => {
    const opening = req(FOCUS_IDLE, "todo");
    expect(req(opening, "agents")).toBe(opening);
    expect(req(opening, null)).toBe(opening);
    const swapOut = req(focusReducer(opening, { type: "settle" }), "agents");
    expect(req(swapOut, "responses")).toBe(swapOut);
  });
  it("ignores a request for the already-focused panel", () => {
    const open = focusReducer(req(FOCUS_IDLE, "todo"), { type: "settle" });
    expect(req(open, "todo")).toBe(open);
    expect(req(FOCUS_IDLE, null)).toBe(FOCUS_IDLE);
  });
  it("stray lifecycle events are inert", () => {
    expect(focusReducer(FOCUS_IDLE, { type: "settle" })).toEqual(FOCUS_IDLE);
    expect(focusReducer(FOCUS_IDLE, { type: "switch" })).toEqual(FOCUS_IDLE);
  });
});

describe("focusReducer — reduced motion", () => {
  it("collapses open/close/swap into instant state changes", () => {
    const open = req(FOCUS_IDLE, "todo", true);
    expect(open).toMatchObject({ phase: "idle", focus: "todo", shown: "todo", leaving: null, arriving: null });
    const swapped = req(open, "agents", true);
    expect(swapped).toMatchObject({ phase: "idle", focus: "agents", shown: "agents" });
    const closed = req(swapped, null, true);
    expect(closed).toEqual(FOCUS_IDLE);
  });
});

describe("locked Flip timings (v37)", () => {
  it("keeps the design-locked sequencing", () => {
    expect(FLIP_TIMING).toEqual({ switchAt: 230, inMs: 350, outMs: 240 });
    expect(PHASE_DELAY["swap-out"]).toBe(230);
    expect(PHASE_DELAY.closing).toBe(240);
  });
});

describe("timeline pin persistence (sa.timelinePinned)", () => {
  const mem = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (mem.has(k) ? mem.get(k)! : null),
    setItem: (k: string, v: string) => { mem.set(k, v); },
  };
  it("round-trips through the sa.-prefixed key", () => {
    expect(readTimelinePinned(storage)).toBe(false);
    writeTimelinePinned(true, storage);
    expect(mem.get(TIMELINE_PIN_KEY)).toBe("1");
    expect(readTimelinePinned(storage)).toBe(true);
    writeTimelinePinned(false, storage);
    expect(readTimelinePinned(storage)).toBe(false);
  });
  it("swallows storage failures (private mode)", () => {
    const bomb = { getItem: () => { throw new Error("nope"); }, setItem: () => { throw new Error("nope"); } };
    expect(readTimelinePinned(bomb as any)).toBe(false);
    expect(() => writeTimelinePinned(true, bomb as any)).not.toThrow();
  });
});
