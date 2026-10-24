/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v149 Part A — the header's two body sentences and the banner's presence, rendered. The harness account
 * holds several books and the list is never scoped to one, so the bold-name branch is only reachable here; QC149-L1
 * measures the other branch on the page.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcHeader149 } from "./QcHeader149";

const render = (o: { msTitle?: string | null; n?: number }) => renderToStaticMarkup(
  <QcHeader149 loading={false} msTitle={o.msTitle === undefined ? "Murphy’s Day Out" : o.msTitle}
    banner={o.n === undefined ? null : { n: o.n, noun: o.n === 1 ? "query is" : "queries are", next: "Decide on offer for Tom Ellery · tomorrow", faces: [{ key: "q1", initials: "TE", title: "Tom Ellery" }] }}
    onLog={() => {}} onRecord={() => {}} onShowThem={() => {}} />,
);

describe("v149 A1 — the header card", () => {
  it("names the book in bold when the page has one", () => {
    const html = render({});
    expect(html).toContain('Every query for <b data-qc149="ms">Murphy’s Day Out</b>, wherever it stands.');
    expect(html).toContain('data-page-title="true"');
    expect(html).toMatch(/<h1[^>]*>Query Centre<\/h1>/);
  });
  it("says every query you’ve sent when the list holds several books, and names none", () => {
    const html = render({ msTitle: null });
    expect(html).toContain("Every query you’ve sent, wherever it stands.");
    expect(html).not.toContain('data-qc149="ms"');
  });
});

describe("v149 A2 — the banner is drawn only when something waits on the writer", () => {
  it("absent at zero, present at one with the singular", () => {
    expect(render({ n: 0 })).not.toContain('data-qc149="banner"');
    expect(render({})).not.toContain('data-qc149="banner"');
    const one = render({ n: 1 });
    expect(one).toContain('data-qc149="banner"');
    expect(one).toContain("1 query is waiting on you.");
    expect(one).toContain("Next: Decide on offer for Tom Ellery · tomorrow");
  });
});
