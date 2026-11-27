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
import { ContactViews, agentsFoot, GENRES_SHOWN } from "./ContactViews";
import { ContactBar } from "./ContactBar";
import { emptyContactFilters, type AgentFacts, type ContactFilters } from "../../../lib/contactList";
import { appliedChoices, railOn, toggleReady } from "../../../lib/contactV27";
import { STAGE_COLOURS } from "../../../lib/stageColours";

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

const fx = (id: string, o: Partial<AgentFacts> = {}, agent: Record<string, unknown> = {}): AgentFacts => ({
  agent: { id, name: `Agent ${id}`, agency: "", ...agent } as AgentFacts["agent"], stand: "none", standing: { kind: "none" }, status14: "none",
  genres: [], gaps: 0, door: "open", openKey: "open", ...o,
} as unknown as AgentFacts);
/* five agents: a and b open and not queried (a always replies, a's genre is the book's), c queried and closed, d open,
   queried and with gaps in its profile, e with its door not known */
const FX = [
  fx("a", { genres: ["Thriller"] }, { noResponseMeansNo: false }),
  fx("b", { genres: ["Romance"] }),
  fx("c", { openKey: "closed", standing: { kind: "agent" } as unknown as AgentFacts["standing"], genres: ["Crime"] }),
  fx("d", { gaps: 2, standing: { kind: "agent" } as unknown as AgentFacts["standing"] }),
  fx("e", { openKey: "unstated" }),
];
const views = (f: ContactFilters = emptyContactFilters(), all: AgentFacts[] = FX) => renderToStaticMarkup(
  <ContactViews all={all} filters={f} onFilters={noop} sets={null} pool={() => true} genreLabel={(_k, raw) => raw}
    genreHit={(k) => k === "thriller"} showing={all.length} onReset={noop} />);
const btn = (h: string, probe: string) => [...h.matchAll(new RegExp(`<button[^>]*data-clq="${probe}"[^>]*>[\\s\\S]*?</button>`, "g"))].map((m) => m[0]);
const E = emptyContactFilters;

describe("List filters v1 Phase 3 · the Agents panel", () => {
  it("is the shared Filter panel (shell/FilterPanel) with the Agents list's own hooks; ViewsPanel is gone", () => {
    const h = views();
    expect(h).toMatch(/^<aside class="qc153-rail fp" aria-label="Filter your agents" data-clq="panel">/);
    expect(h).not.toContain("data-qc156");
    expect(read("./ContactViews.tsx")).toContain('from "../../shell/FilterPanel"');
    expect(() => read("../../shell/ViewsPanel.tsx")).toThrow();
  });
  it("Who to query next: Ready to query wide, then Always reply and Missing details; no Your move, no Waiting to hear back", () => {
    const h = views();
    const t = btn(h, "tile");
    expect(t.map((x) => x.match(/data-k="(\w+)" data-n="(\d+)"/)?.slice(1).join(":"))).toEqual(["ready:2", "always:1", "missing:1"]);
    expect(t[0]).toMatch(/class="fp-tile fp-tile--wide"[\s\S]*Ready to query<small>Open, and not yet queried<\/small>/);
    expect(t[1]).toMatch(/title="Even when it’s a no"/);
    expect(t[2]).toMatch(/title="Gaps in their profile"/);
    for (const gone of ["Your move", "Waiting to hear back", "All agents", "Views", "Refine", "More filters", "Where they stand", "Export"]) expect(h).not.toContain(gone);
  });
  it("Ready to query sets both fields and clears both; both split sides read on with it, and it is one applied chip", () => {
    const on = toggleReady(E());
    expect([on.queried, on.open]).toEqual(["no", "open"]);
    expect(toggleReady(on)).toEqual(E());
    const h = views(on);
    expect(btn(h, "tile")[0]).toMatch(/aria-checked="true"/);
    expect(btn(h, "side").filter((x) => x.includes('aria-checked="true"')).map((x) => x.match(/data-k="(\w+)"/)?.[1])).toEqual(["no", "open"]);
    expect(appliedChoices(on, (k) => k).map((c) => c.label)).toEqual(["Ready to query"]);
    expect(appliedChoices(on, (k) => k)[0].drop(on)).toEqual(E());
    expect(railOn(on, null)).toBe(1);
    /* one of the two alone is not Ready to query: its own chip, as before */
    expect(appliedChoices({ ...E(), queried: "no" }, (k) => k).map((c) => c.label)).toEqual(["Not queried yet"]);
  });
  it("Always reply and Missing details are independent, and either can be on with Ready to query", () => {
    const h = views({ ...toggleReady(E()), always: true, missing: true });
    expect(btn(h, "tile").every((x) => x.includes('aria-checked="true"'))).toBe(true);
    expect(btn(h, "tile").every((x) => x.includes('role="checkbox"'))).toBe(true);
  });
  it("the splits: counts, words, and the \"not known\" link while any door is not known", () => {
    const h = views();
    expect(btn(h, "side").map((x) => `${x.match(/data-k="(\w+)" data-n="(\d+)"/)?.slice(1).join(":")}:${x.match(/<span>([^<]+)</)?.[1]}`))
      .toEqual(["no:3:not yet queried", "yes:2:queried", "open:3:open to queries", "closed:1:closed for now"]);
    expect(h).toMatch(/<button type="button" class="fp-lnk" data-clq="not-known" aria-pressed="false">1 not known<\/button>/);
    expect(views(E(), FX.slice(0, 4))).not.toContain("not known");
  });
  it("What they want: the book's genre first with a tick, the key under the pills; no powder \"your book\" tag", () => {
    const h = views();
    const g = btn(h, "genre");
    expect(g[0]).toMatch(/data-k="thriller"[^>]*><svg class="fp-tk"/);
    expect(g.slice(1).some((x) => x.includes("fp-tk"))).toBe(false);
    expect(h).toMatch(/data-clq="book-key"><svg class="fp-tk"[\s\S]*?<\/svg>Genres your book carries<\/p>/);
    expect(h).not.toMatch(/your book<|clq-yb|#e3e8ef/);
  });
  it("six genres, then \"+{n} more\"; none on file says so", () => {
    const many = Array.from({ length: 9 }, (_, i) => fx(`g${i}`, { genres: [`Genre ${String.fromCharCode(65 + i)}`] }));
    const h = views(E(), many);
    expect(btn(h, "genre")).toHaveLength(GENRES_SHOWN);
    expect(h).toMatch(/data-clq="genre-more">\+3 more<\/button>/);
    expect(views(E(), [fx("z")])).toContain('<span class="fp-none" data-clq="genres-none">No genres on file yet</span>');
  });
  it("no stage colour anywhere in the panel", () => {
    const h = views(toggleReady(E())).toLowerCase();
    for (const c of Object.values(STAGE_COLOURS)) for (const hex of Object.values(c)) expect(h).not.toContain(hex);
  });
  it("the foot", () => {
    expect(agentsFoot(false, 5, 5, 3)).toBe("All 5 agents. 3 not yet queried.");
    expect(agentsFoot(false, 5, 5, 0)).toBe("All 5 agents.");
    expect(agentsFoot(true, 2, 5, 3)).toBe("Showing 2 of 5 agents.");
  });
});

const bar = (shown: number, group: "letter" | "status" | "none" = "none") => renderToStaticMarkup(
  <ContactBar shown={shown} loading={false} search="" onSearch={noop} sortKey="surname" reversed={false} onSort={noop} group={group} onGroup={noop} onExport={noop} />);

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
    /* List filters v1 — labelled: "Group:", the value ("None" ungrouped), a caret; Sort: "Sort:", the field, ↑ */
    expect(h).toMatch(/data-clq="group"[^>]*><span class="lf-ic" aria-hidden="true">▤<\/span><em class="lf-lab">Group:<\/em><b>None<\/b><svg class="lf-cv"/);
    expect(h).toMatch(/<em class="sc-sby sc-lab lf-lab">Sort:<\/em><b class="sc-f" data-sc="field">Surname<\/b><i class="sc-dir" data-sc="dir" data-reversed="false" title="A to Z">↑<\/i>/);
    expect(h).toMatch(/data-clq="export" aria-label="Export 17 agents" title="Export 17 agents"/);
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
    /* To-do v56 re-pointed: the header rules name the To-do list's header (`.tws56-hdw`) too, at the same specificity */
    /* Workspace headers v1 re-pointed: and the shared navy header (`.wsnh`) */
    expect(css("qcv156.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw, .wsnh) > .qc1531-hd.qc1531-hd {");
    /* List filters v1 — the filter card is shell/FilterPanel's, its rule naming both pages at the same specificity */
    expect(read("../../shell/filterPanel.css")).toContain(":is(.qc151.qc153, .cl27) .qc153-rail.fp {");
    expect(css("qcv156.css")).toContain(":is(.qc151.qc153, .cl27) .qc154-tbw.qc154-tbw.qc154-tbw[data-qc156-stuck] {");
    expect(css("qcv1534.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw) .qc1531-hd { grid-template-columns: 268px");
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
    expect(css).toContain(".cl27 :is(.qc1531-hd, .fp, .qc154-tbw, .qc156-slim) :where(span, p, div, label, td, th, b, i, em, small, button, input) { font-family: inherit; }");
    expect(css).toContain(".cl27 :is(.qc1531-hd, .fp, .qc154-tbw, .qc156-slim) { font: 400 16px/1.45 var(--sp-serif); }");
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
