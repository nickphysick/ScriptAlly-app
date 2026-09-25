/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v11 — locks for the pure derivations (phase 1: the rail's height law).
 */
import { describe, expect, it } from "vitest";
import { RAIL_MAX, RAIL_MIN, RAIL_TOP_GAP, railHeight } from "./contactList";

describe("railHeight — the rail derives its height from its own measured top", () => {
  it("at rest the rail runs from its top to 16px above the fold", () => {
    /* the mock at 1440×900, unscrolled: top 92 → 900 − 92 − 16 = 792 */
    expect(railHeight(92, 900)).toBe(792);
  });

  it("pinned, the cap binds — the mock's own render, not the brief's bracket", () => {
    /* scrolled: sticky pins at 16 → 900 − 16 − 16 = 868, capped at 860 (measured on the mock;
       the brief's "16 → 884" disagrees with its own clamp and the render wins) */
    expect(railHeight(16, 900)).toBe(RAIL_MAX);
  });

  it("a short window floors at 360 rather than collapsing", () => {
    expect(railHeight(92, 300)).toBe(RAIL_MIN);
  });

  it("a top above the gap is clamped to the gap before the subtraction", () => {
    /* top 4 reads as the pinned 16 — the rail can never claim room above its own gap */
    expect(railHeight(4, 900)).toBe(railHeight(RAIL_TOP_GAP, 900));
  });

  it("a reading that cannot be a layout is refused, never written", () => {
    /* the page before layout, or a container under a loading cover — the dashboard's −115
       clamp is the standing precedent for why a sentinel must not become a height */
    expect(railHeight(NaN, 900)).toBeNull();
    expect(railHeight(92, 0)).toBeNull();
    expect(railHeight(92, -1)).toBeNull();
  });
});

/* ══ phase 2 — standing, cards, facts and the hero's placement ══════════════════════════════ */
import { buildQcRows } from "./qcSummary";
import {
  ART, HERO_CARD_W, agentRows, contactCensus, contactStanding, heroFacts, heroLayout,
  matchesCards, rowYourMove,
} from "./contactList";
import {
  CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_MANUSCRIPTS, CONTACT_FIXTURE_QUERIES,
} from "../components/agents/contactFixture";

/* ⚠️ THE INPUTS ARE PRODUCED, NEVER TYPED — rows come from `buildQcRows` over the contact
   fixture, exactly as the page builds them, so a hand-written court cannot drift from the real
   derivation (the house rule: a test that hands a function an input its callers cannot produce
   is testing a function nobody runs). 1 Sep 2026 puts fq-2 (Full Sent, 2 May, 12-week window)
   PAST its expected date while fq-1 (Queried, 10 Aug, 6-week window) is still inside its own —
   both union branches exercised, and the tally below proves it. */
const NOW = Date.parse("2026-09-01T12:00:00.000Z");
const rows = buildQcRows(CONTACT_FIXTURE_QUERIES, CONTACT_FIXTURE_AGENTS, [], NOW);
const MS = CONTACT_FIXTURE_MANUSCRIPTS[0];

describe("where you stand — the page-local union over the QC's own rows", () => {
  it("the union: with-you, offer, and agent-court-past-the-date; a waiting query is not yours", () => {
    const by = new Map(rows.map((r) => [r.id, r]));
    expect(rowYourMove(by.get("fq-4")!), "a partial request is the writer's move").toBe(true);
    expect(rowYourMove(by.get("fq-7")!), "an offer is the writer's decision").toBe(true);
    expect(by.get("fq-2")!.court, "precondition: Full Sent sits in the agent's court").toBe("agent");
    expect(by.get("fq-2")!.pastExpected, "precondition: fq-2 is past its window at NOW").toBe(true);
    expect(rowYourMove(by.get("fq-2")!), "past the expected date joins Your move (ruling a)").toBe(true);
    expect(by.get("fq-1")!.pastExpected, "precondition: fq-1 is still inside its window").toBe(false);
    expect(rowYourMove(by.get("fq-1")!), "a query inside its window stays the agent's").toBe(false);
  });

  it("standing: open beats closed, the latest close speaks, no rows means never", () => {
    expect(contactStanding(agentRows(rows, "fx-fresh", MS.id))).toEqual({ kind: "none" });
    expect(contactStanding(agentRows(rows, "fx-shut", MS.id))).toEqual({ kind: "closed", status: "Rejected" });
    /* fx-two holds a live Full Sent AND an old rejection — the live one wins the standing */
    expect(contactStanding(agentRows(rows, "fx-two", MS.id)).kind).toBe("open");
  });

  it("the census: counts sum to the list, the facts split their own populations", () => {
    const { cards, standing } = contactCensus(CONTACT_FIXTURE_AGENTS, rows, MS.id);
    const [active, never, closed] = cards;
    expect(active.count + never.count + closed.count, "the three cards partition the list").toBe(CONTACT_FIXTURE_AGENTS.length);
    expect(active.count, "open standings").toBe(5);
    expect(active.fact).toBe("4 your move");
    expect(active.urgent).toBe(true);
    expect(never.count, "fresh + sparse have no query").toBe(2);
    expect(never.fact).toBe("2 open now · 0 closed");
    expect(closed.count).toBe(1);
    expect(closed.fact).toBe("1 passed · 0 no reply");
    /* the selection is an OR; empty means everyone */
    const s = standing.get("fx-fresh")!;
    expect(matchesCards(new Set(), s)).toBe(true);
    expect(matchesCards(new Set(["never"]), s)).toBe(true);
    expect(matchesCards(new Set(["active", "closed"]), s)).toBe(false);
  });

  it("the facts sentence: totals, the genre as recorded (lowercased), and the fresh tail", () => {
    const { standing } = contactCensus(CONTACT_FIXTURE_AGENTS, rows, MS.id);
    const f = heroFacts(CONTACT_FIXTURE_AGENTS, standing, MS);
    expect(f.total).toBe(CONTACT_FIXTURE_AGENTS.length);
    expect(f.msTitle).toBe(MS.title);
    expect(f.genre).toBe(MS.genre.toLowerCase());
    expect(f.want, "genre matches over the whole list").toBeGreaterThan(0);
    expect(f.fresh, "the bold tail counts matches never queried").toBeLessThanOrEqual(f.want);
    /* no manuscript in scope → the sentence has no subject and no tail */
    const bare = heroFacts(CONTACT_FIXTURE_AGENTS, standing, null);
    expect(bare.msTitle).toBeNull();
    expect(bare.genre).toBeNull();
  });
});

describe("heroLayout — the mock's own chain, reproduced from the width", () => {
  /* the rendered mock at 1440×900 (hero W 804, card offsetHeight ≈ 417): c .804, s .56,
     imgLeft ≈ 383, cardLeft ≈ 300.6 — measured off the render, not read out of its source */
  it("side-by-side at W 804 reproduces the render", () => {
    const l = heroLayout({ W: 804, cardH0: 417, textH: 326 });
    expect(l.stacked).toBe(false);
    expect(l.pinned, "the chain clears the text column at 804 — no pin").toBe(false);
    expect(l.c).toBeCloseTo(0.804, 3);
    expect(l.s).toBeCloseTo(0.56, 3);
    expect(Math.round(l.imgLeft)).toBe(383);
    /* the probe's rect rounding sat 1px above the arithmetic (382.88 + 222.88 − 64.32 − 241.2);
       the formula is the mock's own chain and the RELATIONS below are the oracle */
    expect(Math.round(l.cardLeft)).toBe(300);
    expect(l.cardTop).toBe(14);
    expect(l.textW).toBe(Math.min(Math.round(804 * 0.34), 330));
  });

  it("the app's own 1440 column (W 758) stays side by side — the mock's 760 was its frame's fact", () => {
    const l = heroLayout({ W: 758, cardH0: 417, textH: 326 });
    expect(l.stacked).toBe(false);
    expect(l.pinned, "758 clears the text floor by 1.6px — unpinned").toBe(false);
    expect(l.cardLeft, "the card clears the text column").toBeGreaterThanOrEqual((l.textW as number) + Math.round(758 * 0.02));
  });

  it("stacked at W 644 reproduces the render (s .64, cardLeft ≈ 114)", () => {
    const l = heroLayout({ W: 644, cardH0: 417, textH: 47, titleRowH: 47 });
    expect(l.stacked).toBe(true);
    expect(l.c).toBe(0.8);
    expect(l.s).toBeCloseTo(0.64, 3);
    expect(Math.round(l.cardLeft)).toBe(113);
    expect(l.cardTop).toBe(47 + 9);
  });

  it("the pin branch: a narrow hero pins the card and re-solves the art's scale", () => {
    const l = heroLayout({ W: 500, cardH0: 417, textH: 40, titleRowH: 40 });
    expect(l.pinned).toBe(true);
    expect(l.cardLeft).toBe(0);
    /* the solved scale keeps the peek: drawn card right − card right ≈ 80c */
    const peek = l.imgLeft + ART.drawnCardRight * l.s - (l.cardLeft + HERO_CARD_W * l.c);
    expect(peek).toBeCloseTo(80 * l.c, 0);
  });

  it("the art's visible right edge lands on the column's right, by construction", () => {
    for (const W of [804, 700, 1000, 1250]) {
      const l = heroLayout({ W, cardH0: 417, textH: 300 });
      expect(l.imgLeft + ART.inkRight * l.s, `W ${W}`).toBeCloseTo(W, 6);
    }
  });

});
