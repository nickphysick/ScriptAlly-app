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
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOCK_MIN_COLUMN, QcCentre, readBirdsEyeOpen } from "./QcCentre";

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
  it("§2 · the page reserves the rail's column, and the CARD is what decides how much", () => {
    /* 340 + a 22px gutter + a 22px edge — padding rather than a track, because the card is fixed
       and takes part in no layout; a track would be a second statement of one width. The value is
       published by the card's own measurement, so the reservation and the card cannot disagree;
       the fallback is the reservation rather than 0, so the first frame is the common case.
       The whole claim, with its mutations, is in `qcRail.test.tsx` — this is the page's half. */
    expect(rule(".qcv-page")).toMatch(/padding-right:\s*var\(--qcv-rail-pad,\s*384px\)/);
  });
  it("⚠️ the typewriter face is READ from the shell's one token, never named — and the title beats brand.tsx", () => {
    expect(css).not.toMatch(/Special Elite/);
    expect(rule(".qcv-page")).toMatch(/--qcv-type:\s*var\(--sp-type\)/);
    /* brand.tsx forces h1:not(.wsh-title) with !important at 0-1-1: two classes AND !important, or Playfair */
    expect(rule(".qcv-page .qcv-title")).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
    expect(rule(".qcv-page .qcv-sentence")).toMatch(/font-family:\s*var\(--qcv-type\)\s*!important/);
  });
  it("⚠️ the menu is portalled outside `.qcv-page`, so it reads NO page token — a token there resolves to nothing", () => {
    const menuRules = [...css.matchAll(/(?:^|\n)\s*(\.qcv-menu[^{]*)\{([^}]*)\}/g)];
    expect(menuRules.length).toBeGreaterThan(6);
    for (const [, sel, body] of menuRules) expect(body, `${sel.trim()} reads a page-scoped token`).not.toMatch(/var\(--qcv-/);
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
    const PUBLISHED: Record<string, string> = { "--qcv-rail-pad": "src/components/queries/centre/QcRail.tsx" };
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
  it("anthracite is the page's one button fill, and nothing on this sheet is ink-filled", () => {
    /* ⚠️ IT USED TO READ THE PRESSED VIEW-SWITCH BUTTON, which is retired. The claim was never
       about the switch: it is that this page fills buttons with anthracite and never with ink. */
    expect(rule(".qcv-page")).toMatch(/--qcv-navy:\s*#2a3a52/);
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
