/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FV2-C — Dashboard first visit v2, Part C: the still writing and revising path. "It's ready →" through the app
 * (READY_TO_QUERY, the ready path, done steps still ticked) is FV2 C1, on the running page.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { ComponentType, ManuscriptStatus, type Agent, type Manuscript, type ManuscriptVersion, type User } from "../../../types";
import { gsCopy, gsOrder, gsRowDone } from "../../../lib/dashFirstVisit";

const ms = (status: ManuscriptStatus, comps: unknown[] = []) => ({ id: "ms-1", title: "The Lantern Keepers", status, comps } as unknown as Manuscript);
const page = (m: Manuscript, opts: { agents?: Agent[]; versions?: ManuscriptVersion[] } = {}) => renderToStaticMarkup(
  <MemoryRouter initialEntries={["/dashboard"]}>
    <Dash58 loading={false} queries={[]} agents={opts.agents ?? []} manuscripts={[m]} versions={opts.versions ?? []} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
      currentUser={{ id: "u1", name: "Audit S1", queryingStage: "starting" } as unknown as User} activeManuscript={m} onNavigate={() => {}} now={new Date(2026, 9, 29, 12)} />
  </MemoryRouter>,
);
const rowsOf = (html: string) => [...html.matchAll(/data-fv1="gs-row" data-key="([a-z]+)" data-state="([a-z]+)"/g)].map((m) => `${m[1]}:${m[2]}`);

describe("FV2-C · the still writing path's Getting started", () => {
  it("orders manuscript, comps, a shortlisted agent, the letter, then ready — for writing and revising alike", () => {
    expect(gsOrder("writing")).toEqual(["manuscript", "comps", "agent", "letter", "ready"]);
    expect(gsOrder("revising")).toEqual(["manuscript", "comps", "agent", "letter", "ready"]);
  });
  it("words each row as the reference does", () => {
    expect(gsCopy("comps", "writing")).toEqual({ deed: "Add three comparable titles", note: "Books like yours, out in the last few years. Agents ask for them, and they shape your shortlist.", link: "Add comparable titles", go: "comps" });
    expect(gsCopy("agent", "writing")).toEqual({ deed: "Shortlist your first agent", note: "Browse Discover for agents who take on books like yours.", link: "Browse Discover", go: "discover" });
    expect(gsCopy("letter", "writing")).toEqual({ deed: "Start your query letter", note: "A first draft is plenty. You can keep versions as it changes.", link: "Start a letter", go: "letter" });
    expect(gsCopy("ready", "revising")).toEqual({ deed: "Tell us when it's ready to query", note: "Then the dashboard switches to sending and tracking queries.", link: "It's ready", go: "ready" });
    expect(gsCopy("agent", "ready").deed).toBe("Add an agent to your contact list");
  });
  it("ticks from records: the letter from a query-letter version; ready never on this path", () => {
    expect(gsRowDone("letter", { shared: [], letter: true })).toBe(true);
    expect(gsRowDone("ready", { shared: [], letter: true })).toBe(false);
    expect(gsRowDone("agent", { shared: [{ key: "agent", done: true }], letter: false })).toBe(true);
  });
  it("renders the rows on a Drafting book, the letter ticked once a version exists", () => {
    const v = { id: "v1", manuscriptId: "ms-1", componentType: ComponentType.QUERY_LETTER } as unknown as ManuscriptVersion;
    const a = { id: "a1", name: "Tessa Rowe" } as unknown as Agent;
    const html = page(ms(ManuscriptStatus.DRAFTING), { agents: [a], versions: [v] });
    expect(rowsOf(html)).toEqual(["manuscript:done", "comps:current", "agent:done", "letter:done", "ready:todo"]);
    expect(html).toContain("Add comparable titles →");
  });
  it("a ready book keeps the ready path's rows", () => {
    expect(rowsOf(page(ms(ManuscriptStatus.READY_TO_QUERY))).map((r) => r.split(":")[0])).toEqual(["manuscript", "agent", "query", "materials", "comps"]);
  });
});
