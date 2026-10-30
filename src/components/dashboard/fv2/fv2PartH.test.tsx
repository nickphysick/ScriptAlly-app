/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-H — Dashboard first visit v2, Part H: the finish line. Ticking the fifth step on the page, Close this list and a
 * reload are FV2 H1, on the running page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { ComponentType, QueryStatus, type Agent, type Manuscript, type ManuscriptVersion, type Query, type User } from "../../../types";
import { FINISH, gsCloseWrite, gsSlot } from "../../../lib/dashFirstVisit";

describe("FV2-H · what the slot holds", () => {
  it("the list while a row is undone, the finish line once all are done, the goal sheet once closed or hidden", () => {
    expect(gsSlot({ pre: false, hidden: false, closed: false, allDone: false })).toBe("list");
    expect(gsSlot({ pre: false, hidden: false, closed: false, allDone: true })).toBe("finish");
    expect(gsSlot({ pre: false, hidden: false, closed: true, allDone: true })).toBe("goal");
    expect(gsSlot({ pre: false, hidden: true, closed: false, allDone: false })).toBe("goal");
    expect(gsSlot({ pre: true, hidden: true, closed: true, allDone: false })).toBe("list");
  });
  it("closing is one leaf, per manuscript", () => {
    expect(gsCloseWrite("ms-1")).toEqual({ "todoPrefs.dash.gsClosed.ms-1": true });
  });
  it("in the reference's words, with the still-writing path's own steps", () => {
    expect(FINISH.title).toBe("That's you set up");
    expect(FINISH.text("querying")).toBe("Manuscript, agents, queries, materials and comparable titles: all in. From here on, the dashboard shows what needs doing next.");
    expect(FINISH.text("writing").startsWith("Manuscript, comparable titles, a shortlist and your letter: all in.")).toBe(true);
    expect([FINISH.close, FINISH.note]).toEqual(["Close this list", "Your weekly goal and streak go here instead."]);
  });
});

describe("FV2-H · on the page", () => {
  const comps = [{ title: "A" }, { title: "B" }, { title: "C" }];
  const ms = { id: "ms-1", title: "The Lantern Keepers", comps } as unknown as Manuscript;
  const agent = { id: "a1", name: "Tessa Rowe" } as unknown as Agent;
  const q = { id: "q1", status: QueryStatus.QUERIED, agentId: "a1", manuscriptId: "ms-1", dateSent: "2026-10-20T11:00:00.000Z" } as unknown as Query;
  const v = (id: string, t: ComponentType) => ({ id, manuscriptId: "ms-1", componentType: t } as unknown as ManuscriptVersion);
  const versions = [v("v1", ComponentType.QUERY_LETTER), v("v2", ComponentType.SYNOPSIS)];
  const page = (todoPrefs?: unknown, vs = versions) => renderToStaticMarkup(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Dash58 loading={false} queries={[q]} agents={[agent]} manuscripts={[ms]} versions={vs} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
        currentUser={{ id: "u1", name: "Audit S1", todoPrefs, notifyPrefs: { nudges: true } } as unknown as User} activeManuscript={ms} onNavigate={() => {}} onPrefs={() => {}} now={new Date(2026, 9, 29, 12)} />
    </MemoryRouter>,
  );
  it("all five done: the finish line in the sheet, and no Then: naming Getting started", () => {
    const html = page();
    expect(html).toContain('data-fv2="finish"');
    expect(html).toContain(">That&#x27;s you set up<");
    expect(html).not.toContain("Then: finish getting started");
  });
  it("one undone: the list", () => {
    const html = page(undefined, [versions[0]]);
    expect(html).not.toContain('data-fv2="finish"');
    expect(html).toContain('data-fv2="gs-count"');
  });
  it("closed: the goal sheet has the slot", () => {
    const html = page({ dash: { gsClosed: { "ms-1": true } } });
    expect(html).not.toContain('data-fv2="gs"');
    expect(html).toContain('data-df1="goal"');
  });
});
