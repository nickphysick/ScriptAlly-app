/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE TRIPWIRE FOR A PAGE THAT DOES NOT LOAD.
 *
 * Every other To-do test reads SOURCE. Source-string tests cannot see a runtime crash, and this
 * page crashed on dev with "something went wrong" while the whole suite was green: a `const`
 * declared BELOW the component's `return` was read by the JSX above it, so it sat in the temporal
 * dead zone and threw a ReferenceError on every render. The file already carries a warning about
 * exactly that ("MUST be a hoisted function, not a post-return const"); the warning was not
 * enough, because nothing executed the render.
 *
 * So this RENDERS the page — `renderToStaticMarkup`, the same technique shellV2Smoke uses, with
 * the db hook mocked to an empty-but-complete state. Effects do not run under static rendering,
 * which is fine: the pure render path is where TDZ, undefined reads and bad destructures live.
 *
 * It asserts almost nothing about appearance on purpose. Its job is: THE PAGE RENDERS AT ALL.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { UserPlan } from "../../types";

vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], dismissedTasks: [],
    currentUser: { id: "u1", name: "Nick Physick", plan: UserPlan.FREE },
    addUserTask: async () => undefined,
    updateUserTask: async () => undefined,
    deleteUserTask: async () => undefined,
    upsertTaskFlag: async () => undefined,
    updateUserProfile: async () => undefined,
  }),
}));

import { ToDoPage } from "./ToDoPage";
import { TodoTodayPage } from "./TodoTodayPage";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<MemoryRouter initialEntries={["/todo"]}>{node}</MemoryRouter>);

describe("the To-do pages RENDER — the check the source-string tests cannot make", () => {
  it("the board page renders without throwing", () => {
    expect(() => render(<ToDoPage onNavigate={() => {}} />)).not.toThrow();
  });

  it("…and produces its own chrome, so it is not an empty shell that merely did not crash", () => {
    const html = render(<ToDoPage onNavigate={() => {}} />);
    expect(html).toContain("To-do list");        // the page header
    expect(html).toContain("tdb-tools");          // the tool row
    expect(html).toContain("Filters");            // the side container
  });

  it("the Today page renders without throwing", () => {
    expect(() => render(<TodoTodayPage onNavigate={() => {}} />)).not.toThrow();
  });

  it("…and carries its own header", () => {
    const html = render(<TodoTodayPage onNavigate={() => {}} />);
    expect(html).toContain("Today");
    expect(html).toContain("Your list for today");
  });
});

describe("⚠️ no post-return const is read by the render (the crash's shape)", () => {
  it("every `const` below the return is one the JSX above it does not touch", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync(new URL("./ToDoPage.tsx", import.meta.url), "utf8");
    const ret = src.indexOf("\n  return (");
    expect(ret, "the component's return must be findable").toBeGreaterThan(-1);
    const above = src.slice(0, ret);
    const below = src.slice(ret);
    for (const m of below.matchAll(/^  const (\w+)/gm)) {
      const name = m[1];
      // A const declared below the return is in the TDZ for the whole render, so the JSX above
      // must never name it. (Functions hoist and are fine — that is why they are functions.)
      expect(above.includes(`{${name}(`) || above.includes(`{${name}}`) || above.includes(`${name}.`),
        `${name} is declared below the return but read by the render — it will throw`).toBe(false);
    }
  });
});
