/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke — `/materials/letters` (Query letters v2, the letter desk). The populated desk, a sent and a draft letter, the
 * page whose active package holds a different letter, the early-days note, day one and loading each render with their
 * own chrome. Its own fixture (pageSmoke's seed has no letters). Kept to
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

import { QueryLettersPage, NO_LETTERS_TITLE } from "./QueryLettersPage";
import { TIPS } from "./TopTip";
import { LETTER_MIN_SENT } from "../../lib/queryLetters";
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

const ids = (h: string) => (h.match(/data-ql="row" data-id="([^"]+)"/g) ?? []).map((c) => c.match(/data-id="([^"]+)"/)![1]);

describe("/materials/letters renders the letter desk", () => {
  const populated = () => ({
    ...base(), manuscripts: [MS({ inUseLetterId: "l2" })],
    versions: [
      L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"),
      L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z", { parentId: "l1", changes: ["Hook moved to the first line"] }),
      L("l3", "Open on the harbour", "2026-11-03T10:00:00.000Z", { parentId: "l2", changes: ["New opening line"] }),
      L("l0", "Old letter", "2026-01-01T10:00:00.000Z", { status: "Retired" }),
    ],
    queries: [Q("q1", QueryStatus.QUERIED, { sentVersions: ["l2"] }), Q("q2", QueryStatus.PARTIAL_REQUESTED, { sentVersions: ["l2"] })],
  });

  it("populated: the shared open header, the Top tip, the rows in page order, the in-use letter selected and read in full", () => {
    state.data = populated();
    const h = render();
    const t = text(h);
    expect(h).toContain('class="qc1531-hd qlp-hd"');
    expect(t).toContain("3 query letters");
    expect(t).toContain("for Harbour of Glass");
    expect(t).toContain("+ New letter");
    expect(t).toContain("Upload a file");
    /* v2.1: the third column is the Top tip; v2's in-use block and its picker are gone */
    expect(h).toContain('data-ql="tip"');
    expect(t).toContain("Top tip Next tip Mark what you personalise");
    expect(h).not.toContain('data-ql="in-use"');
    expect(h).not.toContain('data-ql="change"');
    expect(t).not.toContain("Going out with new queries");
    expect(ids(h)).toEqual(["l2", "l3", "l1"]);
    expect(h).toMatch(/data-ql="row" data-id="l2" aria-current="true"/);
    expect(t).toContain("In use for new queries");
    expect(t).toContain("Query letter v1 saved 1 Mar Not sent yet"); // the first letter is the retired l0 (firstLetter counts retired ones)
    expect(t).toContain("Query letter v2 opens here.");
    expect(t).toContain("How it's doing");
    expect(t).toMatch(/2 sent 1 replied 1 asked for more/);
    expect(t).toContain("The queries it went with");
    expect(t).toContain("Show retired · 1");
    expect(h).toContain('data-page-title="true"');
  });

  it("a sent letter: the lock line and New version, never Edit; the switch to show what changed from its parent", () => {
    state.data = populated();
    const h = render();
    const t = text(h);
    expect(h).toContain('data-ql="lock-line"');
    expect(t).toContain("This letter has gone out, so its text stays as it was sent. To change it, start a new version from it.");
    expect(h).toContain('data-ql="new-version"');
    expect(h).not.toContain('data-ql="edit"');
    expect(t).toContain("Show what changed from Query letter v1");
    expect(h).not.toContain("<textarea");
  });

  it("a draft in use: the draft line and Edit, no lock line", () => {
    state.data = { ...populated(), manuscripts: [MS({ inUseLetterId: "l3" })] };
    const h = render();
    const t = text(h);
    expect(t).toContain("A draft. Edit it as much as you like until it goes out.");
    expect(h).toContain('data-ql="edit"');
    expect(h).not.toContain('data-ql="lock-line"');
    expect(t).toContain("Not sent yet. Pick this letter when you log a query and its replies will be counted here.");
  });

  it("v1's surfaces are gone: no ring or chart in the header, no card grid, no landing band", () => {
    state.data = populated();
    const h = render();
    for (const probe of ['data-ql="ring"', 'data-ql="grid"', 'data-ql="card"', 'id="ql-landing"', 'data-ql="landing"', 'data-ql="jump"', "<svg viewBox=\"0 0 84 84\""]) {
      expect(h, probe).not.toContain(probe);
    }
    expect(text(h)).not.toContain("Which letter is landing?");
  });

  it("the active package holds another letter: the in-use letter says package sends go with it, and changes nothing", () => {
    state.data = {
      ...base(), manuscripts: [MS({ inUseLetterId: "l1", activePackageId: "p1" })],
      versions: [L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"), L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z")],
      packages: [{ id: "p1", userId: "u1", manuscriptId: "m1", packageName: "Coastal", queryLetterVersionId: "l2", synopsisVersionId: "", samplePagesVersionId: "", createdDate: "2026-05-01" }],
      queries: [],
    };
    const h = render();
    const t = text(h);
    expect(t).toContain("Package sends go with Coastal 's letter: Query letter v2");
    expect(h).toMatch(/data-ql="letter-meta"[^]*data-ql="pkg-letter"/); // under the in-use letter's name and meta, not in the header
    expect(h).not.toMatch(/<header[^]*data-ql="pkg-letter"[^]*<\/header>/);
  });

  it("the early-days note appears only while two or more sent letters are compared and one is under fifteen", () => {
    const one = Array.from({ length: 15 }, (_, i) => Q(`a${i}`, QueryStatus.QUERIED, { sentVersions: ["l1"] }));
    state.data = {
      ...base(), manuscripts: [MS()],
      versions: [L("l1", "Query letter v1", "2026-03-01T10:00:00.000Z"), L("l2", "Query letter v2", "2026-05-20T10:00:00.000Z")],
      queries: [...one, Q("b", QueryStatus.QUERIED, { sentVersions: ["l2"] })],
    };
    expect(text(render())).toContain("Query letter v2 has only gone to a few agents so far, so its bar will move a lot with each reply.");
    state.data = { ...state.data, queries: one };
    expect(render()).not.toContain('data-ql="list-note"');
  });

  it("day one: the title, no buttons, the three numbered lines and the paste sheet", () => {
    state.data = { ...base(), manuscripts: [MS()], versions: [], queries: [Q("q1", QueryStatus.QUERIED)] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="empty"');
    expect(t).toContain(NO_LETTERS_TITLE);
    expect(h).not.toContain('data-ql="new"');
    expect(h).not.toContain('data-ql="upload"');
    expect(t).toContain("Paste your letter, or upload it.");
    expect(t).toContain("Pick it when you log a query.");
    expect(t).toContain("See which letter lands.");
    expect(t).toContain("Or upload the file you keep it in");
    expect(t).toContain("Save letter");
    expect(h).not.toContain('data-ql="in-use"');
  });

  it("loading: the skeleton at the desk's three columns, no spinner", () => {
    state.data = { ...populated(), collectionsReady: false };
    const h = render();
    expect(h).toContain('data-state="loading"');
    expect(h).toContain('data-ql="skeleton"');
    expect(h).not.toContain('data-ql="row"');
  });

  it("v2.1: tip 4 reads LETTER_MIN_SENT, never a typed number", () => {
    expect(TIPS[3].text).toBe(`A letter needs about ${LETTER_MIN_SENT} queries out before its figures mean much. Before that, one reply swings them.`);
    expect(TIPS.map((x) => x.title)).toEqual(["Mark what you personalise", "Don't overwrite, save a version", "Pick it when you log", "Give it time", "Copy from here"]);
  });

  it("v2.1: an unsent letter with no text shows the no-words sheet, not a blank one", () => {
    state.data = { ...populated(), manuscripts: [MS({ inUseLetterId: "lf" })], versions: [...populated().versions, L("lf", "Voice-led", "2026-11-05T10:00:00.000Z", { contentDraft: undefined, contentType: "ref", fileName: "voice.docx" })] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="no-text"');
    expect(t).toContain("The words aren't here yet It's kept in voice.docx. Paste the text in and you can read it here, copy it and compare it with your other letters.");
    expect(h).toContain('data-ql="paste-text"');
    expect(h).toContain('data-ql="upload-for"');
    expect(h).not.toContain('data-ql="filebox"');
    expect(h).not.toContain('data-ql="lock-line"');
  });

  it("v2.1: a sent letter with no text asks what it said, once, with its queries counted", () => {
    state.data = {
      ...populated(), manuscripts: [MS({ inUseLetterId: "lb" })],
      versions: [...populated().versions, L("lb", "Covering letter 4", "2026-08-21T10:00:00.000Z", { contentDraft: undefined, contentType: "ref" })],
      queries: [...populated().queries, Q("q9", QueryStatus.QUERIED, { sentVersions: ["lb"] }), Q("q10", QueryStatus.QUERIED, { sentVersions: ["lb"] })],
    };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="sent-no-text"');
    expect(t).toContain("This letter has gone out. Its name and results are on record, but not its words.");
    expect(t).toContain("What did this letter say? Add the text you sent and you can read it here, copy it and compare it with your other letters. Its 2 queries and their results stay exactly as they are.");
    expect(t).toContain("You can add it once. After that it locks, like any letter that has gone out.");
    expect(h).toContain('data-ql="add-text"');
    expect(h).toContain('data-ql="new-version"');
  });

  it("copy: no pronoun for an agent, no verdict words", () => {
    state.data = populated();
    const t = text(render());
    expect(t).not.toMatch(/\b(he|she|him|her|his|hers)\b/i);
    expect(t).not.toMatch(/\b(overdue|late|best|winner)\b/i);
  });

  it("the route is registered with the router and the shell", () => {
    expect([...WORKSPACE_PATHS]).toContain("/materials/letters");
    expect([...WORKSPACE_SHELL_PATHS]).toContain("/materials/letters");
  });
});
