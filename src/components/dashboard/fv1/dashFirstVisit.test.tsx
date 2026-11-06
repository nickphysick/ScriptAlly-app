/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DFV-A — Dashboard first visit v1, Part A: the pre-query dashboard (rendered) and the rules under it (pure).
 *
 * The rendered half is the page's own markup through `renderToStaticMarkup` (this repo has no DOM in unit
 * tests); the geometry — three window sizes, no scroll, the founding card in full — is measured on the
 * running page by tests/e2e/dashFirstVisit.check.mjs.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { QueryStatus, type Manuscript, type Query, type User } from "../../../types";
import { campaignEyebrow, campaignStage, dashPrefsOf, gsOrder, legacyStartOf, nextTip, stepTip } from "../../../lib/dashFirstVisit";
import { DEFAULT_SHAPE } from "../../../lib/dashShape";
import { DASH_TIPS } from "../../../lib/dashTips";

const MS = { id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy" } as unknown as Manuscript;
const q = (id: string, status: QueryStatus): Query => ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query);
const user = (todoPrefs?: unknown) => ({ id: "u1", name: "Audit S1", todoPrefs } as unknown as User);

const render = (queries: Query[], u: User = user()) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={queries} agents={[]} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={u} activeManuscript={MS} onNavigate={() => {}} now={new Date(2026, 9, 29, 12)} />
  </MemoryRouter>,
);

describe("DFV-A · the eyebrow is the campaign's", () => {
  it("GETTING READY before the first query (S1), QUERYING while one is active (S3), BETWEEN ROUNDS once all have closed (S5)", () => {
    expect(campaignStage([])).toBe("ready");
    expect(campaignEyebrow([])).toBe("— GETTING READY —");
    expect(campaignEyebrow([q("a", QueryStatus.QUERIED)])).toBe("— QUERYING —");
    expect(campaignEyebrow([q("a", QueryStatus.NO_RESPONSE), q("b", QueryStatus.REJECTED), q("c", QueryStatus.WITHDRAWN)])).toBe("— BETWEEN ROUNDS —");
    expect(campaignEyebrow([q("a", QueryStatus.NO_RESPONSE), q("b", QueryStatus.PARTIAL_REQUESTED)])).toBe("— QUERYING —");
  });
});

describe("DFV-A · the pre-query page", () => {
  const html = render([]);
  /* ⚠️ RETARGETED (Dashboard first visit v2, Part A): the pre-query page is feed v1's three columns. Left: the manuscript
     card with no buttons, Getting started under it, the founding card. Middle: the set-up card over the empty feed.
     Right: Top tip, the Scout and the footer — no task card and no queries card. */
  it("renders the set-up card in the middle column, Getting started under the book, and no task card", () => {
    const at = (s: string) => html.indexOf(s);
/* RE-POINTED (Dashboard v2, 3 Nov): the set-up card heads the middle column, Getting started heads the left, the empty feed
       is the right column. Top tip is retired; still no task card and no Active queries card before the first query. */
    for (const s of ['data-d2="left"', 'data-d2="mid"', 'data-d2="right"', 'data-fv1="setup"', 'data-fv2="gs"', 'data-fv2="empty-feed"']) expect(at(s), s).toBeGreaterThan(-1);
    expect(at('data-fv2="gs"')).toBeGreaterThan(at('data-d2="left"'));
    expect(at('data-fv2="gs"')).toBeLessThan(at('data-d2="mid"'));
    expect(at('data-fv1="setup"')).toBeGreaterThan(at('data-d2="mid"'));
    expect(at('data-fv1="setup"')).toBeLessThan(at('data-d2="right"'));
    expect(at('data-fv2="empty-feed"')).toBeGreaterThan(at('data-d2="right"'));
    expect(html).not.toContain("Top tip");
    expect(html).not.toContain('data-d71="task"');
    expect(html).not.toContain('data-d2-card="next"');
    expect(html).not.toContain('data-d2-card="active"');
  });
  /* RE-POINTED (Dashboard v2): the founding card is the middle column's second card, under the set-up card */
  /* RE-POINTED (Dashboard v2.2): the founding writer is the full-width band above the grid, before the set-up card */
  it("draws the founding band above the grid, before the set-up card", () => {
    expect(html.indexOf('data-d2-card="founding"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-d2-card="founding"')).toBeLessThan(html.indexOf('data-d2="grid"'));
    expect(html.indexOf('data-d2="grid"')).toBeLessThan(html.indexOf('data-fv1="setup"'));
    expect(html).not.toContain('class="d59-rule"');
  });
  /* RE-POINTED (Dashboard v2): the band carries no buttons before the first query, and no status label of any kind */
  it("carries no buttons on the band before the first query, and no status label", () => {
    expect(html).toContain('data-d2="band"');
    expect(html).not.toContain('data-d2="buttons"');
    expect(html).not.toContain(">Getting ready<");
  });
  it("retires the doors, the lift tiles and Where do I start?", () => {
    for (const gone of ["d60-door", "Ready for lift off?", "Where do I start?", "No queries out yet."]) expect(html).not.toContain(gone);
  });
  /* ⚠️ RETARGETED (Dashboard feed v1, Part A): once a query exists the page is the three columns and the navy header,
     with its buttons, is gone — the first-visit header is the pre-query page's alone. */
  it("the header's buttons and eyebrow belong to the pre-query page only", () => {
    const after = render([q("a", QueryStatus.QUERIED)]);
    expect(after).toContain('data-d2="grid"'); // RE-POINTED (Dashboard v2)
    expect(after).toContain('data-d2="buttons"');
    expect(after).not.toContain('data-d58="header"');
    expect(after).not.toContain("— QUERYING —");
  });
});

/* ⚠️ RETARGETED (Dashboard first visit v2, Part B): the answer is the SIGN-UP answer now. First visit v1's stored
   dashboard answer is read only for an account that never answered the stage question; with nothing said at all the
   card opens on the question (FV2-B in fv2/fv2PartB.test.tsx holds the rest). */
describe("DFV-A · the stored v1 answer still chooses the path where sign-up said nothing", () => {
  it("opens on the question when nothing is stored", () => {
    expect(legacyStartOf(dashPrefsOf(user()), "ms-1")).toBe(null);
    expect(render([])).toContain('data-asking="1"');
  });
  it("reads the stored v1 answer per manuscript", () => {
    const u = user({ dash: { start: { "ms-1": "notyet", "ms-2": "yes" } } });
    expect(legacyStartOf(dashPrefsOf(u), "ms-1")).toBe("notyet");
    const html = render([], u);
    expect(html).toContain('data-fv1="path-ready"');
    expect(html).toContain("Start your contact list");
  });
  it("orders Getting started by the answer", () => {
    expect(gsOrder("querying")).toEqual(["manuscript", "query", "agent", "materials", "comps"]);
    expect(gsOrder("ready")).toEqual(["manuscript", "agent", "query", "materials", "comps"]);
  });
});

describe("DFV-A · the tip rotates per visit and loops", () => {
  it("opens on the next tip each visit, and ‹ › loop round", () => {
    const n = DASH_TIPS.length;
    expect(n).toBe(4);
    expect(nextTip(null, n)).toBe(0);
    expect(nextTip(0, n)).toBe(1);
    expect(nextTip(3, n)).toBe(0);
    expect(stepTip(0, -1, n)).toBe(3);
    expect(stepTip(3, 1, n)).toBe(0);
  });
  it("the stored position is read back", () => {
    expect(dashPrefsOf(user({ dash: { tip: 2 } })).tip).toBe(2);
    expect(dashPrefsOf(user({ dash: { tip: "x" } })).tip).toBeNull();
  });
});

describe("DFV-A · a first visit's loading page is the first-visit skeleton", () => {
  it("DEFAULT_SHAPE.pre is true, so nothing remembered draws the pre-query skeleton", () => {
    expect(DEFAULT_SHAPE.pre).toBe(true);
    expect(DEFAULT_SHAPE.agents).toBe(false);
  });
});
