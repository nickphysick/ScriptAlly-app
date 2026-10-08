/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v133 — the open header, rendered: the living title, the fixed line, the two buttons,
 * the figure-only courier; and the loading shape.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcOpenHeader, QC_HEADER_SUB } from "./QcOpenHeader";
import { QC_PLATE_FIGURE } from "./qcArt";

const living = (count: number | null) => ({ count, copy: (n: number) => ({ headline: `${n} queries out`, subline: ["a living sentence the open header does not draw"] }) });
const html = (count: number | null, o: { loading?: boolean; logDisabled?: boolean } = {}) =>
  renderToStaticMarkup(<QcOpenHeader living={living(count) as never} loading={!!o.loading} logDisabled={o.logDisabled} onLog={() => {}} onRecord={() => {}} />);

describe("QcOpenHeader", () => {
  it("draws the living title, the fixed line and both buttons", () => {
    const h = html(27);
    expect(h).toMatch(/<h1 class="qcoh-title" data-probe="title" data-page-title="">27 queries out<\/h1>/);
    expect(QC_HEADER_SUB).toBe("Send, track, and chase them from this page.");
    expect(h).toContain(`>${QC_HEADER_SUB}</p>`);
    expect(h).toContain(">+ Log a query</button>");
    expect(h).toContain(">Record a response</button>");
    expect(h, "the living facts sentence is not drawn").not.toContain("a living sentence");
    expect(h, "an own-header route's marker").toContain('data-own-header=""');
  });
  it("the drawing is the figure-only courier, aria-hidden, with no band or disc", () => {
    const h = html(27);
    expect(h).toContain(`src="${QC_PLATE_FIGURE.src}?v=${QC_PLATE_FIGURE.version}"`);
    expect(h).toMatch(/<img class="qcoh-art" data-qcv="oh-art" aria-hidden="true"/);
    expect(h).not.toMatch(/ph--band|ph-bdisc|qc-courier-disc/);
  });
  it("loading: the title holds a shape and both buttons are disabled", () => {
    for (const h of [html(null), html(27, { loading: true })]) {
      expect(h).toContain('data-loading=""');
      expect(h).toContain(">00 queries out</h1>");
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
