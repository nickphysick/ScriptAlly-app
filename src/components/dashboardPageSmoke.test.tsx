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

  /* ⚠️ RETARGETED (one-screen dashboard): the guided "Welcome to QueryHawk" panel is replaced
     by §9's DAY ONE — Getting started kicker, the chart as an invitation, the ghost CTAs. */
  it("…and produces the day-one chrome, so it is not an empty shell that merely did not crash", () => {
    const html = renderPage(page());
    /* ⚠️ RETARGETED TWICE. First (v16 §1) off the "Getting started" kicker onto the Day-one PILL;
       now (dashboard redesign, Phase 3) off the pill, because the greeting's pill row is retired
       with the tenure and achievement pills it sat beside. Day one announces itself in the chart's
       invitation and the tasks card's own empty state, both of which are asserted below and both of
       which are the page's actual first-run content rather than a badge over it.

       ⚠️ AND A SMOKE PINS THE MINIMUM, NOT THE APPEARANCE — this repo's own rule for page smokes,
       and this line is the third time that has had to be re-learned on one page.
       ⚠️ AND RETARGETED A THIRD TIME (empty-states pack, Phase 1). The chart's invitation and the
       tasks card's own day-one lines are SUPERSEDED by the faded-example pack: the chart draws a
       populated example with "Log your first query" over it, and the tasks card draws the five
       getting-started deeds. The old two lines are not dead code — `OneScreenChart`'s `dayOne` and
       `OneScreenTasks`'s `dayOne` branches both survive for every caller that does not pass
       `empty` — they are simply not what THIS page renders any more.

       ⚠️ WHY THE PACK OUTRANKS DAY ONE, since that is the decision this line records: the ref's
       own first getting-started deed is "Add your first manuscript". That row is addressed to an
       account with no manuscript — which is day one exactly — so gating the pack behind day-one's
       survival would leave row one permanently ticked and decorative. */
    expect(html).toContain("Log your first query");
    expect(html).toContain("Add your first manuscript");
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
    expect(html).toContain("Agents on file");   // the stats, on the ground since Phase 3
    /* ⚠️ "Querying goals" IS NOT A LANDMARK ON THIS PAGE ANY MORE (ref v22) — the card leaves the
       dashboard with the two-column layout. `Activity` is the right column's own name and is the
       landmark that replaces it, so this census still spans all three regions of the page. */
    expect(html).toContain("Activity");         // the right column, top to bottom
    /* ⚠️ DAY ONE HAS STOOD DOWN, asserted on the CHART's own invitation. The first try used the
       rail's "The story starts with your first query." — which is the empty ACTIVITY FEED's line and
       shows on the seeded fixture too, so it discriminated nothing. A day-one check has to name copy
       that only day one produces. */
    expect(html).not.toContain("Every query you send and every reply that comes back will be charted here.");
  });
});
