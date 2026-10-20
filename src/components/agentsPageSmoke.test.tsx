/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — the Agents area. See `src/test/pageSmoke.tsx` for why these exist and why they
 * assert almost nothing.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Agents } from "./Agents";
import { DiscoverPage } from "./agents/discover1/DiscoverPage";

const list = () => <Agents searchQuery="" onNavigate={noNavigate} active />;

describe("/agents renders", () => {
  it("renders without throwing on an empty account", () => {
    expect(() => renderPage(list(), "/agents")).not.toThrow();
  });

  /**
   * ⚠️ RETARGETED, AND THE LAW IS UNCHANGED: the page produces its own chrome rather than being an
   * empty shell that merely failed to crash. What moved is WHICH chrome each state carries. A
   * blank account no longer renders the toolbar at all — none of its six controls does anything
   * against nothing on file — so `Filters` is now the SEEDED render's tripwire, and the blank
   * account's is the editorial empty state that replaced the dashed box. Asserting the old pair
   * here would be asserting the opposite of the behaviour.
   */
  it("…and a blank account produces the empty state, not an empty shell", () => {
    const html = renderPage(list(), "/agents");
    /* ⚠️ RETARGETED (living headers §3): the feature-led page is retired for the shared header's
       empty state. Same two jobs — the opening, and a block only a whole render reaches. */
    /* RE-POINTED (Contact list v17 §F): the empty page is the navy header, "How it works" and "Ways to get started" */
    expect(html).toContain("Every agent, in one place");
    /* ⚠️ RETARGETED (empty-states pack, Phase 3). The six-row "What makes a strong agent record?"
       band is retired; the ref's "Fill the gaps." row replaces it. The second assertion's job here
       is unchanged — prove the page is the WHOLE empty state and not a hero that lost its body —
       so it names the LAST block, which is what a truncated render loses first.

       ⚠️ AND A SMOKE PINS THE MINIMUM, NOT THE APPEARANCE. Two strings: the opening and the close. */
    expect(html).toContain("Ways to get started");
  });

  it("…and that state suppresses the toolbar, which has nothing to act on", () => {
    const html = renderPage(list(), "/agents");
    /* ⚠️ RETARGETED (living headers §4): the empty page now EXHIBITS the populated page — its own
       controls among them, inert and aria-hidden, over a sample. The law is about the LIVE page: no
       toolbar outside the band, and the band present to hold the picture. */
    /* RE-POINTED (Contact list v17 §F): the empty page exhibits nothing of the populated page any more — it shows one
       labelled example agent instead. The law is unchanged: no list, no filter row and no pinned row to act on nothing. */
    expect(html).toContain('data-cl17="empty"');
    expect(html).not.toContain('data-cl17="filter-row"');
    expect(html).not.toContain('data-cl16="list"');
    expect(html).not.toContain('data-cl17="pinned"');
  });

  /**
   * ⚠️ The card grid is a whole page of derivation — standing, turn, door, the history strip,
   * every count — none of which runs on an empty account. This is the render that exercises it.
   */
  it("renders without throwing with an agent on file", () => {
    expect(() => renderPageSeeded(list(), "/agents")).not.toThrow();
  });

  it("…and the agent's card reaches the page", () => {
    const html = renderPageSeeded(list(), "/agents");
    expect(html).toContain("Ada Reader");
  });

  /** The toolbar's tripwire, moved here from the blank account with the empty-state build. */
  it("…and the toolbar returns as soon as there is one agent", () => {
    const html = renderPageSeeded(list(), "/agents");
    expect(html).toContain("Filter");
    expect(html).not.toContain("These are the people who will champion your words.");
  });
});

describe("/agents/discover renders", () => {
  /* Discover v1 (18 Oct): the route renders the coming-soon face while DISCOVER_LIVE is false — the navy panel */
  it("renders without throwing", () => {
    expect(() => renderPage(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    const html = renderPage(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover");
    expect(html).toContain("out looking");
  });

  it("renders without throwing with a manuscript to match against", () => {
    expect(() => renderPageSeeded(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover")).not.toThrow();
  });

  /* ⚠️ THE POPULATED STATE TOO (CLAUDE.md: smoke every branch a first-run panel hides). The live face only mounts
     through the dev review aid, which reads a window global — so the smoke gives this render one, and takes it away. */
  it("the live face renders over the review aid's fixture, and states its own title", () => {
    const g = globalThis as unknown as { window?: Record<string, unknown> };
    const had = "window" in g;
    const before = g.window;
    g.window = { ...(before ?? {}), __SA_DV_STATE: "live" };
    try {
      const html = renderPageSeeded(<DiscoverPage onNavigate={noNavigate} />, "/agents/discover");
      expect(html).toContain("to consider");
      expect(html).not.toContain("out looking");
    } finally {
      if (had) g.window = before; else delete g.window;
    }
  });
});
