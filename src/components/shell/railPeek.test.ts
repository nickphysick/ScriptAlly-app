/**
 * Locks for the hover-peek rail model (ref: design-refs/rail-hover-peek-v2.html): state
 * transitions, scrim rules, persistence + the legacy chevron-key migration, coarse-pointer
 * pinning, and the intent timing (enter 120ms / leave grace 240ms) with fake clocks.
 */

import { describe, it, expect, vi } from "vitest";
import {
  railMode, scrimVisible, railFlowWidth, railPanelWidth,
  readRailPinned, writeRailPinned, makePeekIntent,
  RAIL_PIN_KEY, LEGACY_COLLAPSE_KEY, PEEK_ENTER_MS, PEEK_LEAVE_MS,
} from "./railPeek";

const fakeStorage = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => { m.set(k, v); },
    dump: () => Object.fromEntries(m),
  };
};

describe("railMode — the three states", () => {
  it("rest ↔ peek for the unpinned pair; pinned stands alone", () => {
    expect(railMode({ pinned: false, peeking: false, coarse: false })).toBe("rest");
    expect(railMode({ pinned: false, peeking: true, coarse: false })).toBe("peek");
    expect(railMode({ pinned: true, peeking: false, coarse: false })).toBe("pinned");
    // peeking is irrelevant while pinned — hover must not change anything
    expect(railMode({ pinned: true, peeking: true, coarse: false })).toBe("pinned");
  });

  it("a coarse pointer forces pinned regardless of stored preference", () => {
    expect(railMode({ pinned: false, peeking: false, coarse: true })).toBe("pinned");
    expect(railMode({ pinned: false, peeking: true, coarse: true })).toBe("pinned");
  });
});

describe("scrim + widths", () => {
  it("the scrim exists only during an unpinned peek — never pinned, never at rest", () => {
    expect(scrimVisible({ pinned: false, peeking: true, coarse: false })).toBe(true);
    expect(scrimVisible({ pinned: false, peeking: false, coarse: false })).toBe(false);
    expect(scrimVisible({ pinned: true, peeking: true, coarse: false })).toBe(false);
    expect(scrimVisible({ pinned: false, peeking: true, coarse: true })).toBe(false);
  });

  it("peek widens the overlay panel but never the flow width (content must not reflow)", () => {
    const peek = { pinned: false, peeking: true, coarse: false };
    expect(railFlowWidth(peek)).toBe(60);
    expect(railPanelWidth(peek)).toBe(240);
    const pinned = { pinned: true, peeking: false, coarse: false };
    expect(railFlowWidth(pinned)).toBe(240);
    expect(railPanelWidth(pinned)).toBe(240);
    const rest = { pinned: false, peeking: false, coarse: false };
    expect(railFlowWidth(rest)).toBe(60);
    expect(railPanelWidth(rest)).toBe(60);
  });
});

describe("persistence + legacy migration", () => {
  it("defaults to pinned when nothing is stored", () => {
    expect(readRailPinned(fakeStorage())).toBe(true);
  });

  it("round-trips the pin state", () => {
    const s = fakeStorage();
    writeRailPinned(false, s);
    expect(readRailPinned(s)).toBe(false);
    writeRailPinned(true, s);
    expect(readRailPinned(s)).toBe(true);
  });

  it("maps the legacy chevron key once: collapsed → unpinned", () => {
    const s = fakeStorage({ [LEGACY_COLLAPSE_KEY]: "1" });
    expect(readRailPinned(s)).toBe(false);
    expect(s.dump()[RAIL_PIN_KEY]).toBe("0"); // written through — the migration never re-runs
  });

  it("maps the legacy expanded state → pinned, and leaves the legacy key in place", () => {
    const s = fakeStorage({ [LEGACY_COLLAPSE_KEY]: "0" });
    expect(readRailPinned(s)).toBe(true);
    expect(s.dump()[RAIL_PIN_KEY]).toBe("1");
    expect(s.dump()[LEGACY_COLLAPSE_KEY]).toBe("0"); // untouched (dev shell-lab still reads it)
  });

  it("prefers the new key over the legacy key once both exist", () => {
    const s = fakeStorage({ [RAIL_PIN_KEY]: "0", [LEGACY_COLLAPSE_KEY]: "0" });
    expect(readRailPinned(s)).toBe(false);
  });
});

describe("makePeekIntent — enter 120ms, leave grace 240ms, focus parity", () => {
  const fakeClock = () => {
    let now = 0, seq = 0;
    const pending = new Map<number, { at: number; fn: () => void }>();
    return {
      schedule: (fn: () => void, ms: number) => { const id = ++seq; pending.set(id, { at: now + ms, fn }); return id; },
      cancel: (id: number) => { pending.delete(id); },
      advance: (ms: number) => {
        now += ms;
        for (const [id, t] of [...pending]) if (t.at <= now) { pending.delete(id); t.fn(); }
      },
    };
  };

  it("opens only after the enter intent delay", () => {
    const clock = fakeClock();
    const set = vi.fn();
    const intent = makePeekIntent(set, clock.schedule, clock.cancel);
    intent.pointerEnter();
    clock.advance(PEEK_ENTER_MS - 1);
    expect(set).not.toHaveBeenCalled();
    clock.advance(1);
    expect(set).toHaveBeenCalledWith(true);
  });

  it("a pass-through never flashes it open (leave cancels the pending enter)", () => {
    const clock = fakeClock();
    const set = vi.fn();
    const intent = makePeekIntent(set, clock.schedule, clock.cancel);
    intent.pointerEnter();
    clock.advance(60);
    intent.pointerLeave();          // left before intent fired
    clock.advance(PEEK_LEAVE_MS);   // the leave timer closes (idempotent close)
    expect(set).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenCalledWith(false);
  });

  it("re-entering within the leave grace keeps it open (no close call)", () => {
    const clock = fakeClock();
    const set = vi.fn();
    const intent = makePeekIntent(set, clock.schedule, clock.cancel);
    intent.pointerEnter();
    clock.advance(PEEK_ENTER_MS);
    expect(set).toHaveBeenLastCalledWith(true);
    intent.pointerLeave();
    clock.advance(PEEK_LEAVE_MS - 1);
    intent.pointerEnter();          // back within the grace
    clock.advance(PEEK_ENTER_MS);
    expect(set.mock.calls.filter((c) => c[0] === false)).toHaveLength(0);
  });

  it("keyboard focus drives the same gate as hover", () => {
    const clock = fakeClock();
    const set = vi.fn();
    const intent = makePeekIntent(set, clock.schedule, clock.cancel);
    intent.focusEnter();
    clock.advance(PEEK_ENTER_MS);
    expect(set).toHaveBeenLastCalledWith(true);
    intent.focusLeave();
    clock.advance(PEEK_LEAVE_MS);
    expect(set).toHaveBeenLastCalledWith(false);
  });

  it("dispose cancels anything in flight (unmount safety)", () => {
    const clock = fakeClock();
    const set = vi.fn();
    const intent = makePeekIntent(set, clock.schedule, clock.cancel);
    intent.pointerEnter();
    intent.dispose();
    clock.advance(PEEK_ENTER_MS * 2);
    expect(set).not.toHaveBeenCalled();
  });
});
