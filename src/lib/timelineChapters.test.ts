/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for §1 — a long query read as rounds.
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";
import { chapterise, chapterLabel, openerSubject, isRequestStatus, isSendStatus, qualifyChapterLabel } from "./timelineChapters";

const row = (status: QueryStatus, kind?: string) => ({ status, ...(kind ? { kind } : {}) });
const labels = (rows: ReturnType<typeof row>[]) => chapterise(rows).chapters.map((c) => c.label);

describe("what opens a round", () => {
  /**
   * ⚠️ THE REQUEST OPENS IT, NOT THE SEND — reversed by the overnight §3, and the reason is what
   * the old rule did to the page: "Partial requested" sat at the END of the previous round, so the
   * heading "The partial" fell BETWEEN the request and the send answering it, and a query still in
   * the writer's court showed no rounds at all.
   *
   * ⚠️ ASSERTED AS THE SET the CTA engine defines, so a new request status joins without an edit.
   */
  it("every request opens one, and nothing else does", () => {
    for (const s of Object.values(QueryStatus)) {
      expect(isRequestStatus(s), `${s} disagrees with the CTA engine about being a request`)
        .toBe(getPrimaryAction(s).kind === "mark-sent");
    }
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) {
      expect(isRequestStatus(s), `${s} does not open a round`).toBe(true);
    }
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT,
      QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(isRequestStatus(s), `${s} opened a round`).toBe(false);
    }
  });

  /* the sends are still known — the first chapter opens on one, because something has to */
  it("the three sends are still the sends", () => {
    expect(isSendStatus(QueryStatus.QUERIED)).toBe(true);
    expect(isSendStatus(QueryStatus.PARTIAL_SENT)).toBe(true);
    expect(isSendStatus(QueryStatus.FULL_SENT)).toBe(true);
    /* ⚠️ AN OFFER IS "OUT" TO `statusDirection` AND IS NOT A SEND — the writer never sends one. */
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
   * ⚠️ THE REQUEST NAMES ITS OWN ROUND, which is why one status can head two differently-named
   * ones: `Full requested` opens "The full" and `Revise & Resubmit` opens "Revise and resubmit",
   * and BOTH rounds end in a `Full sent`.
   */
  it("a request is named by what it asked for", () => {
    expect(openerSubject(QueryStatus.PARTIAL_REQUESTED)).toBe("partial");
    expect(openerSubject(QueryStatus.FULL_REQUESTED)).toBe("full");
    expect(openerSubject(QueryStatus.REVISE_RESUBMIT)).toBe("resubmit");
    expect(openerSubject(QueryStatus.QUERIED)).toBe("query");
  });

  /* a log that starts mid-story still names its first round, from the request that would have
     produced that send — never an unnamed chapter, which is what §3b forbids */
  it("a send opening the first chapter is named from the request that would have caused it", () => {
    expect(openerSubject(QueryStatus.PARTIAL_SENT)).toBe("partial");
    expect(openerSubject(QueryStatus.FULL_SENT)).toBe("full");
    expect(openerSubject(QueryStatus.REJECTED)).toBe("query");
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

  /**
   * ⚠️ THE PRIYA FIXTURE — the case the overnight §3 exists for. The request and the send that
   * answers it belong to ONE round; the old rule put the heading between them.
   */
  it("a request and the send answering it sit under one heading", () => {
    const t = chapterise([row(QueryStatus.QUERIED), row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT)]);
    expect(t.labelled).toBe(true);
    expect(t.chapters.map((c) => c.label)).toEqual(["The query", "The partial"]);
    expect(t.chapters[0].rows.map((r) => r.status)).toEqual([QueryStatus.QUERIED]);
    expect(t.chapters[1].rows.map((r) => r.status), "the request was left in the previous round")
      .toEqual([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT]);
  });

  /* ⚠️ AND A REQUEST NOT YET ANSWERED STILL GETS ITS ROUND — the invisibility the old rule caused:
     it took two SENDS to make two chapters, so a query in the writer's court showed none. */
  it("a request with no send yet is still a round of its own", () => {
    const t = chapterise([row(QueryStatus.QUERIED), row(QueryStatus.PARTIAL_REQUESTED)]);
    expect(t.chapters.map((c) => c.label)).toEqual(["The query", "The partial"]);
    expect(t.labelled, "a query in the writer's court showed no rounds").toBe(true);
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
    expect(t.chapters[1].rows.map((r) => r.status)).toEqual([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REJECTED]);
  });

  /* ⚠️ NOTHING IS DROPPED. Whatever the rule does, every row it was handed comes out the other side —
     the assertion that a re-grouping cannot quietly lose an event. */
  it("every row survives chaptering", () => {
    const rows = [row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.QUERIED), row(QueryStatus.QUERIED, "nudge"), row(QueryStatus.FULL_SENT)];
    const t = chapterise(rows);
    expect(t.chapters.flatMap((c) => c.rows)).toEqual(rows);
  });

  /**
   * §3b — ⚠️ WHEN CHAPTERS ARE LABELLED, EVERY CHAPTER IS LABELLED. There is no unnamed round, so
   * this holds without an exception for a log that begins mid-story — which is exactly the shape
   * that produced the reported fault: an imported query with no `Queried` root opened an unnamed
   * first chapter, and the first heading was simply missing.
   */
  it("no chapter is ever unnamed, wherever the log begins", () => {
    for (const rows of [
      [row(QueryStatus.PARTIAL_REQUESTED), row(QueryStatus.PARTIAL_SENT)],
      [row(QueryStatus.PARTIAL_SENT), row(QueryStatus.FULL_REQUESTED), row(QueryStatus.FULL_SENT)],
      [row(QueryStatus.QUERIED, "nudge"), row(QueryStatus.FULL_REQUESTED)],
      [row(QueryStatus.REJECTED)],
    ]) {
      const t = chapterise(rows);
      for (const c of t.chapters) expect(c.label.length, `an unnamed chapter from ${rows.map((r) => r.status).join(" → ")}`).toBeGreaterThan(0);
    }
  });

  it("no rows, no chapters", () => {
    expect(chapterise([])).toEqual({ chapters: [], labelled: false });
  });
});
