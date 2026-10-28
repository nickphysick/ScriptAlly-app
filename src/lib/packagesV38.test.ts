/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v38 — the pure derivations behind the labels, the drawer and Results (L4, L5's unit half).
 */
import { describe, expect, it } from "vitest";
import {
  bandTotals, bestPiece, drawerLine, drawerStatus, EMPTY_FIG, labelStatus, libTabFromParam, MIN_SENDS_FOR_CLAIM,
  packageShowcases, rankByMore, ringOf, thresholdWords, type Fig, type Item,
} from "./packagesV38";
import { split } from "./packageReplies";

const fig = (sent: number, more: number, answered: number, extra: Partial<Fig> = {}): Fig => ({
  ...EMPTY_FIG, sent, more, answered, replies: answered, pct: sent ? Math.round((more / sent) * 100) : null,
  ranked: answered >= MIN_SENDS_FOR_CLAIM, ...extra,
});
const it_ = (id: string, f: Fig, retired = false): Item => ({ id, name: id, f, retired });

describe("the threshold is packageReplies' own", () => {
  it("is four answers, in words for the copy", () => {
    expect(MIN_SENDS_FOR_CLAIM).toBe(4);
    expect(thresholdWords()).toBe("four");
  });
});

describe("labels", () => {
  it("states the share only once ranked", () => {
    expect(labelStatus(fig(10, 4, 6), false)).toBe("40% asked for more");
    expect(labelStatus(fig(3, 1, 2), false)).toBe("Too early");
    expect(labelStatus(EMPTY_FIG, false)).toBe("Not sent yet");
    expect(labelStatus(fig(10, 4, 6), true)).toBe("Retired");
  });
  it("draws the ring to match", () => {
    expect(ringOf(fig(10, 4, 6))).toEqual({ k: "rate", pct: 40 });
    expect(ringOf(fig(3, 1, 2))).toEqual({ k: "early" });
    expect(ringOf(EMPTY_FIG)).toEqual({ k: "none" });
  });
});

describe("the drawer's words", () => {
  it("states the stage, retired first", () => {
    expect(drawerStatus({ retired: false, sent: true, ready: true })).toMatch(/^Out with agents since its first query\. Locked/);
    expect(drawerStatus({ retired: false, sent: false, ready: true })).toBe("Ready to send. Pick it when you log a query.");
    expect(drawerStatus({ retired: false, sent: false, ready: false })).toBe("Draft. It needs a letter and pages.");
    expect(drawerStatus({ retired: true, sent: true, ready: true })).toMatch(/^Retired\. Out with agents/);
  });
  it("names the average only once ranked", () => {
    expect(drawerLine(fig(10, 4, 6), 20)).toBe("4 of 10 agents asked for more · you average 20%");
    expect(drawerLine(fig(3, 1, 2), 20)).toBe("1 of 3 agents asked for more");
  });
});

describe("L4 — no package appears in more than one Packages showcase", () => {
  const cases: Item[][] = [
    [it_("a", fig(10, 4, 6)), it_("b", fig(12, 2, 8)), it_("c", fig(2, 0, 1)), it_("d", EMPTY_FIG)],
    [it_("a", fig(10, 4, 6))],
    [it_("a", fig(10, 4, 6)), it_("b", fig(3, 1, 2))],
    [it_("a", fig(12, 4, 6)), it_("r", fig(20, 2, 9), true), it_("c", fig(3, 1, 2))],
    [it_("x", fig(2, 1, 1)), it_("y", fig(1, 0, 0))],
  ];
  for (const [i, pk] of cases.entries()) {
    it(`case ${i + 1}`, () => {
      const ids = packageShowcases(pk).map((s) => s.item.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  }
  it("fills the three slots by their rules", () => {
    const s = packageShowcases([it_("a", fig(10, 4, 6)), it_("b", fig(12, 2, 8)), it_("c", fig(2, 0, 1)), it_("d", EMPTY_FIG)]);
    expect(s.map((x) => `${x.k}:${x.item.id}`)).toEqual(["best:a", "most:b", "prove:c"]);
  });
  it("lets a retired package win Sent the most but never Still to prove", () => {
    const s = packageShowcases([it_("a", fig(12, 4, 6)), it_("r", fig(20, 2, 9), true), it_("c", fig(3, 1, 2))]);
    expect(s.map((x) => `${x.k}:${x.item.id}`)).toEqual(["best:a", "most:r", "prove:c"]);
  });
  it("leaves a slot out rather than padding it", () => {
    expect(packageShowcases([it_("a", fig(10, 4, 6))]).map((x) => x.k)).toEqual(["best"]);
    expect(packageShowcases([]).length).toBe(0);
  });
});

describe("L5 — nothing under the threshold is ever a winner", () => {
  it("skips a higher share that has too few answers", () => {
    const s = packageShowcases([it_("hi", fig(3, 3, 3)), it_("ok", fig(10, 2, 5))]);
    expect(s[0]).toMatchObject({ k: "best", item: { id: "ok" } });
  });
  it("has no best when nothing is ranked", () => {
    expect(packageShowcases([it_("x", fig(3, 3, 3))]).some((x) => x.k === "best")).toBe(false);
    expect(bestPiece([it_("x", fig(3, 3, 3))])).toBeNull();
  });
  it("hatches a too-early bar", () => {
    const b = bestPiece([it_("ok", fig(10, 2, 5)), it_("hi", fig(3, 3, 3))])!;
    expect(b.item.id).toBe("ok");
    expect(b.bars.find((x) => x.id === "hi")).toMatchObject({ w: null, v: "–" });
  });
  it("ranks ranked before unranked, then by share", () => {
    expect(rankByMore([it_("hi", fig(3, 3, 3)), it_("lo", fig(10, 1, 5)), it_("mid", fig(10, 3, 5))]).map((x) => x.id)).toEqual(["mid", "lo", "hi"]);
  });
});

describe("the band", () => {
  it("totals what packageReplies counted", () => {
    const s = split({ sent: 15, requests: 3, passes: 6, out: 4, noReply: 2, withdrawnEarly: 0 });
    expect(bandTotals(s)).toEqual({ sent: 15, replied: 60, more: 20 });
  });
  it("leaves out a query withdrawn before any answer, as packageReplies does", () => {
    const s = split({ sent: 6, requests: 2, passes: 1, out: 2, noReply: 0, withdrawnEarly: 1 });
    expect(bandTotals(s)).toEqual({ sent: 5, replied: 60, more: 40 });
  });
  it("is empty with nothing sent", () => {
    expect(bandTotals(split({ sent: 0, requests: 0, passes: 0, out: 0, noReply: 0, withdrawnEarly: 0 }))).toBeNull();
  });
});

describe("deep links", () => {
  it("maps every tab spelling onto Your materials", () => {
    expect(libTabFromParam("syn")).toBe("syn");
    expect(libTabFromParam("synopses")).toBe("syn");
    expect(libTabFromParam("let")).toBe("let");
    expect(libTabFromParam("ver")).toBe("ver");
    expect(libTabFromParam("pk")).toBeNull();
    expect(libTabFromParam(null)).toBeNull();
  });
});
