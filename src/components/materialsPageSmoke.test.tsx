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
    /* ⚠️ THE H1, NOT THE BARE WORD. The page title follows its nav label now ("Your
       manuscripts" → "Manuscripts"), and "Manuscripts" alone appears in half the markup on
       this page — as a tab, an empty-state label and a button. Matching the loose string would
       keep this green with no header rendered at all, which is the one thing it is here for. */
    expect(renderPage(page(), "/manuscripts")).toContain(">Manuscripts</h1>");
  });

  /**
   * ⚠️ THE POPULATED STATE IS SMOKED TOO, because every figure on the card is DERIVED and none of
   * those derivations execute on an empty shelf. A source-string spec cannot see a runtime throw,
   * so this is the only thing standing between a derivation that crashes and a page that will not
   * load — the exact failure mode that once shipped through a fully green suite.
   */
  it("renders the library grid without throwing once there is a manuscript", () => {
    expect(() => renderPageSeeded(page(), "/manuscripts")).not.toThrow();
  });

  /**
   * ⚠️ THE POPULATED STATE IS THE LIBRARY GRID NOW, NOT THE DOSSIER. The page opens on the shelf and
   * a card click opens one book, so the plateband these assertions used to reach is behind an
   * interaction — and this repo's specs read source with no jsdom, so nothing here can click.
   *
   * ⚠️ AND THAT LEAVES A REAL, NAMED GAP: the dossier branch's wiring (its tabs, its four Details
   * tiles and the lifecycle menu) is executed by NO smoke until `ManuscriptDossier` is extracted as
   * a props-only component with its own render spec — the first task of Phase 2. The gap is
   * narrower than it looks (`plateStats` still runs here, on the card; the tile derivations keep
   * their own unit tests and `ManuscriptDetailTiles` its own render spec) but it is not nothing,
   * and it is recorded rather than quietly accepted.
   */
  it("…and the manuscript reaches its card on the shelf", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("The Smoke Test");
    expect(html).toContain("mlib-grid");
    expect(html).toContain("mlib-book");
  });

  /**
   * ⚠️ ASSERT THE FIGURE, NOT THE LABEL. The foot renders whatever the numbers are, so a card fed
   * constants — or fed the wrong manuscript's queries — passes a label-only check. The seed carries
   * exactly one query and no response, so the card must SAY one query, and must agree in number.
   */
  it("…with its derived counts, and the counts are the real ones", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("<b>1</b> query");
    expect(html).toContain("<b>0</b> responses");
  });

  /**
   * The pitch meter is the one derivation that reads BOTH the manuscript and its versions, so it is
   * the card's deepest one. The seed has a logline and nothing else, which is 1 of 4.
   */
  it("…and the pitch meter, reporting the real state of the shelf", () => {
    const html = renderPageSeeded(page(), "/manuscripts");
    expect(html).toContain("1 of 4 pitch pieces written");
    expect(html).toContain("mlib-seg on");
  });

  /** The add tile renders at every count, including one — one card beside it is the intended shelf. */
  it("…beside the add tile, which renders at every count", () => {
    expect(renderPageSeeded(page(), "/manuscripts")).toContain("mlib-add");
  });

  /**
   * ⚠️ THE SHELF SWITCHER IS DELETED, NOT HIDDEN. It existed to pick the single card's subject, and
   * the library does that by being a library — keeping both would give the page two controls for
   * one job. This asserts it is gone at every count, not merely absent at one.
   */
  it("…and renders NO shelf switcher, at any count", () => {
    expect(renderPageSeeded(page(), "/manuscripts")).not.toContain("msv-switcher");
    expect(renderPage(page(), "/manuscripts")).not.toContain("msv-switcher");
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
    expect(renderPage(<SubmissionPackages />, "/manuscripts/packages")).toContain('wsh-title">Submission packages');
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
