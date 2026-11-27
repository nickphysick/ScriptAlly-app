/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — lib/smart172's source half: the one grouping the list shares with Birds-eye (group172), the most
 * urgent first inside Needs action (tier172), the date fields' either-side rule, and the remembered panel made safe.
 * The rendered half (the same keys in the same order on both views) is tests/e2e/qc172.measure.ts L4.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus } from "../types";
import { row154 } from "../components/queries/centre/qc154.fixture";
import { EMPTY172, REPLY172, SENDBY172, group172, pass172, sanitiseSmart172, tier172, undated172, type Ctx172 } from "./smart172";
import type { QcRow } from "./qcSummary";

const DAY = 86_400_000;
const NOW = new Date("2026-11-27T12:00:00Z").getTime();
const at = (id: string, status: QueryStatus, court: string, extra: Record<string, unknown> = {}): QcRow =>
  ({ ...row154(status, court, { stageStartMs: NOW - 5 * DAY, furthest: "queried", ...extra }), id } as QcRow);
const ctx: Ctx172 = { nowMs: NOW, pkg: () => "Nothing recorded", stars: () => 0, country: () => "" };

describe("v172 · group172: Needs action · Within their window · Waiting, no reply date · Closed", () => {
  const rows = [
    at("closed", QueryStatus.REJECTED, "closed", { expectedMs: null }),
    at("window", QueryStatus.QUERIED, "agent", { expectedMs: NOW + 20 * DAY }),
    at("ask", QueryStatus.FULL_REQUESTED, "you", { expectedMs: NOW + 6 * DAY }),
    at("nodate", QueryStatus.QUERIED, "agent", { expectedMs: null }),
    at("late", QueryStatus.PARTIAL_REQUESTED, "you", { expectedMs: NOW - 2 * DAY }),
    at("offer", QueryStatus.OFFER, "offer", { expectedMs: null }),
  ];
  const g = group172(rows, NOW);
  it("the four groups, in that order, Closed last", () => {
    expect(g.map((x) => x.key)).toEqual(["action", "window", "nodate", "closed"]);
    expect(g.map((x) => x.label)).toEqual(["Needs action", "Within their window", "Waiting, no reply date", "Closed"]);
  });
  it("inside Needs action: an offer, then a request past its send-by date, then another request", () => {
    expect(g[0].rows.map((r) => r.id)).toEqual(["offer", "late", "ask"]);
    expect([tier172(rows[5], NOW), tier172(rows[4], NOW), tier172(rows[2], NOW)]).toEqual([0, 1, 2]);
  });
  it("ties keep the order they came in (the chosen sort)", () => {
    const two = [at("b", QueryStatus.PARTIAL_REQUESTED, "you", { expectedMs: NOW + 3 * DAY }), at("a", QueryStatus.FULL_REQUESTED, "you", { expectedMs: NOW + 1 * DAY })];
    expect(group172(two, NOW)[0].rows.map((r) => r.id)).toEqual(["b", "a"]);
  });
  it("an empty group is not drawn", () => {
    expect(group172([rows[1]], NOW).map((x) => x.key)).toEqual(["window"]);
  });
});

describe("v172 · the two date fields", () => {
  const agentLate = at("al", QueryStatus.QUERIED, "agent", { expectedMs: NOW - 3 * DAY, stageStartMs: NOW - 60 * DAY });
  const youLate = at("yl", QueryStatus.PARTIAL_REQUESTED, "you", { expectedMs: NOW - 3 * DAY });
  const overdue = { lo: -56, hi: 0, nd: false };
  it("the reply date keeps to the agent's side, the send-by date to yours", () => {
    expect(pass172(youLate, { ...EMPTY172, date: overdue }, ctx)).toBe(false);
    expect(pass172(youLate, { ...EMPTY172, sendby: { lo: SENDBY172.min, hi: 0, nd: false } }, ctx)).toBe(true);
  });
  it("both set: a query passes on either", () => {
    const both = { ...EMPTY172, date: { lo: REPLY172.min, hi: 0, nd: false }, sendby: { lo: SENDBY172.min, hi: 0, nd: false } };
    expect(pass172(youLate, both, ctx)).toBe(true);
    expect(pass172(agentLate, both, ctx)).toBe(true);
    expect(pass172(agentLate, { ...EMPTY172, sendby: both.sendby }, ctx)).toBe(false);
  });
});

describe("v172 · the reply date's Not dated is Birds-eye's Waiting, no reply date", () => {
  const waiting = at("w", QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 5 * DAY });
  const chase = at("c", QueryStatus.QUERIED, "agent", { expectedMs: null, stageStartMs: NOW - 120 * DAY });
  it("an undated query simply waiting counts; one gone quiet (Needs chasing) does not", () => {
    expect(group172([waiting], NOW)[0].key).toBe("nodate");
    expect(undated172(waiting, NOW, "agent")).toBe(true);
    expect(group172([chase], NOW)[0].key).toBe("action");
    expect(undated172(chase, NOW, "agent")).toBe(false);
  });
  it("with the reply date set and Not dated ticked, the waiting one passes and the chase does not", () => {
    const s = { ...EMPTY172, date: { lo: REPLY172.min, hi: 0, nd: true } };
    expect(pass172(waiting, s, ctx)).toBe(true);
    expect(pass172(chase, s, ctx)).toBe(false);
  });
});

describe("v172 · sanitiseSmart172: the remembered panel made safe", () => {
  it("nothing stored is the untouched panel", () => {
    expect(sanitiseSmart172(undefined)).toEqual(EMPTY172);
    expect(sanitiseSmart172("x")).toEqual(EMPTY172);
  });
  it("a good value comes back whole; a bad field falls back on its own", () => {
    const good = { ...EMPTY172, who: "chase", stage: [0, 2], pkgs: ["Spring round"], fit: 3, mats: "no", date: { lo: -28, hi: 14, nd: false } };
    expect(sanitiseSmart172(JSON.parse(JSON.stringify(good)))).toEqual(good);
    const bad = sanitiseSmart172({ ...good, who: "boss", stage: [0, 9, "1"], fit: 7, date: { lo: 40, hi: 10, nd: true } });
    expect(bad).toEqual({ ...good, who: null, stage: [0], fit: 0, date: EMPTY172.date });
  });
});
