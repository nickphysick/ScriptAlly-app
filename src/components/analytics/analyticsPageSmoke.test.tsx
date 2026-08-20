/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smoke — Queries → Analytics. See `src/test/pageSmoke.tsx` for why these exist and why
 * they assert almost nothing.
 *
 * ⚠️ THE POPULATED STATE IS THE ONE THAT MATTERS HERE, more than on most pages. Every figure on
 * Analytics is DERIVED, and none of those derivations execute on an empty account — the page
 * short-circuits to a line of prose. This repo's specs read source with no jsdom, so a
 * source-string test cannot see a runtime throw; the seeded render is the only thing standing
 * between a derivation that crashes and a page that will not load.
 *
 * ⚠️ AND THE SEEDED RENDER NEEDS THE MANUSCRIPT KEY SET, or it reports the empty path twice. This
 * page scopes itself through `scriptally_active_manuscript_id` rather than a prop, exactly as
 * Comparable titles and the Package Workshop do, so seeding the store alone leaves it on its
 * "no manuscript" branch with every assertion below still passing.
 *
 * ⚠️ THE ASSERTIONS STAY MINIMAL AND STRUCTURAL. A smoke that pins appearance becomes the next
 * false red; what is worth pinning is that the page rendered its own chrome rather than an empty
 * shell that merely did not crash.
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
  it("renders without throwing on an empty account", () => {
    expect(() => renderPage(<QueryAnalytics />, ROUTE)).not.toThrow();
  });

  it("…and says what it is", () => {
    expect(renderPage(<QueryAnalytics />, ROUTE)).toContain("Analytics");
  });

  it("states the no-manuscript case rather than a page of zeroes", () => {
    /* ⚠️ FIVE STATS READING 0 BESIDE FOUR BLANK CHARTS DESCRIBES A BROKEN PAGE. One line describes
       an account that has not started yet, which is what this is. */
    const html = renderPage(<QueryAnalytics />, ROUTE);
    expect(html).toContain("Analytics follow a manuscript");
    expect(html).not.toContain("an-strip");
  });

  it("renders the stat strip without throwing once there are queries", () => {
    setActiveManuscript();
    expect(() => renderPageSeeded(<QueryAnalytics />, ROUTE)).not.toThrow();
  });

  it("…and the derivations actually ran, rather than the empty branch passing twice", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    /* the strip is mounted — the empty branches render no strip at all */
    expect(html).toContain("an-strip");
    /* ⚠️ THE TALLY MOVED OUT OF THE MASTHEAD (in-flow masthead, step 1). It was the description —
       "1 query · 1 awaiting reply" — which is two figures rather than a sentence about the page, so
       it became the control row's count. Same derivation, same two numbers, split across the
       tally's own value/note pair. The seed is one query, sent and unanswered. */
    expect(html).toContain("wpg-tally");
    expect(html).toContain("1 query");
    expect(html).toContain("1 AWAITING REPLY");
    expect(html).toContain("Queries sent");
    expect(html).toContain("Median wait");
  });

  it("shows the guarded fraction, not a percentage, on a one-query account", () => {
    /* ⚠️ THE GUARD IS THE POINT OF THIS PAGE'S HONESTY, so it is asserted where it renders rather
       than only where it is computed. One query drawing no request must never read "0%". */
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain("0 of 1");
    expect(html).not.toMatch(/>0<small>%<\/small>/);
  });

  it("offers the early-state hint as a roadmap, with no verdict in it", () => {
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain("Early days");
    /* ⚠️ THE PAGE REPORTS, IT NEVER APPRAISES. One adverb turns a count into a judgement about how
       the writer is going about their own submissions.

       ⚠️ AND THE FORBIDDEN LIST IS VERDICT-SHAPED, NOT A LIST OF WORDS. The first version banned
       the bare word `only` and went red on "queries only" — the median's scope note, which
       appraises nothing. A word list matches innocent prose, and this codebase's own history says
       the cost of that is a false red every time the copy moves. What is actually forbidden is a
       sentence passing judgement on the figures, so that is what is matched. */
    for (const verdict of [/\bonly \d/i, /\btoo few\b/i, /\bshould (be|have)\b/i,
                           /\b(slow|slowly|poor|poorly|impressive|excellent|great job|good going|well done|keep going)\b/i]) {
      expect(html, `the page passes judgement on the writer's figures: ${verdict}`).not.toMatch(verdict);
    }
  });

  it("renders no burgundy-filled button in the header", () => {
    /* Export and the range toggle are parchment with a hairline; a solid primary here would
       outrank every figure beneath it. */
    setActiveManuscript();
    const html = renderPageSeeded(<QueryAnalytics />, ROUTE);
    expect(html).toContain("an-btn");
    expect(html).not.toMatch(/background:\s*#7c3a2a/i);
  });
});
