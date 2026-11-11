/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone app v4. See `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing.
 * The node environment has no matchMedia, so the routes take their desktop path; the phone pieces are smoked directly.
 * The rendered checks are tests/e2e/phoneAppV4.measure.ts (PA4-1…11).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V4PushedHeader, V4TabBar } from "./V4Chrome";
import { Cta, Hero } from "./V4Parts";
import { TodayV4 } from "./TodayV4";
import { V3Provider } from "../v3/V3Provider";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;

describe("Phone app v4 renders", () => {
  it("the bar, a pushed header and a header with its cast member", () => {
    const b = renderPage(<V4TabBar pathname="/dashboard" onGo={() => {}} onPlus={() => {}} scroller={() => null} />);
    for (const w of ["Today", "Queries", "Agents", "You"]) expect(b).toContain(w);
    const p = renderPage(<V4PushedHeader title="Responses" onBack={() => {}} />);
    expect(p).toContain('data-pa4="back"');
    const h = renderPage(<Hero pa4="hero" kick="Queries" head="3 are with agents." cast={{ src: "/x.png", width: 100 }} />);
    expect(h).toContain("3 are with agents.");
    expect(renderPage(<Cta>Log query</Cta>)).toContain('data-cta="1"');
  });
  it("Today: day one when empty, the journey track and Lately when populated", () => {
    const empty = renderPage(P(<TodayV4 />), "/dashboard");
    expect(empty).toContain("Log your first query");
    expect(empty).toContain('data-state="dayone"');
    const full = renderPageSeeded(P(<TodayV4 />), "/dashboard");
    expect(full).toContain("Where your queries are");
    expect(full).toContain("Lately");
    expect(full).toContain("asked for more");
  });
});
