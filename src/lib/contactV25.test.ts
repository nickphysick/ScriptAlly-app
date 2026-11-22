/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25 Part B — "At a glance" as a pure derivation (`glanceCards`) and the set filter that takes a list.
 */
import { describe, expect, it } from "vitest";
import { GLANCE_ORDER, GLANCE_SETS, countLine, gapsWord, glanceCards, sortWords } from "./contactV25";
import { inSet, setCounts, type SetKey } from "./contactV24";
import type { AgentFacts } from "./contactList";

const fx = (id: string, name: string, stand: SetKey, agency = "Agency"): AgentFacts =>
  ({ agent: { id, name, agency }, stand } as unknown as AgentFacts);

const FACTS: AgentFacts[] = [
  fx("a", "Zara Ames", "you"), fx("b", "Ben Cole", "you"),
  fx("c", "Cara Dunn", "agent"), fx("d", "Alan Bell", "agent"), fx("e", "Eve Ford", "agent"),
  fx("f", "Fay Gill", "none"), fx("g", "Gus Hart", "none", ""),
  fx("h", "Hal Ivy", "closed"),
];

describe("glanceCards (v25 B)", () => {
  const cards = glanceCards(FACTS, { pct: 93 }, 20);
  it("draws four cards in order: List health, Not queried, Querying, Closed", () => {
    expect(cards.map((c) => c.key)).toEqual(["health", "none", "querying", "closed"]);
    expect(cards.map((c) => c.label)).toEqual(["List health", "Not queried", "Querying", "Closed"]);
    expect(GLANCE_ORDER).toEqual(["health", "none", "querying", "closed"]);
  });
  it("List health is Housekeeping's percentage and gap total, with no faces and no filter", () => {
    const h = cards[0];
    expect(h.count).toBe(93);
    expect(h.gaps).toBe(20);
    expect(h.faces).toEqual([]);
    expect(h.total).toBe(0);
    expect(GLANCE_SETS.health).toBeNull();
  });
  it("each filtering card counts exactly its sets, and Querying is Your move + With the agent", () => {
    const c = setCounts(FACTS);
    expect(cards[1].count).toBe(c.none);
    expect(cards[2].count).toBe(c.you + c.agent);
    expect(cards[3].count).toBe(c.closed);
    for (const k of [1, 2, 3]) expect(cards[k].total).toBe(cards[k].count);
  });
  it("Querying's faces are Your move's first, each run by name", () => {
    expect(cards[2].faces.map((f) => f.key)).toEqual(["b", "a", "d", "c", "e"]);
  });
  it("faces carry initials and a name-and-agency title (the agency omitted when blank)", () => {
    expect(cards[1].faces[0]).toEqual({ key: "f", initials: "FG", title: "Fay Gill, Agency" });
    expect(cards[1].faces[1].title).toBe("Gus Hart");
  });
  it("caps the faces at six; the card's '+N' is then the total less the faces drawn", () => {
    const many = Array.from({ length: 11 }, (_, i) => fx(`n${i}`, `Name ${String.fromCharCode(65 + i)}`, "none"));
    const nq = glanceCards(many, null, 0)[1];
    expect(nq.faces.length).toBe(6);
    expect(nq.total - nq.faces.length).toBe(5);
  });
  it("draws no percentage before Housekeeping has run", () => {
    expect(glanceCards(FACTS, null, 0)[0].count).toBe(0);
  });
  it("words the gaps", () => {
    expect(gapsWord(1)).toBe("1 gap");
    expect(gapsWord(20)).toBe("20 gaps");
  });
});

describe("inSet takes a list of sets (v25 B2)", () => {
  it("a list keeps the agents in any of its sets; null keeps everyone", () => {
    const q = FACTS.filter((x) => inSet(x, ["you", "agent"])).map((x) => x.agent.id);
    expect(q).toEqual(["a", "b", "c", "d", "e"]);
    expect(FACTS.filter((x) => inSet(x, null)).length).toBe(FACTS.length);
    expect(FACTS.filter((x) => inSet(x, "none")).map((x) => x.agent.id)).toEqual(["f", "g"]);
  });
});

describe("the list title's count line (v25 C)", () => {
  const base = { shown: 41, total: 41, view: "list" as const, grouped: true, sortKey: "surname" as const, reversed: false };
  it("the default: 41 agents · grouped by status, A to Z (v25.1 C2: no list health)", () => {
    expect(countLine(base)).toEqual({ n: 41, of: null, agents: "agents", how: "grouped by status, A to Z" });
  });
  it("Cards: as cards, grouped by status", () => {
    expect(countLine({ ...base, view: "cards" }).how).toBe("as cards, grouped by status");
  });
  it("filtered: 19 of 41 agents", () => {
    const l = countLine({ ...base, shown: 19 });
    expect([l.n, l.of, l.agents]).toEqual([19, 41, "agents"]);
  });
  it("ungrouped, and the sort's words follow the direction", () => {
    expect(countLine({ ...base, grouped: false, reversed: true }).how).toBe("Z to A");
    expect(sortWords("added", false)).toBe("newest first");
  });
  it("one agent", () => {
    expect(countLine({ ...base, shown: 1, total: 1 }).agents).toBe("agent");
  });
});
