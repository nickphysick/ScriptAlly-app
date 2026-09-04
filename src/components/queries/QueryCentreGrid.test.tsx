/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CLAIMS ARE ABOUT THE ARRANGEMENT — which is the one thing querying each card cannot see.
 * Grouping partitions; headings run in a stated order; the FLIP's key attribute is on every card
 * or the whole mechanism silently does nothing. The MOTION itself is not asserted here: this suite
 * runs in `node` with no layout, so "the card travelled" is a measurement, not a render test.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryCentreGrid, type GridCard } from "./QueryCentreGrid";
import { QueryStatus } from "../../types";
import type { Query } from "../../types";
import { cardFacts } from "../../lib/queryCardFacts";
import type { GroupKey } from "../../lib/queryCentreGrid";

const src = readFileSync(join(process.cwd(), "src/components/queries/QueryCentreGrid.tsx"), "utf8");
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const TODAY = new Date("2026-09-04T12:00:00Z");
const ago = (d: number) => new Date(TODAY.getTime() - d * 86_400_000).toISOString();

const card = (id: string, over: Partial<Query> = {}, agency = "Stillwater", name = "Vane-Coe"): GridCard => {
  const q = { id, userId: "u", manuscriptId: "m", agentId: "a", status: QueryStatus.QUERIED, dateSent: ago(20), ...over } as Query;
  const facts = cardFacts(q, TODAY, { agencyWeeks: 8 });
  return {
    id, status: q.status, turn: facts.turn, name, agency, initials: "VC",
    lastMs: new Date(q.lastStatusChange ?? q.dateSent!).getTime(),
    sentMs: new Date(q.dateSent!).getTime(),
    expectedMs: facts.expectedReply?.getTime() ?? null,
    facts,
  };
};

const html = (rows: GridCard[], group: GroupKey = "none") =>
  renderToStaticMarkup(<QueryCentreGrid rows={rows} group={group} />);

describe("⚠️ every card carries the FLIP's key, or the mechanism silently does nothing", () => {
  it("data-qcc-id is on each card, and the component reads that exact key", () => {
    const out = html([card("q1"), card("q2"), card("q3")]);
    expect(out.match(/data-qcc-id="/g)).toHaveLength(3);
    /* The selector and the dataset key must agree — the pair is one decision, and a mismatch
       returns an empty rect map and animates nothing. */
    expect(decls(src)).toContain('const SELECTOR = "[data-qcc-id]"');
    expect(decls(src)).toContain('const DATA_KEY = "qccId"');
  });

  it("⚠️ and the DOM is never written during render — measureFlip settles before it reads", () => {
    const body = decls(src).slice(decls(src).indexOf("const stageRef"));
    const effect = body.indexOf("useLayoutEffect");
    expect(effect, "the layout effect is gone").toBeGreaterThan(-1);
    /* Every FLIP call sits inside an effect. A call before it would run in the render body. */
    for (const fn of ["measureFlip(", "playFlip(", "clearFlip("]) {
      const first = body.indexOf(fn);
      expect(first, `${fn} is not called at all`).toBeGreaterThan(-1);
      expect(first, `${fn} runs during render`).toBeGreaterThan(effect);
    }
  });
});

describe("grouping partitions — it never drops or duplicates a card", () => {
  const rows = [
    card("a", { status: QueryStatus.QUERIED }),
    card("b", { status: QueryStatus.FULL_REQUESTED, lastStatusChange: ago(3) }),
    card("c", { status: QueryStatus.OFFER, lastStatusChange: ago(1) }),
    card("d", { status: QueryStatus.REJECTED, lastStatusChange: ago(1) }),
    card("e", { status: QueryStatus.FULL_SENT, fullSentDate: ago(9), lastStatusChange: ago(9) }),
  ];

  it("⚠️ every grouping renders every card exactly once", () => {
    for (const g of ["none", "turn", "status", "agency", "month"] as GroupKey[]) {
      const out = html(rows, g);
      const ids = out.match(/data-qcc-id="([^"]+)"/g) ?? [];
      expect(ids, `${g} lost or duplicated a card`).toHaveLength(rows.length);
      expect(new Set(ids).size, `${g} duplicated a card`).toBe(rows.length);
    }
  });

  it("⚠️ the heading counts sum to the row count — a heading cannot overstate its own group", () => {
    for (const g of ["turn", "status"] as GroupKey[]) {
      const out = html(rows, g);
      const counts = [...out.matchAll(/qcc-sech-n">(\d+)</g)].map((m) => Number(m[1]));
      expect(counts.length, `${g} rendered no headings`).toBeGreaterThan(1);
      expect(counts.reduce((a, b) => a + b, 0), `${g} headings do not sum`).toBe(rows.length);
    }
  });

  it("whose-court headings appear in working order, not alphabetically", () => {
    const out = html(rows, "turn");
    const heads = [...out.matchAll(/qcc-sech-tx">([^<]+)</g)].map((m) => m[1]);
    expect(heads.length).toBeGreaterThan(2);
    expect(heads[0]).toBe("With you");
    expect(heads[heads.length - 1]).toBe("Closed");
  });

  it("None renders one grid and no headings at all", () => {
    const out = html(rows, "none");
    expect(out).not.toContain("qcc-sech");
    expect(out.match(/qcc-grid/g)).toHaveLength(1);
  });
});

describe("⚠️ the grid does not filter, sort or derive — it renders what it is handed", () => {
  it("row order survives exactly, so the flat view cannot disagree with the list", () => {
    const rows = [card("z"), card("a"), card("m")];
    const out = html(rows);
    const ids = [...out.matchAll(/data-qcc-id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["z", "a", "m"]);
  });

  it("⚠️ and grouping does not re-order within a group", () => {
    const rows = [card("z"), card("a"), card("m")];
    const out = html(rows, "agency");
    const ids = [...out.matchAll(/data-qcc-id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids, "grouping applied a second ordering pass").toEqual(["z", "a", "m"]);
  });

  it("no filtering, no row sort and no facts derivation lives in this file", () => {
    const d = decls(src);
    /* The page owns all three. A grid that did any of them is the second data path that lets the
       two views show different sets of the same queries. */
    for (const banned of ["compareRows", "matchesGridFilters", "cardFacts(", "queryBucket"]) {
      expect(d, `the grid derives its own ${banned}`).not.toContain(banned);
    }
    /* ⚠️ `rows` SPECIFICALLY IS NEVER RE-ORDERED OR NARROWED. The file DOES sort — the group
       HEADINGS, which is its own job — so a bare ban on `.sort(` would forbid the legitimate call
       and say nothing about the one that matters. */
    expect(d).not.toMatch(/\brows\s*\.\s*(sort|filter|reverse|toSorted)\s*\(/);
    expect(d, "headings must still be ordered").toContain("compareGroupLabels");
  });
});
