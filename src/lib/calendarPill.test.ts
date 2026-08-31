/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ NO INVENTED STATE WORD MAY REACH A PILL (v39, Phase 2).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus } from "../types";
import { pillText, PILL_WORDS, DEEDS } from "./calendarPill";

/* the words the board used to draw, and none of them is a QueryStatus */
const INVENTED = ["Quiet", "With you", "Waiting to hear", "Offer received",
  "Revise and resubmit", "Closed", "Full req", "Partial req", "R&R"];

describe("a pill says a status or a deed, and nothing else", () => {
  const ALL = Object.values(QueryStatus);

  it("covers every status, both holders, and the nudge — the sweep is exhaustive by construction", () => {
    expect(ALL.length, "QueryStatus shrank").toBe(10);
    let n = 0;
    for (const s of ALL) for (const h of ["agent", "writer"] as const) for (const nd of [false, true]) {
      const p = pillText(s, h, nd);
      /* ⚠️ THE PERMITTED SET IS DERIVED, never a literal list written out beside it. A hand-copied
         set drifts from the enum the moment a status is added, and then passes by describing a
         vocabulary the app no longer has. */
      expect(PILL_WORDS, `${s}/${h}/${nd} produced "${p.text}"`).toContain(p.text);
      n += 1;
    }
    expect(n, "the sweep did not run").toBe(40);
  });

  it("not one invented word is reachable", () => {
    const reachable = new Set<string>();
    for (const s of ALL) for (const h of ["agent", "writer"] as const) for (const nd of [false, true]) {
      reachable.add(pillText(s, h, nd).text);
    }
    const bad = INVENTED.filter((w) => reachable.has(w));
    expect(bad, `the board can still say: ${bad.join(", ")}`).toEqual([]);
    /* and the set is not empty for a silly reason */
    expect(reachable.size, "no pill text was produced at all").toBeGreaterThan(6);
  });

  it("the status while the agency holds it, the deed while the writer does", () => {
    expect(pillText(QueryStatus.PARTIAL_REQUESTED, "agent").text).toBe(QueryStatus.PARTIAL_REQUESTED);
    expect(pillText(QueryStatus.PARTIAL_REQUESTED, "writer").text).toBe(DEEDS.partial);
    expect(pillText(QueryStatus.FULL_REQUESTED, "writer").text).toBe(DEEDS.full);
    expect(pillText(QueryStatus.REVISE_RESUBMIT, "writer").text).toBe(DEEDS.revision);
    expect(pillText(QueryStatus.OFFER, "writer").text).toBe(DEEDS.offer);
  });

  it("the three closed statuses keep their own names — `Closed` flattens three endings into one", () => {
    expect(pillText(QueryStatus.REJECTED, "agent").text).toBe("Rejected");
    expect(pillText(QueryStatus.WITHDRAWN, "agent").text).toBe("Withdrawn");
    expect(pillText(QueryStatus.NO_RESPONSE, "agent").text).toBe("No Response");
    expect(new Set([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]
      .map((s) => pillText(s, "agent").text)).size, "two closed statuses share a word").toBe(3);
  });

  it("a fallen-due nudge outranks the status, but only while the agency holds the move", () => {
    expect(pillText(QueryStatus.QUERIED, "agent", true).text).toBe(DEEDS.nudge);
    /* ⚠️ WHERE THE WRITER ALREADY OWES SOMETHING, THE DEBT WINS. A reminder is a note to yourself;
       a requested partial is somebody waiting. */
    expect(pillText(QueryStatus.PARTIAL_REQUESTED, "writer", true).text).toBe(DEEDS.partial);
  });

  it("the writer never holds a query that has only been sent", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(pillText(s, "writer").text, `${s} produced a deed`).toBe(s);
      expect(pillText(s, "writer").tone).toBe("them");
    }
  });
});
