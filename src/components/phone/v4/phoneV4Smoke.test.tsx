/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone app v4. See `src/test/pageSmoke.tsx` for why these exist and why they assert almost nothing.
 * The node environment has no matchMedia, so the routes take their desktop path; the phone pieces are smoked directly.
 * The rendered checks are tests/e2e/phoneAppV5.measure.ts (PA5-1…15; v4's and v4.1's specs are retired, tests/e2e/RETIRED-phone-app-v4.md).
 * Phone app v5: the dock (V5Dock) and Today (TodayV5) replace V4TabBar and TodayV4; their smokes moved to
 * components/phone/v5/phoneV5Smoke.test.tsx.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded } from "../../../test/pageSmoke";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V4PushedHeader } from "./V4Chrome";
import { Cta, Hero } from "./V4Parts";
import { QueriesV4 } from "./QueriesV4";
import { AgentsV4, AgentsListPageV4 } from "./AgentsV4";
import { QuickLogV4 } from "./QuickLogV4";
import { V3Provider } from "../v3/V3Provider";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;

describe("Phone app v4 renders", () => {
  it("a pushed header and a header with its cast member", () => {
    const p = renderPage(<V4PushedHeader title="Responses" onBack={() => {}} />);
    expect(p).toContain('data-pa4="back"');
    const h = renderPage(<Hero pa4="hero" kick="Queries" head="3 are with agents." cast={{ src: "/x.png", width: 100 }} />);
    expect(h).toContain("3 are with agents.");
    expect(renderPage(<Cta>Log query</Cta>)).toContain('data-cta="1"');
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
    /* Phone app v5: the pushed list's groups are Today's Agents summary's — To query · Querying · Closed — and it can
       open on one of them (Today's Agents tab is AgentsTabV5 now; AgentsV4's `bare` body is retired) */
    const list = renderPageSeeded(P(<AgentsListPageV4 />), "/agents");
    for (const w of ["To query", "Querying", "Closed"]) expect(list).toContain(w);
    expect(list).toContain('data-group="all"');
    const one = renderPageSeeded(P(<AgentsListPageV4 group="querying" />), "/agents");
    expect(one).toContain('data-group="querying"');
    expect(one).toMatch(/data-pa4="agrp" data-k="querying"/);
    expect(one).not.toMatch(/data-pa4="agrp" data-k="toquery"/);
  });
  /* (v4's You page is retired — Phone app v5 Phase G re-laid it as Profile, ProfileV5; its smoke is in
     phoneV5Smoke.test.tsx. Packages, letters and comps are the Materials tab now.) */
  it("the quick log opens on who, with the two quiet links", () => {
    for (const html of [renderPage(P(<QuickLogV4 />), "/dashboard"), renderPageSeeded(P(<QuickLogV4 />), "/dashboard")]) {
      for (const w of ["Who did you query?", "Other", "An agent replied", "Pin a note"]) expect(html).toContain(w);
    }
  });
  /* (v4.1's full Birds-eye view is retired — Phone app v5 Phase E rebuilt it as BirdsViewV5; its smoke is in
     phoneV5Smoke.test.tsx.) */
});
