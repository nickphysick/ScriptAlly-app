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
import { ContactViews, GENRES_SHOWN } from "./ContactViews";
import { panelFoot } from "../../../lib/contactPanel";
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
    expect(read("../../queries/centre/QcViews156.tsx")).toContain('from "../../shell/FilterPanel"');
    expect(() => read("../../shell/ViewsPanel.tsx")).toThrow();
  });
  /* RE-POINTED by Contact list rows v1.2 · Phase 4 — the revamped panel: Your list, Open to queries?, Fit, Replies, Genres
     sought, then Outside the UK and Missing details; faceted counts; zero disabled unless chosen */
  const opt = (h: string, k: string) => h.match(new RegExp(`<button[^>]*data-clq-opt="${k}"[^>]*>`))?.[0] ?? "";
  const n = (h: string, k: string) => Number(opt(h, k).match(/data-n="(\d+)"/)?.[1] ?? NaN);
  it("its sections, in order; the old Who to query next, Have you queried them? and Are they open? are gone", () => {
    const h = views();
    expect([...h.matchAll(/data-clq-sec="(\w+)"/g)].map((m) => m[1])).toEqual(["list", "door", "fit", "reply", "genres", "abroad", "missing"]);
    expect(h).not.toMatch(/Who to query next|Have you queried them|Are they open|Ready to query|What they want/);
  });
  it("Your list and Open to queries? are boxed segments with their counts; Either covers a door not known", () => {
    const h = views();
    expect([n(h, "list:all"), n(h, "list:queried"), n(h, "list:none")]).toEqual([5, 2, 3]);
    expect([n(h, "door:any"), n(h, "door:open"), n(h, "door:closed")]).toEqual([5, 3, 1]);
    expect(opt(h, "list:all")).toContain('aria-checked="true"');
    expect(opt(h, "door:any")).toContain('aria-checked="true"');
  });
  it("faceted: each count is under every OTHER section's choice; a zero is disabled unless it is the choice", () => {
    const h = views({ ...E(), queried: "no" });
    expect([n(h, "list:all"), n(h, "list:queried"), n(h, "list:none")]).toEqual([5, 2, 3]);
    expect([n(h, "door:any"), n(h, "door:open"), n(h, "door:closed")]).toEqual([3, 2, 0]);
    expect(opt(h, "door:closed")).toContain("disabled");
    expect(n(h, "genre:crime")).toBe(0);
    expect(opt(h, "genre:crime")).toContain("disabled");
  });
  it("Fit and Replies are single-choice toggles; Outside the UK and Missing details are rows at the foot", () => {
    const all = [fx("r5", {}, { starRating: 5, noResponseMeansNo: true, responseTimeWeeks: 6 }), fx("r4", { abroad: true } as Partial<AgentFacts>, { starRating: 4 }), fx("u", { gaps: 1 })];
    const h = views({ ...E(), fit: 4 }, all);
    expect([n(h, "fit:5"), n(h, "fit:4"), n(h, "fit:0")]).toEqual([1, 2, 1]);
    expect(opt(h, "fit:4")).toContain('aria-pressed="true"');
    expect([n(h, "reply:always"), n(h, "reply:nrmn"), n(h, "reply:known")]).toEqual([0, 1, 1]);
    expect(opt(h, "abroad")).toMatch(/class="clr-frow"/);
    expect([n(h, "abroad"), n(h, "missing")]).toEqual([1, 0]);
  });
  it("Genres: the book's first with a tick, six then +n more; the quiet line counts the agents with none", () => {
    const many = Array.from({ length: 9 }, (_, i) => fx(`g${i}`, { genres: [`Genre ${String.fromCharCode(65 + i)}`] }));
    const h = views(E(), [...many, fx("t", { genres: ["Thriller"] }), fx("z")]);
    expect(h.match(/data-clq-opt="genre:[^"]+"/g)).toHaveLength(GENRES_SHOWN);
    expect(h.indexOf('data-clq-opt="genre:thriller"')).toBeLessThan(h.indexOf('data-clq-opt="genre:genre a"'));
    expect(opt(h, "genre:thriller")).toBeTruthy();
    expect(h).toMatch(/data-clq="genres-more" aria-expanded="false">\+4 more<\/button>/);
    expect(h).toContain('<p class="clr-fnote" data-clq="no-genres">1 agent has no genres yet.</p>');
  });
  it("no stage colour anywhere in the panel", () => {
    const h = views({ ...E(), queried: "no" }).toLowerCase();
    for (const c of Object.values(STAGE_COLOURS)) for (const hex of Object.values(c)) expect(h).not.toContain(hex);
  });
  it("the foot", () => {
    expect(panelFoot(false, 5, 5)).toBe("All 5 agents.");
    expect(panelFoot(true, 2, 5)).toBe("Showing 2 of 5 agents.");
    expect(views()).toContain("All 5 agents.");
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
    /* Contact list rows v1 — "Filter by name or agency"; the "/" key's hint stays in the shared bar's markup and this
       page's stylesheet hides it (contactListRows.css) */
    expect(h).toContain('placeholder="Filter by name or agency"');
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
  it("no mask paints over the card's edge (v26's stuck mask stays deleted)", () => {
    /* RE-POINTED by Contact list rows v1.2: the pinned heading row is stuck-aware again, for its shadow and the page's
       ground above it (contactListRows.css), inside the frame; v26's 14px mask over the card's sides stays gone */
    expect(read("./contactV26.css")).not.toMatch(/\.cl26-pin\[data-stuck\]/);
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
  it("RE-POINTED by Contact list rows v1.2 — the cap is retired: the heading row is the pin, inside the frame", () => {
    expect(sheet).toMatch(/<section class="cl26-card"[^>]*><div class="cl26-frame" data-cl26="frame">[\s\S]*?<div class="cl26-th cl26-pin" role="row" data-cl26="heads"/);
    expect(sheet).not.toContain("clq-cap");
    expect(read("./contactQcLayout.css")).not.toMatch(/\.clq-cap\b|\.clq-capin|\.clq-captop/);
    expect(read("./ContactBar.tsx")).not.toContain("data-clq-stuck");
  });
});
