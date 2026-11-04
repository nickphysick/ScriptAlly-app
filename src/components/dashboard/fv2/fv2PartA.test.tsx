/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-A — Dashboard first visit v2, Part A: every first-visit state in feed v1's three columns. The geometry (the sheet
 * on the card's bottom edge, the set-up card first in the middle column) is measured on the running page (FV2 A1).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58, THEN_FINISH_GS } from "../v58/Dash58";
import { ManuscriptStatus, QueryStatus, type Agent, type Manuscript, type Query, type User } from "../../../types";
import { BOOK_LABEL, bookLabel, dashState } from "../../../lib/dashFirstVisit";

const ms = (status?: ManuscriptStatus) => ({ id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy", status } as unknown as Manuscript);
const q = (id: string, status: QueryStatus): Query => ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query);
const A1 = { id: "a1", name: "Tessa Rowe", agency: "Rowe Literary" } as unknown as Agent;
const render = (queries: Query[], m: Manuscript = ms(), agents: Agent[] = [], todoPrefs?: unknown) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={queries} agents={agents} manuscripts={[m]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={{ id: "u1", name: "Audit S1", todoPrefs } as unknown as User} activeManuscript={m} onNavigate={() => {}} onPrefs={() => {}} now={new Date(2026, 9, 29, 12)} />
  </MemoryRouter>,
);

describe("FV2-A · the manuscript card's label", () => {
  it("is each of the five strings, from the campaign once a query exists and from the readiness before it", () => {
    expect(bookLabel([], ManuscriptStatus.READY_TO_QUERY)).toBe("Getting ready");
    expect(bookLabel([], undefined)).toBe("Getting ready");
    expect(bookLabel([], ManuscriptStatus.DRAFTING)).toBe("Still writing");
    expect(bookLabel([], ManuscriptStatus.REVISING)).toBe("In revision");
    expect(bookLabel([q("a", QueryStatus.QUERIED)], ManuscriptStatus.DRAFTING)).toBe("Querying");
    expect(bookLabel([q("a", QueryStatus.REJECTED)], ManuscriptStatus.READY_TO_QUERY)).toBe("Between rounds");
    expect(Object.values(BOOK_LABEL)).toEqual(["Getting ready", "Still writing", "In revision", "Querying", "Between rounds"]);
  });
  it("is drawn in sentence case, never the old uppercase eyebrow", () => {
    const html = render([], ms(ManuscriptStatus.REVISING));
    /* RE-POINTED (Dashboard v2): the band carries NO status label; the label's words are still bookLabel's (above) */
    expect(html).not.toContain(">In revision<");
    expect(html).not.toContain("— GETTING READY —");
  });
});

describe("FV2-A · which state", () => {
  it("pre and resume before the first query, querying while one is live, between once all are closed", () => {
    expect(dashState([], false)).toBe("pre");
    expect(dashState([], true)).toBe("resume");
    expect(dashState([q("a", QueryStatus.QUERIED)], true)).toBe("querying");
    expect(dashState([q("a", QueryStatus.NO_RESPONSE)], false)).toBe("between");
  });
});

describe("FV2-A · Getting started is the sheet, the goal sheet takes the slot back", () => {
  it("first query: the queries card, Getting started in the goal slot with Hide, and no goal sheet", () => {
    const html = render([q("a", QueryStatus.QUERIED)]);
    expect(html).toContain('data-fv2="querying"');
    /* RE-POINTED (Dashboard v2): Active queries is its own card; Getting started heads the left column; no goal sheet */
    expect(html).toContain('data-d2-card="active"');
    expect(html).toContain('data-fv2="gs"');
    expect(html).toContain('data-fv2="gs-hide"');
    expect(html).not.toContain('data-df1="goal"');
    expect(html).toContain('data-d2="log"');
  });
  /* RE-POINTED (Dashboard v2): the goal sheet is retired, so a hidden Getting started leaves the slot empty */
  it("hidden: Getting started goes and nothing takes its place", () => {
    const html = render([q("a", QueryStatus.QUERIED)], ms(), [], { dash: { gsHidden: { "ms-1": true } } });
    expect(html).not.toContain('data-fv2="gs"');
    expect(html).not.toContain('data-df1="goal"');
    expect(html).not.toContain('data-d2="gs-slot"');
  });
  it("Agents on file only once there is one agent", () => {
    /* RE-POINTED (Dashboard v2): the hoop's own probe */
    expect(render([q("a", QueryStatus.QUERIED)])).not.toContain('data-d60="agents-hoop"');
    expect(render([q("a", QueryStatus.QUERIED)], ms(), [A1])).toContain('data-d60="agents-hoop"');
  });
  it("the task card's last Then: names Getting started while the sheet is open", () => {
    expect(THEN_FINISH_GS).toBe("finish getting started");
  });
});
