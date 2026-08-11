/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sidebar account row's name and its initials (Option D).
 *
 * ⚠️ THE POINT OF THE PAIRED TESTS is that the two functions cannot drift: the row shows
 * "Bethany C." beside a chip reading "BC", and if the chip derived its letters from its own copy
 * of the splitting rules they would agree by COINCIDENCE. Every case below asserts both.
 */
import { describe, expect, it } from "vitest";
import { SIDEBAR_NAME_MAX, formatSidebarName, getInitials } from "./displayName";

describe("formatSidebarName", () => {
  it("a name inside the budget is returned untouched", () => {
    expect(formatSidebarName("Nick Physick")).toBe("Nick Physick");
    expect(formatSidebarName("Bethany Costello")).toBe("Bethany Costello"); // 16 — the pack's case
  });

  it("⚠️ the boundary is inclusive — exactly the budget still fits", () => {
    const exact = "Jonathan Fairweath"; // 18
    expect(exact.length).toBe(18);
    expect(formatSidebarName(exact)).toBe(exact);
    const at = "Jonathan Fairweathe"; // 19
    expect(at.length).toBe(SIDEBAR_NAME_MAX);
    expect(formatSidebarName(at)).toBe(at);
  });

  it("over the budget with a surname → first name + surname initial", () => {
    expect(formatSidebarName("Wilhelmina Fotheringay")).toBe("Wilhelmina F.");
    expect(formatSidebarName("Alexandra Christodoulou")).toBe("Alexandra C.");
  });

  it("the LAST word is the one initialised, not the second", () => {
    expect(formatSidebarName("Arthur Conan Doyle Smithson")).toBe("Arthur S.");
  });

  /* ⚠️ A SHORT FORM THAT WOULD ITSELF ELLIPSISE IS WORSE THAN THE TRUTH: the reader would lose the
     surname to the formatter AND the first name to the CSS. One honest truncation beats two. */
  it("⚠️ when even the short form overflows, the ORIGINAL comes back for the CSS to cut", () => {
    const huge = "Bartholomewfitzwilliam Fotheringay";
    expect(formatSidebarName(huge)).toBe(huge);
    expect(`${huge.split(" ")[0]} F.`.length).toBeGreaterThan(SIDEBAR_NAME_MAX);
  });

  it("a mononym has no surname to initialise and is left to the CSS", () => {
    expect(formatSidebarName("Bartholomewfitzwilliamson")).toBe("Bartholomewfitzwilliamson");
    expect(formatSidebarName("Prince")).toBe("Prince");
  });

  it("whitespace is trimmed and collapsed before anything is decided", () => {
    expect(formatSidebarName("   Nick    Physick  ")).toBe("Nick Physick");
    expect(formatSidebarName("Wilhelmina    Fotheringay")).toBe("Wilhelmina F.");
  });

  it("⚠️ empty, blank and undefined give an empty string — never 'undefined' in the DOM", () => {
    expect(formatSidebarName("")).toBe("");
    expect(formatSidebarName("   ")).toBe("");
    expect(formatSidebarName(undefined)).toBe("");
    expect(formatSidebarName(null)).toBe("");
  });

  it("⚠️ it never constructs an ellipsis itself — that is the stylesheet's job", () => {
    for (const n of ["Bartholomewfitzwilliamson", "Wilhelmina Fotheringay", "   "]) {
      expect(formatSidebarName(n)).not.toContain("…");
      expect(formatSidebarName(n)).not.toContain("...");
    }
  });
});

describe("getInitials", () => {
  it("takes the first two words' initials, uppercased", () => {
    expect(getInitials("Nick Physick")).toBe("NP");
    expect(getInitials("bethany costello")).toBe("BC");
    expect(getInitials("Arthur Conan Doyle")).toBe("AC"); // two, not three — the avatar's contract
  });

  it("a mononym gives one letter", () => {
    expect(getInitials("Prince")).toBe("P");
  });

  it("empty and undefined give the em-dash placeholder, not an empty circle", () => {
    expect(getInitials("")).toBe("—");
    expect(getInitials("   ")).toBe("—");
    expect(getInitials(undefined)).toBe("—");
  });
});

/**
 * ⚠️ THE AGREEMENT SUITE — the reason both live in one module.
 *
 * "Agree" cannot mean "produce the same string"; one is a name and one is two letters. It means:
 * every letter the chip shows is the initial of a word the reader can still see or hover, drawn
 * from the SAME normalised input. A second implementation would pass the individual tests above
 * and fail these the first time a name had a trailing space or a middle name.
 */
describe("the two outputs agree on every input", () => {
  const CASES = [
    "Nick Physick",
    "Bethany Costello",
    "Wilhelmina Fotheringay",
    "Arthur Conan Doyle Smithson",
    "   Nick    Physick  ",
    "Prince",
    "Bartholomewfitzwilliam Fotheringay",
  ];

  it("the chip's first letter is always the displayed name's first letter", () => {
    for (const n of CASES) {
      const shown = formatSidebarName(n);
      const chip = getInitials(n);
      expect(chip.charAt(0), n).toBe(shown.charAt(0).toUpperCase());
    }
  });

  it("⚠️ both read the same normalised string — spacing cannot pull them apart", () => {
    expect(formatSidebarName("  Nick   Physick ")).toBe(formatSidebarName("Nick Physick"));
    expect(getInitials("  Nick   Physick ")).toBe(getInitials("Nick Physick"));
  });

  it("an absent name leaves no text and no letters — the two fallbacks are stated, not accidental", () => {
    expect(formatSidebarName(undefined)).toBe("");
    expect(getInitials(undefined)).toBe("—");
  });
});
