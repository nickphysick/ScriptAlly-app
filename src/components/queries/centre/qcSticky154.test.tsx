/**
 * Query Centre v154 — the sticky toolbar: a strip of the page's ground ending in a 22px fade, undone by its own margins
 * so the page at rest does not move; stuck, the count cross-fades into the current group; group headings never stick.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QcBar153, type QcBar153Props } from "./QcBar153";

const DIR = new URL("./", import.meta.url);
const css = readFileSync(new URL("./qcv154.css", import.meta.url), "utf8");
const page = readFileSync(new URL("./QcPage151.tsx", import.meta.url), "utf8");
const bar = (extra: Partial<QcBar153Props>) => renderToStaticMarkup(
  <QcBar153 view="list" onView={() => {}} loading={false} showing={26} total={26} find="" onFind={() => {}}
    sort={{ key: "due", desc: false }} onSort={() => {}} group="attention" onGroup={() => {}} packageOk
    beGroup="urgency" onBeGroup={() => {}} beSort="due" onBeSort={() => {}} {...extra} />,
);

describe("the sticky toolbar", () => {
  it("is a strip of the ground with a 22px fade, its padding undone by its margins, above the cards", () => {
    const i = css.indexOf(".qc151.qc153 .qc154-tbw {");
    const r = css.slice(i, css.indexOf("}", i));
    expect(r).toMatch(/position:\s*sticky/);
    expect(r).toContain("padding: 12px 0 22px; margin: -12px 0 -22px;");
    expect(r).toContain("linear-gradient(to bottom, #f5f5f3 0, #f5f5f3 calc(100% - 22px), rgba(245, 245, 243, 0) 100%)");
    expect(r).toMatch(/z-index:\s*30/);
    /* an open paperclip raises its card, but stays under the toolbar */
    expect(css).toMatch(/\.qc154-card\.has-pop[^{]*\{\s*z-index:\s*25/);
    expect(page).toContain('<div className="qc154-tbw" data-qc154="toolbar" ref={tbRef}>{controlLine}</div>');
  });

  it("stuck, the count gives way to the current group's name and count", () => {
    const rest = bar({});
    expect(rest).toContain("<b>26</b> queries");
    expect(rest).not.toContain("is-grp");
    const stuck = bar({ stuckOn: true, stuckGroup: { label: "Materials requested", count: "4" } });
    expect(stuck).toMatch(/class="qc153-cnt qc154-tc is-grp"/);
    expect(stuck).toContain('<span class="qc154-tg" data-qc154="toolbar-group" aria-hidden="true">Materials requested<small>4</small></span>');
    expect(css).toMatch(/\.qc151 \.qc154-tg \{[^}]*transform: translateY\(5px\)[^}]*#2a3a52/);
    expect(css).toMatch(/\.qc154-tc > \.qc154-tn, \.qc154-tc > \.qc154-tg \{[^}]*transition: opacity 0\.25s, transform 0\.25s/);
  });

  it("no group heading is sticky in any Query Centre sheet the list draws", () => {
    const sheets = readdirSync(DIR).filter((f) => /^qcv15[34]\d*\.css$/.test(f));
    expect(sheets.length).toBeGreaterThanOrEqual(3);
    for (const f of sheets) {
      const s = readFileSync(new URL(f, DIR), "utf8");
      for (const m of s.matchAll(/([^{}]*\.qc153-(?:sec|grp|fold)[^{}]*)\{([^}]*)\}/g)) expect(m[2], `${f}: ${m[1].trim()}`).not.toMatch(/position:\s*sticky/);
    }
  });
});
