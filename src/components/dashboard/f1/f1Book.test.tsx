/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DF1-B — Dashboard feed v1, Part B: the manuscript card and the goal sheet, rendered through `renderToStaticMarkup`
 * (no DOM in unit tests). The geometry (the sheet's top on the card's bottom) is measured on the running page by
 * tests/e2e/dashFeedV1.measure.ts (B1).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());

import { Dash58 } from "../v58/Dash58";
import { F1Book, SET_GOAL, vsLastWeek } from "./F1Book";
import { QueryStatus, type Agent, type Manuscript, type Query, type User } from "../../../types";
import { campaignLabel } from "../../../lib/dashFirstVisit";

const NOW = new Date(2026, 9, 29, 12); // Thursday 29 October 2026
const MS = { id: "ms-1", title: "The Lantern Keepers", genre: "Fantasy" } as unknown as Manuscript;
const q = (id: string, status: QueryStatus, dateSent: string): Query => ({ id, status, agentId: "a1", manuscriptId: "ms-1", dateSent } as unknown as Query);
const agent = (id: string, dateAdded: string) => ({ id, name: `Agent ${id}`, agency: "Agency", dateAdded } as unknown as Agent);
const user = (queryingGoals?: unknown) => ({ id: "u1", name: "Audit S1", queryingGoals } as unknown as User);

const book = (props: Partial<React.ComponentProps<typeof F1Book>> = {}) => renderToStaticMarkup(
  <F1Book loading={false} title="The Lantern Keepers" author="Audit S1" label="Querying" onLog={() => {}} onRecord={() => {}} onAddAgent={() => {}}
    queries={[]} agents={[]} activities={[]} currentUser={user()} now={NOW} onGoal={() => {}} {...props} />,
);

describe("DF1-B · the manuscript card", () => {
  it("names the book, its campaign word in sentence case, the author and the three buttons", () => {
    const html = book();
    expect(html).toContain("The Lantern Keepers");
    expect(html).toContain(">Querying<");
    expect(html).toContain("by Audit S1");
    for (const w of ["Log a query", "Record a response", "Add an agent"]) expect(html).toContain(`aria-label="${w}"`);
    expect(html).not.toContain("QUERYING");
  });
  it("the campaign word is the eyebrow's, sentence case", () => {
    expect(campaignLabel([])).toBe("Getting ready");
    expect(campaignLabel([q("a", QueryStatus.QUERIED, "2026-10-20")])).toBe("Querying");
    expect(campaignLabel([q("a", QueryStatus.REJECTED, "2026-10-20")])).toBe("Between rounds");
  });
  it("is the querying page's first card", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Dash58 loading={false} queries={[q("a", QueryStatus.QUERIED, "2026-10-20")]} agents={[]} manuscripts={[MS]} tasks={[]} userTasks={[]} activities={[]} taskFlags={[]}
          currentUser={user()} activeManuscript={MS} onNavigate={() => {}} now={NOW} />
      </MemoryRouter>,
    );
    const at = html.indexOf('data-df1="book"');
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(html.indexOf('data-df1="queries"'));
  });
});

describe("DF1-B · the goal sheet", () => {
  it("with no goal: Set a weekly goal in the ring's place, and the tiles and the streak still render", () => {
    const html = book();
    expect(html).toContain(SET_GOAL);
    expect(html).not.toContain('data-df1="ring"');
    expect(html).toContain('data-df1="tile-sent"');
    expect(html).toContain('data-df1="tile-added"');
    expect(html).toContain('data-df1="streak"');
    expect((html.match(/data-df1="week"/g) ?? []).length).toBe(8);
  });
  it("with a weekly goal: the ring is the goals card's count of its target", () => {
    const goals = [{ target: 5, cadence: "week", effectiveFrom: "2026-01-05" }];
    const qs = [q("a", QueryStatus.QUERIED, "2026-10-26T10:00:00.000Z"), q("b", QueryStatus.QUERIED, "2026-10-27T10:00:00.000Z"), q("c", QueryStatus.QUERIED, "2026-10-20T10:00:00.000Z")];
    const html = book({ currentUser: user(goals), queries: qs });
    expect(html).toContain('data-count="2" data-target="5"');
    expect(html).not.toContain(SET_GOAL);
    /* this week 2 (Mon 26, Tue 27), last week 1 (Tue 20) */
    expect(html).toMatch(/data-df1="tile-sent"><b>2<\/b><span>queries sent<\/span><em>1 more than last week<\/em>/);
  });
  it("agents added this week against last week, from the Contact list's desk", () => {
    const html = book({ agents: [agent("a", "2026-10-27T09:00:00.000Z"), agent("b", "2026-10-21T09:00:00.000Z"), agent("c", "2026-10-22T09:00:00.000Z")] });
    expect(html).toMatch(/data-df1="tile-added"><b>1<\/b><span>agent added<\/span><em>1 fewer than last week<\/em>/);
  });
  it("words the comparison in lower case after the figure", () => {
    expect(vsLastWeek(3, 2)).toBe("1 more than last week");
    expect(vsLastWeek(2, 2)).toBe("same as last week");
    expect(vsLastWeek(0, 2)).toBe("2 fewer than last week");
  });
});
