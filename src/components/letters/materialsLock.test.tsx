/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v1, Part E — the Materials lock. A Free writer, once the materials switch is shut, sees the lock on all
 * three pages; a founding writer (today: the switch is open) and a Pro writer see none. The decision is the nav's own
 * (`navLockedFor`), and the gate is mounted from App.tsx around each page, never inside one.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

const state: { plan: UserPlan; shut: boolean } = { plan: UserPlan.FREE, shut: false }; // shut = a day-15 Free writer
vi.mock("../../lib/db", () => ({ useScriptAllyDb: () => ({
  currentUser: { id: "u1", plan: state.plan },
  /* plan rules v1: the gate reads the resolved entitlement — paid Pro, or a day-15 Free writer */
  entitlement: state.plan === UserPlan.PRO
    ? { basis: "pro", pro: true, prompts: false, trialEndsMs: null }
    : state.shut
      ? { basis: "free", pro: false, prompts: true, trialEndsMs: null }
      : { basis: "founding", pro: true, prompts: false, trialEndsMs: null },
}) }));

import { MaterialsLock, LOCK_COPY, READ_ONLY_LINE, type MaterialsPage } from "./MaterialsLock";

const PAGES: MaterialsPage[] = ["letters", "comps", "packages"];
const renderAny = (page: MaterialsPage) => renderToStaticMarkup(
  <MemoryRouter><MaterialsLock page={page}><button type="button" data-probe="page-button">Save</button></MaterialsLock></MemoryRouter>,
);
const render = (page: MaterialsPage) => renderToStaticMarkup(
  <MemoryRouter><MaterialsLock page={page}><button type="button" data-probe="page-button">Save</button></MaterialsLock></MemoryRouter>,
);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

beforeEach(() => { state.plan = UserPlan.FREE; state.shut = false; });

describe("the Materials lock", () => {
  it("a Free writer sees their work READ-ONLY on all three pages: the page in full, inert, under one line and a link", () => {
    state.shut = true;
    for (const p of PAGES) {
      const h = render(p);
      const t = text(h);
      expect(h).toContain(`data-mlk="${p}"`);
      expect(h).toMatch(/<div class="mlk-page" inert="" data-mlk="page">/);
      expect(h, "readable: not hidden from assistive tech").not.toContain('aria-hidden="true">');
      expect(h, "the page itself is drawn").toContain('data-probe="page-button"');
      expect(h, "no lock card").not.toContain('data-mlk="lock"');
      expect(t).toContain(READ_ONLY_LINE[p as keyof typeof READ_ONLY_LINE]);
      expect(t).toContain("See Pro plans");
    }
  });
  it("the Scout gets the lock card instead (not the writer's own work)", () => {
    state.shut = true;
    const h = renderAny("scout");
    expect(h).toContain('data-mlk="lock"');
    expect(text(h)).toContain(LOCK_COPY.scout.h);
    expect(text(h)).toContain("Not now");
  });
  it("a founding writer sees none, and the page renders as it is", () => {
    for (const p of PAGES) {
      const h = render(p);
      expect(h).not.toContain("data-mlk");
      expect(h).toBe('<button type="button" data-probe="page-button">Save</button>');
    }
  });
  it("a Pro writer sees none even with the switch shut", () => {
    state.shut = true; state.plan = UserPlan.PRO;
    for (const p of PAGES) expect(render(p)).not.toContain("data-mlk");
  });
  it("App.tsx mounts it around each of the three pages", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toContain('<MaterialsLock page="letters"><QueryLettersPage');
    expect(app).toContain('<MaterialsLock page="comps"><ComparableTitlesPage');
    expect(app).toContain('<MaterialsLock page="packages"><PackagesRoute');
    expect(app).toContain('<MaterialsLock page="scout"><DiscoverRoute');
  });
});
