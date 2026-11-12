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
import { QueriesV4 } from "./QueriesV4";
import { AgentsV4, AgentsListPageV4 } from "./AgentsV4";
import { YouV4 } from "./YouV4";
import { QuickLogV4 } from "./QuickLogV4";
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
  it("Today: day one when empty; the v4.1 header and Lately when populated", () => {
    const empty = renderPage(P(<TodayV4 />), "/dashboard");
    expect(empty).toContain("Log your first query");
    expect(empty).toContain('data-state="dayone"');
    const full = renderPageSeeded(P(<TodayV4 />), "/dashboard");
    expect(full).toContain("Where your queries are");
    expect(full).toContain("Lately");
    expect(full).toContain("Active queries");
    expect(full).toContain('data-pa41="header"');
  });
  it("Queries: before the first query, then the app's own court names and the switch", () => {
    expect(renderPage(P(<QueriesV4 />), "/queries")).toContain("Nothing sent yet.");
    const full = renderPageSeeded(P(<QueriesV4 />), "/queries");
    for (const w of ["All", "With you", "With the agent", "Gone quiet", "Closed", "Birds-eye"]) expect(full).toContain(w);
    expect(full).not.toContain("Need you");
  });
  it("Agents: the header sentence, the list rows and the pushed list's chips", () => {
    expect(renderPage(P(<AgentsV4 />), "/agents")).toContain("No agents on your list yet.");
    const full = renderPageSeeded(P(<AgentsV4 />), "/agents");
    expect(full).toContain("Everyone on your list");
    const list = renderPageSeeded(P(<AgentsListPageV4 />), "/agents");
    for (const w of ["To query", "Queried"]) expect(list).toContain(w);
  });
  it("You: early days in words, and the rows for every page v3 reached", () => {
    const empty = renderPage(<YouV4 />, "/you");
    expect(empty).toContain("Nothing sent yet.");
    const full = renderPageSeeded(<YouV4 />, "/you");
    for (const w of ["See the full picture", "What’s landing", "Wall of no", "Packages", "Responses", "Query letters", "Synopses and comps"]) expect(full).toContain(w);
  });
  it("the quick log opens on who, with the two quiet links", () => {
    for (const html of [renderPage(P(<QuickLogV4 />), "/dashboard"), renderPageSeeded(P(<QuickLogV4 />), "/dashboard")]) {
      for (const w of ["Who did you query?", "Other", "An agent replied", "Pin a note"]) expect(html).toContain(w);
    }
  });
});
