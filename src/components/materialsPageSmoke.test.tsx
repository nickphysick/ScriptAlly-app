/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the materials area: manuscripts, comparable titles, submission packages and
 * import. See `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate, setActiveManuscript } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { AllManuscripts } from "./AllManuscripts";
import { ComparableTitlesPage } from "./manuscripts/ComparableTitlesPage";
import { SubmissionPackages } from "./SubmissionPackages";
import { ImportCsv } from "./ImportCsv";

// The active-manuscript key is shared app state; leaving it set would silently scope a later file.
afterEach(() => setActiveManuscript(null));

describe("/manuscripts renders", () => {
  const page = () => <AllManuscripts searchQuery="" onNavigate={noNavigate} />;

  it("renders without throwing on an empty shelf", () => {
    expect(() => renderPage(page(), "/manuscripts")).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    expect(renderPage(page(), "/manuscripts")).toContain("Your manuscripts");
  });

  /** The plate, the reveal and the In-the-field roster are all derived — none of it runs empty. */
  it("renders the frontispiece plate without throwing once there is a manuscript", () => {
    expect(() => renderPageSeeded(page(), "/manuscripts")).not.toThrow();
  });

  it("…and the manuscript reaches the plate", () => {
    expect(renderPageSeeded(page(), "/manuscripts")).toContain("The Smoke Test");
  });
});

describe("/manuscripts/comps renders", () => {
  const page = () => <ComparableTitlesPage onNavigate={noNavigate} />;

  it("renders without throwing with no manuscript to compare", () => {
    expect(() => renderPage(page(), "/manuscripts/comps")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(page(), "/manuscripts/comps")).toContain("Comparable titles");
  });

  it("renders without throwing once a manuscript is active", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(page(), "/manuscripts/comps")).not.toThrow();
  });

  it("…and that render is scoped to the active manuscript, not the empty branch", () => {
    setActiveManuscript();
    const html = renderPageSeeded(page(), "/manuscripts/comps");
    expect(html).toContain("The Smoke Test");
    expect(html).not.toContain("No manuscript to compare yet");
  });
});

describe("/manuscripts/packages renders", () => {
  it("renders without throwing with no materials", () => {
    expect(() => renderPage(<SubmissionPackages />, "/manuscripts/packages")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(<SubmissionPackages />, "/manuscripts/packages")).toContain("Package Workshop");
  });

  it("renders without throwing once a manuscript is active", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<SubmissionPackages />, "/manuscripts/packages")).not.toThrow();
  });
});

describe("/import renders", () => {
  const page = () => <ImportCsv onNavigate={noNavigate} />;

  it("renders without throwing", () => {
    expect(() => renderPage(page(), "/import")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    expect(renderPage(page(), "/import")).toContain("CSV Import Wizard");
  });
});
