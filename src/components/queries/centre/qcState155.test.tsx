/**
 * Query Centre v155 — the list's states: the shared panel, its placement on the page, and its stylesheet. The rendered
 * values are measured by tests/e2e/qc155.measure.ts; these read the source and the static markup.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QuietPanel155 } from "./QcState155";

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
