/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the Queries area. See `src/test/pageSmoke.tsx` for why these exist and why they
 * assert almost nothing.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Queries } from "./Queries";
import { QueryAnalytics } from "./QueryAnalytics";

const hub = () => (
  <Queries searchQuery="" onNavigate={noNavigate} activeSubPage="Query database" inShell />
);

describe("/queries renders", () => {
  it("renders without throwing on an empty account", () => {
    expect(() => renderPage(hub(), "/queries")).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(hub(), "/queries");
    expect(html).toContain("Query status");   // the status filter set
    expect(html).toContain("All queries");
  });

  it("renders without throwing with a query on file", () => {
    expect(() => renderPageSeeded(hub(), "/queries")).not.toThrow();
  });

  /**
   * The one place these smokes look at data at all: proof the seeded record reached the render
   * rather than the page falling back to its empty state and passing for the wrong reason.
   */
  it("…and the query reaches the page", () => {
    const html = renderPageSeeded(hub(), "/queries");
    expect(html).toContain("The Smoke Test");
  });
});

describe("/queries/analytics renders", () => {
  /**
   * ⚠️ THIS ROUTE IS CURRENTLY UNREACHABLE — `/queries/analytics` is not in `WORKSPACE_PATHS`, so
   * App.tsx's unknown-path guard redirects to /dashboard before the slot is evaluated. The
   * component is smoked anyway: the day the path is added, the page arrives with a tripwire
   * already on it. Recorded in reports/app-smoke.md, flagged rather than fixed — publishing a
   * "coming soon" page is a product call.
   */
  it("renders without throwing", () => {
    expect(() => renderPage(<QueryAnalytics />, "/queries/analytics")).not.toThrow();
  });

  it("…and says what it is", () => {
    expect(renderPage(<QueryAnalytics />, "/queries/analytics")).toContain("Analytics");
  });
});
