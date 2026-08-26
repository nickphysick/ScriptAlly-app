/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE JOURNEY PANE — what the two cards say, and what they refuse to say ════════════════════
 *
 * The two sum invariants live in `src/lib/manuscriptJourney.test.ts`, where they are properties
 * over a spread of status mixtures. This file is about the RENDER: that the glyphs come from
 * `StatusDot` rather than from a copy of it, that closed is grey and off the rail, that the ladder
 * is never re-ordered, and that nothing here appraises.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { JourneyPane } from "./JourneyPane";
import { standingTrack, furthestTrack, furthestReached, journeyMeta, STANDING_STATIONS } from "../../lib/manuscriptJourney";
import { HoldingRow } from "../../lib/bookVersions";
import { Query, QueryStatus, Activity } from "../../types";

const q = (id: string, status: QueryStatus): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", status,
     dateSent: "2026-02-01", materialsWanted: [] } as unknown as Query);
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: `${queryId}-${status}`, userId: "u", queryId, manuscriptId: "m1", date,
     description: status, resultingStatus: status } as unknown as Activity);

const row = (over: Partial<HoldingRow> = {}): HoldingRow =>
  ({ queryId: "q1", agent: "T. Marsh", what: "FULL · sent 2 Jun 2026", holds: "Full manuscript",
     sentDay: "2 Jun 2026", askedFor: "Full requested", askedOn: "28 May 2026",
     versionName: null, ...over });

const QUERIES = [q("a", QueryStatus.QUERIED), q("b", QueryStatus.FULL_SENT),
                 q("c", QueryStatus.REJECTED), q("d", QueryStatus.REVISE_RESUBMIT)];
const ACTS = [rung("c", QueryStatus.PARTIAL_REQUESTED, "2026-03-01"),
              rung("c", QueryStatus.REJECTED, "2026-04-01")];

const pane = (queries = QUERIES, acts = ACTS, holders: HoldingRow[] = [row()]) => {
  const furthest = furthestTrack(queries, acts);
  return renderToStaticMarkup(
    <JourneyPane
      track={standingTrack(queries)}
      furthest={furthest}
      furthestLabel={furthestReached(furthest)}
      holders={holders}
      queriesSent={queries.length}
      journeyMeta={journeyMeta(queries.length, furthestReached(furthest))}
    />,
  );
};

// ─────────────────────────────────────────────────────────────────────────────
describe("the track", () => {
  /**
   * ⚠️ THE GLYPHS ARE `StatusDot`, IMPORTED. The ref carries inline SVG stand-ins so it renders as
   * a standalone document; a track that drew its own would go on being right about a dot that had
   * since changed. The tell is the component's own aria/role plumbing and its pulse class.
   */
  it("draws its stations through StatusDot rather than a reproduction", () => {
    const html = pane();
    // One decorative dot per station, and StatusDot's own markup — not a hand-rolled circle.
    /* StatusDot's own inline box — `position:relative` first, then the size it was given. The
       closed marker is a CSS class with no inline style, so it cannot be mistaken for one. */
    expect(html.match(/width:26px;height:26px/g) ?? []).toHaveLength(STANDING_STATIONS.length);
    // …and each is decorative, because the label directly beneath already names the status.
    expect(html.match(/<span aria-hidden="true" style="position:relative;width:26px/g) ?? [])
      .toHaveLength(STANDING_STATIONS.length);
    const src = readFileSync(join(__dirname, "JourneyPane.tsx"), "utf8");
    expect(src).toContain('import { StatusDot }');
    // No hand-drawn station glyph anywhere in the component.
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("<svg");
  });

  it("states every station's count, nought included", () => {
    const html = pane();
    // Queried 1 · Partial requested 0 · Partial sent 0 · Full requested 0 · Full sent 1 · R&R 1 · Offer 0
    expect(html.match(/class="msp-stationn">\d+</g)).toHaveLength(STANDING_STATIONS.length + 1); // +1 closed
    expect(html).toContain('class="msp-stationn">0<');
  });

  /** ⚠️ CLOSED IS OFF THE RAIL AND GREY. Not an eighth station, and never red. */
  it("keeps closed outside the rail, behind a hairline, in the muted ink", () => {
    const html = pane();
    const closed = /class="msp-closedblock">([\s\S]*?)<\/div>\s*<\/div>/.exec(html)?.[1] ?? html;
    expect(closed).toContain("Closed");
    // It sits after the stations grid, not inside it.
    expect(html.indexOf("msp-closedblock")).toBeGreaterThan(html.indexOf("msp-stations"));
    expect(html.indexOf("msp-closedblock")).toBeGreaterThan(html.lastIndexOf("msp-station\">"));

    const css = readFileSync(join(__dirname, "bookProfile.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = /(?:^|\n)\s*\.msp-closedblock\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toContain("border-left: 1px solid var(--hair)");
    expect(css).toContain(".msp-closedblock .msp-stationn { color: var(--shell-muted); }");
  });

  it("fills the rail to the furthest occupied station, and draws no fill when nothing is on it", () => {
    // Furthest occupied of [Queried, Full sent, R&R] is R&R — index 5 of 0..6.
    expect(pane()).toContain('style="width:83.33333333333334%"');
    // All closed: nothing on the rail at all, so no fill element rather than a zero-width one.
    const allClosed = pane([q("a", QueryStatus.REJECTED)], [], []);
    expect(allClosed).not.toContain("msp-railfill");
  });

  it("states the furthest rung reached, and says nothing where nothing has been sent", () => {
    expect(pane()).toContain("Furthest reached so far:");
    expect(pane([], [], [])).not.toContain("Furthest reached so far");
  });

  /**
   * ⚠️ THE UNRECOGNISED LINE APPEARS ONLY WHEN THERE IS ONE. A permanent "0 unrecognised" teaches
   * nothing; its appearance is what stops the total disagreeing with its own stations in silence.
   */
  it("says nothing about unrecognised statuses until there is one, then says it in agreement", () => {
    expect(pane()).not.toContain("does not recognise");
    const rogue = { ...q("x", QueryStatus.QUERIED), status: "Ghosted" } as unknown as Query;
    const html = pane([rogue], [], []);
    expect(html).toContain("does not recognise");
    expect(html).toContain("<b>1</b> query carries a status");
  });

  it("tells the reader the counting rule rather than leaving it to be inferred", () => {
    expect(pane()).toContain("A query appears once, at its current point.");
    expect(pane()).toContain("The furthest point each query ever reached, open or closed.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the two tables", () => {
  it("keeps the ladder's order however the counts fall", () => {
    const html = pane();
    const labels = [...html.matchAll(/<td(?: class="soft")?>([^<]*(?:requested|Offer|R&amp;R|response yet|no request))<\/td>/g)]
      .map((m) => m[1]);
    expect(labels).toEqual([
      "Queried, no response yet", "Agent responded, no request", "Partial requested",
      "Full requested", "R&amp;R", "Offer",
    ]);
  });

  it("names the ask that led to each send, and its day only where the log has one", () => {
    expect(pane()).toContain("Full requested 28 May 2026");
    /* ⚠️ THE ASK AND THE SEND ARE DIFFERENT EVENTS — an undated ask states the ask alone rather
       than borrowing the send's day. */
    const undated = pane(QUERIES, ACTS, [row({ askedOn: null })]);
    expect(undated).toContain(">Full requested</span>");
    expect(undated).not.toContain("Full requested 2 Jun");
  });

  it("dashes an undated send rather than fabricating one", () => {
    expect(pane(QUERIES, ACTS, [row({ sentDay: null })])).toContain('class="msp-num soft">—<');
  });

  it("says nothing is out rather than drawing an empty table", () => {
    const html = pane(QUERIES, ACTS, []);
    expect(html).toContain("Nothing is with an agent right now.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the app reports, never appraises", () => {
  it("uses no verdict word anywhere on the pane", () => {
    const html = pane();
    /* `only` and `just` turn a count into a comment; `best`/`strong` turn it into a ranking. */
    expect(html).not.toMatch(/\b(best|worst|strong|weak|poor|great|top performer|leading|success|failure|only|just)\b/i);
  });

  it("paints no red, and reaches for no red token", () => {
    const css = readFileSync(join(__dirname, "bookProfile.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css.toLowerCase()).not.toContain("red");
    /* Closed and the empty rungs are muted, which is a reading weight rather than a judgement. */
    expect(css).toContain(".msp-closedblock .msp-stationn { color: var(--shell-muted); }");
  });
});
