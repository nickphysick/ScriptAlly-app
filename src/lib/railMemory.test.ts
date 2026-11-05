import { describe, it, expect } from "vitest";
import { noteRailPage, railPageFor, RAIL_LAST_PAGE_KEY } from "./railMemory";
import { workspaceSections } from "./workspaceNav";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m }; };
const NAV = workspaceSections({ todo: 0 });
const sec = (id: string) => NAV.find((s) => s.id === id)!;

describe("railMemory — the last page per section (sidebar rail v1)", () => {
  it("a first visit goes to the section's first page", () => {
    const s = mem();
    expect(railPageFor(sec("agents"), null, s)).toBe("/agents");
    expect(railPageFor(sec("tasks"), null, s)).toBe("/todo");
  });
  it("Agents → Discover → Tasks → Agents lands on Discover", () => {
    const s = mem();
    noteRailPage({ section: "agents", child: "a-list" }, s);
    noteRailPage({ section: "agents", child: "a-disc" }, s);
    noteRailPage({ section: "tasks", child: "list" }, s);
    expect(railPageFor(sec("agents"), null, s)).toBe("/agents/discover");
    expect(railPageFor(sec("tasks"), null, s)).toBe("/todo");
  });
  it("a remembered page the section no longer has falls back to its first page", () => {
    const s = mem();
    s.setItem(RAIL_LAST_PAGE_KEY, JSON.stringify({ queries: "q-retired" }));
    expect(railPageFor(sec("queries"), null, s)).toBe("/queries");
  });
  it("junk in storage reads as nothing remembered", () => {
    const s = mem();
    s.setItem(RAIL_LAST_PAGE_KEY, "[1,2]");
    expect(railPageFor(sec("agents"), null, s)).toBe("/agents");
    s.setItem(RAIL_LAST_PAGE_KEY, "{not json");
    expect(railPageFor(sec("agents"), null, s)).toBe("/agents");
  });
  it("an off-nav route notes nothing", () => {
    const s = mem();
    noteRailPage(null, s);
    expect(s.m.size).toBe(0);
  });
});
