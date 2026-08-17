/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for §1 — a long query read as rounds.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { chapterise, chapterLabel, chapterSubject, isSendStatus, qualifyChapterLabel } from "./timelineChapters";

const row = (status: QueryStatus, kind?: string) => ({ status, ...(kind ? { kind } : {}) });
const labels = (rows: ReturnType<typeof row>[]) => chapterise(rows).chapters.map((c) => c.label);

describe("what opens a round", () => {
  /* ⚠️ DERIVED FROM THE CTA ENGINE, so this asserts the SET rather than restating a list — if a new
     request status arrives with a mark-sent target, the send it targets joins without an edit. */
  it("the three sends open one, and nothing else does", () => {
    expect(isSendStatus(QueryStatus.QUERIED)).toBe(true);
    expect(isSendStatus(QueryStatus.PARTIAL_SENT)).toBe(true);
    expect(isSendStatus(QueryStatus.FULL_SENT)).toBe(true);
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT,
      QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(isSendStatus(s), `${s} opened a round`).toBe(false);
    }
  });

  /* ⚠️ AN OFFER IS "OUT" TO `statusDirection` AND IS NOT A SEND. That is precisely why this reads
     the mark-sent targets rather than the dot's direction: the writer never sends an offer. */
  it("an offer is not a send, whatever the dot's direction says", () => {
    expect(isSendStatus(QueryStatus.OFFER)).toBe(false);
  });
});

describe("what a round is called", () => {
  it("the label is built from the subject, with one spelled exception", () => {
    expect(chapterLabel("query")).toBe("The query");
    expect(chapterLabel("partial")).toBe("The partial");
    expect(chapterLabel("full")).toBe("The full");
    expect(chapterLabel("resubmit")).toBe("Revise and resubmit");
  });

  /**
   * ⚠️ ONE STATUS, TWO LABELS — the whole reason the subject is derived from the round rather than
   * looked up per status. `Full sent` after a full request is "The full"; the same status after an
   * R&R is the resubmission.
   */
  it("Full sent is named by the request that asked for it", () => {
    expect(chapterSubject(QueryStatus.FULL_SENT, QueryStatus.FULL_REQUESTED)).toBe("full");
    expect(chapterSubject(QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT)).toBe("resubmit");
  });

  it("with no request in the log it reads as the ordinary round, not the revision", () => {
    expect(chapterSubject(QueryStatus.FULL_SENT, null)).toBe("full");
    expect(chapterSubject(QueryStatus.PARTIAL_SENT, null)).toBe("partial");
    expect(chapterSubject(QueryStatus.QUERIED, QueryStatus.REVISE_RESUBMIT)).toBe("query");
  });

  it("a repeat takes an ordinal where English wants it", () => {
    expect(qualifyChapterLabel("The partial", 1)).toBe("The partial");
    expect(qualifyChapterLabel("The partial", 2)).toBe("The second partial");
    expect(qualifyChapterLabel("The full", 3)).toBe("The third full");
    expect(qualifyChapterLabel("Revise and resubmit", 2)).toBe("Revise and resubmit (second)");
  });
});

describe("chapterise", () => {
  /* ⚠️ THE THRESHOLD. A fresh query gets no heading — "The query" over one line is worse than none. */
  it("one send is one chapter and carries no label", () => {
    const t = chapterise([row(QueryStatus.QUERIED)]);
    expect(t.chapters).toHaveLength(1);
    expect(t.labelled, "a single-round query was labelled").toBe(false);
  });

  it("a nudge alone does not open a round, so a nudged query is still unlabelled", () => {
    const t = chapterise([row(QueryStatus.QUERIED), row(QueryStatus.QUERIED, "nudge")]);
    expect(t.chapters).toHaveLength(1);
    expect(t.labelled).toBe(false);
    expect(t.chapters[0].rows).toHaveLength(2);
  });

  it("a request-and-send round makes exactly two chapters, and both are labelled", () => {
    const t = chapterise([row(QueryStatus.QUERIED), row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT)]);
    expect(t.labelled).toBe(true);
    expect(t.chapters.map((c) => c.label)).toEqual(["The query", "The partial"]);
    /* ⚠️ THE REQUEST CLOSES THE ROUND BEFORE IT — see the module note on the ref's other grouping. */
    expect(t.chapters[0].rows.map((r) => r.status)).toEqual([QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]);
    expect(t.chapters[1].rows.map((r) => r.status)).toEqual([QueryStatus.PARTIAL_SENT]);
  });

  /* the ref's own fixture: two years, a nudge, an R&R and a resubmission */
  it("the resubmission fixture renders its four chapters in order", () => {
    expect(labels([
      row(QueryStatus.QUERIED),
      row(QueryStatus.QUERIED, "nudge"),
      row(QueryStatus.PARTIAL_REQUESTED),
      row(QueryStatus.PARTIAL_SENT),
      row(QueryStatus.REVISE_RESUBMIT),
      row(QueryStatus.FULL_SENT),          // the resubmission
      row(QueryStatus.FULL_REQUESTED),
      row(QueryStatus.FULL_SENT),
    ])).toEqual(["The query", "The partial", "Revise and resubmit", "The full"]);
  });

  it("two partials do not produce the same heading twice", () => {
    expect(labels([
      row(QueryStatus.QUERIED),
      row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT),
      row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT),
    ])).toEqual(["The query", "The partial", "The second partial"]);
  });

  /* a closing status belongs to the round it ended, and opens nothing */
  it("a rejection joins the last round rather than starting one", () => {
    const t = chapterise([row(QueryStatus.QUERIED), row(QueryStatus.FULL_REQUESTED), row(QueryStatus.FULL_SENT), row(QueryStatus.REJECTED)]);
    expect(t.chapters).toHaveLength(2);
    expect(t.chapters[1].rows.map((r) => r.status)).toEqual([QueryStatus.FULL_SENT, QueryStatus.REJECTED]);
  });

  /* ⚠️ NOTHING IS DROPPED. Whatever the rule does, every row it was handed comes out the other side —
     the assertion that a re-grouping cannot quietly lose an event. */
  it("every row survives chaptering", () => {
    const rows = [row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.QUERIED), row(QueryStatus.QUERIED, "nudge"), row(QueryStatus.FULL_SENT)];
    const t = chapterise(rows);
    expect(t.chapters.flatMap((c) => c.rows)).toEqual(rows);
  });

  it("rows before the first send sit in an unlabelled chapter rather than a blank heading", () => {
    const t = chapterise([row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT)]);
    expect(t.chapters[0].label).toBe("");
    expect(t.chapters[0].subject).toBeNull();
  });

  it("no rows, no chapters", () => {
    expect(chapterise([])).toEqual({ chapters: [], labelled: false });
  });
});
