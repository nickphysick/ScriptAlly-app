/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * NU1 (card) — Next up v1 on the card: the five rows in order, the real StatusDot and AgentDisc, the rows beneath with
 * their waits and the arrow chip, the head's count. The rendered alignment is measured in tests/e2e/nextUp1.measure.ts.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus, type Agent, type Query } from "../../../types";
import type { ListItem, ListPlan } from "../../../lib/dashList";
import type { TaskCtx } from "../../../lib/dashTaskCard";
import type { QcRow } from "../../../lib/qcSummary";
import { Dash2Next } from "./Dash2Next";

const NOW = new Date(2026, 10, 20, 12).getTime();
const DAY = 86_400_000;
const it_ = (o: Partial<ListItem>): ListItem => ({
  key: o.key ?? "k", group: "req", tone: "house", pre: "", who: "Jonathan Marsh", post: "", initials: "JM", fact: "", agency: "", status: null,
  when: "", foot: "", actLabel: "", action: { kind: "drawer", request: { mode: "sent", queryId: "q1" } }, stages: null, note: null, date: null, ...o,
} as ListItem);
const rowOf = (id: string, status: QueryStatus, o: Partial<QcRow> = {}) => ({
  id, manuscriptId: "m1", court: "you", status, initials: "JM", agentName: "x", sentMs: NOW - 60 * DAY, lastMs: NOW - 10 * DAY,
  stageStartMs: NOW - 17 * DAY, expectedMs: NOW - 5 * DAY, expectedKind: "reply", history: { spans: [], currentStartMs: null, dated: false }, ...o,
} as unknown as QcRow);
const agents = [
  { id: "a1", name: "Jonathan Marsh", agency: "The Marsh Agency" },
  { id: "a2", name: "Daniel O'Rourke", agency: "Brightwater" },
  { id: "a3", name: "Tom Okafor", agency: "Fenwick & Day" },
] as Agent[];
const queries = [
  { id: "q1", agentId: "a1", status: QueryStatus.FULL_REQUESTED },
  { id: "q2", agentId: "a2", status: QueryStatus.PARTIAL_REQUESTED },
  { id: "q3", agentId: "a3", status: QueryStatus.QUERIED },
] as Query[];
const ctx: TaskCtx = { queries, agents, qcRows: [rowOf("q1", QueryStatus.FULL_REQUESTED), rowOf("q2", QueryStatus.PARTIAL_REQUESTED, { stageStartMs: NOW - 23 * DAY }), rowOf("q3", QueryStatus.QUERIED, { expectedMs: NOW - 39 * DAY })], nowMs: NOW };
const items = [
  it_({ key: "k1", taskType: "full_requested", status: QueryStatus.FULL_REQUESTED }),
  it_({ key: "k2", taskType: "partial_requested", status: QueryStatus.PARTIAL_REQUESTED, action: { kind: "drawer", request: { mode: "sent", queryId: "q2" } } }),
  it_({ key: "k3", group: "nudge", status: QueryStatus.QUERIED, action: { kind: "drawer", request: { mode: "nudge", queryId: "q3" } } }),
  it_({ key: "k4", group: "nudge" }),
];
const plan = (xs: ListItem[]): ListPlan => ({ groups: [{ key: "req", label: "Agents are waiting", items: xs }], items: xs, thenLabel: "Then", all: { label: "All", tab: "todo" } });
const html = (xs = items) => renderToStaticMarkup(<Dash2Next loading={false} plan={plan(xs)} ctx={ctx} onView={() => {}} onSeeAll={() => {}} />);

describe("NU1-card · the lead's five rows", () => {
  it("agent row, sentence, track, label, buttons — in that order", () => {
    const h = html();
    const at = ["data-nu=\"who\"", "data-nu=\"ask\"", "data-nu=\"track\"", "data-nu=\"label\"", "data-nu=\"acts\""].map((k) => h.indexOf(k));
    expect(at.every((x) => x > 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
  it("the real seal and the real StatusDot; four stops, the current one ringed", () => {
    const h = html();
    const lead = h.slice(h.indexOf("data-d2=\"next-top\""), h.indexOf("data-d2=\"next-rest\""));
    expect(lead).toContain("sa-disc nu-seal");
    expect(lead.match(/data-nu="stop"/g)?.length).toBe(4);
    expect(lead.match(/nu-stp is-cur/g)?.length).toBe(1);
    expect(lead).toContain('aria-hidden="true" style="width:22px');
    expect(lead).toContain(">Send your full.<");
    expect(lead).toContain(">17<");
    expect(lead).toContain(">days waiting<");
  });
  it("the repeated agency line is gone", () => {
    expect(html()).not.toMatch(/THE MARSH AGENCY/);
    expect(html()).not.toMatch(/asked for the full/);
  });
});

describe("NU1-card · the rows beneath", () => {
  it("two rows: small navy seal, the task, its wait, the arrow chip; the head counts shown of total", () => {
    const h = html();
    expect(h.match(/data-d2="next-row"/g)?.length).toBe(2);
    expect(h).toContain(">Send your partial to Daniel O&#x27;Rourke<");
    expect(h).toContain(">23 days<");
    expect(h).toContain(">Send Tom Okafor a nudge<");
    expect(h).toContain(">39 days<");
    expect(h.match(/class="nu-go"/g)?.length).toBe(2);
    expect(h).toMatch(/3 of 4 · <button[^>]*>See all</);
    const rest = h.slice(h.indexOf("data-d2=\"next-rest\""));
    expect(rest).not.toMatch(/\bago\b/);
  });
});
