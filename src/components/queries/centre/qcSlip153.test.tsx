/**
 * Query Centre v153 — the slip renders: one focusable control named "agent, agency, status", the id the query panel
 * returns focus to, the stage's tone, four facts, and no rust anywhere in its markup.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import { QcSlip153 } from "./QcSlip153";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime();
const row = (status: QueryStatus, court: string): QcRow => ({
  id: "q1", agentName: "Tom Ellery", agency: "Curtis Vane", agencyKey: "Curtis Vane", initials: "TE", status, court,
  withYou: court === "you", expectedMs: NOW + 10 * DAY, stageStartMs: NOW - 20 * DAY, sentMs: NOW - 400 * DAY, pastExpected: false,
  furthest: "full", query: { id: "q1" },
  history: { spans: [{ status: QueryStatus.QUERIED, startMs: NOW - 400 * DAY, endMs: null, current: false }, { status, startMs: NOW - 20 * DAY, endMs: null, current: true }], currentStartMs: null, dated: true },
} as unknown as QcRow);

const html = (r: QcRow) => renderToStaticMarkup(
  <QcSlip153 row={r} nowMs={NOW} selected={false} packageName="Spring round" act={{ tone: "navy", label: "Answer the offer", mode: "offer" }} onOpen={() => {}} onAct={() => {}} />,
);

describe("the slip", () => {
  it("is one control named agent, agency, status, with the id the panel gives focus back to", () => {
    const h = html(row(QueryStatus.OFFER, "offer"));
    expect(h).toContain('id="query-row-q1"');
    expect(h).toContain('role="button"');
    expect(h).toContain('aria-label="Tom Ellery, Curtis Vane, Offer"');
    expect(h).toContain('data-tone="heather"');
    expect(h.match(/data-qc153="fact"/g)?.length).toBe(4);
    expect(h).toContain("over a year ago");
    expect(h).toContain("Answer the offer →");
  });
  it("draws no rust", () => {
    expect(html(row(QueryStatus.PARTIAL_REQUESTED, "you"))).not.toMatch(/a2452a|8a3a28|b4553f/i);
  });
  /* v153.1 */
  it("the fourth box is their policy, and Sent with is gone", () => {
    const h = renderToStaticMarkup(
      <QcSlip153 row={row(QueryStatus.QUERIED, "agent")} nowMs={NOW} selected={false} packageName="Spring round"
        agent={{ noResponseMeansNo: true, responseTimeWeeks: 8 }} act={null} onOpen={() => {}} onAct={() => {}} />,
    );
    expect(h).toContain('data-k="policy"');
    expect(h).toContain("Their policy");
    expect(h).toContain("No reply means no");
    expect(h).toContain("silence after 8 weeks");
    expect(h).not.toContain('data-k="sent"');
    expect(h).not.toContain(">Sent with<");
  });
  it("v153.3 — the strip is gone; a paperclip tab beside the name counts the materials, a real button", () => {
    const r = { ...row(QueryStatus.PARTIAL_REQUESTED, "you"), query: { id: "q1", materialsWanted: ["Synopsis"], materialsRequestedType: "pages", materialsRequestedQuantity: 50 } } as unknown as QcRow;
    const h = html(r);
    expect(h).not.toContain('data-qc1531="materials"');
    expect(h).not.toContain(">Sent with ");
    const tab = h.match(/<button[^>]*data-qc1533="tab"[^>]*>[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(tab).toContain('aria-label="2 materials"');
    expect(tab).toContain('aria-expanded="false"');
    expect(tab).not.toContain("tabindex=\"-1\"");
    expect(tab).toContain("<i>2</i>");
    // the tab sits with the name and agency, after them
    expect(h.indexOf('data-qc153="agency"')).toBeLessThan(h.indexOf('data-qc1533="tab"'));
    // the stage's accent: a partial is dusty rose
    expect(tab).toContain("--acc:#ddb9b1");
    // the pop-up only when open
    expect(h).not.toContain('data-qc1533="pop"');
  });
  it("no material data and no package: no tab", () => {
    const h = renderToStaticMarkup(
      <QcSlip153 row={row(QueryStatus.QUERIED, "agent")} nowMs={NOW} selected={false} packageName={null} act={null} onOpen={() => {}} onAct={() => {}} />,
    );
    expect(h).not.toContain('data-qc1533="tab"');
  });
});
