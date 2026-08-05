/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * workspaceNav — THE IA of the double-decker shell (shell-rebuild pack, Phase 3).
 *
 * ⚠️ THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED. This is the same rule lib/topNav.ts
 * already follows, and the two must not diverge: a nav entry with no route is a dead link, and a
 * dead link in permanent chrome is worse than an absent one because it looks like a decision.
 *
 * TWO ENTRIES FROM THE PACK'S IA ARE DELIBERATELY ABSENT, both for that reason:
 *
 *   · `Learn` — no route exists anywhere in the app (recon found zero references). Baked 14
 *     provides for exactly this: "include only if recon finds real routes; otherwise omit from
 *     BOTH shells". Omitted here and in topNav.
 *   · `Documents` — no route exists. TODO(documents-route): when a documents library is built,
 *     Materials gains children and this becomes an accordion.
 *
 * ⚠️ MATERIALS IS THEREFORE CHILDLESS, not a one-child accordion. A chevron that opens onto a
 * single row reads as broken — the affordance promises a choice the section cannot offer. It
 * navigates straight to Submission packages until Documents exists to sit beside it.
 *
 * ⚠️ /import, /manuscripts and /manuscripts/comps have NO ENTRY HERE. They remain reachable by
 * route, by the top-nav mega menus and by the palette; the pack's IA simply does not place them,
 * and inventing a home for them would be designing rather than implementing. Flagged in the
 * report rather than resolved quietly.
 */
import { ShellSection } from "./workspaceShell";
import { queriesPathFor } from "./queriesFilterParam";

export interface WorkspaceNavInput {
  /** Queries past their reply window — `attentionCount`. Not the writer's-turn split. */
  attention: number;
  /** The To-do board's own total. */
  todo: number;
}

/**
 * ⚠️ COUNTS ARE INJECTED, NEVER READ HERE. This file has no imports from the db layer, so the
 * nav can be unit-tested in the node environment and so there is exactly one place each figure
 * is derived. A `useScriptAllyDb()` in this module would put a second derivation of "attention"
 * one import away from the first.
 */
export function workspaceSections(input: WorkspaceNavInput): ShellSection[] {
  return [
    // Dashboard lives in the TOP-NAV shell (lib/shellForRoute). The entry is deliberate: it is
    // the way back out of the workspace, and a shell with no route home is a trap.
    { id: "dashboard", label: "Dashboard", path: "/dashboard" },
    {
      id: "queries",
      label: "Queries",
      def: "q-all",
      children: [
        { id: "q-all", label: "All queries", path: queriesPathFor("all") },
        {
          id: "q-att",
          label: "Needs attention",
          path: queriesPathFor("attention"),
          count: input.attention || undefined,
          urgent: true,
        },
        { id: "q-await", label: "Awaiting response", path: queriesPathFor("awaiting") },
        { id: "q-closed", label: "Closed", path: queriesPathFor("closed") },
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
