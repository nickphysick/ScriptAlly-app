/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /manuscripts/versions — render smokes (Versions v6; re-pointed from v2's): the populated page, the page before any version (with queries
 * already out, and with none) and the locked page each render and carry their own distinctive chrome. Its own fixture
 * rather than pageSmoke's seed: the shared seed's manuscript has no book versions, so it would test the empty path
 * twice. Kept minimal on purpose: a smoke that pins appearance becomes the next false red.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { QueryStatus, UserPlan } from "../../types";

const state: { data: Record<string, unknown> } = { data: {} };
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => new Proxy(state.data, { get: (t, k) => (typeof k === "symbol" ? undefined : k in t ? t[k as string] : async () => undefined) }),
  DbProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { VersionsV2Page } from "./VersionsV2Page";
import * as ent from "../../lib/entitlements";

const MS = (bv: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "m1", userId: "u1", title: "Harbour of Glass", genre: "Thriller", ageCategory: "Adult", wordCount: 80000, logline: "",
  status: "Querying", statusChangedDate: "2026-01-05", bookVersions: bv, ...extra,
});
const O = { id: "bv-0", name: "Original", kind: "initial", createdDate: "2026-03-03", num: 0, original: true };
const V1 = { id: "bv-1", name: "Fast-paced opening", kind: "revision", createdDate: "2026-03-03", num: 1, parentId: "bv-0", changes: ["Cut the prologue"] };
const V2 = { id: "bv-2", name: "Dual timeline", kind: "revision", createdDate: "2026-09-02", num: 2, parentId: "bv-0", changes: ["Alternates 1994 and today"] };
const Q = (id: string, status: QueryStatus, extra: Record<string, unknown> = {}) => ({ id, userId: "u1", manuscriptId: "m1", agentId: "a1", packageId: "", status, dateSent: "2026-09-10T00:00:00.000Z", personalisationNotes: "", sendMethod: "Email", materialsWanted: [], ...extra });
const base = (plan: UserPlan) => ({
  currentUser: { id: "u1", name: "Isla Morven", email: "x@example.com", plan, onboardingComplete: true },
  /* plan rules v1: a founding writer (every dev account); the locked case spies on versionsUnlocked */
  entitlement: { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
  authReady: true, collectionsReady: true, versions: [], communityAgents: [], journalEntries: [], notes: [], dismissedTasks: [], taskFlags: [], tasks: [], userTasks: [], packages: [],
  agents: [{ id: "a1", userId: "u1", name: "Ada Reader", agency: "Reader & Co", genres: [] }], activities: [],
});
const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/manuscripts/versions"]}><VersionsV2Page onNavigate={() => {}} /></MemoryRouter>);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
afterEach(() => { vi.restoreAllMocks(); });

describe("/manuscripts/versions renders (Versions v6)", () => {
  it("populated: the navy header (Versions, of the book, the one-line map), the notice, the list on the in-use version, the open version and the comparison", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([O, V1, V2], { inUseBookVersionId: "bv-2" })],
      queries: [Q("q1", QueryStatus.QUERIED, { bookVersionId: "bv-1" }), Q("q2", QueryStatus.PARTIAL_REQUESTED, { bookVersionId: "bv-2" }), Q("q3", QueryStatus.QUERIED)] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="filled"');
    expect(h).toContain('data-wsnh-page="versions"');
    expect(h).toContain('>Versions</h1>');
    expect(t).toContain("of Harbour of Glass");
    expect(t).toContain("New version");
    expect(t).toContain("How it works");
    /* the map is one line in the header; the tree is not on the page */
    expect(h).toContain('data-vv6="map-open"');
    expect(t).toContain("3 versions, Dual timeline in use");
    expect(h).not.toContain('data-vv2="tree"');
    /* the founding writer band (a founding entitlement) and the notice */
    expect(t).toContain("Versions is a QueryHawk Pro feature.");
    expect(t).toContain("Tell us what you think");
    expect(t).toContain("1 query has no version recorded");
    expect(t).toContain("Assign versions");
    /* the list, opened on the version in use */
    expect(t).toContain("3 versions saved");
    const rows = h.match(/data-vv6="row" data-id="([^"]+)" aria-current="([^"]+)"/g) ?? [];
    expect(rows.length).toBe(3);
    expect(rows.find((r) => r.includes('aria-current="true"'))).toContain('"bv-2"');
    expect(h).toContain('data-vv6="open-name">Dual timeline<');
    expect(t).toContain("This version’s queries and where they stand");
    /* fewer than two ranked: the comparison's not-yet panel */
    expect(t).toContain("Compare your versions");
    expect(t).toContain("Not enough queries yet");
    /* v2.2's surfaces are gone */
    expect(t).not.toContain("Your versions,");
    expect(h).not.toContain('data-vv2="list"');
    expect(t).not.toContain("Warming up");
  });
  it("two versions with 5 sent each: the tiles and one funnel card per version, ranked first", () => {
    const five = (v: string, p: string) => Array.from({ length: 5 }, (_, i) => Q(`${p}${i}`, QueryStatus.QUERIED, { bookVersionId: v }));
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([O, V1, V2], { inUseBookVersionId: "bv-2" })], queries: [...five("bv-1", "a"), ...five("bv-2", "b")] };
    const h = render();
    const t = text(h);
    expect(t).toContain("Highest request rate");
    expect(t).toContain("Most sent");
    expect(t).toContain("Fastest replies");
    expect(t).toContain("Each to its own scale");
    expect((h.match(/data-vv6="fcard"/g) ?? []).length).toBe(3);
    expect(t).toContain("Ranked after 5 more queries");
    expect(t).not.toContain("Not enough queries yet");
  });
  it("day one, with queries out: the header without the map, the band, one How it works card, no film", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([])], queries: [Q("q1", QueryStatus.QUERIED), Q("q2", QueryStatus.REJECTED)] };
    const h = render();
    expect(h).toContain('data-state="pre"');
    const t = text(h);
    expect(t).toContain("Save your first version");
    expect(h).not.toContain('data-vv6="map-open"');
    expect(t).toContain("Pick it when you log a query");
    expect(t).not.toContain("Watch how it works");
    expect(h).not.toContain('data-vv6="notice"');
  });
  it("day one, nothing sent: the same How it works card", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([])], queries: [] };
    const h = render();
    expect(h).toContain('data-state="fresh"');
    expect(text(h)).toContain("Compare the results");
  });
  it("locked: the lock card over an inert page, and no founding band", () => {
    vi.spyOn(ent, "versionsUnlocked").mockReturnValue(false);
    state.data = { ...base(UserPlan.FREE), manuscripts: [MS([O, V1])], queries: [Q("q1", QueryStatus.QUERIED)] };
    const h = render();
    expect(h).toContain('data-state="locked"');
    expect(h).toContain('data-tier="free"');
    expect(text(h)).toContain("Find out which opening gets agents reading on.");
    expect(h).toMatch(/class="under" inert=""/);
    expect(h).not.toContain('data-vv6="founding"');
  });
});
