/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The counts reconcile (board fixes II, Phase 5).
 *
 * ⚠️ CARDS ARE THE UNIT, AND THE ASSERTIONS RUN AGAINST THE RENDERED DOM. The page used to show
 * three figures from three derivations in two units — the subtitle summed the tiles (members:
 * every agent inside a sweep counted loose), the FILTERS panel counted the raw lanes (members
 * again, and structurally blind to the flags-built Snoozed), and the columns drew collapsed
 * sweeps. 42 / 27 / fourteen, each "correct" in its own unit, none describing the board. The
 * fix was ONE derivation (boardColumns, hoisted) read by all three — so this suite renders the
 * actual board from one input and requires every figure to equal what the DOM contains.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { Query, Agent } from "../../types";
import {
  boardColumns, sweepCardFor, liveBoardCards, boardFigures, boardSubtitleCopy, cardWeight, columnWeight,
} from "../../lib/todoColumns";
import { facetCounts } from "../../lib/todoBoardSort";
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const TODAY = "2026-08-06";
const NOW = Date.parse("2026-08-06T12:00:00Z");

/** A board with every shape in play: two urgent, a five-member sweep (ONE card), a loose stale
 *  card, a user task, a committed card, a sleeping flag, and a cleared done card. */
function fixture() {
  const sweepMembers = ["m1", "m2", "m3", "m4", "m5"].map((k) =>
    card({ key: k, stream: "hk", hk: true, taskType: "data_quality_poor" }));
  const input = {
    board: {
      do: [
        card({ key: "offer", taskType: "offer_received", kind: "OFFER" }),
        card({ key: "full", taskType: "full_requested", kind: "AGENT WAITING", committedDate: TODAY }),
      ],
      hk: [
        ...sweepMembers,
        card({ key: "stale", stream: "hk" as const, taskType: "no_response_close", kind: "STALE" }),
      ],
      nt: [card({ key: "task", stream: "nt" as const, userTaskId: "u1", nature: "task" as const, kind: "YOUR TASK" })],
      cleared: [card({ key: "cleared", stream: "done" as const, done: true, kind: "DONE" })],
    },
    flags: [{ id: "f1", userId: "u", taskType: "no_response_close", queryId: "q9", snoozeCount: 1, snoozedUntil: "2026-08-08T00:00:00Z" }],
    queries: [{ id: "q9", agentId: "a9", status: "Query Sent" } as unknown as Query],
    agents: [{ id: "a9", name: "Marcus Reed", agency: "Reed Literary" } as unknown as Agent],
    sweeps: [sweepCardFor("dq_materials", "Materials", sweepMembers.length, sweepMembers.map((m) => m.key))],
    today: TODAY,
    nowMs: NOW,
  };
  return { input, cols: boardColumns(input) };
}

describe("⚠️ Everything == To do + Today + Snoozed — against the RENDERED DOM", () => {
  const { cols } = fixture();
  const html = renderToStaticMarkup(
    <TodoBoard columns={cols} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
  );
  // the four column sections, in TODO_COLUMNS order
  const sections = html.split("<section").slice(1);
  const articles = (s: string) => (s.match(/<article/g) ?? []).length;

  it("the fixture exercises every shape: sweep collapsed, snoozed from flags, done present", () => {
    expect(sections).toHaveLength(4);
    // To do: offer + stale + user task + ONE sweep card (five members) = 4 cards
    expect(articles(sections[0])).toBe(4);
    expect(sections[0]).toContain("5 TO FIX"); // the member figure lives INSIDE the sweep card
    // Today: the committed full
    expect(articles(sections[1])).toBe(1);
    // Snoozed: rebuilt from the sleeping flag
    expect(articles(sections[2])).toBe(1);
    expect(sections[2]).toContain("Marcus Reed");
    // Done: the cleared card
    expect(articles(sections[3])).toBe(1);
  });

  it("⚠️ the Everything count equals the rendered To do + Today + Snoozed", () => {
    const rendered = articles(sections[0]) + articles(sections[1]) + articles(sections[2]);
    expect(facetCounts(liveBoardCards(cols)).all).toBe(rendered);
    expect(rendered).toBe(6);
  });

  it("⚠️ the subtitle's figure equals the same — and speaks in CARDS", () => {
    const f = boardFigures(cols);
    expect(f.cards).toBe(articles(sections[0]) + articles(sections[1]) + articles(sections[2]));
    // urgent = the pink family among them: the offer + the committed full
    expect(f.urgent).toBe(2);
    expect(boardSubtitleCopy(f)).toBe("Everything waiting on you — six cards, two urgent.");
  });

  it("⚠️ the filter counts SUM to Everything — one card, one facet, a partition", () => {
    const c = facetCounts(liveBoardCards(cols));
    expect(c.urgent + c.housekeeping + c.yours).toBe(c.all);
    // and the split is the family map's own: 2 urgent · sweep + stale + snoozed = 3 hk · 1 yours
    expect([c.urgent, c.housekeeping, c.yours]).toEqual([2, 3, 1]);
  });

  it("⚠️ Done stays OUTSIDE every live figure — it is the day's record, not work waiting", () => {
    const live = liveBoardCards(cols);
    expect(live.some((c) => c.done)).toBe(false);
    expect(facetCounts(live).all).toBe(6); // the done card would make 7
  });

  it("the member unit survives where it belongs: cardWeight bridges card to items", () => {
    const sweep = cols.todo.find((c) => c.key === "sweep-dq_materials")!;
    expect(cardWeight(sweep)).toBe(5);
    expect(columnWeight(cols.todo)).toBe(3 + 5); // three singles + the sweep's five
  });
});

describe("the copy, at its edges", () => {
  it("zero and singular read as sentences, twelve spells, thirteen does not", () => {
    expect(boardSubtitleCopy({ cards: 0, urgent: 0 })).toBe("Nothing waiting on you.");
    expect(boardSubtitleCopy({ cards: 1, urgent: 0 })).toBe("Everything waiting on you — one card.");
    expect(boardSubtitleCopy({ cards: 12, urgent: 1 })).toBe("Everything waiting on you — twelve cards, one urgent.");
    expect(boardSubtitleCopy({ cards: 13, urgent: 13 })).toBe("Everything waiting on you — 13 cards, 13 urgent.");
  });

  it("⚠️ the page reads THESE helpers — three figures, one derivation", () => {
    expect(page).toContain("boardSubtitleCopy(boardFigures(boardCols))");
    expect(page).toContain("counts={facetCounts(liveBoardCards(boardCols))}");
    // renderBoard renders the SAME hoisted object
    const fn = page.slice(page.indexOf("function renderBoard"), page.indexOf("function renderBoard") + 900);
    expect(fn).toContain("applyFacet(boardCols.todo, facet)");
    /* the old member-unit SUBTITLE is extinct. (`tiles` itself survives, deliberately, for the
       desk state and the assistant band — surfaces whose subject genuinely is items, not cards.) */
    // tasks-pages P1 renamed the neighbour: anchor restated per the slice law
    expect(page).toContain("function renderTools");
    const sub = page.slice(page.indexOf("function boardSubtitle"), page.indexOf("function renderTools"));
    expect(sub).not.toContain("tiles.");
  });
});
