/**
 * List filters v1 Phase 1 — the shared Filter panel and its parts (shell/FilterPanel). Markup and roles only: the two
 * pages' contents are queries/centre/qcViews156.test.tsx and agents/contact/contactViews.test.tsx; the rendered look and
 * clicks are tests/e2e/lf1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import {
  FilterFold, FilterPanel, FilterPills, FilterSection, FilterSplit, FilterSwitch, FilterTile, FilterTiles,
} from "./FilterPanel";

const noop = () => {};
const panel = (on: number, kids: React.ReactNode, loading = false) => renderToStaticMarkup(
  <FilterPanel hook="data-tst" label="Filter the list" on={on} onClear={noop} foot="All 3 things." loading={loading}>{kids}</FilterPanel>,
);
const css = readFileSync(resolve(__dirname, "filterPanel.css"), "utf8");

describe("the card", () => {
  it("keeps the rail's bones (qc153-rail) and carries the caller's probe, never another page's", () => {
    const h = panel(0, null);
    expect(h).toMatch(/<aside class="qc153-rail fp" aria-label="Filter the list" data-tst="panel"/);
    expect(h).not.toMatch(/data-qc156=|data-clq=/);
  });
  it("the head: \"Filter\", no \"{n} on\" at 0, Clear all disabled; \"2 on\" and Clear all live when filters are on", () => {
    const off = panel(0, null);
    expect(off).toMatch(/<b class="fp-t" data-tst="title">Filter<\/b><button[^>]*data-tst="clear" disabled=""[^>]*>Clear all<\/button>/);
    const on = panel(2, null);
    expect(on).toMatch(/<span class="fp-on" data-tst="on">2 on<\/span>/);
    expect(on).toMatch(/<button[^>]*data-tst="clear"(?![^>]*disabled)[^>]*>Clear all<\/button>/);
  });
  it("never says Views, Refine, More filters, Reset or Export", () => {
    const h = panel(1, <FilterSection probe="s" title="Stage"><FilterSwitch k="a" label="A" n={1} on={false} onToggle={noop} /></FilterSection>);
    for (const w of ["Views", "Refine", "More filters", "Reset", "Export"]) expect(h).not.toContain(w);
  });
  it("the foot is one polite live sentence", () => {
    expect(panel(0, null)).toMatch(/<p class="fp-ft" aria-live="polite" data-tst="foot">All 3 things\.<\/p>/);
  });
  it("loading: every control disabled and Clear all too, the foot blank", () => {
    const h = panel(2, <FilterTile k="t" n={3} label="T" icon="you" on={false} onPress={noop} />, true);
    expect(h).toMatch(/data-tst="tile"[^>]*disabled=""/);
    expect(h).toMatch(/data-tst="clear" disabled=""/);
    expect(h).toMatch(/data-tst="foot"> <\/p>/);
  });
});

describe("the parts", () => {
  const inPanel = (k: React.ReactNode) => panel(0, k);
  it("FilterTile: a radio with its count, icon and label; at 0 and off it is inert", () => {
    const h = inPanel(<FilterTiles label="What needs you">
      <FilterTile k="a" n={5} label="Your move" icon="you" on={false} onPress={noop} title="Requests" />
      <FilterTile k="b" n={0} label="Offers" icon="seal" on={false} onPress={noop} />
      <FilterTile k="c" n={0} label="On at zero" icon="clock" on onPress={noop} />
    </FilterTiles>);
    expect(h).toMatch(/role="radiogroup" aria-label="What needs you"/);
    expect(h).toMatch(/<button type="button" role="radio" aria-checked="false" class="fp-tile" data-tst="tile" data-k="a" data-n="5" title="Requests">/);
    expect(h).toMatch(/data-k="b"[^>]*disabled=""/);
    expect(h).toMatch(/class="fp-tile is-zero"/);
    /* a tile that is on is never inert, even at 0 */
    expect(h).toMatch(/class="fp-tile is-on" data-tst="tile" data-k="c" data-n="0">/);
  });
  it("FilterTile wide: count, then label over its line, the icon at the right; a checkbox when asked", () => {
    const h = inPanel(<FilterTile k="r" n={12} label="Ready to query" line="Open, and not yet queried" icon="plane" on={false} wide onPress={noop} role="checkbox" />);
    expect(h).toMatch(/role="checkbox"[^>]*class="fp-tile fp-tile--wide"[^>]*><b class="fp-n" data-n="12">12<\/b><span class="fp-tx">Ready to query<small>Open, and not yet queried<\/small><\/span><svg/);
  });
  it("FilterPills: checkboxes with a count; a tick when asked; a dashed \"+n more\"", () => {
    const h = inPanel(<FilterPills probe="sent" label="What you sent" more={{ n: 3, onPress: noop }}
      items={[{ k: "a", label: "Round one", n: 6, on: true, onToggle: noop, tick: true }, { k: "b", label: "Round two", n: 0, on: false, onToggle: noop }]} />);
    expect(h).toMatch(/role="checkbox" aria-checked="true" class="fp-pill is-on" data-tst="sent" data-k="a" data-n="6"><svg class="fp-tk"/);
    expect(h).toMatch(/class="fp-pill is-zero"[^>]*disabled=""/);
    expect(h).toMatch(/class="fp-pill fp-pill--more" data-tst="sent-more">\+3 more<\/button>/);
  });
  it("FilterSplit: a radiogroup of two sides, each as wide as its count", () => {
    const h = inPanel(<FilterSplit probe="queried" label="Have you queried them?" sides={[
      { k: "no", n: 30, words: "not yet queried", on: false, onPress: noop }, { k: "yes", n: 12, words: "queried", on: true, onPress: noop },
    ]} />);
    expect(h).toMatch(/class="fp-split" role="radiogroup" aria-label="Have you queried them\?" data-tst="queried"/);
    expect(h).toMatch(/role="radio" aria-checked="false" class="fp-sg fp-sg--a" data-tst="side" data-k="no" data-n="30" style="flex-grow:30"/);
    expect(h).toMatch(/role="radio" aria-checked="true" class="fp-sg fp-sg--b is-on"/);
  });
  it("FilterSwitch: a switch with its label and count", () => {
    expect(inPanel(<FilterSwitch k="dueWeek" label="Due this week" n={2} on onToggle={noop} />))
      .toMatch(/role="switch" aria-checked="true" class="fp-sw is-on" data-tst="switch" data-k="dueWeek" data-n="2"><span class="fp-swl">Due this week<\/span>/);
  });
  it("FilterFold: closed by default; open with \"{n} on\" while a filter inside is set", () => {
    const closed = inPanel(<FilterFold probe="dates" title="Dates" on={0}><i>x</i></FilterFold>);
    expect(closed).toMatch(/data-tst="dates" aria-expanded="false"/);
    expect(closed).toMatch(/data-tst="dates-body" hidden=""/);
    const open = inPanel(<FilterFold probe="dates" title="Dates" on={2}><i>x</i></FilterFold>);
    expect(open).toMatch(/data-tst="dates" aria-expanded="true"[^>]*><span><b>Dates<\/b><small data-tst="dates-on">2 on<\/small>/);
    expect(open).not.toMatch(/data-tst="dates-body" hidden/);
  });
});

describe("the sheet", () => {
  it("is scoped to the two pages and to .fp, and names no stage colour, no powder blue and no color-mix", () => {
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(rules).toContain(":is(.qc151.qc153, .cl27) .qc153-rail.fp {");
    for (const hex of ["#efe6d6", "#e4ebf2", "#b7c9de", "#efcdc9", "#eceae6", "#e3e8ef", "#eef2f7", "#e9eef5"]) expect(rules.toLowerCase()).not.toContain(hex);
    expect(rules).not.toContain("color-mix(");
  });
  it("every control has a visible focus ring; targets are at least 32px", () => {
    expect(css).toContain(":is(.qc151.qc153, .cl27) .fp :focus-visible { outline: 2px solid #2a3a52; outline-offset: 2px; }");
    for (const sel of [".fp-pill {", ".fp-tile {", ".fp-clr {"]) {
      const block = css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
      expect(block, sel).toMatch(/min-height: (3[2-9]|[4-9]\d)px/);
    }
  });
});
