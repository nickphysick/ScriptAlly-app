/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The TASKS section (sidebar-IA fix, 6 Aug — Nick's call, reversing the one-row fold).
 *
 * ⚠️ ONE DEFINITION DRIVES EVERY SURFACE. The section's rows ARE `TODO_ROUTES` — the same
 * definition the ⌘K palette and both breadcrumbs read — so this suite asserts the RENDERED
 * sidebar (rows, order, the one count chip), the crumb strings, and the palette's four entries
 * against that single source rather than against four hand-agreed copies.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { workspaceSections } from "../../lib/workspaceNav";
import { TODO_ROUTES } from "../../lib/todoRoutes";
import { shellCrumb, shellHitFor } from "../../lib/workspaceShell";
import { PALETTE_PAGES } from "../../lib/searchPalette";
import { shellCrumbForPath, SHELL_SECTIONS } from "./shellV2Nav";

/* The shell's import chain reaches the db provider (the + New menu's capture contracts); the
   established mock from topNav.test keeps firebase out of the node environment. */
vi.mock("../../lib/db", () => ({
  useScriptAllyDb: () => ({
    tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [], packages: [],
    versions: [], activities: [], taskFlags: [], notes: [], logout: () => {},
    currentUser: { id: "u1", name: "Nick Physick", email: "n@example.com" },
  }),
}));
import { WorkspaceShell } from "./WorkspaceShell";

const ICONS: Record<string, React.ReactNode> = new Proxy({}, {
  get: (_, key) => <i data-icon={String(key)} />,
}) as Record<string, React.ReactNode>;

const renderShell = (path: string, todo = 0) =>
  renderToStaticMarkup(
    <MemoryRouter initialEntries={[path]}>
      <WorkspaceShell
        sections={workspaceSections({ todo })}
        icons={ICONS}
        onNavigatePath={() => {}}
        onOpenSearch={() => {}}
        onOpenHelp={() => {}}
      >
        <div />
      </WorkspaceShell>
    </MemoryRouter>,
  );

describe("⚠️ the TASKS section renders — same grammar, four rows, in order", () => {
  const html = renderShell("/todo");

  it("the group label renders between WORKSPACE and QUERIES", () => {
    const labels = [...html.matchAll(/ws-glabel[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(labels).toEqual(["Workspace", "Tasks", "Queries", "Agents", "Materials"]);
  });

  it("the four rows render in TODO_ROUTES order — and no To-do row sits under Workspace", () => {
    for (const r of TODO_ROUTES) expect(html).toContain(r.label);
    const order = TODO_ROUTES.map((r) => html.indexOf(`>${r.label}<`)).filter((i) => i >= 0);
    expect(order).toHaveLength(4);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    // Workspace holds Dashboard alone
    const workspace = workspaceSections({ todo: 3 }).find((s) => s.id === "workspace")!;
    expect(workspace.children!.map((c) => c.id)).toEqual(["dash"]);
  });

  it("⚠️ the count chip + dot render EXACTLY ONCE, on the To-do list row", () => {
    const withCount = renderShell("/todo", 7);
    // CountChip is `sp-ct` (+ `sp-ct-dot` when urgent) — one of each, riding the list row
    expect(withCount.match(/class="sp-ct"/g)?.length).toBe(1);
    expect(withCount.match(/sp-ct-dot/g)?.length).toBe(1);
    const listAt = withCount.indexOf(">To-do list<");
    const nextRowAt = withCount.indexOf(">Today<");
    const chipAt = withCount.indexOf("sp-ct");
    expect(chipAt).toBeGreaterThan(listAt);   // after the list row's label…
    expect(chipAt).toBeLessThan(nextRowAt);   // …and before the next row begins
    // the model behind it: count + urgent on the list child, nowhere else
    const rows = workspaceSections({ todo: 7 }).find((s) => s.id === "tasks")!.children!;
    expect(rows[0].count).toBe(7);
    expect(rows[0].urgent).toBe(true);
    expect(rows.slice(1).every((r) => r.count === undefined && r.urgent === undefined)).toBe(true);
    // and a quiet day renders no chip at all
    expect(renderShell("/todo", 0)).not.toContain("sp-ct");
  });
});

describe("⚠️ the breadcrumb reads Tasks / {page} — from the same definition", () => {
  const NAV = workspaceSections({ todo: 0 });

  it("the workspace shell's crumb (desktop)", () => {
    for (const r of TODO_ROUTES) {
      const hit = shellHitFor(NAV, r.path, "");
      expect(shellCrumb(NAV, hit), r.path).toEqual({ section: "Tasks", child: r.label });
    }
  });

  it("the capsule bar's crumb (mobile) says the same", () => {
    expect(shellCrumbForPath("/todo")).toEqual({ section: "Tasks", page: "To-do list" });
    expect(shellCrumbForPath("/todo/calendar")).toEqual({ section: "Tasks", page: "Calendar" });
    // and its section's pages ARE the routes — derived, not restated
    const sec = SHELL_SECTIONS.find((s) => s.key === "todo")!;
    expect(sec.label).toBe("Tasks");
    expect(sec.pages.map((p) => p.path)).toEqual(TODO_ROUTES.map((r) => r.path));
  });

  it("the rendered shell carries the crumb strings at each route", () => {
    const today = renderShell("/todo/today");
    expect(today).toContain("Tasks");
    expect(today).toContain("Today");
  });
});

describe("⚠️ the palette indexes all four — derived from TODO_ROUTES", () => {
  it("four page entries, titles and paths verbatim from the routes", () => {
    for (const r of TODO_ROUTES) {
      const entry = PALETTE_PAGES.find(
        (p) => (p.run as { path?: string }).path === r.path && p.kind === "page",
      );
      expect(entry, r.path).toBeTruthy();
      expect(entry!.title).toBe(r.label);
      expect(entry!.subtitle).toBe(r.blurb);
    }
    // the established ids survive the derivation (an id is an identifier, not a caption)
    expect(PALETTE_PAGES.map((p) => p.id)).toEqual(
      expect.arrayContaining(["page:todo", "page:todo-today", "page:todo-calendar", "page:todo-noteboard"]),
    );
  });
});
