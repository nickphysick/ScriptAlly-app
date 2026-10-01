/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /queries/analytics smoke (analytics v2a) — the page renders, says what it is, and in its populated
 * state actually runs the derivations rather than passing through an empty branch twice.
 *
 * ⚠️ MINIMAL ON PURPOSE. The page's geometry is measured on the rendered page
 * (tests/e2e/analyticsV2a.measure.ts); a smoke that pinned appearance would be the next false red.
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
  it("renders without throwing on an empty account, and says what it is", () => {
    expect(() => renderPage(<QueryAnalytics />, ROUTE)).not.toThrow();
    expect(renderPage(<QueryAnalytics />, ROUTE)).toContain("Analytics");
  });

  it("states the no-manuscript case rather than a page of zeroes", () => {
    const html = renderPage(<QueryAnalytics />, ROUTE);
    expect(html).toContain("Analytics follow a manuscript");
    expect(html).not.toContain('data-anv="journey"');
  });

  it("renders the full header as the page's first row — no eyebrow, no grid masthead", () => {
    const html = renderPage(<QueryAnalytics />, ROUTE);
    expect(html).toContain('data-size="full"');
    expect(html).not.toContain('data-probe="eyebrow"');
  });

  it("renders without throwing once there are queries, and the derivation ran", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<QueryAnalytics />, ROUTE)).not.toThrow();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the seed is one query, sent and unanswered */
    expect(html).toContain('data-sent="1"');
    expect(html).not.toContain("Analytics follow a manuscript");
    expect(html).not.toContain('data-anv-state="empty"');
  });

  /* living headers v3 §3: one query in, and never a rate from fewer than five answered */
  it("the header is the living pair — one query in, too early to say", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain('data-living="settled"');
    expect(html).toContain("One query in");
    expect(html).toContain("Too early to tell you anything. Come back once a few more are out.");
  });

  it("draws no Share card and no Export — neither has a mechanism behind it", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).not.toMatch(/>\s*Share card\s*</);
    expect(html).not.toMatch(/>\s*Export\s*</);
  });
});
