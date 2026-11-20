/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB3 (cards) — Dashboard v3's card heads (Phase 3): a head takes the colour of the stage it is about.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import { STAGE_COLOURS } from "../../../lib/stageColours";
import { Dash2Next } from "../v2/Dash2Next";
import type { ListItem, ListPlan } from "../../../lib/dashList";
import type { TaskCtx } from "../../../lib/dashTaskCard";

const item = (status: QueryStatus | null): ListItem => ({
  key: "k1", group: "req", tone: "house", pre: "Send your full to ", who: "Jonathan Marsh", post: "", initials: "JM", fact: "", agency: "",
  status, when: "", foot: "", actLabel: "", action: { kind: "route", tab: "todo" }, stages: null, note: null, date: null,
} as unknown as ListItem);
const plan = (it: ListItem): ListPlan => ({ groups: [{ key: "req", label: "Agents are waiting", items: [it] }], items: [it], thenLabel: "Then", all: { label: "All", tab: "todo" } });
const ctx = { queries: [], agents: [], qcRows: [], nowMs: 0 } as unknown as TaskCtx;
const html = (s: QueryStatus | null) => renderToStaticMarkup(<Dash2Next loading={false} plan={plan(item(s))} ctx={ctx} onView={() => {}} onSeeAll={() => {}} />);

describe("DB3-3 · Next up's head is the lead task's stage", () => {
  it("a full request: the full band on the head, the full tint on the lead card", () => {
    const h = html(QueryStatus.FULL_REQUESTED);
    expect(h).toContain('data-stage="full"');
    expect(h).toContain(`style="background:${STAGE_COLOURS.full.band}"`);
    expect(h).toContain(`style="background:${STAGE_COLOURS.full.tint}"`);
  });
  it("a task not about a query: a plain paper head, no stage fill", () => {
    const h = html(null);
    expect(h).toContain('data-stage="none"');
    expect(h).toContain("d2-tone--paper");
    expect(h).not.toMatch(/os-band[^"]*" style=/);
  });
  it("one filled button on the card: Open task", () => {
    expect(html(QueryStatus.FULL_REQUESTED).match(/d2-open/g)?.length).toBe(1);
  });
});

import { Dash2Active, Going, GOING_TITLE } from "../v2/Dash2Active";
import { bandBackground } from "../../../lib/stageColours";

describe("DB3-4a · the chart's third view", () => {
  it("the toggle offers Active, Sent and How it's going", () => {
    const h = renderToStaticMarkup(<Dash2Active loading={false} queries={[]} activities={[]} activeCount={0} undatedCount={0} now={new Date(2026, 10, 18)}
      going={{ sent: 0, asked: 0, full: 0, offers: 0, closedNoRequest: 0 }} />);
    expect(h).toContain(">Active<");
    expect(h).toContain(">Sent<");
    expect(h).toContain(`>${GOING_TITLE}<`);
  });
  it("three bars from the counts; a dashed empty bar at zero offers; facts only", () => {
    const h = renderToStaticMarkup(<Going g={{ sent: 23, asked: 2, full: 1, offers: 0, closedNoRequest: 3 }} />);
    expect(h).toContain("2 of 23 agents asked to read more.");
    expect(h).toContain("One full and one partial. 3 queries closed without a request.");
    expect(h.match(/data-d3="going-row"/g)?.length).toBe(3);
    expect(h).toMatch(/data-key="offers" data-n="0">[\s\S]*d3-none/);
    expect(h).toContain(`background:${STAGE_COLOURS.queried.band}`);
    const text = h.replace(/<[^>]*>/g, " ");
    for (const w of [/\bgood\b/i, /\bgreat\b/i, /\bstrong\b/i, /\bweak\b/i, /\baverage\b/i, /\bbenchmark/i, /%/]) expect(text, String(w)).not.toMatch(w);
    const one = renderToStaticMarkup(<Going g={{ sent: 2, asked: 1, full: 0, offers: 1, closedNoRequest: 0 }} />);
    expect(one).toContain(bandBackground("offer").slice(0, 30));
  });
});

import { Dash3Expected, EXAMPLE_TAG } from "./Dash3Expected";
import { expectedBack } from "../../../lib/dash3";
import type { QcRow } from "../../../lib/qcSummary";

describe("DB3-4b · Expected back on the card", () => {
  const NOW = new Date(2026, 10, 18, 12).getTime();
  const r = (id: string, d: number) => ({ id, court: "agent", expectedMs: NOW + d * 86_400_000, stageStartMs: NOW - 40 * 86_400_000, sentMs: null, agentName: `A ${id}`, agency: `Ag ${id}` } as unknown as QcRow);
  it("the Queried head; rows open their query; past rows have no bar; the footer links the Query Centre", () => {
    const opened: string[] = [];
    const h = renderToStaticMarkup(<Dash3Expected loading={false} model={expectedBack([r("a", 2), r("b", -3), r("c", 20), r("d", 30), r("e", 40), r("f", 50)], NOW)} onOpen={(id) => opened.push(id)} onAll={() => {}} />);
    expect(h).toContain(`style="background:${STAGE_COLOURS.queried.band}"`);
    expect(h).toContain("1 reply expected in the next 7 days.");
    expect(h.match(/data-d3="ex-row"/g)?.length).toBe(3);
    expect(h.match(/data-d3="ex-past"/g)?.length).toBe(1);
    expect(h).toContain("1 is past its date");
    expect(h).toContain("2 more are within their reply window.");
    expect(h).toContain('data-d3="ex-qc"');
    const pastRow = h.slice(h.indexOf('data-d3="ex-past"'));
    expect(pastRow.slice(0, pastRow.indexOf("</button>"))).not.toContain("d3-pb");
  });
  it("day one: a labelled example", () => {
    const h = renderToStaticMarkup(<Dash3Expected loading={false} model={null} onOpen={() => {}} onAll={() => {}} />);
    expect(h).toContain(`>${EXAMPLE_TAG}<`);
    expect(h).not.toContain('data-d3="ex-row"');
  });
});
