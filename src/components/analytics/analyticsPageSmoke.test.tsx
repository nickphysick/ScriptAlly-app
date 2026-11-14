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
    expect(html).toContain("What happened to your queries?");
    expect(html).toContain("Your 1 query");
    expect(html).toContain("At a glance");
  });

  /* RE-POINTED (Workspace headers v1, 14 Nov): v21's light header ("— ANALYTICS —", the shadow, the white card) is the
     shared navy header now; its words and figures are the same. */
  it("the desktop opens on the shared navy header: the headline, the book, the two buttons, the ring; no legend", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the node render has no matchMedia, so it is the desktop; the phone's v17 band is a live-width branch */
    expect(html).toContain('data-wsnh-page="analytics"');
    expect(html).toContain('data-own-header=""');
    expect(html).toMatch(/<h1 class="qc1531-t" data-page-title="true" data-wsnh="title">1 query, no replies<\/h1>/);
    expect(html).toContain("+ Record a response");
    expect(html).toContain("See what happened");
    expect(html).toContain("Replied on time");
    expect(html).not.toContain('data-a21="header"');
    expect(html).not.toContain('data-a21="counts"');
    expect(html).not.toContain("— ANALYTICS —");
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("v24: the seven question sections are there, in order, and the note closes the page", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    const at = [0, 1, 2, 3, 4, 5, 6].map((s) => html.indexOf(`data-sec="${s}"`));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html).not.toContain('data-sec="7"');
    expect(html).toContain("A note on these numbers");
    expect(html).not.toContain("What the numbers can&#x27;t tell you");
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
