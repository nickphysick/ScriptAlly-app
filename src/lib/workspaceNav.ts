/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * workspaceNav — THE IA of the workspace shell (shell-rebuild pack + Amendment 1).
 *
 * ⚠️ THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED. A nav entry with no route is a dead
 * link, and a dead link in permanent chrome is worse than an absent one because it looks like a
 * decision. `Learn` and `Documents` are therefore absent — neither has a route — which is why
 * Materials is CHILDLESS rather than a one-child accordion. TODO(documents-route).
 *
 * ⚠️⚠️ AMENDMENT 1 (H) — THE SIDEBAR IS NAVIGATION ONLY. It never encodes a filter or a view of a
 * page; every entry is a distinct destination. This SUPERSEDES the original Baked 14, whose
 * Queries children were four filters over one hub (All queries / Needs attention / Awaiting
 * response / Closed).
 *
 * Why it matters beyond tidiness: filter-children make the nav a second control surface for a
 * page that already has one, so the sidebar and the page's own filter bar can disagree about
 * what you are looking at — and the nav starts needing counts, which is how a navigation column
 * turns into a dashboard. Queries now carries two real destinations, and the `?status=` param
 * survives as IN-PAGE, linkable state (palette results, dashboard deep-links) rather than
 * something the sidebar drives.
 *
 * ⚠️ AND SO THE ATTENTION SIGNAL LIVES ON TO-DO ALONE. With the filter children gone there is no
 * count under Queries and no badge on its rail icon.
 */
import { ShellSection } from "./workspaceShell";

export interface WorkspaceNavInput {
  /** The To-do board's own total. The ONLY count in the nav (Amendment 1, H5). */
  todo: number;
}

/**
 * ⚠️ COUNTS ARE INJECTED, NEVER READ HERE. This file has no db imports, so the nav is unit-
 * testable in the node environment and each figure has exactly one derivation.
 */
export function workspaceSections(input: WorkspaceNavInput): ShellSection[] {
  return [
    // Amendment 1 (G): Dashboard renders INSIDE this shell now — a normal childless section,
    // not a route that swaps the whole chrome.
    { id: "dashboard", label: "Dashboard", path: "/dashboard" },
    {
      id: "queries",
      label: "Queries",
      def: "q-centre",
      children: [
        // "Query Centre" is the hub's name in nav, crumb AND on the page itself.
        { id: "q-centre", label: "Query Centre", path: "/queries" },
        { id: "q-analytics", label: "Analytics", path: "/queries/analytics" },
      ],
    },
    {
      id: "agents",
      label: "Agents",
      def: "a-list",
      children: [
        { id: "a-list", label: "Contact list", path: "/agents" },
        { id: "a-disc", label: "Discover", path: "/agents/discover" },
      ],
    },
    // Childless until a Documents route exists — see the file note.
    { id: "materials", label: "Materials", path: "/manuscripts/packages" },
    { id: "todo", label: "To-do", path: "/todo", count: input.todo || undefined, urgent: true },
  ];
}
