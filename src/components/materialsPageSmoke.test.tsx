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

  /**
   * ⚠️ THE POPULATED STATE IS SMOKED TOO, because every figure on the card is DERIVED and none of
   * those derivations execute on an empty shelf. A source-string spec cannot see a runtime throw,
   * so this is the only thing standing between a derivation that crashes and a page that will not
   * load — the exact failure mode that once shipped through a fully green suite.
   */
  it("renders the plate card without throwing once there is a manuscript", () => {
    expect(() => renderPageSeeded(page(), "/manuscripts")).not.toThrow();
  });

  it("…and the manuscript reaches the plateband", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("The Smoke Test");
    expect(html).toContain("msv-plateband");
  });

  /**
   * ⚠️ ASSERT THE FIGURE, NOT THE LABEL. The three keys render whatever the numbers are, so a
   * plate fed constants — or fed the wrong manuscript's queries — passes a key-only check. The
   * seed carries exactly one query, so the strip must SAY one.
   */
  it("…with its three derived figures beside it, and the figures are the real ones", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    for (const key of ["Queries", "Responses", "Last activity"]) expect(html).toContain(key);
    expect(html).toContain('<div class="msv-statn">1</div>');
  });

  it("…and the three tabs, opening on Details", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    for (const t of ["Details", "Comparable titles", "Submission packages"]) expect(html).toContain(t);
    expect(/aria-selected="true"[^>]*>Details</.test(html)).toBe(true);
  });

  /** The Details pane is the default, so its four derivations run on every first paint. */
  it("…and the Details pane's four tiles", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    for (const label of ["Out in the world", "Comparable titles", "On the shelf", "Submission materials"]) {
      expect(html).toContain(label);
    }
  });

  /** ⚠️ The lifecycle menu has no other home on this page — losing it is a silent regression. */
  it("…and keeps the shelve/delete affordance the plate list carried", () => {
    expect(renderPageSeeded(page(), "/manuscripts")).toContain('aria-label="More actions"');
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
