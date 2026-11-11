/**
 * Query Centre v154 — the weekly goal chart renders: the headline, the streak pill (none before the first send), the
 * line of encouragement, twenty bars coloured by met / short / empty / this week, and the dashed goal line's words.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { weekGoal154 } from "../../../lib/qc154goal";
import { QcGoal154 } from "./QcGoal154";

const NOW = Date.UTC(2026, 10, 11, 12);
const at = (m: number, d: number) => Date.UTC(2026, m - 1, d, 10);
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];

describe("the goal chart", () => {
  it("draws the headline, the streak, the line and twenty bars", () => {
    const m = weekGoal154([at(10, 26), at(10, 27), at(10, 28), at(11, 3), at(11, 10)], WEEKLY3, NOW);
    const h = renderToStaticMarkup(<QcGoal154 m={m} />);
    expect(h).toContain("<b>1 of 3</b> this week");
    expect(h).toMatch(/data-qc154="streak"[^>]*>[\s\S]*?<\/svg>0-week streak<\/span>/);
    expect(h).toContain("2 more keeps the streak going.");
    expect(h).toContain("your goal · 3 a week");
    expect(h.match(/data-qc154="bar"/g)).toHaveLength(20);
    expect(h).toContain('data-start="2026-10-26" data-count="3" data-kind="met"');
    expect(h).toContain('data-start="2026-11-02" data-count="1" data-kind="short"');
    expect(h).toContain('data-start="2026-10-19" data-count="0" data-kind="empty"');
    expect(h).toContain('data-start="2026-11-09" data-count="1" data-kind="now"');
    expect(h).toContain('fill="#2a3a52"');
    expect(h).toContain('fill="#9aa6b6"');
    expect(h).toContain('stroke-dasharray="3 3"');
    expect(h).not.toContain("still in play");
  });
  it("before the first send: 0 of the goal, no streak pill, every bar a stub", () => {
    const h = renderToStaticMarkup(<QcGoal154 m={weekGoal154([], WEEKLY3, NOW)} />);
    expect(h).toContain("<b>0 of 3</b> this week");
    expect(h).not.toContain('data-qc154="streak"');
    expect(h.match(/data-kind="empty"/g)).toHaveLength(19);
    expect(h).toContain('data-kind="now"');
  });
});
