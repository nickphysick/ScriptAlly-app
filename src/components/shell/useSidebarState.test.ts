import { describe, it, expect } from "vitest";
import { readPinned, sidebarMode, SIDEBAR_PINNED_KEY, writePinned } from "./useSidebarState";

const mem = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
};

describe("useSidebarState — RAIL · FLOAT · PINNED (sidebar rail v1)", () => {
  it("what shows, from the two facts and the window", () => {
    expect(sidebarMode({ pinned: false, floating: false, narrow: false, held: false })).toBe("rail");
    expect(sidebarMode({ pinned: false, floating: true, narrow: false, held: false })).toBe("float");
    expect(sidebarMode({ pinned: true, floating: false, narrow: false, held: false })).toBe("pinned");
  });
  it("a narrow window shows a pinned sidebar as the rail, and FLOAT still works there", () => {
    expect(sidebarMode({ pinned: true, floating: false, narrow: true, held: false })).toBe("rail");
    expect(sidebarMode({ pinned: true, floating: true, narrow: true, held: false })).toBe("float");
  });
  it("a page's hold shows the rail whatever else is true", () => {
    expect(sidebarMode({ pinned: true, floating: true, narrow: false, held: true })).toBe("rail");
  });
  it("migration: the old expanded sidebar starts PINNED; anything else starts on the RAIL", () => {
    const expanded = mem({ "scriptally:sidebar-collapsed": "0" });
    expect(readPinned(expanded)).toBe(true);
    expect(expanded.m.get(SIDEBAR_PINNED_KEY)).toBe("1");
    const collapsed = mem({ "scriptally:sidebar-collapsed": "1" });
    expect(readPinned(collapsed)).toBe(false);
    expect(collapsed.m.get(SIDEBAR_PINNED_KEY)).toBe("0");
    expect(readPinned(mem())).toBe(false);
  });
  it("then the new key owns it — the old key is not read again", () => {
    const s = mem({ "scriptally:sidebar-collapsed": "0", [SIDEBAR_PINNED_KEY]: "0" });
    expect(readPinned(s)).toBe(false);
    writePinned(s, true);
    expect(readPinned(s)).toBe(true);
  });
  it("a throwing storage reads as the rail", () => {
    const bad = { getItem: () => { throw new Error("private"); }, setItem: () => { throw new Error("private"); } };
    expect(readPinned(bad)).toBe(false);
  });
});
