/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `dashFeed` — the dashboard's activity feed (v16, 18 Sep).
 *
 * ⚠️ THE SENTENCE BUILDER AND THE ELAPSED CLAUSE ARE COVERED BY `feedSentence.test.ts` and
 * `feedConversation.test.ts`, WHICH MOVED WITH THEM. What is new in v16 — and therefore what is here
 * — is the window, the day rules, the "new since you last looked" mark, and the two refusals the feed
 * makes rather than rendering a hole: an unresolvable subject, and an unmapped event type.
 */
import { describe, it, expect } from "vitest";
import { ActivityType, QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../types";
import {
  FEED_DAYS, dayLabelFor, describeEvent, feedDays, feedEntries, newCount, provenanceOf, queriedTimes, sayText,
  trustedElapsed,
} from "./dashFeed";

const DAY = 86400000;
const NOW = new Date(2026, 8, 17, 13, 5, 0);
const at = (days: number, h = 12) =>
  new Date(NOW.getFullYear(), NOW.getMonth(), NOW.getDate() - days, h, 0, 0).toISOString();

let seq = 0;
const act = (over: Partial<Activity>): Activity =>
  ({ id: `a${++seq}`, userId: "u", queryId: "q1", manuscriptId: "m1", date: at(1),
     activityType: ActivityType.STATUS_CHANGED, description: "", ...over } as unknown as Activity);
const AGENT: Agent = { id: "ag1", userId: "u", name: "Jonathan Marsh", agency: "Marsh Literary" } as unknown as Agent;
const QUERY: Query = { id: "q1", userId: "u", agentId: "ag1", manuscriptId: "m1",
                       status: QueryStatus.QUERIED, dateSent: at(40) } as unknown as Query;
const MS: Manuscript = { id: "m1", userId: "u", title: "Tidewrack" } as unknown as Manuscript;

const feed = (activities: Activity[], seenAt: number | null = null) =>
  feedEntries({ activities, queries: [QUERY], agents: [AGENT], manuscripts: [MS], now: NOW, seenAt });

describe("the window", () => {
  it("reads the last 30 days, newest first, and nothing outside it", () => {
    const entries = feed([
      act({ id: "old", date: at(FEED_DAYS + 2), resultingStatus: QueryStatus.QUERIED }),
      act({ id: "mid", date: at(4), resultingStatus: QueryStatus.PARTIAL_REQUESTED }),
      act({ id: "new", date: at(0), resultingStatus: QueryStatus.FULL_REQUESTED }),
    ]);
    expect(entries.map((e) => e.id)).toEqual(["new", "mid"]);
    expect(FEED_DAYS).toBe(30);
  });

  /* ⚠️ A FUTURE-DATED EVENT IS OUT, TOO. A clock askew on the writing machine would otherwise put a
     row above today's, dated tomorrow, at the top of a feed whose whole claim is chronological. */
  it("drops an event dated after now", () => {
    expect(feed([act({ id: "ahead", date: at(-2), resultingStatus: QueryStatus.QUERIED })])).toHaveLength(0);
  });
});

describe("the day rules", () => {
  it("today, yesterday, and a dated rule beyond that", () => {
    expect(dayLabelFor(NOW.getTime(), NOW)).toBe("Today");
    expect(dayLabelFor(NOW.getTime() - DAY, NOW)).toBe("Yesterday");
    expect(dayLabelFor(new Date(2026, 7, 19, 9, 0, 0).getTime(), NOW)).toBe("Wed 19 Aug");
  });

  /* ⚠️ THE LABEL IS A CALENDAR DAY, NOT 24 HOURS. An event at 11pm last night and one at 1am today
     are 2 hours apart and belong under different rules; a difference in milliseconds would file both
     under "Today" for most of the morning. */
  it("⚠️ counts calendar days, so late last night is Yesterday at 1am", () => {
    const lateLastNight = new Date(2026, 8, 16, 23, 30, 0).getTime();
    const earlyToday = new Date(2026, 8, 17, 1, 0, 0);
    expect(dayLabelFor(lateLastNight, earlyToday)).toBe("Yesterday");
  });

  it("groups entries under one rule each, in the order they arrive", () => {
    const days = feedDays(feed([
      act({ id: "t1", date: at(0, 13), resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "t2", date: at(0, 9), resultingStatus: QueryStatus.PARTIAL_REQUESTED }),
      act({ id: "y1", date: at(1), resultingStatus: QueryStatus.QUERIED }),
    ]));
    expect(days.map((d) => [d.label, d.entries.map((e) => e.id)]))
      .toEqual([["Today", ["t1", "t2"]], ["Yesterday", ["y1"]]]);
  });
});

describe("what the feed refuses to render", () => {
  /* ⚠️ NEVER AN EM DASH WHERE A NAME BELONGS. `Activity` carries no `agentId`, so a row whose subject
     cannot be resolved has a hole in its own sentence — it drops rather than printing one. */
  it("drops a row whose subject cannot be resolved", () => {
    const orphan = act({ id: "orphan", queryId: "gone", resultingStatus: QueryStatus.QUERIED });
    expect(feed([orphan])).toHaveLength(0);
  });

  /* ⚠️ AN UNMAPPED TYPE DROPS TOO. A pill reading "Status changed" over a sentence that already says
     what happened is furniture, and an unlabelled event is a bug worth seeing rather than papering. */
  it("drops an event whose type and status name no pill", () => {
    expect(feed([act({ id: "mystery", activityType: "SomethingNew" as ActivityType })])).toHaveLength(0);
  });
});

describe("the new mark", () => {
  const events = [
    act({ id: "after", date: at(0), resultingStatus: QueryStatus.FULL_REQUESTED }),
    act({ id: "before", date: at(5), resultingStatus: QueryStatus.PARTIAL_REQUESTED }),
  ];

  it("marks what was logged since the last visit, and counts them", () => {
    const entries = feed(events, NOW.getTime() - 2 * DAY);
    expect(entries.map((e) => [e.id, e.isNew])).toEqual([["after", true], ["before", false]]);
    expect(newCount(entries)).toBe(1);
  });

  /**
   * ⚠️ A DEVICE THAT HAS NEVER SHOWN THE PAGE MARKS NOTHING. With `seenAt` null everything is newer
   * than never, which would put a rust rule beside all thirty days of it — a mark on everything says
   * nothing at all, which is the failure mode of every "unread" treatment.
   */
  it("⚠️ marks nothing at all on a device that has never shown the page", () => {
    const entries = feed(events, null);
    expect(entries.every((e) => !e.isNew)).toBe(true);
    expect(newCount(entries)).toBe(0);
  });
});

describe("the sentence's parts", () => {
  it("names the agent as its own run and the manuscript as its own", () => {
    const [e] = feed([act({ id: "s", date: at(2), resultingStatus: QueryStatus.FULL_REQUESTED })]);
    expect(e.say.find((s) => s.who)?.t).toContain("Jonathan Marsh");
    expect(e.say.find((s) => s.em)?.t).toContain("Tidewrack");
    /* ⚠️ THE RUNS ARE THE SENTENCE — a renderer cannot find a name inside a finished string without
       parsing it back out, which is why the split happens here and not in the component. */
    expect(sayText(e.say)).toContain("Jonathan Marsh");
    expect(sayText(e.say)).toContain("Tidewrack");
  });

  it("the provenance line is the agency, and never repeats the subject", () => {
    const [e] = feed([act({ id: "p", date: at(2), resultingStatus: QueryStatus.FULL_REQUESTED })]);
    expect(e.provenance).toBe("Marsh Literary");
    /* the fault it closes: `agentPrimary` falls back to the AGENCY for a nameless agent, so a line
       that always led with the agency read "Penhallow Literary" twice, two lines apart */
    expect(provenanceOf("Penhallow Literary", "Penhallow Literary", "added to your list"))
      .toBe("added to your list");
    expect(provenanceOf("Marsh", " marsh ")).toBe("");
  });
});

describe("the elapsed clause is only stated when the record supports it", () => {
  const anchor = NOW.getTime() - 30 * DAY;

  it("a normal span is the span", () => {
    expect(trustedElapsed(anchor, anchor + 5 * DAY, NOW.getTime())).toBe(5 * DAY);
  });

  /* ⚠️ BOTH REFUSALS ARE CONTRADICTIONS IN THE RECORD, NOT FACTS ABOUT THE WRITER'S QUERYING. */
  it("refuses an event that predates the query, and one older than the query itself", () => {
    expect(trustedElapsed(anchor, anchor - DAY, NOW.getTime())).toBeNull();
    expect(trustedElapsed(anchor, anchor + 90 * DAY, NOW.getTime())).toBeNull();
    expect(trustedElapsed(null, NOW.getTime(), NOW.getTime())).toBeNull();
  });

  /* ⚠️ THE EARLIEST SEND ANCHORS IT — a resubmission writes a second `Queried` event, and taking the
     later one would measure every subsequent reply against the wrong send. */
  it("queriedTimes keeps the earliest send per query", () => {
    const map = queriedTimes([
      act({ id: "first", queryId: "q1", date: at(40), resultingStatus: QueryStatus.QUERIED }),
      act({ id: "again", queryId: "q1", date: at(10), resultingStatus: QueryStatus.QUERIED }),
    ]);
    expect(map.get("q1")).toBe(new Date(at(40)).getTime());
  });
});

/**
 * ⚠️ TWO SENTENCES THE FEED COULD NOT BUILD BEFORE (to-do row round, 20 Sep).
 *
 * A nudge carries no `resultingStatus`, so `describeEvent` returned null and the row fell back to
 * the activity's STORED `description` — import-and-writer prose in a feed written in one voice.
 * And a close was phrased as a fact about the record ("No reply recorded from …") where the writer
 * had just performed the act themselves.
 */
describe("the two sentences the record can now carry", () => {
  const MIN = 60_000;

  it("a nudge is built from the event, never read off the stored description", () => {
    const say = describeEvent(null, "William Tan", "The Salt Road", 84 * 24 * 60 * MIN, ActivityType.NUDGE_SENT);
    const words = (say ?? []).map((sg) => sg.t).join("");
    expect(words).toBe("You nudged William Tan — 84 days since your query");
    /* the agent is its own run, so a renderer can find them inside the sentence */
    expect((say ?? []).some((sg) => sg.who && sg.t === "William Tan")).toBe(true);
    /* and nothing here reads the record's own prose */
    expect(words).not.toContain("Nudge sent to");
  });

  it("…and says nothing at all without an agent to name", () => {
    expect(describeEvent(null, "", "The Salt Road", MIN, ActivityType.NUDGE_SENT)).toBeNull();
  });

  /**
   * ⚠️ THE WRITER'S SENTENCE ONLY WHERE THE APP COULD NOT HAVE CLOSED IT. `db.tsx` auto-closes a
   * query armed with "Mark as no response automatically"; on such a query a `NO_RESPONSE` rung may
   * be either act and nothing on the record distinguishes them, so the old sentence stands — and it
   * is true whoever closed it. Both directions are asserted, because asserting only the first would
   * pass on a build that had lost the distinction entirely.
   */
  it("a close names what the writer did — unless the app might have done it", () => {
    const mine = describeEvent(QueryStatus.NO_RESPONSE, "Marcus Reed", "The Salt Road", 820 * 24 * 60 * MIN, "x", false);
    expect((mine ?? []).map((sg) => sg.t).join(""))
      .toBe("You closed your query to Marcus Reed for The Salt Road after 820 days without a reply");

    const armed = describeEvent(QueryStatus.NO_RESPONSE, "Marcus Reed", "The Salt Road", 820 * 24 * 60 * MIN, "x", true);
    expect((armed ?? []).map((sg) => sg.t).join("")).toContain("No reply recorded from Marcus Reed");
  });

  /* ⚠️ AND IT NEVER SAYS WHAT THE AGENT DID NOT DO — the reasoning the old sentence guarded, carried
     over rather than dropped with its wording. They may have replied somewhere this app never saw. */
  it("neither sentence makes a claim about the agent", () => {
    for (const armed of [true, false]) {
      const words = (describeEvent(QueryStatus.NO_RESPONSE, "Marcus Reed", "", MIN, "x", armed) ?? [])
        .map((sg) => sg.t).join("").toLowerCase();
      for (const forbidden of ["ignored", "never replied", "didn't reply", "did not reply", "failed to"]) {
        expect(words, forbidden).not.toContain(forbidden);
      }
    }
  });
});
