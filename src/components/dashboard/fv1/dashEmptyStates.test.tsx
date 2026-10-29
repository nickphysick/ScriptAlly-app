/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DFV-D — Dashboard first visit v1, Part D: after the first query the cards say what is empty in words, never in
 * zeros. S3 (one query today), S5 (all closed) and S6 (nothing due) as the derivations and the rendered cards.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { QueryStatus, type Activity, type Agent, type Manuscript, type Query } from "../../../types";
import { BETWEEN, FIRST_POINT, chartEmpty } from "../../../lib/dashFirstVisit";
import { closedTile } from "../../../lib/dashClosed";
import { agentCoverage } from "../../../lib/dashFirstUse";
import { comingItems } from "../../../lib/dashList";
import { buildQcRows } from "../../../lib/qcSummary";
import { feedEntries } from "../../../lib/dashFeed";
import { SUMMARY_NONE } from "../../../lib/dashFeedDrawer";
import { AgentsHoop, ClosedHoop, CLOSED_NONE, MORE_IN_DISCOVER } from "../v60/Dash60Left";
import { QueryMini } from "../v116/MiniCards";

const NOW = new Date(2026, 9, 29, 12);
const MS = { id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy" } as unknown as Manuscript;
const agent = (id: string, name: string, agency: string): Agent => ({ id, name, agency, genres: ["Fantasy"], submissionStatus: "Open", responseTimeWeeks: 8 } as unknown as Agent);
const q = (id: string, agentId: string, status: QueryStatus, sent: string, closed?: string): Query =>
  ({ id, agentId, status, manuscriptId: "ms-1", dateSent: sent, ...(closed ? { lastStatusChange: closed } : {}) } as unknown as Query);
const TESSA = agent("a1", "Tessa Rowe", "Rowe Literary");

describe("DFV-D · the chart is never a blank plot", () => {
  it("S3 — under two days of data: the first point, its label and the weeks that follow", () => {
    const e = chartEmpty({ queries: [q("q1", "a1", QueryStatus.QUERIED, "2026-10-29T10:00:00.000Z")], agents: [TESSA], activeCount: 1, undatedCount: 0, sparse: true });
    expect(e).toEqual({ kind: "first", who: "Queried Tessa Rowe", sub: "Rowe Literary · 29 Oct", weeks: ["29 Oct", "5 Nov", "12 Nov", "19 Nov"] });
    expect(FIRST_POINT.title).toBe("Your first query is out.");
  });
  it("S5 — every query closed: the history stays, its last point marked with the latest close", () => {
    const qs = [
      q("q1", "a1", QueryStatus.NO_RESPONSE, "2026-08-31T10:00:00.000Z", "2026-10-20T10:00:00.000Z"),
      q("q2", "a1", QueryStatus.REJECTED, "2026-09-10T10:00:00.000Z", "2026-10-26T10:00:00.000Z"),
      q("q3", "a1", QueryStatus.NO_RESPONSE, "2026-09-12T10:00:00.000Z", "2026-10-02T10:00:00.000Z"),
    ];
    expect(chartEmpty({ queries: qs, agents: [TESSA], activeCount: 0, undatedCount: 0, sparse: false })).toEqual({ kind: "between", n: 3, mark: "All closed · 26 Oct" });
    expect(BETWEEN.line(3)).toBe("All 3 queries are closed. Log a query when you're ready to start the next round.");
  });
  it("an ordinary chart is left alone", () => {
    expect(chartEmpty({ queries: [q("q1", "a1", QueryStatus.QUERIED, "2026-09-01T10:00:00.000Z")], agents: [TESSA], activeCount: 1, undatedCount: 0, sparse: false })).toBeNull();
  });
});

const closed = (qs: Query[]) => renderToStaticMarkup(
  <ClosedHoop loading={false} tile={closedTile(qs, [] as Activity[])} play={false} onSeeAll={() => {}} queries={qs} agents={[TESSA]} manuscript="The Lantern Keepers" />,
);
const agents = (ags: Agent[], qs: Query[]) => renderToStaticMarkup(
  <AgentsHoop loading={false} cov={agentCoverage({ agents: ags, queries: qs, manuscript: MS, now: NOW, todayIso: "2026-10-29" })} play={false} onReady={() => {}} agents={ags} queries={qs} msId="ms-1" />,
);

describe("DFV-D · Closed, with nothing closed (S3, S6)", () => {
  const html = closed([q("q1", "a1", QueryStatus.QUERIED, "2026-10-29T10:00:00.000Z")]);
  it("the band reads Closed — no 0 closed, no See all", () => {
    expect(html).toContain('data-d60="closed-title">Closed</h3>');
    expect(html).not.toContain("0 closed");
    expect(html).not.toContain("See all");
  });
  it("the body says so in words, with no zero rows and no hover piles", () => {
    expect(html).toContain(CLOSED_NONE.title);
    expect(html).toContain(CLOSED_NONE.line);
    expect(html).not.toContain('data-d60="closed-row"');
    expect(html).not.toContain("d116-stack");
  });
});

describe("DFV-D · Closed, with some closed (S5)", () => {
  it("lists only the buckets that hold any", () => {
    const html = closed([q("q1", "a1", QueryStatus.NO_RESPONSE, "2026-08-31T10:00:00.000Z", "2026-10-26T10:00:00.000Z")]);
    expect(html.match(/data-d60="closed-row"/g)?.length).toBe(1);
    expect(html).toContain('data-bucket="quiet"');
  });
  it("a closed query's hover card never says QUERYING", () => {
    const c = { id: "q1", name: "Felix", agency: "A", outcome: "quiet" as const, queried: "1 Sep", end: "8 wks", futureSent: false };
    expect(renderToStaticMarkup(<QueryMini c={c} manuscript="The Lantern Keepers" />)).not.toContain("QUERYING");
  });
});

describe("DFV-D · Agents on file", () => {
  it("lists only the rows that hold agents, and never \"0 ready to query\" (S5: every agent queried)", () => {
    const html = agents([TESSA], [q("q1", "a1", QueryStatus.NO_RESPONSE, "2026-08-31T10:00:00.000Z", "2026-10-26T10:00:00.000Z")]);
    expect(html).not.toMatch(/>0<\/span>\s*(Querying|Not yet queried)/);
    expect(html).not.toContain("0 ready to query");
    expect(html).toContain(`${MORE_IN_DISCOVER} →`);
    expect(html).toContain('data-d60="hoop-total">OF 1</small>');
  });
  it("with no agents at all, words and the way to bring a list in", () => {
    const html = agents([], [q("q1", "a1", QueryStatus.QUERIED, "2026-10-29T10:00:00.000Z")]);
    expect(html).toContain("No agents yet.");
    expect(html).toContain("Import a list →");
  });
});

describe("DFV-D · the smaller fixes", () => {
  it("a Coming up date tile names its month", () => {
    const qs = [q("q1", "a1", QueryStatus.QUERIED, "2026-10-14T10:00:00.000Z")];
    const items = comingItems(buildQcRows(qs, [TESSA], [], NOW.getTime()), NOW.getTime());
    expect(items[0].date).toEqual({ dow: "WED", day: "9", mon: "Dec" });
  });
  it("a backdated send is not listed under Today, and a close counts its silence from the sent date", () => {
    const sent = q("q1", "a1", QueryStatus.NO_RESPONSE, "2026-06-15T11:00:00.000Z", "2026-10-29T11:03:00.000Z");
    const acts = [
      { id: "s", queryId: "q1", manuscriptId: "ms-1", date: "2026-10-29T11:00:00.000Z", eventKey: "query_sent", resultingStatus: QueryStatus.QUERIED, activityType: "QUERY_SENT", description: "" },
      { id: "c", queryId: "q1", manuscriptId: "ms-1", date: "2026-10-29T11:03:00.000Z", eventKey: "closed_no_reply", resultingStatus: QueryStatus.NO_RESPONSE, activityType: "STATUS_CHANGE", description: "" },
    ] as unknown as Activity[];
    const e = feedEntries({ activities: acts, queries: [sent], agents: [TESSA], manuscripts: [MS], now: NOW, seenAt: null, honestDates: true });
    expect(e.find((x) => x.id === "s")).toBeUndefined(); // 15 June is outside the 30-day window — never "Today"
    const close = e.find((x) => x.id === "c")!;
    expect(close.say.map((s) => s.t).join("")).not.toContain("minutes");
  });
  it("the feed's zero figures read in words", () => {
    expect(SUMMARY_NONE).toEqual({ replies: "No replies yet", did: "Nothing logged yet", need: "Nothing needs you" });
  });
});
