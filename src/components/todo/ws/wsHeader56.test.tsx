/**
 * To-do list v56 — the navy header's markup and its sheet's sources. This repo's tests read SOURCE; the rendered panel
 * (its box against the Query Centre's, the ring alone under 1200, the segments' jumps) is tests/e2e/todoV56.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { WsHeader56, TODO_HEADER_ART, thingsTitle } from "./WsHeader56";
import { segLabel56, wordsLine56, RING56_FILL } from "../../../lib/todoHeader56";
import type { Breakdown } from "../../../lib/todoWs";

const BD: Breakdown = { wait: 2, nudge: 1, quiet: 2, house: 31, late: 3, need: 0 };
const noop = () => {};
const html = (bd: Breakdown, book: string | null = "Murphy’s Day Out") =>
  renderToStaticMarkup(<WsHeader56 todo={38} bd={bd} book={book} onAdd={noop} onQuickFill={noop} onJump={noop} />);
const read = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the navy header (WsHeader56)", () => {
  it("renders through the Query Centre's frame: the cut-out at 190, the title, the for line, the two buttons", () => {
    const h = html(BD);
    expect(h).toContain('<div class="qc151 tws56-hdw tws-hd" data-tws="header"><header class="qc1531-hd tws56-hd" data-tws56="header">');
    expect(h).toContain(`<img src="${TODO_HEADER_ART}" alt="" width="190"`);
    expect(TODO_HEADER_ART).toMatch(/^\/images\/todo\/todo-desk-hawk-cut\.webp/);
    expect(h).toContain(`data-page-title="true" data-tws54="title">${thingsTitle(38)}</h1>`);
    expect(h).toContain("<em>for</em> Murphy’s Day Out");
    expect(h).toMatch(/class="qc1531-b qc1531-b--n tws-addb"[^>]*>\+ Add a task<\/button>/);
    expect(h).toMatch(/class="qc1531-b qc1531-b--g"[^>]*>Quick fill<\/button>/);
  });
  it("no book in scope: no for line", () => {
    expect(html(BD, null)).not.toContain("qc1531-for");
  });
  it("the ring: three segment buttons clockwise from 12, the navy colours, the need-you figure; no white disc, no legend", () => {
    const h = html(BD);
    const segs = [...h.matchAll(/data-tws56="seg" data-k="(\w+)" role="button" tabindex="0" class="tws56-seg" aria-label="([^"]+)"[^>]*stroke="([^"]+)"/g)];
    expect(segs.map((m) => [m[1], m[2], m[3]])).toEqual([
      ["wait", "2 agents waiting", RING56_FILL.wait], ["nudge", "1 nudge due", RING56_FILL.nudge], ["quiet", "2 gone quiet", RING56_FILL.quiet],
    ]);
    expect(RING56_FILL).toEqual({ wait: "#e8bdb4", nudge: "#f4eee5", quiet: "rgba(244,238,229,.34)" });
    expect(h).toContain('data-tws56="need" x="105" y="118" text-anchor="middle" aria-hidden="true">5</text>');
    expect(h).toContain(">need you</text>");
    expect(h).toMatch(/<svg viewBox="0 0 210 210" width="140" height="140"/);
    expect(h).not.toContain("rgba(255,255,255,.55)");
    expect(h).not.toMatch(/legend|qc1531-lg|tws54-lg/);
  });
  it("What needs doing and one italic line; a part at 0 is left out, both at 0 leaves no line", () => {
    expect(html(BD)).toContain('<b>What needs doing</b><small data-tws56="line"><em data-tws56="late">3</em> past expected · <em data-tws56="house">31</em> to tidy</small>');
    expect(html({ ...BD, late: 0 })).toContain('<small data-tws56="line"><em data-tws56="house">31</em> to tidy</small>');
    expect(html({ ...BD, house: 0 })).toContain('<small data-tws56="line"><em data-tws56="late">3</em> past expected</small>');
    expect(html({ ...BD, late: 0, house: 0 })).not.toContain('data-tws56="line"');
    expect(wordsLine56({ ...BD, late: 0, house: 0 })).toEqual([]);
  });
  it("the segments' names are singular at 1", () => {
    expect([segLabel56("wait", 1), segLabel56("nudge", 3), segLabel56("quiet", 1)]).toEqual(["1 agent waiting", "3 nudges due", "1 gone quiet"]);
  });
});

describe("the sheets: the Query Centre's rules name the To-do header, at the same specificity", () => {
  const qc = (f: string) => read(`../../queries/centre/${f}`);
  it("the panel, its type and buttons, the grid, the art, the right column and the container", () => {
    /* Workspace headers v1 re-pointed: the lists also name the shared navy header (`.wsnh`) */
    expect(qc("qcv156.css").match(/:is\(\.qc151\.qc153, \.cl27, \.tws56-hdw(?:, \.wsnh)?\) > \.qc1531-hd\.qc1531-hd/g)?.length).toBe(11);
    expect(qc("qcv1534.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw) .qc1531-hd h1.qc1531-t { font: 400 54px/1.05 var(--sp-type) !important;");
    expect(qc("qcv1534.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw) .qc1531-hd { grid-template-columns: 268px minmax(0, 1fr) minmax(400px, 560px); column-gap: 28px; }");
    expect(qc("qcv1534.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw) .qc1531-art { justify-self: center; }");
    expect(qc("qcv154.css")).toContain(":is(.qc151.qc153, .cl27, .tws56-hdw) .qc1531-rc { align-items: center; }");
    expect(qc("qcv1561.css")).toContain(":is(.qc151.qc153, .tws56-hdw) > .qc1531-hd.qc1531-hd { container-type: inline-size; }");
  });
  it("the To-do's own sheet: the ref's third column, the Query Centre's height held, the ring alone under 1200", () => {
    const s = read("todoWs56.css");
    expect(s).toContain(".qc151.tws56-hdw > .qc1531-hd.tws56-hd { grid-template-columns: 268px minmax(0, 1fr) auto; }");
    /* the Query Centre's panel height is its drawing's: the armchair hawk's own size, read from the png */
    const png = readFileSync(resolve(__dirname, "../../../../public/images/qc/qc-armchair-hawk.png"));
    const [w, h] = [png.readUInt32BE(16), png.readUInt32BE(20)];
    expect(s).toContain(`.tws56-hdw .tws56-art { height: calc(190px * ${h} / ${w});`);
    expect(s).not.toMatch(/\.tws56-rc \{[^}]*min-height/);
    expect(s).toMatch(/@container \(max-width: 1199\.98px\) \{\s*\.tws56-hdw \.tws56-words \{ display: none; \}/);
    /* v54's open-header rules are gone, not overridden */
    expect(read("todoWs54.css")).not.toMatch(/tws54-hd|tws54-lg|tws54-art/);
  });
});
