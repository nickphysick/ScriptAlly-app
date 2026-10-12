/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, expect, it } from "vitest";
import { QueryStatus as S } from "../types";
import { longSpan, standCard, weeksWords, type StandFacts } from "./standCard";

const DAY = 86_400_000;
const NOW = new Date("2026-10-12T09:00:00Z").getTime();
const base: StandFacts = { status: S.QUERIED, first: "Eleanor", agency: "Greenfield Literary", court: "agent", stageStartMs: NOW - 20 * DAY, expectedMs: NOW + 36 * DAY, windowWeeks: 8, unansweredNudgeMs: null, closedHow: null, manuscriptTitle: "Murphy’s Day Out" };
const text = (f: Partial<StandFacts>) => { const v = standCard({ ...base, ...f }, NOW); return { ...v, p: v.paragraph.map((x) => x.text).join("") }; };

describe("the stand card — the pack's table, one state at a time", () => {
  it("with the agent, not due", () => {
    const v = text({});
    expect(v.heading).toBe("Waiting on Eleanor");
    expect(v.figure).toBe("36 days to go");
    expect(v.p).toBe("You expect a reply by 17 Nov. Nothing to do until then.");
    expect(v.past).toBe(false);
    expect(v.bar).toMatchObject({ hot: false, left: "Sent 22 Sep", right: "Reply by 17 Nov" });
    expect(v.bar!.pct).toBe(36);
  });
  it("with the agent, past the date", () => {
    const v = text({ stageStartMs: NOW - 70 * DAY, expectedMs: NOW - 14 * DAY });
    expect(v.heading).toBe("No word from Eleanor yet");
    expect(v.figure).toBe("14 days past your date");
    expect(v.p).toBe("You expected a reply by 28 Sep.");
    expect(v.past).toBe(true);
    expect(v.bar).toMatchObject({ hot: true, pct: 100 });
  });
  it("over a year with no reply: the window, when it closed, and the unanswered nudge", () => {
    const start = new Date("2024-03-14T12:00:00Z").getTime();
    const v = text({ stageStartMs: start, expectedMs: start + 56 * DAY, unansweredNudgeMs: new Date("2024-09-24T12:00:00Z").getTime() });
    expect(v.heading).toBe("Still waiting on Eleanor");
    expect(v.figure).toBe("2½ years");
    expect(v.p).toBe("Greenfield Literary said they’d reply within eight weeks. That window closed 2½ years ago, and your nudge in September went unanswered. Closing it keeps your reply rate honest; you can still record a reply if one ever comes.");
    expect(v.bar).toMatchObject({ hot: true, pct: 100, left: "Sent 14 Mar 2024", right: "Window closed 9 May 2024" });
  });
  it("a request to send: days left, days over, and no date", () => {
    const due = text({ status: S.FULL_REQUESTED, court: "you", expectedMs: NOW + 9 * DAY });
    expect(due.heading).toBe("Send Eleanor the full");
    expect(due.figure).toBe("9 days left");
    expect(due.p).toBe("They’re expecting it by 21 Oct. Mark it sent once it’s gone.");
    const over = text({ status: S.PARTIAL_REQUESTED, court: "you", expectedMs: NOW - 3 * DAY });
    expect(over.heading).toBe("Send Eleanor the partial");
    expect(over.figure).toBe("3 days over");
    expect(over.p).toBe("It was due on 9 Oct. Mark it sent once it’s gone.");
    expect(over.past).toBe(true);
    expect(text({ status: S.REVISE_RESUBMIT, court: "you", expectedMs: null }).heading).toBe("Send Eleanor the revision");
  });
  it("an offer", () => {
    const v = standCard({ ...base, status: S.OFFER, court: "offer", expectedMs: NOW + 12 * DAY }, NOW);
    expect(v.heading).toBe("Your answer is due");
    expect(v.figure).toBe("12 days left");
    expect(v.paragraph).toEqual([{ text: "Eleanor has offered to represent " }, { text: "Murphy’s Day Out", em: true }, { text: "." }, { text: " You said you’d answer by 24 Oct." }]);
  });
  it("closed: a pass, no reply, withdrawn, signed — and the date as the figure", () => {
    const closed = { court: "closed" as const, stageStartMs: NOW - 5 * DAY, expectedMs: null };
    expect(text({ ...closed, status: S.REJECTED, closedHow: "passed" })).toMatchObject({ heading: "Eleanor passed", figure: "7 Oct", p: "This query is closed. It stays here, and in your figures.", tone: "closed" });
    expect(text({ ...closed, status: S.NO_RESPONSE, closedHow: "noReply" }).heading).toBe("Closed, no reply");
    expect(text({ ...closed, status: S.WITHDRAWN, closedHow: "withdrawn" }).heading).toBe("You withdrew it");
    expect(text({ ...closed, status: S.SIGNED }).heading).toBe("You signed with Eleanor");
  });
});

describe("⚠️ a clause whose fact is missing is dropped, never filled in", () => {
  it("no reply date: no figure, no bar, and no date in the sentence", () => {
    const v = text({ expectedMs: null, windowWeeks: null });
    expect(v).toMatchObject({ heading: "Waiting on Eleanor", figure: null, bar: null, p: "No reply date is recorded for this query." });
  });
  it("over a year, and the agency states no window: neither window sentence is written", () => {
    const start = NOW - 500 * DAY;
    expect(text({ stageStartMs: start, expectedMs: null, windowWeeks: null }).p).toBe("Closing it keeps your reply rate honest; you can still record a reply if one ever comes.");
    expect(text({ stageStartMs: start, expectedMs: null, windowWeeks: null, unansweredNudgeMs: new Date("2026-02-03T12:00:00Z").getTime() }).p)
      .toBe("Your nudge in February went unanswered. Closing it keeps your reply rate honest; you can still record a reply if one ever comes.");
  });
  it("over a year, a window, and no nudge: the nudge clause is absent", () => {
    expect(text({ stageStartMs: NOW - 500 * DAY, expectedMs: NOW - 444 * DAY }).p).not.toMatch(/nudge/);
  });
  it("an offer with no deadline and no title: no figure, and neither is invented", () => {
    const v = text({ status: S.OFFER, court: "offer", expectedMs: null, manuscriptTitle: null });
    expect(v).toMatchObject({ figure: null, p: "Eleanor has offered representation." });
  });
  it("a close with no date: no figure", () => {
    expect(text({ court: "closed", status: S.REJECTED, closedHow: "passed", stageStartMs: null }).figure).toBeNull();
  });
  it("⚠️ it never appraises: no heading, figure or sentence says late or overdue, in any state", () => {
    const DAYS = [-400, -70, -14, -1, 1, 9, 36];
    for (const s of Object.values(S)) for (const d of DAYS) for (const start of [20, 500]) {
      const court = s === S.OFFER ? "offer" : [S.REJECTED, S.NO_RESPONSE, S.WITHDRAWN, S.SIGNED].includes(s) ? "closed" : [S.PARTIAL_REQUESTED, S.FULL_REQUESTED, S.REVISE_RESUBMIT].includes(s) ? "you" : "agent";
      const v = text({ status: s, court, stageStartMs: NOW - start * DAY, expectedMs: NOW + d * DAY, unansweredNudgeMs: NOW - 5 * DAY });
      for (const t of [v.heading, v.figure ?? "", v.p, v.bar?.left ?? "", v.bar?.right ?? ""]) expect(t, `${s} ${d}`).not.toMatch(/\b(late|overdue)\b/i);
    }
  });
  it("no branch is left out: every status yields a heading and a paragraph", () => {
    for (const s of Object.values(S)) {
      const court = s === S.OFFER ? "offer" : [S.REJECTED, S.NO_RESPONSE, S.WITHDRAWN, S.SIGNED].includes(s) ? "closed" : [S.PARTIAL_REQUESTED, S.FULL_REQUESTED, S.REVISE_RESUBMIT].includes(s) ? "you" : "agent";
      const v = text({ status: s, court });
      expect(v.heading.length, s).toBeGreaterThan(3);
      expect(v.p.length, s).toBeGreaterThan(10);
    }
  });
});

describe("the spans and the window's words", () => {
  it("long spans go to the nearest half year from a year up", () => {
    expect(longSpan(11)).toBe("11 days");
    expect(longSpan(150)).toBe("5 months");
    expect(longSpan(365)).toBe("a year");
    expect(longSpan(550)).toBe("1½ years");
    expect(longSpan(730)).toBe("2 years");
    expect(longSpan(900)).toBe("2½ years");
  });
  it("weeks are spelled to twelve", () => {
    expect(weeksWords(8)).toBe("eight weeks");
    expect(weeksWords(1)).toBe("one week");
    expect(weeksWords(16)).toBe("16 weeks");
  });
});

describe("ruling 3 — the quiet links, each in its one state", () => {
  const year = { stageStartMs: new Date("2024-03-14T12:00:00Z").getTime(), expectedMs: new Date("2024-03-14T12:00:00Z").getTime() + 56 * DAY };
  const states: Record<string, Partial<StandFacts>> = {
    waiting: {},
    past: { stageStartMs: NOW - 70 * DAY, expectedMs: NOW - 14 * DAY },
    noReplyDate: { expectedMs: null, windowWeeks: null },
    noSentDate: { stageStartMs: null, expectedMs: null, hasSentDate: false },
    overYear: year,
    overYearReminder: { ...year, reminderOpen: true },
    overYearKept: { ...year, keepTracking: true },
    request: { status: S.FULL_REQUESTED, court: "you", expectedMs: null },
    offer: { status: S.OFFER, court: "offer" },
    closed: { status: S.REJECTED, court: "closed", closedHow: "passed" },
  };
  const want: Record<string, string[]> = {
    waiting: [], past: [], noReplyDate: ["setDate"], noSentDate: ["addSentDate"], overYear: ["remindLater", "keepTracking"],
    overYearReminder: ["keepTracking"], overYearKept: [], request: [], offer: [], closed: [],
  };
  it("every state offers exactly its own links", () => {
    const got = Object.fromEntries(Object.entries(states).map(([k, f]) => [k, standCard({ ...base, ...f }, NOW).links]));
    expect(got).toEqual(want);
  });
  it("Keep tracking takes the closing sentence with it, and keeps what the record says", () => {
    const kept = text({ ...year, keepTracking: true });
    expect(kept.p).toBe("Greenfield Literary said they’d reply within eight weeks. That window closed 2½ years ago.");
    expect(text({ ...year, expectedMs: null, windowWeeks: null, keepTracking: true }).p).toBe("You chose to keep tracking this query.");
  });
  it("a reply date the writer set does not hide the missing sent date", () => {
    expect(standCard({ ...base, stageStartMs: null, hasSentDate: false }, NOW).links).toEqual(["addSentDate"]);
  });
});
