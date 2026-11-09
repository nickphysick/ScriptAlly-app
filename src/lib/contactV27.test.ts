/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v27 — the rail's pure half. Every count is held against the LIST's own predicate (`matchesContactFilters`
 * + `inSet`), never against literals on both sides: a count is what the list would show if that control were added.
 */
import { describe, expect, it } from "vitest";
import { emptyContactFilters, matchesContactFilters, type AgentFacts, type ContactFilters } from "./contactList";
import { inSet, SET_ORDER, type SetKey } from "./contactV24";
import { applyPick, PICKS26, pickOn } from "./contactV26";
import { railCounts, railExport, railOn, railShowing, toggleGenre, toggleOpen, toggleSet, type Sets } from "./contactV27";

/* a cast with the fields the filters read: the stand, the status, the door, the genres, the gaps, the materials */
const fx = (id: string, stand: SetKey, o: { open?: "open" | "closed" | "unstated"; genres?: string[]; gaps?: number; status14?: string } = {}): AgentFacts => ({
  agent: { id, name: id, agency: "", materialsWanted: ["Query letter"] },
  stand, status14: o.status14 ?? (stand === "none" ? "none" : stand === "closed" ? "rejected" : stand === "you" ? "pr" : "queried"),
  standing: { kind: stand === "none" ? "none" : "live" }, openKey: o.open ?? "open", genres: o.genres ?? [], gaps: o.gaps ?? 0,
}) as unknown as AgentFacts;

const ALL: AgentFacts[] = [
  fx("a", "you", { genres: ["Thriller", "Crime"], gaps: 2 }),
  fx("b", "agent", { genres: ["Thriller"] }),
  fx("c", "agent", { genres: ["Literary"], open: "closed" }),
  fx("d", "none", { genres: ["Thriller", "Literary"] }),
  fx("e", "none", { genres: ["Crime"], open: "unstated", gaps: 1 }),
  fx("f", "none", { genres: [] }),
  fx("g", "closed", { genres: ["Crime"], open: "closed" }),
];
const every = (_x: AgentFacts): boolean => true;
const label = (k: string, raw: string) => raw || k;
const shows = (f: ContactFilters, sets: Sets, pool = every) => ALL.filter((x) => pool(x) && inSet(x, sets) && matchesContactFilters(x, f)).length;

describe("v27 — Where they stand writes the page's set", () => {
  it("a tile that is off shows that group alone; a second click on the only tile on clears it", () => {
    expect(toggleSet(null, "you")).toEqual(["you"]);
    expect(toggleSet(["you"], "you")).toBeNull();
    expect(toggleSet(["you"], "agent")).toEqual(["agent"]);
    expect(toggleSet(["you", "agent"], "you")).toEqual(["agent"]);
  });
  it("each tile's count is its group under the filters and Find, the set itself ignored (they sum to the view)", () => {
    const f = { ...emptyContactFilters(), genres: ["thriller"] };
    const c = railCounts(ALL, f, ["you"], every, label);
    for (const k of SET_ORDER) expect(c.where[k]).toBe(shows(f, [k]));
    expect(SET_ORDER.reduce((n, k) => n + c.where[k], 0)).toBe(shows(f, null));
  });
});

describe("v27 — the faceted counts are the list's own predicate", () => {
  const states: [string, ContactFilters, Sets][] = [
    ["nothing on", emptyContactFilters(), null],
    ["Your move", applyPick(emptyContactFilters(), "you"), null],
    ["Thriller + Querying", { ...emptyContactFilters(), genres: ["thriller"] }, ["agent"]],
    ["open only", { ...emptyContactFilters(), open: "open" }, ["none"]],
  ];
  for (const [name, f, sets] of states) {
    it(`${name}: every pick, genre and the switch counts exactly what the list would show with it`, () => {
      const c = railCounts(ALL, f, sets, every, label);
      const on = pickOn(f);
      for (const p of PICKS26) expect(c.picks[p.key]).toBe(shows(on === p.key ? f : applyPick(f, p.key), sets));
      for (const g of c.genres) {
        /* a genre that is off: what the list would show with ONLY it (the others' "any" would widen, not narrow) */
        expect(g.n).toBe(shows({ ...f, genres: [g.key], genreMode: "any" }, sets));
      }
      expect(c.open).toBe(shows({ ...f, open: "open" }, sets));
    });
  }
  it("Find is a pool: nothing outside it is counted anywhere", () => {
    const pool = (x: AgentFacts) => x.agent.id !== "a" && x.agent.id !== "d";
    const c = railCounts(ALL, emptyContactFilters(), null, pool, label);
    expect(c.where.you).toBe(0);
    expect(c.genres.find((g) => g.key === "thriller")?.n).toBe(1);
  });
  it("the genres come in the order of how many agents carry them, then A to Z", () => {
    expect(railCounts(ALL, emptyContactFilters(), null, every, label).genres.map((g) => g.label)).toEqual(["Crime", "Thriller", "Literary"]);
  });
});

describe("v27 — the controls write the menu's own fields", () => {
  it("a genre is added and taken out, any of them", () => {
    const f = toggleGenre(emptyContactFilters(), "crime");
    expect([f.genres, f.genreMode]).toEqual([["crime"], "any"]);
    expect(toggleGenre(f, "crime").genres).toEqual([]);
  });
  it("Open to queries only is open / either", () => {
    expect(toggleOpen(emptyContactFilters()).open).toBe("open");
    expect(toggleOpen(toggleOpen(emptyContactFilters())).open).toBe("either");
  });
  it("n on is the applied row's chips (the set is one); the foot names what the list shows", () => {
    expect(railOn(emptyContactFilters(), null)).toBe(0);
    expect(railOn(applyPick(emptyContactFilters(), "ready"), ["you"])).toBe(3);
    expect(railShowing(41, 41, false)).toBe("41 showing");
    expect(railShowing(12, 41, true)).toBe("12 of 41 showing");
    expect([railExport(1), railExport(41)]).toEqual(["Export 1 agent", "Export 41 agents"]);
  });
});
