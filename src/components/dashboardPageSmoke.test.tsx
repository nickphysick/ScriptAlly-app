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
    /* ⚠️ RETARGETED A FOURTH TIME (Dashboard v59). The right column is one focus card and the
       founding writer panel; the rest of the getting-started plan lives on the To-do page behind
       "All {n} →". So the first deed is the focus card, and the list's second line ("Log your first
       query") is no longer on this page. */
    /* ⚠️ RETARGETED A FIFTH TIME (Dashboard v60). Before the first query the right column is "Ready
       for lift off?" (it replaces the focus card, the getting-started plan included), and the left
       column is the two doors. */
    expect(html).toContain("Ready for lift off?");
    expect(html).toContain("No queries out yet.");
    expect(html).toContain("No agents yet."); // v60.1 copy (was "Your list starts here.")
    expect(html).toContain("Where do I start?"); // v60.1: the one header button before the first query
    /* RETARGETED (Dashboard v93): the founding card is "Your contributions"; its band names it while its stats load */
    /* RETARGETED (Dashboard v105): the founding card is a press ID; its strip says FOUNDING WRITER while its stats load */
    expect(html).toContain("FOUNDING WRITER");
  });

  /**
   * ⚠️ The populated path is a DIFFERENT branch — the first-run panel gives way to the greeting,
   * the header's counts line and the chart, all of which derive from the record set. Smoking only the
   * empty account would leave every derivation on this page unexecuted.
   */
  it("renders without throwing once there is a manuscript, an agent and a query", () => {
    expect(() => renderPageSeeded(page())).not.toThrow();
  });

  it("…and that render is the real dashboard — the chart card, not the day-one panel", () => {
    const html = renderPageSeeded(page());
    expect(html).toContain("Active queries");   // the chart card, the page's spine
    /* ⚠️ RETARGETED (dashboard header, stage 1): the stat cards are deleted, so "Agents on file" is
       no landmark any more. The header's counts line replaced them, and it only renders its words
       with a figure in front once the record set has been read — which is the populated branch. */
    /* ⚠️ RETARGETED AGAIN (Dashboard v60): "Agents on file" IS a landmark of the querying page now —
       the slate hoop card beside Closed, under the full-width chart. */
    expect(html).toContain("Agents on file");
    expect(html).toContain('data-d60="closed-hoop"');
    /* ⚠️ RETARGETED (Dashboard v58): the header no longer states a figure — it is the book. The
       populated landmarks are the title-page eyebrow and the list column's own title. */
    expect(html).toContain("— QUERYING —"); // v60.1: the eyebrow is the sidebar's status (fixture: Querying), no longer a constant
    /* ⚠️ RETARGETED (Dashboard v71): "What's on the list today?" is retired with the list's title row.
       The right column's landmark is the task card's region, labelled "Your tasks". */
    expect(html).not.toContain("What&#x27;s on the list today?");
    expect(html).toContain('aria-label="Your tasks"');
    /* ⚠️ "Querying goals" IS NOT A LANDMARK ON THIS PAGE ANY MORE (ref v22) — the card leaves the
       dashboard with the two-column layout. `Activity` is the right column's own name and is the
       landmark that replaces it, so this census still spans all three regions of the page. */
    /* ⚠️ RETARGETED (Dashboard v59): the feed's tab is portalled into the shell's page SHEET once the
       page has measured it, so a static render cannot see it (`DB59 T1` holds it on the rendered
       page). The right column's third landmark is the founding writer panel. */
    /* RETARGETED (Dashboard v77): the rebuilt card's band */
    expect(html).toContain("FOUNDING WRITER");
    /* ⚠️ DAY ONE HAS STOOD DOWN, asserted on the CHART's own invitation. The first try used the
       rail's "The story starts with your first query." — which is the empty ACTIVITY FEED's line and
       shows on the seeded fixture too, so it discriminated nothing. A day-one check has to name copy
       that only day one produces. */
    expect(html).not.toContain("Every query you send and every reply that comes back will be charted here.");
  });
});
