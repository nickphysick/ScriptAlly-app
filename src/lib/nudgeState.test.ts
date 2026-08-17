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
  nudgeOutcomeLabel, nudgeHistoryLine, closureOffer, CLOSURE_OFFER_MONTHS, nudgedAgoLabel,
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
    expect(c.title).toBe("Nudge before their window closes?");
    expect(c.body).toBe("The Marsh Agency state 8 weeks. That window closes on 6 July — 5 weeks from now.");
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
  });

  it("with neither a window nor a send date it states only what it has", () => {
    const c = nudgeConfirm({ agent: {}, sentMs: null, now: NOW, formatDate: day })!;
    expect(c.body).toBe("The agency do not state a response time.");
    expect(c.body, "it invented a duration from nothing").not.toMatch(/\d/);
  });

  /* a stated window with no send date has no closing date, and must not pretend the window lapsed */
  it("a stated window with no send date still asks", () => {
    const c = nudgeConfirm({ agent: MARSH, sentMs: null, now: NOW, formatDate: day })!;
    expect(c.kind).toBe("inside-window");
    expect(c.body).toContain("no send date recorded");
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
    expect(nudgedAgoLabel(0)).toBe("today");
    expect(nudgedAgoLabel(1)).toBe("1 day ago");
    expect(nudgedAgoLabel(21)).toBe("3 weeks ago");
    expect(nudgedAgoLabel(0), "the control counted a duration where it should name a day").not.toContain("0");
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
    expect(closureOffer({ times: [NOW - 13 * 30.44 * DAY], windowClosedMs: closed, now: NOW, dismissed: false }).show).toBe(true);
    /* ⚠️ NEVER NUDGED, NEVER OFFERED — the obvious next step there is a nudge, not closure. */
    expect(closureOffer({ times: [], windowClosedMs: closed, now: NOW, dismissed: false }).show, "a query that was never nudged was offered closure").toBe(false);
    /* one nudge and four months is an ordinary state of affairs (the ref's first card) */
    expect(closureOffer({ times: [NOW - 70 * DAY], windowClosedMs: NOW - 120 * DAY, now: NOW, dismissed: false }).show).toBe(false);
    expect(closureOffer({ times: [NOW - 10 * DAY], windowClosedMs: null, now: NOW, dismissed: false }).show).toBe(false);
  });

  it("it states the accumulated facts and no verdict", () => {
    const o = closureOffer({ times: [NOW - 400 * DAY, NOW - 300 * DAY], windowClosedMs: closed, now: NOW, dismissed: false });
    expect(o.facts).toBe("Two nudges, no reply, and 14 months since the window closed.");
    expect(o.facts).not.toMatch(/time to|unlikely|move on|give up|probably|should/i);
    expect(closureOffer({ times: [NOW - 400 * DAY], windowClosedMs: closed, now: NOW, dismissed: false }).facts)
      .toBe("One nudge, no reply, and 14 months since the window closed.");
  });

  /* §5d — the one stored thing in the section */
  it("keeping tracking ends it permanently", () => {
    const inp = { times: [NOW - 400 * DAY], windowClosedMs: closed, now: NOW };
    expect(closureOffer({ ...inp, dismissed: false }).show).toBe(true);
    expect(closureOffer({ ...inp, dismissed: true }).show, "the offer came back after being dismissed").toBe(false);
  });

  it("the threshold is one stated figure", () => {
    expect(CLOSURE_OFFER_MONTHS).toBe(6);
    const justUnder = NOW - (CLOSURE_OFFER_MONTHS * 30.44 - 2) * DAY;
    const justOver = NOW - (CLOSURE_OFFER_MONTHS * 30.44 + 2) * DAY;
    expect(closureOffer({ times: [NOW - 300 * DAY], windowClosedMs: justUnder, now: NOW, dismissed: false }).show).toBe(false);
    expect(closureOffer({ times: [NOW - 300 * DAY], windowClosedMs: justOver, now: NOW, dismissed: false }).show).toBe(true);
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
