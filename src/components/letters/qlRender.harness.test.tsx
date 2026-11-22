/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2 — the render harness for states the emulator cannot hold still. Loading is the case: holding
 * Firestore also holds the boot splash (sign-in waits on the user document), so the skeleton's real window is a few
 * milliseconds. This renders the page's markup with `collectionsReady: false` and writes it into an HTML file that
 * links EVERY stylesheet the build emitted (`<dist>/assets/*.css`, never hand-picked sources), for
 * tests/e2e/queryLettersV2.measure.ts (QL2-F3) to open and measure.
 *
 * Inert in the normal suite: it runs only when QL2_RENDER_OUT names the file to write (and QL2_RENDER_DIST the build).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const state: { data: Record<string, unknown> } = { data: {} };
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => new Proxy(state.data, { get: (t, k) => (typeof k === "symbol" ? undefined : k in t ? t[k as string] : async () => undefined) }),
  DbProvider: ({ children }: { children?: React.ReactNode }) => children,
}));
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { QueryLettersPage } from "./QueryLettersPage";
import { UserPlan } from "../../types";

/* the smoke's fixture, inlined (importing a test file would register its tests here too) */
const MS = () => ({ id: "m1", userId: "u1", title: "Murphy's Day Out", genre: "Fiction", ageCategory: "Adult", wordCount: 84000, logline: "", status: "Querying" });
const base = () => ({
  currentUser: { id: "u1", name: "Writer", email: "x@example.com", plan: UserPlan.PRO, onboardingComplete: true },
  authReady: true, communityAgents: [], journalEntries: [], notes: [], dismissedTasks: [], taskFlags: [],
  tasks: [], userTasks: [], packages: [], activities: [], agents: [],
});

const OUT = process.env.QL2_RENDER_OUT ?? "";
const DIST = resolve(process.env.QL2_RENDER_DIST ?? "dist-emu");

describe.runIf(!!OUT)("render harness: the letter desk while loading", () => {
  it("writes the loading page with the build's own stylesheets", () => {
    state.data = { ...base(), collectionsReady: false, manuscripts: [MS()], versions: [], queries: [] };
    const body = renderToStaticMarkup(<MemoryRouter initialEntries={["/materials/letters"]}><QueryLettersPage /></MemoryRouter>);
    const css = readdirSync(join(DIST, "assets")).filter((f) => f.endsWith(".css"));
    expect(css.length).toBeGreaterThan(0);
    const links = css.map((f) => `<link rel="stylesheet" href="${pathToFileURL(join(DIST, "assets", f)).href}">`).join("\n");
    writeFileSync(OUT, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8">${links}</head><body style="margin:0">${body}</body></html>`);
    expect(body).toContain('data-ql="skeleton"');
  });
});
