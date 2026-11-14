/**
 * To-do list v56 Phase 2 — the slim bar's markup and the workspace's pin, from SOURCE. Its moment, place and the pin's
 * constant height are measured on the rendered page (tests/e2e/todoV56.measure.ts L4–L6, L8).
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { WsSlim56 } from "./WsSlim56";
import type { Breakdown } from "../../../lib/todoWs";

const BD: Breakdown = { wait: 2, nudge: 1, quiet: 2, house: 31, late: 3, need: 0 };
const read = (f: string) => readFileSync(resolve(__dirname, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("the To-do list's slim bar (WsSlim56)", () => {
  it("left: the title and the book; right: need you, the italic late, + Add a task — hidden and inert on first render", () => {
    const h = renderToStaticMarkup(<WsSlim56 todo={38} bd={BD} book="Murphy’s Day Out" onAdd={() => {}} />);
    expect(h).toMatch(/^<div class="qc156-slim" data-tws56="slim" inert="" aria-hidden="true">/);
    expect(h).toContain('<b data-tws56="slim-title">38 things to do</b><i data-tws56="slim-for">for Murphy’s Day Out</i>');
    expect(h).toContain('<span class="qc156-sw" data-tws56="slim-need"><b>5 need you</b><em data-tws56="slim-late">3 late</em></span>');
    expect(h).toMatch(/<button type="button" class="qc156-sb" data-tws56="slim-add"[^>]*>\+ Add a task<\/button>/);
  });
  it("no late, no book: neither is drawn", () => {
    const h = renderToStaticMarkup(<WsSlim56 todo={1} bd={{ ...BD, late: 0 }} book={null} onAdd={() => {}} />);
    expect(h).toContain(">1 thing to do</b>");
    expect(h).not.toMatch(/slim-late|slim-for/);
  });
  it("the page mounts it first in the page, and its button is the header's add", () => {
    const w = read("TodoWorkspace.tsx");
    expect(w).toMatch(/<div className="tws tws56" data-tws="page">\s*\{[^}]*\}\s*<WsSlim56 todo=\{all\.length\} bd=\{bd\} book=\{statBook\} onAdd=\{openAdd\} \/>/);
    expect(w).toContain("<WsHeader56 todo={all.length} bd={bd} book={statBook}\n            onAdd={openAdd}");
  });
  it("the pin: 72px under the scroller's top, the scrollport less 84 (a constant height); the bar on the scroller's top", () => {
    expect(read("todoWs54.css")).toContain(".tws .tws-ws { position: sticky; top: 72px; height: calc(var(--tws-port, 800px) - 84px); min-height: 0; }");
    expect(read("todoWs56.css")).toContain(".tws.tws56 > .qc156-slim.qc156-slim { top: 0; }");
    const qc = read("../../queries/centre/qcv156.css");
    /* on the dev line the bar's rules also name the Contact list (`.cl27`, cl-qc-layout-v1.1), beside `.tws56` */
    expect(qc.match(/:is\(\.qc151\.qc153, (?:\.cl27, )?\.tws56\) > \.qc156-slim/g)?.length).toBe(5);
    expect(qc).toMatch(/:is\(\.qc151, (?:\.cl27, )?\.tws56\) \.qc156-sb \{/);
    expect(qc).not.toMatch(/(^|\n)\s*\.qc151\.qc153 > \.qc156-slim/);
  });
});
