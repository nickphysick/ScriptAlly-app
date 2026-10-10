/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v136 — the open, ruled-corner header, rendered: the title and its figure, the subheader,
 * the stamp, the two buttons, the figure-only courier, the ruled corner; and the loading shape.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcOpenHeader, sentTitle, sentWords } from "./QcOpenHeader";
import { QC_PLATE_FIGURE } from "./qcArt";

const html = (sent: number | null, o: { loading?: boolean; logDisabled?: boolean; msTitle?: string | null; withYou?: number | null } = {}) =>
  renderToStaticMarkup(<QcOpenHeader sent={sent} msTitle={o.msTitle === undefined ? "Harbour of Glass" : o.msTitle} withYou={o.withYou}
    loading={!!o.loading} logDisabled={o.logDisabled} onLog={() => {}} onRecord={() => {}} />);

describe("QcOpenHeader (v136)", () => {
  it("the title: “You’ve sent {N} queries”, one h1 with data-page-title, and its accessible name", () => {
    const h = html(27);
    expect(sentTitle(27)).toBe("You’ve sent 27 queries");
    expect(sentTitle(1)).toBe("You’ve sent 1 query");
    expect(sentWords(0)).toBe("queries");
    expect(h).toMatch(/<h1 class="qcoh-title" data-probe="title" data-page-title="" aria-label="You’ve sent 27 queries">/);
    expect(h).toMatch(/data-qcv="oh-ht">You’ve sent<\/span><span class="qcoh-hn" data-qcv="oh-hn">27<\/span><span class="qcoh-ht" data-qcv="oh-ht2">queries<\/span>/);
    expect(html(1)).toMatch(/data-qcv="oh-hn">1<\/span><span class="qcoh-ht" data-qcv="oh-ht2">query<\/span>/);
    expect(h, "an own-header route's marker").toContain('data-own-header=""');
  });
  it("the subheader: “for {title}”, the title in an <em>; absent when the page is scoped to no single book", () => {
    expect(html(27)).toContain('<p class="qcoh-sub" data-qcv="oh-sub">for <em>Harbour of Glass</em></p>');
    expect(html(27, { msTitle: null })).not.toContain("oh-sub");
  });
  it("it is not a panel: no panel class, no header sheet, no faces row", () => {
    const h = html(27);
    expect(h).not.toMatch(/hpanel|data-hpanel|data-header-sheet|hsheet/);
    expect(h).not.toMatch(/oh-face|oh-faces|qcoh-fc/);
  });
  it("the stamp: after the title, outside the h1, absent at 0 and while loading", () => {
    const h = html(27, { withYou: 4 });
    expect(h).toMatch(/<\/h1><span class="qcoh-stamp" data-qcv="oh-stamp">4 with you<\/span>/);
    expect(html(27, { withYou: 0 })).not.toContain("oh-stamp");
    expect(html(27, { withYou: 4, loading: true })).not.toContain("oh-stamp");
  });
  it("the drawing is the figure-only courier, aria-hidden; the ruled corner is two aria-hidden layers", () => {
    const h = html(27);
    expect(h).toContain(`src="${QC_PLATE_FIGURE.src}?v=${QC_PLATE_FIGURE.version}"`);
    expect(h).toMatch(/<img class="qcoh-art" data-qcv="oh-art" aria-hidden="true"/);
    expect(h).toContain('<span class="qcoh-ruled" data-qcv="oh-ruled" aria-hidden="true"></span>');
    expect(h).toContain('<span class="qcoh-margin" data-qcv="oh-margin" aria-hidden="true"></span>');
    expect(h).not.toMatch(/qc-courier-disc/);
  });
  it("loading: the figure holds a shape and both buttons are disabled", () => {
    for (const h of [html(null), html(27, { loading: true })]) {
      expect(h).toContain('data-loading=""');
      expect(h).toMatch(/data-qcv="oh-hn">00<\/span>/);
      expect((h.match(/disabled=""/g) ?? []).length, "both buttons disabled").toBe(2);
    }
    expect(html(27)).not.toContain("data-loading");
  });
  it("the log rule disables + Log a query alone", () => {
    const h = html(27, { logDisabled: true });
    expect((h.match(/disabled=""/g) ?? []).length).toBe(1);
    expect(h).toMatch(/data-qcv="oh-log" disabled=""/);
  });
});
