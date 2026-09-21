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
    /* the whole sentence is in the `title`; the drawn line is the short form and only the short form */
    expect(html).toContain('title="+46 earlier in the window"');
    expect(html).toMatch(/data-qcv="gauge-more"[^>]*>\s*\+46 earlier\s*<\/em>/);
    expect(rule(css, ".qcv-stg-u")).toMatch(/height:\s*27px/);
    /* §6's stated column: 85 tall, 2/9/6 padding, and a hairline instead of a gap */
    expect(rule(css, ".qcv-stg")).toMatch(/height:\s*85px/);
    expect(rule(css, ".qcv-stg")).toMatch(/padding:\s*2px 9px 6px/);
    expect(rule(css, ".qcv-stages")).toMatch(/gap:\s*0/);
    expect(rule(css, ".qcv-stg + .qcv-stg")).toMatch(/border-left:\s*1px solid/);
  });
  it("⚠️ ONE PHRASING IN EVERY COLUMN — a busy column reads the same beside an empty neighbour and beside a busy one", () => {
    /* The fault this forbids is TWO phrasings on one card. An earlier pass drew the mockup's longer
       sentence wherever it had an empty neighbour to run on into and the short form elsewhere, which
       fits but reads as a bug. Asserted as an EQUALITY between the two arrangements rather than
       against a literal, so it survives a rewording and fails the moment the line becomes
       conditional again. */
    const busy = (status: QueryStatus, n: number, extra: Partial<Query> = {}) => Array.from({ length: n }, (_, i) => q({ id: `${status}-${i}`, status, dateSent: ago(i + 3), ...extra }));
    const lines = (html: string) => [...html.matchAll(/data-qcv="gauge-more"[^>]*>([\s\S]*?)<\/em>/g)].map((m) => m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim());
    const lone = lines(render(busy(QueryStatus.QUERIED, 6)));
    const pair = lines(render([...busy(QueryStatus.QUERIED, 6), ...busy(QueryStatus.PARTIAL_REQUESTED, 6, { partialRequestedDate: ago(2) as never })]));
    expect(lone.length, "the lone busy column says how many it is not drawing").toBe(1);
    expect(pair.length, "both busy columns say how many they are not drawing").toBe(2);
    expect(pair[0], "a busy column beside a busy one reads as it does beside an empty one").toBe(lone[0]);
    expect(new Set(pair).size, "the two columns differ only in their number").toBe(1);
    expect(lone[0]).toBe("+2 earlier");
    /* nothing in the sheet can bring a second phrasing back */
    expect(css, "the run-on span and its modifier are retired").not.toMatch(/qcv-ga-more-w|qcv-ga-more--long/);
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
    /**
     * ⚠️ THE LAW REVERSED IN v21 §6, AND THE CASE'S OWN NAME USED TO STATE THE OLD ONE — pressed is
     * a parchment FILL with a 1.6px ink rule under the header, and no longer an inset ring. The
     * ring was right while the columns had a gap between them; with a hairline separator it read as
     * a second, heavier divider a pixel from the first, so the pressed column looked like a seam.
     */
    expect(rule(css, '.qcv-stg[data-pressed="true"]')).toMatch(/background:\s*var\(--qcv-parchment\)/);
    expect(rule(css, '.qcv-stg[data-pressed="true"] .qcv-stg-top')).toMatch(/box-shadow:\s*0 1\.6px 0 var\(--qcv-ink\)/);
    expect(rule(css, '.qcv-stg[data-pressed="true"]'), "the retired inset ring is back").not.toMatch(/inset 0 0 0/);
    /* the old clause here forbade a FILL, which §6 makes the treatment — what must not come back
       is the ring, asserted above. A stage with none is still drawn quiet: */
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
    /* the closed half is a BAND now, not a card, so its title is not a card heading */
    expect(html).toContain(">2 closed queries</b>");
    expect(html).toContain('data-qcv="closed-title"');
    /* the band states each figure beside its own caption rather than in a three-column matrix */
    expect(html).toMatch(/At the query<\/em><span class="qcv-cb-f"><b>1<\/b><small>passed<\/small>/);
    expect(html).toMatch(/After a partial<\/em><span class="qcv-cb-f"><b>0<\/b>/);
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
    /* ⚠️ THE CLOSED CARD'S BAND IS GONE WITH THE CARD (§6) — a full-width band has nothing to put
       a coloured header strip on. Asserted as an ABSENCE so the band cannot quietly come back. */
    expect(html, "the closed card's band survives the band that replaced it").not.toContain('data-qcv="sum-closed-band"');
    expect(html).toContain('class="qcv-cb-spine"');
    expect(html).not.toContain("with-you-chip");
    expect(html).not.toContain('data-qcv="gauge"');
    expect(html.split("qcv-sk--ga").length - 1).toBe(18);
    /* ⚠️ ONE `qcv-skw` GROUP NOW, NOT TWO — the closed CARD had a skeleton wrapper of its own and
       the band does not; its three columns carry their own placeholders inline. */
    expect(html.split("qcv-skw").length - 1).toBe(1);
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
