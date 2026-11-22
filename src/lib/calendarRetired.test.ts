/**
 * THE CALENDAR PAGE IS RETIRED (29 Oct) — locks L1–L4 of the retirement.
 *
 * The page at `/todo/calendar` went completely: its route, its nav row, its folder-tab sibling, its palette
 * entry and its shortcuts. The To-do list keeps its OWN calendar (the day card and the slide-out
 * month/week drawer, `lib/trayCalendar`), and the Query Centre's timeline and its Calendar VIEW are a
 * different thing and are untouched — so this file names the PAGE, never the word "calendar" in general.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { TODO_ROUTES, todoRedirectFor, todoPageForPath } from "./todoRoutes";
import { workspaceSections } from "./workspaceNav";
import { SHELL_SECTIONS } from "../components/shell/shellV2Nav";
import { PALETTE_PAGES } from "./searchPalette";
import { WORKSPACE_SHELL_PATHS } from "./shellForRoute";
import { WORKSPACE_PATHS } from "../marketing/routeTiers";
import { HEADER_PANEL_ROUTES } from "../components/shell/headerSheetRoutes";
import { SHORTCUTS, SCOPE_ORDER } from "./shortcuts";

const SRC = resolve(__dirname, "..");
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("L1 · /todo/calendar redirects to /todo, keeping the query string and the hash", () => {
  it("is an explicit redirect, not the fallback", () => {
    expect(todoRedirectFor("/todo/calendar")).toBe("/todo");
    expect(todoRedirectFor("/todo/calendar/")).toBe("/todo");
    expect(todoRedirectFor("/todo/calendar", "?q=abc")).toBe("/todo?q=abc");
    expect(todoRedirectFor("/todo/calendar", "?q=abc", "#day")).toBe("/todo?q=abc#day");
    // the live routes are never redirected
    for (const r of TODO_ROUTES) expect(todoRedirectFor(r.path), r.path).toBeNull();
    // and the redirect's target is a real route
    expect(todoPageForPath("/todo")).toBe("list");
  });
});

describe("L2 · no nav, sidebar or palette model still offers the Calendar page", () => {
  const isCalendarPath = (p: string | undefined) => !!p && p.replace(/\/+$/, "") === "/todo/calendar";

  it("TODO_ROUTES is exactly the To-do list and the Corkboard", () => {
    expect(TODO_ROUTES.map((r) => [r.id, r.label, r.path])).toEqual([
      ["list", "To-do list", "/todo"],
      ["noteboard", "Corkboard", "/todo/corkboard"],
    ]);
  });

  it("the sidebar's Tasks group and the shell's Tasks section read To-do list, Corkboard", () => {
    const tasks = workspaceSections({ todo: 0 }).find((s) => s.id === "tasks")!;
    expect(tasks.children!.map((c) => c.label)).toEqual(["To-do list", "Corkboard"]);
    const todo = SHELL_SECTIONS.find((s) => s.key === "todo")!;
    expect(todo.pages.map((p) => p.label)).toEqual(["To-do list", "Corkboard"]);
  });

  it("no route list, nav row or palette entry carries the path or a Calendar page label", () => {
    for (const [name, paths] of [
      ["WORKSPACE_SHELL_PATHS", [...WORKSPACE_SHELL_PATHS]],
      ["WORKSPACE_PATHS", [...WORKSPACE_PATHS]],
      ["HEADER_PANEL_ROUTES", [...HEADER_PANEL_ROUTES]],
    ] as const) {
      expect(paths.some(isCalendarPath), name).toBe(false);
    }
    for (const s of workspaceSections({ todo: 3 })) {
      for (const c of s.children ?? []) {
        expect(isCalendarPath(c.path), `${s.id}/${c.label}`).toBe(false);
        if (s.id === "tasks") expect(c.label, "a Tasks row").not.toBe("Calendar");
      }
    }
    for (const s of SHELL_SECTIONS) for (const p of s.pages) expect(isCalendarPath(p.path), `${s.key}/${p.label}`).toBe(false);
    for (const p of PALETTE_PAGES) {
      expect(isCalendarPath((p.run as { path?: string }).path), p.id).toBe(false);
      expect(p.id, "a palette page id").not.toBe("page:todo-calendar");
    }
  });
});

describe("L3 · nothing imports the Calendar page or its two page-only libraries", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (name === "node_modules") continue;
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(p);
    }
  };
  walk(SRC);

  it("walked the source tree (a sweep over nothing proves nothing)", () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it("no import of TodoCalendarPage, calendarToolbar or calendarFacets", () => {
    const offenders: string[] = [];
    // ⚠️ this file names all three in order to hunt for them, so it skips itself by name
    for (const f of files) {
      if (f.endsWith("calendarRetired.test.ts")) continue;
      const code = stripComments(readFileSync(f, "utf8"));
      if (/from\s+["'][^"']*\/(TodoCalendarPage|calendarToolbar|calendarFacets)["']/.test(code)
        || /readFileSync\([^)]*(TodoCalendarPage|calendarToolbar|calendarFacets)/.test(code)) {
        offenders.push(f.slice(SRC.length + 1));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("L4 · the shortcuts model has no Calendar scope", () => {
  it("no scope, and no shortcut bound to the deleted page", () => {
    expect(SCOPE_ORDER as readonly string[]).not.toContain("Calendar");
    for (const [id, s] of Object.entries(SHORTCUTS)) {
      expect(s.scope as string, id).not.toBe("Calendar");
      expect(s.bound ?? "", id).not.toContain("TodoCalendarPage");
    }
  });
});
