/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The click-through adapter and the share card.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { Activity, ActivityType, Agent, Query, QueryStatus } from "../../types";
import { buildRows, MIN_SAMPLE } from "../../lib/analytics";
import { QUERIES_STATUS_PARAM } from "../../lib/queriesFilterParam";
import { AnalyticsTarget, FILTER_GAP, labelForTarget, pathForTarget } from "./openInQueryCentre";
import { ShareCard } from "./ShareCard";

const NOW = new Date(2026, 7, 19, 12, 0, 0).getTime();
const daysAgo = (n: number) => new Date(NOW - n * 86400000).toISOString();
let seq = 0;
const id = () => `k${++seq}`;
const AGENT = { id: "a1", userId: "u", name: "Alex Fenn", agency: "Fenn Literary", email: "", website: "" } as Agent;
const query = (over: Partial<Query> = {}): Query =>
  ({ id: id(), userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
     personalisationNotes: "", sendMethod: "Email", ...over }) as unknown as Query;
const rung = (queryId: string, status: QueryStatus, date: string): Activity =>
  ({ id: id(), userId: "u", queryId, manuscriptId: "m1", activityType: ActivityType.STATUS_CHANGED,
     description: "", date, details: "", resultingStatus: status }) as unknown as Activity;

describe("the click-through adapter", () => {
  it("opens one query exactly, by the id param the hub already reads", () => {
    expect(pathForTarget({ kind: "query", queryId: "q-42" })).toBe("/queries?q=q-42");
  });

  it("encodes an id rather than assuming its charset", () => {
    /* ⚠️ AN ID IS DATA. This app has already been bitten by an id built from display text — a
       status containing `&` — so nothing here assumes what a generated id may contain. */
    expect(pathForTarget({ kind: "query", queryId: "a b&c" })).toBe("/queries?q=a%20b%26c");
  });

  it("⚠️ opens the hub UNFILTERED where the param cannot express the set", () => {
    /* A near-miss filter is worse than none: it lands the reader on a list that does not match
       the number they just clicked, which is the quiet kind of wrong this page exists to avoid. */
    const path = pathForTarget({ kind: "unfiltered", intent: "donut:open" });
    expect(path).toBe("/queries");
    expect(path).not.toContain(QUERIES_STATUS_PARAM);
  });

  it("uses the param only for the one aggregate that IS exact", () => {
    /* the funnel's first rung is every query, which the hub's `all` expresses precisely */
    expect(pathForTarget({ kind: "all" })).toBe("/queries");
  });

  it("⚠️ records the intended filter for every gap rather than leaving it in someone's head", () => {
    for (const key of ["funnel:requested", "funnel:full", "funnel:offer", "donut:open", "donut:inplay",
                       "donut:offer", "donut:pass", "donut:elapsed", "histogram:band"]) {
      expect(FILTER_GAP[key], `${key} has no recorded intent`).toBeTruthy();
    }
  });

  it("names the destination, never the gesture", () => {
    expect(labelForTarget({ kind: "query", queryId: "q1" }, "Alex Fenn")).toBe("Open Alex Fenn in the Query Centre");
    for (const t of [{ kind: "query", queryId: "q1" }, { kind: "all" }] as AnalyticsTarget[]) {
      const label = labelForTarget(t, "Alex Fenn");
      expect(label).not.toMatch(/\b(click|here|view|go)\b/i);
    }
  });

  /**
   * ⚠️ THE BOUNDARY, ASSERTED. Another session owns the Query Centre; this page reads the shell's
   * own pure param module and edits nothing there. A component importing a Query Centre file
   * directly is the thing that would go unnoticed until a merge.
   */
  it("⚠️ no analytics file imports a Query Centre component", () => {
    const dir = resolve(__dirname);
    const files = ["JourneyFunnel.tsx", "StatusDonut.tsx", "SendingChart.tsx", "ReplyHistogram.tsx",
                   "AgingChart.tsx", "Horizon.tsx", "FullsPanel.tsx", "LatestResponses.tsx",
                   "ShareCard.tsx", "openInQueryCentre.ts", "useOpenTarget.tsx"];
    for (const f of files) {
      const src = readFileSync(resolve(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      expect(src, `${f} imports the Query Centre`).not.toMatch(/from\s+["'][^"']*\/Queries["']/);
      expect(src, `${f} imports a Query Centre part`).not.toMatch(/from\s+["'][^"']*queries\/[A-Z]/);
    }
    /* and the adapter is the ONLY file that builds a hub path */
    for (const f of files.filter((x) => x !== "openInQueryCentre.ts")) {
      const src = readFileSync(resolve(dir, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      expect(src, `${f} builds its own /queries path instead of going through the adapter`)
        .not.toMatch(/["'`]\/queries/);
    }
  });
});

describe("the share card", () => {
  const rows = () => {
    const qs = Array.from({ length: MIN_SAMPLE }, (_, i) => query({ dateSent: daysAgo(30 + i) }));
    const offer = query({ status: QueryStatus.OFFER, dateSent: daysAgo(200) });
    return buildRows([...qs, offer], [rung(offer.id, QueryStatus.OFFER, daysAgo(10))], [AGENT], NOW);
  };
  const render = () =>
    renderToStaticMarkup(
      <MemoryRouter>
        <ShareCard rows={rows()} manuscriptTitle="Murphy's Day Out" nowMs={NOW} onClose={() => {}} />
      </MemoryRouter>,
    );

  it("carries the title, the four stages, the watermark and a date", () => {
    const html = render();
    expect(html).toContain("Murphy&#x27;s Day Out — the journey so far");
    for (const s of ["Queried", "Material requested", "Full manuscript", "Offer"]) expect(html).toContain(s);
    expect(html).toContain("Tracked with ScriptAlly");
    expect(html).toMatch(/\d+ \w+ 2026/);
  });

  it("⚠️ states the same headline as the panel it opens from, from the same function", () => {
    /* Two derivations of one figure on one page is how a card and its panel come to disagree. */
    const html = render();
    expect(html).toContain("drew a request");
    expect(html).toContain(`${MIN_SAMPLE + 1} queries`);
  });

  it("draws its funnel through StatusDot, not a recreation", () => {
    const html = render();
    expect(html.match(/position:relative;width:30px;height:30px/g) ?? []).toHaveLength(4);
  });

  it("is a real dialog, labelled by its own heading", () => {
    const html = render();
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-labelledby="an-share-title"');
    expect(html).toContain('id="an-share-title"');
  });

  it("⚠️ says the PNG export is not built rather than producing nothing", () => {
    /* A button that looks live and does nothing is the worse of the two.
       TODO(analytics-share-png) is recorded in the component. */
    expect(render()).toMatch(/Download PNG[\s\S]{0,40}/);
    expect(render()).toContain("disabled");
  });

  it("appraises nothing", () => {
    const html = render();
    for (const verdict of [/\bonly \d/i, /\btoo few\b/i, /\b(great|excellent|impressive|well done|keep going)\b/i]) {
      expect(html, `the share card appraises the writer's figures: ${verdict}`).not.toMatch(verdict);
    }
  });
});
