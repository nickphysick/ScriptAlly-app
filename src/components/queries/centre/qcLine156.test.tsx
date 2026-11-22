/**
 * Query Centre v156.1 §1 — the navy header's top right leads with the streak: the flame (none without a streak), the
 * streak and its one plain line, then v156's line of twenty weeks with this week's dot (rust beside the flame, cream
 * without), the target caption and a text alternative that names the streak. The streak's counting is lib/qc1561's
 * (qc1561.test.ts).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { weekGoal154 } from "../../../lib/qc154goal";
import { QcLine156 } from "./QcLine156";

const NOW = Date.UTC(2026, 10, 11, 12);
const DAY = 86_400_000;
const WEEKLY3 = [{ target: 3, cadence: "week" as const, effectiveFrom: "2026-01-01" }];
const week = (k: number, n: number) => Array.from({ length: n }, (_, i) => NOW - k * 7 * DAY - (i + 1) * 3_600_000);
const SIX = [1, 2, 3, 4, 5, 6].flatMap((k) => week(k, 3));
const html = (sends: number[]) => renderToStaticMarkup(<QcLine156 m={weekGoal154(sends, WEEKLY3, NOW)} />);

describe("the streak-led top right", () => {
  it("streak running, one short: the flame, \"6 week streak\", its line; a rust dot; no v156 headline or footer", () => {
    const h = html([...SIX, ...week(0, 2)]);
    expect(h).toMatch(/<svg class="qc1561-fl" viewBox="0 0 24 30" width="38" height="48"/);
    expect(h).toContain('fill="#dd7446"');
    expect(h).toContain('fill="#f6c39d"');
    expect(h).toContain('data-qc1561="streak">6 week streak</div>');
    expect(h).toContain('data-qc1561="line">1 more this week to keep it going.</div>');
    expect(h).toContain('data-flame=""');
    expect(h).toContain('aria-label="6 week streak. 1 more this week to keep it going. Queries sent per week over the last 20 weeks."');
    expect(h).toContain("<span>your target · 3 a week</span>");
    for (const gone of ["sent this week", "-week streak", "keeps the streak", "your goal", "qc156-big", "qc156-ft"]) expect(h).not.toContain(gone);
  });
  it("target met: \"7 week streak\" and \"You’ve hit your target this week.\"", () => {
    const h = html([...SIX, ...week(0, 3)]);
    expect(h).toContain(">7 week streak<");
    expect(h).toContain(">You’ve hit your target this week.<");
  });
  it("no streak: no flame, \"No streak yet\", \"3 this week starts one.\", the dot cream", () => {
    const h = html(week(1, 1));
    expect(h).not.toContain("qc1561-fl");
    expect(h).not.toContain("data-flame");
    expect(h).toContain(">No streak yet<");
    expect(h).toContain(">3 this week starts one.<");
  });
  it("no queries at all: no flame, the line flat on the baseline, the dot on it", () => {
    const h = html([]);
    expect(h).toContain(">No streak yet<");
    const d = h.match(/d="(M[^"]*)" fill="none"/)?.[1] ?? "";
    expect(d.split(/[ML]/).filter(Boolean).every((p) => p.trim().endsWith(" 70.0"))).toBe(true);
    expect(h).toMatch(/class="qc1561-dot"[^>]*style="left:100%;top:70px"/);
  });
  it("this week's dot is an HTML disc over the drawing (stays round however the line stretches)", () => {
    const h = html([...SIX, ...week(0, 2)]);
    expect(h).not.toMatch(/<circle[^>]*data-qc156="now"/);
    expect(h).toMatch(/<i class="qc1561-dot" data-qc156="now"/);
  });
  it("loading holds the same rows, hidden, so the header does not grow", () => {
    const h = renderToStaticMarkup(<QcLine156 m={null} />);
    expect(h).toContain('data-qc155="goal-hold"');
    expect(h.match(/class="qc1561-(hd|gr)"|class="qc156-cap"/g)).toHaveLength(3);
  });
  it("the page draws this block, not v154's bar chart", () => {
    const q = readFileSync(resolve(__dirname, "../../Queries.tsx"), "utf8");
    expect(q).not.toMatch(/QcGoal154/);
    expect(q).toMatch(/<QcLine156 /);
  });
});
