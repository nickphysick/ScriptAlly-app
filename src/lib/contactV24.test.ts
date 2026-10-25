/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 — the page's pure model. E1 (the genre fit) and E2 (others at the same agency) are CL24's unit
 * locks; the sets, the banner's figures and the Cards breakpoint are the rest of the model.
 */
import { describe, expect, it } from "vitest";
import type { AgentFacts } from "./contactList";
import type { HkModel } from "./contactHousekeeping";
import {
  CARDS_THREE_FROM, bannerFigures, cardsAcross, colleaguesOf, footLinks, genreFit, inSet, missingWords, setCounts, setGroups,
} from "./contactV24";

const facts = (id: string, stand: AgentFacts["stand"], agency = "", name = `Agent ${id}`): AgentFacts =>
  ({ agent: { id, name, agency }, stand, q: null, door: "open" } as unknown as AgentFacts);

describe("the four sets", () => {
  const xs = [facts("a", "you"), facts("b", "agent"), facts("c", "none"), facts("d", "none"), facts("e", "closed")];
  it("counts each set, and the counts sum to the agents", () => {
    const c = setCounts(xs);
    expect(c).toEqual({ you: 1, agent: 1, none: 2, closed: 1 });
    expect(c.you + c.agent + c.none + c.closed).toBe(xs.length);
  });
  it("filters on one set, or none", () => {
    expect(xs.filter((x) => inSet(x, "none")).map((x) => x.agent.id)).toEqual(["c", "d"]);
    expect(xs.filter((x) => inSet(x, null))).toHaveLength(5);
  });
  it("groups in the order Your move, Querying, Not queried, Closed, keeping the order handed in", () => {
    const g = setGroups([xs[4], xs[3], xs[2], xs[1], xs[0]]);
    expect(g.map((x) => x.key)).toEqual(["you", "agent", "none", "closed"]);
    expect(g[2].ids).toEqual(["d", "c"]);
  });
});

describe("the banner's figures are Housekeeping's", () => {
  it("n is the gap count, k the agents those gaps belong to, faces four at most in task order", () => {
    const ag = (id: string) => ({ id, name: `N ${id}`, agency: "" });
    const m = { items: [ag("x"), ag("x"), ag("y"), ag("z"), ag("w"), ag("v")].map((agent, i) => ({ agent, gap: "reply", key: `${agent.id}:${i}` })) } as unknown as HkModel;
    const b = bannerFigures(m);
    expect(b.gaps).toBe(6);
    expect(b.agents).toBe(5);
    expect(b.faces.map((f) => f.key)).toEqual(["x", "y", "z", "w"]);
  });
  it("says one detail in the singular", () => {
    expect(missingWords(1)).toBe("1 detail is missing");
    expect(missingWords(20)).toBe("20 details are missing");
  });
});

describe("Cards: three across from a sheet of 1,100px", () => {
  it("is the Query Centre v142.1's value", () => {
    expect(CARDS_THREE_FROM).toBe(1100);
    expect(cardsAcross(1136)).toBe(3);
    expect(cardsAcross(1099)).toBe(2);
    expect(cardsAcross(912)).toBe(2);
  });
});

describe("CL24-E1 · the genre fit", () => {
  const label = (g: string) => g;
  it("names the matches, lower case, joined with 'and', like the book", () => {
    expect(genreFit(["Thriller", "Suspense", "Book club"], ["Thriller", "Suspense"], "Murphy’s Day Out", label))
      .toEqual({ hit: true, text: "Wants thriller and suspense, like Murphy’s Day Out" });
  });
  it("matches whatever the case", () => {
    expect(genreFit(["THRILLER"], ["thriller"], "M", label)?.hit).toBe(true);
    expect(genreFit(["thriller"], ["Thriller"], "M", label)?.hit).toBe(true);
  });
  it("says so when nothing matches", () => {
    expect(genreFit(["Horror"], ["Thriller"], "Murphy’s Day Out", label)).toEqual({ hit: false, text: "Not a genre match for Murphy’s Day Out" });
  });
  it("says nothing with no agent genres, or no manuscript", () => {
    expect(genreFit([], ["Thriller"], "M", label)).toBeNull();
    expect(genreFit(undefined, ["Thriller"], "M", label)).toBeNull();
    expect(genreFit(["Thriller"], ["Thriller"], null, label)).toBeNull();
    expect(genreFit(["Thriller"], [], "M", label)).toBeNull();
  });
  it("joins three with commas and 'and'", () => {
    expect(genreFit(["a", "b", "c"], ["a", "b", "c"], "M", label)?.text).toBe("Wants a, b and c, like M");
  });
});

describe("CL24-E2 · others at the same agency", () => {
  it("finds colleagues across agency spellings sameAgent treats as equal (case and spaces)", () => {
    const me = facts("me", "none", "Hartwell & Rowe");
    const all = [me, facts("p", "agent", "  hartwell & rowe "), facts("q", "none", "HARTWELL & ROWE"), facts("r", "agent", "Other")];
    const c = colleaguesOf(me, all)!;
    expect(c.others.map((o) => o.agent.id)).toEqual(["p", "q"]);
  });
  it("warns only when this agent has no live query and a colleague does", () => {
    const live = facts("p", "you", "Coe & Marsh");
    expect(colleaguesOf(facts("me", "none", "Coe & Marsh"), [live])?.holdFor?.agent.id).toBe("p");
    expect(colleaguesOf(facts("me", "closed", "Coe & Marsh"), [live])?.holdFor?.agent.id).toBe("p");
    expect(colleaguesOf(facts("me", "agent", "Coe & Marsh"), [live])?.holdFor).toBeNull();
    expect(colleaguesOf(facts("me", "you", "Coe & Marsh"), [live])?.holdFor).toBeNull();
    expect(colleaguesOf(facts("me", "none", "Coe & Marsh"), [facts("p", "closed", "Coe & Marsh")])?.holdFor).toBeNull();
  });
  it("is null with no agency or no colleague", () => {
    expect(colleaguesOf(facts("me", "none", ""), [facts("p", "agent", "")])).toBeNull();
    expect(colleaguesOf(facts("me", "none", "Solo"), [facts("me", "none", "Solo")])).toBeNull();
  });
});

describe("the card's footer links, by set", () => {
  it("are the pack's", () => {
    expect(footLinks("you")).toEqual(["record", "edit", "open"]);
    expect(footLinks("agent")).toEqual(["record", "edit", "open"]);
    expect(footLinks("none")).toEqual(["log", "edit", "remove"]);
    expect(footLinks("closed")).toEqual(["see", "edit", "remove"]);
  });
});
