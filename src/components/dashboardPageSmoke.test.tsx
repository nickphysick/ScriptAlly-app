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

  it("…and produces the first-run chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(page());
    expect(html).toContain("Welcome to ScriptAlly");
  });

  /**
   * ⚠️ The populated path is a DIFFERENT branch — the first-run panel gives way to the greeting,
   * the stat row and the attention chip, all of which derive from the record set. Smoking only the
   * empty account would leave every derivation on this page unexecuted.
   */
  it("renders without throwing once there is a manuscript, an agent and a query", () => {
    expect(() => renderPageSeeded(page())).not.toThrow();
  });

  it("…and that render is the real dashboard — the stat row, not the first-run panel", () => {
    const html = renderPageSeeded(page());
    expect(html).toContain("Queries sent");     // the stat row, the page's spine
    expect(html).toContain("Active queries");
    expect(html).not.toContain("Welcome to ScriptAlly"); // the first-run panel has stood down
  });
});
