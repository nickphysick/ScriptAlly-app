/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THESE ASSERT THE COMPOSED SENTENCE, NEVER THE PARTS. A card's fault is never "the number was
 * wrong" — it is a true number under the wrong noun, or a date the caption contradicts. So the
 * cases read `sentenceText(...)` and the caption together, which is the only place either claim
 * actually exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryStatus } from "../types";
import type { Query } from "../types";
import {
  cardFacts,
  sentenceText,
  span,
  turnFor,
  turnWordFor,
  closedSentence,
  WRITER_TURN_ATTENTION_DAYS,
  stageFor,
} from "./queryCardFacts";
import { queryBucket } from "./queryAmbient";

const TODAY = new Date("2026-09-04T12:00:00Z");
const ago = (days: number) => new Date(TODAY.getTime() - days * 86_400_000).toISOString();

const q = (over: Partial<Query>): Query =>
  ({
    id: "q1",
    userId: "u1",
    manuscriptId: "m1",
    agentId: "a1",
    status: QueryStatus.QUERIED,
    dateSent: ago(30),
    ...over,
  }) as Query;

describe("span — days to 20, weeks to 69, then months", () => {
  it("holds at each boundary", () => {
    expect(span(1)).toEqual([1, "day"]);
    expect(span(20)).toEqual([20, "days"]);
    expect(span(21)).toEqual([3, "weeks"]);
    expect(span(69)).toEqual([10, "weeks"]);
    expect(span(70)).toEqual([2, "months"]);
  });
});

describe("turn — five courts, and the counts must partition", () => {
  it("maps every status", () => {
    expect(turnFor(QueryStatus.QUERIED)).toBe("sand");
    expect(turnFor(QueryStatus.PARTIAL_REQUESTED)).toBe("you");
    expect(turnFor(QueryStatus.FULL_REQUESTED)).toBe("you");
    expect(turnFor(QueryStatus.REVISE_RESUBMIT)).toBe("you");
    expect(turnFor(QueryStatus.PARTIAL_SENT)).toBe("agent");
    expect(turnFor(QueryStatus.FULL_SENT)).toBe("agent");
    expect(turnFor(QueryStatus.OFFER)).toBe("offer");
    expect(turnFor(QueryStatus.REJECTED)).toBe("closed");
    expect(turnFor(QueryStatus.WITHDRAWN)).toBe("closed");
    expect(turnFor(QueryStatus.NO_RESPONSE)).toBe("closed");
  });

  it("⚠️ every status has a turn — asserted over the ENUM, not a hand-written list", () => {
    /* A literal list here would go stale the day a status is added, and go stale silently. */
    const all = Object.values(QueryStatus);
    expect(all.length).toBeGreaterThan(3);
    for (const s of all) expect(["sand", "you", "agent", "offer", "closed"]).toContain(turnFor(s));
  });

  it("Queried and the deeper sends share a word; No Response keeps its own", () => {
    expect(turnWordFor(QueryStatus.QUERIED)).toBe("With the agent");
    expect(turnWordFor(QueryStatus.FULL_SENT)).toBe("With the agent");
    expect(turnWordFor(QueryStatus.FULL_REQUESTED)).toBe("With you");
    expect(turnWordFor(QueryStatus.OFFER)).toBe("Offer");
    expect(turnWordFor(QueryStatus.NO_RESPONSE)).toBe("No response");
    expect(turnWordFor(QueryStatus.REJECTED)).toBe("Closed");
  });
});

describe("the six sentence shapes", () => {
  it("agent-side, inside the window", () => {
    const f = cardFacts(q({ dateSent: ago(14) }), TODAY, { agencyWeeks: 8 });
    expect(sentenceText(f.sentence)).toBe("Reply expected by 16 Oct");
    expect(f.caption).toBe("14 days waiting");
    expect(f.attention).toBe(false);
    expect(f.leaf?.caption).toBe("sent");
  });

  it("agent-side, past the window — the marker and the nudge", () => {
    const f = cardFacts(q({ dateSent: ago(70) }), TODAY, { agencyWeeks: 8 });
    expect(sentenceText(f.sentence)).toBe("Reply was expected by 21 Aug — 14 days past");
    expect(f.caption).toBe("2 months waiting · nudge available");
    expect(f.attention).toBe(true);
  });

  it("⚠️ nobody stated a window — the card says so and invents nothing", () => {
    const f = cardFacts(q({ dateSent: ago(30) }), TODAY, { agencyWeeks: null });
    expect(sentenceText(f.sentence)).toBe("Waiting — no reply window stated");
    expect(f.expectedReply).toBeNull();
    expect(f.attention).toBe(false);
  });

  it("with you — the request, not yet sent", () => {
    const f = cardFacts(
      q({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(9), dateSent: ago(60) }),
      TODAY,
    );
    expect(sentenceText(f.sentence)).toBe("Full — not yet sent");
    expect(f.caption).toBe("9 days since request");
    expect(f.leaf?.caption).toBe("requested");
    expect(f.attention).toBe(false);
  });

  it("R&R reads Revisions", () => {
    const f = cardFacts(q({ status: QueryStatus.REVISE_RESUBMIT, lastStatusChange: ago(3) }), TODAY);
    expect(sentenceText(f.sentence)).toBe("Revisions — not yet sent");
  });

  it("an offer awaits the writer", () => {
    const f = cardFacts(q({ status: QueryStatus.OFFER, lastStatusChange: ago(2) }), TODAY);
    expect(sentenceText(f.sentence)).toBe("Awaiting your decision");
    expect(f.caption).toBe("2 days since offer");
    expect(f.leaf?.caption).toBe("received");
  });

  it("no response states the window it waited out", () => {
    const f = cardFacts(q({ status: QueryStatus.NO_RESPONSE, dateSent: ago(120) }), TODAY, { agencyWeeks: 8 });
    expect(sentenceText(f.sentence)).toBe("No reply — window was 8 weeks");
    expect(f.caption).toBe("4 months since sending");
    expect(f.leaf?.caption).toBe("sent");
  });

  it("closed reports how long the reply took", () => {
    const f = cardFacts(
      q({ status: QueryStatus.REJECTED, dateSent: ago(60), fullSentDate: ago(40), lastStatusChange: ago(5) }),
      TODAY,
    );
    expect(sentenceText(f.sentence)).toBe("Pass after full");
    expect(f.caption).toBe("replied after 5 weeks");
    expect(f.leaf?.caption).toBe("closed");
  });
});

describe("⚠️ the leaf caption is ONE word for a partial send, never 'partial sent'", () => {
  it("holds for both deeper sends", () => {
    for (const status of [QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      const f = cardFacts(q({ status, partialSentDate: ago(10), lastStatusChange: ago(10) }), TODAY, {
        agencyWeeks: 12,
      });
      expect(f.leaf?.caption).toBe("sent");
    }
  });
});

describe("the attention marker flips at exactly the named constant", () => {
  it("is 14, and 14 is not yet late", () => {
    expect(WRITER_TURN_ATTENTION_DAYS).toBe(14);
    const at = cardFacts(
      q({ status: QueryStatus.PARTIAL_REQUESTED, lastStatusChange: ago(WRITER_TURN_ATTENTION_DAYS) }),
      TODAY,
    );
    const past = cardFacts(
      q({ status: QueryStatus.PARTIAL_REQUESTED, lastStatusChange: ago(WRITER_TURN_ATTENTION_DAYS + 1) }),
      TODAY,
    );
    expect(at.attention).toBe(false);
    expect(past.attention).toBe(true);
  });
});

describe("the writer's own expected date beats the agency's window", () => {
  it("⚠️ and it is READ through resolveExpectedDate, not re-derived here", () => {
    const withOverride = q({
      dateSent: ago(30),
      writerExpectedDate: "2026-12-25",
      writerExpectedSetAt: TODAY.toISOString(),
    } as Partial<Query>);
    const f = cardFacts(withOverride, TODAY, { agencyWeeks: 8 });
    expect(sentenceText(f.sentence)).toBe("Reply expected by 25 Dec");
    expect(f.expectedSource).toBe("writer");

    /* Same query, no override: the agency's window is what shows. */
    const plain = cardFacts(q({ dateSent: ago(30) }), TODAY, { agencyWeeks: 8 });
    expect(plain.expectedSource).toBe("agent");
    expect(sentenceText(plain.sentence)).not.toBe(sentenceText(f.sentence));
  });
});

describe("closedSentence — the token never reaches the card", () => {
  it("maps the tokens and derives the rejection stage from recomputeQuery output", () => {
    expect(closedSentence({ status: QueryStatus.WITHDRAWN } as Query)).toBe("Withdrawn by you");
    expect(closedSentence({ status: QueryStatus.REJECTED, closingReason: "agentClosedSubmissions" } as Query)).toBe(
      "Agency closed to submissions",
    );
    expect(closedSentence({ status: QueryStatus.REJECTED, fullSentDate: ago(1) } as Query)).toBe("Pass after full");
    expect(closedSentence({ status: QueryStatus.REJECTED, partialSentDate: ago(1) } as Query)).toBe("Pass after partial");
    expect(closedSentence({ status: QueryStatus.REJECTED } as Query)).toBe("Pass");
  });

  it("⚠️ never prints a raw internal token", () => {
    const tokens = ["noResponseAfterWindow", "withdrew", "agentClosedSubmissions", "other"];
    for (const t of tokens) {
      const out = closedSentence({ status: QueryStatus.REJECTED, closingReason: t } as Query);
      expect(out).not.toContain(t);
      expect(out).not.toMatch(/[a-z][A-Z]/); /* no camelCase survives */
    }
  });
});

describe("materials — four slots, and unrecorded is not empty", () => {
  it("routes every item through formatQueryMaterial into its slot", () => {
    const f = cardFacts(q({ materialsWanted: ["Query letter", "Synopsis", "First 3 chapters"] }), TODAY);
    expect(f.materialsRecorded).toBe(true);
    /* ⚠️ THE VALUE IS `Sent` WHERE THERE IS NO QUANTITY — it is the value COLUMN, and a column
       that repeats its own row label ("Synopsis · Synopsis") states nothing. Supersedes an earlier
       assertion here that pinned the formatted label. */
    expect(f.materials.queryLetter).toBe("Sent");
    expect(f.materials.synopsis).toBe("Sent");
    /* a quantity IS the value — that is the one thing worth showing */
    expect(f.materials.sample).toBe("First 3 chapters");
    expect(f.materials.other).toBeNull();
  });

  it("⚠️ nothing recorded is its own state — the card draws no cluster at all", () => {
    expect(cardFacts(q({}), TODAY).materialsRecorded).toBe(false);
    expect(cardFacts(q({ materialsWanted: [] }), TODAY).materialsRecorded).toBe(false);
  });
});

describe("⚠️ the copy reports and never appraises", () => {
  it("carries no verdict vocabulary in any shape", () => {
    const cases: Query[] = [
      q({ dateSent: ago(14) }),
      q({ dateSent: ago(200) }),
      q({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(40) }),
      q({ status: QueryStatus.OFFER, lastStatusChange: ago(2) }),
      q({ status: QueryStatus.NO_RESPONSE, dateSent: ago(200) }),
      q({ status: QueryStatus.REJECTED, fullSentDate: ago(40), lastStatusChange: ago(5) }),
    ];
    expect(cases.length).toBeGreaterThan(3);
    const banned = /\b(only|already|still|good|bad|slow|fast|poor|overdue|late|finally|unfortunately)\b/i;
    for (const c of cases) {
      const f = cardFacts(c, TODAY, { agencyWeeks: 8 });
      const all = `${sentenceText(f.sentence)} ${f.caption} ${f.turnWord}`;
      expect(all, `appraises: "${all}"`).not.toMatch(banned);
    }
  });
});

/**
 * ⚠️ `turnFor` IS A REFINEMENT OF `queryBucket`, AND THIS IS THE LOCK THAT KEEPS IT ONE.
 *
 * The app already partitions statuses by whose move it is: `queryBucket` → `move | waiting |
 * closed`, which is the CTA engine's own split and is read by `getPrimaryAction`, the Query Centre
 * filter pills, `queriesPulse`, the To-do board and Analytics. `turnFor` is a FIFTH vocabulary over
 * the same statuses, and a second membership table is exactly how two counts of one thing come to
 * disagree.
 *
 * It is not merged, because the two answer different questions: `queryBucket` asks whose move it
 * is, `turnFor` asks what the card should look like — which needs Queried distinguished from a
 * partial already out, and an offer distinguished from a rejection. But the refinement must be
 * EXACT, and these assert it over the enum rather than over a fixture.
 *
 * ⚠️ THE ASSERTION IS BETWEEN TWO DERIVATIONS, NEVER AGAINST A LITERAL LIST ON BOTH SIDES. A pair
 * of hand-written tables would go green the day someone edited both in the same wrong direction.
 */
describe("⚠️ turnFor refines queryBucket exactly — one membership, two granularities", () => {
  it("every status agrees, in both directions", () => {
    const all = Object.values(QueryStatus);
    expect(all.length).toBeGreaterThan(3);
    for (const s of all) {
      const turn = turnFor(s);
      const bucket = queryBucket(s);
      if (bucket === "move") {
        expect(turn, `${s}: queryBucket says move, turnFor says ${turn}`).toBe("you");
      } else if (bucket === "waiting") {
        expect(["sand", "agent"], `${s}: queryBucket says waiting, turnFor says ${turn}`).toContain(turn);
      } else {
        expect(["offer", "closed"], `${s}: queryBucket says closed, turnFor says ${turn}`).toContain(turn);
      }
    }
  });

  it("and no court leaks across a bucket boundary", () => {
    for (const s of Object.values(QueryStatus)) {
      const turn = turnFor(s);
      if (turn === "you") expect(queryBucket(s)).toBe("move");
      if (turn === "sand" || turn === "agent") expect(queryBucket(s)).toBe("waiting");
      if (turn === "offer" || turn === "closed") expect(queryBucket(s)).toBe("closed");
    }
  });

  /**
   * ⚠️ THE ONE PLACE THE GRID DELIBERATELY DEPARTS, STATED RATHER THAN LEFT TO BE NOTICED.
   *
   * `queryBucket` files an Offer under `closed`; the grid gives it its own court and its own quick
   * filter, because the ref does and because an offer is the least closed thing that can happen to
   * a query. So the grid's "Closed" pill is NOT `queryBucket("closed")` — it is that set minus the
   * offers, and anyone reconciling a grid count against a bucket count must subtract them.
   *
   * The agent list already reads it this way ("terminal is exactly Rejected/Withdrawn/No Response,
   * so Offer counts as ACTIVE"), so the grid agrees with that surface and not with `queryBucket`.
   * Flagged in `reports/query-centre-build.md`; a decision for Nick, not a bug to fix in passing.
   */
  it("Offer is the documented divergence, and it is the ONLY one", () => {
    expect(queryBucket(QueryStatus.OFFER)).toBe("closed");
    expect(turnFor(QueryStatus.OFFER)).toBe("offer");

    const divergent = Object.values(QueryStatus).filter(
      (s) => queryBucket(s) === "closed" && turnFor(s) !== "closed",
    );
    expect(divergent, `unexpected divergence: ${divergent.join(", ")}`).toEqual([QueryStatus.OFFER]);
  });
});

/**
 * ⚠️ THE LADDER IS A PROGRESSION, AND THAT IS WHAT IS ASSERTED — not eight literals. A test that
 * pinned the eight hex values would pass the day someone shuffled them, because each would still be
 * "a colour". The claims worth making are that every status lands on a rung, that the two ladders
 * run in the right direction, and that the mapping agrees with the court split it sits inside.
 */
describe("⚠️ the stage ladder — eight rungs, and depth means distance travelled", () => {
  it("maps every status, and the ref's mapping exactly", () => {
    expect(stageFor(QueryStatus.QUERIED)).toBe("out-1");
    expect(stageFor(QueryStatus.PARTIAL_SENT)).toBe("out-2");
    expect(stageFor(QueryStatus.FULL_SENT)).toBe("out-3");
    expect(stageFor(QueryStatus.PARTIAL_REQUESTED)).toBe("in-1");
    expect(stageFor(QueryStatus.FULL_REQUESTED)).toBe("in-2");
    expect(stageFor(QueryStatus.REVISE_RESUBMIT)).toBe("in-3");
    expect(stageFor(QueryStatus.OFFER)).toBe("offer");
    expect(stageFor(QueryStatus.REJECTED)).toBe("closed");
    expect(stageFor(QueryStatus.WITHDRAWN)).toBe("closed");
    expect(stageFor(QueryStatus.NO_RESPONSE)).toBe("closed");
  });

  it("⚠️ every status reaches a rung — asserted over the ENUM, never a list", () => {
    const rungs = ["out-1", "out-2", "out-3", "in-1", "in-2", "in-3", "offer", "closed"];
    const all = Object.values(QueryStatus);
    expect(all.length).toBeGreaterThan(3);
    for (const s of all) expect(rungs, `${s} has no rung`).toContain(stageFor(s));
  });

  it("⚠️ the rung agrees with the court — the ladder refines `turnFor`, it does not contradict it", () => {
    for (const s of Object.values(QueryStatus)) {
      const stage = stageFor(s), turn = turnFor(s);
      if (stage.startsWith("out-")) expect(["sand", "agent"], `${s}`).toContain(turn);
      if (stage.startsWith("in-")) expect(turn, `${s}`).toBe("you");
      if (stage === "offer") expect(turn).toBe("offer");
      if (stage === "closed") expect(turn).toBe("closed");
    }
  });

  it("the ladders run in the right direction — deeper means further along", () => {
    /* OUT deepens as the query travels away; IN deepens as more is asked of the writer. */
    const out = [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT].map(stageFor);
    const inn = [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT].map(stageFor);
    expect(out).toEqual(["out-1", "out-2", "out-3"]);
    expect(inn).toEqual(["in-1", "in-2", "in-3"]);
    /* ⚠️ AND QUERIED IS RUNG ONE, NOT A TINTLESS SPECIAL CASE. The retired scheme gave it parchment
       and no tint at all; the ladder gives it the palest sage, which is what makes Queried and Full
       Sent distinguishable — the whole reason the ladder replaced the courts. */
    expect(stageFor(QueryStatus.QUERIED)).not.toBe(stageFor(QueryStatus.FULL_SENT));
  });

  it("cardFacts carries the stage, and it is the same function's answer", () => {
    for (const s of Object.values(QueryStatus)) {
      const f = cardFacts({ ...q({}), status: s }, TODAY, { agencyWeeks: 8 });
      expect(f.stage, `cardFacts disagrees with stageFor for ${s}`).toBe(stageFor(s));
    }
  });

  it("⚠️ all eight rungs are declared, flat, and nothing reads a retired turn token", () => {
    const f12 = readFileSync(resolve(__dirname, "../components/shell/f12.css"), "utf8");
    const decls = f12.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const k of ["out-1", "out-2", "out-3", "in-1", "in-2", "in-3", "offer", "closed"]) {
      expect(decls, `--stage-${k} is not declared`).toMatch(new RegExp(`--stage-${k}\\s*:\\s*#[0-9a-f]{6}`, "i"));
    }
    expect(decls, "a retired turn token is still declared").not.toMatch(/--turn-[a-z-]+\s*:/);
  });
});

/**
 * ⚠️ A DECIDED OFFER — and the mechanism is the one that already existed, not a new field.
 *
 * `offerDecision.ts` has written `OFFER_ACCEPTED` / `OFFER_DECLINED` activities since July. The
 * brief proposed an optional `decision` field on the Offer activity, "written by the existing
 * Record decision surface if one exists" — one does, so no field was added and the caller derives
 * the answer from the activities it already holds.
 */
describe("⚠️ a decided offer reads as closed, without rewriting the record", () => {
  const offer = () => q({ status: QueryStatus.OFFER, lastStatusChange: ago(3) });

  it("undecided is slate and awaits the writer", () => {
    const f = cardFacts(offer(), TODAY);
    expect(f.stage).toBe("offer");
    expect(f.turn).toBe("offer");
    expect(f.turnWord).toBe("Offer");
    expect(sentenceText(f.sentence)).toBe("Awaiting your decision");
  });

  it("accepted goes grey and names the decision", () => {
    const f = cardFacts(offer(), TODAY, { offerDecision: "accepted" });
    expect(f.stage).toBe("closed");
    expect(f.turn).toBe("closed");
    expect(f.turnWord).toBe("Closed");
    expect(sentenceText(f.sentence)).toBe("Offer accepted");
  });

  it("declined goes grey and names the decision", () => {
    const f = cardFacts(offer(), TODAY, { offerDecision: "declined" });
    expect(f.stage).toBe("closed");
    expect(sentenceText(f.sentence)).toBe("Offer declined");
  });

  it("⚠️ a DECLINED offer that recompute has already withdrawn still says 'Offer declined'", () => {
    /* `offerDecision.ts` puts `resultingStatus: WITHDRAWN` on the declined activity, so the stored
       status closes itself. Without the decision the card would say "Withdrawn by you" — true, and
       silent about the offer, which is the more useful fact. */
    const withdrawn = q({ status: QueryStatus.WITHDRAWN, lastStatusChange: ago(2), dateSent: ago(60) });
    expect(sentenceText(cardFacts(withdrawn, TODAY).sentence)).toBe("Withdrawn by you");
    expect(sentenceText(cardFacts(withdrawn, TODAY, { offerDecision: "declined" }).sentence)).toBe("Offer declined");
  });

  it("⚠️ it changes the CARD and nothing else — no status is rewritten", () => {
    const before = offer();
    const f = cardFacts(before, TODAY, { offerDecision: "accepted" });
    expect(before.status, "cardFacts mutated the query").toBe(QueryStatus.OFFER);
    expect(f.stage).toBe("closed");
    /* and the derivation is still pure: same input, same answer */
    expect(cardFacts(offer(), TODAY, { offerDecision: "accepted" }).stage).toBe("closed");
  });

  it("⚠️ a decision on a NON-offer is ignored — it cannot close a live query", () => {
    /* The flag comes from the caller; a stray one must not grey out a Full Sent. */
    const live = q({ status: QueryStatus.FULL_SENT, fullSentDate: ago(10), lastStatusChange: ago(10) });
    const f = cardFacts(live, TODAY, { offerDecision: "accepted", agencyWeeks: 12 });
    expect(f.stage).toBe("out-3");
    expect(f.turn).toBe("agent");
  });
});

/**
 * ⚠️ THE CLOSED CAPTION STATES AN INTERVAL ONLY WHEN THERE IS ONE TO STATE.
 *
 * Found by dumping two Rejected cards that Nick reported as rendering wrong. They were not
 * leafless and their spacing was fine — they printed "replied after 0 days", because
 * `lastStatusChange` was absent, the leaf fell back to `dateSent`, and the interval was measured
 * from the send to itself. A confident false figure, which is worse than a gap.
 */
describe("⚠️ a closed card does not invent how long the reply took", () => {
  it("says nothing when there is no last activity to measure to", () => {
    const f = cardFacts(q({ status: QueryStatus.REJECTED, dateSent: ago(60) }), TODAY);
    expect(sentenceText(f.sentence)).toBe("Pass");
    expect(f.caption, "the card invented an interval").toBe("");
  });

  it("⚠️ and NEVER says '0 days' — the exact string that reached the page", () => {
    for (const over of [
      { status: QueryStatus.REJECTED, dateSent: ago(60) },
      { status: QueryStatus.WITHDRAWN, dateSent: ago(10) },
      { status: QueryStatus.REJECTED, dateSent: ago(1) },
    ]) {
      const f = cardFacts(q(over), TODAY);
      expect(f.caption, `"${f.caption}" for ${over.status}`).not.toMatch(/\b0 days?\b/);
    }
  });

  it("a REAL same-day reply is a different fact, and is said", () => {
    /* equality alone cannot tell "same day" from "unknown" — the FIELD can. */
    const sameDay = q({ status: QueryStatus.REJECTED, dateSent: ago(30), lastStatusChange: ago(30) });
    expect(cardFacts(sameDay, TODAY).caption).toBe("replied the same day");
  });

  it("a real interval is still stated", () => {
    const f = cardFacts(q({ status: QueryStatus.REJECTED, dateSent: ago(60), lastStatusChange: ago(25) }), TODAY);
    expect(f.caption).toBe("replied after 5 weeks");
  });

  it("⚠️ the leaf is present either way — there is no leafless variant", () => {
    /* The reported symptom was a missing leaf. It never was one: the leaf falls back to the send
       date, which is why the interval came out as zero rather than the card coming out empty. */
    for (const over of [
      { status: QueryStatus.REJECTED, dateSent: ago(60) },
      { status: QueryStatus.REJECTED, dateSent: ago(60), lastStatusChange: ago(25) },
    ]) {
      const f = cardFacts(q(over), TODAY);
      expect(f.leaf, "a closed card rendered no leaf").not.toBeNull();
      /* ⚠️ THE CAPTION FOLLOWS THE DATE THE LEAF IS ACTUALLY SHOWING. With no `lastStatusChange`
         the leaf falls back to the SEND, so it says `sent` — the send date under the word `closed`
         would be a true date beneath a false label. */
      expect(f.leaf!.caption).toBe(over.lastStatusChange ? "closed" : "sent");
    }
  });
});


describe("⚠️ the value column never repeats its own label", () => {
  it("no slot's value equals the row name it sits beside", () => {
    const f = cardFacts(q({ materialsWanted: ["Query letter", "Synopsis", "First 3 chapters", "Marketing plan"] }), TODAY);
    const names: Record<string, string> = {
      queryLetter: "Query letter", synopsis: "Synopsis", sample: "Opening sample", other: "Other",
    };
    for (const [k, v] of Object.entries(f.materials)) {
      if (!v) continue;
      expect(v.toLowerCase(), `${k} repeats its label`).not.toBe(names[k].toLowerCase());
    }
  });

  it("`other` keeps its free text, digit or no digit", () => {
    /* ⚠️ THE TEXT MUST CARRY NO MATERIAL KEYWORD. "A one-page pitch" classifies as `sample` —
       `classifyQueryMaterial` matches on "page" — so it was testing the wrong slot. That is the
       parser's documented substring behaviour, not a fault here, but it is a trap for a fixture. */
    const f = cardFacts(q({ materialsWanted: ["Marketing plan"] }), TODAY);
    expect(f.materials.other).toBe("Marketing plan");
  });

  it("⚠️ a quantity survives; a bare material becomes `Sent`", () => {
    const withQty = cardFacts(q({ materialsWanted: ["First 50 pages"] }), TODAY);
    expect(withQty.materials.sample).toBe("First 50 pages");
    const bare = cardFacts(q({ materialsWanted: ["Synopsis"] }), TODAY);
    expect(bare.materials.synopsis).toBe("Sent");
  });
});

describe("⚠️ an unknown defining date shows the send, and says nothing about elapsed time", () => {
  it("a closed query with no last activity: leaf = sent date, caption silent", () => {
    const f = cardFacts(q({ status: QueryStatus.REJECTED, dateSent: ago(40) }), TODAY);
    expect(f.leaf!.caption).toBe("sent");
    expect(f.caption, "it reported an interval it does not know").toBe("");
  });

  it("with a real last activity it says both", () => {
    const f = cardFacts(q({ status: QueryStatus.REJECTED, dateSent: ago(40), lastStatusChange: ago(5) }), TODAY);
    expect(f.leaf!.caption).toBe("closed");
    expect(f.caption).toBe("replied after 5 weeks");
  });

  it("⚠️ and the same for a request that has no dated activity", () => {
    /* `requested` over the SEND date would date the agent's request to the day you wrote to them. */
    const f = cardFacts(q({ status: QueryStatus.FULL_REQUESTED, dateSent: ago(40) }), TODAY);
    expect(f.leaf!.caption).toBe("sent");
  });
});
