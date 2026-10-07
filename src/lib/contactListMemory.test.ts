/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — v14 §4 (lock 9): the key is versioned and a stored value is validated on read,
 * so a retired grouping, an unknown status, a wrong type or an older shape reads as the default —
 * never as a state nobody can see or clear.
 */
import { describe, it, expect } from "vitest";
import { DEFAULT_LIST_MEMORY, LIST_MEMORY_KEY, LIST_MEMORY_VERSION, sanitiseListMemory } from "./contactListMemory";
import { emptyContactFilters } from "./contactList";

describe("sanitiseListMemory", () => {
  it("the key carries the shape's version", () => {
    expect(LIST_MEMORY_KEY).toBe("sa.contactList.v2");
    expect(LIST_MEMORY_VERSION).toBe(2);
  });
  it("a good value round-trips", () => {
    const m = {
      filters: { ...emptyContactFilters(), status: ["queried", "pr"], action: true, open: "open", queried: "no", mats: true, always: true, genres: ["thriller", "crime"], genreMode: "all" },
      search: "ell", group: "action", sort: "reply", reversed: true, density: "compact",
    };
    expect(sanitiseListMemory(JSON.parse(JSON.stringify({ v: 2, ...m })))).toEqual(m);
  });
  it("an older shape (no version, or v13's) is refused whole", () => {
    expect(sanitiseListMemory({ filters: {}, group: "letter" })).toBeNull();
    expect(sanitiseListMemory({ v: 1, filters: {}, group: "letter" })).toBeNull();
  });
  it("junk reads as the default, field by field — a grouping that no longer exists is Letter", () => {
    const r = sanitiseListMemory({
      v: 2,
      filters: { status: ["queried", "Offer", 3, "queried"], action: "yes", open: ["open"], queried: "maybe", stand: ["you"], genres: [1, "crime", ""], genreMode: "most" },
      search: 7, group: "agency", sort: "due", reversed: "yes", density: "huge",
    })!;
    expect(r.filters).toEqual({ ...emptyContactFilters(), status: ["queried"], genres: ["crime"] });
    expect(r.search).toBe("");
    expect(r.group).toBe("letter");
    expect(r.sort).toBe("surname");
    expect(r.reversed).toBe(false);
    expect(r.density).toBe("comfortable");
    expect(sanitiseListMemory(null)).toBeNull();
    expect(sanitiseListMemory("x")).toBeNull();
  });
  it("the defaults are Letter and Surname, A to Z", () => {
    expect(DEFAULT_LIST_MEMORY()).toEqual({ filters: emptyContactFilters(), search: "", group: "letter", sort: "surname", reversed: false, density: "comfortable" });
  });
});
