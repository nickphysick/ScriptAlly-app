/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke — `/materials/letters` (Query letters v1). The populated page, the empty page and the page whose active package
 * holds a different letter each render with their own chrome. Its own fixture (pageSmoke's seed has no letters). Kept to
 * claims about words and structure: a smoke that pins appearance becomes the next false red.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { ComponentType, QueryStatus, UserPlan } from "../../types";

const state: { data: Record<string, unknown> } = { data: {} };
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => new Proxy(state.data, { get: (t, k) => (typeof k === "symbol" ? undefined : k in t ? t[k as string] : async () => undefined) }),
  DbProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { QueryLettersPage, QUERY_LETTERS_LINE } from "./QueryLettersPage";
import { WORKSPACE_PATHS } from "../../marketing/routeTiers";
import { WORKSPACE_SHELL_PATHS } from "../../lib/shellForRoute";

export const MS = (extra: Record<string, unknown> = {}) => ({
  id: "m1", userId: "u1", title: "Harbour of Glass", genre: "Thriller", ageCategory: "Adult", wordCount: 80000, logline: "",
  status: "Querying", statusChangedDate: "2026-01-05", ...extra,
});
export const L = (id: string, name: string, created: string, extra: Record<string, unknown> = {}) => ({
  id, manuscriptId: "m1", userId: "u1", componentType: ComponentType.QUERY_LETTER, versionName: name, fileAttached: false,
  createdDate: created, contentType: "text", contentDraft: `Dear [Agent],\n\n${name} opens here.\n\nThank you.`, ...extra,
});
export const Q = (id: string, status: QueryStatus, extra: Record<string, unknown> = {}) => ({
  id, userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", status, dateSent: "2026-09-10T00:00:00.000Z",
  personalisationNotes: "", sendMethod: "Email", materialsWanted: [], ...extra,
});
export const base = (plan: UserPlan = UserPlan.PRO) => ({
  currentUser: { id: "u1", name: "Isla Morven", email: "x@example.com", plan, onboardingComplete: true },
  authReady: true, collectionsReady: true, communityAgents: [], journalEntries: [], notes: [], dismissedTasks: [], taskFlags: [],
  tasks: [], userTasks: [], packages: [], activities: [],
  agents: [{ id: "a1", userId: "u1", name: "Ada Reader", agency: "Reader & Co", genres: [] }],
});
const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/materials/letters"]}><QueryLettersPage /></MemoryRouter>);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

describe("/materials/letters renders", () => {
  it("populated: the header, the in-use card, the cards with in-use first, and the retired fold", () => {
    state.data = {
      ...base(), manuscripts: [MS({ inUseLetterId: "l2" })],
      versions: [
        L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"),
        L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z", { parentId: "l1", changes: ["Hook moved to the first line"] }),
        L("l3", "Open on the harbour", "2026-11-03T10:00:00.000Z", { parentId: "l2", changes: ["New opening line"] }),
        L("l0", "Old letter", "2026-01-01T10:00:00.000Z", { status: "Retired" }),
      ],
      queries: [Q("q1", QueryStatus.QUERIED, { sentVersions: ["l2"] }), Q("q2", QueryStatus.PARTIAL_REQUESTED, { sentVersions: ["l2"] })],
    };
    const h = render();
    const t = text(h);
    expect(t).toContain("3 query letters");
    expect(t).toContain("for Harbour of Glass");
    expect(t).toContain(QUERY_LETTERS_LINE);
    expect(t).toContain("+ New letter");
    expect(t).toContain("Which letter is landing?");
    expect(t).toContain("Going out with new queries");
    expect(t).toContain("1 /2 asked for more");
    expect(t).toContain("Your letters");
    expect(t).toContain("Click a letter to read, edit or see how it's doing");
    const cards = h.match(/data-ql="card" data-id="([^"]+)"/g) ?? [];
    expect(cards.map((c) => c.match(/data-id="([^"]+)"/)![1])).toEqual(["l2", "l3", "l1"]);
    expect(t).toContain("In use for new queries");
    expect(t).toContain("Draft");
    expect(t).toContain("Write a new letter");
    expect(t).toContain("Show retired · 1");
    expect(h).toContain('data-page-title=""');
  });
  it("the active package holds another letter: the card says package sends go with it, and changes nothing", () => {
    state.data = {
      ...base(), manuscripts: [MS({ inUseLetterId: "l1", activePackageId: "p1" })],
      versions: [L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"), L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z")],
      packages: [{ id: "p1", userId: "u1", manuscriptId: "m1", packageName: "Coastal", queryLetterVersionId: "l2", synopsisVersionId: "", samplePagesVersionId: "", createdDate: "2026-05-01" }],
      queries: [],
    };
    const t = text(render());
    expect(t).toContain("Package sends go with Coastal 's letter: Query letter v2");
    expect(t).not.toMatch(/Query letter v2 The first letter/);
    expect(t).toContain("Not sent yet");
  });
  it("the band: one sent letter shows its row, early days, and when the comparison begins; never hidden", () => {
    state.data = {
      ...base(), manuscripts: [MS()],
      versions: [L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"), L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z")],
      queries: [Q("q1", QueryStatus.QUERIED, { sentVersions: ["l1"] }), Q("q2", QueryStatus.FULL_REQUESTED, { sentVersions: ["l1"] })],
    };
    const h = render();
    const t = text(h);
    expect(h).toContain('id="ql-landing"');
    expect(t).toContain("Which letter is landing?");
    expect(t).toContain("Every query remembers the letter it went with. Here's how each one is doing with agents.");
    expect((h.match(/data-ql="row"/g) ?? []).length).toBe(1);
    expect(t).toContain("Early days: only 2 sent");
    expect(t).toContain("Once a second letter goes out, you'll see them side by side here.");
    expect(t).toContain("“Asked for more” counts partial and full requests. A letter needs about 15 queries before its rate means much.");
  });
  it("the band at fifteen sent: enough to go on, two rows, no single-row line", () => {
    const qs = Array.from({ length: 15 }, (_, i) => Q(`a${i}`, QueryStatus.QUERIED, { sentVersions: ["l1"] }));
    state.data = {
      ...base(), manuscripts: [MS()],
      versions: [L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"), L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z")],
      queries: [...qs, Q("b", QueryStatus.QUERIED, { sentVersions: ["l2"] })],
    };
    const h = render();
    const t = text(h);
    expect((h.match(/data-ql="row"/g) ?? []).length).toBe(2);
    expect(t).toContain("Enough to go on");
    expect(t).toContain("Early days: only 1 sent");
    expect(t).not.toContain("Once a second letter goes out");
  });
  it("empty: the same header with no letters, the first-letter card and the explainer; no grid, no band", () => {
    state.data = { ...base(), manuscripts: [MS()], versions: [], queries: [Q("q1", QueryStatus.QUERIED)] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="empty"');
    expect(t).toContain("No query letters yet");
    expect(t).toContain("+ New letter");
    expect(t).toContain("Write your first letter");
    expect(t).toContain("Pick it when you log a query.");
    expect(h).not.toContain('data-ql="grid"');
    expect(h).not.toContain('data-ql="in-use"');
    expect(h).not.toContain('id="ql-landing"');
  });
  it("the route is registered with the router and the shell", () => {
    expect([...WORKSPACE_PATHS]).toContain("/materials/letters");
    expect([...WORKSPACE_SHELL_PATHS]).toContain("/materials/letters");
  });
});
