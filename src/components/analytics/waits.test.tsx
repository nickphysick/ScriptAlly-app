/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The reply histogram and the aging chart, rendered.
 *
 * ⚠️ ROWS COME FROM `buildRows`, never hand-written — a literal `AnalyticsRow` is an input the app
 * cannot produce.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../../types";
import { buildRows, replyBuckets } from "../../lib/analytics";
import { ReplyHistogram, histogramNote } from "./ReplyHistogram";
import { AgingChart, agingNote } from "./AgingChart";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

let seq = 0;
const id = () => `w${++seq}`;

const agent = (over: Partial<Agent> = {}): Agent =>
  ({ id: id(), userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "", ...over }) as Agent;

const query = (agentId: string, over: Partial<Query> = {}): Query =>
  ({ id: id(), userId: "u", manuscriptId: "m1", agentId, packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;

const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: id(), userId: "u", queryId, manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED,
     description: "", date, details: "", resultingStatus: status }) as unknown as Activity;

/** A query answered `after` days later. */
function answered(a: Agent, sent: number, after: number, outcome = QueryStatus.REJECTED) {
  const q = query(a.id, { status: outcome, dateSent: daysAgo(sent) });
  return { q, acts: [rung(q.id, QueryStatus.QUERIED, daysAgo(sent)), rung(q.id, outcome, daysAgo(sent - after))] };
}
function open(a: Agent, sent: number) {
  const q = query(a.id, { dateSent: daysAgo(sent) });
  return { q, acts: [rung(q.id, QueryStatus.QUERIED, daysAgo(sent))] };
}
const build = (parts: { q: Query; acts: Activity[] }[], agents: Agent[]) =>
  buildRows(parts.map((p) => p.q), parts.flatMap((p) => p.acts), agents, NOW);

const histo = (rows: ReturnType<typeof build>) => renderToStaticMarkup(<ReplyHistogram rows={rows} />);
const aging = (rows: ReturnType<typeof build>) => renderToStaticMarkup(<AgingChart rows={rows} />);

describe("the reply-time histogram", () => {
  const A = agent();

  it("draws six bands and writes each count above its own bar", () => {
    const rows = build([answered(A, 100, 3), answered(A, 90, 3), answered(A, 80, 40)], [A]);
    const html = histo(rows);
    for (const label of ["&lt; 1 wk", "1–2 wk", "2–4 wk", "1–2 mo", "2–3 mo", "3 mo +"]) {
      expect(html).toContain(label);
    }
    /* the counts are drawn, not hidden behind a hover — two in one band, one in another */
    expect(html).toContain('class="an-barval">2</text>');
    expect(html).toContain('class="an-barval">1</text>');
  });

  it("⚠️ leaves an unanswered query out of every band", () => {
    const rows = build([open(A, 400), open(A, 3)], [A]);
    expect(replyBuckets(rows).reduce((n, b) => n + b.count, 0)).toBe(0);
    /* with nothing finished it states that, rather than drawing six empty bands */
    expect(histo(rows)).toContain("No replies have come back");
  });

  it("says fulls are excluded, on the page rather than only in the code", () => {
    const rows = build([answered(A, 50, 10)], [A]);
    expect(histo(rows)).toContain("Query responses only");
    expect(histo(rows)).toContain("Fulls under consideration");
  });

  it("puts the median and its sample in the band note, and says so when there is none", () => {
    expect(histogramNote(build([answered(A, 50, 10), answered(A, 40, 20), answered(A, 30, 30)], [A])))
      .toBe("Median wait: 20 days · 3 responses");
    expect(histogramNote(build([open(A, 10)], [A]))).toBe("No responses yet in this period");
  });
});

describe("the aging chart", () => {
  it("⚠️ places the SAME days-out at different points for different stated windows", () => {
    /* The whole reason the axis is normalised: 28 days is a full window at an agency that says
       four weeks and a quarter of one at an agency that says twelve. A days-elapsed axis draws
       them identically and points the writer at the wrong query. */
    const fast = agent({ name: "Quick Reader", responseTimeWeeks: 4 });
    const slow = agent({ name: "Slow Reader", responseTimeWeeks: 12 });
    const html = aging(build([open(fast, 28), open(slow, 28)], [fast, slow]));
    const xs = [...html.matchAll(/<circle cx="([\d.]+)"/g)].map((m) => Number(m[1]));
    expect(xs, "two dots were not drawn").toHaveLength(2);
    expect(xs[0], "the two queries share an x — the axis is counting days, not windows").not.toBeCloseTo(xs[1], 0);
  });

  it("gives a query past its window a heavier edge, and never a warning colour", () => {
    const a = agent({ responseTimeWeeks: 4 });
    const html = aging(build([open(a, 60), open(a, 3)], [a]));
    expect(html).toContain('stroke-width="1.7"');
    expect(html).toContain('stroke-width="1.1"');
    /* ⚠️ NOTHING RED. Running past a stated window is ordinary; a page that alarms about it is
       telling the writer to worry about something they cannot affect. */
    expect(html).not.toMatch(/#(e|f)[0-9a-f]?0{2}[0-9a-f]{0,3}\b/i);
    expect(html).not.toMatch(/\bred\b|crimson|#d00|#f00/i);
  });

  it("⚠️ grows to fit its lanes rather than drawing dots off the top", () => {
    /* ⚠️ FOUND ON THE REAL PAGE, NOT REASONED ABOUT. Everything past its window clamps to the same
       x, so six of seven landed in one column and the stack ran off a fixed 200px plot — dots at
       cy 2 with a radius of 9, half of them clipped. */
    const a = agent({ responseTimeWeeks: 4 });
    const many = Array.from({ length: 6 }, (_, i) => open(a, 200 + i));
    const html = aging(build(many, [a]));
    const h = Number(/<svg[^>]*height="(\d+)"/.exec(html)![1]);
    expect(h, "the chart did not grow for its lanes").toBeGreaterThan(200);
    const ys = [...html.matchAll(/<circle cx="[\d.]+" cy="([\d.]+)" r="9"/g)].map((m) => Number(m[1]));
    expect(ys, "not every query was drawn").toHaveLength(6);
    /* every dot fits inside the plot, radius included */
    for (const y of ys) expect(y, "a dot is clipped by the top of the chart").toBeGreaterThan(9);
  });

  it("⚠️ counts the open queries it cannot place instead of dropping them silently", () => {
    const stated = agent({ responseTimeWeeks: 8 });
    const silent = agent({ name: "No Window" });
    const html = aging(build([open(stated, 10), open(silent, 10), open(silent, 20)], [stated, silent]));
    expect(html).toContain("2 more queries are");
    expect(html).toContain("no reply window");
  });

  it("states the no-open-queries case, and the all-without-windows case differently", () => {
    const a = agent({ responseTimeWeeks: 8 });
    expect(aging(build([answered(a, 40, 10)], [a]))).toContain("Nothing is waiting on an agent");
    /* ⚠️ THE TWO EMPTY STATES HAVE DIFFERENT CAUSES AND SAY SO. "Nothing is out" and "everything
       out is with an agency that states no window" look identical on a chart and are not the same
       fact; one is quiet, the other is a gap in the agent records the writer can close. */
    const silent = agent({ name: "No Window" });
    const html = aging(build([open(silent, 10)], [silent]));
    expect(html).toContain("Nothing to place");
    expect(html).toContain("no reply window");
    expect(html).not.toContain("Nothing is waiting on an agent");
  });

  it("keeps the band note factual in both directions", () => {
    const a = agent({ responseTimeWeeks: 4 });
    expect(agingNote(build([open(a, 3)], [a]))).toBe("1 open · all within their agencies' stated windows");
    expect(agingNote(build([open(a, 3), open(a, 90)], [a]))).toBe("2 open · 1 past its agency's stated window");
    /* ⚠️ NEITHER BRANCH PRAISES OR WARNS — both simply say where things are. */
    for (const note of [agingNote(build([open(a, 3)], [a])), agingNote(build([open(a, 90)], [a]))]) {
      expect(note).not.toMatch(/\b(good|bad|late|overdue|worry|chase|should)\b/i);
    }
  });
});
