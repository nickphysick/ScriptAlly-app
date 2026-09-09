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
import { describeEvent, elapsedClause, trustedElapsed, queriedTimes } from "./OneScreenRail";
import { QueryStatus, ActivityType, type Activity } from "../../types";

const text = (segs: ReturnType<typeof describeEvent>) => (segs ?? []).map((s) => s.t).join("");

describe("describeEvent", () => {
  it("names the actor, the act and the book, with the book italic", () => {
    const segs = describeEvent(QueryStatus.FULL_REQUESTED, "Priya Sen", "Murphy's Day Out", null);
    expect(text(segs)).toBe("Priya Sen asked for the full manuscript of Murphy's Day Out");
    expect(segs!.filter((s) => s.em).map((s) => s.t)).toEqual(["Murphy's Day Out"]);
  });

  it("the writer's own acts read in the first person, and name the agent as the destination", () => {
    /* ⚠️ THE PARAMETER IS MILLISECONDS NOW, NOT DAYS (v27, Phase 5). It had to become the raw gap
       so the clause can choose its own unit — days was the only one available, so an hour rounded
       to zero and vanished and a minute could not be said at all. */
    expect(text(describeEvent(QueryStatus.FULL_SENT, "Priya Sen", "Murphy's Day Out", 4 * 86_400_000)))
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
    expect(text(describeEvent(QueryStatus.QUERIED, "Priya Sen", "Murphy's Day Out", 3 * 86_400_000)))
      .toBe("You sent your query for Murphy's Day Out to Priya Sen");
  });

  it("agrees in number", () => {
    expect(text(describeEvent(QueryStatus.OFFER, "Priya Sen", "Murphy's Day Out", 86_400_000)))
      .toMatch(/, 1 day after you queried$/);
    expect(text(describeEvent(QueryStatus.OFFER, "Priya Sen", "Murphy's Day Out", 22 * 86_400_000)))
      .toMatch(/, 22 days after you queried$/);
  });

  /* ⚠️ A HOLE IN A COMPOSED SENTENCE IS WORSE THAN NO COMPOSED SENTENCE. "You updated details for
     at Penhallow" is a real fault this feed has already shipped once; the composer returns null so
     the row falls back to the log's own words instead of rendering a sentence with a gap in it. */
  it("returns null rather than a sentence with a hole in it", () => {
    expect(describeEvent(QueryStatus.REJECTED, "", "Murphy's Day Out", 3 * 86_400_000)).toBeNull();
    expect(describeEvent(null, "Priya Sen", "Murphy's Day Out", 3 * 86_400_000)).toBeNull();
  });

  it("drops the book rather than inventing one, and still reads as a sentence", () => {
    expect(text(describeEvent(QueryStatus.REJECTED, "Ruth Alderman", "", 24 * 86_400_000)))
      .toBe("Ruth Alderman passed on, 24 days after you queried");
  });

  /* ⚠️ NO_RESPONSE IS A FACT ABOUT THE RECORD, NOT ABOUT THE AGENT. They may well have replied
     somewhere this app never saw; the app reports and does not appraise. */
  it("does not accuse anyone of ignoring the writer", () => {
    const t = text(describeEvent(QueryStatus.NO_RESPONSE, "Ruth Alderman", "Murphy's Day Out", 90 * 86_400_000));
    expect(t).toContain("No reply recorded from Ruth Alderman");
    expect(t).not.toMatch(/ignored|never replied|failed to|did not bother/i);
  });

  /* ⚠️ THE CLAUSES THE REF WRITES AND WE CANNOT DERIVE. Named individually, because the failure
     mode is someone reading the ref's fixture and copying a phrase out of it. */
  it("never states a page count, a word count, or a reading history", () => {
    for (const st of Object.values(QueryStatus)) {
      const t = text(describeEvent(st as QueryStatus, "Priya Sen", "Murphy's Day Out", 12 * 86_400_000));
      expect(t, `${st} must not claim a quantity of pages or words`)
        .not.toMatch(/\b\d+[,\d]*\s*(pages|words|chapters)\b/i);
      expect(t, `${st} must not claim what the agent read`)
        .not.toMatch(/after reading|having read|first \d+/i);
    }
  });
});

/**
 * ⚠️ THE ELAPSED CLAUSE SHIPPED SAYING SOMETHING FALSE, AND THAT IS WHY THESE CASES ARE HERE.
 *
 * "You sent the full manuscript … 870 days after you queried", about a full sent SEVENTY-ONE
 * MINUTES after the query. The arithmetic was correct and the sentence was a lie: the anchor was
 * the query record's stored `dateSent`, which on that record held a seed value. A wrong number is
 * read as a fact and nothing about it looks wrong, which makes it worse than no number at all.
 */
describe("the elapsed clause refuses more readily than it speaks", () => {
  const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000;

  /* the pack's gate: a same-day send renders minutes or hours, NEVER days */
  it("a same-day send reads in minutes or hours", () => {
    /* ⚠️ MINUTES RUN TO 90, DELIBERATELY. "71 minutes" is precise and unambiguous where "1 hour"
       silently discards eleven of them; the unit changes when the precision stops being useful,
       not at the first round number. */
    expect(elapsedClause(71 * MIN)).toBe("71 minutes");
    expect(elapsedClause(12 * MIN)).toBe("12 minutes");
    expect(elapsedClause(5 * HOUR)).toBe("5 hours");
    for (const ms of [2 * MIN, 40 * MIN, 71 * MIN, 6 * HOUR, 20 * HOUR]) {
      expect(elapsedClause(ms), `${ms}ms must not read in days`).not.toMatch(/day/);
    }
  });

  it("agrees in number, and only reaches days when it should", () => {
    expect(elapsedClause(60 * MIN)).toBe("60 minutes");
    expect(elapsedClause(2 * HOUR)).toBe("2 hours");
    expect(elapsedClause(2 * DAY)).toBe("2 days");
    expect(elapsedClause(870 * DAY)).toBe("870 days");
  });

  /* ⚠️ THE SAME INSTANT IS NOT "0 minutes" — a clause that adds nothing is noise on every line. */
  it("says nothing at all when the gap is under a minute", () => {
    expect(elapsedClause(0)).toBeNull();
    expect(elapsedClause(30_000)).toBeNull();
  });

  it("refuses a null or unparseable elapsed rather than throwing", () => {
    expect(elapsedClause(null)).toBeNull();
    expect(elapsedClause(Number.NaN)).toBeNull();
    expect(() => elapsedClause(null)).not.toThrow();
  });

  /* ⚠️ THE THREE REFUSALS, each a case the old code printed. */
  it("trustedElapsed refuses an anchor the record cannot support", () => {
    const now = Date.parse("2026-09-09T15:00:00Z");
    const sent = Date.parse("2026-09-09T13:02:00Z");
    const event = Date.parse("2026-09-09T14:10:00Z");
    expect(trustedElapsed(sent, event, now)).toBe(68 * MIN);
    /* no anchor at all */
    expect(trustedElapsed(null, event, now)).toBeNull();
    /* the event predates the query it belongs to */
    expect(trustedElapsed(event, sent, now)).toBeNull();
    /* the anchor is older than the query can be — the seed case, in one line */
    expect(trustedElapsed(Date.parse("1970-01-01T00:00:00Z"), event, now)).not.toBeNull();
    expect(trustedElapsed(sent, now + DAY, now)).toBeNull();
  });

  /* ⚠️ AND THE WHOLE SENTENCE SURVIVES A MISSING ANCHOR — the pack's second gate. */
  it("a missing anchor renders the sentence with no clause, and does not throw", () => {
    const segs = describeEvent(QueryStatus.FULL_SENT, "Iris Kwan", "The Smoke Test", null);
    const text = (segs ?? []).map((s) => s.t).join("");
    expect(text).toBe("You sent the full manuscript of The Smoke Test to Iris Kwan");
    expect(text).not.toMatch(/after you queried/);
    expect(() => describeEvent(QueryStatus.FULL_SENT, "Iris Kwan", "The Smoke Test", null)).not.toThrow();
  });

  it("the same-day sequence reads as the reader lived it", () => {
    const segs = describeEvent(QueryStatus.FULL_SENT, "Iris Kwan", "The Smoke Test", 68 * MIN);
    expect((segs ?? []).map((s) => s.t).join("")).toBe(
      "You sent the full manuscript of The Smoke Test to Iris Kwan, 68 minutes after you queried",
    );
  });
});

/** the anchor itself: the query's own log beats a stored field */
describe("the anchor comes from the query's own log", () => {
  const act = (over: Partial<Activity> & { id: string }): Activity => ({
    userId: "u", queryId: "q1", manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED,
    description: "", date: "2026-09-09T13:02:00Z", ...over,
  } as Activity);

  it("reads the QUERIED event's date, and the earliest one when a resubmission wrote a second", () => {
    const m = queriedTimes([
      act({ id: "a", resultingStatus: QueryStatus.QUERIED, date: "2026-09-09T13:02:00Z" }),
      act({ id: "b", resultingStatus: QueryStatus.QUERIED, date: "2026-09-20T09:00:00Z" }),
      act({ id: "c", resultingStatus: QueryStatus.FULL_SENT, date: "2026-09-09T14:10:00Z" }),
    ]);
    expect(m.get("q1")).toBe(Date.parse("2026-09-09T13:02:00Z"));
  });

  it("ignores events with no query and unparseable dates rather than throwing", () => {
    const m = queriedTimes([
      act({ id: "a", resultingStatus: QueryStatus.QUERIED, queryId: "", date: "2026-09-09T13:02:00Z" }),
      act({ id: "b", resultingStatus: QueryStatus.QUERIED, date: "not a date" }),
    ]);
    expect(m.size).toBe(0);
  });
});
