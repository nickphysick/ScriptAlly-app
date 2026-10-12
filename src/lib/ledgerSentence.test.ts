/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { QueryStatus as S } from "../types";
import { LEDGER_SENTENCE, ledgerDate, ledgerSentence, sendManner } from "./ledgerSentence";

describe("the ledger's sentences", () => {
  it("every status has one, it is a sentence about somebody, and none appraises", () => {
    for (const s of Object.values(S)) {
      const t = LEDGER_SENTENCE[s];
      expect(t, s).toMatch(/^(You|They) [a-z]/);
      expect(t, s).not.toMatch(/\b(overdue|late|rejected|his|her|he|she)\b/i);
    }
  });
  it("the query's send carries how it went", () => {
    expect(ledgerSentence({ status: S.QUERIED, title: "Query sent" }, { sendMethod: "Email" })).toEqual({ text: "You sent the query", manner: "by email" });
    expect(sendManner("QueryManager")).toBe("through QueryManager");
    expect(sendManner("Online form")).toBe("through an online form");
    expect(sendManner("Post")).toBe("by post");
    expect(ledgerSentence({ status: S.QUERIED, title: "Query sent" }, {}).manner, "no method recorded: no manner invented").toBeUndefined();
  });
  it("a nudge says whether anything came back, from the row's own derived outcome", () => {
    expect(ledgerSentence({ kind: "nudge", status: S.QUERIED, title: "Nudged — no reply" })).toEqual({ text: "You nudged them", manner: "no reply" });
    expect(ledgerSentence({ kind: "nudge", status: S.QUERIED, title: "Nudged" })).toEqual({ text: "You nudged them", manner: undefined });
  });
  it("a holding reply, a reconstructed step, a no-reply close and a second full each say their own thing", () => {
    expect(ledgerSentence({ kind: "holding", status: S.PARTIAL_REQUESTED, title: "x" })).toEqual({ text: "They replied", manner: "no decision yet" });
    expect(ledgerSentence({ status: S.FULL_SENT, reconstructed: true, title: "Recorded from the imported status", sub: "Full sent" })).toEqual({ text: "You sent the full manuscript", manner: "from the imported status" });
    expect(ledgerSentence({ status: S.NO_RESPONSE, title: "x" }).manner).toBe("no reply");
    expect(ledgerSentence({ status: S.FULL_SENT, title: "x" }, { revisionRound: 2 }).manner).toBe("version 2");
    expect(ledgerSentence({ status: S.FULL_SENT, title: "x" }, { revisionRound: 1 }).manner).toBeUndefined();
  });
  it("the date: day and month, and the year only when it is not this one", () => {
    const now = new Date("2026-10-12T09:00:00Z").getTime();
    expect(ledgerDate(new Date("2024-03-14T12:00:00Z").getTime(), now)).toEqual({ day: "14 Mar", year: "2024" });
    expect(ledgerDate(new Date("2026-09-24T12:00:00Z").getTime(), now)).toEqual({ day: "24 Sep", year: null });
    expect(ledgerDate(undefined, now)).toBeNull();
  });
});
