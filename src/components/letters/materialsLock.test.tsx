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

const state: { plan: UserPlan; shut: boolean } = { plan: UserPlan.FREE, shut: false };
vi.mock("../../lib/db", () => ({ useScriptAllyDb: () => ({ currentUser: { id: "u1", plan: state.plan } }) }));
vi.mock("../../lib/railReviewAid", () => ({
  navOpenAid: () => (state.shut ? { discover: false, packages: false, versions: false, materials: false } : undefined),
}));

import { MaterialsLock, LOCK_COPY, type MaterialsPage } from "./MaterialsLock";

const PAGES: MaterialsPage[] = ["letters", "comps", "packages"];
const render = (page: MaterialsPage) => renderToStaticMarkup(
  <MemoryRouter><MaterialsLock page={page}><button type="button" data-probe="page-button">Save</button></MaterialsLock></MemoryRouter>,
);
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

beforeEach(() => { state.plan = UserPlan.FREE; state.shut = false; });

describe("the Materials lock", () => {
  it("a Free writer sees it on all three pages, over an inert page, with the right words", () => {
    state.shut = true;
    for (const p of PAGES) {
      const h = render(p);
      const t = text(h);
      expect(h).toContain(`data-mlk="${p}"`);
      expect(h).toMatch(/<div class="mlk-page" inert="" aria-hidden="true">/);
      expect(t).toContain("See Pro plans");
      expect(t).toContain("Not now");
      const c = p === "letters" ? LOCK_COPY.letters : LOCK_COPY.materials;
      expect(t).toContain(c.h); expect(t).toContain(c.free);
    }
    expect(LOCK_COPY.letters.h).toBe("Query letters is part of Pro");
    expect(LOCK_COPY.materials.h).toBe("Materials is part of Pro");
    expect(LOCK_COPY.materials.free).toBe("On Free, your queries still record that a letter, synopsis and pages went.");
  });
  it("a founding writer (the switch open, as today) sees none, and the page renders as it is", () => {
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
  });
});
