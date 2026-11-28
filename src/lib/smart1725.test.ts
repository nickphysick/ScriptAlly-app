/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172.5 — Phase 1, the model: what's next. Every query lands in exactly one of seven parts (Offer to
 * answer · Materials requested · Nudge due · Reply date needed · Consider closing · In their window · Closed); the
 * panel shows or hides parts (`hide`, beside `closed`); the list's Action needed group takes in the undated.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { row154 } from "../components/queries/centre/qc154.fixture";
import * as L from "./smart172";
import type { QcRow } from "./qcSummary";

const DAY = 86_400_000;
const NOW = new Date("2026-11-27T12:00:00Z").getTime();
const at = (id: string, status: QueryStatus, court: string, extra: Record<string, unknown> = {}): QcRow =>
  ({ ...row154(status, court, { stageStartMs: NOW - 5 * DAY, furthest: "queried", ...extra }), id } as QcRow);
const ctx: L.Ctx172 = { nowMs: NOW, pkg: () => "Nothing recorded", stars: () => 0, country: () => "" };
/* one of each kind; the expected part is the id's prefix */
const rows = [
  at("offer-1", QueryStatus.OFFER, "offer", { expectedMs: null }),
  at("req-1", QueryStatus.FULL_REQUESTED, "you", { expectedMs: NOW + 6 * DAY }),
  at("req-2", QueryStatus.PARTIAL_REQUESTED, "you", { expectedMs: NOW - 2 * DAY }),
  at("nudge-1", QueryStatus.QUERIED, "agent", { expectedMs: NOW - 3 * DAY, stageStartMs: NOW - 60 * DAY }),
  at("nodate-1", QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 5 * DAY }),
  at("close-1", QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 120 * DAY }),
  at("window-1", QueryStatus.QUERIED, "agent", { expectedMs: NOW + 20 * DAY }),
  at("closed-1", QueryStatus.REJECTED, "closed", { expectedMs: null }),
];
const PARTS = ["offer", "req", "nudge", "nodate", "close", "window", "closed"] as const;

describe("v172.5 · 1a every query lands in exactly one part", () => {
  it("stand172 names each fixture row's part; the seven counts sum to the total", () => {
    expect(rows.map((r) => L.stand172(r, NOW))).toEqual(rows.map((r) => r.id.split("-")[0]));
    const counts = PARTS.map((k) => rows.filter((r) => L.stand172(r, NOW) === k).length);
    expect(counts.every((n) => n >= 1)).toBe(true);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(rows.length);
  });
  it("the labels, in order: the five action parts, then In their window", () => {
    expect(L.STAND172.map((x) => x.label)).toEqual(["Offer to answer", "Materials requested", "Nudge due", "Reply date needed", "Consider closing", "In their window"]);
  });
});

describe("v172.5 · 1b picking parts filters the list", () => {
  it("“Nudge due” alone passes only nudge rows", () => {
    const s = { ...L.EMPTY172, hide: L.STAND172.map((x) => x.k).filter((k) => k !== "nudge"), closed: false };
    expect(rows.filter((r) => L.pass172(r, s, ctx)).map((r) => r.id)).toEqual(["nudge-1"]);
  });
  it("the old `who` filter is gone from the panel's state", () => {
    expect("who" in L.EMPTY172).toBe(false);
    expect(L.EMPTY172.hide).toEqual([]);
  });
});

describe("v172.5 · 1c the part's chip", () => {
  const act = { ...L.EMPTY172, hide: ["window"] as L.Stand172[], closed: false };
  it("exactly the five action parts: “Action needed”", () => {
    expect(L.standText172(act)).toBe("Action needed");
    expect(L.chips172(act, () => {}).map((c) => c.label)).toEqual(["Action needed"]);
  });
  it("exactly In their window: “No action needed”; otherwise the shown names joined", () => {
    expect(L.standText172({ ...L.EMPTY172, hide: ["offer", "req", "nudge", "nodate", "close"], closed: false })).toBe("No action needed");
    expect(L.standText172({ ...L.EMPTY172, hide: ["offer", "nudge", "nodate", "close", "window"], closed: false })).toBe("Materials requested");
    expect(L.standText172({ ...L.EMPTY172, hide: ["offer", "req", "nodate", "close", "window"], closed: true })).toBe("Nudge due, Closed");
  });
  it("its ✕ resets hide and closed; “Closed hidden” only when nothing else is hidden", () => {
    let got: Partial<L.Smart172> | null = null;
    L.chips172(act, (p) => { got = p; })[0].onRemove();
    expect(got).toEqual({ hide: [], closed: true });
    expect(L.chips172({ ...L.EMPTY172, closed: false }, () => {}).map((c) => c.label)).toEqual(["Closed hidden"]);
  });
});

describe("v172.5 · 1d Action needed takes in the undated", () => {
  it("the list's groups: Action needed · Within their window · Closed (no separate no-date group)", () => {
    const g = L.group172(rows, NOW);
    expect(g.map((x) => x.key)).toEqual(["action", "window", "closed"]);
    expect(g.map((x) => x.label)).toEqual(["Action needed", "Within their window", "Closed"]);
  });
  it("a waiting query with no reply date is in Action needed with tier 3.5, between a nudge and consider closing", () => {
    const nodate = rows[4];
    expect(L.group172([nodate], NOW)[0].key).toBe("action");
    expect(L.tier172(nodate, NOW)).toBe(3.5);
    expect(L.group172(rows, NOW)[0].rows.map((r) => r.id)).toEqual(["offer-1", "req-2", "req-1", "nudge-1", "nodate-1", "close-1"]);
  });
});
