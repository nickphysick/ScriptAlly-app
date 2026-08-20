/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fulls under consideration, and Latest responses.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../../types";
import { buildRows, latestResponses } from "../../lib/analytics";
import { AGENT_RESPONSE_STATUSES } from "../../lib/queryDerivation";
import { FullsPanel, fullsNote } from "./FullsPanel";
import { LatestResponses, latestResponsesNote } from "./LatestResponses";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

let seq = 0;
const id = () => `o${++seq}`;
const AGENT = { id: "a1", userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "" } as Agent;

const query = (over: Partial<Query> = {}): Query =>
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
const fulls = (rows: ReturnType<typeof build>) =>
  inRouter(<FullsPanel rows={rows} nowMs={NOW} />);
const responses = (rows: ReturnType<typeof build>) =>
  inRouter(<LatestResponses rows={rows} />);

describe("fulls under consideration", () => {
  it("lists a full that is out, longest first, with its dwell", () => {
    const a = query({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(200) });
    const b = query({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(100) });
    const rows = build([a, b], [
      rung(a.id, QueryStatus.FULL_SENT, daysAgo(150)),
      rung(b.id, QueryStatus.FULL_SENT, daysAgo(40)),
    ]);
    const html = fulls(rows);
    const dwells = [...html.matchAll(/an-fd"><b>(\d+)<\/b>/g)].map((m) => Number(m[1]));
    expect(dwells).toEqual([150, 40]);
    expect(fullsNote(rows, NOW)).toBe("2 fulls out");
  });

  it("⚠️ counts only a full that is actually on a desk", () => {
    /* Requested is not yet sent; a Revise & Resubmit has come back. Neither is under
       consideration, and counting either puts a manuscript somewhere it is not. */
    const asked = query({ status: QueryStatus.FULL_REQUESTED, dateSent: daysAgo(60) });
    const back = query({ status: QueryStatus.REVISE_RESUBMIT, dateSent: daysAgo(300) });
    const rows = build([asked, back], [
      rung(asked.id, QueryStatus.FULL_REQUESTED, daysAgo(40)),
      rung(back.id, QueryStatus.FULL_SENT, daysAgo(280)),
      rung(back.id, QueryStatus.REVISE_RESUBMIT, daysAgo(30)),
    ]);
    expect(fullsNote(rows, NOW)).toBe("");
    expect(fulls(rows)).toContain("No full manuscripts out");
  });

  it("reserves the illustration at final size in its empty state", () => {
    expect(fulls(build([], []))).toContain("an-illo--empty");
  });

  it("keeps the fulls clock separate from the query histogram, in words on the page", () => {
    const q = query({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(100) });
    expect(fulls(build([q], [rung(q.id, QueryStatus.FULL_SENT, daysAgo(60))])))
      .toContain("kept apart from query waits");
  });

  it("agrees in number with its own band note", () => {
    /* two derivations of one figure, asserted against each other rather than against a literal */
    const q = query({ status: QueryStatus.FULL_SENT, dateSent: daysAgo(90) });
    const rows = build([q], [rung(q.id, QueryStatus.FULL_SENT, daysAgo(50))]);
    const drawn = [...fulls(rows).matchAll(/an-fullrow/g)].length;
    expect(fullsNote(rows, NOW)).toBe(`${drawn} full out`);
  });
});

describe("latest responses", () => {
  it("⚠️ labels the row from the RESPONSE, not from where the query ended up", () => {
    /* ⚠️ FOUND ON THE RENDERED PAGE. A query drew a partial request in one month and was declined
       in another; the row is dated from the first, so labelling it from the query's CURRENT status
       puts the later outcome against the earlier date. The dev account had the ugliest version of
       it — a query marked "No Response" carrying a recorded rejection, listed as "Window elapsed",
       which describes the query and not the thing that arrived. */
    const q = query({ status: QueryStatus.REJECTED, dateSent: daysAgo(200) });
    const rows = build([q], [
      rung(q.id, QueryStatus.QUERIED, daysAgo(200)),
      rung(q.id, QueryStatus.PARTIAL_REQUESTED, daysAgo(160)),
      rung(q.id, QueryStatus.REJECTED, daysAgo(10)),
    ]);
    const html = responses(rows);
    expect(html, "the chip names the query's standing rather than the response").toContain("Partial request");
    expect(html).not.toContain("Pass");
    /* and the wait is to the FIRST response, not to the last event */
    expect(rows[0].replyDays).toBe(40);
  });

  it("has a label for every status a first response can carry", () => {
    /* ⚠️ ENUMERATED FROM `AGENT_RESPONSE_STATUSES` ITSELF, so a new incoming status arrives here
       rather than falling through to a generic word nobody notices. */
    for (const status of AGENT_RESPONSE_STATUSES) {
      const q = query({ status, dateSent: daysAgo(60) });
      const rows = build([q], [rung(q.id, QueryStatus.QUERIED, daysAgo(60)), rung(q.id, status, daysAgo(20))]);
      const [row] = latestResponses(rows);
      expect(row, `${status} produced no response row`).toBeTruthy();
      expect(row.chipLabel, `${status} falls through to the generic label`).not.toBe("Response");
      expect(row.dotStatus).toBe(status);
    }
  });

  it("is newest first and draws its chips through StatusDot", () => {
    const older = query({ status: QueryStatus.REJECTED, dateSent: daysAgo(300) });
    const newer = query({ status: QueryStatus.OFFER, dateSent: daysAgo(100) });
    const rows = build([older, newer], [
      rung(older.id, QueryStatus.REJECTED, daysAgo(200)),
      rung(newer.id, QueryStatus.OFFER, daysAgo(5)),
    ]);
    const html = responses(rows);
    expect(html.indexOf("Offer"), "the newest response is not first").toBeLessThan(html.indexOf("Pass"));

    /* ⚠️ NOT `var(--sd-hue)` — THAT IS NOT A UNIVERSAL StatusDot SIGNATURE, and assuming it was
       failed here on a correct page. The six PIPELINE statuses read the per-theme token pair; Offer
       and the closed set (Rejected, Withdrawn, No Response) keep their own baked treatment, by the
       component's own locked design. This fixture is an Offer and a Pass, so neither dot mentions a
       token and the assertion said the chips were locally drawn when they were not.

       What IS universal is the root span StatusDot always emits, at the size it was given — which
       proves both that the locked component drew it and that `overrideSize` reached it. */
    const dots = html.match(
      /position:relative;width:13px;height:13px;flex-shrink:0;display:inline-flex/g,
    ) ?? [];
    expect(dots, "the chips are not drawing StatusDot at the requested size").toHaveLength(2);
    /* and its inner disc, which a bare emoji or a CSS pill would not have */
    expect(html).toContain("position:absolute;inset:0;border-radius:50%");
  });

  it("is a real table with column headers", () => {
    const q = query({ status: QueryStatus.REJECTED, dateSent: daysAgo(60) });
    const html = responses(build([q], [rung(q.id, QueryStatus.REJECTED, daysAgo(20))]));
    expect(html).toContain("<table");
    for (const h of ["Agent", "Sent", "Outcome", "Took"]) expect(html).toContain(`scope="col">${h}<`);
  });

  it("⚠️ states the cap rather than showing seven and implying that is all", () => {
    const qs = Array.from({ length: 9 }, (_, i) => query({ status: QueryStatus.REJECTED, dateSent: daysAgo(300 - i) }));
    const rows = build(qs, qs.map((q, i) => rung(q.id, QueryStatus.REJECTED, daysAgo(200 - i))));
    expect(latestResponsesNote(rows)).toBe("Most recent 7 of 9");
    /* ⚠️ THE BODY ROWS BY THEIR OWN CLASS, not a bare `<tr>`. Counting `<tr>` swept in the header
       row and — once the row gained a class — stopped matching the body rows at all, so the figure
       was measuring the markup's punctuation rather than the list. */
    expect([...responses(rows).matchAll(/class="an-trow"/g)], "the list is not capped at seven")
      .toHaveLength(7);
  });

  it("…and says the plain count when nothing is cut", () => {
    const q = query({ status: QueryStatus.REJECTED, dateSent: daysAgo(60) });
    expect(latestResponsesNote(build([q], [rung(q.id, QueryStatus.REJECTED, daysAgo(20))]))).toBe("1 in this period");
  });

  it("states the empty period rather than drawing an empty table", () => {
    const html = responses(build([query({ dateSent: daysAgo(5) })], []));
    expect(html).toContain("Nothing has come back");
    expect(html).not.toContain("<table");
  });
});
