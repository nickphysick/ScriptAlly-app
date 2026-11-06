/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB2 (unit half) — Dashboard v2's pure parts. The geometry and the hover are measured on the running page
 * (tests/e2e/dashV2.measure.ts); here: the band's contents, the week figures against the ledger, the breakdown's sum,
 * the change wording, the date labels, the notes record and the Next up reason.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { Dash2Band } from "./Dash2Band";
import { nextReason } from "./Dash2Next";
import { RANK_MIN } from "../../../lib/foundingBand";
import { EDGE, HEADROOM, PLOT_H } from "./Dash2Active";
import { TIERS } from "../../../lib/foundingStats";
import { breakdownFor, changeText, dash2Weeks, dateLabels, indexActivities, visibleWeeks, weekAria, wholeWeeksQuerying, weeksTag } from "../../../lib/dash2";
import { aggregateLedger, dailyLedger } from "../../../lib/oneScreen";
import { latestNote, noteFrom, noNotesLine } from "../../../lib/foundingNotes";
import type { ListItem } from "../../../lib/dashList";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import { QueryStatus, type Agent, type Manuscript, type Query, type User } from "../../../types";

const NOW = new Date(2026, 9, 29, 12);
const MS = { id: "ms-1", title: "Murphy's Day Out", genre: "Fantasy" } as unknown as Manuscript;
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const q = (id: string, status: QueryStatus, sentDaysAgo: number, extra: Partial<Query> = {}): Query =>
  ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent: day(sentDaysAgo), ...extra } as unknown as Query);
/* a spread of stages over ten weeks, built in an order none of the derivations sorts by */
const QS: Query[] = [
  q("q5", QueryStatus.FULL_SENT, 20), q("q1", QueryStatus.QUERIED, 66), q("q7", QueryStatus.REJECTED, 50, { lastStatusChange: day(30) } as Partial<Query>),
  q("q3", QueryStatus.PARTIAL_REQUESTED, 40), q("q2", QueryStatus.QUERIED, 8), q("q6", QueryStatus.OFFER, 35), q("q4", QueryStatus.PARTIAL_SENT, 12),
];
const AGENTS = [{ id: "a1", name: "Nadia Hussain", agency: "Hussain Literary" } as unknown as Agent];
const page = (queries: Query[] = QS) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={queries} agents={AGENTS} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={{ id: "u1", name: "Bethany Carter" } as unknown as User} activeManuscript={MS} onNavigate={() => {}} now={NOW} />
  </MemoryRouter>,
);

describe("DB21-A · the weeks-querying tag", () => {
  it("counts WHOLE weeks since the manuscript's first send, by calendar day", () => {
    expect(wholeWeeksQuerying(QS, NOW)).toBe(9); // first send 66 days ago
    expect(wholeWeeksQuerying([q("x", QueryStatus.QUERIED, 6)], NOW)).toBe(0);
    expect(wholeWeeksQuerying([q("x", QueryStatus.QUERIED, 7)], NOW)).toBe(1);
    expect(wholeWeeksQuerying([q("x", QueryStatus.QUERIED, 13)], NOW)).toBe(1);
    expect(wholeWeeksQuerying([q("x", QueryStatus.QUERIED, 14)], NOW)).toBe(2);
    expect(wholeWeeksQuerying([], NOW)).toBe(null);
    expect(wholeWeeksQuerying([{ ...q("x", QueryStatus.QUERIED, 0), dateSent: undefined } as unknown as Query], NOW)).toBe(null);
  });
  it("reads '1 week querying' in the singular", () => {
    expect(weeksTag(1)).toBe("1 week querying");
    expect(weeksTag(153)).toBe("153 weeks querying");
  });
  it("sits above the title in the band, and is absent with no send", () => {
    const html = renderToStaticMarkup(<Dash2Band loading={false} title="T" author="A" buttons weeks={3} onLog={() => {}} onRecord={() => {}} onAddAgent={() => {}} />);
    expect(html.indexOf("3 weeks querying")).toBeGreaterThan(-1);
    expect(html.indexOf("3 weeks querying")).toBeLessThan(html.indexOf('data-d2="title"'));
    const none = renderToStaticMarkup(<Dash2Band loading={false} title="T" author="A" buttons={false} weeks={null} onLog={() => {}} onRecord={() => {}} onAddAgent={() => {}} />);
    expect(none).not.toContain("querying");
    expect(page()).toContain("9 weeks querying");
    expect(page([])).not.toContain("weeks querying");
  });
});

describe("DB21-B · Active queries is the chart only", () => {
  it("no tiles, and the chart's dimensions are v2.1's", () => {
    const html = page();
    /* RE-POINTED (v2.2): the chart is followed by Closed queries in the middle column, no longer by the founding card */
    const card = html.slice(html.indexOf('data-d2-card="active"'), html.indexOf('data-d60="closed-hoop"'));
    expect(card.length).toBeGreaterThan(100);
    for (const gone of ["waiting on you", "have replied", "weeks querying", 'data-d2="tiles"']) expect(card, gone).not.toContain(gone);
    /* RE-POINTED (v2.2 Part B): the plot is 270px; the edge and Active's headroom are v2.1's */
    expect([PLOT_H, EDGE, HEADROOM]).toEqual([270, 22, 1.35]);
  });
});

describe("DB2-A · the band", () => {
  it("is the title, then 'by {author}', then the three actions — and no status label", () => {
    const html = renderToStaticMarkup(<Dash2Band loading={false} title="Murphy's Day Out" author="Bethany Carter" buttons onLog={() => {}} onRecord={() => {}} onAddAgent={() => {}} />);
    expect(html.indexOf("Murphy&#x27;s Day Out")).toBeLessThan(html.indexOf("by Bethany Carter"));
    for (const w of ["Log a query", "Record a response", "Add an agent"]) expect(html).toContain(w);
    for (const w of ["Querying", "QUERYING", "Getting ready", "Between rounds"]) expect(html).not.toContain(w);
  });
  it("the page renders it before the grid, and no Top tip, Scout, goal sheet, footer or feed tab", () => {
    const html = page();
    expect(html.indexOf('data-d2="band"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-d2="band"')).toBeLessThan(html.indexOf('data-d2="grid"'));
    for (const gone of ["Top tip", 'data-df1="tip"', 'data-df1="scout"', 'data-df1="goal"', 'data-df1="footer"', "d59-tab", 'data-d58="shadow"']) expect(html, gone).not.toContain(gone);
  });
});

describe("DB2-C · the weeks", () => {
  it("each circle's figure is the ledger's weekly stock, and the last is this week", () => {
    const weeks = dash2Weeks(QS, NOW);
    const ledger = aggregateLedger(dailyLedger([...QS], NOW), "weekly");
    expect(weeks.length).toBeGreaterThan(5);
    expect(weeks.map((w) => w.total)).toEqual(ledger.map((p) => p.active));
    expect(weeks.at(-1)!.now).toBe(true);
    expect(weeks.slice(0, -1).every((w) => !w.now)).toBe(true);
  });
  it("the breakdown's rows sum to its total, which is the circle's figure, in every week", () => {
    const weeks = dash2Weeks(QS, NOW);
    const idx = indexActivities([]);
    const seen = new Set<string>();
    weeks.forEach((w, i) => {
      const b = breakdownFor(QS, idx, w.atMs, i > 0 ? weeks[i - 1].atMs : null, NOW);
      expect(b.rows.reduce((n, r) => n + r.n, 0)).toBe(b.total);
      expect(b.total).toBe(w.total);
      for (const r of b.rows) if (r.n > 0) seen.add(r.key);
    });
    /* the fixture enters every stage group, so a fold that drops one cannot pass */
    expect([...seen].sort()).toEqual(["full", "partial", "queried"]);
  });
  it("says the change on last week as the brief writes it", () => {
    expect([changeText(3), changeText(-2), changeText(0)]).toEqual(["+3 on last week", "−2 on last week", "no change"]);
  });
  it("names each circle", () => expect(weekAria("3 Aug", 14)).toBe("Week of 3 Aug: 14 active queries"));
  it("labels five dates: the first, three between, and Today", () => {
    const w = Array.from({ length: 13 }, (_, i) => ({ label: `d${i}` }));
    expect(dateLabels(w).map((l) => l.text)).toEqual(["d0", "d3", "d6", "d9", "Today"]);
    expect(dateLabels(w.slice(0, 2)).map((l) => l.text)).toEqual(["d0", "Today"]);
  });
  it("keeps the latest weeks that fit 30px apart", () => {
    const w = Array.from({ length: 40 }, (_, i) => i);
    expect(visibleWeeks(w, 396)).toEqual(w.slice(-13));
    expect(visibleWeeks(w, 2000).length).toBe(40);
  });
});

describe("DB2-D · the founding card", () => {
  it("the ranks' note counts are the server's own tiers", () => {
    expect(RANK_MIN).toEqual([0, ...TIERS.map((t) => t.min)]);
  });
  it("maps a stored note: kind, title before message, and what became of it", () => {
    expect(noteFrom({ kind: "An idea", message: "Could the reply window show on the agent card?", status: "built", createdAt: 5 }))
      .toEqual({ tag: "Idea", text: "Could the reply window show on the agent card?", sentMs: 5, outcome: "Now in the app" });
    expect(noteFrom({ kind: "Something's broken", message: "x", title: "The chart froze" })?.text).toBe("The chart froze");
    expect(noteFrom({ kind: "Something I liked", message: "y" })?.outcome).toBe("Sent");
    expect(noteFrom({ kind: "Nonsense", message: "z" })).toBe(null);
    expect(latestNote([{ kind: "An idea", message: "old", createdAt: 1 }, { kind: "An idea", message: "new", createdAt: 9 }])?.text).toBe("new");
    expect(noNotesLine("Fledgling")).toBe("Your first note counts towards Fledgling.");
  });
});

/* RETIRED (v2.2 Part C): DB21-C held v2.1's hero line and progress ring. The band has no ring, and its words are
   lib/foundingBand's, held over every rank in foundingBand.test.ts (and on the page by DB22 C1). */

describe("DB2-B · Next up's reason", () => {
  it("says how long there has been no reply, and in rose how long since the window ended", () => {
    const now = NOW.getTime();
    const item = { group: "quiet", action: { kind: "drawer", request: { mode: "close", queryId: "q1" } } } as unknown as ListItem;
    const ctx = { qcRows: [{ id: "q1", sentMs: now - 33 * 7 * 86_400_000, stageStartMs: null, expectedMs: now - 9 * 7 * 86_400_000 }], nowMs: now } as unknown as TaskCtx;
    expect(nextReason(item, ctx, null)).toEqual({ said: "no reply in 33 weeks", past: "window ended 9 weeks ago" });
  });
});
