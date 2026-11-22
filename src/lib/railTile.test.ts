import { describe, it, expect } from "vitest";
import { railTile } from "./railTile";

describe("railTile — the rail's manuscript tile (sidebar rail v1)", () => {
  it("is the first letters of the first two words, a leading article dropped", () => {
    expect(railTile("The Taloned Mr Ripley")).toEqual({ kind: "initials", text: "TM" });
    expect(railTile("Lord of the Wings")).toEqual({ kind: "initials", text: "LO" });
    expect(railTile("murphy")).toEqual({ kind: "initials", text: "M" });
    expect(railTile("An Éclair at Dawn")).toEqual({ kind: "initials", text: "ÉA" });
  });
  it("skips words that do not start with a letter", () => {
    expect(railTile("1984 and Other Stories")).toEqual({ kind: "initials", text: "AO" });
  });
  it("a title naming every book is the stack", () => {
    expect(railTile("All manuscripts")).toEqual({ kind: "stack" });
    expect(railTile("Every book")).toEqual({ kind: "stack" });
  });
  it("a title with no letters, or none at all, is the Library glyph — never blank initials", () => {
    expect(railTile("1984")).toEqual({ kind: "blank" });
    expect(railTile("")).toEqual({ kind: "blank" });
    expect(railTile(undefined)).toEqual({ kind: "blank" });
  });
});
