/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /queries/analytics smoke (analytics v13) — the page renders, says what it is, and in its populated
 * state runs the derivations rather than passing through an empty branch twice.
 *
 * ⚠️ MINIMAL ON PURPOSE. The page's geometry is measured on the rendered page
 * (tests/e2e/analyticsV13.measure.ts); a smoke that pinned appearance would be the next false red.
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
    expect(html).not.toContain('data-a13="feature"');
  });

  it("renders without throwing once there are queries, and the derivation ran", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<QueryAnalytics />, ROUTE)).not.toThrow();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the seed is one query, sent and unanswered */
    expect(html).toContain('data-sent="1"');
    expect(html).toContain("Take the guesswork out of querying");
    expect(html).toContain("Where the one query got to");
  });

  it("opens on the feature container — no living header, no PageHeader, no eyebrow line of its own", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain('data-a13="feature"');
    expect(html).not.toContain("data-living=");
    expect(html).not.toContain('data-probe="page-header"');
  });

  it("the seven sections are there, in order, and the caveats close the page", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    const at = [0, 1, 2, 3, 4, 5, 6].map((s) => html.indexOf(`data-sec="${s}"`));
    expect(at.every((i) => i > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });

  it("draws no Export and no time-range control — the ref has neither", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).not.toMatch(/>\s*Export\s*</);
    expect(html).not.toContain("Last 6 months");
  });
});
