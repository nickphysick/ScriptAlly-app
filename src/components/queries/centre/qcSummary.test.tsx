/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcSummary — the summary row, rendered. The widths themselves are locked against known dates in
 * `lib/qcSummary.test.ts`; this asserts that what is RENDERED is those widths, that the row cannot
 * grow with the account, and that the page's font reset cannot eat a mono caption again.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Agent, Query, QueryStatus } from "../../../types";
import { buildQcRows, closedGrid, stageColumns, stageFilter } from "../../../lib/qcSummary";
import { QcSummary } from "./QcSummary";

const DAY = 86_400_000, NOW = Date.UTC(2026, 8, 19, 12);
const ago = (d: number) => new Date(NOW - d * DAY).toISOString();
let n = 0;
const q = (over: Partial<Query>): Query => ({ id: `q${++n}`, userId: "u", manuscriptId: "m", agentId: "a", packageId: "", personalisationNotes: "", sendMethod: "Email" as never, status: QueryStatus.QUERIED, dateSent: ago(20), ...over });
const agent = { id: "a", userId: "u", name: "Jonathan Marsh", agency: "The Marsh Agency", responseTimeWeeks: 4 } as Agent;
const render = (qs: Query[], over: Partial<React.ComponentProps<typeof QcSummary>> = {}) => {
  const rows = buildQcRows(qs, [agent], [], NOW);
  return renderToStaticMarkup(<QcSummary loading={false} liveCount={rows.filter((r) => r.court !== "closed").length} withYouCount={rows.filter((r) => r.withYou).length}
    columns={stageColumns(rows, NOW)} closed={closedGrid(rows)} filter="all" onFilter={() => {}} onOpen={() => {}} selectedId={null} {...over} />);
};
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const css = decls(readFileSync(join(process.cwd(), "src/components/queries/centre/qcvSummary.css"), "utf8"));
const pageCss = decls(readFileSync(join(process.cwd(), "src/components/queries/centre/qcvPage.css"), "utf8"));
const rule = (sheet: string, sel: string) => { const m = sheet.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`)); expect(m, `${sel} has no rule`).toBeTruthy(); return m![1]; };

describe("the live card", () => {
  it("states the count and the 'with you' chip, singular-safe", () => {
    const html = render([q({}), q({ status: QueryStatus.PARTIAL_REQUESTED }), q({ status: QueryStatus.REJECTED })]);
    expect(html).toContain(">2 live queries</h3>");
    expect(html).toMatch(/data-qcv="with-you-chip"[^>]*>1 with you<\/button>/);
    expect(render([q({})])).toContain(">1 live query</h3>");
  });
  it("⚠️ the rendered widths ARE the derivation's: 28 days into a 28-day window is navy to 70% and no ink; 42 is 70 + 30", () => {
    const at = render([q({ dateSent: ago(28) })]);
    expect(at).toMatch(/data-kind="within"[^>]*>.*?data-qcv="gauge-fill" style="width:70\.00%"/s);
    expect(at).not.toContain('data-qcv="gauge-over"');
    const past = render([q({ dateSent: ago(42) })]);
    expect(past).toMatch(/data-kind="past"/);
    expect(past).toContain('data-qcv="gauge-fill" style="width:70.00%"');
    expect(past).toContain('data-qcv="gauge-over" style="width:30.00%"');
    const none = renderToStaticMarkup(<QcSummary loading={false} liveCount={1} withYouCount={0} columns={stageColumns(buildQcRows([q({})], [{ ...agent, responseTimeWeeks: undefined } as Agent], [], NOW), NOW)}
      closed={closedGrid([])} filter="all" onFilter={() => {}} onOpen={() => {}} selectedId={null} />);
    expect(none).toMatch(/data-kind="nodate"/);
    expect(none).not.toContain('data-qcv="gauge-fill"');
  });
  it("⚠️ FIFTY queries in one stage render FOUR gauges and one line — the row cannot grow with the account", () => {
    const html = render(Array.from({ length: 50 }, (_, i) => q({ dateSent: ago(i + 1) })));
    expect(html.split('data-qcv="gauge"').length - 1).toBe(4);
    expect(html).toContain(">+46 earlier in the window</em>");
    expect(rule(css, ".qcv-stg-u")).toMatch(/height:\s*27px/);
    expect(rule(css, ".qcv-stg")).toMatch(/height:\s*84px/);
  });
  it("a gauge carries a title AND the same accessible name, and is a button that is NOT inside a button", () => {
    const html = render([q({ dateSent: ago(22) })]);
    const m = html.match(/<button type="button" class="qcv-ga[^"]*"[^>]*title="([^"]+)"[^>]*aria-label="([^"]+)"/);
    expect(m, "no gauge button").toBeTruthy();
    expect(m![1]).toBe(m![2]);
    expect(m![1]).toBe("Jonathan Marsh, 6 days until the expected date");
    /* the column is a div; its header button closes before the first gauge opens */
    const col = html.slice(html.indexOf('data-qcv="stage"'));
    expect(col.indexOf("</button>")).toBeLessThan(col.indexOf('class="qcv-ga'));
    expect(html).not.toMatch(/<button[^>]*>(?:(?!<\/button>).)*<button/s);
  });
  it("six columns; a seventh — and the class that narrows the type — only with a live R&R", () => {
    expect(render([q({})]).split('data-qcv="stage"').length - 1).toBe(6);
    const seven = render([q({}), q({ status: QueryStatus.REVISE_RESUBMIT })]);
    expect(seven.split('data-qcv="stage"').length - 1).toBe(7);
    expect(seven).toContain("qcv-sum--seven");
    expect(render([q({})])).not.toContain("qcv-sum--seven");
  });
  it("a stage with none is drawn quiet; the pressed stage wears a ring, never a fill", () => {
    const html = render([q({})], { filter: stageFilter(QueryStatus.QUERIED) });
    expect(html).toMatch(/class="qcv-stg" data-qcv="stage" data-stage="Queried" data-count="1" data-pressed="true"/);
    expect(html).toMatch(/class="qcv-stg qcv-stg--zero" data-qcv="stage" data-stage="Offer"/);
    expect(rule(css, '.qcv-stg[data-pressed="true"]')).toMatch(/box-shadow:\s*inset 0 0 0 1\.6px var\(--qcv-ink\)/);
    expect(rule(css, '.qcv-stg[data-pressed="true"]')).not.toMatch(/background/);
  });
  it("a status is drawn by StatusDot only — no glyph is redrawn here", () => {
    const src = decls(readFileSync(join(process.cwd(), "src/components/queries/centre/QcSummary.tsx"), "utf8"));
    expect(src).not.toMatch(/<svg|<path|<circle/);
    expect(src.split("<StatusDot").length - 1).toBe(2);
  });
});

describe("the closed card", () => {
  it("numbers, zeros drawn quiet, and the withdrawn line only when there is one", () => {
    const html = render([q({ status: QueryStatus.REJECTED }), q({ status: QueryStatus.NO_RESPONSE }), q({ status: QueryStatus.WITHDRAWN })]);
    expect(html).toContain(">2 closed queries</h3>");
    expect(html).toMatch(/At the query<\/span><b class="qcv-mx-n">1<\/b><b class="qcv-mx-n">1<\/b>/);
    expect(html).toMatch(/After a partial<\/span><b class="qcv-mx-n qcv-mx-n--z">0<\/b>/);
    expect(html).toMatch(/data-qcv="withdrawn-line">\+1 withdrawn, not counted here</);
    expect(render([q({ status: QueryStatus.REJECTED })])).not.toContain("withdrawn-line");
    expect(html).toMatch(/title="Closed after a full was requested, or beyond[^"]*"/);
    expect(rule(css, ".qcv-mx-wd")).toMatch(/font-size:\s*8px/);
    expect(rule(css, ".qcv-mx-wd")).toMatch(/color:\s*var\(--qcv-ink-45\)/);
  });
});

describe("loading: the REAL cards, with placeholders inside them", () => {
  it("both cards and both bands render; no counts, no chips, six columns of three gauge lines, ONE pulse per group", () => {
    const html = render([], { loading: true });
    expect(html).toContain('data-qcv="sum-live"');
    expect(html).toContain('data-qcv="sum-closed-band"');
    expect(html).not.toContain("with-you-chip");
    expect(html).not.toContain('data-qcv="gauge"');
    expect(html.split("qcv-sk--ga").length - 1).toBe(18);
    expect(html.split("qcv-skw").length - 1).toBe(2);
    expect(css).toMatch(/@keyframes qcv-pulse \{ 0% \{ opacity: 1; \} 50% \{ opacity: 0\.5; \} 100% \{ opacity: 1; \} \}/);
    expect(css.match(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g)!.join("")).not.toContain("var(");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.qcv-skw \{ animation: none; \} \}/);
  });
});

describe("⚠️ the font reset cannot outrank a caption again", () => {
  it("it is exactly 0-1-0 (`:where` on the element list and the exclusion), and it comes before every text rule", () => {
    const reset = /\.qcv-own :where\(span, p, div, label\):where\(:not\(\.qcv-legacy, \.qcv-legacy \*\)\)\s*\{\s*font-family:\s*inherit;\s*\}/;
    expect(pageCss).toMatch(reset);
    const at = pageCss.search(reset);
    for (const later of [".qcv-line ", ".qcv-pk ", ".qcv-export", ".qcv-none"]) expect(pageCss.indexOf(later), `${later} is declared before the reset it must beat`).toBeGreaterThan(at);
  });
  it("every v11 component imports the page sheet BEFORE its own, so the order is structural", () => {
    for (const f of ["QcSummary.tsx"]) {
      const src = readFileSync(join(process.cwd(), "src/components/queries/centre", f), "utf8");
      const page = src.indexOf('import "./qcvPage.css"'), own = src.search(/import "\.\/qcv(?!Page)[A-Za-z]+\.css"/);
      expect(page, `${f} does not import the page sheet`).toBeGreaterThan(-1);
      expect(own, `${f} imports no sheet of its own`).toBeGreaterThan(page);
    }
  });
  it("the mono captions name the mono face", () => {
    for (const sel of [".qcv-keyline", ".qcv-ga-more", ".qcv-mx-wd", ".qcv-mini", ".qcv-mx em"]) expect(rule(css, sel), sel).toMatch(/font-family:\s*var\(--qcv-mono\)/);
  });
});
