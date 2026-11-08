/**
 * Query Centre v153.3 §4 — the filter rail as chips. Presentation only: the pills, tiles and rows write the same
 * `Qc138Filters` the old radio rows did. (A click on a pill is measured in tests/e2e/qc1533.measure.ts P1.)
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QcRail153 } from "./QcRail153";
import { emptyQc138Filters, type Qc138Filters } from "../../../lib/qc138";
import { QUICK_PICKS } from "../../../lib/qc140";
import type { RailCounts } from "../../../lib/qc153Rail";

const counts: RailCounts = {
  quick: { you: 4, over: 0, wait: 3, offers: 1 } as RailCounts["quick"],
  where: { you: 4, agent: 3, quiet: 16, closed: 4 },
  stand: { q: 7, ps: 1 },
  sent: {},
  more: {} as RailCounts["more"],
};
const html = (f: Qc138Filters = emptyQc138Filters()) => renderToStaticMarkup(
  <QcRail153 filters={f} onFilters={() => {}} counts={counts} sent={[]} onReset={() => {}} showing={10} total={10} onExport={() => {}} />,
);

describe("the filter rail, as chips", () => {
  it("one white card: no framed-slip rim or inner frame", () => {
    const h = html();
    expect(h).not.toMatch(/class="[^"]*\bsa-slip\b/);
    expect(h).not.toContain("sa-slip-in");
    expect(h).toContain('class="qc153-rin"');
  });
  it("Most used is a row of pills, each one's description in its title, no radio dot and no description line", () => {
    const h = html();
    const pills = [...h.matchAll(/<button[^>]*data-qc153="quick"[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(pills).toHaveLength(QUICK_PICKS.length);
    for (const [i, p] of pills.entries()) {
      expect(p).toContain('class="qc1533-pill');
      expect(p).toContain(`title="${QUICK_PICKS[i].line}"`);
      expect(p).toContain(`>${QUICK_PICKS[i].title}<`);
      expect(p).not.toContain("qc153-rd");
      expect(p).not.toContain("<small>");
    }
  });
  it("a pill keeps the radio semantics and fades at zero", () => {
    const off = html();
    expect(off).toMatch(/data-k="over"[^>]*disabled=""/);
    const on = html({ ...emptyQc138Filters(), you: true });
    expect(on).toMatch(/class="qc1533-pill is-on"[^>]*role="radio"|role="radio"[^>]*aria-checked="true"[^>]*class="qc1533-pill is-on"/);
  });
  it("the stage rows have no proportion bars; the headings a drawn chevron, never a typed one", () => {
    const h = html();
    expect(h).not.toContain("qc153-pbar");
    expect(h).not.toContain("⌄");
    expect((h.match(/data-qc153="rail-fold"[^>]*>[^<]*<i aria-hidden="true"><svg/g) ?? []).length).toBe(4);
  });
});
