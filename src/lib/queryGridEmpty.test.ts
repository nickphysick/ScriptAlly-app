/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE EMPTY STATES ARE A PARTITION, AND THE FILTERED CARD'S NUMBER IS THE TILE'S (Grid pass §6).
 *
 * The brief asks two things: each state renders in its condition and not the other; the filtered
 * card's numbers equal the tile counts. The first is asserted as a PROPERTY over every combination
 * of inputs, with a tally proving each outcome was reached — a partition that never produces one of
 * its parts proves nothing about that part. The second is two derivations against each other: the
 * card's count from `cardFacts`, the tile's from `quickCounts`, never either against a literal.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gridEmptyKind, waitingSummary, waitingLine, NEEDS_YOU, type WaitingSummary } from "./queryGridEmpty";
import { cardFacts, shortDate, turnFor, type Register } from "./queryCardFacts";
import { quickCounts } from "./queryCentreGrid";
import { ATTENTION_RANK } from "./queryAttentionSort";
import { QueryStatus, type Query } from "../types";

const TODAY = new Date("2026-09-11T12:00:00Z");
const iso = (d: number) => new Date(TODAY.getTime() - d * 86_400_000).toISOString();
let seq = 0;
const q = (o: Partial<Query>): Query =>
  ({ id: `q${++seq}`, userId: "u", manuscriptId: "m", agentId: "a", status: QueryStatus.QUERIED, dateSent: iso(10), ...o }) as Query;
/* ⚠️ `null` FOR "NO WINDOW STATED", NOT `undefined` — an explicit `undefined` argument takes the
   default, so the first draft of the windowless case quietly ran with eight weeks and failed. */
const factsOf = (qs: Query[], weeks: number | null = 8) =>
  qs.map((x) => cardFacts(x, TODAY, { agencyWeeks: weeks ?? undefined, agentName: "Harriet Vane" }));

describe("each empty state renders in its condition and not the other", () => {
  it("⚠️ as a property over every combination of inputs, not a list of examples", () => {
    const seen = { first: 0, filtered: 0, nomatch: 0, none: 0 };
    for (const total of [0, 1, 7])
      for (const visible of [0, 1, 7])
        for (const needsYou of [0, 2])
          for (const creating of [false, true])
            for (const ghost of [false, true]) {
              if (visible > total) continue; /* a view cannot show more than there is */
              const k = gridEmptyKind({ total, visible, needsYou, creating, ghost });
              const at = JSON.stringify({ total, visible, needsYou, creating, ghost });
              const empty = !ghost && visible === 0;
              expect(k === "first", at).toBe(empty && total === 0 && !creating);
              expect(k === "filtered", at).toBe(empty && total > 0 && needsYou === 0);
              expect(k === "nomatch", at).toBe(empty && total > 0 && needsYou > 0);
              seen[k ?? "none"] += 1;
            }
    for (const [kind, n] of Object.entries(seen)) expect(n, `no input ever produced "${kind}"`).toBeGreaterThan(0);
  });
});

describe("⚠️ the filtered card's number is the With-the-agent tile's", () => {
  /* a set where nothing waits on the writer — calm queried and sent, and the closed */
  const calm = [
    q({ status: QueryStatus.QUERIED, dateSent: iso(5) }),
    q({ status: QueryStatus.QUERIED, dateSent: iso(12) }),
    q({ status: QueryStatus.PARTIAL_SENT, dateSent: iso(40), partialSentDate: iso(6), lastStatusChange: iso(6) }),
    q({ status: QueryStatus.REJECTED, dateSent: iso(60), lastStatusChange: iso(20) }),
    q({ status: QueryStatus.WITHDRAWN, dateSent: iso(70), lastStatusChange: iso(30) }),
  ];

  it("the card's count from cardFacts and the tile's from quickCounts agree — and the card shows", () => {
    const s = waitingSummary(factsOf(calm));
    const tiles = quickCounts(calm.map((x) => turnFor(x.status as QueryStatus)));
    expect(s.needsYou, "the fixture has something waiting on the writer").toBe(0);
    expect(tiles.agent, "the fixture has nothing with an agent — this proves nothing").toBeGreaterThan(0);
    expect(s.withAgents).toBe(tiles.agent);
    expect(gridEmptyKind({ total: calm.length, visible: 0, needsYou: s.needsYou, creating: false, ghost: false })).toBe("filtered");
  });

  it("⚠️ one query waiting on the writer, in any of the three registers, makes it the no-match line", () => {
    const waiting: [Register, Query][] = [
      ["you", q({ status: QueryStatus.FULL_REQUESTED, lastStatusChange: iso(3) })],
      /* past a stated window — without one there is nothing to be past (queryCopy.test says why) */
      ["late", q({ status: QueryStatus.QUERIED, dateSent: iso(200) })],
      ["offer", q({ status: QueryStatus.OFFER, lastStatusChange: iso(2) })],
    ];
    for (const [reg, extra] of waiting) {
      const f = factsOf([...calm, extra]);
      expect(f[f.length - 1].register, "the fixture is not the register it names").toBe(reg);
      const s = waitingSummary(f);
      expect(s.needsYou).toBe(1);
      expect(gridEmptyKind({ total: f.length, visible: 0, needsYou: s.needsYou, creating: false, ghost: false })).toBe("nomatch");
    }
  });

  it("⚠️ 'needs you' is the attention sort's lead, not a second list", () => {
    /* two derivations against each other: the registers that sort above calm, and NEEDS_YOU */
    const leads = (Object.keys(ATTENTION_RANK) as Register[]).filter((r) => ATTENTION_RANK[r] < ATTENTION_RANK.calm);
    expect([...NEEDS_YOU].sort()).toEqual(leads.sort());
  });

  it("the date is the nearest stated one, and a query with no window adds none", () => {
    const f = factsOf([q({ dateSent: iso(5) }), q({ dateSent: iso(30) })]);
    expect(waitingSummary(f).nextExpectedMs).toBe(Math.min(...f.map((x) => x.expectedReply!.getTime())));
    const bare = waitingSummary(factsOf([q({ dateSent: iso(5) })], null));
    expect(bare).toEqual({ needsYou: 0, withAgents: 1, inWindow: 0, nextExpectedMs: null });
  });
});

describe("the factual line — the ref's sentence where it is true, a true one where it is not", () => {
  const S = (withAgents: number, inWindow: number, nextExpectedMs: number | null = null): WaitingSummary =>
    ({ needsYou: 0, withAgents, inWindow, nextExpectedMs });
  const at = new Date("2026-09-20T12:00:00Z").getTime();
  const day = shortDate(new Date(at));

  it("every query with an agent has a window: the ref's sentence, in the ref's shape", () => {
    expect(waitingLine(S(7, 7, at))).toBe(`7 queries are with agents and inside their windows. The next reply is expected on ${day}.`);
    expect(waitingLine(S(7, 7, at))).toMatch(/^\d+ queries are with agents and inside their windows\. The next reply is expected on \d+ \w+\.$/);
  });

  it("singular agrees with its verb", () => {
    expect(waitingLine(S(1, 1, at))).toBe(`1 query is with an agent and inside its window. The next reply is expected on ${day}.`);
    expect(waitingLine(S(1, 0))).toBe("1 query is with an agent.");
  });

  it("⚠️ a query nobody gave a window is never called inside one", () => {
    expect(waitingLine(S(4, 3, at))).toBe(`4 queries are with agents; 3 are inside their windows. The next reply is expected on ${day}.`);
    expect(waitingLine(S(4, 1, at))).toBe(`4 queries are with agents; 1 is inside its window. The next reply is expected on ${day}.`);
    expect(waitingLine(S(4, 0))).toBe("4 queries are with agents.");
  });

  it("nothing with an agent says nothing", () => {
    expect(waitingLine(S(0, 0))).toBeNull();
  });
});

describe("the copy prints no pronoun and no verdict", () => {
  /* ⚠️ COMMENTS STRIPPED FIRST — the prose explaining the rule would otherwise fail it */
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const files = ["src/lib/queryGridEmpty.ts", "src/components/queries/QueryEmptyCard.tsx"].map((f) => ({
    f,
    code: strip(readFileSync(join(process.cwd(), f), "utf8")),
  }));

  it("no gendered pronoun in anything either file can print", () => {
    for (const { f, code } of files)
      for (const w of ["his", "her", "hers", "she", "he"])
        expect(code, `${f} can print "${w}"`).not.toMatch(new RegExp(`\\b${w}\\b`, "i"));
  });

  it("no appraisal of the agent or the writer", () => {
    for (const { f, code } of files) {
      const literals = [...code.matchAll(/["'`]([^"'`\n]{4,160})["'`]/g)].map((m) => m[1].toLowerCase());
      for (const lit of literals)
        for (const w of ["should", "overdue", "still no", "finally", "at last", "too long", "already"])
          expect(lit, `${f} appraises: "${lit}"`).not.toContain(w);
    }
  });
});
