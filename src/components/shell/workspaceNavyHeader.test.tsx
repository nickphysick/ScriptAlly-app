/**
 * Workspace headers v1 — Phase 1: the shared navy header (shell/WorkspaceNavyHeader). Its header is `shell/OpenHeader`
 * itself, through the slots (the same markup for the same slots), inside the Query Centre's `.qc151.qc153` wrapper plus
 * `.wsnh`; its bar is `shell/SlimBar`, inert and `aria-hidden` while hidden; the Query Centre's sheet names `.wsnh` in
 * §1 and §3 and nowhere else; and the page's own sheet adds no look to the header or the bar beyond Query letters
 * v2.4's.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { OpenHeader } from "./OpenHeader";
import { ArtSlot } from "../todo/ArtSlot";
import { WorkspaceNavyHeader, WsnhFigure, WsnhRing, WsnhWords } from "./WorkspaceNavyHeader";

const read = (f: string) => readFileSync(resolve(__dirname, f), "utf8");
const noop = () => undefined;
const acts = <><button type="button" className="qc1531-b qc1531-b--n">+ Add</button><button type="button" className="qc1531-b qc1531-b--g">Share</button></>;
const right = <><WsnhFigure>7</WsnhFigure><WsnhWords lead="agents" name="asked for more" sub={<><b>4</b> are waiting on you</>} /></>;
const full = (over: Partial<React.ComponentProps<typeof WorkspaceNavyHeader>> = {}) => renderToStaticMarkup(
  <WorkspaceNavyHeader page="responses" art="responses-header" title="18 responses" forLine={{ lead: "for", text: "Murphy's Day Out" }}
    actions={acts} right={right} bar={{ title: "18 responses", aside: <><b>7</b> asked for more</>, button: { label: "+ Add", onClick: noop } }} {...over} />,
);
/** the header element alone, from `<header` to `</header>` */
const headerOf = (html: string) => html.slice(html.indexOf("<header"), html.indexOf("</header>") + "</header>".length);

describe("Phase 1 · the shared navy header", () => {
  it("its header IS OpenHeader's markup for the same slots", () => {
    const mine = headerOf(full());
    const theirs = renderToStaticMarkup(
      <OpenHeader className="wsnh-hd" attrs={{ "data-wsnh": "header", "data-wsnh-page": "responses", "data-own-header": "" }}
        art={<ArtSlot name="responses-header" />} artClassName="wsnh-art"
        title="18 responses" titleAttrs={{ "data-wsnh": "title" }}
        forLine={{ lead: "for", text: "Murphy's Day Out", attrs: { "data-wsnh": "for" } }}
        actions={acts} ring={<div className="wsnh-rc" data-wsnh="right">{right}</div>} />,
    );
    expect(mine.length).toBeGreaterThan(200);
    expect(mine).toBe(theirs);
  });

  it("sits in the Query Centre's wrapper plus `wsnh`; exactly one h1; the drawing is the page's ArtSlot, aria-hidden, no caption", () => {
    const h = full();
    expect(h.startsWith('<div class="qc151 qc153 wsnh" data-wsnh="root">')).toBe(true);
    expect(h.match(/<h1\b/g)?.length).toBe(1);
    expect(h).toMatch(/<div class="qc1531-art wsnh-art" aria-hidden="true"><figure class="art art--responses-header" data-art="responses-header">/);
    expect(h).not.toMatch(/figcaption|art-cap/);
  });

  it("the bar: the page's title, the aside and the primary button; hidden, it is inert and aria-hidden", () => {
    const h = full();
    const bar = h.slice(h.indexOf('<div class="qc156-slim"'), h.indexOf("<header"));
    expect(bar).toMatch(/^<div class="qc156-slim" data-wsnh="slim" inert="" aria-hidden="true">/);
    expect(bar).toContain('<b data-wsnh="slim-title">18 responses</b>');
    expect(bar).toContain('data-wsnh="slim-aside"><b>7</b> asked for more</span>');
    expect(bar).toMatch(/<button type="button" class="qc156-sb" data-wsnh="slim-button">\+ Add<\/button>/);
    expect(bar).not.toContain("data-shown");
    /* the bar comes first, the header straight after it: both the wrapper's children, as the bar's reader expects */
    expect(h.indexOf("qc156-slim")).toBeLessThan(h.indexOf("<header"));
  });

  it("no right block: the two-column header and no right column content; loading: a held title, no line, no right block, no bar", () => {
    const empty = full({ right: null });
    expect(empty).toContain('class="qc1531-hd wsnh-hd wsnh-hd--two"');
    expect(empty).not.toContain('data-wsnh="right"');
    const load = full({ loading: true });
    expect(load).toContain('<h1 class="qc1531-t" data-page-title="true" data-wsnh="title"> </h1>');
    expect(load).not.toContain("qc1531-for");
    expect(load).not.toContain('data-wsnh="right"');
    expect(load).not.toContain("qc156-slim");
  });

  it("the ring is a figure the page has: its percentage, clamped and rounded", () => {
    expect(renderToStaticMarkup(<WsnhRing pct={87.6} />)).toContain('data-pct="88"');
    expect(renderToStaticMarkup(<WsnhRing pct={140} />)).toContain(">100%</b>");
    expect(renderToStaticMarkup(<WsnhRing pct={0} />)).not.toContain('stroke="#f4eee5"');
    /* nothing to divide by yet: the track alone and a dash, never a 0% */
    const none = renderToStaticMarkup(<WsnhRing pct={null} />);
    expect(none).not.toContain('data-wsnh="ring-arc"');
    expect(none).toContain(">–</b>");
  });

  it("a title that may wrap carries the wrap class on the header itself", () => {
    expect(full({ wrap: true })).toContain('class="qc1531-hd wsnh-hd wsnh-hd--wrap"');
    expect(full()).not.toContain("wsnh-hd--wrap");
  });
});

describe("Phase 1 · the sheets", () => {
  const qc = read("../queries/centre/qcv156.css");
  const sec = (a: string, b: string) => qc.slice(qc.indexOf(a), qc.indexOf(b));
  it("qcv156 names `.wsnh` in §1 and §3 at the end of each :is() list, and nowhere else", () => {
    const s1 = sec("/* ── §1 ·", "/* ── §2 ·"), s3 = sec("/* ── §3 ·", "/* ── §6 ·");
    expect(s1.match(/:is\(\.qc151\.qc153, \.cl27, \.tws56-hdw, \.wsnh\) > \.qc1531-hd\.qc1531-hd/g)?.length).toBe(11);
    /* (on the dev line Submission packages v43's `.pk43` sits before it in §3) */
    expect(s3.match(/:is\(\.qc151\.qc153, \.cl27, \.tws56(?:, \.pk43)?, \.wsnh\) > \.qc156-slim/g)?.length).toBe(5);
    expect(s3.match(/:is\(\.qc151, \.cl27, \.tws56(?:, \.pk43)?, \.wsnh\) \.qc156-/g)?.length).toBe(11);
    expect(qc.match(/\.wsnh/g)?.length).toBe(11 + 5 + 11);
  });
  it("the page's sheet: the wrapper draws no box; 48 under the header and its card shadow; no navy, radius or type of its own for the header or the bar", () => {
    const w = read("wsnh.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(w).toMatch(/\.wsnh \{ display: contents; \}/);
    expect(w).toMatch(/\.qc151\.qc153\.wsnh > \.qc1531-hd\.wsnh-hd\.wsnh-hd \{ min-height: 227px; margin-bottom: 48px; box-shadow: 0 22px 36px -26px rgba\(28, 19, 15, \.55\); \}/);
    /* the one bar rule: a long title ends in an ellipsis (it changes no size, face or colour) */
    const ell = ".qc151.qc153.wsnh > .qc156-slim .qc156-st b { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; }";
    expect(w).toContain(ell);
    expect(w.replace(ell, "")).not.toMatch(/qc156-slim|qc156-sb|qc156-st|#2a3a52/);
    expect(w.replace(/\.wsnh-lnk:focus-visible[^}]*\}/, "")).not.toMatch(/border-radius/);
    expect(w).not.toMatch(/h1\.qc1531-t \{[^}]*font/);
    /* the ruled line keeps the Query Centre's own spacing (qcv1531: 8px 0 12px) where a page resets paragraphs */
    expect(read("../queries/centre/qcv1531.css")).toMatch(/\.qc1531-for \{[^}]*margin: 8px 0 12px;/);
    expect(w).toMatch(/\.qc151\.qc153\.wsnh > \.qc1531-hd \.qc1531-for \{ margin: 8px 0 12px; \}/);
  });
});
