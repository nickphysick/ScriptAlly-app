/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /manuscripts/versions — render smokes (Versions v1, A1's unit half): the populated page, the no-versions page and
 * the locked page each render and carry their own distinctive chrome. Its own fixture rather than pageSmoke's seed:
 * the shared seed's manuscript has no book versions, so it would test the empty path twice.
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

import { VersionsV1Page } from "./VersionsV1Page";
import * as ent from "../../lib/entitlements";

const MS = (bv: unknown[], extra: Record<string, unknown> = {}) => ({
  id: "m1", userId: "u1", title: "Harbour of Glass", genre: "Thriller", ageCategory: "Adult", wordCount: 80000, logline: "",
  status: "Querying", statusChangedDate: "2026-01-05", bookVersions: bv, ...extra,
});
const V1 = { id: "bv-1", name: "Prologue first", kind: "initial", createdDate: "2026-03-03" };
const V2 = { id: "bv-2", name: "Fast-paced opening", kind: "reordering", createdDate: "2026-09-02", note: "Cut the prologue." };
const PKG = { id: "p1", manuscriptId: "m1", packageName: "Standard UK", status: "Active", createdDate: "2026-09-02", queryLetterVersionId: "l1", synopsisVersionId: "", samplePagesVersionId: "", bookVersionId: "bv-2" };
const Q = (id: string, status: QueryStatus, packageId = "p1") => ({ id, userId: "u1", manuscriptId: "m1", agentId: "a1", packageId, status, dateSent: "2026-09-10T00:00:00.000Z", personalisationNotes: "", sendMethod: "Email", materialsWanted: [] });
const base = (plan: UserPlan) => ({
  currentUser: { id: "u1", name: "Isla Morven", email: "x@example.com", plan, onboardingComplete: true },
  authReady: true, collectionsReady: true, versions: [], communityAgents: [], journalEntries: [], notes: [], dismissedTasks: [], taskFlags: [], tasks: [], userTasks: [],
  agents: [{ id: "a1", userId: "u1", name: "Ada Reader", agency: "Reader & Co", genres: [] }], activities: [],
});
const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/manuscripts/versions"]}><VersionsV1Page onNavigate={() => {}} /></MemoryRouter>);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");
afterEach(() => { try { localStorage.removeItem("scriptally_active_manuscript_id"); } catch { /* node */ } vi.restoreAllMocks(); });

describe("/manuscripts/versions renders", () => {
  it("populated: the header, the active card, the banner, the list and the comparison", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([V1, V2], { activePackageId: "p1" })], packages: [PKG],
      queries: [Q("q1", QueryStatus.QUERIED), Q("q2", QueryStatus.PARTIAL_REQUESTED), Q("q3", QueryStatus.QUERIED, "")] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="filled"');
    expect(t).toContain("— Versions —");
    expect(t).toContain("2 versions on file");
    expect(t).toContain("of Harbour of Glass");
    expect(h).toMatch(/data-ver1="active-name">Fast-paced opening</);
    expect(t).toContain("1 query is out with agents without a version assigned.");
    expect(t).toContain("2 versions saved");
    expect((h.match(/data-ver1="row"/g) ?? []).length).toBe(2);
    expect(t).toContain("How each version is doing");
    expect(t).not.toMatch(/Not recorded/);
  });
  it("no versions: the ring card and the first-version steps", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([])], packages: [], queries: [] };
    const h = render();
    expect(h).toContain('data-state="fresh"');
    expect(text(h)).toContain("No versions yet");
    expect(text(h)).toContain("Versions saved");
    expect(text(h)).toContain("Start tracking versions");
  });
  it("locked: the lock card over an inert copy, with no row action reachable", () => {
    vi.spyOn(ent, "versionsUnlocked").mockReturnValue(false);
    state.data = { ...base(UserPlan.FREE), manuscripts: [MS([V1, V2])], packages: [PKG], queries: [Q("q1", QueryStatus.QUERIED)] };
    const h = render();
    expect(h).toContain('data-state="locked"');
    expect(text(h)).toContain("Find out which opening gets agents reading on.");
    expect(h).toMatch(/class="ver1-under" aria-hidden="true" inert=""/);
  });
});
