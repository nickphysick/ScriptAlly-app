/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part A, as v150 A2/A3 left it — the header's one body sentence and the banner's absence, rendered. The harness account
 * holds several books and the list is never scoped to one, so the bold-name branch is only reachable here; QC149-L1
 * measures the other branch on the page.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcHeader149 } from "./QcHeader149";

const render = (o: { msTitle?: string | null }) => renderToStaticMarkup(
  <QcHeader149 loading={false} msTitle={o.msTitle === undefined ? "Murphy’s Day Out" : o.msTitle}
    onLog={() => {}} onRecord={() => {}} />,
);

describe("v149 A1 — the header card", () => {
  it("names the book in bold when the page has one", () => {
    const html = render({});
    expect(html).toContain('Every query for <b data-qc149="ms">Murphy’s Day Out</b>, wherever it stands.');
    expect(html).toContain('data-page-title="true"');
    /* v150 A2 — the title wears the highlighter, and the body is the first sentence only */
    expect(html).toMatch(/<h1[^>]*><span class="hl" data-qc150="hl">Query Centre<\/span><\/h1>/);
    expect(html).not.toContain("Log what you send");
  });
  it("says every query you’ve sent when the list holds several books, and names none", () => {
    const html = render({ msTitle: null });
    expect(html).toContain("Every query you’ve sent, wherever it stands.");
    expect(html).not.toContain('data-qc149="ms"');
  });
});

describe("v150 A3 — the banner is removed", () => {
  it("is never drawn; its content is the Your move card", () => {
    expect(render({})).not.toContain('data-qc149="banner"');
    expect(render({})).not.toContain("waiting on you");
  });
});
