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

import { V3Provider } from "./V3Provider";
import { AgentFormV3 } from "./AgentsV3";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;

describe("Phone app v3 renders", () => {
  it("the add form's first step", () => {
    const f = renderPage(P(<AgentFormV3 />), "/agents");
    for (const w of ["Who are they?", "I don’t know the agency", "Agent fit"]) expect(f).toContain(w);
  });
});
