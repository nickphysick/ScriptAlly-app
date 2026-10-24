/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * /manuscripts/versions — render smokes (Versions v2): the populated page, the page before any version (with queries
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
  authReady: true, collectionsReady: true, versions: [], communityAgents: [], journalEntries: [], notes: [], dismissedTasks: [], taskFlags: [], tasks: [], userTasks: [], packages: [],
  agents: [{ id: "a1", userId: "u1", name: "Ada Reader", agency: "Reader & Co", genres: [] }], activities: [],
});
const render = () => renderToStaticMarkup(<MemoryRouter initialEntries={["/manuscripts/versions"]}><VersionsV2Page onNavigate={() => {}} /></MemoryRouter>);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
afterEach(() => { vi.restoreAllMocks(); });

describe("/manuscripts/versions renders", () => {
  it("populated: the title card (no header, no donut), the banner, the list with the in-use card first, the tree and the tracking band", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([O, V1, V2], { inUseBookVersionId: "bv-2" })],
      queries: [Q("q1", QueryStatus.QUERIED, { bookVersionId: "bv-1" }), Q("q2", QueryStatus.PARTIAL_REQUESTED, { bookVersionId: "bv-2" }), Q("q3", QueryStatus.QUERIED)] };
    const h = render();
    const t = text(h);
    expect(h).toContain('data-state="filled"');
    /* v2.2 A — the title card replaces the living header and its donut */
    expect(h).toContain('data-vv2="title"');
    expect(t).toContain("Save each version of Harbour of Glass as it changes.");
    expect(t).toContain("+ New version");
    expect(t).toContain("How it works");
    expect(t).not.toContain("— Versions —");
    expect(t).not.toContain("versions on file");
    expect(t).not.toContain("Sent with queries so far");
    expect(h).not.toContain('data-vv2="donut"');
    expect(t).toContain("1 query is out with agents without a version assigned.");
    expect(t).toContain("3 versions saved");
    const rows = h.match(/data-vv2="row" data-id="([^"]+)"/g) ?? [];
    expect(rows.length).toBe(3);
    expect(rows[0]).toContain('"bv-2"');
    expect(t).toContain("How your versions connect");
    /* v2.1 — one query each is short of 5 each: the band shows the warming-up panel, not the comparison */
    expect(t).toContain("This fills in once two versions have each gone out with 5 queries.");
    expect(t).not.toContain("How each version is doing");
    expect(h).not.toContain('data-vv2="compare"');
  });
  it("two versions with 5 sent each: the full Tracking & performance section, no warming-up panel, and no Compare (v2.2 A1)", () => {
    const five = (v: string, p: string) => Array.from({ length: 5 }, (_, i) => Q(`${p}${i}`, QueryStatus.QUERIED, { bookVersionId: v }));
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([O, V1, V2], { inUseBookVersionId: "bv-2" })], queries: [...five("bv-1", "a"), ...five("bv-2", "b")] };
    const h = render();
    const t = text(h);
    expect(t).toContain("How each version is doing");
    expect(t).toContain("Which version is out in front?");
    expect(t).not.toContain("Warming up");
    expect(h).not.toContain('data-vv2="compare"');
  });
  it("before any version, with queries out: the zero ring, the earlier-queries note and the steps", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([])], queries: [Q("q1", QueryStatus.QUERIED), Q("q2", QueryStatus.REJECTED)] };
    const h = render();
    expect(h).toContain('data-state="pre"');
    expect(text(h)).toContain("+ Save your first version");
    expect(text(h)).toContain("You’ve already sent 2 queries.");
    expect(text(h)).toContain("Start tracking versions");
  });
  it("before any version, with nothing sent: no earlier-queries note", () => {
    state.data = { ...base(UserPlan.PRO), manuscripts: [MS([])], queries: [] };
    const h = render();
    expect(h).toContain('data-state="fresh"');
    expect(text(h)).toContain("+ Save your first version");
    expect(h).not.toContain('data-vv2="pre-note"');
  });
  it("locked: the lock card over an inert page", () => {
    vi.spyOn(ent, "versionsUnlocked").mockReturnValue(false);
    state.data = { ...base(UserPlan.FREE), manuscripts: [MS([O, V1])], queries: [Q("q1", QueryStatus.QUERIED)] };
    const h = render();
    expect(h).toContain('data-state="locked"');
    expect(h).toContain('data-tier="free"');
    expect(text(h)).toContain("Find out which opening gets agents reading on.");
    expect(h).toMatch(/class="under" inert=""/);
  });
});
