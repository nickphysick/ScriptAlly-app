/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smoke — the not-found screen (non-workspace v1, Phase 1; getting-in-v1.html, screen 6). It is what an
 * unknown in-app address shows now, in place of a silent redirect to the Dashboard.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderPage } from "../test/pageSmoke";

vi.mock("../lib/db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("../lib/firebase", async () => (await import("../test/pageSmoke")).firebaseMock());

import { NotFoundCard, NOT_FOUND } from "./NotFoundCard";

describe("the not-found screen", () => {
  it("renders, with its heading, its one filled button and its three ways on", () => {
    const html = renderPage(<NotFoundCard onNavigate={() => {}} />, "/nonsense").replace(/&#x27;/g, "'");
    expect(html).toContain(NOT_FOUND.heading);
    expect(html).toContain("Nothing of yours is missing.");
    expect((html.match(/class="ph-primary"/g) ?? []).length).toBe(1);
    for (const l of [NOT_FOUND.queries, NOT_FOUND.agents, NOT_FOUND.broken]) expect(html).toContain(`>${l}<`);
  });
  it("App shows it for an unknown address instead of redirecting to the Dashboard", () => {
    const app = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");
    const guard = app.slice(app.indexOf("if (!WORKSPACE_PATHS.has(routeBase(path)))"));
    expect(guard.slice(0, 600)).toContain("<NotFoundCard onNavigate={handleNavigate} />");
    expect(guard.slice(0, 120)).not.toContain('Navigate to="/dashboard"');
  });
});
