/**
 * DASHBOARD v71 — the task card's branches the shared harness account cannot reach (C4's one-item
 * half, and the caught-up card). Rendered to a string (this repo's tests run in node, no DOM): the
 * rendered half of the cycle is tests/e2e/dashV71.measure.ts C4.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Dash71Task, CAUGHT_UP, VIEW_TASK } from "./Dash71Task";
import { listPlan, type ListItem } from "../../../lib/dashList";

const item = (n: number): ListItem => ({
  key: `house-${n}`, group: "house", tone: "house", pre: "Add genres for ", who: `Agent ${n}`, post: "", initials: "GE",
  fact: "", agency: "SO WE CAN SUGGEST", status: null, when: "", foot: "", actLabel: "", action: { kind: "route", tab: "agents" },
  stages: null, note: "Genres are how QueryHawk tells.", date: null,
});
const ctx = { queries: [], agents: [], qcRows: [], nowMs: Date.parse("2026-10-26T12:00:00Z") };
const render = (n: number) => renderToStaticMarkup(
  <Dash71Task loading={false} plan={listPlan({ house: Array.from({ length: n }, (_, i) => item(i + 1)) })} ctx={ctx} onView={() => {}} />,
);

describe("the task card's branches", () => {
  it("one item: no segments, no ‹ ›, and the card still offers View task", () => {
    const html = render(1);
    expect(html).toContain('data-d71="task"');
    expect(html).not.toContain('data-d71="segments"');
    expect(html).not.toContain('data-d71="prev"');
    expect(html).not.toContain('data-d71="then"');
    expect(html).toContain(`${VIEW_TASK} →`);
  });
  it("two items: segments, ‹ ›, and a Then line naming the next", () => {
    const html = render(2);
    expect(html).toContain('data-d71="segments"');
    expect((html.match(/data-d71="segment"/g) ?? []).length).toBe(2);
    expect(html).toContain('aria-label="Previous task"');
    expect(html).toContain("Then: add genres for Agent 2");
  });
  it("more than twelve: twelve segments", () => {
    expect((render(20).match(/data-d71="segment"/g) ?? []).length).toBe(12);
  });
  it("none: v60.1's caught-up line, in the same card", () => {
    const html = render(0);
    expect(html).toContain('data-kind="none"');
    expect(html).toContain(CAUGHT_UP);
  });
  it("is a region labelled Your tasks, and never announces the change", () => {
    const html = render(3);
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Your tasks"');
    expect(html).toContain('aria-live="off"');
    expect(html).not.toContain(" title=");
  });
});
