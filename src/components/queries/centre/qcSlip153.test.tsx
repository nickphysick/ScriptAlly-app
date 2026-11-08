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
});
