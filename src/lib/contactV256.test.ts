import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { genrePlural, glanceFeet, healthTone, ringColours } from "./contactV256";

const f = (stand: string, genres: string[] = [], status?: QueryStatus) =>
  ({ stand, q: status ? { status } : null, agent: { genres } }) as never;
const word = (raw: string) => ({ thriller: "Thriller", "literary-fiction": "Literary fiction" } as Record<string, string>)[raw] ?? raw;

describe("v25.6 B — At a glance's foot lines", () => {
  const facts = [
    f("none", ["thriller"]), f("none", ["thriller", "crime"]), f("none", ["crime"]), f("none", []),
    f("you"), f("you"), f("agent"),
    f("closed", [], QueryStatus.REJECTED), f("closed", [], QueryStatus.NO_RESPONSE), f("closed", [], QueryStatus.WITHDRAWN),
  ];
  it("counts not-queried agents who take the book's first genre, lower case and plural", () => {
    expect(glanceFeet(facts, ["thriller", "crime"], word, 5).none).toEqual({ n: 2, words: "want thrillers" });
  });
  it("reads the FIRST genre only", () => {
    expect(glanceFeet(facts, ["crime", "thriller"], word, 5).none?.n).toBe(2);
    expect(glanceFeet([f("none", ["thriller"])], ["crime", "thriller"], word, 5).none).toBeNull();
  });
  it("says 'wants' for one", () => {
    expect(glanceFeet([f("none", ["thriller"])], ["thriller"], word, 0).none).toEqual({ n: 1, words: "wants thrillers" });
  });
  it("with no book genre: agents with genres on file", () => {
    expect(glanceFeet(facts, [], word, 5).none).toEqual({ n: 3, words: "with genres on file" });
  });
  it("Querying: the Your move agents", () => {
    expect(glanceFeet(facts, [], word, 5).querying).toEqual({ n: 2, words: "waiting on you" });
  });
  it("Closed: a Rejected close only", () => {
    expect(glanceFeet(facts, [], word, 5).closed).toEqual({ n: 1, words: "passed" });
  });
  it("List health: Housekeeping's gaps, singular at one", () => {
    expect(glanceFeet(facts, [], word, 104).health).toEqual({ n: 104, words: "gaps to fill" });
    expect(glanceFeet(facts, [], word, 1).health).toEqual({ n: 1, words: "gap to fill" });
  });
  it("hides a foot whose n is 0 rather than saying 0", () => {
    const z = glanceFeet([f("agent")], ["thriller"], word, 0);
    expect(z).toEqual({ health: null, none: null, querying: null, closed: null });
  });
  it("pluralises one word only", () => {
    expect(genrePlural("Thriller")).toBe("thrillers");
    expect(genrePlural("Literary fiction")).toBe("literary fiction");
    expect(genrePlural("Comics")).toBe("comics");
  });
});

describe("v25.6 C — healthTone", () => {
  it("80 and above is good, 60–79 fair, under 60 low", () => {
    expect(healthTone(80)).toBe("good");
    expect(healthTone(79)).toBe("fair");
    expect(healthTone(60)).toBe("fair");
    expect(healthTone(59)).toBe("low");
    expect(healthTone(100)).toBe("good");
    expect(healthTone(0)).toBe("low");
  });
  it("gives the table's colours on light and on navy", () => {
    expect(ringColours(93, "light")).toEqual({ arc: "#4e7d60", track: "#d6e4da" });
    expect(ringColours(72, "light")).toEqual({ arc: "#c9765d", track: "#f1d9cf" });
    expect(ringColours(44, "light")).toEqual({ arc: "#a2452a", track: "#efcfc5" });
    expect(ringColours(93, "navy").arc).toBe("#9fd0ad");
    expect(ringColours(72, "navy").arc).toBe("#e0a188");
    expect(ringColours(44, "navy").arc).toBe("#f0603f");
    expect(ringColours(44, "navy").track).toBe("rgba(244, 238, 229, 0.18)");
  });
});
