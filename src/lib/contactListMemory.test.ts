/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactListMemory — v13 §5: a stored value is sanitised on read, so a retired key, an unknown
 * section or a wrong type reads as the default — never as a filter nobody can see or clear.
 */
import { describe, it, expect } from "vitest";
import { LIST_MEMORY_KEY, sanitiseListMemory } from "./contactListMemory";
import { emptyContactFilters } from "./contactList";

describe("sanitiseListMemory", () => {
  it("the key is sa.contactList", () => expect(LIST_MEMORY_KEY).toBe("sa.contactList"));
  it("a good value round-trips", () => {
    const m = { filters: { ...emptyContactFilters(), stand: ["you"], rating: [5, 0], open: ["unstated"] }, search: "ell", group: "agency", sort: "due", reversed: true };
    expect(sanitiseListMemory(JSON.parse(JSON.stringify(m)))).toEqual(m);
  });
  it("junk reads as the default, field by field", () => {
    const r = sanitiseListMemory({ filters: { stand: "you", door: ["open"], rating: ["5", 9, 4], genres: [1, "Crime"] }, search: 7, group: "status-v11", sort: "nonsense", reversed: "yes" })!;
    expect(r.filters).toEqual({ ...emptyContactFilters(), rating: [4], genres: ["Crime"] });
    expect(r.search).toBe("");
    expect(r.group).toBe("letter");
    expect(r.sort).toBe("surname");
    expect(r.reversed).toBe(false);
    expect(sanitiseListMemory(null)).toBeNull();
    expect(sanitiseListMemory("x")).toBeNull();
  });
});
