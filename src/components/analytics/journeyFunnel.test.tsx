/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The journey funnel, rendered.
 *
 * ⚠️ THE ROWS ARE BUILT BY `buildRows`, NEVER TYPED OUT AS LITERALS. `AnalyticsRow` is what the
 * page's own producer emits from queries and activities; a hand-written row is an input the app
 * cannot construct, and a test given one is exercising a function nobody runs. Every fixture here
 * starts as a `Query` and a `resultingStatus`-bearing `Activity`, which is what the app writes.
 *
 * ⚠️ AND THE SLICE ANCHORS ARE ASSERTED BEFORE ANYTHING IS SLICED. A missing marker yields `""`,
 * and every `.not.toContain` on an empty string passes — the house failure mode for source-string
 * specs in this repo.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../../types";
import { buildRows, MIN_SAMPLE, READING_THE_NUMBERS, FUNNEL_REFERENCE_NOTE } from "../../lib/analytics";
import { JourneyFunnel, funnelNote, funnelHeadline } from "./JourneyFunnel";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();

let seq = 0;
const id = () => `f${++seq}`;
const AGENT = { id: "a1", userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "" } as Agent;

const query = (over: Partial<Query>): Query =>
  ({ id: id(), userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;

const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: id(), userId: "u", queryId, manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED,
     description: "", date, details: "", resultingStatus: status }) as unknown as Activity;

/** `n` plain open queries plus whatever extra journeys the caller describes. */
function rowsFor(openCount: number, journeys: QueryStatus[][] = []) {
  const qs: Query[] = [];
  const acts: Activity[] = [];
  for (let i = 0; i < openCount; i++) {
    const q = query({ dateSent: daysAgo(30 + i) });
    qs.push(q);
    acts.push(rung(q.id, QueryStatus.QUERIED, daysAgo(30 + i)));
  }
  journeys.forEach((path, j) => {
    const q = query({ status: path[path.length - 1], dateSent: daysAgo(200 + j) });
    qs.push(q);
    path.forEach((s, k) => acts.push(rung(q.id, s, daysAgo(200 + j - k * 10))));
  });
  return buildRows(qs, acts, [AGENT], NOW);
}

/**
 * ⚠️ RENDERED INSIDE A ROUTER, because every mark on this page is now a door and the components
 * call `useNavigate`. Wrapping is what makes these specs exercise the SAME component the app
 * mounts — a props-only twin without the hook would be a different component that happens to look
 * the same.
 */
const inRouter = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/queries/analytics"]}>{node}</MemoryRouter>);
const render = (rows: ReturnType<typeof rowsFor>) => inRouter(<JourneyFunnel rows={rows} />);

describe("the journey funnel", () => {
  it("draws its four stages through the real StatusDot, never a local recreation", () => {
    const html = render(rowsFor(3));
    /* ⚠️ ASSERTED ON WHAT StatusDot ACTUALLY EMITS, which is not what it looks like it emits. It
       carries no `sd-dot` class and — because these dots are `decorative`, the stage naming itself
       right underneath — no title or aria-label either.

       ⚠️ ITS SIGNATURE CHANGED WITH THE RING SET (v21 §9), AND THE LAW DID NOT. This used to look
       for the per-theme token pair and the pulse element, because those were the two things a
       hand-drawn circle would not have. The set is one ink stroke now: no tokens, no pulse. The
       new signature is the ring's own geometry — a 24 viewBox stroked 2 with an r=10 circle, in
       the one ink — which is equally hard to produce by accident. The claim is unchanged: these
       stage marks come from the locked component, not from a local recreation. */
    expect(html, "the stage dots are not drawn on StatusDot's 24 viewBox — something local is drawing them")
      .toContain('viewBox="0 0 24 24"');
    expect(html, "the ring is missing — this is not the locked component").toContain('r="10"');
    expect(html, "the set is one ink stroke at 2 on the viewBox").toContain('stroke-width="2"');
    expect(html).toContain("color:#1c130f");
    /* and the retired treatment is gone rather than merely unasserted */
    expect(html).not.toContain("sa-statusdot__pulse");
    expect(html).not.toContain("var(--sd-hue");

    /* four stage dots at the requested 56px, which also proves `overrideSize` reached the
       component rather than the app-wide default being drawn */
    expect(html.match(/width:56px;height:56px/g) ?? [], "the four stage dots are not all at 56px")
      .toHaveLength(4);
    /* and three more at 13px in the reference strip */
    expect(html.match(/width:13px;height:13px/g) ?? []).toHaveLength(READING_THE_NUMBERS.length);
  });

  it("states the four stage names and their counts", () => {
    /* one open, one that reached a full and was declined, one live offer */
    const rows = rowsFor(1, [
      [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REJECTED],
      [QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED, QueryStatus.OFFER],
    ]);
    const html = render(rows);
    for (const name of ["Queried", "Material requested", "Full manuscript", "Offer"]) {
      expect(html).toContain(name);
    }
    /* 3 queried · 2 requested · 2 full (the offer implies the book was read) · 1 offer */
    expect(html).toContain(">3</div>");
    expect(html).toContain(">1</div>");
  });

  it("⚠️ guards every transition below the sample threshold, not just the request rate", () => {
    const html = render(rowsFor(4, [[QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]]));
    /* five queries: every denominator is under the guard, so no transition may state a percentage */
    const marks = html.match(/an-fpct">([^<]*)</g) ?? [];
    expect(marks, "the three transition labels are not being rendered").toHaveLength(3);
    for (const m of marks) expect(m).toContain(" of ");
    expect(html).not.toMatch(/an-fpct">\d+%/);
  });

  it("…and states a percentage once the denominator can carry one", () => {
    const html = render(rowsFor(MIN_SAMPLE, [[QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]]));
    expect(html).toMatch(/an-fpct">\d+%/);
  });

  it("renders the reference strip verbatim, and it says nothing about this account", () => {
    /* ⚠️ THE SAME COPY ON EVERY ACCOUNT IS THE POINT. Asserting it against a rich set AND a thin
       one is what proves it is reference material rather than commentary on the figures. */
    const rich = render(rowsFor(MIN_SAMPLE, [[QueryStatus.QUERIED, QueryStatus.OFFER]]));
    const thin = render(rowsFor(1));
    for (const html of [rich, thin]) {
      for (const r of READING_THE_NUMBERS) {
        expect(html).toContain(r.label);
        expect(html).toContain(r.text.replace(/&/g, "&amp;"));
      }
      expect(html).toContain("For reference");
      expect(html).toContain(FUNNEL_REFERENCE_NOTE.slice(0, 60));
    }
  });

  it("reserves the journey illustration at its final size", () => {
    expect(render(rowsFor(2))).toContain("an-illo--hero");
  });

  it("passes no judgement on the figures, at either end of the range", () => {
    for (const rows of [rowsFor(1), rowsFor(MIN_SAMPLE * 2, [[QueryStatus.QUERIED, QueryStatus.OFFER]])]) {
      const html = render(rows);
      for (const verdict of [/\bonly \d/i, /\btoo few\b/i, /\bshould (be|have)\b/i,
                             /\b(slow|slowly|poor|poorly|impressive|excellent|great job|well done)\b/i]) {
        expect(html, `the funnel appraises the writer's figures: ${verdict}`).not.toMatch(verdict);
      }
    }
  });

  it("the band note and the share headline read the same set", () => {
    /* ⚠️ TWO CALLERS, ONE DERIVATION. The share card (Phase 8) states the request figure too; if
       it recomputed its own, the card and the panel above it could disagree about the same page. */
    const rows = rowsFor(MIN_SAMPLE, [[QueryStatus.QUERIED, QueryStatus.PARTIAL_REQUESTED]]);
    expect(funnelNote(rows)).toContain(`of ${rows.length}`);
    expect(funnelHeadline(rows)).toContain(`${rows.length} queries`);
  });
});
