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
