/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.3 — the source half of two fixes the emulator seed cannot show (every seeded query has a send date
 * and a stage start): a reached step with no date shows "–", and the Next reason line falls back to the track's own
 * date when the stage has no start recorded. The rendered half is tests/e2e/qc172.measure.ts L12 / L13.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../../../types";
import { next169 } from "../../../lib/next169";
import { QcRow170 } from "./QcRow170";
import { row154 } from "./qc154.fixture";

const DAY = 86_400_000;
const NOW = new Date(2026, 10, 8, 12).getTime(); // qc154.fixture's own clock: its spans are dated from it
const ems = (html: string) => [...html.matchAll(/<span class="qr170-sp is-(\w+)"[^>]*>[\s\S]*?<em>([^<]*)<\/em>/g)].map((m) => [m[1], m[2]]);

describe("v172.3 · a reached step with no date shows a dash; a future step shows nothing", () => {
  it("a query with no send date: Queried reads –", () => {
    const r = row154(QueryStatus.QUERIED, "agent", { sentMs: null, history: { spans: [], currentStartMs: null, dated: false } });
    const html = renderToStaticMarkup(<QcRow170 row={r} nowMs={NOW} selected={false} packageName={null} onOpen={() => {}} onAct={() => {}} />);
    const e = ems(html);
    expect(e[0]).toEqual(["cur", "–"]);
    expect(e.filter(([s]) => s === "fut").every(([, t]) => t === "")).toBe(true);
  });
});

describe("v172.3 · the reason line falls back to the track's date", () => {
  it("Send your full, no stage start recorded: asked … from the history's latest dated span", () => {
    const r = row154(QueryStatus.FULL_REQUESTED, "you", { stageStartMs: null, expectedMs: null });
    expect(next169(r, NOW).line).toBe(`asked ${Math.round(20 / 7)} wks ago`);
  });
  it("with a stage start recorded, it is used as before", () => {
    const r = row154(QueryStatus.FULL_REQUESTED, "you", { stageStartMs: NOW - 3 * DAY, expectedMs: null });
    expect(next169(r, NOW).line).toBe("asked 3 days ago");
  });
});
