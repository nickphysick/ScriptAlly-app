/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ EVERY CASE HERE IS ONE OF v5's NINE RULES, and each is built from inputs the app can actually
 * produce — a `Query` with a real status, a `RecordItem` as `recordDays` emits one, a status index
 * as `statusIndex` builds one. A test that hands a function an argument its callers cannot is
 * testing a function nobody runs, which this repo has already paid for once.
 */
import { describe, it, expect } from "vitest";
import { Agent, Query, QueryStatus, TaskFlag, Activity, ActivityType } from "../types";
import { RecordItem, shortCalDate } from "./todoCalendar";
import {
  GAP, MIN_SEG, EVENT_AT, FRESH_MAX_DAYS, SETTLED_MAX_DAYS,
  holderOf, familyOf, namedEndFor,
  cutPieces, laneBars, sideOf, weightFor, durationCount, labelFor, statusIndex,
  type BarWindow, type LaneInput,
  type Segment,
} from "./journeyBars";
import { windowDays } from "./todoTimeline";

const TODAY = "2026-08-26";
const WIN: BarWindow = { days: windowDays(TODAY, 7), today: TODAY, past: false };
const PAST: BarWindow = { days: windowDays("2026-08-05", 7), today: TODAY, past: true };

const q = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "",
  status: QueryStatus.QUERIED, dateSent: "2026-07-01T09:00:00Z",
  personalisationNotes: "", sendMethod: "Email", ...over,
} as Query);
const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: "a1", name: "P. Kaur", agency: "Kaur & Finch", ...over } as unknown as Agent);
const rec = (over: Partial<RecordItem>): RecordItem => ({
  key: "rec-1", ymd: TODAY, label: "Query sent", dir: "out", queryId: "q1", activityId: "act1",
  agent: "P. Kaur", agency: "Kaur & Finch", manuscriptId: "m1", note: "", detail: "",
  exchange: 1, turned: false, ...over,
});
const lane = (over: Partial<LaneInput> = {}): LaneInput => ({
  rowKey: "agent-a1::m1", lane: 0, query: q({}), agent: agent(), records: [],
  statusOf: () => null, ...over,
});

const day = (n: number) => WIN.days[n];

/**
 * A window that OPENS BEHIND TODAY, which is what every real range does now (the three stops open
 * 8, 22 and 45 days back).
 *
 * ⚠️ IT EXISTS BECAUSE `WIN` STARTS ON TODAY, SO EVERY `day(n)` ABOVE ZERO IS IN THE FUTURE — and
 * a RECORD dated in the future is data this app does not produce. That was harmless while a bar
 * ran to the window's edge regardless; now that a bar ends on today or on its named date, a
 * fixture built from future-dated records tests a shape the board can never be in. The house law
 * is that a test must hand a function an input its callers can actually produce, so the cases
 * about the side walk and about piece labelling take a window where their events are in the past.
 */
const BACK: BarWindow = { days: windowDays("2026-08-20", 12), today: TODAY, past: false };
const back = (n: number) => BACK.days[n];

/* ══ the cut ══════════════════════════════════════════════════════════════════════════════════ */

describe("cutPieces — the bar stops short of every interruption and resumes past it", () => {
  it("runs whole when nothing interrupts it", () => {
    expect(cutPieces(7, [])).toEqual([{ from: 0, to: 7 }]);
  });

  it("leaves GAP either side of a break, symmetrically", () => {
    const p = cutPieces(7, [3.5]);
    expect(p).toHaveLength(2);
    expect(p[0].to).toBeCloseTo(3.5 - GAP, 6);
    expect(p[1].from).toBeCloseTo(3.5 + GAP, 6);
  });

  it("⚠️ DRAWS NOTHING BETWEEN EVENTS ON ADJACENT DAYS — nothing happened between them", () => {
    /* two events a day apart leave 1 − 2×GAP = 0.32 of a day, under the floor */
    const p = cutPieces(7, [2.5, 3.5]);
    expect(p).toHaveLength(2);
    expect(p[0].to).toBeCloseTo(2.5 - GAP, 6);
    expect(p[1].from).toBeCloseTo(3.5 + GAP, 6);
    expect(1 - 2 * GAP).toBeLessThan(MIN_SEG);
  });

  it("does draw between events two days apart — there the state really persisted", () => {
    const p = cutPieces(7, [2.5, 4.5]);
    expect(p).toHaveLength(3);
    expect(p[1].to - p[1].from).toBeCloseTo(2 - 2 * GAP, 6);
  });

  it("drops a leading sliver rather than drawing a hairline at the edge", () => {
    expect(cutPieces(7, [0.2])).toHaveLength(1);
    expect(cutPieces(7, [0.2])[0].from).toBeCloseTo(0.54, 6);
  });

  it("drops a trailing sliver too", () => {
    const p = cutPieces(7, [6.9]);
    expect(p).toHaveLength(1);
    expect(p[0].to).toBeCloseTo(6.9 - GAP, 6);
  });
});

/* ══ whose move ═══════════════════════════════════════════════════════════════════════════════ */

describe("⚠️ the side comes from the CTA engine, and nothing here re-lists a status", () => {
  it("reads the same split the row dot and the filters read", () => {
    expect(sideOf(QueryStatus.QUERIED)).toBe("theirs");
    expect(sideOf(QueryStatus.PARTIAL_SENT)).toBe("theirs");
    expect(sideOf(QueryStatus.FULL_SENT)).toBe("theirs");
    expect(sideOf(QueryStatus.PARTIAL_REQUESTED)).toBe("yours");
    expect(sideOf(QueryStatus.FULL_REQUESTED)).toBe("yours");
    expect(sideOf(QueryStatus.REVISE_RESUBMIT)).toBe("yours");
  });

  it("⚠️ AN EVENT THAT CHANGED NO STATUS CHANGES NO HANDS — the nudge case", () => {
    /* v5: after a nudge both stretches are theirs. The naive rule — "before an event, the side is
       the opposite of who authored it" — gets this wrong, which is why the no-status clause runs
       first. A nudge writes no `resultingStatus` by construction. */
    const bars = laneBars(lane({
      /* ⚠️ 12 WEEKS, NOT 8, AND THE FIRST VERSION OF THIS FIXTURE TAUGHT ME WHY. At 8 the window
         resolved to today and the nudge sat on tomorrow — two interruptions a day apart, which the
         adjacent-days rule correctly collapses to nothing between them. The test then measured the
         adjacent-days rule while claiming to measure the nudge. A fixture has to exercise the one
         thing it names. */
      query: q({ status: QueryStatus.QUERIED, nudgeDate: "2026-09-09T09:00:00Z" }),
      agent: agent({ responseTimeWeeks: 12 } as Partial<Agent>),
      records: [rec({ key: "r1", ymd: day(1), label: "Nudge sent", dir: "out", activityId: "n1" })],
      statusOf: () => null,
    }), WIN);
    expect(bars.nodes).toHaveLength(1);
    expect(bars.nodes[0].dir).toBe("out");
    expect(bars.segments.map((s) => s.side)).toEqual(["theirs", "theirs"]);
  });

  it("⚠️ A HAND-CHANGING EVENT SPLITS THE BAR IN TWO SIDES", () => {
    /* a full request arrives mid-week: theirs before it, yours after */
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.FULL_REQUESTED }),
      records: [rec({ key: "r1", ymd: back(2), label: "Full requested", dir: "in", activityId: "f1" })],
      statusOf: (id) => (id === "f1" ? QueryStatus.FULL_REQUESTED : null),
      moveLabel: "Send full",
    }), BACK);
    expect(bars.segments.map((s) => s.side)).toEqual(["theirs", "yours"]);
    /* ⚠️ THE CARD'S OWN WORDS, BARE (grouped pack, Phase 5). It was `Your move · send full`;
       "Your move" is how this codebase talks to itself and never how a writer talks about their
       own submission. The label the card supplies is the whole label now. */
    /* ⚠️ THE REF'S OWN WORDING (settled pack, Phase 5). It was the card's bare words, "Send
       full"; the bar states what the STRETCH IS — a full was requested — and the note beside it
       states what to do about it. Both forms are asserted, because a short form nobody checks is
       a second string free to drift. */
    /* ⚠️ THE WEIGHT CHANGED WHEN THE FIXTURE BECAME POSSIBLE, and the new answer is the right
       one. With the request two days in the FUTURE the side walk could not use it — an event
       after today cannot be when something started — so the duration fell back to the send date
       and read 56 days: long-standing, from a full that had not been requested yet. Dated two
       days in the PAST it is four days old, which is what a fresh your-move stretch is. The old
       `y3` was an artefact of the impossible fixture, not a property of the derivation. */
    expect(bars.segments[1].state).toBe("y1");
    /* y1's form is the fact alone — a four-day-old request does not need its age stating; that
       is what separates the three weights from one another. */
    expect(bars.segments[1].label).toBe("Full requested");
  });

  it("and the other way round — you send, and it becomes theirs", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.FULL_SENT, fullSentDate: `${day(2)}T09:00:00Z` }),
      agent: agent({ responseTimeWeeks: 8 } as Partial<Agent>),
      records: [rec({ key: "r1", ymd: day(2), label: "Full sent", dir: "out", activityId: "s1" })],
      statusOf: (id) => (id === "s1" ? QueryStatus.FULL_SENT : null),
    }), WIN);
    expect(bars.segments.map((s) => s.side)).toEqual(["yours", "theirs"]);
  });
});

/* ══ v5's nine rules ══════════════════════════════════════════════════════════════════════════ */

describe("⚠️ v5 · after a nudge the bar runs to the NEXT THING DUE", () => {
  it("names the reminder the writer set rather than saying 'still waiting'", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED, nudgeDate: "2026-09-09T09:00:00Z" }),
      agent: agent({ responseTimeWeeks: 12 } as Partial<Agent>),
      records: [rec({ key: "r1", ymd: day(1), label: "Nudge sent", dir: "out", activityId: "n1" })],
    }), WIN);
    /* the date comes from `shortCalDate`, the shared helper — which renders September as
       "Sept" in this locale. The literal is the helper's output, not a second formatting. */
    /* ⚠️ THE DATE MOVED TO THE BAR'S RIGHT END, so this asserts BOTH halves. Checking only the
       text would pass on a bar that lost its date entirely, which is the fault a split invites. */
    /* ⚠️ NO `lastNudgeSentDate` ON THIS FIXTURE, so the label cannot say when the nudge was sent
       and does not pretend to — "Next reminder {date}" rather than "Nudged … · next reminder …".
       The absent half is the interesting one: a form that names a date it does not have is the
       fault this whole module's copy rules exist to prevent. */
    const nudged = bars.segments[bars.segments.length - 1];
    expect(nudged.label).toBe("Next reminder " + shortCalDate("2026-09-09"));
    expect(nudged.short).toBe("Remind " + shortCalDate("2026-09-09"));
  });
});





describe("⚠️ v5 · a snooze pauses your attention, not the agent's clock", () => {
  const flag = { id: "f1", userId: "u", taskType: "nudge_overdue", queryId: "q1",
    snoozeCount: 1, snoozedUntil: `${day(3)}T09:00:00Z` } as TaskFlag;
  const bars = laneBars(lane({
    query: q({ status: QueryStatus.FULL_REQUESTED }), flag, moveLabel: "Send full",
  }), WIN);

  it("⚠️ CHANGES NOTHING ABOUT THE BAR — the snooze notch is retired with every other one", () => {
    /* A snooze pauses YOUR attention, not the agent's clock. It used to add a waypoint; nothing
       is drawn at a forecast date now, and the snoozed GROUP is where a reader learns this row is
       quiet. The bar is untouched either way, which was always the point. */
    expect(bars.segments.length).toBeGreaterThan(0);
  });

  it("the bar keeps running — both stretches are still the writer's move", () => {
    expect(bars.segments.every((s) => s.side === "yours")).toBe(true);
  });
});

describe("⚠️ v5 · an empty week says one line", () => {
  it("a lane with no query state to draw emits nothing to draw", () => {
    const bars = laneBars(lane({ query: q({ status: QueryStatus.REJECTED }) }), WIN);
    /* a closed query with no closure event in view has no live stretch and no forecast */
    expect(bars.segments.every((s) => s.label === "Closed")).toBe(true);
  });
});

/* ══ the duration weights (v7) ════════════════════════════════════════════════════════════════ */


/* ══ the status join ══════════════════════════════════════════════════════════════════════════ */

describe("statusIndex — the join the side derivation needs", () => {
  const act = (over: Partial<Activity>): Activity => ({
    id: "a1", userId: "u", queryId: "q1", manuscriptId: "m1",
    activityType: ActivityType.STATUS_CHANGED, description: "", date: `${TODAY}T09:00:00Z`,
    details: "", ...over,
  } as Activity);

  it("maps only the activities that wrote a status", () => {
    const m = statusIndex([
      act({ id: "s1", resultingStatus: QueryStatus.FULL_REQUESTED }),
      act({ id: "n1", activityType: ActivityType.NUDGE_SENT }),
    ]);
    expect(m.get("s1")).toBe(QueryStatus.FULL_REQUESTED);
    expect(m.get("n1")).toBeUndefined();
  });

  it("⚠️ AND THAT ABSENCE IS THE NUDGE RULE'S OWN MECHANISM — not an oversight to paper over", () => {
    /* `logNudge` writes a NON-status activity deliberately, so `recomputeQuery` ignores it. The
       bar's no-hands-changed clause reads exactly that absence. */
    expect(statusIndex([act({ id: "n1", activityType: ActivityType.NUDGE_SENT })]).size).toBe(0);
  });
});

/* ══ the two faults the pictures found ═══════════════════════════════════════════════════════ */

describe("⚠️ the side walk runs FORWARDS — a send hands the move over, and the bar must say so", () => {
  it("after you send, the next stretch is theirs — not still yours", () => {
    /* ⚠️ THIS IS THE BUG A SCREENSHOT FOUND AND EVERY NUMBER PASSED. Walking backwards from the
       current side made each earlier stretch equal to the one after it, so a row with two sends in
       a week drew "Your move" three times running. After you send a partial it is plainly THEIR
       move, and the bar said it was still yours. */
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.PARTIAL_REQUESTED }),
      records: [
        rec({ key: "r1", ymd: back(1), label: "Partial sent", dir: "out", activityId: "s1" }),
        rec({ key: "r2", ymd: back(4), label: "Partial sent", dir: "out", activityId: "s2" }),
      ],
      statusOf: () => QueryStatus.PARTIAL_SENT,
      moveLabel: "Send partial",
    }), BACK);
    expect(bars.segments.map((s) => s.side)).toEqual(["yours", "theirs", "yours"]);
  });

  it("a nudge between two stretches leaves both on the same side", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED, nudgeDate: "2026-09-09T09:00:00Z" }),
      agent: agent({ responseTimeWeeks: 12 } as Partial<Agent>),
      records: [rec({ key: "r1", ymd: day(2), label: "Nudge sent", dir: "out", activityId: "n1" })],
      statusOf: () => null,
    }), WIN);
    expect(bars.segments.map((s) => s.side)).toEqual(["theirs", "theirs"]);
  });

  it("⚠️ AND THE LAST STRETCH TAKES THE QUERY'S OWN STATUS, whatever the visible record says", () => {
    /* the record in view says the partial went out; the query says a full has since been
       requested. Something happened the window cannot see, and the status is the ground truth. */
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.FULL_REQUESTED }),
      records: [rec({ key: "r1", ymd: day(1), label: "Partial sent", dir: "out", activityId: "s1" })],
      statusOf: () => QueryStatus.PARTIAL_SENT,
      moveLabel: "Send full",
    }), WIN);
    expect(bars.segments[bars.segments.length - 1].side).toBe("yours");
  });
});

describe("⚠️ a bar says what it is ONCE, where there is room to read it", () => {
  const twice = () => laneBars(lane({
    /* ⚠️ A REAL SEND DATE, because the duration is counted from when it became the writer's move
       and the first version of this fixture put its events two days in the FUTURE — where nothing
       has elapsed, so the count was correctly omitted and the case was measuring that instead.
       ⚠️ AND THE EVENTS THEMSELVES ARE IN THE PAST NOW, on `BACK`, for the second half of the
       same lesson: a bar ends on today or on its named date, so a run of future-dated records has
       nothing to be broken into pieces AT. The fixture was measuring a shape the board cannot be
       in — twice, by two different routes, which is why the window exists rather than a nudge to
       the dates. */
    query: q({ status: QueryStatus.FULL_REQUESTED, dateSent: "2026-07-01T09:00:00Z" }),
    records: [
      rec({ key: "r1", ymd: back(2), label: "Full requested", dir: "in", activityId: "f1" }),
      rec({ key: "r2", ymd: back(4), label: "Holding reply", dir: "in", activityId: "h1" }),
    ],
    statusOf: (id) => (id === "f1" ? QueryStatus.FULL_REQUESTED : null),
    moveLabel: "Send full",
  }), BACK);

  it("labels one piece of each contiguous same-side run and leaves the rest silent", () => {
    const bars = twice();
    const yours = bars.segments.filter((s) => s.side === "yours");
    expect(yours.length, "the run was not broken into pieces").toBeGreaterThan(1);
    expect(yours.filter((s) => s.label).length, "the run states itself more than once").toBe(1);
    expect(yours.filter((s) => s.count).length, "the count is restated").toBe(1);
  });

  it("⚠️ AND IT IS THE WIDEST PIECE, because the opening one is often a sliver", () => {
    const bars = twice();
    const yours = bars.segments.filter((s) => s.side === "yours");
    const speaking = yours.find((s) => !!s.label)!;
    const widest = yours.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
    expect(speaking.key).toBe(widest.key);
  });

  it("a run of one piece still speaks", () => {
    const bars = laneBars(lane({ query: q({ status: QueryStatus.QUERIED }) }), WIN);
    expect(bars.segments.every((s) => !!s.label)).toBe(true);
  });
});

describe("⚠️ two events on one day are not drawn in one place", () => {
  it("spreads them inside their own day, in the order the record gives them", () => {
    /* ⚠️ MEASURED ON THE DEPLOYED SITE BEFORE THIS EXISTED: a row with two sends on one day drew
       two 36px nodes at identical coordinates, so the writer saw one event where the record holds
       two. A day is all the record knows, so the middle of the column was a convention rather than
       a claim, and sharing the column between the events that happened in it states nothing new. */
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED }),
      records: [
        rec({ key: "r1", ymd: day(3), label: "Query sent", dir: "out", activityId: "s1" }),
        rec({ key: "r2", ymd: day(3), label: "Nudge sent", dir: "out", activityId: "s2" }),
      ],
    }), WIN);
    const ats = bars.nodes.map((n) => n.at);
    expect(new Set(ats).size, "two events share a coordinate").toBe(2);
    /* both stay inside the day they happened in */
    for (const a of ats) { expect(a).toBeGreaterThan(3); expect(a).toBeLessThan(4); }
    /* and in the record's own order */
    expect(ats[0]).toBeLessThan(ats[1]);
    expect(bars.nodes.map((n) => n.caption)).toEqual(["Query sent", "Nudge sent"]);
  });

  it("a lone event still sits at the middle of its day", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED }),
      records: [rec({ key: "r1", ymd: day(3), label: "Query sent", dir: "out", activityId: "s1" })],
    }), WIN);
    expect(bars.nodes[0].at).toBe(3 + EVENT_AT);
  });

  it("three on one day still fit inside it", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED }),
      records: ["a", "b", "c"].map((id) =>
        rec({ key: `r${id}`, ymd: day(2), label: "Nudge sent", dir: "out", activityId: id })),
    }), WIN);
    const ats = bars.nodes.map((n) => n.at);
    expect(new Set(ats).size).toBe(3);
    for (const a of ats) { expect(a).toBeGreaterThan(2); expect(a).toBeLessThan(3); }
  });
});

describe("⚠️ how long it has been your move is stamped, not inferred from the send", () => {
  it("reads `lastStatusChange` — when the CURRENT status began", () => {
    /* ⚠️ THE SEND DATE WAS THE WRONG SUBSTITUTE and the census proved it: 35 stretches sat in the
       heaviest weight while not one of them had an expectation that had passed. A send dates the
       whole relationship; the hand-change dates the stretch, and it is usually outside the week.
       `lastStatusChange` is the same audit stamp `cardActionYmd` reads to place an agent task on
       the day it landed — one derivation, two readers. */
    const bars = laneBars(lane({
      query: q({
        status: QueryStatus.FULL_REQUESTED,
        dateSent: "2026-05-01T09:00:00Z",          // months ago
        lastStatusChange: "2026-08-24T09:00:00Z",  // two days ago
      } as Partial<Query>),
      moveLabel: "Send full",
    }), WIN);
    const yours = bars.segments.filter((s) => s.side === "yours");
    expect(yours[0].weight, "the send date decided the weight").toBe("fresh");
    expect(yours[0].count).toBe("2 days");
  });

  it("falls back to the send only when nothing has stamped the change", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.FULL_REQUESTED, dateSent: "2026-05-01T09:00:00Z" }),
      moveLabel: "Send full",
    }), WIN);
    expect(bars.segments.filter((s) => s.side === "yours")[0].weight).toBe("long");
  });
});


/* ══ THE MARKER GRAMMAR (markers pack, Phase 3; v11 is normative) ═══════════════════════════ */

describe("⚠️ marker 1 — the StatusDot, wherever the status changed", () => {
  const at = (label: string, dir: "out" | "in", status: QueryStatus) => laneBars(lane({
    query: q({ status }),
    records: [rec({ key: "r1", ymd: day(2), label, dir, activityId: "s1" })],
    statusOf: () => status,
  }), WIN).nodes[0];

  it("takes it for every one of v11's six status transitions", () => {
    const six: [string, "out" | "in", QueryStatus][] = [
      ["Query sent", "out", QueryStatus.QUERIED],
      ["Full requested", "in", QueryStatus.FULL_REQUESTED],
      ["Full sent", "out", QueryStatus.FULL_SENT],
      ["Revise & resubmit", "in", QueryStatus.REVISE_RESUBMIT],
      ["Offer received", "in", QueryStatus.OFFER],
      ["Closed", "in", QueryStatus.REJECTED],
    ];
    for (const [label, dir, status] of six) {
      const n = at(label, dir, status);
      expect(n.marker, `${label} did not take the StatusDot`).toBe("status");
      /* ⚠️ AND IT CARRIES THE STATUS ITSELF, because that is the component's input. A marker that
         knew only "a status changed" would have to be told WHICH by something else, and the
         something else would be a second reading of the same activity. */
      expect(n.status, `${label} carries no status for the dot to draw`).toBe(status);
    }
  });

  it("⚠️ AND NOTHING HERE INVENTS A SYMBOL — the locked component brings its own", () => {
    /* the glyph field is the DIRECTION marker's; a status marker never reads it, which is why
       there is no per-status symbol table in this module to drift from `StatusDot`'s */
    const n = at("Offer received", "in", QueryStatus.OFFER);
    expect(n.marker).toBe("status");
    expect(Object.keys(n)).not.toContain("symbol");
  });
});

describe("⚠️ marker 2 — the direction dot, where an activity held the status", () => {
  const held = (label: string, dir: "out" | "in") => laneBars(lane({
    query: q({ status: QueryStatus.QUERIED }),
    agent: agent({ responseTimeWeeks: 12 } as Partial<Agent>),
    records: [rec({ key: "r1", ymd: day(2), label, dir, activityId: "n1" })],
    statusOf: () => null,
  }), WIN).nodes[0];

  it("takes it for v11's three: a nudge, a holding reply, and a note you logged", () => {
    for (const [label, dir] of [["Nudge sent", "out"], ["Holding reply", "in"], ["Note", "out"]] as const) {
      const n = held(label, dir);
      expect(n.marker, `${label} took the wrong marker`).toBe("direction");
      expect(n.status, `${label} carries a status it did not write`).toBeUndefined();
    }
  });

  it("⚠️ THE ABSENCE OF A `resultingStatus` IS THE WHOLE TEST, and it is not a special case", () => {
    /* `logNudge` writes a NON-status activity deliberately so `recomputeQuery` ignores it. The
       marker reads exactly that absence — the same absence the side walk reads to decide that no
       hands changed. One fact, two consumers, no second table. */
    expect(held("Nudge sent", "out").marker).toBe("direction");
    const changed = laneBars(lane({
      query: q({ status: QueryStatus.FULL_REQUESTED }),
      records: [rec({ key: "r1", ymd: day(2), label: "Full requested", dir: "in", activityId: "f1" })],
      statusOf: () => QueryStatus.FULL_REQUESTED,
    }), WIN).nodes[0];
    expect(changed.marker).toBe("status");
  });

  it("carries v11's own symbols, and only this marker reads them", () => {
    expect(held("Nudge sent", "out").glyph).toBe("↑");
    expect(held("Holding reply", "in").glyph).toBe("←");
  });
});


/* ══ THE FILL (Porcelain, Phase 3) ═══════════════════════════════════════════════════════════ */


/* ══ ONE HOLDER, ONE FAMILY, ONE DIRECTION (fix pack, Phase 1) ═══════════════════════════════ */


describe("the direction glyph reads the holder transition, not the record's authorship", () => {
  it("agent → writer paints the arrival face; writer → agent paints the departure", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.FULL_REQUESTED }),
      records: [
        /* a full REQUEST authored by the agent — work arrives with the writer */
        rec({ key: "r1", ymd: back(2), label: "Full requested", dir: "in", activityId: "f1" }),
        /* the writer sends it — work departs */
        rec({ key: "r2", ymd: back(5), label: "Full sent", dir: "out", activityId: "s1" }),
      ],
      statusOf: (id) => (id === "f1" ? QueryStatus.FULL_REQUESTED : QueryStatus.FULL_SENT),
      moveLabel: "Send full",
    }), BACK);
    const faces = bars.nodes.filter((n) => n.activityId).map((n) => n.mark);
    expect(faces.length, "no joins to read").toBeGreaterThan(1);
    expect(faces[0], "a request should arrive").toBe("in");
    expect(faces[1], "a send should depart").toBe("outk");
  });

  it("⚠️ AND A JOIN THAT CHANGES NO HANDS FALLS BACK TO AUTHORSHIP, which is all there is", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED, dateSent: "2026-07-01T09:00:00Z" }),
      agent: agent({ responseTimeWeeks: 8 } as Partial<Agent>),
      /* a holding reply: the agent wrote it and nothing moved */
      records: [rec({ key: "r1", ymd: back(3), label: "Holding reply", dir: "in", activityId: "h1" })],
      statusOf: () => null,
    }), BACK);
    expect(bars.nodes.filter((n) => n.activityId).map((n) => n.mark)).toEqual(["in"]);
  });
});

/* ══ ONE FACT: `namedEndFor` (fix pack, Phase 3) ═════════════════════════════════════════════ */

describe("namedEndFor — one date, and the three derivations it replaces", () => {
  it("⚠️ MEASURES FROM THE LATEST SEND, which is the half that was WRONG rather than merely split", () => {
    /* a query in January, a full in August. The reply you are waiting for is to the FULL — a
       window measured from the original query would still be running long after the agency
       answered it and asked for something else, and printing the difference as a day-count is
       where the impossible numbers came from. */
    const query = q({
      status: QueryStatus.QUERIED,
      dateSent: "2026-01-05T09:00:00Z",
      fullSentDate: "2026-08-20T09:00:00Z",
    } as Partial<Query>);
    const got = namedEndFor(query, agent({ responseTimeWeeks: 4 } as Partial<Agent>), { today: TODAY });
    /* 20 Aug + 4 weeks = 17 Sept; from January it would have been early February */
    expect(got.window!.startsWith("2026-09")).toBe(true);
    expect(got.end!.ymd).toBe(got.window);
  });

  it("returns the NEXT named date still ahead — the ref's own nudged row draws it that way", () => {
    const query = q({
      status: QueryStatus.QUERIED,
      dateSent: `${TODAY}T09:00:00Z`,
      nudgeDate: "2026-09-09T09:00:00Z",
    });
    const got = namedEndFor(query, agent({ responseTimeWeeks: 12 } as Partial<Agent>), { today: TODAY });
    /* the window is twelve weeks out; the reminder is a fortnight out and is what happens next */
    expect(got.end!.source).toBe("reminder");
    expect(got.end!.ymd).toBe("2026-09-09");
    /* ⚠️ AND THE AGENCY'S OWN DATE SURVIVES THE CONTEST IT LOST. `window` is what decides whether
       a reply time was ever GIVEN — a reminder the writer set does not answer that either way. */
    expect(got.window, "the window was lost with the contest").not.toBeNull();
    expect(got.window).not.toBe(got.end!.ymd);
  });

  it("where every candidate has passed, the MOST RECENT commitment wins", () => {
    const query = q({
      status: QueryStatus.QUERIED,
      dateSent: "2026-01-01T09:00:00Z",
      nudgeDate: "2026-08-01T09:00:00Z",
    });
    const got = namedEndFor(query, agent({ responseTimeWeeks: 4 } as Partial<Agent>), { today: TODAY });
    /* Jan + 4 weeks is long past; the August reminder is the last thing anybody committed to, and
       measuring an overrun from the older date is how a day-count nobody can reconcile is printed */
    expect(got.end!.ymd).toBe("2026-08-01");
  });

  it("a terminal query names nothing, and neither half pretends otherwise", () => {
    const got = namedEndFor(q({ status: QueryStatus.REJECTED }), agent({ responseTimeWeeks: 4 } as Partial<Agent>), { today: TODAY });
    expect(got.end).toBeNull();
    expect(got.window).toBeNull();
  });

  it("⚠️ THE BAR'S LABEL NAMES THE BAR'S OWN END — never a date it is not running to", () => {
    const bars = laneBars(lane({
      query: q({ status: QueryStatus.QUERIED, dateSent: `${TODAY}T09:00:00Z`, nudgeDate: "2026-09-09T09:00:00Z" }),
      agent: agent({ responseTimeWeeks: 12 } as Partial<Agent>),
      records: [rec({ key: "r1", ymd: back(1), label: "Nudge sent", dir: "out", activityId: "n1" })],
    }), BACK);
    const spoken = bars.segments.filter((sg) => sg.label);
    expect(spoken.length, "no bar spoke").toBeGreaterThan(0);
    /* the label and the goal are the same date, on every piece that speaks */
    for (const sg of spoken) {
      if (sg.goal == null) continue;
      const goalYmd = BACK.days[Math.floor(sg.goal)];
      const other = BACK.days.filter((d) => d !== goalYmd);
      /* it must not name a DIFFERENT date from the one it runs to */
      for (const d of other) {
        const pretty = shortCalDate(d);
        if (sg.label.includes(pretty) && pretty !== shortCalDate(goalYmd)) {
          throw new Error(`label "${sg.label}" names ${pretty} but the bar runs to ${shortCalDate(goalYmd)}`);
        }
      }
    }
  });
});

/* ══ THE HONEST FILL (v36, Phase 2) ══════════════════════════════════════════════════════════ */

