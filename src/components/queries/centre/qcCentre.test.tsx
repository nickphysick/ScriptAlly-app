/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcCentre — the Query Centre's v11 page frame, and the page-level laws that survived the rebuild.
 *
 * Several of these were `respondDesk.test.tsx` cases written against the tiles, the toolbar and the
 * four-view switch; each was retired there with a pointer here. The LAWS are the same: one derived
 * list feeds every view; one control narrows; the loading branch answers before any empty branch;
 * the view is remembered with one writer on the URL.
 *
 * This repo's component tests render to a string (no jsdom), and its page tests read source with
 * comments stripped — a lock over raw source finds its tokens in the prose explaining the retirement.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOCK_MIN_COLUMN, QcCentre, readBirdsEyeOpen } from "./QcCentre";
import { HERO_COURIER_MAP } from "./qcArt";

const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const page = decls(read("src/components/Queries.tsx"));
const css = decls(read("src/components/queries/centre/qcvPage.css"));
const rule = (sel: string) => {
  const m = css.match(new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  expect(m, `${sel} has no rule`).toBeTruthy();
  return m![1];
};

const frame = (over: Partial<React.ComponentProps<typeof QcCentre>> = {}) => renderToStaticMarkup(
  <QcCentre loading={false} entering={false} headLine="Every query, from the first letter to the last reply." onLog={() => {}} onRecord={() => {}}
    sentence={<h2 id="sentence">s</h2>} body={<div id="body" />} courts={<div id="courts" />} rail={<aside id="rail" />}
    docked onDocked={() => {}} onExport={() => {}} canExport {...over} />,
);

describe("⚠️ the views are gone, and `?view=` keeps exactly one meaning (v65 §1)", () => {
  /**
   * ⚠️ THE TABLE ITSELF IS THE THING THAT HAD TO GO. `QC_VIEWS` named three views with their ids and
   * labels; on a page with one view that table is not merely unused, it is a specification for the
   * switch somebody will build from it. The assertion is therefore that the exports are ABSENT —
   * a lock over a deleted symbol, which is the only form that cannot be satisfied by not calling it.
   */
  it("`QC_VIEWS`, `qcViewLabel`, `readQcView` and `DEFAULT_QC_VIEW` are deleted, not merely unmounted", async () => {
    const mod = await import("./QcCentre") as Record<string, unknown>;
    for (const gone of ["QC_VIEWS", "qcViewLabel", "readQcView", "DEFAULT_QC_VIEW", "QcPortalView"]) {
      expect(mod[gone], `${gone} is still exported — the view table outlived the views`).toBeUndefined();
    }
  });
  it("`calendar` (and the `cal` alias) opens Birds-eye; every other value is accepted and ignored", () => {
    expect(readBirdsEyeOpen("?view=calendar")).toBe(true);
    expect(readBirdsEyeOpen("?view=cal")).toBe(true);
    /* ⚠️ ACCEPTED AND IGNORED, NEVER REFUSED — a bookmark from any earlier version of this page
       lands on the ledger, which is where the page lands anyway. Nothing 404s and nothing warns. */
    for (const stale of ["list", "grid", "board", "kanban", "overview", ""]) {
      expect(readBirdsEyeOpen(`?view=${stale}`), `"${stale}" opened Birds-eye`).toBe(false);
    }
    expect(readBirdsEyeOpen("")).toBe(false);
    expect(readBirdsEyeOpen("?q=abc")).toBe(false);
  });
  it("⚠️ the page WRITES no view memory, no `?view=` and CLEARS the retired key", () => {
    expect(page, "the per-device memory is being written again").not.toMatch(/localStorage\.setItem\(\s*QC_VIEW_KEY/);
    expect(page).not.toMatch(/(?:local|session)Storage\.setItem\(\s*["'`]sa\.qcView/);
    expect(page, "the retired key is left where a later reader can honour it").toContain("clearQcViewMemory()");
    /* ⚠️ THE REFLECTION IS GONE. With one page there is nothing to reflect, and an app that keeps
       re-asserting `?view=` is a second writer on a URL `?q=` already owns. */
    expect(page, "the Query Centre is writing the URL again").not.toContain("window.history.replaceState(window.history.state");
    expect(page).not.toContain('searchParams.set("view"');
  });
});

describe("one derived list, one control that narrows it", () => {
  it("every view's rows come from `sortedList`, and `sortedList` follows the sentence", () => {
    expect(page).toContain("const sortedList = qcVisible.map((r) => r.query);");
    expect(page).toContain("const qcVisible = sortRows(qcScoped.filter((r) => matchesFilter(r, qcFilter)), qcSort);");
    expect(page).toMatch(/const gridRows: GridCard\[\] = sortedList\.map\(/);
  });
  it("⚠️ the page holds ONE filter, ONE scope and ONE sort — and the retired controls are not mounted", () => {
    for (const once of ["useState<QcFilter>(", "useState<QcSort>("]) expect(page.split(once).length - 1, once).toBe(1);
    for (const gone of ["<QueryStatTiles", "<QueryBoardView", "<QueryViewSwitch", "<ToolbarButton", "searchField(", "<PageHeader"]) {
      expect(page, `${gone} is mounted on the Query Centre again`).not.toContain(gone);
    }
    expect(page).toContain("<QcSentence");
  });
  it("the menu counts the SCOPED set, never the filtered view — or every court you are not in reads 0", () => {
    expect(page).toContain("options={filterOptions(qcScoped)}");
    expect(page).toContain("count={qcVisible.length}");
  });
  it("a filter that hides the open query lets go of it — by clearing `?q`, a user's act", () => {
    expect(page).toContain("if (urlSelectedId && !nextVisible(urlSelectedId)) onSelectView?.(\"cards\");");
  });
  it("?status= lands on the sentence's filter", () => {
    expect(page).toContain("setQcFilter(filterForStatusParam(statusFilter));");
  });
  it("every view hands a selection to the page's one onOpenQuery", () => {
    const at = page.indexOf("<QcCentre");
    expect(at).toBeGreaterThan(-1);
    const mount = page.slice(at, page.indexOf("FORM MODE", at) > 0 ? page.indexOf("FORM MODE", at) : at + 6000);
    expect(mount.split("onOpenQuery?.(").length - 1, "a view selects through something other than the page's onOpenQuery").toBeGreaterThanOrEqual(2);
    expect(mount).not.toMatch(/setSelectedQueryId\(/);
  });
});

describe("⚠️ two houses, one set of doors — the docked card opens what the drawer opens", () => {
  it("both take the SAME three tab bodies, built once", () => {
    for (const p of ["tracking={qpTracking}", "notesTab={qpNotesTab}"]) expect(page.split(p).length - 1, p).toBe(2);
    expect(page.split("agentTab={qpAgentTab").length - 1).toBe(2);
    for (const c of ["const qpTracking = ", "const qpAgentTab = ", "const qpNotesTab = "]) expect(page.split(c).length - 1, c).toBe(1);
  });
  it("both primaries go through the desk for Mark sent / Record response, and the offer keeps its own journey", () => {
    expect(page.split('openDeskVerb(panelRow.facts.turn === "you" ? "marksent" : "respond", anchor)').length - 1).toBe(2);
    expect(page.split('if (panelRow.facts.turn === "offer") { openRecord(activeQuery); return; }').length - 1).toBe(2);
  });
  it("the drawer is for the narrow column and a CHOSEN query only — never beside the docked card, never for the implicit row", () => {
    expect(page).toContain("{panelRow && activeQuery && urlSelectedId && qcDocked === false && (");
  });
  it("the tab memory is one key for both houses", () => {
    expect(read("src/components/queries/centre/QcOpenCard.tsx")).toContain('import { TAB_KEY, readTab, type PanelTab } from "../QueryPanel";');
  });
});

describe("loading answers first", () => {
  it("⚠️ the loading branch comes BEFORE every empty branch in the view's body, and there is no spinner", () => {
    const at = page.indexOf("body={");
    expect(at).toBeGreaterThan(-1);
    const body = page.slice(at, at + 1600);
    const load = body.indexOf("showGridSkeleton ?"), filtered = body.indexOf('emptyKind === "filtered"'), none = body.indexOf('emptyKind === "nomatch"');
    expect(load, "the body has no loading branch").toBeGreaterThan(-1);
    expect(filtered).toBeGreaterThan(load);
    expect(none).toBeGreaterThan(filtered);
    expect(page).not.toMatch(/spinner|Loader2|animate-spin/);
  });
});

describe("the frame, rendered", () => {
  it("head: the title, the line, and an action ROW carrying both pills — no masthead component", () => {
    const html = frame();
    expect(html).toMatch(/<h1 class="qcv-title" data-qcv="head-title">Query Centre<\/h1>/);
    expect(html).toContain('data-qcv="head-line"');
    expect(html).toMatch(/<button[^>]*class="sp-inkpill qcv-log"[^>]*data-qcv="head-cta"[^>]*><span class="sp-inkpill-l">\+ Log a query<\/span><\/button>/);
    expect(html).toMatch(/<button[^>]*class="qcv-ghostpill"[^>]*data-qcv="head-record"[^>]*><span>Record a response<\/span><\/button>/);
    expect(html).not.toMatch(/["\s]wsh["\s]/);
    /**
     * ⚠️ BOTH PILLS INSIDE THE ONE ROW, AND THE CLAIM IS CONTAINMENT — asserting each pill on its
     * own passes on a page that renders them three inches apart.
     *
     * ⚠️ AND IT IS NOT BOUNDED ON `</div>`. The first cut sliced the row as "from `head-actions` to
     * the first `</div>` after `head-record`"; a closing tag is not a delimiter, because it matches
     * the first NESTED close — so the slice ran straight past the row's own end and swallowed the
     * next sibling. Proved vacuous: moving the Record pill OUT of the row left all 27 green.
     * Bound instead on the two buttons themselves, which cannot nest: if no element closes between
     * them, they are siblings of one parent.
     */
    const between = html.slice(html.indexOf('data-qcv="head-cta"'), html.indexOf('data-qcv="head-record"'));
    expect(between, "the Record pill is not inside the action row — something closes between the two pills").not.toContain("</div>");
    /* and the row comes after the facts line, not beside the title */
    expect(html.indexOf('data-qcv="head-actions"')).toBeGreaterThan(html.indexOf('data-qcv="head-line"'));
  });
  it("§2 · the page and the card are ONE group — the card is a sibling of the page, not a child", () => {
    const html = frame({ rail: React.createElement("aside", { "data-qcv": "rail" }) });
    /* the group wraps both, so the grid can place them; a card inside `.qcv-page` would be inside
       the very column whose width it is meant to sit beside */
    /* ⚠️ NOT ANCHORED ON `^`. React 19's SSR prepends `<link rel="preload" as="image">` for the
       hero art, so the markup does not start with the group — and that preload is the art's, which
       is a thing this page now WANTS. */
    expect(html).toContain('<div class="qcv-group qcv-own" data-qcv="group" data-rail="beside">');
    const group = html.indexOf('data-qcv="group"');
    const page = html.indexOf('data-qcv="page"');
    expect(group, "the page is not inside the group").toBeLessThan(page);
    const rail = html.indexOf('data-qcv="rail"');
    expect(rail, "the card renders after the page opens").toBeGreaterThan(page);
    /**
     * ⚠️ THE PAGE MUST HAVE CLOSED BEFORE THE CARD OPENS, AND THAT IS A DEPTH QUESTION, NOT A
     * `</div>` QUESTION. A first cut asserted "some `</div>` sits between the two", which is true
     * of a card nested three levels inside the page — proved vacuous by moving `{rail}` back inside
     * `.qcv-page` and watching all 147 stay green. Walk the tags instead: from the page's own
     * opening tag, depth must return to zero before the card's.
     */
    const depthAt = (from: number, to: number) => {
      let d = 0;
      for (const m of html.slice(from, to).matchAll(/<(\/?)div\b|<div\b[^>]*\/>/g)) d += m[1] ? -1 : 1;
      return d;
    };
    const pageOpen = html.lastIndexOf("<div", page);
    expect(depthAt(pageOpen, html.lastIndexOf("<", rail)), "the card is nested inside the page").toBe(0);
    /* …and the card is still inside the group: the group has NOT closed by then */
    const groupOpen = html.lastIndexOf("<div", group);
    expect(depthAt(groupOpen, html.lastIndexOf("<", rail)), "the card fell out of the group").toBe(1);
  });
  /**
   * ⚠️ THE DOCK IS DECIDED ON THE GROUP, AND READING THE PAGE COLUMN COST FOUR MEASUREMENTS.
   * `DOCK_MIN_COLUMN` asks whether there is room for a ledger AND a card beside it. That was a
   * question about `.qcv-page` only while the page carried the card's 384px reservation as its own
   * padding; as a grid track the reservation left the page's box, so at a 1440 window the page went
   * from 1172 to 760 and the same 900 started meaning "too narrow". Nothing about the threshold was
   * wrong — the box under it was.
   */
  it("§2 · the dock threshold is measured on the GROUP, never on the page column", () => {
    const src = read("src/components/queries/centre/QcCentre.tsx");
    expect(src).toMatch(/const groupRef = useRef<HTMLDivElement>\(null\)/);
    expect(src).toMatch(/const el = groupRef\.current;[\s\S]{0,300}onDocked\(w >= DOCK_MIN_COLUMN\)/);
    /* …and the ref is ON the group element, which is what makes the two the same box */
    expect(src).toMatch(/<div ref=\{groupRef\} className="qcv-group/);
    expect(src, "the page column is measured for the dock again").not.toMatch(/ref=\{groupRef\}[^>]*className=\{`qcv-page/);
  });
  /**
   * §3 · THE ART IS AN ELEMENT IN THE HEAD, PLACED BY THE GRID — never a background image.
   * A background could not be given a width the words also respect, could not reorder under the
   * container query, and could not be trimmed: it would need a crop, and §1.1 forbids one.
   */
  it("§3 · the hero art is the enrolled asset, whole, and LAST in the reading order", () => {
    const html = frame();
    expect(html).toContain('<figure class="qcv-heroart" data-qcv="head-art" aria-hidden="true">');
    /* the enrolled record is what renders — src and version both, so a swapped drawing cannot
       reach the page wearing the old cache key */
    expect(html).toContain(`src="${HERO_COURIER_MAP.src}?v=${HERO_COURIER_MAP.version}`);
    expect(html).toContain(`width="${HERO_COURIER_MAP.width}" height="${HERO_COURIER_MAP.height}"`);
    /* ⚠️ THE INTRINSIC SIZE IS STATED so the head does not reflow when the image lands — and it is
       the enrolled size, not a literal, so the two cannot come apart. */
    expect(HERO_COURIER_MAP.width / HERO_COURIER_MAP.height).toBeCloseTo(1196 / 375, 3);
    /* last in the DOM: title → facts → actions → picture. The grid puts it at the right; a reader
       on a screen reader, and a page with no CSS, both get the words first. */
    expect(html.indexOf('data-qcv="head-art"')).toBeGreaterThan(html.indexOf('data-qcv="head-actions"'));
    expect(html, "a decorative drawing must not be announced").toContain('alt=""');
  });
  it("§3 · the head is a grid with the art beside, and the fallback is a CONTAINER query", () => {
    expect(rule(".qcv-head")).toMatch(/grid-template-columns: auto minmax\(0, 1fr\)/);
    expect(rule(".qcv-head")).toMatch(/align-items: center/);
    expect(rule(".qcv-heroart")).toMatch(/grid-column: 2; grid-row: 1 \/ 4/);
    /* ⚠️ THE ARCHIVIST'S RESERVATION IS GONE. `padding-right: 190px` held 150 × 150 for a drawing
       that never arrived, so every hero on this page paid for an absence. */
    expect(rule(".qcv-head"), "the empty Archivist slot outlived the art that fills it").not.toMatch(/padding-right/);
    /**
     * ⚠️ A CONTAINER QUERY ON THE PAGE COLUMN, NEVER A MEDIA QUERY — the same law §2's collapse
     * follows. The column is the window less the card's track less the gutters, so the viewport
     * cannot answer whether the art fits beside the words: it would have to guess at the sidebar,
     * the card and the centring at once.
     */
    expect(rule(".qcv-page")).toMatch(/container-type:\s*inline-size/);
    expect(css).toMatch(/@container \(max-width: 920px\) \{\s*\.qcv-head \{ display: flex; flex-direction: column;/);
    expect(css, "the art becomes a banner ABOVE the words, not a column beside them").toMatch(
      /@container \(max-width: 920px\)[\s\S]{0,240}\.qcv-heroart \{ order: -1; width: 100%;/,
    );
    expect(css, "a media query is asking the viewport a question about a column").not.toMatch(/@media[^{]*\{\s*\.qcv-head/);
  });
  it("⚠️ Record a response is the GLOBAL flow, with no query chosen — the entry `+ New` took away", () => {
    expect(page).toContain('onRecord={() => onNavigate?.("queries", "Record a response")}');
  });
  it("the Log button says so while a query is already being written", () => {
    expect(frame({ logDisabled: true })).toMatch(/data-qcv="head-cta"[^>]*disabled=""/);
    expect(frame()).not.toMatch(/data-qcv="head-cta"[^>]*disabled/);
  });
  /**
   * ⚠️ THE SWITCH AND THE BACK LINK ARE BOTH GONE (v65 §1), AND THIS ASSERTS BOTH ABSENCES. The
   * switch chose between three views; the link led back to an Overview. With one page there is
   * nowhere to switch to and nowhere to go back from — and a link out of a page that is the
   * destination is the clearest way to teach a reader that somewhere else exists.
   */
  it("⚠️ no view switch, no back link, and the page's own furniture is always on", () => {
    const html = frame();
    expect(html, "a view switch is mounted").not.toMatch(/["\s]qcv-views["\s]/);
    expect(html).not.toMatch(/aria-pressed/);
    expect(html, "the back link outlived the Overview").not.toContain('data-qcv="back-overview"');
    expect(html).not.toContain("qcv-backov");
    /* the sentence, the stage and the export are the page, not a view's furniture */
    for (const kept of ['id="sentence"', 'data-qcv="stagegrid"', "qcv-export"]) {
      expect(html, `${kept} is missing from the page`).toContain(kept);
    }
  });
  /**
   * ⚠️ THE LEDGER HAS ONE COLUMN, WHATEVER IS CHOSEN (v65 §5). The open query moved into the rail,
   * so selecting a row no longer takes 396px off the list — and the `--docked` modifier is deleted
   * rather than left selecting on nothing. `docked` still exists and still measures the COLUMN: it
   * decides card-versus-drawer, which is a different question from how wide the ledger is.
   */
  it("⚠️ one column always — the stage never narrows for a card, and the rail is always mounted", () => {
    for (const d of [true, false, null] as const) {
      expect(frame({ docked: d }), String(d)).not.toContain("qcv-stage--docked");
      expect(frame({ docked: d }), `the rail is not mounted at docked=${d}`).toContain('id="rail"');
      expect(frame({ docked: d }), String(d)).toContain('id="courts"');
    }
    expect(frame({ docked: false })).toContain("qcv-page--narrow");
    expect(frame({ docked: null })).not.toContain("qcv-page--narrow");
    expect(DOCK_MIN_COLUMN).toBe(900);
    /* and the retired modifier is gone from the sheet too, not merely unrendered */
    expect(css, "a rule for the docked column outlived the docked column").not.toContain("qcv-stage--docked");
  });
  it("busy while loading, and it says when it is done — once, politely", () => {
    expect(frame({ loading: true })).toMatch(/data-qcv="page"|aria-busy="true"/);
    expect(frame({ loading: true })).toContain('aria-busy="true"');
    expect(frame()).toContain('aria-busy="false"');
    expect(frame()).toMatch(/role="status" aria-live="polite"[^>]*>Queries loaded</);
  });
  /**
   * ⚠️ THE LEDGER HAS NO FRAME (v65 §5) — it is not a card holding rows, the ROWS are the cards.
   * What is left of `.qcv-ledger` is a size container the row's own container query needs; the
   * `FramedCard` that used to be it has gone with the frame, and so has its band-less `.fc-frame`.
   */
  it("the ledger is a bare section — no FramedCard, no frame; Export is a link under the stage", () => {
    const html = frame();
    expect(html).toMatch(/<section class="qcv-ledger" data-qcv="ledger" aria-label="Queries"><div id="body">/);
    expect(html, "the ledger grew a frame again").not.toContain("fc-frame");
    expect(html).not.toContain("fc-card");
    expect(html).toMatch(/<div class="qcv-foot"><button type="button" class="qcv-export">Export CSV<\/button>/);
    expect(frame({ canExport: false })).toMatch(/class="qcv-export" disabled=""/);
  });
});

describe("the sheet", () => {
  it("§5 · the stage is one column and states no track at all; the ledger is the size container", () => {
    expect(rule(".qcv-stage")).toMatch(/display:\s*block/);
    expect(css, "the docked track outlived the docked card").not.toContain("--qcv-open-w");
    expect(rule(".qcv-ledger")).toMatch(/container-type:\s*inline-size/);
  });
  /**
   * ⚠️ RETARGETED IN v65.2 §2 — THE RESERVATION BECAME A TRACK. This asserted the page paid
   * `padding-right: var(--qcv-rail-pad, 384px)` for a card placed against the window's right edge,
   * which was right while the page filled the window. Centred at 1480 that card is stranded against
   * the screen with the ledger hundreds of pixels to its left, so the page and the card are one
   * grid now and the width is stated once. The law underneath is unchanged and still locked in
   * `qcRail.test.tsx`: whether there is room is a question about the WINDOW, and the card answers
   * it. This is the page's half.
   */
  it("§2 · the page is the group's first column, and the card's is a track", () => {
    expect(css, "the reservation is a track now").not.toMatch(/padding-right:\s*var\(--qcv-rail-pad/);
    expect(rule(".qcv-group")).toMatch(/grid-template-columns: minmax\(0, 1fr\) 340px/);
    /**
     * ⚠️ THE CAP IS THE PAGE'S `--wpg-measure`, NOT A `max-width` ON THE GROUP. The shared grid
     * gives its scroll row's child `min(--wpg-measure, 100% - 2 × --wpg-gutter)` with
     * `margin-inline: auto` — the rule that gives every page the dashboard's left edge. A second
     * `max-width` here beat the gutter reduction and put the page at the window's own edge (246
     * against 268, measured). Cap and gutter in one `min()`, or they agree only until one binds.
     */
    expect(rule(".qcv-group"), "a second cap contests the grid's gutter reduction").not.toMatch(/max-width/);
    expect(rule(".qcv-group"), "…and a second centring with it").not.toMatch(/margin-inline/);
    expect(css).toMatch(/--wpg-measure: 1480px/);
  });
  it("⚠️ the typewriter face is READ from the shell's one token, never named — and the title beats brand.tsx", () => {
    expect(css).not.toMatch(/Special Elite/);
    expect(rule(":root"), "the palette is at :root so the portalled card can read it").toMatch(/--qcv-type:\s*var\(--sp-type\)/);
    /* brand.tsx forces h1:not(.wsh-title) with !important at 0-1-1: two classes AND !important, or Playfair */
    expect(rule(".qcv-page .qcv-title")).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
    expect(rule(".qcv-page .qcv-sentence")).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
  });
  /**
   * ⚠️ THE PALETTE IS AT `:root` AND THE LOCK IS STATED OVER EVERY SHEET, which is the repair of a
   * real fault rather than a tidying. It used to say "the MENU reads no `--qcv-*` token", because
   * the menu portals and the palette was on `.qcv-page` — true, and a rule about one component.
   * Two phases later the expanded card portalled too, and **86 reads across `qcvExpanded.css` and
   * `qcvTimeline.css` were resolving to nothing** (measured 24 Sep: `background: var(--qcv-ink)`
   * computed `rgba(0, 0, 0, 0)`), through two rounds of green measurement, because those measured
   * geometry and literals. A law written about the component that happened to hit it cannot catch
   * the next component; a law about the TOKEN can.
   */
  it("⚠️ a --qcv-* token read by more than one sheet is declared at `:root` — a portal has no other ancestor", () => {
    const dir = "src/components/queries/centre";
    const sheets = readdirSync(join(process.cwd(), dir)).filter((f) => f.endsWith(".css"));
    expect(sheets.length).toBeGreaterThan(6);
    /* ⚠️ COMMENT-STRIPPED, per the house rule — the prose explaining a RETIRED token names it, and a
       raw-text sweep then demands the resurrection of the thing it found the obituary for. */
    const bodies = new Map(sheets.map((f) => [f, decls(read(`${dir}/${f}`))]));
    const atRoot = new Set([...rule(":root").matchAll(/(--qcv-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
    expect(atRoot.size, "the palette is at :root").toBeGreaterThan(8);
    /* published from JS onto an element inside the subtree that reads them, so they resolve there */
    const PUBLISHED: Record<string, string> = {
      /* ⚠️ `--qcv-xp-lcol` AND `--qcv-xp-ext` LEFT THIS MAP WITH THE COURIER'S COLUMN (v65.2 §6).
         Both sized it; §6 retires it, so neither has a publisher or a reader. An exemption for a
         token nothing publishes is exactly what this check exists to catch. */
      "--qcv-xp-tw": "src/components/queries/centre/QcExpanded.tsx",
      "--qcv-tl-names": "src/components/queries/centre/QcTimeline.tsx",
      "--qcv-state": "src/components/queries/centre/QcTimeline.tsx",
    };
    for (const [tok, writer] of Object.entries(PUBLISHED)) {
      const w = read(writer);
      expect(w.includes(`"${tok}"`) || w.includes(`--qcv-${tok.slice(6)}`), `${tok} is exempt as published and ${writer} does not set it`).toBe(true);
    }
    const bad: string[] = [];
    for (const [f, body] of bodies) {
      for (const m of body.matchAll(/var\((--qcv-[a-z0-9-]+)/g)) {
        const tok = m[1];
        if (atRoot.has(tok) || tok in PUBLISHED) continue;
        /* a sheet may declare a token on its own element and read it in the same sheet — that
           element is its own ancestor by construction, portal or not */
        if (new RegExp(`(?:^|[;{\\s])${tok}\\s*:`).test(body)) continue;
        bad.push(`${f}: ${tok}`);
      }
    }
    expect([...new Set(bad)], "read across sheets from a scope a portal may not be inside").toEqual([]);
  });
  it("every var() the sheet reads resolves — to a token it declares, to an app :root token, or to a PUBLISHED measurement", () => {
    const APP = ["--font-serif", "--font-mono", "--sp-type", "--wpg-gutter", "--wpg-measure", "--ws-window", "--ws-window-rgb"];
    /**
     * ⚠️ A MEASUREMENT PUBLISHED FROM JS IS LEGITIMATELY ABSENT FROM THE SHEET, and its FALLBACK is
     * what renders until it lands — the one case CLAUDE.md names for a fallback ("a token that might
     * legitimately be absent"). But an exemption that only says "not declared here" would cover a
     * token nothing publishes either, which is the fault this whole check exists to catch. So each
     * one names its WRITER and the writer is read: the exemption is granted by the publishing code
     * existing, not by the list.
     */
    /* ⚠️ `--qcv-rail-pad` LEFT THIS MAP WITH THE RESERVATION IT NAMED (v65.2 §2). An exemption for
       a token nothing publishes any more is exactly what this check exists to catch. */
    const PUBLISHED: Record<string, string> = {};
    for (const [tok, writer] of Object.entries(PUBLISHED)) {
      expect(read(writer), `${tok} is exempt as published, and ${writer} does not publish it`).toContain(`setProperty("${tok}"`);
      expect(css, `${tok} is read without a fallback, so an unpublished frame paints nothing`).toMatch(new RegExp(`var\\(${tok},\\s*[^)]+\\)`));
    }
    const reads = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    expect(reads.size).toBeGreaterThan(10);
    for (const r of reads) expect(APP.includes(r) || r in PUBLISHED || new RegExp(`${r}:`).test(css), `${r} is read and never declared`).toBe(true);
  });
  /**
   * ⚠️ THE GHOST PILL'S FRAME IS A COPY OF `--fc-frame`, AND THE COPY IS WHAT IS ASSERTED. The token
   * is declared on `.fc`; the head is not a card, so a `var(--fc-frame)` here resolves to nothing —
   * and inside a `box-shadow` an unresolved colour paints an invisible ring while the rule reads
   * perfectly correctly. Both sides are read from their own file: a literal on both sides of this
   * assertion would agree with itself for ever.
   */
  it("the Record pill wears the card's own edge, and its burgundy is the card's", () => {
    const shadow = rule(".qcv-ghostpill");
    expect(shadow).toMatch(/inset 0 0 0 5px #ffffff/);
    expect(shadow).toMatch(/inset 0 0 0 6px var\(--qcv-frame\)/);
    expect(shadow).not.toMatch(/border:\s*1px/);
    const declared = /--qcv-frame:\s*(#[0-9a-f]{6})/i.exec(css)?.[1]?.toLowerCase();
    const card = /--fc-frame:\s*(#[0-9a-f]{6})/i.exec(decls(read("src/components/containers/framedCard.css")))?.[1]?.toLowerCase();
    expect(card, "framedCard.css no longer declares --fc-frame").toBeTruthy();
    expect(declared, "the head's frame colour has drifted from the card's").toBe(card);
  });
  /**
   * ⚠️ GENERALISED IN v65.2 §2 — IT WAS SCOPED TO `qcvExpanded.css` AND I TRIPPED OVER IT IN
   * `qcvPage.css` THE SAME DAY. Appending `.qcv-page { container-type: inline-size; }` at the foot
   * of a sheet that already had a `.qcv-page` block gave the file two base rules for one selector:
   * the browser takes the last, every `rule()` helper in this repo takes the FIRST, and the half of
   * the page's style in the second block is invisible to every lock reading it. The claim belongs
   * to the directory, not to one file in it.
   */
  it("⚠️ no selector in this directory is declared twice outside a media or container query", () => {
    const dir = "src/components/queries/centre";
    const sheets = readdirSync(join(process.cwd(), dir)).filter((f) => f.endsWith(".css"));
    const bad: string[] = [];
    for (const f of sheets) {
      const flat = decls(read(`${dir}/${f}`)).replace(/@(?:media|container|supports)[^{]*\{[\s\S]*?\n\}/g, "");
      const sels = [...flat.matchAll(/(?:^|\n)([^@\n{][^{\n]*)\{/g)].map((m) => m[1].trim());
      for (const sel of sels.filter((x, i) => sels.indexOf(x) !== i)) bad.push(`${f}: ${sel}`);
    }
    expect([...new Set(bad)], "a second base rule the browser takes and every lock here does not").toEqual([]);
  });
  it("anthracite is the page's one button fill, and nothing on this sheet is ink-filled", () => {
    /* ⚠️ IT USED TO READ THE PRESSED VIEW-SWITCH BUTTON, which is retired. The claim was never
       about the switch: it is that this page fills buttons with anthracite and never with ink. */
    expect(rule(":root")).toMatch(/--qcv-navy:\s*#2a3a52/);
    expect(css).not.toMatch(/background:\s*(#1c130f|var\(--qcv-ink\))/);
    /* the switch's own rules went with it rather than being left inert */
    expect(css, "the retired view switch still has a stylesheet").not.toMatch(/(?:^|\n)\s*\.qcv-views\s*\{/);
  });
});

/**
 * ⚠️ EVERY PLACEHOLDER CLASS THE CENTRE EMITS MUST BE DEFINED, AND EVERY ONE DEFINED MUST BE
 * EMITTED — both directions, because this went wrong in both on one commit (v21 §6). The strip's
 * sheet was deleted and took `.qcv-sk`'s base rule with it, so eight call sites across six
 * components went on rendering unstyled inline spans: no fill, no radius, no height, through a
 * clean build and a green suite. Restoring it wholesale would have brought back three modifiers
 * nothing emits.
 *
 * THE CLAIM IS THE PAIRING, NOT THE LIST. A sweep states it once and covers whatever is added next;
 * a case naming `.qcv-sk` would not have caught `--q` or `--t` going the same way.
 */
describe("the loading placeholders", () => {
  const DIR = resolve(__dirname);
  const sheets = readdirSync(DIR).filter((f) => f.endsWith(".css")).map((f) => readFileSync(resolve(DIR, f), "utf8")).join("\n");
  const sources = readdirSync(DIR).filter((f) => f.endsWith(".tsx") && !f.includes(".test.")).map((f) => readFileSync(resolve(DIR, f), "utf8")).join("\n");
  /* ⚠️ COMMENTS STRIPPED FIRST, both sides: the note explaining this very fault spells every one of
     these class names, so a raw-text sweep reads the obituary as a live rule and as a live render. */
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /* ⚠️ LOOKAROUNDS, NOT CONSUMED DELIMITERS. A class list is `"qcv-sk qcv-sk--q"`: consume the
     space after the first and the scan resumes past the delimiter the second one needs, so the
     sweep finds ONE class in a file full of them and then passes its own population floor. */
  const emitted = new Set([...strip(sources).matchAll(/(?<=["'`\s])(qcv-sk(?:--[a-z]+)?)(?=["'`\s])/g)].map((m) => m[1]));
  const defined = new Set([...strip(sheets).matchAll(/\.(qcv-sk(?:--[a-z]+)?)[\s,{:]/g)].map((m) => m[1]));

  it("the population — the components really do render placeholders", () => {
    expect(emitted.size, "no placeholder class was found at all; this sweep would then pass vacuously").toBeGreaterThan(3);
  });
  it("every class a component renders has a rule", () => {
    expect([...emitted].filter((c) => !defined.has(c)).sort()).toEqual([]);
  });
  it("…and every rule has a component rendering it", () => {
    expect([...defined].filter((c) => !emitted.has(c)).sort()).toEqual([]);
  });
  it("⚠️ `.qcv-sk` declares `display: block` — on a <span> an inline box ignores every height it is given", () => {
    const rule = /(?:^|\n)\s*\.qcv-sk\s*\{([^}]*)\}/.exec(strip(sheets));
    expect(rule, "`.qcv-sk` has no base rule").not.toBeNull();
    expect(rule![1]).toMatch(/display:\s*block/);
  });
});
