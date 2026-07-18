/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Card Bands (Variant A) source locks — the MountCard header-fill structure (rim → frame → band +
 * body), the retired spines, and the on-band tag treatments. Logic-only test policy → pinned at
 * the source/rule-text layer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

describe("Card Bands — structure law", () => {
  it("the RIM is white/radius-13/3px-pad with NO clip; the FRAME is the 1px hairline clip context", () => {
    expect(css).toMatch(/\.tdb-tile \{[^}]*border-radius: 13px; padding: 3px;/);
    expect(css).not.toMatch(/\.tdb-tile \{[^}]*overflow: hidden/); // rim does not clip (shadow shows)
    expect(css).toContain(".tdb-frame { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; background: var(--white, #fff); border: 1px solid var(--line); border-radius: 10px; overflow: hidden;");
  });
  it("the band is slim (26px — workbench P2 tighten) with a 1px identity border-bottom; lane tints pink/coffee/note", () => {
    expect(css).toMatch(/\.tdb-band \{[^}]*min-height: 26px[^}]*border-bottom: 1px solid var\(--line\)/);
    expect(css).toContain(".tdb-band.do { background: var(--pink-t); border-bottom-color: var(--pink-b); }");
    expect(css).toContain(".tdb-band.hk { background: var(--hk-cof); border-bottom-color: var(--hk-cof-edge); }");
    expect(css).toContain(".tdb-band.nt { background: var(--note-t); border-bottom-color: var(--note-b); }");
  });
  it("the coloured left spines are RETIRED — no ::before spine on any card type", () => {
    expect(css).not.toContain(".tdb-tile::before");
    expect(css).not.toContain(".tdb-gcard::before");
    expect(css).not.toContain(".tdb-tile.rvcard::before");
    expect(css).not.toMatch(/\.tdb-tile\.(do|hk|nt)::before/);
  });
  it("on a band: tags are white board-wide now (P3 re-ink retired the in-band override); the group dot still goes white on coffee", () => {
    // the standalone .tdb-band .tdb-tag override is gone — the base .tdb-tag is white everywhere (see todoTagLaw)
    expect(css).not.toContain(".tdb-band .tdb-tag:not(.offer):not(.warn)");
    expect(css).toContain(".tdb-band .tdb-kd { background: var(--white, #fff); border: 1px solid var(--hk-cof-edge); }");
  });
  it("workbench P2 re-tune: min-height 200 on both card classes; the GRID drives width (exact-fit retired)", () => {
    expect((css.match(/min-height: 200px/g) ?? []).length).toBeGreaterThanOrEqual(2); // tile + gcard
    expect(css).not.toContain("--tdb-cardw"); // laneFit's width var is gone with the reels
    expect(css).toContain("grid-template-columns: repeat(auto-fill, minmax(230px, 1fr))");
  });
});

describe("Card Bands — band-then-body order per card type (render markup)", () => {
  // the frame opens, the lane band opens next, the body follows — asserted as exact ordered markup
  it("the tile (do/hk/nt): frame → lane band (tags) → body", () => {
    expect(page).toContain('<div className="tdb-frame">\n          <div className={`tdb-band ${c.stream}`}>\n            <div className="tdb-tags">');
    const frame = page.indexOf('<div className={`tdb-band ${c.stream}`}>');
    const body = page.indexOf('<div className="tdb-body">', frame);
    expect(frame).toBeGreaterThan(0);
    expect(body).toBeGreaterThan(frame); // body after band
  });
  it("the grouped card: coffee band (kicker) → body", () => {
    expect(page).toContain('<div className="tdb-band hk">\n            <div className="tdb-kick">');
    const band = page.indexOf('<div className="tdb-band hk">');
    const body = page.indexOf('<div className="tdb-body">', band);
    expect(body).toBeGreaterThan(band);
  });
  it("the review card: do band → body", () => {
    expect(page).toContain('<div className="tdb-band do">\n            <div className="tdb-tags">');
    const band = page.indexOf('<div className="tdb-band do">');
    const body = page.indexOf('<div className="tdb-body">', band);
    expect(body).toBeGreaterThan(band);
  });
});

describe("Card Bands — Phase 2: overlays ride the framed card; clears go neutral", () => {
  it("receipt + dismissed overlays cover the whole frame (fill on the frame, rim white)", () => {
    expect(page).toContain('className="tdb-tile receipt">\n            <div className="tdb-frame">');
    expect(page).toContain('className="tdb-tile dismissed">\n            <div className="tdb-frame">');
    expect(css).toContain(".tdb-tile.receipt .tdb-frame { background: var(--hk-sage); border-color: var(--hk-spine); padding: 15px 17px; }");
    expect(css).toContain(".tdb-tile.dismissed .tdb-frame { background: var(--paper); padding: 15px 17px; }");
    expect(css).not.toContain(".tdb-tile.receipt { background: var(--hk-sage)"); // fill left the rim
  });
  it("fork + flip overlays are wrapped in a frame", () => {
    expect(page).toContain('<div className="tdb-frame">{renderFork(c.key, true,');
    expect(page).toContain('<div className="tdb-frame">{renderFork(key, false,');
    expect(page).toContain('<div className="tdb-frame"><GroupFlip');
  });
  it("clear (empty-state) cards dropped their spines → neutral (no ::before, no lane variant)", () => {
    expect(css).not.toContain(".tdb-clear::before");
    expect(css).not.toContain(".tdb-clear.do::before");
    expect(css).not.toContain(".tdb-clear.hk::before");
  });
});
