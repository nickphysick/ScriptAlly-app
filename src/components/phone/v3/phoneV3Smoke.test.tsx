/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone app v3. See `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing.
 * The node environment has no matchMedia, so the routes take their desktop path; the phone pieces are smoked directly.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { YouV3 } from "./YouV3";
import { QueriesV3 } from "./QueriesV3";
import { V3Provider } from "./V3Provider";
import { AgentsV3, AgentFormV3 } from "./AgentsV3";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;

describe("Phone app v3 renders", () => {
  it("You: the switch and its first rows", () => {
    for (const html of [renderPage(<YouV3 />, "/you"), renderPageSeeded(<YouV3 />, "/you")]) {
      expect(html).toContain("Progress");
      expect(html).toContain("Materials");
      expect(html).toContain("Responses");
    }
  });
  it("Queries: the five chips, empty and populated", () => {
    for (const html of [renderPage(P(<QueriesV3 />), "/queries"), renderPageSeeded(P(<QueriesV3 />), "/queries")]) {
      for (const w of ["All", "With you", "With the agent", "Gone quiet", "Closed"]) expect(html).toContain(w);
    }
    expect(renderPage(P(<QueriesV3 />), "/queries")).toContain("Nothing here");
  });
  it("Agents: the switch and chips; the add form's first step", () => {
    for (const html of [renderPage(P(<AgentsV3 />), "/agents"), renderPageSeeded(P(<AgentsV3 />), "/agents")]) {
      for (const w of ["Your list", "Discover", "To query", "Queried"]) expect(html).toContain(w);
    }
    const f = renderPage(P(<AgentFormV3 />), "/agents");
    for (const w of ["Who are they?", "I don’t know the agency", "Agent fit"]) expect(f).toContain(w);
  });
});
