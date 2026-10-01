/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LH9 — the two lines that change: every branch of both copy functions, all four pressing-sentence
 * cases and their fallbacks, and that no sentence carries a count in figures or the word "Sept".
 *
 * ⚠️ THE INPUTS ARE PRODUCED, NEVER TYPED: rows come from `buildQcRows` over fixture queries and
 * agents, the way the pages build them, so a row shape no page can produce cannot pass here.
 */
import { describe, it, expect } from "vitest";
import { Agent, Query, QueryStatus } from "../types";
import { buildQcRows } from "./qcSummary";
import { contactHeaderCopy, dayDate, nudgesDue, numberWords, pressingSentence, qcHeaderCopy, type PressingContext } from "./livingHeaders";
import { runsText, type LivingLine } from "./livingLine";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 8, 19, 12); // Saturday 19 Sep 2026
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
const ahead = (d: number) => new Date(NOW + d * DAY).toISOString();

let n = 0;
const q = (over: Partial<Query> = {}): Query => ({
  id: `q${++n}`, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", personalisationNotes: "",
  sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(10), ...over,
});
const ag = (id: string, name: string, agency: string, over: Partial<Agent> = {}): Agent =>
  ({ id, userId: "u", name, agency, responseTimeWeeks: 6, ...over } as Agent);
const AGENTS = [
  ag("a1", "Jonathan Marsh", "The Marsh Agency"),
  ag("a2", "Marcus Reed", "Bloomsbury Quill"),
  ag("a3", "Aisha Kapoor", "The Lantern Agency"),
];
/** n agents, the first three the named cast — so a count and its list agree, as on the page */
const agentsN = (n: number): Agent[] => Array.from({ length: n }, (_, i) => AGENTS[i] ?? ag(`x${i}`, `Agent ${i}`, `Agency ${i}`));
const ctxOf = (qs: Query[], agents: Agent[] = AGENTS): PressingContext => ({
  rows: buildQcRows(qs, agents, [], NOW), agentsById: new Map(agents.map((a) => [a.id, a])), nowMs: NOW,
});
const sub = (l: LivingLine) => runsText(l.subline);
const s = (qs: Query[]) => runsText(pressingSentence(ctxOf(qs)));

/* the fixtures each case needs */
const nudgeDue = () => q({ agentId: "a1", dateSent: ago(60) });       // past the 6-week window + 14 days' grace, under the close ceiling, never nudged
const waiting = () => q({ agentId: "a3", dateSent: ago(10) });        // reply expected in 32 days
const partialDue = (days: number) => q({ agentId: "a2", status: QueryStatus.PARTIAL_REQUESTED, expectedSendDate: days >= 0 ? ahead(days) : ago(-days) });

describe("the pressing sentence — the first case that matches", () => {
  it("1 · something owed, due soonest, with the nudges waiting", () => {
    expect(s([partialDue(14), waiting()])).toBe("Marcus Reed’s partial is due Sat 3 Oct.");
    expect(s([partialDue(14), nudgeDue(), waiting()])).toBe("Marcus Reed’s partial is due Sat 3 Oct, and one nudge is waiting.");
    const two = [partialDue(14), nudgeDue(), q({ agentId: "a3", dateSent: ago(57) })];
    expect(s(two)).toBe("Marcus Reed’s partial is due Sat 3 Oct, and two nudges are waiting.");
  });
  it("1 · overdue reads in the past tense — a fact about the calendar, not a verdict", () => {
    expect(s([partialDue(-3)])).toBe("Marcus Reed’s partial was due Wed 16 Sep.");
  });
  it("1 · the soonest of several owed items, and full and revision worded to match", () => {
    expect(s([partialDue(20), q({ agentId: "a1", status: QueryStatus.FULL_REQUESTED, expectedSendDate: ahead(5) })]))
      .toBe("Jonathan Marsh’s full is due Thu 24 Sep.");
    expect(s([q({ agentId: "a3", status: QueryStatus.REVISE_RESUBMIT, expectedSendDate: ahead(2) })])).toBe("Aisha Kapoor’s revision is due Mon 21 Sep.");
  });
  it("1 · an offer to decide", () => {
    expect(s([q({ agentId: "a3", status: QueryStatus.OFFER, offerResponseDeadline: ahead(7) })])).toBe("Your decision on Aisha Kapoor’s offer is due Sat 26 Sep.");
  });
  it("1 · undated owed items fall back to 'waiting on you', and dated ones outrank them", () => {
    expect(s([q({ agentId: "a2", status: QueryStatus.PARTIAL_REQUESTED })])).toBe("Marcus Reed’s partial is waiting on you.");
    expect(s([q({ agentId: "a3", status: QueryStatus.OFFER })])).toBe("Your decision on Aisha Kapoor’s offer is waiting on you.");
    expect(s([q({ agentId: "a2", status: QueryStatus.PARTIAL_REQUESTED }), partialDue(9)])).toBe("Marcus Reed’s partial is due Mon 28 Sep.");
  });
  it("2 · otherwise a nudge that is due — the rule the To-do generator uses", () => {
    expect(nudgesDue(ctxOf([nudgeDue()])).length).toBe(1);
    expect(s([nudgeDue(), waiting()])).toBe("Jonathan Marsh has had it 8 weeks. A nudge is due.");
    /* a nudged query is not due another until its own date */
    expect(nudgesDue(ctxOf([q({ agentId: "a1", dateSent: ago(60), lastNudgeSentDate: ago(3), nudgeDate: ahead(10) })])).length).toBe(0);
  });
  it("3 · otherwise the next expected reply", () => {
    expect(s([waiting(), q({ agentId: "a1", dateSent: ago(30) })])).toBe("The next reply is expected 1 Oct, from Jonathan Marsh.");
  });
  it("4 · otherwise, nothing needs you today", () => {
    expect(s([q({ agentId: "a1", status: QueryStatus.REJECTED })])).toBe("Nothing needs you today.");
    expect(s([])).toBe("Nothing needs you today.");
  });
});

describe("the Query Centre's two lines", () => {
  it("one query with the agent: when it went, and when a reply is expected", () => {
    const l = qcHeaderCopy(1, ctxOf([waiting()]));
    expect(l.headline).toBe("One query out");
    expect(sub(l)).toBe("With Aisha Kapoor since 9 Sep. A reply is expected by 21 Oct.");
  });
  it("one query with no date promised states only when it went", () => {
    const l = qcHeaderCopy(1, ctxOf([q({ agentId: "a3" })], [ag("a3", "Aisha Kapoor", "The Lantern Agency", { responseTimeWeeks: undefined })]));
    expect(sub(l)).toBe("With Aisha Kapoor since 9 Sep.");
  });
  it("one query that is with the writer falls back to the pressing sentence", () => {
    expect(sub(qcHeaderCopy(1, ctxOf([partialDue(14)])))).toBe("Marcus Reed’s partial is due Sat 3 Oct.");
  });
  it("none, on a populated account scoped to an empty book: in words, never '0 queries out'", () => {
    const l = qcHeaderCopy(0, ctxOf([]));
    expect(l.headline).toBe("No queries out");
    expect(sub(l)).toBe("Nothing needs you today.");
  });
  it("many: the count in the headline, the pressing sentence below", () => {
    const l = qcHeaderCopy(27, ctxOf([partialDue(14), nudgeDue()]));
    expect(l.headline).toBe("27 queries out");
    expect(sub(l)).toBe("Marcus Reed’s partial is due Sat 3 Oct, and one nudge is waiting.");
  });
});

describe("the Contact list's two lines", () => {
  it("one agent, never queried — and 'them', never a guessed pronoun", () => {
    const l = contactHeaderCopy(1, { ...ctxOf([], [AGENTS[2]]), agents: [AGENTS[2]] });
    expect(l.headline).toBe("One agent");
    expect(sub(l)).toBe("Aisha Kapoor at The Lantern Agency, and you haven’t queried them yet.");
    expect(sub(l)).not.toMatch(/\b(her|his|him|she|he)\b/);
  });
  it("one agent, queried: the date the query went", () => {
    const qs = [q({ agentId: "a3", dateSent: ago(36) })];
    expect(sub(contactHeaderCopy(1, { ...ctxOf(qs, [AGENTS[2]]), agents: [AGENTS[2]] }))).toBe("Aisha Kapoor at The Lantern Agency, and your query went on 14 Aug.");
  });
  it("one agent with no agency names the agent alone", () => {
    const solo = ag("a9", "Greg Panetta", "");
    expect(sub(contactHeaderCopy(1, { ...ctxOf([], [solo]), agents: [solo] }))).toBe("Greg Panetta, and you haven’t queried them yet.");
  });
  /* ⚠️ RETARGETED (living headers v3): the many-case is what is missing and who is left — the ref's
     sentence — not the pressing sentence */
  it("many: 'n agents', who is queried, who is left, and the gaps", () => {
    const l = contactHeaderCopy(16, { ...ctxOf([nudgeDue()]), agents: AGENTS, gaps: 46 });
    expect(l.headline).toBe("16 agents");
    expect(sub(l)).toBe("1 queried, and 2 still to go. 46 details are missing across them.");
  });
  it("many: none queried, all queried, one gap, no gaps", () => {
    expect(sub(contactHeaderCopy(3, { ...ctxOf([]), agents: AGENTS }))).toBe("None queried yet.");
    const all = [q({ agentId: "a1" }), q({ agentId: "a2" }), q({ agentId: "a3" })];
    expect(sub(contactHeaderCopy(3, { ...ctxOf(all), agents: AGENTS, gaps: 1 }))).toBe("All of them queried. 1 detail is missing across them.");
  });
});

describe("LH9 · the rules that hold everywhere", () => {
  const counts = [1, 2, 9, 13, 27, 148];
  const lines = counts.flatMap((c) => [
    qcHeaderCopy(c, ctxOf([partialDue(14), nudgeDue(), q({ agentId: "a3", dateSent: ago(57) })])),
    /* the Contact list's count IS its agent list's length — a fixture where they differ is one no page builds */
    contactHeaderCopy(c, { ...ctxOf([waiting()]), agents: c === 1 ? [AGENTS[2]] : agentsN(c) }),
  ]);
  it("the headline is the count alone: 'One …' at 1, the figure otherwise", () => {
    counts.forEach((c, i) => {
      expect(lines[i * 2].headline).toBe(c === 1 ? "One query out" : `${c} queries out`);
      expect(lines[i * 2 + 1].headline).toBe(c === 1 ? "One agent" : `${c} agents`);
    });
  });
  it("no subline carries the page's count, and every count inside a sentence is in words", () => {
    counts.forEach((c, i) => {
      for (const l of [lines[i * 2], lines[i * 2 + 1]]) {
        if (c > 1) expect(sub(l), `${c}: ${sub(l)}`).not.toMatch(new RegExp(`\\b${c}\\b`));
        expect(sub(l)).not.toMatch(/\b\d+ (nudges?|queries|agents)\b/);
      }
    });
    expect(numberWords(1)).toBe("one");
    expect(numberWords(23)).toBe("twenty-three");
  });
  it("dates go through the shared formatter: 'Sep', never 'Sept'", () => {
    const sep = new Date(Date.UTC(2026, 8, 26, 12)).getTime();
    expect(dayDate(sep)).toBe("Sat 26 Sep");
    const all = [...lines.map(sub), s([q({ agentId: "a3", status: QueryStatus.OFFER, offerResponseDeadline: ahead(7) })])];
    for (const t of all) expect(t).not.toMatch(/Sept\b/);
  });
});

/* ══ living headers v3 — the four new pages and the To-do list's caught-up line ══════════════════ */
import { packagesHeaderCopy, compsHeaderCopy, analyticsHeaderCopy, todoHeaderCopy, todoCaughtUpLine, ANALYTICS_MIN_ANSWERED, TOO_EARLY } from "./livingHeaders";

describe("Submission packages' two lines", () => {
  const lead = { name: "Standard", sent: 11, answered: 8, requests: 3 };
  it("many: the most-used live package and its record", () => {
    const l = packagesHeaderCopy(4, { lead, firstLiveName: "Standard" });
    expect(l.headline).toBe("4 packages");
    expect(sub(l)).toBe("Standard is out on 11 queries — 3 requests from 8 answered.");
  });
  it("singulars, nothing back yet, nothing sent, nothing in use", () => {
    expect(sub(packagesHeaderCopy(2, { lead: { name: "S", sent: 1, answered: 1, requests: 1 }, firstLiveName: "S" }))).toBe("S is out on 1 query — 1 request from 1 answered.");
    expect(sub(packagesHeaderCopy(2, { lead: { name: "S", sent: 3, answered: 0, requests: 0 }, firstLiveName: "S" }))).toBe("S is out on 3 queries, and none has come back yet.");
    expect(sub(packagesHeaderCopy(2, { lead: null, firstLiveName: "Short" }))).toBe("Short is ready, and hasn’t been sent with a query yet.");
    expect(sub(packagesHeaderCopy(2, { lead: null, firstLiveName: null }))).toBe("Nothing is in use right now.");
  });
  it("one: ready and not sent", () => {
    const l = packagesHeaderCopy(1, { lead: { name: "Standard", sent: 0, answered: 0, requests: 0 }, firstLiveName: "Standard" });
    expect(l.headline).toBe("One package");
    expect(sub(l)).toBe("Standard is ready, and hasn’t been sent with a query yet.");
  });
});

describe("Comparable titles' two lines", () => {
  it("many: what stops them being letter-ready, in words", () => {
    const l = compsHeaderCopy(11, { missing: 3, inLetter: ["The Dry", "Snap"], firstTitle: "The Dry" });
    expect(l.headline).toBe("11 comp titles");
    expect(sub(l)).toBe("Three are missing a publisher or a year, so they’re not letter-ready.");
    expect(sub(compsHeaderCopy(4, { missing: 1, inLetter: [], firstTitle: "x" }))).toBe("One is missing a publisher or a year, so it’s not letter-ready.");
  });
  it("many, none missing: the titles in the letter", () => {
    expect(sub(compsHeaderCopy(4, { missing: 0, inLetter: ["The Dry", "Snap"], firstTitle: "x" }))).toBe("The Dry and Snap are in your letter.");
    expect(sub(compsHeaderCopy(4, { missing: 0, inLetter: ["The Dry"], firstTitle: "x" }))).toBe("The Dry is in your letter.");
    expect(sub(compsHeaderCopy(4, { missing: 0, inLetter: [], firstTitle: "x" }))).toBe("None is in your letter yet.");
  });
  it("one: saved, in the letter or not", () => {
    const l = compsHeaderCopy(1, { missing: 0, inLetter: [], firstTitle: "The Dry" });
    expect(l.headline).toBe("One comp title");
    expect(sub(l)).toBe("The Dry is saved, and not in your letter yet.");
    expect(sub(compsHeaderCopy(1, { missing: 0, inLetter: ["The Dry"], firstTitle: "The Dry" }))).toBe("The Dry is saved, and in your letter.");
  });
});

describe("Analytics' two lines — never a rate from fewer than five answered", () => {
  it("many: the requests, the answered, the typical reply", () => {
    const l = analyticsHeaderCopy(27, { answered: 24, requests: 3, medianDays: 31 });
    expect(l.headline).toBe("27 queries in");
    expect(sub(l)).toBe("Three requests from 24 answered, and agents take 31 days to reply.");
    expect(sub(analyticsHeaderCopy(27, { answered: 6, requests: 0, medianDays: null }))).toBe("No requests from 6 answered.");
    expect(sub(analyticsHeaderCopy(27, { answered: 9, requests: 1, medianDays: 1 }))).toBe("One request from 9 answered, and agents take 1 day to reply.");
  });
  it("below five answered, and at one, it is too early", () => {
    expect(ANALYTICS_MIN_ANSWERED).toBe(5);
    expect(sub(analyticsHeaderCopy(27, { answered: 4, requests: 3, medianDays: 20 }))).toBe(TOO_EARLY);
    const one = analyticsHeaderCopy(1, { answered: 9, requests: 2, medianDays: 10 });
    expect(one.headline).toBe("One query in");
    expect(sub(one)).toBe(TOO_EARLY);
  });
});

describe("the To-do list's two lines, and all caught up", () => {
  const today = "2026-09-19";
  it("many: the oldest or soonest, by its own deed, in the right tense", () => {
    const l = todoHeaderCopy(9, { first: { deed: "Send Marcus Reed the partial", dueYmd: "2026-10-03" }, todayYmd: today });
    expect(l.headline).toBe("9 things to do");
    expect(sub(l)).toBe("The oldest of them is Send Marcus Reed the partial, and it is due on Sat 3 Oct.");
    expect(sub(todoHeaderCopy(9, { first: { deed: "Nudge Aisha Kapoor", dueYmd: "2026-09-12" }, todayYmd: today }))).toBe("The oldest of them is Nudge Aisha Kapoor, and it was due on Sat 12 Sep.");
    expect(sub(todoHeaderCopy(9, { first: { deed: "Polish the synopsis", dueYmd: null }, todayYmd: today }))).toBe("The oldest of them is Polish the synopsis, and it has no date set.");
  });
  it("one: that one thing", () => {
    const l = todoHeaderCopy(1, { first: { deed: "Nudge Aisha Kapoor", dueYmd: "2026-09-26" }, todayYmd: today });
    expect(l.headline).toBe("One thing to do");
    expect(sub(l)).toBe("Nudge Aisha Kapoor. It is due on Sat 26 Sep.");
  });
  it("all caught up: the next reply, or nothing at all", () => {
    const c = todoCaughtUpLine(ctxOf([waiting()]));
    expect(c.headline).toBe("All caught up");
    expect(sub(c)).toBe("Nothing needs you today. The next reply is expected 21 Oct, from Aisha Kapoor.");
    expect(sub(todoCaughtUpLine(ctxOf([])))).toBe("Nothing needs you today.");
  });
});

describe("LH12 · the v3 rules across all six", () => {
  const counts = [1, 2, 9, 13, 27, 148];
  const all = counts.flatMap((c) => [
    { c, l: qcHeaderCopy(c, ctxOf([partialDue(14), nudgeDue()])) },
    { c, l: contactHeaderCopy(c, { ...ctxOf([waiting()]), agents: c === 1 ? [AGENTS[2]] : agentsN(c), gaps: 46 }) },
    { c, l: packagesHeaderCopy(c, { lead: { name: "Standard", sent: 11, answered: 8, requests: 3 }, firstLiveName: "Standard" }) },
    { c, l: compsHeaderCopy(c, { missing: 3, inLetter: ["The Dry"], firstTitle: "The Dry" }) },
    { c, l: analyticsHeaderCopy(c, { answered: 24, requests: 3, medianDays: 31 }) },
    /* a SEPTEMBER date, so the "Sept" sweep below has something to catch (an October-only fixture cannot) */
    { c, l: todoHeaderCopy(c, { first: { deed: "Send the partial", dueYmd: "2026-09-26" }, todayYmd: "2026-09-19" }) },
  ]);
  it("every headline is non-empty and states the scale alone", () => {
    for (const { c, l } of all) {
      expect(l.headline.length).toBeGreaterThan(0);
      if (c === 1) expect(l.headline).toMatch(/^One /);
      else expect(l.headline.startsWith(`${c} `)).toBe(true);
    }
  });
  it("no subline restates the page's own count, and none says Sept", () => {
    for (const { c, l } of all) {
      if (c > 1) expect(sub(l), `${l.headline}: ${sub(l)}`).not.toMatch(new RegExp(`(^|\\D)${c}(\\D|$)`));
      expect(sub(l)).not.toMatch(/Sept\b/);
    }
  });
});
