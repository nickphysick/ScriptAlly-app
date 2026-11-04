/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DF1-C — Dashboard feed v1, Part C: Active and Closed in one card, and the left column's order. The heights (224,
 * the switch moving nothing) and the founding card's clipping are measured on the running page (C1, C2).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58, FOUNDING_RANKS_F1 } from "../v58/Dash58";
import { F1Queries } from "./F1Queries";
import { QueryStatus, type Agent, type Manuscript, type Query, type User } from "../../../types";

const MS = { id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy" } as unknown as Manuscript;
const q = (id: string, status: QueryStatus): Query => ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query);
/* ⚠️ ONE AGENT ON FILE (first visit v2, Part A): Agents on file appears once there is one, and is never drawn empty */
const AGENTS = [{ id: "a1", name: "Tessa Rowe", agency: "Rowe Literary" } as unknown as Agent];
const page = (agents: Agent[] = AGENTS) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={[q("a", QueryStatus.QUERIED), q("b", QueryStatus.REJECTED)]} agents={agents} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={{ id: "u1", name: "Audit S1" } as unknown as User} activeManuscript={MS} onNavigate={() => {}} now={new Date(2026, 9, 29, 12)} />
  </MemoryRouter>,
);

describe("DF1-C · Active and Closed, one card", () => {
  it("opens on Active, with Closed mounted and hidden", () => {
    const html = renderToStaticMarkup(<F1Queries activeTitle="18 active queries" closedTitle="3 closed" active={<i>chart</i>} closed={<i>ring</i>} />);
    expect(html).toContain(">18 active queries<");
    expect(html).toMatch(/data-df1-q="active" aria-pressed="true"/);
    expect(html).toMatch(/data-df1-q="closed" aria-pressed="false"/);
    expect(html).toMatch(/data-df1="pane-closed" aria-hidden="true" inert=""/);
    expect(html).toContain("<i>ring</i>");
  });
  it("holds the app's own chart and Closed hoop, and the left column ends on the founding card", () => {
    const html = page();
    const at = (s: string) => html.indexOf(s);
/* RE-POINTED (Dashboard v2, 3 Nov): the left column is Next up, Agents on file, Closed; the middle is Active queries,
       then the founding card; the feed is the right column. Order in the markup is order on the page. */
    for (const s of ['data-d2="left"', 'data-d2-card="next"', 'data-d60="agents-hoop"', 'data-d60="closed-hoop"', 'data-d2="mid"', 'data-d2-card="active"', 'data-d2-card="founding"', 'data-d2="right"', 'data-d2="feed"']) expect(at(s), s).toBeGreaterThan(-1);
    expect(at('data-d2-card="next"')).toBeLessThan(at('data-d60="agents-hoop"'));
    expect(at('data-d60="agents-hoop"')).toBeLessThan(at('data-d60="closed-hoop"'));
    expect(at('data-d60="closed-hoop"')).toBeLessThan(at('data-d2="mid"'));
    expect(at('data-d2-card="active"')).toBeLessThan(at('data-d2-card="founding"'));
    expect(at('data-d2-card="founding"')).toBeLessThan(at('data-d2="right"'));
    expect(html).not.toContain('data-probe="chart-card"');
  });
  it("draws no Agents on file card before the first agent (first visit v2, Part A)", () => {
    /* RE-POINTED (Dashboard v2): the hoop's own probe — the old slot attribute is gone, so asserting its absence was vacuous */
    expect(page([])).not.toContain('data-d60="agents-hoop"');
    expect(page()).toContain('data-d60="agents-hoop"');
  });
  it("words the founding card's footer for this page", () => {
    expect(FOUNDING_RANKS_F1).toBe("Top contributors win a weekly prize.");
  });
});
