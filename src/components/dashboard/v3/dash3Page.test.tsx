/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB3 (page) — Dashboard v3, Phase 5: where Getting started sits, by stage, on the real page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { QueryStatus, type Agent, type Manuscript, type Query, type User } from "../../../types";

const MS = { id: "ms-1", title: "Murphy's Day Out" } as unknown as Manuscript;
const A = [{ id: "a1", name: "Daniel O'Rourke", agency: "O'Rourke Literary" } as unknown as Agent];
const Q = [{ id: "q1", status: QueryStatus.QUERIED, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query];
const page = (queries: Query[]) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={queries} agents={A} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={{ id: "u1", name: "Bethany Carter", notifyPrefs: { nudges: true } } as unknown as User} activeManuscript={MS} onNavigate={() => {}} now={new Date(2026, 10, 18, 12)} />
  </MemoryRouter>,
);
const at = (h: string, s: string) => h.indexOf(s);

describe("DB3-5 · Getting started by stage", () => {
  it("no queries: the full card leads the left column, above Agents on file; no Next up", () => {
    const h = page([]);
    expect(h).toContain('data-gs="lead"');
    expect(at(h, 'data-fv2="gs"')).toBeGreaterThan(-1);
    expect(at(h, 'data-fv2="gs"')).toBeLessThan(at(h, 'data-d60="agents-hoop"'));
    expect(h).not.toContain('data-d2-card="next"');
    /* the first-visit pieces the tour stops on are still on the page */
    for (const s of ['data-fv2="start-card"', 'data-fv2="empty-feed"', 'data-d2-card="expected"']) expect(h, s).toContain(s);
  });
  it("queries logged, two or more steps left: the full card directly under Next up", () => {
    const h = page(Q);
    expect(h).toContain('data-gs="under-next"');
    expect(at(h, 'data-d2-card="next"')).toBeLessThan(at(h, 'data-fv2="gs"'));
    expect(at(h, 'data-fv2="gs"')).toBeLessThan(at(h, 'data-d60="agents-hoop"'));
    expect(h).not.toContain('data-d3="gs-row"');
  });
});
