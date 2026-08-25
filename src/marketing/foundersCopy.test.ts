/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Founding Writers copy — verbatim locks.
 *
 * ⚠️ THIS PAGE'S COPY IS A PRICING COMMITMENT AND WAS THE ONLY MARKETING COPY MODULE WITHOUT
 * LOCKS. `landingCopy` and `aboutCopy` have carried them since they were written; `foundersCopy`
 * arrived a pass later and the gap went unnoticed until someone went looking for what would break
 * when the copy changed. A page that promises six months free and a founding rate "for as long as
 * you're querying your manuscript" is the last one whose words should be editable without a test
 * noticing.
 *
 * ⚠️ AND THE PUNCTUATION IS PART OF THE COPY. Em dashes are em dashes, apostrophes are curly, and
 * the commas around "totally free of charge" are load-bearing — without them the phrase reads as
 * attached to "the full version of ScriptAlly" rather than to the offer.
 */
import { describe, it, expect } from "vitest";
import {
  FOUNDERS_DOCUMENT_TITLE, FOUNDERS_EYEBROW, FOUNDERS_H1, FOUNDERS_LEDE, FOUNDERS_CTA,
  FOUNDERS_DEAL, FOUNDERS_HONEST_LEAD, FOUNDERS_HONEST, FOUNDERS_SIGNOFF,
} from "./foundersCopy";
import { CopyRun } from "./CopyRuns";

/** The sentence a reader actually sees, from a run list. */
const text = (runs: CopyRun[]) =>
  runs.map((r) => (typeof r === "string" ? r : "b" in r ? r.b : "em" in r ? r.em : r.link)).join("");

describe("the hero", () => {
  it("eyebrow, headline, CTA", () => {
    expect(FOUNDERS_DOCUMENT_TITLE).toBe("Founding Writers — ScriptAlly");
    expect(FOUNDERS_EYEBROW).toBe("For founding writers");
    expect(FOUNDERS_H1).toBe("Help build our world.");
    expect(FOUNDERS_CTA).toBe("Become a Founding Writer");
  });

});

describe("the deal", () => {
  it("three cards, the offer highlighted and the other two qualifying it", () => {
    expect(FOUNDERS_DEAL.map((c) => c.key)).toEqual(["deal", "sweetener", "line"]);
    expect(FOUNDERS_DEAL.filter((c) => c.highlight).map((c) => c.key)).toEqual(["deal"]);
  });

  it("kickers and headings, verbatim", () => {
    expect(FOUNDERS_DEAL.map((c) => c.kicker)).toEqual(["The deal", "The sweetener", "A direct line"]);
    expect(FOUNDERS_DEAL.map((c) => c.heading)).toEqual([
      "Six months of Pro, free",
      "Half price, for as long as you need it.",
      "You shape what's built",
    ]);
  });

  /**
   * ⚠️ THE FIRST TWO ARE PROMISES THE PRODUCT HAS TO KEEP, and the second is a PERMANENT pricing
   * commitment stated on two pages — the landing panel's "then half price for life" is the same
   * promise in different words. If the terms change, both change together.
   */
  it("the offer and the sweetener, verbatim", () => {
    expect(FOUNDERS_DEAL[0].body).toBe(
      "The full force of ScriptAlly is yours. Be amongst the first to supercharge your campaign " +
      "for agent representation, backed by an arsenal of time-saving Pro features and a tailored " +
      "suite of querying analytics.",
    );
    expect(FOUNDERS_DEAL[1].body).toBe(
      "If you choose to stick with ScriptAlly, you'll never pay full price. You'll pay a founding " +
      "writers' rate for as long as you're querying your manuscript.",
    );
  });

  /** ⚠️ RETARGET: the third card's body was rewritten; the heading is unchanged. */
  it("the direct line, verbatim", () => {
    expect(FOUNDERS_DEAL[2].body).toBe(
      "You'll be in direct contact with ScriptAlly's founder, giving feedback, shaping new " +
      "features, helping to design and refine a tool that works for you and for the whole " +
      "writing community.",
    );
    expect(FOUNDERS_DEAL[2].body).not.toContain("will work alongside");
  });
});

describe("the sign-off", () => {
  it("is one person, named, with an em dash", () => {
    expect(FOUNDERS_SIGNOFF).toBe("Nick — ScriptAlly's founder");
    expect(FOUNDERS_SIGNOFF).toContain("—");
    expect(FOUNDERS_SIGNOFF).not.toContain(" - ");
  });
});

describe("the disclosure", () => {
  it("lifts the promise, and the label is gone", async () => {
    expect(FOUNDERS_HONEST_LEAD).toBe("Your data is never the experiment.");
    const copy = await import("./foundersCopy");
    expect("FOUNDERS_HONEST_KICKER" in copy).toBe(false);
    const strings = Object.values(copy).filter((v) => typeof v === "string") as string[];
    expect(strings).not.toContain("Full disclosure");
  });

  it("two paragraphs, verbatim", () => {
    expect(FOUNDERS_HONEST).toHaveLength(2);
    expect(text(FOUNDERS_HONEST[0])).toBe(
      "ScriptAlly isn't quite finished. Things will shift. Features will be tweaked. The look and " +
      "feel might change. But the security of your data will be ensured — your queries, your " +
      "agents, your materials. They won't be lost, they won't be shared. Writers — and their " +
      "writing — are our absolute priority.",
    );
    expect(text(FOUNDERS_HONEST[1])).toBe(
      "All we ask is that you stick at it. Let us know what you like, what could be better, and " +
      "do shout loudly if something gets in your way.",
    );
  });

  /**
   * ⚠️ `quite` IS ITALIC, AND IT IS THE ONLY MARKED RUN. The promise moved up into the lifted
   * line, so nothing in the prose is bold any more — emphasising it in both places says it twice
   * and means it less.
   */
  it("marks `quite` as italic and nothing as bold", () => {
    const runs = FOUNDERS_HONEST.flat();
    expect(runs.filter((r) => typeof r !== "string" && "em" in r)).toEqual([{ em: "quite" }]);
    expect(runs.filter((r) => typeof r !== "string" && "b" in r)).toEqual([]);
  });

  /** ⚠️ EM DASHES ARE PART OF THE COPY. A hyphen here reads as a typo in prose this careful. */
  it("uses em dashes, not hyphens", () => {
    const all = FOUNDERS_HONEST.map(text).join(" ");
    expect(all).toContain("ensured — your queries");
    expect(all).toContain("Writers — and their writing — are our absolute priority");
    expect(all).not.toMatch(/\w - \w/);
  });
});
