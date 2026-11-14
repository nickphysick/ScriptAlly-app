/**
 * Query Centre v156 §6 — the Views panel, which replaces the filter rail (and qcRail153.test.tsx with it). Every control
 * writes the page's one `Qc138Filters`; the view model is lib/qc156 (its own tests). Clicks are measured in
 * tests/e2e/qc156.measure.ts V5.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import { QcViews156 } from "./QcViews156";
import { emptyQc138Filters, matches138, SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { STAND_ROWS, toggleStand } from "../../../lib/qc140";
import type { RailCounts } from "../../../lib/qc153Rail";
import { selectView156 } from "../../../lib/qc156";

const counts: RailCounts = {
  quick: { you: 4, over: 2, wait: 3, offers: 1 } as RailCounts["quick"],
  where: { you: 4, agent: 3, quiet: 16, closed: 4 },
  stand: { q: 7, pr: 1, ps: 1, fr: 1, fs: 0, of: 1, rj: 2, nr: 0 },
  sent: { pkgA: 2, [SENT_NONE]: 5 },
  more: { dueWeek: 0, past: 2, missing: 5, overYear: 4 },
};
const sent = [{ key: "pkgA", name: "Spring round" }, { key: SENT_NONE, name: "Nothing recorded" }];
const F = (o: Partial<Qc138Filters> = {}): Qc138Filters => ({ ...emptyQc138Filters(), ...o });
const html = (f: Qc138Filters = F()) => renderToStaticMarkup(
  <QcViews156 filters={f} onFilters={() => {}} counts={counts} allN={26} sent={sent} onReset={() => {}} showing={26} onExport={() => {}} />,
);
const views = (h: string) => [...h.matchAll(/<button[^>]*data-qc156="view"[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);

describe("the Views panel", () => {
  it("Views over Reset; the five views with icons, today's labels and counts; All queries selected by default", () => {
    const h = html();
    expect(h).toMatch(/<b>Views<\/b><button[^>]*data-qc156="reset"[^>]*>Reset<\/button>/);
    const v = views(h);
    expect(v.map((x) => x.match(/<span>([^<]*)<\/span>/)?.[1])).toEqual(["All queries", "Your move", "Overdue", "Waiting to hear back", "Offers"]);
    expect(v.map((x) => x.match(/<em>(\d+)<\/em>/)?.[1])).toEqual(["26", "4", "2", "3", "1"]);
    expect(v.every((x) => x.includes("<svg"))).toBe(true);
    expect(v[0]).toMatch(/aria-checked="true"/);
    expect(v.slice(1).every((x) => x.includes('aria-checked="false"'))).toBe(true);
  });
  it("selecting a view replaces the previous one (the selected row is the one the filters hold)", () => {
    const f = selectView156(selectView156(F(), "you"), "wait");
    const v = views(html(f));
    expect(v.filter((x) => x.includes('aria-checked="true"'))).toHaveLength(1);
    expect(v[3]).toMatch(/aria-checked="true"[^>]*class="qc156-vr is-on"/);
  });
  it("All queries clears it", () => {
    const v = views(html(selectView156(selectView156(F(), "offers"), "all")));
    expect(v[0]).toContain('aria-checked="true"');
    expect(v[4]).toContain('aria-checked="false"');
  });
  it("Refine within this view: a Status tick box per stage with a count, StatusDot glyphs, none at 0", () => {
    const h = html();
    expect(h).toContain("Refine<small>within this view</small>");
    const st = [...h.matchAll(/data-qc156="status" data-k="(\w+)" data-n="(\d+)"/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(st).toEqual(["q:7", "pr:1", "ps:1", "fr:1", "of:1", "rj:2"]);
    expect(h).toMatch(/data-qc156="status"[\s\S]*?class="sd-|data-qc156="status"[\s\S]*?<svg/);
    expect(h).toMatch(/role="checkbox"/);
  });
  it("ticking two statuses shows queries in either (the union), as the stage filter does", () => {
    const q = STAND_ROWS.find((r) => r.key === "q")!, of = STAND_ROWS.find((r) => r.key === "of")!;
    const f = toggleStand(toggleStand(F(), q), of);
    const row = (status: QueryStatus) => ({ status, pastExpected: false, sentMs: 0, court: "agent", query: {}, furthest: status } as unknown as Parameters<typeof matches138>[0]);
    expect(matches138(row(QueryStatus.QUERIED), f, 0)).toBe(true);
    expect(matches138(row(QueryStatus.OFFER), f, 0)).toBe(true);
    expect(matches138(row(QueryStatus.FULL_SENT), f, 0)).toBe(false);
    const h = html(f);
    expect(h).toMatch(/aria-checked="true"[^>]*data-qc156="status" data-k="q"/);
    expect(h).toMatch(/aria-checked="true"[^>]*data-qc156="status" data-k="of"/);
  });
  it("More filters is closed by default, with What you sent and Dates behind it", () => {
    const h = html();
    expect(h).toMatch(/data-qc156="more-body" hidden=""/);
    expect(h).toMatch(/aria-expanded="false"[^>]*><span><b>More filters<\/b><small>What you sent, dates<\/small>/);
    expect(h).toContain(">What you sent</p>");
    expect(h).toContain(">Dates</p>");
    expect([...h.matchAll(/data-qc156="date" data-k="(\w+)"/g)].map((m) => m[1])).toEqual(["dueWeek", "past", "missing", "overYear"]);
  });
  it("More filters opens by itself when one of its filters is active on load", () => {
    for (const f of [F({ sent: ["pkgA"] }), F({ missing: true }), F({ dueWeek: true }), F({ overYear: true })]) {
      const h = html(f);
      expect(h).not.toMatch(/data-qc156="more-body" hidden/);
      expect(h).toMatch(/aria-expanded="true"/);
    }
    /* the Overdue view is `past`, a view, not a More filter */
    expect(html(F({ past: true }))).toMatch(/data-qc156="more-body" hidden=""/);
  });
  it("the footer: n showing, and the existing export", () => {
    const h = html();
    expect(h).toContain('data-qc156="showing">26 showing</span>');
    expect(h).toContain(">Export 26 queries</button>");
  });
  it("the rail's sections are gone: no Most used, Where it stands, tiles or stage bars", () => {
    const h = html();
    for (const gone of ["Most used", "Where it stands", "With you", "With the agent", "Gone quiet", "qc153-court", "qc153-courts"]) expect(h).not.toContain(gone);
  });
});

describe("the page wiring", () => {
  const q = readFileSync(resolve(__dirname, "../../Queries.tsx"), "utf8");
  it("the filter column is the Views panel; the rail is gone", () => {
    expect(q).toMatch(/rail=\{<QcViews156 /);
    expect(q).not.toMatch(/QcRail153/);
  });
  it("a held \"Where it stands\" tile filter is cleared on the desktop (it has no control there)", () => {
    expect(q).toMatch(/if \(qcDesk && qcF138\.where\) setQcF138\(\(f\) => \(\{ \.\.\.f, where: null \}\)\);/);
  });
});
