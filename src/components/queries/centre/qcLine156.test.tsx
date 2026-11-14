/**
 * Query Centre v156 §2 — "this week" as a line on the navy header: the headline, the line and its text alternative, the
 * caption, the streak (hidden at 0) and v154 / v154.1's encouragement copy, unchanged. Replaces qcGoal154.test.tsx with
 * the bar chart it tested.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { weekGoal154 } from "../../../lib/qc154goal";
import { QcLine156 } from "./QcLine156";

const NOW = Date.UTC(2026, 10, 11, 12);
const at = (m: number, d: number) => Date.UTC(2026, m - 1, d, 10);
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];

describe("the this-week line", () => {
  it("draws the headline, the line with its alternative, the caption and no bars", () => {
    const m = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 3), at(11, 10)], WEEKLY3, NOW);
    const h = renderToStaticMarkup(<QcLine156 m={m} />);
    expect(h).toContain("<b>1 of 3</b><small>sent this week</small>");
    expect(h).toContain('role="img" aria-label="Queries sent per week over the last 20 weeks. This week: 1 of 3."');
    expect(h.match(/data-qc156="stroke"/g)).toHaveLength(1);
    expect(h).toMatch(/data-qc156="stroke"[^>]*|d="M0\.0 70\.0 L/);
    expect(h).toContain('stroke="rgba(244,238,229,.45)" stroke-dasharray="2 5"');
    expect(h).toContain('r="4.5" fill="#f4eee5"');
    expect(h).toContain("<span>Jun</span><span>your goal · 3 a week</span><span>Nov</span>");
    expect(h).not.toContain('data-qc154="bar"');
    expect(h).not.toContain("qc154-wktip");
    /* the week of 2 Nov fell short: no streak, and the line is about this week */
    expect(h).not.toContain('data-qc156="streak"');
    expect(h).not.toContain("week streak");
    expect(h).toContain("2 more to hit your goal this week.");
  });
  it("with a streak: the flame and \"2-week streak\", and \"One more keeps the streak going.\"", () => {
    const m = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 2), at(11, 3), at(11, 4), at(11, 9), at(11, 10)], WEEKLY3, NOW);
    expect(m).toMatchObject({ streak: 2, left: 1 });
    const h = renderToStaticMarkup(<QcLine156 m={m} />);
    expect(h).toMatch(/data-qc156="streak"[^>]*>[\s\S]*?<\/svg>2-week streak<\/b>/);
    expect(h).toContain("One more keeps the streak going.");
  });
  it("two short with a streak: \"2 more keeps the streak going.\"", () => {
    const m = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 2), at(11, 3), at(11, 4), at(11, 9)], WEEKLY3, NOW);
    expect(m).toMatchObject({ streak: 2, left: 2 });
    expect(renderToStaticMarkup(<QcLine156 m={m} />)).toContain("2 more keeps the streak going.");
  });
  it("goal met: \"Goal met — nice work.\"", () => {
    const m = weekGoal154([at(11, 9), at(11, 10), at(11, 11)], WEEKLY3, NOW);
    expect(m.left).toBe(0);
    expect(renderToStaticMarkup(<QcLine156 m={m} />)).toContain("Goal met — nice work.");
  });
  it("no streak, one short: \"One more to hit your goal this week.\"", () => {
    expect(renderToStaticMarkup(<QcLine156 m={weekGoal154([at(9, 1), at(11, 9), at(11, 10)], WEEKLY3, NOW)} />)).toContain("One more to hit your goal this week.");
  });
  it("no queries yet: 0 of the goal, the line flat along the baseline, the goal line still drawn, no streak", () => {
    const h = renderToStaticMarkup(<QcLine156 m={weekGoal154([], WEEKLY3, NOW)} />);
    expect(h).toContain("<b>0 of 3</b>");
    const d = h.match(/d="(M[^"]*)" fill="none"/)?.[1] ?? "";
    expect(d.split(/[ML]/).filter(Boolean).every((p) => p.trim().endsWith(" 70.0"))).toBe(true);
    expect(h).toContain('data-qc156="goal"');
    expect(h).not.toContain('data-qc156="streak"');
  });
  it("loading holds the same rows, hidden, so the header does not grow", () => {
    const h = renderToStaticMarkup(<QcLine156 m={null} />);
    expect(h).toContain('data-qc155="goal-hold"');
    expect(h.match(/class="qc156-(big|ln|cap|ft)"/g)).toHaveLength(4);
  });
  it("the bar chart is gone from the page", () => {
    const q = readFileSync(resolve(__dirname, "../../Queries.tsx"), "utf8");
    expect(q).not.toMatch(/QcGoal154/);
    expect(q).toMatch(/<QcLine156 /);
  });
});
