import { describe, it, expect } from "vitest";
import { tierFor, STUB_MAX_W } from "./cardTier";

/**
 * ⚠️ THE ROOM DECIDES, AND THESE CASES ARE WRITTEN SO THAT A CARD-WIDTH RULE FAILS THEM.
 *
 * Every case below holds the card width fixed and wide while moving only the room. A ladder that
 * read `clientWidth` — which is what v39's did, correctly, when a card was one stretch — answers
 * "full" for all of them, so the fixture cannot pass by accident on the wrong variable.
 */
describe("the content ladder", () => {
  const wide = { card: 400, full: 300, headline: 160 };

  it("takes the full form where the room holds it", () => {
    expect(tierFor({ ...wide, room: 320 })).toBe("full");
  });

  it("drops the detail where it does not", () => {
    expect(tierFor({ ...wide, room: 200 })).toBe("headline");
  });

  it("⚠️ AND KEEPS THE PILL ON A WIDE CARD WITH NO ROOM AT ALL — never a second stub", () => {
    /* the card's width is its SPAN, which is data; a 400px relationship whose last mark landed
       four days ago does not become a disc. */
    expect(tierFor({ ...wide, room: 20 })).toBe("pill");
    expect(tierFor({ ...wide, room: 0 })).toBe("pill");
  });

  it("the boundaries are the values themselves, either side", () => {
    expect(tierFor({ ...wide, room: 300 })).toBe("full");
    expect(tierFor({ ...wide, room: 298 })).toBe("headline");
    expect(tierFor({ ...wide, room: 160 })).toBe("headline");
    expect(tierFor({ ...wide, room: 158 })).toBe("pill");
  });

  it("⚠️ A CARD TOO NARROW TO BE A CARD IS A STUB, whatever its room says", () => {
    /* the stub is the one rung the card's own width decides, and it outranks the room — a 44px
       card with 400px of notional room has nowhere to put anything. */
    expect(tierFor({ card: STUB_MAX_W - 1, room: 400, full: 300, headline: 160 })).toBe("stub");
    expect(tierFor({ card: STUB_MAX_W, room: 400, full: 300, headline: 160 })).toBe("full");
  });
});
