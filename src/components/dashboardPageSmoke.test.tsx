/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smoke — the Dashboard. See `src/test/pageSmoke.tsx` for why these exist and why they
 * assert almost nothing.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("./toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

import { Dashboard } from "./Dashboard";

const page = () => <Dashboard onNavigate={noNavigate} searchQuery="" setSearchQuery={() => {}} />;

describe("/dashboard renders", () => {
  it("renders without throwing on an empty account", () => {
    expect(() => renderPage(page())).not.toThrow();
  });

  /* ⚠️ RETARGETED (one-screen dashboard): the guided "Welcome to ScriptAlly" panel is replaced
     by §9's DAY ONE — Getting started kicker, the chart as an invitation, the ghost CTAs. */
  it("…and produces the day-one chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(page());
    expect(html).toContain("Getting started");
    expect(html).toContain("Every query you send and every reply that comes back will be charted here.");
    expect(html).toContain("Send your first query");
  });

  /**
   * ⚠️ The populated path is a DIFFERENT branch — the first-run panel gives way to the greeting,
   * the stat row and the attention chip, all of which derive from the record set. Smoking only the
   * empty account would leave every derivation on this page unexecuted.
   */
  it("renders without throwing once there is a manuscript, an agent and a query", () => {
    expect(() => renderPageSeeded(page())).not.toThrow();
  });

  it("…and that render is the real dashboard — the chart card, not the day-one panel", () => {
    const html = renderPageSeeded(page());
    expect(html).toContain("Active queries");   // the chart card, the page's spine
    expect(html).toContain("of querying");      // the kicker
    expect(html).toContain("Querying goals");   // the rail
    expect(html).not.toContain("Getting started"); // day one has stood down
  });
});
