/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * topNav — the pure core of the TOP-NAV shell (ref design-refs/scriptally-topnav-v2.html).
 *
 * ⚠️ THE SHELL RENDERS WHAT EXISTS, NEVER WHAT IS PLANNED. The pack's menus were written from
 * the product Nick wants, not the routes we have: roughly half their items had no route. Every
 * one of those is absent here rather than dead or greyed — the column follows the same rule, and
 * the two must not diverge. **Any nav list in a pack is a proposal to be checked against the
 * router, not a specification.**
 *
 * `Learn` went entirely: its one real destination is Help centre, which the account menu already
 * carries. A heading that opens onto a single link advertises a section that does not exist.
 */
import { RailCaptureKey } from "../components/shell/railNav";

/** A menu item's destination — data, so the component owns dispatch and tests can prove it. */
export type NavRun =
  | { kind: "path"; path: string }
  | { kind: "capture"; capture: RailCaptureKey }
  | { kind: "navigate"; tab: string; sub?: string };

export interface NavItem {
  label: string;
  /** The one-line explanation beneath it — what this page is FOR, not what it is called. */
  blurb: string;
  run: NavRun;
}

/** A column inside a mega-menu. Columns are rendered from CONTENT — never three reserved slots. */
export interface NavColumn {
  cap: string;
  items: NavItem[];
}

export interface NavMenu {
  key: "queries" | "agents" | "materials";
  label: string;
  columns: NavColumn[];
}

/**
 * THE THREE MENUS. `Learn` is deliberately absent (see the file note).
 *
 * `Submission packages` appears under BOTH Queries and Materials, deliberately: it is the thing
 * you assemble (Materials) and the thing you send (Queries), and someone looking for it will
 * look in whichever of those they were thinking about.
 */
export const NAV_MENUS: NavMenu[] = [
  {
    key: "queries",
    label: "Queries",
    columns: [
      {
        cap: "Track",
        items: [
          { label: "Queries Hub", blurb: "Every query and exactly where it stands", run: { kind: "path", path: "/queries" } },
          { label: "To-do", blurb: "What needs you, and what can wait", run: { kind: "path", path: "/todo" } },
          { label: "Submission packages", blurb: "What you send, assembled once", run: { kind: "path", path: "/manuscripts/packages" } },
        ],
      },
      {
        cap: "Act",
        items: [
          { label: "Log a query", blurb: "Start a new query", run: { kind: "capture", capture: "query" } },
          { label: "Record a response", blurb: "Log what an agent said back", run: { kind: "capture", capture: "record" } },
          { label: "Smart import", blurb: "Bring in queries from a spreadsheet", run: { kind: "path", path: "/import" } },
          { label: "Export CSV", blurb: "Download your full query log", run: { kind: "path", path: "/queries" } },
        ],
      },
    ],
  },
  {
    key: "agents",
    label: "Agents",
    columns: [
      {
        cap: "Yours",
        items: [
          { label: "Agent list", blurb: "Everyone you're querying or watching", run: { kind: "path", path: "/agents" } },
          { label: "Add an agent", blurb: "Create a new agent record", run: { kind: "capture", capture: "agent" } },
        ],
      },
      {
        cap: "Find",
        items: [
          { label: "Discover", blurb: "Agents open to your genre right now", run: { kind: "path", path: "/agents/discover" } },
        ],
      },
    ],
  },
  {
    key: "materials",
    label: "Materials",
    columns: [
      {
        cap: "The book",
        items: [
          { label: "Manuscripts", blurb: "Your shelf", run: { kind: "path", path: "/manuscripts" } },
          { label: "Comparable titles", blurb: "Find comps for your book", run: { kind: "path", path: "/manuscripts/comps" } },
          { label: "Add a manuscript", blurb: "Start a new project", run: { kind: "navigate", tab: "manuscripts", sub: "Add a manuscript" } },
        ],
      },
      {
        cap: "Assembled",
        items: [
          { label: "Submission packages", blurb: "Letter, synopsis and sample, ready to send", run: { kind: "path", path: "/manuscripts/packages" } },
        ],
      },
    ],
  },
];

/** The right-hand panel: a live figure, never marketing copy. `stat` is null when not derivable. */
export interface NavPanel {
  cap: string;
  headline: string;
  body: string;
  /** The route the panel's link goes to. */
  path: string;
  linkLabel: string;
}

export interface PanelInput {
  /** Queries past their reply window — the To-do board's own urgent figure. */
  overdue: number;
  /** Agents on file that have never been queried — `agentIdleCount`'s definition. */
  idle: number;
  /** Manuscripts with no submission package built. */
  packagelessManuscripts: number;
}

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
/** Spelled to ten, as the mockup does ("Three queries are past their reply window"). */
const spell = (n: number) => (n <= 10 ? WORDS[n] : String(n));

/**
 * THE PANEL TAKES LIVE DATA, NOT MARKETING COPY — and it is doing more work than the mockup
 * asked of it, because the menus are thinner than drawn: it is what stops a short menu looking
 * empty. Every figure is derived from selectors that already exist; none needs a new field.
 */
export function navPanels(input: PanelInput): Record<NavMenu["key"], NavPanel> {
  return {
    queries: {
      cap: "This week",
      headline: input.overdue > 0
        ? `${spell(input.overdue)} ${input.overdue === 1 ? "query is past its" : "queries are past their"} reply window`
        : "Nothing is past its reply window",
      body: input.overdue > 0
        ? "A nudge is usually enough, and it resets the clock."
        : "Every open query is still inside the window you set.",
      path: "/todo",
      linkLabel: "Open the to-do list",
    },
    agents: {
      cap: "Idle",
      headline: input.idle > 0
        ? `${spell(input.idle)} ${input.idle === 1 ? "agent" : "agents"} you've saved but never queried`
        : "Every agent on file has been queried",
      body: input.idle > 0
        ? "They were worth saving once. Worth a look before you widen the search."
        : "Discover is where the next ones come from.",
      path: "/agents",
      linkLabel: "Open the agent list",
    },
    materials: {
      cap: "Tip",
      headline: input.packagelessManuscripts > 0
        ? "A package saves you the rebuild"
        : "Every manuscript has a package",
      body: input.packagelessManuscripts > 0
        ? "Assemble the letter, synopsis and sample once, and every query after it is a send rather than a rebuild."
        : "Letter, synopsis and sample are ready for each book on the shelf.",
      path: "/manuscripts/packages",
      linkLabel: "Open the workshop",
    },
  };
}
