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
import { QueryStatus, type Manuscript, type Query, type User } from "../../../types";

const MS = { id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy" } as unknown as Manuscript;
const q = (id: string, status: QueryStatus): Query => ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query);
const page = () => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={[q("a", QueryStatus.QUERIED), q("b", QueryStatus.REJECTED)]} agents={[]} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
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
    expect(at('data-probe="chart-card"')).toBeGreaterThan(at('data-df1="queries-card"'));
    expect(at('data-d60="closed-hoop"')).toBeGreaterThan(at('data-df1="queries-card"'));
    expect(at('data-df1="agents"')).toBeGreaterThan(at('data-df1="queries"'));
    expect(at('data-df1="founding"')).toBeGreaterThan(at('data-df1="agents"'));
    expect(at('data-df1="founding"')).toBeLessThan(at('data-df1="feed"'));
  });
  it("words the founding card's footer for this page", () => {
    expect(FOUNDING_RANKS_F1).toBe("Top contributors win a weekly prize.");
  });
});
