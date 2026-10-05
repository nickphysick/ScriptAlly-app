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
    expect(l.headline).toBe("One agent on file");
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
  /* ⚠️ RETARGETED TWICE. Contact list v12 §3 made the many-case the CARD INDEX's sentence — the
     bold number is want∧not-queried (the oracle's `hit && st.startsWith('no')`), words to twenty
     then digits. v13 §2 then dropped its second sentence (the list's average reply time): the
     numbers strip under the band owns that figure now, so the header states one sentence. */
  it("many: 'n agents on file', the fresh count in words, the title run — and no reply clause", () => {
    const l = contactHeaderCopy(16, { ...ctxOf([nudgeDue()]), agents: AGENTS, facts: { want: 12, fresh: 11, genre: "thrillers", msTitle: "Murphy's Day Out" } });
    expect(l.headline).toBe("16 agents on file");
    expect(sub(l)).toBe("Eleven of them want thrillers and haven’t seen Murphy's Day Out yet.");
    expect(sub(l)).not.toMatch(/reply|week/i);
    /* the title is an {ms} RUN (Special Elite), the number is a {b} run */
    expect(l.subline.some((r) => typeof r === "object" && "ms" in r && r.ms === "Murphy's Day Out")).toBe(true);
    expect(l.subline.some((r) => typeof r === "object" && "b" in r && r.b === "Eleven")).toBe(true);
  });
  it("past twenty the number is digits", () => {
    const l = contactHeaderCopy(40, { ...ctxOf([]), agents: AGENTS, facts: { want: 30, fresh: 23, genre: "fantasy", msTitle: "T" } });
    expect(sub(l)).toBe("23 of them want fantasy and haven’t seen T yet.");
  });
  it("nobody matches → the spec's none-case, as v12 has it", () => {
    const none = contactHeaderCopy(16, { ...ctxOf([]), agents: AGENTS, facts: { want: 0, fresh: 0, genre: "thrillers", msTitle: "M" } });
    expect(sub(none)).toBe("None of them want thrillers yet.");
    const two = contactHeaderCopy(16, { ...ctxOf([]), agents: AGENTS, facts: { want: 3, fresh: 2, genre: "crime", msTitle: "M" } });
    expect(sub(two)).toBe("Two of them want crime and haven’t seen M yet.");
  });
  it("no manuscript in scope → the queried/to-go line stays, so the subline is never empty", () => {
    expect(sub(contactHeaderCopy(3, { ...ctxOf([]), agents: AGENTS }))).toBe("None queried yet.");
    const all = [q({ agentId: "a1" }), q({ agentId: "a2" }), q({ agentId: "a3" })];
    expect(sub(contactHeaderCopy(3, { ...ctxOf(all), agents: AGENTS }))).toBe("All of them queried.");
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
      /* v12: the Contact list's headline carries "on file" (the oracle's own h1) */
      expect(lines[i * 2 + 1].headline).toBe(c === 1 ? "One agent on file" : `${c} agents on file`);
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
import { packagesHeaderCopy, compsHeaderCopy, todoHeaderCopy, todoCaughtUpLine } from "./livingHeaders";

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

describe("LH12 · the v3 rules across all five (Analytics retired its living header in v13)", () => {
  const counts = [1, 2, 9, 13, 27, 148];
  const all = counts.flatMap((c) => [
    { c, l: qcHeaderCopy(c, ctxOf([partialDue(14), nudgeDue()])) },
    { c, l: contactHeaderCopy(c, { ...ctxOf([waiting()]), agents: c === 1 ? [AGENTS[2]] : agentsN(c), facts: { want: 9, fresh: 7, genre: "crime", msTitle: "M" } }) },
    { c, l: packagesHeaderCopy(c, { lead: { name: "Standard", sent: 11, answered: 8, requests: 3 }, firstLiveName: "Standard" }) },
    { c, l: compsHeaderCopy(c, { missing: 3, inLetter: ["The Dry"], firstTitle: "The Dry" }) },
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
