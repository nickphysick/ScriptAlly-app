/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for §4 + §5 — when a nudge is available, what it says, and what it leaves behind.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { QueryStatus } from "../types";
import { getPrimaryAction } from "./queryPrimaryAction";
import {
  chasedBy, nudgeStanding, nudgeReason, nudgeConfirm, nudgeTimes, nudgedAgo,
  nudgeOutcomeLabel, nudgeHistoryLine, closureOffer, CLOSURE_OFFER_MONTHS, agoLabel, silencePolicyLine,
} from "./nudgeState";

const DAY = 86400000;
const NOW = Date.UTC(2026, 5, 1); // 1 June 2026
const day = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
const MARSH = { name: "Jonathan Reed", agency: "The Marsh Agency", responseTimeWeeks: 8 };

describe("§4a · availability follows whose turn it is", () => {
  /**
   * ⚠️ ASSERTED AGAINST THE CTA ENGINE, NOT AGAINST A LITERAL LIST. A `toEqual(["Queried", …])`
   * would go green the day someone changed both this and the engine in the same wrong direction —
   * the reconciliation shape the agent list's three invariants use.
   */
  it("every status agrees with the ball-holder, and nothing has an opinion of its own", () => {
    for (const s of Object.values(QueryStatus)) {
      const ball = getPrimaryAction(s).ballHolder;
      const expected = ball === "agent" ? "available" : ball === "writer" ? "writer" : "finished";
      expect(nudgeStanding(s), `${s} disagrees with the CTA engine`).toBe(expected);
    }
  });

  it("the pack's three groups land where it says", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(nudgeStanding(s), `${s} is not nudgeable`).toBe("available");
    }
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) {
      expect(nudgeStanding(s), `${s} offered a nudge while the writer holds the ball`).toBe("writer");
    }
    for (const s of [QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(nudgeStanding(s), `${s} offered a nudge on a finished query`).toBe("finished");
    }
  });

  /* ⚠️ A RESUBMISSION IS A `Full Sent`, so it is nudgeable for the same reason the first full is. */
  it("a resubmission is with the agent", () => {
    expect(nudgeStanding(getPrimaryAction(QueryStatus.REVISE_RESUBMIT).kind === "mark-sent"
      ? (getPrimaryAction(QueryStatus.REVISE_RESUBMIT) as any).target : QueryStatus.FULL_SENT)).toBe("available");
  });
});

describe("§4b · an unavailable control says why", () => {
  it("it names who is waiting and what is outstanding", () => {
    expect(nudgeReason(QueryStatus.PARTIAL_REQUESTED, MARSH)).toBe("The Marsh Agency are waiting on you — send the partial first.");
    expect(nudgeReason(QueryStatus.FULL_REQUESTED, MARSH)).toBe("The Marsh Agency are waiting on you — send the full first.");
    expect(nudgeReason(QueryStatus.REVISE_RESUBMIT, MARSH)).toBe("The Marsh Agency are waiting on you — send your resubmission first.");
  });

  /* ⚠️ "Jonathan are waiting on you" is what a baked plural verb produces the moment the agency is
     missing — which is a real record shape, not a hypothetical. */
  it("a person takes a singular verb", () => {
    expect(nudgeReason(QueryStatus.FULL_REQUESTED, { name: "Jonathan Reed" }))
      .toBe("Jonathan Reed is waiting on you — send the full first.");
    expect(chasedBy({ name: "Jonathan Reed" })).toEqual({ name: "Jonathan Reed", plural: false });
    expect(chasedBy(null).plural, "an unresolved agent lost its verb").toBe(true);
  });

  it("a closed query offers the way out instead, and an available one says nothing", () => {
    expect(nudgeReason(QueryStatus.REJECTED, MARSH)).toBe("This query is closed. Reopen it if you want to follow up.");
    expect(nudgeReason(QueryStatus.OFFER, MARSH)).toContain("closed");
    expect(nudgeReason(QueryStatus.QUERIED, MARSH)).toBe("");
  });

  /* ⚠️ THE APP REPORTS. A reason is the one place an apology or an instruction would creep in. */
  it("no reason appraises or advises", () => {
    for (const s of Object.values(QueryStatus)) {
      const r = nudgeReason(s, MARSH);
      expect(r, `"${r}" appraises`).not.toMatch(/should|recommend|annoy|patient|too soon|please|sorry/i);
    }
  });
});

describe("§4c · the confirm states facts and stops", () => {
  it("inside the window it names the window, the date and the distance", () => {
    const sent = NOW - 21 * DAY;
    const c = nudgeConfirm({ agent: MARSH, sentMs: sent, now: NOW, formatDate: day })!;
    expect(c.kind).toBe("inside-window");
    expect(c.title).toBe("Nudge before their window expires?");
    expect(c.body).toBe("The Marsh Agency state 8 weeks. That window expires on 6 July — 5 weeks from now.");
    /* §4 — the bar exists because there is a window to measure against, filled to the elapsed part */
    expect(c.bar, "a stated window drew no bar").toBeTruthy();
    expect(Math.round(c.bar!.pct), "21 of 56 days is 37.5%").toBe(38);
    expect(c.bar!.sentLabel).toBe("Sent 11 May");
    expect(c.bar!.closesLabel).toBe("Closes 6 July");
  });

  /* ⚠️ NULL MEANS PROCEED — a confirm with nothing left to state is friction, not information. */
  it("once the window has closed there is no confirm at all", () => {
    expect(nudgeConfirm({ agent: MARSH, sentMs: NOW - 9 * 7 * DAY, now: NOW, formatDate: day })).toBeNull();
    /* the boundary: the day it closes is still inside */
    expect(nudgeConfirm({ agent: MARSH, sentMs: NOW - 8 * 7 * DAY + 1000, now: NOW, formatDate: day })).not.toBeNull();
    expect(nudgeConfirm({ agent: MARSH, sentMs: NOW - 8 * 7 * DAY, now: NOW, formatDate: day })).toBeNull();
  });

  it("with no stated window it says so and gives what is known", () => {
    const c = nudgeConfirm({ agent: { name: "Jonathan Reed", agency: "The Marsh Agency" }, sentMs: NOW - 35 * DAY, now: NOW, formatDate: day })!;
    expect(c.kind).toBe("no-window");
    expect(c.title).toBe("Nudge?");
    expect(c.body).toBe("The Marsh Agency do not state a response time. You sent this 5 weeks ago.");
    /* ⚠️ NO BAR — a track for a window that does not exist would invent the fact the sentence
       beside it is admitting the record does not hold. */
    expect(c.bar, "a bar was drawn for an agency that states no window").toBeUndefined();
  });

  it("with neither a window nor a send date it states only what it has", () => {
    const c = nudgeConfirm({ agent: {}, sentMs: null, now: NOW, formatDate: day })!;
    expect(c.body).toBe("The agency do not state a response time.");
    expect(c.bar).toBeUndefined();
    expect(c.body, "it invented a duration from nothing").not.toMatch(/\d/);
  });

  /* a stated window with no send date has no closing date, and must not pretend the window lapsed */
  it("a stated window with no send date still asks", () => {
    const c = nudgeConfirm({ agent: MARSH, sentMs: null, now: NOW, formatDate: day })!;
    expect(c.kind).toBe("inside-window");
    expect(c.body).toContain("no send date recorded");
    /* a proportion needs both ends: a window with no send has nothing to fill from */
    expect(c.bar, "a bar was drawn with no send date to measure from").toBeUndefined();
  });

  it("no confirm anywhere carries a verdict", () => {
    for (const sent of [null, NOW - 3 * DAY, NOW - 30 * DAY]) {
      for (const agent of [MARSH, { name: "J" }, {}]) {
        const c = nudgeConfirm({ agent, sentMs: sent, now: NOW, formatDate: day });
        if (!c) continue;
        expect(`${c.title} ${c.body}`, "the confirm appraises").not.toMatch(/may annoy|recommend|are you sure|too soon|advise|patient|risky/i);
      }
    }
  });
});

describe("§4d + §5 · what a nudge leaves behind", () => {
  const at = (v: unknown) => Number(v);

  it("nudge times come out oldest first, and nothing else is counted", () => {
    const evs = [{ type: "NUDGE", createdAt: 300 }, { type: "Queried", createdAt: 100 }, { type: "NUDGE", createdAt: 200 }];
    expect(nudgeTimes(evs, "NUDGE", at)).toEqual([200, 300]);
    expect(nudgeTimes(null, "NUDGE", at)).toEqual([]);
  });

  /* ⚠️ THIS ROUND. A nudge from before the agent replied is record, not an outstanding follow-up. */
  it("only a nudge since the round began counts as nudged", () => {
    const times = [NOW - 200 * DAY, NOW - 3 * DAY];
    expect(nudgedAgo(times, NOW - 30 * DAY, NOW)).toBe(3);
    expect(nudgedAgo([NOW - 200 * DAY], NOW - 30 * DAY, NOW), "a nudge from a previous round counted").toBeNull();
    expect(nudgedAgo([], null, NOW)).toBeNull();
    expect(nudgedAgo(times, null, NOW)).toBe(3);
  });

  /* §5a — the outcome, derived from whether anything came back, never stored */
  it("a nudge says whether it worked, and the reply below says the rest", () => {
    const later = [{ status: QueryStatus.FULL_REQUESTED, timeMs: 500 }];
    expect(nudgeOutcomeLabel(400, later)).toBe("Nudged");
    expect(nudgeOutcomeLabel(600, later), "an earlier reply was read as an answer to a later nudge").toBe("Nudged — no reply");
    expect(nudgeOutcomeLabel(400, [])).toBe("Nudged — no reply");
    /* ⚠️ AN OUTGOING EVENT IS NOT A REPLY — the writer sending the full does not answer their nudge */
    expect(nudgeOutcomeLabel(400, [{ status: QueryStatus.FULL_SENT, timeMs: 500 }])).toBe("Nudged — no reply");
  });

  /* ⚠️ "0 days ago" is a correct duration and the wrong sentence — measured on the page. */
  it("a nudge sent today says today", () => {
    expect(agoLabel(0)).toBe("today");
    expect(agoLabel(1)).toBe("1 day ago");
    expect(agoLabel(21)).toBe("3 weeks ago");
    expect(agoLabel(0), "the control counted a duration where it should name a day").not.toContain("0");
  });

  it("§5b — the history line counts in words and lists the dates", () => {
    expect(nudgeHistoryLine([], day)).toBe("");
    expect(nudgeHistoryLine([Date.UTC(2025, 2, 19)], day)).toBe("Nudged once · 19 March");
    expect(nudgeHistoryLine([Date.UTC(2025, 2, 19), Date.UTC(2025, 5, 2)], day)).toBe("Nudged twice · 19 March, 2 June");
  });
});

describe("§5c · closure is offered on facts, and only once", () => {
  const closed = NOW - 14 * 30.44 * DAY; // fourteen months ago

  it("both conditions must hold", () => {
    expect(closureOffer({ times: [NOW - 13 * 30.44 * DAY], windowExpiredMs: closed, now: NOW, dismissed: false }).show).toBe(true);
    /* ⚠️ NEVER NUDGED, NEVER OFFERED — the obvious next step there is a nudge, not closure. */
    expect(closureOffer({ times: [], windowExpiredMs: closed, now: NOW, dismissed: false }).show, "a query that was never nudged was offered closure").toBe(false);
    /* one nudge and four months is an ordinary state of affairs (the ref's first card) */
    expect(closureOffer({ times: [NOW - 70 * DAY], windowExpiredMs: NOW - 120 * DAY, now: NOW, dismissed: false }).show).toBe(false);
    expect(closureOffer({ times: [NOW - 10 * DAY], windowExpiredMs: null, now: NOW, dismissed: false }).show).toBe(false);
  });

  it("it states the accumulated facts and no verdict", () => {
    const o = closureOffer({ times: [NOW - 400 * DAY, NOW - 300 * DAY], windowExpiredMs: closed, now: NOW, dismissed: false });
    expect(o.facts).toBe("Two nudges, no reply, and 14 months since the window expired.");
    expect(o.facts).not.toMatch(/time to|unlikely|move on|give up|probably|should/i);
    expect(closureOffer({ times: [NOW - 400 * DAY], windowExpiredMs: closed, now: NOW, dismissed: false }).facts)
      .toBe("One nudge, no reply, and 14 months since the window expired.");
  });

  /* §5d — the one stored thing in the section */
  it("keeping tracking ends it permanently", () => {
    const inp = { times: [NOW - 400 * DAY], windowExpiredMs: closed, now: NOW };
    expect(closureOffer({ ...inp, dismissed: false }).show).toBe(true);
    expect(closureOffer({ ...inp, dismissed: true }).show, "the offer came back after being dismissed").toBe(false);
  });

  it("the threshold is one stated figure", () => {
    expect(CLOSURE_OFFER_MONTHS).toBe(6);
    const justUnder = NOW - (CLOSURE_OFFER_MONTHS * 30.44 - 2) * DAY;
    const justOver = NOW - (CLOSURE_OFFER_MONTHS * 30.44 + 2) * DAY;
    expect(closureOffer({ times: [NOW - 300 * DAY], windowExpiredMs: justUnder, now: NOW, dismissed: false }).show).toBe(false);
    expect(closureOffer({ times: [NOW - 300 * DAY], windowExpiredMs: justOver, now: NOW, dismissed: false }).show).toBe(true);
  });
});

/**
 * ⚠️ THE OLD CONDITION IS GONE FROM THE CONTROL, asserted at source because a leftover
 * `replyTaskFor` beside the new derivation would grey the button again with nothing to point at.
 * The rule itself stays — it is what the to-do list is built on.
 */
describe("§4 · the control reads the new derivation", () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const page = strip(readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8"));

  it("Nudge no longer gates on the to-do rule", () => {
    expect(page, "the control still reads replyTaskFor").not.toContain("replyTaskFor(");
    expect(page, "the control does not read the standing").toContain("nudgeStanding(");
  });

  it("the reason is rendered, not just derived", () => {
    expect(page).toContain("nudgeReason(");
  });
});

/**
 * §1 (policy pack) — the agency's own silence policy, or nothing.
 *
 * ⚠️ THE INPUT IS `chasedBy`'s OUTPUT, NOT A HAND-MADE `who`. The subject and its verb agreement
 * come from that function in production, so a literal here would be testing a shape the page cannot
 * produce — and would go green the day an agency stopped taking a plural verb.
 */
describe("§1 · the agency's own policy, or nothing", () => {
  const closed = NOW - 400 * DAY;
  const long = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const line = (policy: boolean | undefined, agent: { name?: string; agency?: string }, windowExpiredMs: number | null = closed) =>
    silencePolicyLine({ policy, who: chasedBy(agent), windowExpiredMs, now: NOW, formatDate: long });

  it("names the agency and the date their own window expired", () => {
    const l = line(true, { name: "Marcus Reed", agency: "Bloomsbury Quill" });
    expect(l).toBe(`Bloomsbury Quill treat silence as a pass — their window expired ${long(closed)}.`);
  });

  /* ⚠️ AN AGENT WITH NO AGENCY TAKES THE SINGULAR VERB — the same agreement every other sentence
     on this card uses, from the same function. */
  it("agrees its verb with whoever is being chased", () => {
    expect(line(true, { name: "Marcus Reed" })).toContain("Marcus Reed treats silence as a pass");
    expect(line(true, { agency: "Bloomsbury Quill" })).toContain("Bloomsbury Quill treat silence as a pass");
  });

  /**
   * ⚠️ THE WHOLE POINT OF THE SECTION: SILENCE ABOUT SILENCE IS NOT A STATEMENT ABOUT IT. Absent
   * and `false` both render nothing, and they are asserted separately because a `!== false` test
   * would pass one and fail the other while looking correct.
   */
  it("renders nothing at all where the agency has not said so", () => {
    expect(line(undefined, { agency: "Bloomsbury Quill" }), "an unstated policy produced a line").toBeNull();
    expect(line(false, { agency: "Bloomsbury Quill" }), "an agency that replies either way was quoted as not replying").toBeNull();
  });

  /* ⚠️ AND IT NEEDS A CLOSED WINDOW TO BE PAST — the policy alone says nothing about this query. */
  it("waits for the window to close", () => {
    expect(line(true, { agency: "Bloomsbury Quill" }, null), "a policy with no window produced a line").toBeNull();
    expect(line(true, { agency: "Bloomsbury Quill" }, NOW + 30 * DAY), "an open window was called closed").toBeNull();
  });

  /**
   * §1 — the offer follows the line. The policy is a SECOND route into `closureOffer`, and it does
   * not wait the six months the nudge route waits: that wait exists because closure is otherwise
   * the app's own inference, and here it is the agency's published position.
   */
  it("the offer follows the policy, without a nudge and without the six-month wait", () => {
    const recent = NOW - 20 * DAY;
    expect(closureOffer({ times: [], windowExpiredMs: recent, now: NOW, dismissed: false, policy: true }).show,
      "a stated policy did not carry the offer").toBe(true);
    expect(closureOffer({ times: [], windowExpiredMs: recent, now: NOW, dismissed: false }).show,
      "the nudge route started offering closure without a nudge").toBe(false);
    expect(closureOffer({ times: [], windowExpiredMs: recent, now: NOW, dismissed: false, policy: false }).show,
      "an agency that replies either way carried the offer").toBe(false);
  });

  /* ⚠️ THE FACTS DO NOT RESTATE THE POLICY — the line above the offer says it, and an offer
     repeating it would be the app pressing a point it has no business pressing. */
  it("states facts and no verdict, and never repeats the policy", () => {
    const o = closureOffer({ times: [], windowExpiredMs: closed, now: NOW, dismissed: false, policy: true });
    expect(o.facts).toContain("since their window expired");
    expect(o.facts.toLowerCase()).not.toContain("silence as a pass");
    for (const w of ["recommend", "should", "unlikely", "time to", "move on", "give up"]) {
      expect(o.facts.toLowerCase(), `the offer appraises: "${w}"`).not.toContain(w);
    }
  });

  /* the once-only dismissal is unchanged, and it covers the new route too */
  it("honours the dismissal", () => {
    expect(closureOffer({ times: [], windowExpiredMs: closed, now: NOW, dismissed: true, policy: true }).show).toBe(false);
  });
});

/**
 * ⚠️ THE GENERIC LINE IS GONE FROM THE PAGE, asserted at source because an absence is what this
 * section is. Comments are stripped first — this file's own prose quotes the retired sentence, and
 * so does the derivation's, which is exactly the false red this repo has paid for seven times.
 */
describe("§1 · the generic convention line is gone", () => {
  const strip = (src: string) => src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
  const tl = strip(readFileSync(new URL("../components/reading-pane/QueryTimeline.tsx", import.meta.url), "utf8"));
  const st = strip(readFileSync(new URL("./nudgeState.ts", import.meta.url), "utf8"));

  it("no house observation about the trade renders anywhere", () => {
    for (const src of [tl, st]) {
      expect(src, "the generic convention line is still rendered").not.toContain("Many agencies");
      expect(src, "a house assumption about silence is stated in code").not.toMatch(/most agenc|usually means|generally treat/i);
    }
  });

  it("the line the page draws comes from the derivation", () => {
    expect(tl, "the page does not call the policy derivation").toContain("silencePolicyLine(");
    expect(tl, "the policy line is not fed the agent's own field").toContain("policy: agent?.noResponseMeansNo");
  });
});

/**
 * §2 (policy pack) — the ghost rung is an event, and "is a reminder scheduled" is asked once.
 *
 * ⚠️ THE FAULT WAS TWO DERIVATIONS OF ONE FACT. The row above the rung took its `last` from
 * `query.nudgeDate` — the projection §6b retired — while the rung itself renders from the task
 * store, so a reminder set on the to-do list left the row marked last, and `--last` zeroes the gap.
 * The rung fused to the sentence above it and nothing was wrong with the rung.
 */
describe("§2 · the ghost rung asks the same source as the row above it", () => {
  const strip = (src: string) => src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
  const tl = strip(readFileSync(new URL("../components/reading-pane/QueryTimeline.tsx", import.meta.url), "utf8"));

  it("the retired projection is not read at all", () => {
    expect(tl, "the timeline is reading the retired nudgeDate projection again").not.toContain("query.nudgeDate");
    expect(tl, "a second reminder derivation is back").not.toContain("reminderMs");
  });

  it("the row's last flag and the rung come from the one reminder", () => {
    expect(tl, "the waiting row does not take its last flag from the reminder").toContain("last={!reminder}");
    expect(tl, "the rung is not rendered off the reminder").toContain("reminder && (");
  });

  /**
   * ⚠️ THE PREFIX IS RETIRED (§3, event-grammar pack) AND THE CLAUSE IS INVERTED. "Scheduled for"
   * was the right fix while the rung was a sentence in the event grammar; the rung is now a dashed
   * panel that is not an event at all, and the prefix was a word explaining a slot that needs no
   * explaining. The other half of the case stands unchanged: it states what is set.
   */
  it("the rung states what is true and when", () => {
    expect(tl, "the rung reads as a fragment again").toContain("Nudge reminder set");
    expect(tl, "the retired prefix is back in the panel").not.toContain("Scheduled for ${");
    expect(tl, "the panel does not state a date").toContain("fmtDay(");
  });
});

/**
 * §3 (policy pack) — the tracker's offer follows the same supersession.
 *
 * ⚠️ THE §6c NEXT-STEP OFFER ALREADY REFUSED TO APPEAR BESIDE A REMINDER; the CLOSURE offer did
 * not, so a query with a booked chase could still be told to close — the exact contradiction the
 * section removes, one surface along from the tasks popover.
 */
describe("§3 · no closure offer while a nudge is scheduled", () => {
  const closed = NOW - 400 * DAY;
  const base = { times: [NOW - 300 * DAY], windowExpiredMs: closed, now: NOW, dismissed: false };

  it("the nudge route is superseded", () => {
    expect(closureOffer(base).show, "the fixture is not a closure candidate to begin with").toBe(true);
    expect(closureOffer({ ...base, reminderScheduled: true }).show, "closure was offered beside a booked chase").toBe(false);
  });

  /* ⚠️ AND THE AGENCY'S OWN POLICY DOES NOT OUTRANK THE WRITER'S DECISION. §1's route is checked
     after this one on purpose: what the agency published is a fact about them, and a scheduled
     nudge is a decision by the person whose query it is. */
  it("the policy route is superseded too", () => {
    expect(closureOffer({ ...base, times: [], policy: true }).show).toBe(true);
    expect(closureOffer({ ...base, times: [], policy: true, reminderScheduled: true }).show,
      "the agency's policy overrode the writer's own scheduled chase").toBe(false);
  });

  /* derived each time — clearing the reminder brings the offer back */
  it("clearing the reminder brings the offer back", () => {
    expect(closureOffer({ ...base, reminderScheduled: true }).show).toBe(false);
    expect(closureOffer({ ...base, reminderScheduled: false }).show).toBe(true);
  });
});

/**
 * §3 — the supersession lives in ONE derivation, and the surfaces read it rather than filtering.
 */
describe("§3 · one derivation, three surfaces", () => {
  const strip = (src: string) => src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
  const feed = strip(readFileSync(new URL("./db.tsx", import.meta.url), "utf8"));
  const tl = strip(readFileSync(new URL("../components/reading-pane/QueryTimeline.tsx", import.meta.url), "utf8"));
  const board = strip(readFileSync(new URL("./todoBoard.ts", import.meta.url), "utf8"));

  it("the task feed asks the predicate the ghost rung asks", () => {
    expect(feed, "the feed does not consult the scheduled reminder").toContain("reminderScheduled: !!scheduledReminder(");
    expect(feed, "the feed would not re-run when the reminder is cleared").toMatch(/\}, \[[^\]]*userTasks[^\]]*\]\);/);
  });

  it("the tracker's offer consults it too", () => {
    expect(tl, "the tracker's offer ignores a scheduled reminder").toContain("reminderScheduled: !!reminder");
  });

  /* ⚠️ THE JARGON IS GONE FROM EVERY SURFACE THAT NAMES THIS TASK. The board never showed the
     feed's title — it derived its own — so the two said different things about one task. */
  it("no surface says 'No response limit hit'", () => {
    for (const src of [feed, board, tl]) {
      expect(src, "the system jargon is still rendered").not.toContain("No response limit hit");
    }
    expect(feed, "the feed does not state the silence").toContain("No response from ${aName} for ${elapsedPhrase(");
    expect(board, "the board does not state the silence in the scaled figure").toContain("No response from ${name}");
    expect(board, "the board went back to a raw day count in its title").not.toContain("silent${days");
  });
});

/**
 * §4 (event-grammar pack) — a response window EXPIRES; a query is CLOSED.
 *
 * ⚠️ THE TWO WORDS WERE THE SAME WORD, AND THEY ARE DIFFERENT ACTS BY DIFFERENT PEOPLE. Closing a
 * query is something the WRITER does and records; a window running out happens to the AGENCY's own
 * stated deadline. `closed 23 July 2024` on a tracker therefore read as "the writer closed this",
 * which is precisely what it did not mean.
 *
 * ⚠️ AND THE SWEEP IS ASSERTED IN BOTH DIRECTIONS, because a rename is only half a rule: the window
 * must lose the word AND the query status must keep it. A one-sided test passes a codebase that
 * renamed everything.
 */
describe("§4 · a window expires; a query is closed", () => {
  const strip = (src: string) => src.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/^\s*\/\/.*$/gm, "");
  const st = strip(readFileSync(new URL("./nudgeState.ts", import.meta.url), "utf8"));
  const tl = strip(readFileSync(new URL("../components/reading-pane/QueryTimeline.tsx", import.meta.url), "utf8"));
  const amb = strip(readFileSync(new URL("./queryAmbient.ts", import.meta.url), "utf8"));

  it("no window string says closed", () => {
    for (const [name, src] of [["nudgeState", st], ["QueryTimeline", tl], ["queryAmbient", amb]] as const) {
      expect(src, `${name} still says "window closed"`).not.toMatch(/window clos(ed|es|ing)/i);
      expect(src, `${name} still says "Window closed"`).not.toContain("Window closed");
    }
  });

  /* ⚠️ THE OTHER HALF. `Mark closed`, the closed status label and the closed bucket are the WRITER's
     act and must survive the sweep untouched — a rename that took them with it would have been a
     regression wearing a tidy-up's clothes. */
  it("the query status keeps the word", () => {
    expect(tl, "Mark closed was swept away with the windows").toContain("Mark closed");
    expect(tl, "the no-response status label lost its wording").toContain("Closed — no response");
    expect(st, "the finished-standing sentence lost its wording").toContain("This query is closed");
  });

  /* the stat tile stops describing the future once the window is behind it */
  it("the tile names the expiry once the window has passed", () => {
    expect(amb, "the tile still calls a past date an expectation").toContain('a.overdue ? "Window expired" : "Reply expected by"');
  });

  /* ⚠️ AND THE FIELD NAME MOVED WITH THE WORDS, because the thing that makes a renamed vocabulary
     drift back is a parameter still called the old name. */
  it("the derivation's own vocabulary moved too", () => {
    expect(st, "the input is still named for the query's act").not.toContain("windowClosedMs");
    expect(st, "the input was not renamed").toContain("windowExpiredMs");
  });
});
