/**
 * Plan rules v1 — the founding-flag backstop's plan: what it marks, in what order, and where the cap stops it.
 */
import { describe, it, expect } from "vitest";
import { planFoundingFlags } from "./foundingFlagPlan";

const acc = (uid: string, email: string | null, createdMs = 0) => ({ uid, email, createdMs });

describe("planFoundingFlags", () => {
  it("marks an absent flag proven by a founder's code or a verified waitlist place, and nothing else", () => {
    const p = planFoundingFlags(
      [acc("a", "a@x.com"), acc("b", "b@x.com"), acc("c", "c@x.com"), acc("d", null)],
      new Map(), new Set(["a@x.com"]), new Set(["b@x.com"]), 50,
    );
    expect(p.set).toEqual([{ uid: "a", source: "invite" }, { uid: "b", source: "waitlist" }]);
    expect(p.capped).toEqual([]);
  });

  it("never touches a flag already set either way — an unmark (false) stays unmarked", () => {
    const p = planFoundingFlags(
      [acc("a", "a@x.com"), acc("b", "b@x.com")],
      new Map<string, boolean | undefined>([["a", false], ["b", true]]), new Set(["a@x.com", "b@x.com"]), new Set(), 50,
    );
    expect(p.set).toEqual([]);
    expect(p.already).toBe(1);
  });

  it("respects the cap: founding accounts count against it, and every refusal is returned", () => {
    const p = planFoundingFlags(
      [acc("old", "o@x.com"), acc("w1", "w1@x.com", 2), acc("i1", "i1@x.com", 3), acc("w2", "w2@x.com", 1)],
      new Map<string, boolean | undefined>([["old", true]]), new Set(["i1@x.com"]), new Set(["w1@x.com", "w2@x.com"]), 3,
    );
    /* the invite outranks the waitlist; within the waitlist the older account goes first */
    expect(p.set).toEqual([{ uid: "i1", source: "invite" }, { uid: "w2", source: "waitlist" }]);
    expect(p.capped).toEqual([{ uid: "w1", source: "waitlist" }]);
  });

  it("at the cap, marks nobody", () => {
    const p = planFoundingFlags([acc("a", "a@x.com")], new Map<string, boolean | undefined>([["z", true]]), new Set(["a@x.com"]), new Set(), 1);
    expect(p.set).toEqual([]);
    expect(p.capped).toEqual([{ uid: "a", source: "invite" }]);
  });
});
