/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * searchPalette — the pure core of the command palette (ref
 * design-refs/scriptally-search-palette.html). Corpus, ranking, grouping and highlighting, with
 * no React and no data access: the palette component passes in the already-loaded db state.
 *
 * ⚠️ EVERYTHING IS CLIENT-SIDE, over state DbProvider already subscribes to on every route.
 * There is no server search and no Firestore index — and there must not be one: the corpus is a
 * writer's own agents, queries and manuscripts, which is hundreds of rows, not thousands.
 *
 * ⚠️ AN ITEM'S ACTION IS DATA, NOT A FUNCTION (`PaletteRun`). The component owns dispatch, so
 * the corpus stays comparable, serialisable and testable, and so every action provably lands on
 * an EXISTING handler (invokeCapture / the navigate bridge) rather than a new one.
 */
import { RailCaptureKey } from "../components/shell/railNav";

/** What activating a row does. Data only — the palette component performs it. */
export type PaletteRun =
  /** One of the four existing capture contracts (Log a query, Record a response, Add an agent). */
  | { kind: "capture"; capture: RailCaptureKey }
  /** The legacy navigate bridge — tab + optional subpage (Add a manuscript, Export CSV…). */
  | { kind: "navigate"; tab: string; sub?: string }
  /** Router-direct path navigation (pages). */
  | { kind: "path"; path: string }
  /** Deep-select a query on the hub — the existing onNavigate("queries", id) contract. */
  | { kind: "query"; queryId: string }
  /** The Agents page, seeded with the agent's name as its list filter (existing behaviour). */
  | { kind: "agent"; agentId: string; name: string }
  /** Jump to: open Log-a-query PRESELECTED to this agent, via the existing initialAgentId seam. */
  | { kind: "logQueryTo"; agentId: string; name: string };

export type PaletteGroup =
  | "Jump to" | "Recent" | "Actions" | "Agents" | "Queries" | "Manuscripts" | "Pages";

/** Group render order (mockup ORDER, with Recent used only by the empty state). */
export const GROUP_ORDER: PaletteGroup[] = [
  "Jump to", "Recent", "Actions", "Agents", "Queries", "Manuscripts", "Pages",
];

/** The icon family a row wears — maps to the mockup's `.ic` tints. */
export type PaletteKind = "act" | "agent" | "query" | "ms" | "page";

export interface PaletteItem {
  /** Stable within a session — the aria-activedescendant target and the recents key. */
  id: string;
  group: PaletteGroup;
  kind: PaletteKind;
  title: string;
  subtitle?: string;
  /** Right-hand mono label (an agent's standing, say). */
  meta?: string;
  /** Keyboard chip — the palette is where people learn the shortcuts. */
  shortcut?: string;
  /** Query rows carry their status so the row can render the REAL StatusDot. Never a local circle. */
  status?: string;
  run: PaletteRun;
}

/**
 * THE ACTIONS. Every one dispatches to a handler that already exists — three capture contracts
 * and two navigate-bridge destinations — so the palette adds a doorway, never a second door.
 */
export const PALETTE_ACTIONS: PaletteItem[] = [
  {
    id: "act:query", group: "Actions", kind: "act",
    title: "Log a query", subtitle: "Start a new query", shortcut: "⌘L",
    run: { kind: "capture", capture: "query" },
  },
  {
    id: "act:record", group: "Actions", kind: "act",
    title: "Record a response", subtitle: "Log what an agent said", shortcut: "⌘R",
    run: { kind: "capture", capture: "record" },
  },
  {
    id: "act:agent", group: "Actions", kind: "act",
    title: "Add an agent", subtitle: "Create a new agent record",
    run: { kind: "capture", capture: "agent" },
  },
  {
    id: "act:manuscript", group: "Actions", kind: "act",
    title: "Add a manuscript", subtitle: "Start a new project",
    run: { kind: "navigate", tab: "manuscripts", sub: "Add a manuscript" },
  },
  {
    id: "act:export", group: "Actions", kind: "act",
    title: "Export queries to CSV", subtitle: "Download your full query log",
    run: { kind: "navigate", tab: "queries" },
  },
];

/**
 * THE PAGES — every routed page plus Task settings and Help centre. **Pages and features are
 * results**: typing "pack" should find the Packages page and "settings" should find Task
 * settings, because the thing people are looking for is as often a place as a record.
 */
export const PALETTE_PAGES: PaletteItem[] = [
  { id: "page:dashboard", group: "Pages", kind: "page", title: "Dashboard", subtitle: "Your desk", run: { kind: "path", path: "/dashboard" } },
  { id: "page:queries", group: "Pages", kind: "page", title: "Queries Hub", subtitle: "Every query and where it stands", run: { kind: "path", path: "/queries" } },
  { id: "page:todo", group: "Pages", kind: "page", title: "To-do", subtitle: "Urgent tasks and housekeeping", run: { kind: "path", path: "/todo" } },
  { id: "page:packages", group: "Pages", kind: "page", title: "Packages", subtitle: "Submission package workshop", run: { kind: "path", path: "/manuscripts/packages" } },
  { id: "page:agents", group: "Pages", kind: "page", title: "Agent list", subtitle: "Everyone you are querying", run: { kind: "path", path: "/agents" } },
  { id: "page:discover", group: "Pages", kind: "page", title: "Discover", subtitle: "Find new agents", run: { kind: "path", path: "/agents/discover" } },
  { id: "page:manuscripts", group: "Pages", kind: "page", title: "Manuscripts", subtitle: "Your shelf", run: { kind: "path", path: "/manuscripts" } },
  { id: "page:comps", group: "Pages", kind: "page", title: "Comparable titles", subtitle: "Find comps for your book", run: { kind: "path", path: "/manuscripts/comps" } },
  { id: "page:import", group: "Pages", kind: "page", title: "Import", subtitle: "Bring in queries from a spreadsheet", run: { kind: "path", path: "/import" } },
  { id: "page:account", group: "Pages", kind: "page", title: "Account", subtitle: "Your details and preferences", run: { kind: "path", path: "/account" } },
  { id: "page:plans", group: "Pages", kind: "page", title: "Plans", subtitle: "What Pro adds", run: { kind: "path", path: "/plans" } },
  // Task settings is a SHEET inside /todo, not a route — the existing reachability contract is
  // "navigate there, then dispatch the event", which is what the rail's flyout already does.
  { id: "page:task-settings", group: "Pages", kind: "page", title: "Task settings", subtitle: "Choose what appears on your to-do list", run: { kind: "path", path: "/todo" } },
  { id: "page:help", group: "Pages", kind: "page", title: "Help centre", subtitle: "Guides and answers", run: { kind: "path", path: "/help" } },
];

/** How many actions the empty state shows beneath Recent (mockup: the top four). */
export const EMPTY_ACTION_COUNT = 4;
/** How many recents the empty state shows (mockup: the last four things opened). */
export const RECENT_COUNT = 4;

/** Whole days between an ISO date and now, for a query's "9 days ago" line. */
function daysAgo(iso: string | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}

/** "9 days ago" / "today" / "1 day ago" — singular-safe, and honest about an undated query. */
function ageLine(iso: string | undefined, now: number): string | null {
  const d = daysAgo(iso, now);
  if (d === null) return null;
  if (d === 0) return "today";
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export interface CorpusInput {
  agents: { id: string; name?: string; agency?: string; city?: string }[];
  queries: { id: string; agentId: string; manuscriptId: string; status: string; dateSent?: string }[];
  manuscripts: { id: string; title: string; genre?: string; wordCount?: number }[];
  /** Injected so the age lines are deterministic in tests. */
  now: number;
  /** How an agent's name and agency read — the app's ONE display rule, passed in to keep this
   *  module free of component imports. */
  agentLabel: (a: { id: string; name?: string; agency?: string }) => { primary: string; secondary: string };
}

/**
 * BUILD THE CORPUS from already-loaded state. Order matters: it is the tie-break inside a group
 * (rankItems sorts by score, then by corpus position), so agents come before queries before
 * manuscripts before pages, and the fixed lists sit last.
 *
 * ⚠️ SECOND LINES CARRY CONTEXT, because a title alone is often ambiguous — two agents at the
 * same agency, a query whose agent you know but whose manuscript you don't. Agents show agency
 * and city; queries show manuscript and age; manuscripts show genre and word count.
 */
export function buildCorpus(input: CorpusInput): PaletteItem[] {
  const { agents, queries, manuscripts, now, agentLabel } = input;
  const msById = new Map(manuscripts.map((m) => [m.id, m]));
  const queryCount = new Map<string, number>();
  for (const q of queries) queryCount.set(q.manuscriptId, (queryCount.get(q.manuscriptId) ?? 0) + 1);

  const agentItems: PaletteItem[] = agents.map((a) => {
    const { primary, secondary } = agentLabel(a);
    const sub = [secondary, a.city].filter(Boolean).join(" · ");
    return {
      id: `agent:${a.id}`, group: "Agents", kind: "agent",
      title: primary, subtitle: sub || undefined,
      run: { kind: "agent", agentId: a.id, name: primary },
    };
  });

  const queryItems: PaletteItem[] = queries.map((q) => {
    const agent = agents.find((a) => a.id === q.agentId);
    const who = agent ? agentLabel(agent).primary : "Unknown agent";
    const ms = msById.get(q.manuscriptId);
    const age = ageLine(q.dateSent, now);
    const sub = [ms?.title, age].filter(Boolean).join(" · ");
    return {
      id: `query:${q.id}`, group: "Queries", kind: "query",
      // The status rides the TITLE so a search for "offer" finds the offers.
      title: `${who} — ${q.status}`,
      subtitle: sub || undefined,
      status: q.status,
      run: { kind: "query", queryId: q.id },
    };
  });

  const msItems: PaletteItem[] = manuscripts.map((m) => {
    const n = queryCount.get(m.id) ?? 0;
    const sub = [
      m.genre,
      m.wordCount ? `${m.wordCount.toLocaleString("en-GB")} words` : null,
      `${n} ${n === 1 ? "query" : "queries"}`,
    ].filter(Boolean).join(" · ");
    return {
      id: `ms:${m.id}`, group: "Manuscripts", kind: "ms",
      title: m.title, subtitle: sub,
      run: { kind: "path", path: "/manuscripts" },
    };
  });

  return [...agentItems, ...queryItems, ...msItems, ...PALETTE_ACTIONS, ...PALETTE_PAGES];
}

/**
 * NORMALISATION — case and punctuation are stripped from BOTH sides, so `orourke` finds
 * `O'Rourke` and `the marsh agency` matches however it was typed. This is why the raw
 * `indexOf` used for highlighting can miss when the match came from a normalised comparison;
 * `highlightParts` handles that by falling back to no highlight rather than a wrong one.
 */
export const normalise = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Ranking tiers — named, so a change is a decision rather than a nudged constant. */
export const RANK = {
  titlePrefix: 100,
  titleSubstring: 70,
  subtitleSubstring: 40,
  /** One adjacent transposition — the ordinary typo (`aisah` → `Aisha`). */
  typo: 30,
  /** The loosest tier. Report-flagged: this is the one to drop first if it gets noisy at scale. */
  looseSubsequence: 20,
  noMatch: -1,
} as const;

/**
 * Does swapping ONE adjacent pair of characters in the term make it a substring of the title?
 * This is what catches `aisah` → `Aisha`: a transposition is not a subsequence (the `h` never
 * comes back round), so the loose tier below cannot see it, and it is the single commonest typo
 * there is. Bounded by the term's length, which is a search box — cheap.
 */
function withinOneTransposition(title: string, term: string): boolean {
  for (let i = 0; i < term.length - 1; i += 1) {
    if (term[i] === term[i + 1]) continue; // swapping equal characters changes nothing
    const swapped = term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2);
    if (title.includes(swapped)) return true;
  }
  return false;
}

/**
 * Score one item against a term. RANKED, NOT FILTERED: everything that matches at all is kept
 * and ordered, so a weak match is at the bottom rather than absent.
 */
export function scoreItem(item: Pick<PaletteItem, "title" | "subtitle">, term: string): number {
  const t = normalise(term);
  if (!t) return 0;
  const title = normalise(item.title);
  const sub = normalise(item.subtitle ?? "");
  if (title.startsWith(t)) return RANK.titlePrefix;
  if (title.includes(t)) return RANK.titleSubstring;
  if (sub.includes(t)) return RANK.subtitleSubstring;
  if (withinOneTransposition(title, t)) return RANK.typo;
  // Loose subsequence over the TITLE only. Deliberately not run over subtitles: at that
  // looseness a subtitle match is noise, not a near-miss.
  let i = 0;
  for (const c of title) {
    if (c === t[i]) i += 1;
    if (i === t.length) return RANK.looseSubsequence;
  }
  return RANK.noMatch;
}

/**
 * Rank a corpus against a term and return it in group order. Sorting is score-desc, then the
 * corpus's own order — which is stable, so equal scores keep the order the corpus was built in
 * (agents before queries before pages) rather than shuffling between keystrokes.
 */
export function rankItems(corpus: PaletteItem[], term: string): PaletteItem[] {
  const t = term.trim();
  if (!t) return [];
  const scored = corpus
    .map((item, i) => ({ item, score: scoreItem(item, t), i }))
    .filter((x) => x.score > RANK.noMatch);
  scored.sort((a, b) => (b.score - a.score) || (a.i - b.i));
  const ranked = scored.map((x) => x.item);
  // JUMP TO rides above everything when an agent matched — computed from the RANKED list, so it
  // offers the agent the palette itself thinks you meant.
  const jump = jumpToItem(ranked);
  const all = jump ? [jump, ...ranked] : ranked;
  // Then lay them out in the canonical group order, keeping each group internally ranked.
  return GROUP_ORDER.flatMap((g) => all.filter((item) => item.group === g));
}

/**
 * JUMP TO — the contextual action. When the term matches an agent, offer to start a query with
 * them, above everything else.
 *
 * This is the difference between search as lookup and search as the fastest way to start work:
 * you were going to look the agent up and then go and log a query anyway, so the palette offers
 * the destination rather than the waypoint. It dispatches through the EXISTING preselect seam
 * (`LogQueryFocusForm`'s `initialAgentId`), so it opens the same form the rail's `+ Query` does,
 * already pointed at the right agent — no new form, no new handler.
 *
 * Takes the TOP-RANKED agent, not any agent: it is offering one obvious next step, and offering
 * five would be a second results list.
 */
export function jumpToItem(ranked: PaletteItem[]): PaletteItem | null {
  const agent = ranked.find((r) => r.group === "Agents" && r.run.kind === "agent");
  if (!agent || agent.run.kind !== "agent") return null;
  return {
    id: `jump:${agent.run.agentId}`,
    group: "Jump to",
    kind: "act",
    title: `Log a query to ${agent.run.name}`,
    subtitle: "Start a new query with this agent",
    shortcut: "⌘↵",
    run: { kind: "logQueryTo", agentId: agent.run.agentId, name: agent.run.name },
  };
}

/** One span of a title, flagged if it is the matched run. */
export interface HighlightPart { text: string; match: boolean; }

/**
 * Split a title around the matched substring for the burgundy mark. Uses the RAW (unnormalised)
 * text so the highlight lands on what the reader can see; when the match only exists after
 * normalisation (`orourke` vs `O'Rourke`) there is no honest span to mark, so it returns the
 * title whole rather than highlighting the wrong characters.
 */
export function highlightParts(title: string, term: string): HighlightPart[] {
  const t = term.trim();
  if (!t) return [{ text: title, match: false }];
  const i = title.toLowerCase().indexOf(t.toLowerCase());
  if (i < 0) return [{ text: title, match: false }];
  const parts: HighlightPart[] = [];
  if (i > 0) parts.push({ text: title.slice(0, i), match: false });
  parts.push({ text: title.slice(i, i + t.length), match: true });
  if (i + t.length < title.length) parts.push({ text: title.slice(i + t.length), match: false });
  return parts;
}

/**
 * THE EMPTY STATE — recents, then the top actions. A search box that opens blank is a search
 * box; one that opens with your recents and your common actions is a launcher, which is the
 * point. Recents are session-scoped and derived from what you actually opened (no stored field),
 * so on a cold start there are none and the actions stand alone.
 */
export function emptyStateItems(recent: PaletteItem[]): PaletteItem[] {
  return [
    ...recent.slice(0, RECENT_COUNT).map((r) => ({ ...r, group: "Recent" as const })),
    ...PALETTE_ACTIONS.slice(0, EMPTY_ACTION_COUNT),
  ];
}

/** Push an opened item onto the session's recents, newest first, de-duplicated by id. */
export function pushRecent(recent: PaletteItem[], item: PaletteItem): PaletteItem[] {
  return [item, ...recent.filter((r) => r.id !== item.id)].slice(0, RECENT_COUNT * 2);
}
