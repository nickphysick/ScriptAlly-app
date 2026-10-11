/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v136 — the active and inactive bands, rendered: the two labels and their sums, the cards'
 * copy, the month pill (and its absence when there is no figure), and the one-row fit of the faces.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcGlance, discsThatFit, monthPill, type GlanceSection } from "./QcGlance";

const sec = (key: "you" | "agent" | "closed", total: number, lines: [number, string, boolean][], mom: GlanceSection["mom"]): GlanceSection => ({
  key, label: key, total, said: `${total} said`, mom, trend: { weeks: [], values: [] },
  lines: lines.map(([n, text, hot]) => ({ n, text, hot })) as GlanceSection["lines"],
});
const up = (d: number) => ({ delta: d, dir: d > 0 ? "up" as const : d < 0 ? "down" as const : "none" as const, text: "" });
const SECTIONS = [
  sec("you", 4, [[1, "offer to consider", true], [3, "requests to send", false]], up(2)),
  sec("agent", 19, [[6, "overdue", true], [2, "due this week", false]], up(-3)),
  sec("closed", 4, [[2, "rejections", false], [2, "no response", false]], up(1)),
];
const html = (sections = SECTIONS, loading = false) => renderToStaticMarkup(<QcGlance sections={sections} onCourt={() => {}} loading={loading} />);

describe("QcGlance (v136)", () => {
  it("two bands: active is with you + with agents, inactive is closed", () => {
    const h = html();
    expect(h).toMatch(/data-group="active" aria-label="23 active"><p class="qcg-gl" data-qcv="glance-label"><b data-qcv="glance-n">23<\/b> active<\/p>/);
    expect(h).toMatch(/data-group="inactive" aria-label="4 inactive"><p class="qcg-gl" data-qcv="glance-label"><b data-qcv="glance-n">4<\/b> inactive<\/p>/);
    const active = h.slice(h.indexOf('data-group="active"'), h.indexOf('data-group="inactive"'));
    expect((active.match(/data-qcv="court"/g) ?? []).length, "two cards in the active band").toBe(2);
    expect((h.slice(h.indexOf('data-group="inactive"')).match(/data-qcv="court"/g) ?? []).length, "one in the inactive band").toBe(1);
    expect(active.indexOf('data-court="you"')).toBeLessThan(active.indexOf('data-court="agent"'));
  });
  it("the card: its label, its number, its two lines; a hot line is marked", () => {
    const h = html();
    for (const l of ["With you", "With agents", "Closed"]) expect(h).toContain(`data-qcv="court-title">${l}</span>`);
    expect(h).toMatch(/data-qcv="court-line" data-hot="true"><b data-qcv="court-tile">6<\/b><span data-qcv="court-label">overdue<\/span>/);
    expect(h).toMatch(/data-qcv="court-line" data-hot="false"><b data-qcv="court-tile">2<\/b><span data-qcv="court-label">due this week<\/span>/);
    expect(h, "the old wording is gone").not.toContain("responses overdue");
    expect(h, "no chart, no art placeholder, no badge").not.toMatch(/court-chart|court-trend|court-art|court-badge|qc135/);
  });
  it("the month pill: up, down, no change — and no pill at all when there is no figure", () => {
    expect(monthPill(up(2))).toBe("▲ 2 on last month");
    expect(monthPill(up(-3))).toBe("▼ 3 on last month");
    expect(monthPill(up(0))).toBe("No change on last month");
    expect((html().match(/data-qcv="court-mom"/g) ?? []).length).toBe(3);
    const none = html([SECTIONS[0], { ...SECTIONS[1], mom: null }, SECTIONS[2]]);
    expect((none.match(/data-qcv="court-mom"/g) ?? []).length, "the card with no figure draws no pill").toBe(2);
    const agent = none.slice(none.indexOf('data-court="agent"'), none.indexOf('data-court="closed"'));
    expect(agent).not.toContain("qcg-pill");
  });
  it("the card is pressable and says which is pressed", () => {
    const h = renderToStaticMarkup(<QcGlance sections={SECTIONS} active="agent" onCourt={() => {}} />);
    expect(h).toMatch(/class="qcg-card qcg-card--agent is-on"/);
    expect(h).toMatch(/data-qcv="court-pick" aria-pressed="true" aria-label="19 said\. Show them in Recently updated"/);
    expect((h.match(/aria-pressed="false"/g) ?? []).length).toBe(2);
  });
  it("loading: the same parts, nothing stated, nothing pressable", () => {
    const h = html(SECTIONS, true);
    expect((h.match(/data-loading="true"/g) ?? []).length).toBe(3);
    expect(h).not.toContain('data-qcv="court-mom"');
    expect(h).not.toContain('data-qcv="court-face"');
    expect((h.match(/disabled=""/g) ?? []).length).toBe(3);
    expect((h.match(/data-qcv="court-line"/g) ?? []).length, "the lines hold their rows").toBe(6);
  });
  it("discsThatFit: one row, discs dropped from the end, room kept for +N", () => {
    /* 30px discs stepping 26, a 44px "+N": 8 discs are 212 wide */
    expect(discsThatFit(260, 16, 56, 30, 26, 44)).toBe(8);
    expect(discsThatFit(260, 4, 4, 30, 26, 44), "every query drawn: no +N to leave room for").toBe(4);
    expect(discsThatFit(108, 16, 4, 30, 26, 44), "exactly four fit, and there is no rest").toBe(4);
    expect(discsThatFit(107, 16, 4, 30, 26, 44), "one pixel short: two and +2").toBe(2);
    expect(discsThatFit(20, 16, 9, 30, 26, 44)).toBe(0);
    expect(discsThatFit(0, 16, 9, 30, 26, 44), "unmeasured: a few, never a second row").toBe(4);
  });
});
