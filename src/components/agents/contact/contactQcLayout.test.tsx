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
    /* stuck, the strip's last 22px paint nothing (the pin is there) */
    expect(read("./contactQcLayout.css")).toMatch(/\.cl27 \.qc154-tbw(\.qc154-tbw){4}\[data-qc156-stuck\] \{\s*background: linear-gradient\(to bottom, var\(--ws-page\) 0, var\(--ws-page\) calc\(100% - 22px\), transparent calc\(100% - 22px\)\);/);
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
