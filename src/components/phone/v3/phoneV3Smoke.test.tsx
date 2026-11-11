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
import { TodayV3 } from "./TodayV3";
import { V3Header, V3TabBar } from "./V3Chrome";

describe("Phone app v3 renders", () => {
  it("You: the switch and its first rows", () => {
    for (const html of [renderPage(<YouV3 />, "/you"), renderPageSeeded(<YouV3 />, "/you")]) {
      expect(html).toContain("Progress");
      expect(html).toContain("Materials");
      expect(html).toContain("Responses");
    }
  });
  it("Today: empty (all caught up) and populated", () => {
    const empty = renderPage(<TodayV3 />, "/dashboard");
    expect(empty).toContain("You’re all caught up.");
    expect(empty).toContain("With the agent");
    const full = renderPageSeeded(<TodayV3 />, "/dashboard");
    expect(full).toContain("Lately");
    expect(full).toContain("Corkboard");
  });
  it("the header and the bar", () => {
    const h = renderPage(<V3Header root title="Today" routeKey="/dashboard" scroller={() => null} onSearch={() => {}} onBack={() => {}} />);
    expect(h).toContain('data-pa3="header"');
    expect(h).not.toContain('data-pa3="back"');
    const b = renderPage(<V3TabBar pathname="/dashboard" onGo={() => {}} onPlus={() => {}} plusOpen={false} badge={3} />);
    for (const w of ["Today", "Queries", "Agents", "You"]) expect(b).toContain(w);
    expect(b).toContain('data-pa3="badge"');
  });
});
