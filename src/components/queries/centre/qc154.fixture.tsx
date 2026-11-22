/**
 * Query Centre v154 — the card tests' shared row and render (not a test file: no cases of its own).
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import type { QcRow } from "../../../lib/qcSummary";
import type { RowAct } from "../../../lib/qc1512";
import { QcCard154 } from "./QcCard154";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime();
export const row154 = (status: QueryStatus, court: string, extra: Record<string, unknown> = {}): QcRow => ({
  id: "q1", agentName: "Tom Ellery", agency: "Curtis Vane", agencyKey: "Curtis Vane", initials: "TE", status, court,
  withYou: court === "you", expectedMs: NOW + 10 * DAY, stageStartMs: NOW - 20 * DAY, sentMs: NOW - 105 * DAY, pastExpected: false,
  furthest: "full", query: { id: "q1" },
  history: { spans: [{ status: QueryStatus.QUERIED, startMs: NOW - 105 * DAY, endMs: null, current: false }, { status, startMs: NOW - 20 * DAY, endMs: null, current: true }], currentStartMs: null, dated: true },
  ...extra,
} as unknown as QcRow);

export const card154 = (r: QcRow, act: RowAct | null = null) => renderToStaticMarkup(
  <QcCard154 row={r} nowMs={NOW} selected={false} packageName="Spring round" act={act} onOpen={() => {}} onAct={() => {}} />,
);
