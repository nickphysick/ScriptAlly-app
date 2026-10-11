/**
 * IT1 · M1 — the active-queries card mentions every live query with no sent date.
 * Some dated and some not: the chart draws the dated ones and one line under it says how many
 * more have no sent date. None dated: the import-fixes sentence, alone. All dated: no line.
 * The two sentences never appear together.
 *
 * Red on the baseline: with any dated live query the card said nothing about the undated ones.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { activeTitle, undatedMoreLine, OneScreenChart } from "../components/dashboard/OneScreenChart";
import { liveCount, undatedLiveCount } from "./dashBreakdown";
import { Query, QueryStatus } from "../types";

const NOW = new Date(2026, 8, 17, 12, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
let seq = 0;
const q = (status: QueryStatus, dateSent?: string): Query =>
  ({ id: `m${++seq}`, userId: "u", agentId: "a1", manuscriptId: "m1", status, ...(dateSent ? { dateSent } : {}) } as unknown as Query);

const card = (queries: Query[]) => {
  const html = renderToStaticMarkup(
    <OneScreenChart loading={false} queries={queries} activities={[]} activeCount={liveCount(queries)} undatedCount={undatedLiveCount(queries)} now={NOW} />,
  );
  const title = /data-probe-text="chart-title"[^>]*>([^<]*)</.exec(html)?.[1] ?? null;
  const more = /data-probe-text="chart-undated"[^>]*>([^<]*)</.exec(html)?.[1] ?? null;
  return { html, title, more };
};
const MORE = /more ha(s|ve) no sent date yet\./;
const NONE_DATED = /active quer(y has|ies have) no sent date yet\./;

describe("M1 · some dated, some not", () => {
  it("two dated and one undated: the chart counts two, and the line reads \"1 more has no sent date yet.\"", () => {
    const mixed = [q(QueryStatus.QUERIED, ago(20)), q(QueryStatus.PARTIAL_REQUESTED, ago(6)), q(QueryStatus.FULL_REQUESTED)];
    expect(liveCount(mixed)).toBe(2);
    expect(undatedLiveCount(mixed)).toBe(1);
    const c = card(mixed);
    expect(c.title).toBe("2 active queries");
    expect(c.more).toBe("1 more has no sent date yet.");
    expect(c.html, "the two sentences never appear together").not.toMatch(NONE_DATED);
    expect(c.html.indexOf('data-probe-text="chart-undated"'), "the line is under the chart's axis").toBeGreaterThan(c.html.indexOf('data-probe="chart-axis"'));
  });
  it("two dated and three undated: \"3 more have no sent date yet.\"", () => {
    const mixed = [q(QueryStatus.QUERIED, ago(20)), q(QueryStatus.QUERIED, ago(6)), q(QueryStatus.QUERIED), q(QueryStatus.FULL_SENT), q(QueryStatus.PARTIAL_SENT)];
    expect(card(mixed).more).toBe("3 more have no sent date yet.");
  });
  it("a closed undated query is not counted", () => {
    const mixed = [q(QueryStatus.QUERIED, ago(20)), q(QueryStatus.QUERIED, ago(6)), q(QueryStatus.REJECTED)];
    expect(card(mixed).more).toBeNull();
  });
});

describe("M1 · none dated, and all dated", () => {
  it("none dated: only the import-fixes sentence", () => {
    const undated = [q(QueryStatus.PARTIAL_REQUESTED), q(QueryStatus.FULL_REQUESTED)];
    const c = card(undated);
    expect(c.title).toBe("2 active queries have no sent date yet.");
    expect(c.more).toBeNull();
    expect(c.html).not.toMatch(MORE);
  });
  it("all dated: the card is as it was, with no line", () => {
    const dated = [q(QueryStatus.QUERIED, ago(20)), q(QueryStatus.QUERIED, ago(6))];
    const c = card(dated);
    expect(c.title).toBe("2 active queries");
    expect(c.more).toBeNull();
    expect(c.html).not.toMatch(/no sent date/);
  });
  it("the two builders: exactly one of them speaks for any pair of counts", () => {
    let both = 0, mixedSeen = 0, noneDatedSeen = 0;
    for (let n = 0; n <= 4; n++) for (let u = 0; u <= 4; u++) {
      const titleSpeaks = NONE_DATED.test(activeTitle(n, u));
      const lineSpeaks = undatedMoreLine(n, u) !== null;
      if (titleSpeaks && lineSpeaks) both++;
      if (lineSpeaks) mixedSeen++;
      if (titleSpeaks) noneDatedSeen++;
      if (u > 0) expect(titleSpeaks || lineSpeaks, `${n} dated, ${u} undated is mentioned`).toBe(true);
      if (u === 0) expect(titleSpeaks || lineSpeaks, `${n} dated, none undated says nothing`).toBe(false);
    }
    expect(both).toBe(0);
    expect(mixedSeen).toBeGreaterThan(0);
    expect(noneDatedSeen).toBeGreaterThan(0);
  });
});
