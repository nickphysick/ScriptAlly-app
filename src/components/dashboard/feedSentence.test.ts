/**
 * ⚠️ THE SENTENCE MAY NOT SAY ANYTHING THE RECORD DOES NOT (v22, Phase 7).
 *
 * `describeEvent` is the one place the feed composes prose rather than quoting the log, so it is
 * the one place a clause could be invented. The ref's own fixture writes several that this app
 * cannot support — "the first 50 pages", "after reading the partial", "the full 50,000-word
 * manuscript" — and each is a fact about a specific submission that our records do not carry.
 *
 * These cases assert the two halves of the constraint: every part that IS derivable appears, and
 * every part that is not is ABSENT rather than guessed. The second half is what a reader would
 * catch in a glance, and this repo's own history says that is the expensive kind of wrong: a
 * missing sentence is a gap someone asks about, a false one teaches that the app's prose cannot
 * be trusted.
 */
import { describe, it, expect } from "vitest";
import { describeEvent } from "./OneScreenRail";
import { QueryStatus } from "../../types";

const text = (segs: ReturnType<typeof describeEvent>) => (segs ?? []).map((s) => s.t).join("");

describe("describeEvent", () => {
  it("names the actor, the act and the book, with the book italic", () => {
    const segs = describeEvent(QueryStatus.FULL_REQUESTED, "Priya Sen", "Murphy's Day Out", null);
    expect(text(segs)).toBe("Priya Sen asked for the full manuscript of Murphy's Day Out");
    expect(segs!.filter((s) => s.em).map((s) => s.t)).toEqual(["Murphy's Day Out"]);
  });

  it("the writer's own acts read in the first person, and name the agent as the destination", () => {
    expect(text(describeEvent(QueryStatus.FULL_SENT, "Priya Sen", "Murphy's Day Out", 4)))
      .toBe("You sent the full manuscript of Murphy's Day Out to Priya Sen, 4 days after you queried");
  });

  /* ⚠️ THE ELAPSED CLAUSE IS THE ONLY DERIVED ONE, AND IT IS ARITHMETIC ON `dateSent`. A query
     with no send date — an import can carry one — loses the clause rather than gaining a guess. */
  it("omits the elapsed clause when there is no send date to measure from", () => {
    const segs = describeEvent(QueryStatus.REJECTED, "Ruth Alderman", "Murphy's Day Out", null);
    expect(text(segs)).toBe("Ruth Alderman passed on Murphy's Day Out");
    expect(text(segs)).not.toMatch(/after you queried/);
  });

  it("omits it on the query itself, where it would always read zero", () => {
    expect(text(describeEvent(QueryStatus.QUERIED, "Priya Sen", "Murphy's Day Out", 0)))
      .toBe("You sent your query for Murphy's Day Out to Priya Sen");
  });

  it("agrees in number", () => {
    expect(text(describeEvent(QueryStatus.OFFER, "Priya Sen", "Murphy's Day Out", 1)))
      .toMatch(/, 1 day after you queried$/);
    expect(text(describeEvent(QueryStatus.OFFER, "Priya Sen", "Murphy's Day Out", 22)))
      .toMatch(/, 22 days after you queried$/);
  });

  /* ⚠️ A HOLE IN A COMPOSED SENTENCE IS WORSE THAN NO COMPOSED SENTENCE. "You updated details for
     at Penhallow" is a real fault this feed has already shipped once; the composer returns null so
     the row falls back to the log's own words instead of rendering a sentence with a gap in it. */
  it("returns null rather than a sentence with a hole in it", () => {
    expect(describeEvent(QueryStatus.REJECTED, "", "Murphy's Day Out", 3)).toBeNull();
    expect(describeEvent(null, "Priya Sen", "Murphy's Day Out", 3)).toBeNull();
  });

  it("drops the book rather than inventing one, and still reads as a sentence", () => {
    expect(text(describeEvent(QueryStatus.REJECTED, "Ruth Alderman", "", 24)))
      .toBe("Ruth Alderman passed on, 24 days after you queried");
  });

  /* ⚠️ NO_RESPONSE IS A FACT ABOUT THE RECORD, NOT ABOUT THE AGENT. They may well have replied
     somewhere this app never saw; the app reports and does not appraise. */
  it("does not accuse anyone of ignoring the writer", () => {
    const t = text(describeEvent(QueryStatus.NO_RESPONSE, "Ruth Alderman", "Murphy's Day Out", 90));
    expect(t).toContain("No reply recorded from Ruth Alderman");
    expect(t).not.toMatch(/ignored|never replied|failed to|did not bother/i);
  });

  /* ⚠️ THE CLAUSES THE REF WRITES AND WE CANNOT DERIVE. Named individually, because the failure
     mode is someone reading the ref's fixture and copying a phrase out of it. */
  it("never states a page count, a word count, or a reading history", () => {
    for (const st of Object.values(QueryStatus)) {
      const t = text(describeEvent(st as QueryStatus, "Priya Sen", "Murphy's Day Out", 12));
      expect(t, `${st} must not claim a quantity of pages or words`)
        .not.toMatch(/\b\d+[,\d]*\s*(pages|words|chapters)\b/i);
      expect(t, `${st} must not claim what the agent read`)
        .not.toMatch(/after reading|having read|first \d+/i);
    }
  });
});
