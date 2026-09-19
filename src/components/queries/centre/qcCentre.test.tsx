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
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOCK_MIN_COLUMN, QC_VIEWS, QcCentre, readQcView } from "./QcCentre";

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
  <QcCentre loading={false} entering={false} headLine="Every query, from the first letter to the last reply." onLog={() => {}} summary={<div id="sum" />}
    sentence={<h2 id="sentence">s</h2>} view="list" onView={() => {}} body={<div id="body" />} openCard={<aside id="card" />}
    docked onDocked={() => {}} onExport={() => {}} canExport {...over} />,
);

describe("the view — three of them, remembered per device, one writer on the URL", () => {
  it("List, Calendar, Grid — and no Board", () => {
    expect(QC_VIEWS.map((v) => v.label)).toEqual(["List", "Calendar", "Grid"]);
  });
  it("read order is ?view= → this device → the old session key → List; a remembered `board` is List", () => {
    expect(readQcView("?view=grid", "calendar", "list")).toBe("grid");
    expect(readQcView("", "calendar", "grid")).toBe("calendar");
    expect(readQcView("", null, "grid")).toBe("grid");
    expect(readQcView("", null, null)).toBe("list");
    for (const stale of ["board", "", "kanban"]) {
      expect(readQcView(`?view=${stale}`, stale, stale), `"${stale}" did not fall back to List`).toBe("list");
    }
    expect(readQcView("?view=board", "grid", null), "a dead ?view= must not mask what the device remembers").toBe("grid");
  });
  it("the page remembers in localStorage, and reflects with replaceState — never a navigation, never sessionStorage.setItem", () => {
    expect(page).toContain("localStorage.setItem(QC_VIEW_KEY, gridView)");
    expect(page).not.toMatch(/sessionStorage\.setItem\(\s*["'`]sa\.qcView/);
    expect(page).toContain("window.history.replaceState(window.history.state");
    /* List is the default, so List is the view the URL does not state */
    expect(page).toContain('const want = gridView === "list" ? null : gridView;');
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
  it("head: the title, the line, and '+ Log a query' — no masthead component", () => {
    const html = frame();
    expect(html).toMatch(/<h1 class="qcv-title" data-qcv="head-title">Query Centre<\/h1>/);
    expect(html).toContain('data-qcv="head-line"');
    expect(html).toMatch(/<button[^>]*class="sp-inkpill qcv-log"[^>]*data-qcv="head-cta"[^>]*><span class="sp-inkpill-l">\+ Log a query<\/span><\/button>/);
    expect(html).not.toMatch(/["\s]wsh["\s]/);
  });
  it("the Log button says so while a query is already being written", () => {
    expect(frame({ logDisabled: true })).toMatch(/data-qcv="head-cta"[^>]*disabled=""/);
    expect(frame()).not.toMatch(/data-qcv="head-cta"[^>]*disabled/);
  });
  it("the switch presses exactly the current view", () => {
    const html = frame({ view: "calendar" });
    expect([...html.matchAll(/<button type="button" aria-pressed="(true|false)">(List|Calendar|Grid)<\/button>/g)].map((m) => [m[2], m[1]]))
      .toEqual([["List", "false"], ["Calendar", "true"], ["Grid", "false"]]);
  });
  it("⚠️ the open card renders only while DOCKED; unmeasured (null) renders neither a card nor a docked column", () => {
    expect(frame({ docked: true })).toContain('id="card"');
    expect(frame({ docked: true })).toContain("qcv-stage--docked");
    for (const d of [false, null]) {
      expect(frame({ docked: d }), String(d)).not.toContain('id="card"');
      expect(frame({ docked: d }), String(d)).not.toContain("qcv-stage--docked");
    }
    expect(frame({ docked: true, openCard: null }), "an empty docked column").not.toContain("qcv-stage--docked");
    expect(frame({ docked: false })).toContain("qcv-page--narrow");
    expect(frame({ docked: null })).not.toContain("qcv-page--narrow");
    expect(DOCK_MIN_COLUMN).toBe(900);
  });
  it("busy while loading, and it says when it is done — once, politely", () => {
    expect(frame({ loading: true })).toMatch(/data-qcv="page"|aria-busy="true"/);
    expect(frame({ loading: true })).toContain('aria-busy="true"');
    expect(frame()).toContain('aria-busy="false"');
    expect(frame()).toMatch(/role="status" aria-live="polite"[^>]*>Queries loaded</);
  });
  it("the view's frame is the shared FramedCard with no band; Export is a link under the stage", () => {
    const html = frame();
    expect(html).toMatch(/<section data-qcv="ledger"[^>]*class="fc-card fc-card--cq qcv-ledger"><div class="fc-frame" data-qcv="ledger-frame"><div id="body">/);
    expect(html).toMatch(/<div class="qcv-foot"><button type="button" class="qcv-export">Export CSV<\/button>/);
    expect(frame({ canExport: false })).toMatch(/class="qcv-export" disabled=""/);
  });
});

describe("the sheet", () => {
  it("the stage is one column, and 1fr + 396 only while docked; they align to the top", () => {
    expect(rule(".qcv-stage")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\);/);
    expect(rule(".qcv-stage")).toMatch(/align-items:\s*start/);
    expect(rule(".qcv-stage--docked")).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)\s+var\(--qcv-open-w\)/);
    expect(rule(".qcv-page")).toMatch(/--qcv-open-w:\s*396px/);
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
  it("every var() the sheet reads resolves — to a token it declares, or to one of the app's :root tokens", () => {
    const APP = ["--font-serif", "--font-mono", "--sp-type", "--wpg-gutter", "--wpg-measure", "--ws-window", "--ws-window-rgb"];
    const reads = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]));
    expect(reads.size).toBeGreaterThan(10);
    for (const r of reads) expect(APP.includes(r) || new RegExp(`${r}:`).test(css), `${r} is read and never declared`).toBe(true);
  });
  it("buttons are anthracite with white text; no ink fill on this sheet", () => {
    expect(rule('.qcv-views button[aria-pressed="true"]')).toMatch(/background:\s*var\(--qcv-navy\);\s*color:\s*#ffffff/);
    expect(rule(".qcv-page")).toMatch(/--qcv-navy:\s*#2a3a52/);
    expect(css).not.toMatch(/background:\s*(#1c130f|var\(--qcv-ink\))/);
  });
});
