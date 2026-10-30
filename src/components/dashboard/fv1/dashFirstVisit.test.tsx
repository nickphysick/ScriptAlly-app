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
import { campaignEyebrow, campaignStage, dashPrefsOf, gsOrder, nextTip, startPathOf, stepTip } from "../../../lib/dashFirstVisit";
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
  it("renders the set-up card, the Mentor's tip and Getting started as the task card", () => {
    expect(html).toContain('data-fv1="setup"');
    expect(html).toContain("Have you sent any queries for <em>The Lantern Keepers</em> yet?");
    expect(html).toContain('data-fv1="tip"');
    expect(html).toContain('data-group="start"');
    expect(html).toContain('data-fv1="gs-count"');
  });
  it("draws the founding card in the querying column's own slot, so it is never squeezed to its band", () => {
    expect(html).toContain('data-d71="fw-slot"');
    expect(html).not.toContain('class="d59-rule"');
  });
  it("carries no header buttons, and the eyebrow says GETTING READY", () => {
    expect(html).toContain('data-set="none"');
    expect(html).not.toContain('data-d58="btn-log"');
    expect(html).not.toContain('data-d58="btn-record"');
    expect(html).toContain("— GETTING READY —");
  });
  it("retires the doors, the lift tiles and Where do I start?", () => {
    for (const gone of ["d60-door", "Ready for lift off?", "Where do I start?", "No queries out yet."]) expect(html).not.toContain(gone);
  });
  /* ⚠️ RETARGETED (Dashboard feed v1, Part A): once a query exists the page is the three columns and the navy header,
     with its buttons, is gone — the first-visit header is the pre-query page's alone. */
  it("the header's buttons and eyebrow belong to the pre-query page only", () => {
    const after = render([q("a", QueryStatus.QUERIED)]);
    expect(after).toContain('data-df1="cols"');
    expect(after).not.toContain('data-d58="header"');
    expect(after).not.toContain("— QUERYING —");
  });
});

describe("DFV-A · the answer is remembered and chooses the path", () => {
  it("defaults to Yes when nothing is stored", () => {
    expect(startPathOf(dashPrefsOf(user()), "ms-1")).toBe("yes");
    expect(render([])).toContain('data-fv1="path-yes"');
  });
  it("reads the stored answer per manuscript", () => {
    const u = user({ dash: { start: { "ms-1": "notyet", "ms-2": "yes" } } });
    expect(startPathOf(dashPrefsOf(u), "ms-1")).toBe("notyet");
    const html = render([], u);
    expect(html).toContain('data-fv1="path-notyet"');
    expect(html).toContain("Start your contact list");
  });
  it("orders Getting started by the answer", () => {
    expect(gsOrder("yes")).toEqual(["manuscript", "query", "agent", "materials", "comps"]);
    expect(gsOrder("notyet")).toEqual(["manuscript", "agent", "query", "materials", "comps"]);
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
