/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's header (header v3), rendered: the shared panel as a NUMBER page — the count, "queries sent",
 * "for {manuscript}", two buttons and the courier's disc; no stamp, no faces, no ruled corner; and the loading shape.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcOpenHeader, sentTitle, sentWords } from "./QcOpenHeader";
import { QC_COURIER_DISC } from "./qcArt";

const html = (sent: number | null, o: { loading?: boolean; logDisabled?: boolean; msTitle?: string | null } = {}) =>
  renderToStaticMarkup(<QcOpenHeader sent={sent} msTitle={o.msTitle === undefined ? "Harbour of Glass" : o.msTitle}
    loading={!!o.loading} logDisabled={o.logDisabled} onLog={() => {}} onRecord={() => {}} />);

describe("QcOpenHeader (header v3)", () => {
  it("the panel, as a number page: one h1 holding the number and the words, named “27 queries sent”", () => {
    const h = html(27);
    expect(sentTitle(27)).toBe("27 queries sent");
    expect(sentTitle(1)).toBe("1 query sent");
    expect(sentWords(0)).toBe("queries sent");
    expect(h).toMatch(/<header class="qcoh hpanel hpanel--hero hp3 hp3--number" data-hpanel="" data-hp3="number" data-qcv="open-header" data-own-header="">/);
    expect(h).toMatch(/<h1 class="hp3-h1" data-probe="title" data-page-title="" aria-label="27 queries sent"><span class="hp3-n" data-hp3-part="number">27<\/span> <span class="hp3-w" data-hp3-part="words">queries sent<\/span><\/h1>/);
    expect(html(1)).toMatch(/data-hp3-part="number">1<\/span> <span class="hp3-w" data-hp3-part="words">query sent<\/span>/);
  });
  it("the subline is a <p> outside the h1: “for {title}”, the title in an <em>; absent when no single book is in scope", () => {
    const h = html(27);
    expect(h).toContain('</h1><p class="hp3-s" data-probe="intro" data-hp3-part="sub">for <em>Harbour of Glass</em></p>');
    expect(html(27, { msTitle: null })).not.toContain("hp3-s");
  });
  it("no stamp, no faces, no ruled corner", () => {
    const h = html(27);
    expect(h).not.toMatch(/stamp|oh-face|oh-faces|qcoh-fc|oh-ruled|oh-margin/);
  });
  it("the drawing is the courier on his disc, aria-hidden", () => {
    const h = html(27);
    expect(h).toContain(`src="${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}"`);
    expect(h).toMatch(/<div class="hp3-art" data-probe="art" data-hp3-part="art" aria-hidden="true"><img data-qcv="oh-art"/);
  });
  it("loading: the number is a blank of its box and both buttons are disabled", () => {
    for (const h of [html(null), html(27, { loading: true })]) {
      expect(h).toContain('data-loading=""');
      expect(h).toMatch(/<span class="hp3-n hp3-blank" data-hp3-part="number" data-blank="00" aria-hidden="true"><\/span>/);
      /* and the h1 holds no text at all while it waits */
      expect(h.slice(h.indexOf("<h1"), h.indexOf("</h1>")).replace(/<[^>]+>/g, "").trim()).toBe("");
      expect(h).toContain('data-blank="queries sent"');
      expect((h.match(/disabled=""/g) ?? []).length, "both buttons disabled").toBe(2);
    }
    expect(html(27)).not.toContain("data-loading");
  });
  it("the log rule disables + Log a query alone", () => {
    const h = html(27, { logDisabled: true });
    expect((h.match(/disabled=""/g) ?? []).length).toBe(1);
    expect(h).toMatch(/disabled="" data-qcv="oh-log"/);
  });
});
