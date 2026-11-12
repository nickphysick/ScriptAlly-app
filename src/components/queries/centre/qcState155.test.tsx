/**
 * Query Centre v155 — the list's states: the shared panel, its placement on the page, and its stylesheet. The rendered
 * values are measured by tests/e2e/qc155.measure.ts; these read the source and the static markup.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { FirstPanel155, QuietPanel155 } from "./QcState155";
import { QcHeader1531 } from "./QcHeader1531";

const DIR = new URL("./", import.meta.url);
const read = (f: string) => { try { return readFileSync(new URL(f, DIR), "utf8"); } catch { return ""; } };
const css = read("qcv155.css");
const page = read("QcPage151.tsx");
const queries = read("../../Queries.tsx");
const bare = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@media[^{]*\{/g, "");
const rule = (sel: string): string => {
  for (const m of bare.matchAll(/([^{}]+)\{([^}]*)\}/g)) if (m[1].split(",").some((s) => s.trim() === sel)) return m[2];
  return "";
};

describe("v155 · the shared panel", () => {
  it("draws a heading and one paragraph, and no image or button", () => {
    const html = renderToStaticMarkup(<QuietPanel155 body="2 queries are with agents." />);
    expect(html).toContain('data-qc155="panel"');
    expect(html).toContain(">Nothing needs you today.</h2>");
    expect(html).toContain(">2 queries are with agents.</p>");
    expect(html).not.toMatch(/<(img|svg|button)\b/);
  });
  it("is styled as the ref's panel", () => {
    const p = rule(".qc151.qc153 .qc155-panel.qc155-panel");
    expect(p).toMatch(/padding:\s*34px 30px/);
    expect(p).toMatch(/border-radius:\s*16px/);
    expect(p).toMatch(/background:\s*#fff/);
    expect(p).toMatch(/box-shadow:\s*0 0 0 1px #e6dfd4/);
    expect(p).toMatch(/margin:\s*14px 0 18px/);
    const h = rule(".qc151.qc153 .qc155-panel .qc155-h.qc155-h");
    expect(h).toMatch(/font-family:\s*"Special Elite"[^;]*!important/);
    expect(h).toMatch(/font-size:\s*26px/);
    expect(h).toMatch(/color:\s*#1c130f/);
    expect(rule(".qc151.qc153 .qc155-panel .qc155-p.qc155-p")).toMatch(/max-width:\s*60ch/);
    expect(rule(".qc151.qc153 .qc155-panel .qc155-p a")).toMatch(/text-underline-offset:\s*3px/);
  });
});

describe("v155 §1 · the quiet state on the page", () => {
  it("sits at the top of the list, before the groups", () => {
    const list = page.slice(page.indexOf('data-qc151="table"'));
    expect(list.indexOf("<QuietPanel155")).toBeGreaterThan(-1);
    expect(list.indexOf("<QuietPanel155")).toBeLessThan(list.indexOf("p.sections.map("));
  });
  it("is decided from the data (lib/qc155) and never while loading", () => {
    expect(queries).toMatch(/const state155: State155 \| null = showGridSkeleton \? null/);
    expect(queries).toContain("quietNow155({ rows: qcScoped, view: qcView150, filtersOn: filtersOn155 })");
    expect(queries).toContain("state155={state155}");
  });
  it("counts the shell's search and \"Where it stands\" as narrowing the list", () => {
    expect(queries).toContain('const filtersOn155 = qc140Chips.length > 0 || qcF138.where != null || qcTerm !== "";');
  });
  it("its review aid is gated on the build mode at the call site", () => {
    expect(queries).toContain('import.meta.env.MODE !== "production" ? qcStateAid() : null');
  });
});

describe("v155 §2 · day one", () => {
  const html = renderToStaticMarkup(<FirstPanel155 onImport={() => {}} />);
  it("the panel's heading and body, exactly", () => {
    expect(html).toContain(">No queries yet.</h2>");
    const text = html.replace(/<[^>]+>/g, "");
    expect(text).toContain("Log your first query and it will appear here, with the date a reply is expected. Already keeping a tracker somewhere? Bring it in with Smart import or use our template.");
  });
  it("both links have the right hrefs: the Import page and the template's download", () => {
    expect(html).toMatch(/<a href="\/import"[^>]*>Bring it in with Smart import<\/a>/);
    expect(html).toMatch(/<a href="\/QueryHawk-pipeline-import-template.xlsx"[^>]*download=""[^>]*>use our template<\/a>/);
    expect(html).not.toMatch(/<(img|svg|button)\b/);
  });
  it("the header's title reads No queries yet at 0, and the count line otherwise", () => {
    const hd = (sent: number) => renderToStaticMarkup(<QcHeader1531 loading={false} onLog={() => {}} onRecord={() => {}} counts={{ ms: "The Salt Road", sent, active: 0, heardPct: 0 }} />);
    expect(hd(0)).toMatch(/data-qc151="title">No queries yet<\/h1>/);
    expect(hd(0)).toContain("The Salt Road");
    expect(hd(0)).toContain("+ Log a query");
    expect(hd(0)).toContain("Record a response");
    expect(hd(3)).toMatch(/data-qc151="title">3 queries sent<\/h1>/);
  });
  it("the list draws the panel and nothing else: no group headings, no rows, no no-match line", () => {
    const list = page.slice(page.indexOf('data-qc151="table"'));
    expect(page).toContain('const first155 = p.state155?.kind === "first";');
    expect(list).toMatch(/\{first155 \? <FirstPanel155 onImport=\{p\.onImport\} \/> : empty \? \(/);
  });
  it("the rail recedes and is inert, and Birds-eye gives way to the panel", () => {
    expect(page).toMatch(/data-qc153="rail-column"[^>]*inert=\{first155 \|\| undefined\}/);
    expect(rule(".qc151.qc153 .qc153-railcol[data-qc155-inert]")).toMatch(/opacity:\s*0?\.4/);
    expect(rule(".qc151.qc153 .qc153-railcol[data-qc155-inert]")).toMatch(/pointer-events:\s*none/);
    expect(page).toContain("{birds && !first155 ? (");
  });
  it("is decided from the manuscript's own rows, never the searched view, and never while loading", () => {
    expect(queries).toContain('qcLivingRows.length === 0 ? { kind: "first" }');
  });
  it("replaces the desktop's earlier empty page: the first-run branch is the phone's only", () => {
    expect(queries).not.toMatch(/<QcEmpty138[\s/>]|from "\.\/queries\/centre\/QcEmpty138"/);
    expect(queries).toMatch(/\{!qcLoad\.loading && !qcDesk && \(\(lhOverride === null && emptyKind === "first"\) \|\| lhOverride === 0\) \? \(/);
  });
});
