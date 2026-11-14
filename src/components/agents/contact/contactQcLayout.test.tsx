/**
 * Contact list — Query Centre layout v1 (design-refs/contact-list-qc-layout-v7/). Rendered markup and source reads (this
 * repo's unit tests have no DOM); the page's geometry, clicks and the card's line are measured in
 * tests/e2e/clq1.measure.ts (L1–L7).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactHeaderQc, CLQ_ARCH, CLQ_RING, QC_ART_W } from "./ContactHeaderQc";
import { ContactViews, clearPick, PICK_ICON } from "./ContactViews";
import { ContactBar } from "./ContactBar";
import { emptyContactFilters, type AgentFacts, type ContactFilters } from "../../../lib/contactList";
import { applyPick, pickOn } from "../../../lib/contactV27";

const noop = () => {};
const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const header = (figures: { n: number; q: number; y: number }, health: { pct: number; gaps: number } | null = { pct: 16, gaps: 61 }) =>
  renderToStaticMarkup(<ContactHeaderQc loading={false} figures={figures} health={health} onAdd={noop} onDiscover={noop} onOpenHealth={noop} onNotQueried={noop} />);

describe("Phase 1 · the navy header", () => {
  it("is the Query Centre's header frame (shell/OpenHeader), with the page title on its h1", () => {
    const h = header({ n: 17, q: 17, y: 0 });
    expect(h).toMatch(/<header class="qc1531-hd clq-hd"/); /* React 19 SSR prepends image preloads */
    expect(h).toMatch(/<h1 class="qc1531-t" data-page-title="true"[^>]*>17 agents on file<\/h1>/);
    expect(read("./ContactHeaderQc.tsx")).toContain('from "../../shell/OpenHeader"');
  });
  it("\"1 agent on file\"; the ruled line: \"{x} not yet queried\" (the filter button) or \"All of them queried\"", () => {
    expect(header({ n: 1, q: 1, y: 0 })).toContain(">1 agent on file</h1>");
    const nq = header({ n: 17, q: 12, y: 0 });
    expect(nq).toMatch(/<p class="qc1531-for"[^>]*><i aria-hidden="true"><\/i><span><button type="button" class="clq-nq" data-clh2="notq">5 not yet queried<\/button><\/span><i/);
    expect(header({ n: 17, q: 17, y: 0 })).toMatch(/<span data-clh2="sub">All of them queried<\/span>/);
  });
  it("+ Add an agent (cream: the filled class) and Discover agents (outlined)", () => {
    const h = header({ n: 17, q: 17, y: 0 });
    expect(h).toMatch(/class="qc1531-b qc1531-b--n"[^>]*>\+ Add an agent</);
    expect(h).toMatch(/class="qc1531-b qc1531-b--g"[^>]*>Discover agents</);
  });
  it("the binoculars bird at the Query Centre art's width, mirrored", () => {
    expect(header({ n: 17, q: 17, y: 0 })).toContain(`src="/images/contact/discover-binoculars-bird.webp" alt="" width="${QC_ART_W}"`);
    expect(QC_ART_W).toBe(190);
    expect(read("./contactQcLayout.css")).toMatch(/\.cl27 \.clq-art img \{ transform: scaleX\(-1\); \}/);
  });
  it("List health: ring 140, the archivist 118 wide, the score on the pill, cream arc over the soft pink at 55%", () => {
    const h = header({ n: 17, q: 17, y: 0 });
    expect(CLQ_RING).toBe(140); expect(CLQ_ARCH).toBe(118);
    expect(h).toContain('style="width:140px;height:140px"');
    expect(h).toMatch(/<img class="cl26-arch" data-cl26="archivist"[^>]*width="118"/);
    expect(h).toMatch(/<span class="cl26-pct" data-cl26="pct"[^>]*>16%<\/span>/);
    expect(h).toContain('data-cl26="track" cx="23" cy="23" r="21" fill="none" style="stroke:rgba(232, 189, 180, 0.55)"');
    expect(h).toMatch(/data-cl26="arc"[^>]*style="stroke:#f4eee5"/);
    expect(h).toMatch(/<b class="cl26-ht">List health<\/b><span class="cl26-hm" data-cl26="missing"><em>61<\/em> details missing<\/span>/);
  });
  it("Fill the gaps runs the ring's handler; none at 0 gaps (\"Nothing missing\")", () => {
    expect(header({ n: 17, q: 17, y: 0 })).toMatch(/data-cl26="fill">Fill the gaps</);
    const z = header({ n: 17, q: 17, y: 0 }, { pct: 100, gaps: 0 });
    expect(z).not.toContain("Fill the gaps");
    expect(z).toContain("Nothing missing");
  });
});

const fx = (id: string, o: Partial<AgentFacts> = {}): AgentFacts => ({
  agent: { id, name: `Agent ${id}`, agency: "" } as AgentFacts["agent"], stand: "none", genres: [], gaps: [], door: "open", ...o,
} as unknown as AgentFacts);
const views = (f: ContactFilters = emptyContactFilters(), all: AgentFacts[] = [fx("a", { genres: ["Thriller"] }), fx("b", { genres: ["Romance"] })]) => renderToStaticMarkup(
  <ContactViews all={all} filters={f} onFilters={noop} sets={null} onSets={noop} pool={() => true} genreLabel={(_k, raw) => raw}
    genreHit={(k) => k === "thriller"} showing={all.length} onReset={noop} onExport={noop} />);

describe("Phase 2 · the Views panel", () => {
  it("is the Query Centre's own panel (shell/ViewsPanel), with its own hooks", () => {
    const h = views();
    expect(h).toMatch(/^<aside class="qc153-rail qc156-views" aria-label="Views" data-clq="views">/);
    expect(h).not.toContain("data-qc156");
    expect(read("./ContactViews.tsx")).toContain('from "../../shell/ViewsPanel"');
    expect(read("../../queries/centre/QcViews156.tsx")).toContain('from "../../shell/ViewsPanel"');
  });
  it("Views over Reset; All agents then the four picks in order, each with its count; All agents selected by default", () => {
    const h = views();
    expect(h).toMatch(/<b>Views<\/b><button type="button" class="qc153-rst" data-clq="reset" disabled="">Reset<\/button>/);
    const labels = [...h.matchAll(/data-clq="view" data-k="(\w+)" data-n="(\d+)"[\s\S]*?<span>([^<]+)<\/span>/g)].map((m) => `${m[1]}:${m[3]}`);
    expect(labels).toEqual(["all:All agents", "you:Your move", "ready:Ready to query", "wait:Waiting to hear back", "missing:Missing details"]);
    expect(h).toMatch(/aria-checked="true" class="qc156-vr is-on" data-clq="view" data-k="all"/);
  });
  it("icons: the Query Centre's where they match; Ready to query the paper plane, Missing details the document", () => {
    expect(PICK_ICON).toEqual({ you: "you", ready: "plane", wait: "clock", missing: "doc" });
  });
  it("a view at 0 fades and cannot be pressed", () => {
    expect(views()).toMatch(/data-clq="view" data-k="wait" data-n="0"[^>]*disabled=""/);
  });
  it("All agents clears the pick and touches nothing else; views are one at a time", () => {
    const f = { ...applyPick(emptyContactFilters(), "ready"), genres: ["thriller"] };
    expect(pickOn(f)).toBe("ready");
    expect(pickOn(clearPick(f))).toBe(null);
    expect(clearPick(f).genres).toEqual(["thriller"]);
    expect(pickOn(applyPick(applyPick(emptyContactFilters(), "you"), "missing"))).toBe("missing");
  });
  it("Refine within this view: Genres, a tick box per genre with its count; \"your book\" on the book's genres, no ✓ prefix", () => {
    const h = views();
    expect(h).toContain("Refine<small>within this view</small>");
    expect(h).toMatch(/<p class="qc156-vsl" id="[^"]+-gn">Genres<\/p>/);
    expect(h).toMatch(/role="checkbox"[^>]*data-clq="genre" data-k="thriller" data-n="1"[\s\S]*?<span class="qc156-vct">Thriller<span class="clq-yb" data-clq="your-book">your book<\/span><\/span>/);
    expect(h).toMatch(/data-clq="genre" data-k="romance"[\s\S]*?<span class="qc156-vct">Romance<\/span>/);
    expect(h).not.toContain("✓");
  });
  it("More filters: Where they stand and Submissions behind the row, closed until one of them is on", () => {
    const h = views();
    expect(h).toMatch(/<div id="[^"]+" class="qc156-mb" data-clq="more-body" hidden="">/);
    expect(h).toContain("<b>More filters</b><small>Where they stand, submissions</small>");
    expect(views({ ...emptyContactFilters(), open: "open" })).toMatch(/class="qc156-mb" data-clq="more-body">/);
  });
  it("the foot: \"{n} showing\" and the export, unchanged", () => {
    expect(views()).toMatch(/<span data-clq="showing">2 showing<\/span><button type="button" class="qc156-exp" data-clq="export">Export 2 agents<\/button>/);
  });
});

const bar = (shown: number, group: "letter" | "status" | "none" = "none") => renderToStaticMarkup(
  <ContactBar shown={shown} loading={false} search="" onSearch={noop} sortKey="surname" reversed={false} onSort={noop} group={group} onGroup={noop} />);

describe("Phase 3 · the light bar above the list", () => {
  it("is the Query Centre's bar (shell/ListBar) on its sticky strip", () => {
    const h = bar(17);
    expect(h).toMatch(/^<div class="qc154-tbw" data-clq="toolbar"><div class="qc153-bar" data-clq="bar">/);
    expect(read("./ContactBar.tsx")).toContain('from "../../shell/ListBar"');
    expect(read("../../queries/centre/QcBar153.tsx")).toContain('from "../../shell/ListBar"');
  });
  it("the count, Find with its \"/\" key, Sort showing the field and Group showing the grouping", () => {
    expect(bar(17)).toContain("<b>17</b> agents</span>");
    expect(bar(1)).toContain("<b>1</b> agent</span>");
    const h = bar(17);
    expect(h).toContain('placeholder="Find an agent or agency"');
    expect(h).toContain('<kbd aria-hidden="true">/</kbd>');
    expect(h).toMatch(/data-clq="sort"[\s\S]*?<b class="sc-f" data-sc="field">Surname<\/b>/);
    expect(h).toMatch(/data-clq="group"[^>]*><span aria-hidden="true">▤<\/span><b>No grouping<\/b>/);
    /* the "/" key finds the field by the hook v26's band carried */
    expect(h).toMatch(/<label class="qc153-find" data-cl26="find" data-cl24="find" data-nb1="find">/);
  });
  it("the navy band is gone from the card", () => {
    const sheet = read("./ContactSheet26.tsx");
    expect(sheet).not.toContain('className="cl26-band"');
    expect(read("./contactV26.css")).not.toMatch(/\.cl26-band\s*\{/);
  });
});

describe("Phase 4 · the card's line never breaks", () => {
  it("the frame's line is #e3d5c9", () => {
    expect(read("./contactQcLayout.css")).toMatch(/\.cl27 \.cl26-card \.cl26-frame \{ border-color: #e3d5c9; \}/);
  });
  it("no mask paints over the card's edge: the stuck mask and the pin's `stuck` are deleted", () => {
    expect(read("./contactV26.css")).not.toMatch(/\.cl26-pin\[data-stuck\]/);
    expect(read("./ContactSheet26.tsx")).not.toMatch(/data-stuck=|setStuck/);
  });
  it("the pin sits under the bar's strip (its height published by the bar)", () => {
    expect(read("./contactPrinciples.css")).toContain(".cl27 .cl26-pin { top: calc(var(--pin-cover, 12px) - 12px + var(--clq-strip, 34px) - 22px); }");
    /* v1.1 — stuck, the strip paints no fade; its ground reaches 14px past the column and stops 23px above its foot */
    expect(read("./contactQcLayout.css")).toMatch(/\.cl27 \.qc154-tbw(\.qc154-tbw){4}\[data-qc156-stuck\] \{ background: none; \}/);
    expect(read("./contactQcLayout.css")).toMatch(/\.cl27 \.qc154-tbw\[data-qc156-stuck\]::before \{\s*content: ""; position: absolute; z-index: -1; top: 0; bottom: 23px; left: -14px; right: -14px; background: var\(--ws-page\);/);
    expect(read("./ContactBar.tsx")).toContain('cover.style.setProperty("--clq-strip"');
  });
  it("the strip's stuck is re-read on mount, scroll, resize, the page shown again, visibility and --pin-cover — never only on scroll", () => {
    const src = read("./ContactBar.tsx");
    for (const s of ['addEventListener("scroll", on, true)', 'addEventListener("resize", on)', 'addEventListener("visibilitychange", on)', "new ResizeObserver(on)", "new MutationObserver(on)", 'attributeFilter: ["style"]', "    read();\n"]) {
      expect(src, s).toContain(s);
    }
  });
});

describe("the Query Centre's rules name the Contact list at the same specificity", () => {
  const css = (f: string) => read(`../../queries/centre/${f}`);
  it("the navy panel, the Views card and the strip", () => {
    expect(css("qcv156.css")).toContain(":is(.qc151.qc153, .cl27) > .qc1531-hd.qc1531-hd {");
    expect(css("qcv156.css")).toContain(":is(.qc151.qc153, .cl27) .qc153-rail.qc156-views {");
    expect(css("qcv156.css")).toContain(":is(.qc151.qc153, .cl27) .qc154-tbw.qc154-tbw.qc154-tbw[data-qc156-stuck] {");
    expect(css("qcv1534.css")).toContain(":is(.qc151.qc153, .cl27) .qc1531-hd { grid-template-columns: 268px");
    expect(css("qcv154.css")).toContain(":is(.qc151.qc153, .cl27) .qc154-tbw {");
    /* no bare page-only selector is left for the parts both pages mount */
    expect(css("qcv156.css")).not.toMatch(/(^|\n)\s*\.qc151\.qc153 > \.qc1531-hd/);
    expect(css("qcv156.css")).not.toMatch(/(^|\n)\s*\.qc151 \.qc156-v/);
  });
});

/* ═════════ QC layout v1.1 (design-refs/contact-list-pinned-v8/) ═════════ */
import { Bar as SlimBarCL } from "./ContactSlimBar";
import { ContactSheet26 } from "./ContactSheet26";

describe("v1.1 Phase 1 · the type guard", () => {
  it("the Query Centre's guard, scoped to the four shared pieces, in contactQcLayout.css (never a Query Centre sheet)", () => {
    const css = read("./contactQcLayout.css");
    expect(css).toContain(".cl27 :is(.qc1531-hd, .qc156-views, .qc154-tbw, .qc156-slim) :where(span, p, div, label, td, th, b, i, em, small, button, input) { font-family: inherit; }");
    expect(css).toContain(".cl27 :is(.qc1531-hd, .qc156-views, .qc154-tbw, .qc156-slim) { font: 400 16px/1.45 var(--sp-serif); }");
    expect(read("../../queries/centre/qcv151.css")).not.toMatch(/\.cl27/);
  });
});

describe("v1.1 Phase 2 · the collapsed bar is the Query Centre's", () => {
  const html = (f = { n: 17, q: 12, y: 0 }) => renderToStaticMarkup(<SlimBarCL figures={f} health={{ pct: 16, gaps: 61 }} onNotQueried={noop} onOpenHealth={noop} onAdd={noop} />);
  it("shell/SlimBar's markup: the title, the subline (still the filter button), List health in the streak's slot, + Add an agent", () => {
    const h = html();
    expect(h).toMatch(/^<div class="qc156-slim" data-clh2="slim" inert="" aria-hidden="true"><p class="qc156-st"><b data-clh2="slim-title">17 agents on file<\/b><i data-clh2="slim-sub"><button type="button" class="clq-snq" data-clh2="slim-notq">5 not yet queried<\/button><\/i><\/p>/);
    expect(h).toMatch(/<button type="button" class="qc156-sw clq-sh" data-clh2="slim-health"[^>]*aria-label="List health 16%. Open Housekeeping"><svg[\s\S]*?<\/svg><b>16%<\/b><em>list health<\/em><\/button>/);
    expect(h).toMatch(/<button type="button" class="qc156-sb" data-clh2="slim-add">\+ Add an agent<\/button><\/div><\/div>$/);
    expect(html({ n: 17, q: 17, y: 0 })).toContain('<i data-clh2="slim-sub">All of them queried</i>');
  });
  it("the old 48px slim row is gone", () => {
    expect(() => read("./ContactSlimRow.tsx")).toThrow();
    expect(read("./contactPrinciples.css")).not.toMatch(/\.clh2-slim/);
  });
});

describe("v1.1 Phase 3 · the cap", () => {
  const sheet = renderToStaticMarkup(<ContactSheet26 pool={[]} all={[]} group="none" sortKey="surname" reversed={false} onSort={noop}
    filters={emptyContactFilters()} onFilters={noop} onClearAll={noop} search="" onSearch={noop} genreWord={(r) => r} genreHit={() => false}
    openId={null} onOpen={noop} wouldShow={() => 0} gapsOf={() => null} onFill={noop} setChip={null} onClearFilters={noop} onExport={noop} />);
  it("the card's top is one sticky block: the cap › the white top › the frame's top › the rows it pins; then the rows' frame", () => {
    expect(sheet).toMatch(/<section class="cl26-card"[^>]*><div class="cl26-pin clq-cap" data-cl26="pin" data-clq="cap"><div class="clq-capin"><div class="clq-captop">[\s\S]*?data-cl26="heads"[\s\S]*?<\/div><\/div><\/div><div class="cl26-frame" data-cl26="frame">/);
  });
  it("the cap paints the ground and its ring only while pinned (at rest the card is today's card)", () => {
    const css = read("./contactQcLayout.css");
    expect(css).toContain(".cl27 .cl26-card > .clq-cap { margin: 0 -24px; padding: 0 14px; }");
    expect(css).toContain(".cl27 .cl26-card > .clq-cap[data-clq-stuck] { background: var(--ws-page); }");
    expect(css).toContain(".cl27 .clq-cap[data-clq-stuck] > .clq-capin { box-shadow: 0 0 0 1px #1c130f14; }");
    expect(css).toContain(".cl27 .clq-capin > .clq-captop { border: 1px solid #e3d5c9; border-bottom: 0; border-radius: 13px 13px 0 0; overflow: hidden; }");
    expect(read("./ContactBar.tsx")).toContain('cap.toggleAttribute("data-clq-stuck", c)');
  });
});
