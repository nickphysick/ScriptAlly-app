/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /queries/analytics smoke (analytics v26) — the page renders, says what it is, and in its populated state runs the
 * derivations rather than passing through an empty branch twice.
 *
 * ⚠️ MINIMAL ON PURPOSE. The page's geometry is measured on the rendered page (tests/e2e/analyticsV26.measure.ts); a
 * smoke that pinned appearance would be the next false red.
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

  it("renders once there are queries: the Early state, with the derivation run", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<QueryAnalytics />, ROUTE)).not.toThrow();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the seed is one query, sent and unanswered */
    expect(html).toContain('data-sent="1"');
    expect(html).toContain('data-a26-state="early"');
    expect(html).toContain("Patterns appear after 5 replies");
    expect(html).toContain("What happened to your 1 query?");
    expect(html).toContain("How long do replies take?");
    expect(html).not.toContain("What to do next");
  });

  it("opens on the shared navy header: the headline, the book, the two buttons", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain('data-wsnh-page="analytics"');
    expect(html).toContain('data-own-header=""');
    expect(html).toContain("1 query, no replies yet");
    expect(html).toContain(">Record a response<");
    expect(html).toContain(">How it works<");
    expect(html).toContain("Your oldest query has been out");
    expect(html.match(/<h1\b/g)?.length).toBe(1);
  });

  it("retired: no v24 sections, no desk, no section tab, no glance strip", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).not.toContain('data-sec="');
    expect(html).not.toContain('data-a17="');
    expect(html).not.toContain('data-a21="');
    expect(html).not.toContain("At a glance");
    expect(html).not.toContain("Replied on time");
  });

  it("⚠️ the dev review aid is unreachable from a production build — gated at the call site", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/QueryAnalytics.tsx", "utf8");
    expect(src).toMatch(/import\.meta\.env\.MODE === "production" \? own : limitForReview\(own\)/);
  });
});
