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
import { DiscoverNewAgents } from "./DiscoverNewAgents";

const list = () => <Agents searchQuery="" onNavigate={noNavigate} active />;

describe("/agents renders", () => {
  it("renders without throwing on an empty account", () => {
    expect(() => renderPage(list(), "/agents")).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(list(), "/agents");
    expect(html).toContain("Your agent list");
    expect(html).toContain("Filters");         // the one toolbar
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
});

describe("/agents/discover renders", () => {
  it("renders without throwing", () => {
    expect(() => renderPage(<DiscoverNewAgents onNavigate={noNavigate} />, "/agents/discover")).not.toThrow();
  });

  it("…and produces its own chrome", () => {
    const html = renderPage(<DiscoverNewAgents onNavigate={noNavigate} />, "/agents/discover");
    expect(html).toContain("Discover new agents");
  });

  it("renders without throwing with a manuscript to match against", () => {
    expect(() => renderPageSeeded(<DiscoverNewAgents onNavigate={noNavigate} />, "/agents/discover")).not.toThrow();
  });
});
