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

/** How many actions the empty state shows beneath Recent (mockup: the top four). */
export const EMPTY_ACTION_COUNT = 4;
/** How many recents the empty state shows (mockup: the last four things opened). */
export const RECENT_COUNT = 4;

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
  // Then lay them out in the canonical group order, keeping each group internally ranked.
  return GROUP_ORDER.flatMap((g) => ranked.filter((item) => item.group === g));
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
