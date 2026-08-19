/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The timeline and the donut, rendered.
 *
 * ⚠️ THE EVENT MARKS ARE THE REASON THIS FILE EXISTS. The dev account this page was eyeballed
 * against has statuses but almost no `resultingStatus`-bearing activities, so it draws NO marks at
 * all — the screenshots could not show whether they work. A fixture can, and does.
 *
 * ⚠️ ROWS COME FROM `buildRows`, never hand-written. A literal `AnalyticsRow` is an input the app
 * cannot produce, and a test given one exercises a function nobody runs.
 *
 * ⚠️ THE CHARTS RENDER AT A FALLBACK WIDTH HERE, and that is deliberate rather than a limitation.
 * There is no layout in this repo's test environment, so a measured width would be 0 and every bar
 * would compute to zero height — a spec asserting against an invisible chart while passing. The
 * fallback is what makes these assertions mean something; the real width is measured in the
 * browser (tests/e2e/analyticsChain.measure.ts).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../../types";
import { buildRows, MAX_TIMELINE_MONTHS, statusBreakdown } from "../../lib/analytics";
import { SendingChart } from "./SendingChart";
import { StatusDonut } from "./StatusDonut";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const DAY = 86400000;
const daysAgo = (n: number) => new Date(NOW - n * DAY).toISOString();

let seq = 0;
const id = () => `c${++seq}`;
const AGENT = { id: "a1", userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "" } as Agent;

const query = (over: Partial<Query>): Query =>
  ({ id: id(), userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;

const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: id(), userId: "u", queryId, manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED,
     description: "", date, details: "", resultingStatus: status }) as unknown as Activity;

const build = (qs: Query[], acts: Activity[]) => buildRows(qs, acts, [AGENT], NOW);

/**
 * ⚠️ RENDERED INSIDE A ROUTER, because every mark on this page is now a door and the components
 * call `useNavigate`. Wrapping is what makes these specs exercise the SAME component the app
 * mounts — a props-only twin without the hook would be a different component that happens to look
 * the same.
 */
const inRouter = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/queries/analytics"]}>{node}</MemoryRouter>);
const timeline = (rows: ReturnType<typeof build>) =>
  inRouter(<SendingChart rows={rows} range="all" nowMs={NOW} />);
const donut = (rows: ReturnType<typeof build>) => inRouter(<StatusDonut rows={rows} />);

/* the diamond marks are the only <path> whose `d` starts with a move followed by four corners */
const markCount = (html: string) => (html.match(/class="an-mark"/g) ?? []).length;
const barCount = (html: string) => (html.match(/class="an-bar"/g) ?? []).length;

describe("the sending timeline", () => {
  it("draws a sent bar and a received bar for every month in the span", () => {
    const q = query({ status: QueryStatus.REJECTED, dateSent: daysAgo(70) });
    const rows = build([q], [rung(q.id, QueryStatus.QUERIED, daysAgo(70)), rung(q.id, QueryStatus.REJECTED, daysAgo(10))]);
    const html = timeline(rows);
    /* 70 days back from 19 Aug is 10 June, so the span is Jun · Jul · Aug — three months, two bars each */
    expect(barCount(html)).toBe(6);
    for (const m of ["Jun", "Jul", "Aug"]) expect(html).toContain(`>${m}</text>`);
  });

  it("⚠️ draws a mark in the month it ARRIVED, at that month's own x", () => {
    /* ⚠️ THE FIRST VERSION OF THIS TEST COUNTED MARKS AND WAS VACUOUS. Pinning every mark to its
       query's SEND month would have satisfied it exactly — both months are inside an all-time span,
       so the count is two either way. The claim is about WHERE the mark is drawn, so that is what
       is read: the mark's own x against the x of the month label it should sit above.

       The fault it guards is the plausible one — a full drawn against the send month puts the good
       news months before it happened, and the chart still looks perfectly reasonable. */
    const q = query({ status: QueryStatus.FULL_REQUESTED, dateSent: daysAgo(120) });
    const rows = build([q], [
      rung(q.id, QueryStatus.QUERIED, daysAgo(120)),
      rung(q.id, QueryStatus.FULL_REQUESTED, daysAgo(4)),
    ]);
    const sentMonth = new Date(rows[0].sentMs as number).getMonth();
    const arrivedMonth = new Date(rows[0].stageMs[QueryStatus.FULL_REQUESTED] as number).getMonth();
    expect(arrivedMonth, "the fixture does not span two months, so it cannot test this").not.toBe(sentMonth);

    const html = timeline(rows);
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    /** the x of a month's axis label — the centre of that month's slot */
    const labelX = (name: string) => {
      const m = new RegExp(`<text x="([\\d.]+)"[^>]*>${name}</text>`).exec(html);
      expect(m, `no axis label for ${name} — the span does not cover it`).toBeTruthy();
      return Number(m![1]);
    };
    /** the x of the one diamond, taken from its path's opening move */
    const mark = /class="an-mark"[^>]*d="M ([\d.]+) /.exec(html);
    expect(mark, "no event mark was drawn at all").toBeTruthy();
    const markX = Number(mark![1]);

    expect(markX, "the mark is not above the month the full request arrived in")
      .toBeCloseTo(labelX(MONTHS[arrivedMonth]), 1);
    expect(markX, "the mark sits above the month the query was SENT — it is drawn before it happened")
      .not.toBeCloseTo(labelX(MONTHS[sentMonth]), 1);
  });

  it("pins a full request and an offer to the months they arrived, and stacks two in one month", () => {
    const a = query({ status: QueryStatus.FULL_REQUESTED, dateSent: daysAgo(120) });
    const b = query({ status: QueryStatus.OFFER, dateSent: daysAgo(110) });
    const rows = build(
      [a, b],
      [
        rung(a.id, QueryStatus.QUERIED, daysAgo(120)),
        rung(a.id, QueryStatus.FULL_REQUESTED, daysAgo(8)),
        rung(b.id, QueryStatus.QUERIED, daysAgo(110)),
        rung(b.id, QueryStatus.OFFER, daysAgo(6)),
      ],
    );
    const html = timeline(rows);
    /* two marks, both in this month, so the second sits above the first */
    expect(markCount(html)).toBe(2);
    /* the offer is filled burgundy; the full is outlined on the page ground */
    expect(html).toContain('fill="#7c3a2a"');
    expect(html).toContain('fill="#fdfaf5"');
    /* each names its agent rather than a status code */
    expect(html).toContain("Alex Fenn");
    expect(html).toContain("Full requested");
    expect(html).toContain("Offer");
  });

  it("emits both marks when one query produced a full request and then an offer", () => {
    const q = query({ status: QueryStatus.OFFER, dateSent: daysAgo(200) });
    const rows = build([q], [
      rung(q.id, QueryStatus.QUERIED, daysAgo(200)),
      rung(q.id, QueryStatus.FULL_REQUESTED, daysAgo(60)),
      rung(q.id, QueryStatus.OFFER, daysAgo(9)),
    ]);
    expect(markCount(timeline(rows))).toBe(2);
  });

  it("draws no marks at all when nothing has been requested", () => {
    const q = query({ dateSent: daysAgo(20) });
    expect(markCount(timeline(build([q], [rung(q.id, QueryStatus.QUERIED, daysAgo(20))])))).toBe(0);
  });

  it("⚠️ states a truncated span instead of quietly showing less than everything", () => {
    const old = query({ dateSent: daysAgo(365 * 4) });
    const recent = query({ dateSent: daysAgo(3) });
    const html = timeline(build([old, recent], []));
    expect(html).toContain(`Showing the last ${MAX_TIMELINE_MONTHS} months`);
    expect(html).toContain("not drawn");
  });

  it("…and says nothing about truncation when the whole span is drawn", () => {
    expect(timeline(build([query({ dateSent: daysAgo(20) })], []))).not.toContain("not drawn");
  });

  it("names the marks in the legend — a diamond explains nothing on its own", () => {
    const html = timeline(build([query({ dateSent: daysAgo(20) })], []));
    expect(html).toContain("Queries sent");
    expect(html).toContain("Responses received");
    expect(html).toContain("Full requested");
    expect(html).toContain("Offer");
  });
});

describe("the status donut", () => {
  const oneOfEach = () => {
    const specs: [QueryStatus, number][] = [
      [QueryStatus.QUERIED, 1], [QueryStatus.PARTIAL_SENT, 1], [QueryStatus.FULL_SENT, 1],
      [QueryStatus.OFFER, 1], [QueryStatus.REJECTED, 1], [QueryStatus.WITHDRAWN, 1],
      [QueryStatus.NO_RESPONSE, 1],
    ];
    return build(specs.map(([status], i) => query({ status, dateSent: daysAgo(10 + i) })), []);
  };

  it("⚠️ draws FIVE roles at most, with partial and full folded into one", () => {
    /* Six roles put two segments of the SAME fill side by side on the ring — one region split by a
       hairline for no stated reason, and two list rows spending space on a distinction the colour
       did not make. The split lives in the stat strip and the funnel, where it is drawn. */
    const segments = statusBreakdown(oneOfEach());
    expect(segments.length).toBeLessThanOrEqual(5);
    expect(segments.map((s) => s.key)).toEqual(["open", "inplay", "offer", "pass", "elapsed"]);
    /* every fill on the ring is distinct — that is what makes the ring readable at all */
    expect(new Set(segments.map((s) => s.colour)).size).toBe(segments.length);
  });

  it("accounts for every query exactly once", () => {
    const rows = oneOfEach();
    const segments = statusBreakdown(rows);
    expect(segments.reduce((n, s) => n + s.count, 0)).toBe(rows.length);
    /* the partial and the full are the two in "requests in play" */
    expect(segments.find((s) => s.key === "inplay")!.count).toBe(2);
    /* rejected and withdrawn share the settled role, and the label says both */
    expect(segments.find((s) => s.key === "pass")!.count).toBe(2);
    expect(segments.find((s) => s.key === "pass")!.label).toBe("Pass or withdrawn");
  });

  it("renders the total, the labels and the counts", () => {
    const html = donut(oneOfEach());
    expect(html).toContain(">7</text>");
    expect(html).toContain("QUERIES");
    for (const label of ["Still out", "Requests in play", "Offer", "Pass or withdrawn", "Window elapsed"]) {
      expect(html).toContain(label);
    }
  });

  it("omits a role nobody is in rather than drawing it at zero", () => {
    const rows = build([query({ status: QueryStatus.QUERIED, dateSent: daysAgo(5) })], []);
    const html = donut(rows);
    expect(html).toContain("Still out");
    for (const absent of ["Requests in play", "Offer", "Pass or withdrawn", "Window elapsed"]) {
      expect(html, `${absent} is drawn on an account that has never been in it`).not.toContain(absent);
    }
  });

  it("states an empty period rather than drawing a ring of nothing", () => {
    const html = donut(build([], []));
    expect(html).toContain("No queries in this period");
    expect(html).not.toContain("an-arc");
  });

  it("gives every segment a spoken label, not only a colour", () => {
    /* ⚠️ THE TOOLTIP IS DECORATION; the aria-label carries the same three pieces, so the figures
       are not mouse-only. */
    const html = donut(oneOfEach());
    expect(html).toMatch(/aria-label="Still out\. \d+ of \d+ · \d+%\. Awaiting a first response"/);
  });
});
