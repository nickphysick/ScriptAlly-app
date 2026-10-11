/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Query Centre's header (v137 §A), rendered: the shared panel as a TITLE page — "Every query, in one place",
 * one subline naming the manuscript, two buttons and the courier's disc. No stacked number, no stamp, no faces.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QC_HEADER_TITLE, QcOpenHeader, qcHeaderSub } from "./QcOpenHeader";
import { QC_COURIER_DISC } from "./qcArt";

const html = (o: { loading?: boolean; logDisabled?: boolean; msTitle?: string | null } = {}) =>
  renderToStaticMarkup(<QcOpenHeader msTitle={o.msTitle === undefined ? "Harbour of Glass" : o.msTitle}
    loading={!!o.loading} logDisabled={o.logDisabled} onLog={() => {}} onRecord={() => {}} />);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("QcOpenHeader (v137)", () => {
  it("the panel, as a title page: one h1 named “Every query, in one place”, broken after the comma", () => {
    const h = html();
    expect(QC_HEADER_TITLE).toBe("Every query, in one place");
    expect(h).toMatch(/<header class="qcoh qcoh--137 hpanel hpanel--hero hp3 hp3--title" data-hpanel="" data-hp3="title" data-qcv="open-header" data-own-header="">/);
    const h1 = h.slice(h.indexOf("<h1"), h.indexOf("</h1>"));
    expect(h1).toContain('data-page-title=""');
    expect(h1).toContain('aria-label="Every query, in one place"');
    expect(h1).toContain("Every query,<br/>in one place");
  });
  it("no stacked number, no stamp, no faces", () => {
    const h = html();
    expect(h).not.toContain('data-hp3-part="number"');
    expect(h).not.toContain("hpanel-stamp");
    expect(h).not.toMatch(/oh-face|qcoh-faces/);
  });
  it("the subline names the manuscript, in its own element; without one book in scope it names none", () => {
    expect(text(html())).toContain("Send, track and chase your queries for Harbour of Glass .");
    expect(html()).toContain('<i class="qcoh-ms" data-qcv="oh-ms">Harbour of Glass</i>');
    expect(qcHeaderSub("Harbour of Glass")).toBe("Send, track and chase your queries for Harbour of Glass.");
    const none = html({ msTitle: null });
    expect(none).not.toContain("oh-ms");
    expect(text(none)).toContain("Send, track and chase your queries.");
    expect(qcHeaderSub(null)).toBe("Send, track and chase your queries.");
  });
  it("the two buttons, in the panel's treatments; the log rule disables + Log a query alone", () => {
    const h = html({ logDisabled: true });
    expect(h).toMatch(/<button type="button" class="hp3-btn hpanel-b1" disabled="" data-qcv="oh-log">\+ Log a query<\/button>/);
    expect(h).toMatch(/<button type="button" class="hp3-btn hpanel-b2" data-qcv="oh-record">Record a response<\/button>/);
  });
  it("loading: both buttons are disabled and the title is already there (it is fixed copy)", () => {
    const h = html({ loading: true });
    expect((h.match(/disabled=""/g) ?? []).length).toBe(2);
    expect(h).toContain("Every query,");
  });
  it("the drawing is the courier's disc file, decorative", () => {
    const h = html();
    expect(h).toContain(`src="${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}"`);
    expect(h).toMatch(/<div class="hp3-art" data-probe="art" data-hp3-part="art" aria-hidden="true"><img data-qcv="oh-art"/);
  });
});
