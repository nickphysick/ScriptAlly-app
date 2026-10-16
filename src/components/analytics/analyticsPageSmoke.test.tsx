/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /queries/analytics smoke (analytics v17) — the page renders, says what it is, and in its populated
 * state runs the derivations rather than passing through an empty branch twice.
 *
 * ⚠️ MINIMAL ON PURPOSE. The page's geometry is measured on the rendered page
 * (tests/e2e/analyticsV17.measure.ts); a smoke that pinned appearance would be the next false red.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, setActiveManuscript } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { QueryAnalytics } from "../QueryAnalytics";

// The active-manuscript key is shared app state; leaving it set would silently scope a later file.
afterEach(() => setActiveManuscript(null));

const ROUTE = "/queries/analytics";

describe("/queries/analytics renders", () => {
  it("renders without throwing on an empty account, and states the no-manuscript case", () => {
    expect(() => renderPage(<QueryAnalytics />, ROUTE)).not.toThrow();
    const html = renderPage(<QueryAnalytics />, ROUTE);
    expect(html).toContain("Analytics follow a manuscript");
  });

  it("renders without throwing once there are queries, and the derivation ran", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<QueryAnalytics />, ROUTE)).not.toThrow();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the seed is one query, sent and unanswered */
    expect(html).toContain('data-sent="1"');
    expect(html).toContain("Where the one query got to");
    expect(html).toContain("At a glance");
  });

  it("v21 §A: the desktop opens on the page's own light header — no panel, no band, no illustration but the shadow", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the node render has no matchMedia, so it is the desktop; the phone's v17 band is a live-width branch */
    expect(html).toContain('data-a21="header"');
    expect(html).toContain('data-own-header=""');
    expect(html).toContain("— ANALYTICS —");
    expect(html).toMatch(/data-page-title=""[^>]*aria-label="1 query, no replies"/);
    expect(html).not.toContain('data-hpanel=""');
    expect(html).not.toContain('data-band=""');
    const header = html.slice(html.indexOf('data-a21="header"'), html.indexOf('data-a21="card"'));
    expect(header.match(/<img /g)?.length).toBe(1);
    expect(header).toContain('data-a21="shadow"');
  });

  it("the nine sections are there, in order, and the caveats close the page", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    const at = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((s) => html.indexOf(`data-sec="${s}"`));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).toContain("What the numbers can&#x27;t tell you");
  });

  it("draws no Export and no old time-range control — the strip's All time | Last 90 days is the only one", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).not.toMatch(/>\s*Export\s*</);
    expect(html).not.toContain("Last 6 months");
    expect(html).toContain("All time");
    expect(html).toContain("Last 90 days");
  });

  it("⚠️ the dev review aid is unreachable from a production build — gated at the call site", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/QueryAnalytics.tsx", "utf8");
    expect(src).toMatch(/import\.meta\.env\.MODE === "production" \? own : limitForReview\(own\)/);
  });
});
