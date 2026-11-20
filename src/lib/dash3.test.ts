/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB3 (unit half) — Dashboard v3's derivations (lib/dash3). Layout is measured on the running page.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus, type Query } from "../types";
import { STAGE_COLOURS } from "./stageColours";
import { expectedBack, expectedHeading, goingHeading, goingSub, howItsGoing, moreLine, pastHeading, stageMarks, weekEndMs, withoutContradictions } from "./dash3";
import type { QcRow } from "./qcSummary";
import type { ListItem, ListPlan } from "./dashList";

const q = (id: string, status: QueryStatus, agentId = `ag-${id}`): Query => ({ id, status, agentId, manuscriptId: "ms-1", dateSent: "2026-09-01" } as unknown as Query);

describe("DB3-1 · the header's stage marks", () => {
  it("counts the current stage, partial and full each covering requested and sent, closed last, zeros dropped", () => {
    const qs = [
      q("a", QueryStatus.QUERIED), q("b", QueryStatus.QUERIED), q("c", QueryStatus.PARTIAL_REQUESTED), q("d", QueryStatus.PARTIAL_SENT),
      q("e", QueryStatus.FULL_SENT), q("f", QueryStatus.REVISE_RESUBMIT), q("g", QueryStatus.REJECTED), q("h", QueryStatus.NO_RESPONSE),
    ];
    expect(stageMarks(qs)).toEqual([{ stage: "queried", n: 2 }, { stage: "partial", n: 2 }, { stage: "full", n: 2 }, { stage: "closed", n: 2 }]);
  });
  it("day one draws no marks", () => expect(stageMarks([])).toEqual([]));
});

describe("DB3-3 · card heads read the one stage table", () => {
  it("every stage hex dash3.css restates is the table's", () => {
    const css = readFileSync(new URL("../components/dashboard/v3/dash3.css", import.meta.url), "utf8");
    const hexes = new Set((css.match(/#[0-9a-f]{6}\b/gi) ?? []).map((h) => h.toLowerCase()));
    const table = new Set(Object.values(STAGE_COLOURS).flatMap((c) => [c.band, c.tint, c.edge, c.mark]));
    /* page tokens the sheet may use besides the table: navy, paper, ink and the existing hairline */
    const page = new Set(["#2d3a50", "#fffaf3", "#1c130f", "#e3d5c9", "#ebe4da", "#ffffff", "#7d7067", "#5d5850", "#a0675a", "#ece6dc", "#f1ece4"]);
    for (const h of hexes) expect(table.has(h) || page.has(h), h).toBe(true);
  });
});

const NOW = new Date(2026, 10, 18, 12).getTime(); // Wed 18 Nov 2026
const DAY = 86_400_000;
const row = (id: string, expDays: number | null, court: QcRow["court"] = "agent", startDays = -40): QcRow =>
  ({ id, court, expectedMs: expDays == null ? null : NOW + expDays * DAY, stageStartMs: NOW + startDays * DAY, sentMs: NOW + startDays * DAY, agentName: `Agent ${id}`, agency: `Agency ${id}` } as unknown as QcRow);

describe("DB3-4b · Expected back reads only the Query Centre's clock", () => {
  it("this week runs to Sunday night; three soonest, two past oldest first, the rest counted", () => {
    expect(new Date(weekEndMs(NOW)).getDay()).toBe(1);
    const rows = [row("a", 1), row("b", 3), row("c", 2), row("d", 9), row("e", 30), row("p1", -5), row("p2", -40), row("p3", -1), row("x", null), row("y", 2, "you"), row("z", -9, "closed")];
    const e = expectedBack(rows, NOW);
    expect(e.thisWeek).toBe(3); // a (Thu), c (Fri), b (Sat)
    expect(e.soon.map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(e.soon[0].when).toBe("by Thu 19 Nov");
    expect(e.soon.every((r) => r.progress! > 0.9 && r.progress! <= 1)).toBe(true);
    expect(e.pastCount).toBe(3);
    expect(e.past.map((r) => r.id)).toEqual(["p2", "p1"]);
    expect(e.past[0].when).toBe("since 9 Oct");
    expect(e.past.every((r) => r.progress === null)).toBe(true);
    expect(e.more).toBe(2);
    expect([expectedHeading(e), pastHeading(3), moreLine(2)]).toEqual(["3 replies expected this week.", "3 are past their date", "2 more are within their reply window."]);
  });
  it("nothing due this week says so; one past reads in the singular", () => {
    const e = expectedBack([row("a", 20)], NOW);
    expect(expectedHeading(e)).toBe("Nothing due back this week.");
    expect([pastHeading(1), moreLine(1)]).toEqual(["1 is past its date", "1 more is within its reply window."]);
  });
  it("never says overdue, late or watching", () => {
    const src = readFileSync(new URL("./dash3.ts", import.meta.url), "utf8");
    /* the copy: every string and template literal (comments are not copy) */
    const copy = (src.match(/"[^"\n]*"|`[^`]*`/g) ?? []).join(" ");
    expect(copy).toContain("reply window");
    for (const w of [/\boverdue\b/i, /\blate\b/i, /\bwatch(ing)?\b/i, /keep an eye/i]) expect(copy, String(w)).not.toMatch(w);
  });
});

describe("DB3-4a · How it's going", () => {
  it("counts history rungs: sent, ever asked for more, ever an offer", () => {
    const qs = [
      q("a", QueryStatus.QUERIED), q("b", QueryStatus.PARTIAL_SENT), q("c", QueryStatus.FULL_REQUESTED), q("d", QueryStatus.REJECTED),
      { ...q("e", QueryStatus.REJECTED), fullRequestedDate: "2026-09-20" } as unknown as Query,
    ];
    const g = howItsGoing(qs, [], [], NOW);
    expect(g.sent).toBe(5);
    expect(g.offers).toBe(0);
    expect(g.asked).toBeGreaterThanOrEqual(2);
    expect(goingHeading({ sent: 23, asked: 2, full: 1, offers: 0, closedNoRequest: 3 })).toBe("2 of 23 agents asked to read more.");
    expect(goingSub({ sent: 23, asked: 2, full: 1, offers: 0, closedNoRequest: 3 })).toBe("One full and one partial. 3 queries closed without a request.");
    expect(goingSub({ sent: 6, asked: 1, full: 0, offers: 0, closedNoRequest: 0 })).toBe("One partial. Nothing closed yet.");
  });
});

describe("DB3-2 · Next up never contradicts itself for one agent", () => {
  const item = (key: string, group: ListItem["group"], qid: string) => ({ key, group, action: { kind: "drawer", request: { mode: "x", queryId: qid } } } as unknown as ListItem);
  it("an agent who asked for materials is never also a nudge or a close", () => {
    const items = [item("r1", "req", "q1"), item("n1", "nudge", "q2"), item("n2", "nudge", "q3"), item("c1", "quiet", "q4")];
    const plan = { groups: [{ key: "req", label: "", items: [items[0]] }, { key: "nudge", label: "", items: [items[1], items[2]] }, { key: "quiet", label: "", items: [items[3]] }], items, thenLabel: "Then", all: { label: "All", tab: "todo" } } as unknown as ListPlan;
    const queries = [{ id: "q1", agentId: "A" }, { id: "q2", agentId: "A" }, { id: "q3", agentId: "B" }, { id: "q4", agentId: "A" }];
    const out = withoutContradictions(plan, queries);
    expect(out.items.map((i) => i.key)).toEqual(["r1", "n2"]);
    expect(out.groups.map((g) => g.key)).toEqual(["req", "nudge"]);
    expect(withoutContradictions(plan, [{ id: "q1", agentId: "Z" }, ...queries.slice(1)])).toBe(plan);
  });
});
