/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { heroManuscript, alsoOnShelf, lastSentMs, coverTitleSize, coverAuthorSize, coverType } from "./heroBook";
import { Manuscript, Query, QueryStatus } from "../types";

const m = (id: string, title = id): Manuscript => ({ id, title } as Manuscript);
const q = (manuscriptId: string, dateSent: string | undefined): Query =>
  ({ id: `q-${manuscriptId}-${dateSent}`, manuscriptId, agentId: "a", status: QueryStatus.QUERIED, dateSent } as Query);

describe("which book is the hero", () => {
  it("is the one most recently sent from", () => {
    const shelf = [m("a"), m("b"), m("c")];
    const qs = [q("a", "2024-01-01"), q("b", "2026-05-05"), q("c", "2025-01-01")];
    expect(heroManuscript(shelf, qs)?.id).toBe("b");
  });

  /**
   * ⚠️ AN UNSENT BOOK IS NOT DISQUALIFIED, IT SORTS LAST. A new account's whole shelf is unsent,
   * and a rule that required a send would leave that writer with no hero — which is the state the
   * page is least able to afford, since the hero IS the page.
   */
  it("still picks a hero when nothing has ever been sent", () => {
    expect(heroManuscript([m("a"), m("b")], [])?.id).toBe("a");
  });

  it("prefers any sent book over an unsent one, wherever it sits", () => {
    expect(heroManuscript([m("a"), m("b")], [q("b", "2020-01-01")])?.id).toBe("b");
  });

  /** A query with no send date is not a send. */
  it("ignores queries that were never sent", () => {
    expect(lastSentMs("a", [q("a", undefined)])).toBeNull();
    expect(heroManuscript([m("a"), m("b")], [q("a", undefined), q("b", "2021-01-01")])?.id).toBe("b");
  });

  it("returns nothing for an empty shelf", () => {
    expect(heroManuscript([], [])).toBeNull();
  });

  it("leaves the rest in the shelf's own order", () => {
    const shelf = [m("a"), m("b"), m("c")];
    expect(alsoOnShelf(shelf, shelf[1]).map((x) => x.id)).toEqual(["a", "c"]);
    expect(alsoOnShelf(shelf, null).map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("the typeset cover fits its box", () => {
  /**
   * ⚠️ THE BOX HAS A HEIGHT, SO OVERFLOW IS A CROP, NOT A REFLOW — the bottom of the title simply
   * disappears, which is the worst way for it to fail because nothing looks broken.
   */
  it("steps the title down as it lengthens, monotonically", () => {
    const sizes = ["Murphy", "Murphy's Day Out", "A Rather Longer Title Than That",
                   "The Remarkably Long Title Of A Book"].map(coverTitleSize);
    for (let i = 1; i < sizes.length; i++) {
      expect(sizes[i], `${sizes[i - 1]} → ${sizes[i]} went up`).toBeLessThanOrEqual(sizes[i - 1]);
    }
  });

  /** The named trap: a 40-character title must not be set at the size an 18-character one is. */
  it("shrinks a 40-character title well below the default", () => {
    const long = "The Clockmaker's Daughter And Her Sister";  // 39
    expect(long.length).toBeGreaterThanOrEqual(38);
    expect(coverTitleSize(long)).toBeLessThan(coverTitleSize("Murphy"));
    expect(coverTitleSize(long)).toBeLessThanOrEqual(17);
  });

  /**
   * ⚠️ AND THE PAIR IS THE CASE THAT OVERFLOWS. A 30-character author under a 40-character title:
   * each fits alone, and together they do not. The author line steps down too.
   */
  it("shrinks a long author name under a long title", () => {
    const title = "The Clockmaker's Daughter And Her Sister";
    const author = "Alexandra Montgomery-Fairfax";  // 28
    const t = coverType(title, author);
    expect(t.titleSize).toBeLessThanOrEqual(17);
    expect(t.authorSize, "a long name kept the full size").toBe(7);
    expect(coverAuthorSize("Nick Physick"), "a short name was shrunk for nothing").toBe(8);
  });

  /**
   * ⚠️ THE CLAMP IS A BACKSTOP, NOT THE FIT. One 90-character word cannot be broken by a font-size
   * band, so the title is also line-limited — otherwise it pushes the rule and the author out of
   * the box entirely.
   */
  it("limits the title's lines so the rule and the author survive", () => {
    expect(coverType("Murphy", "N").titleLines).toBeGreaterThan(0);
    expect(coverType("x".repeat(90), "N").titleLines).toBeLessThanOrEqual(5);
  });
});
