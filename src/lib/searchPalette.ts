/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * searchPalette — the pure core of ⌘K search (ref design-refs/search-v1/search-v1.html, approved 19 Nov). Corpus,
 * matching, grouping and highlighting, with no React and no data access: the palette passes in already-loaded state.
 *
 * ⚠️ THE MATCHING IS A PORT OF THE MOCK'S SCRIPT (`foldMap`, `tier`, `near`, `typo`, `score`, `hl`, `snippet`, and the
 * grouping in `search()`), which is the specification. Search v1 supersedes "Baked 20" wherever they disagree: the
 * group order, the empty state, recents, and the retired "Log a query to {agent}" row (⌘↵ does that now).
 *
 * ⚠️ EVERYTHING IS CLIENT-SIDE, over state DbProvider already subscribes to on every route. No server search, no
 * Firestore index, no new listener.
 *
 * ⚠️ AN ITEM'S ACTION IS DATA, NOT A FUNCTION (`PaletteRun`). The component owns dispatch, so the corpus stays
 * comparable and testable, and every action provably lands on an EXISTING handler.
 */
import { RailCaptureKey } from "../components/shell/railNav";
import { TODO_ROUTES } from "./todoRoutes";
import { workspaceSections } from "./workspaceNav";
import { stageOf } from "./stageColours";

/** What opening a row does. Data only — the palette component performs it. */
export type PaletteRun =
  /** One of the rail's capture contracts (Log a query, Record a response, Add an agent). */
  | { kind: "capture"; capture: RailCaptureKey }
  /** The legacy navigate bridge — tab + optional subpage. */
  | { kind: "navigate"; tab: string; sub?: string }
  /** Router-direct path navigation (pages). */
  | { kind: "path"; path: string }
  /** Deep-select a query on the hub — the existing onNavigate("queries", id) contract. */
  | { kind: "query"; queryId: string }
  /** The agent's card over the page you're on (lib/agentCardStore's openAgentCard). */
  | { kind: "agentCard"; agentId: string }
  /** Log a query, preselected to this agent — the existing initialAgentId seam. */
  | { kind: "logQueryTo"; agentId: string }
  /** Record a response for this query. */
  | { kind: "recordFor"; queryId: string }
  /** A task, a note, a letter or a package — Part D says how far each can be opened. */
  | { kind: "task"; taskId: string }
  | { kind: "note"; noteId: string }
  | { kind: "letter"; letterId: string }
  | { kind: "package"; packageId: string }
  /** A help article — `articleHref(slug)`. */
  | { kind: "help"; slug: string }
  /** Look for the term in the Help centre. */
  | { kind: "helpSearch"; term: string }
  /** The Queries page's own "Download all as CSV". */
  | { kind: "export" }
  /** lib/feedbackStore's openFeedback(). */
  | { kind: "feedback" }
  /** Tasks, then TODO_OPEN_TASK_SETTINGS — the account menu's contract. */
  | { kind: "taskSettings" }
  /** The new-agent card with the name filled in. */
  | { kind: "newAgent"; name: string };

export type PaletteKind = "agent" | "query" | "task" | "note" | "material" | "action" | "page" | "help";
export type PaletteGroup = "Agents" | "Queries" | "Tasks" | "Notes" | "Materials" | "Actions" | "Pages" | "Help";

/** The group headings as the palette prints them. The ids stay as they are. */
export const GROUP_LABEL: Record<PaletteGroup, string> = {
  Agents: "Agents",
  Queries: "Queries",
  Tasks: "Tasks",
  Notes: "Notes",
  Materials: "Materials",
  Actions: "Start something",
  Pages: "Go to",
  Help: "Help",
};

/** The fixed group order beneath the single Best match (search v1). */
export const GROUP_ORDER: PaletteGroup[] = [
  "Agents", "Queries", "Tasks", "Notes", "Materials", "Actions", "Pages", "Help",
];

/** The plural a "Show all" row names. */
export const GROUP_NOUN: Record<PaletteGroup, string> = {
  Agents: "agents", Queries: "queries", Tasks: "tasks", Notes: "notes", Materials: "materials",
  Actions: "actions", Pages: "pages", Help: "help articles",
};

/** Everything, or one group. The chips name seven of them; "Show all" can choose Actions or Pages too. */
export type PaletteScope = "all" | PaletteGroup;
export const SCOPE_CHIPS: { scope: PaletteScope; label: string }[] = [
  { scope: "all", label: "Everything" },
  { scope: "Agents", label: "Agents" },
  { scope: "Queries", label: "Queries" },
  { scope: "Tasks", label: "Tasks" },
  { scope: "Notes", label: "Notes" },
  { scope: "Materials", label: "Materials" },
  { scope: "Help", label: "Help" },
];

/** Four each for Agents and Queries under Everything, three for the others. */
export const GROUP_CAP: Record<PaletteGroup, number> = {
  Agents: 4, Queries: 4, Tasks: 3, Notes: 3, Materials: 3, Actions: 3, Pages: 3, Help: 3,
};

/** Text the row is matched on but does not show unless it matched (a wishlist, genres, an article's body). */
export interface PaletteExtra { label: string; text: string; }

export interface PaletteItem {
  /** Stable within a session — the aria-activedescendant target and the recents key. */
  id: string;
  group: PaletteGroup;
  kind: PaletteKind;
  title: string;
  subtitle?: string;
  /** Matched, never shown: a query's status and state words, a page's other names. */
  keywords?: string;
  /** Matched only for words of three letters or more, shown as "Label: …snippet…" when they are what matched. */
  extra?: PaletteExtra[];
  /** A query's agency, scored 1.5. */
  agency?: string;
  /** A query's second line when the agency is what matched ("{agency} · queried {date}"). */
  agencyLine?: string;
  /** The agent an agent row is, or a query row is to — for "one row per agent". */
  agentId?: string;
  /** Query rows (and agent rows with a query on the active manuscript) carry the status for the real StatusDot. */
  status?: string;
  /** Shown, never chosen (Add a manuscript while the beta allows one). */
  soon?: boolean;
  /** Built for this term (the no-match rows) — shown as typed, never highlighted, never recorded. */
  made?: boolean;
  run: PaletteRun;
  /** ⌘↵ — the likely next thing, when the row has one. */
  second?: { label: string; run: PaletteRun };
  /** What the peek shows when the row is selected. */
  peek?: PalettePeek;
  /** A note's paper colour (its tile and its peek). */
  colour?: string;
  /** A material row's kind. */
  materialKind?: "letter" | "package";
}

/* ─────────────────────────────────── matching (the mock's script, ported) ─────────────────────────────────── */

/**
 * FOLD a string for matching, keeping a map from each folded character back to its index in the raw string, so a
 * highlight lands on the text the reader sees. Lower-case; accents stripped (NFD, then U+0300–U+036F removed);
 * apostrophes, straight and curly, dropped; every other non-alphanumeric becomes a space.
 */
export function foldMap(s: string): { out: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i += 1) {
    const c = s[i].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (c === "'" || c === "’") continue;
    for (const ch of c) {
      out += /[a-z0-9]/.test(ch) ? ch : " ";
      map.push(i);
    }
  }
  return { out, map };
}

export const fold = (s: string): string => foldMap(s).out;

/** The typed term's words, folded. Every one must match somewhere on the row. */
export const tokens = (s: string): string[] => fold(s).split(/\s+/).filter(Boolean);

/** Where on a row a word matched — decides "one row per agent" and how the second line reads. */
export type MatchWhere = "title" | "sub" | "agency" | "kw" | "extra";

export const SCORE = {
  /** Title starts with the word. */
  start: 3,
  /** A word in the title starts with it. */
  wordStart: 2,
  /** Inside the title (never for a one-letter word). */
  inside: 1,
  /** The second line, same three tiers, half a point back. */
  subtitlePenalty: 0.5,
  /** A query's agency. */
  agency: 1.5,
  /** Keywords: a query's, an action's or a page's, and everything else's. */
  kwQuery: 2,
  kwActionPage: 1.2,
  kwOther: 0.7,
  /** Extra text — only for words of three letters or more. */
  extra: 0.6,
  /** A slipped letter, tried only when nothing matches as typed. */
  slipped: 0.4,
} as const;

/** The small lean by kind, added to a row's sum. */
export const KIND_LEAN: Record<PaletteKind, number> = {
  agent: 0.5, query: 0.45, action: 0.3, page: 0.25, task: 0.2, note: 0.1, material: 0.1, help: -0.8,
};

/** The three tiers of one folded word against one text: start 3, word start 2, inside 1 (two letters or more). */
export function tier(text: string | undefined, tok: string): number {
  if (!text) return 0;
  const f = fold(text).trim();
  if (f.startsWith(tok)) return SCORE.start;
  if (f.split(/\s+/).some((w) => w.startsWith(tok))) return SCORE.wordStart;
  if (tok.length > 1 && f.replace(/\s+/g, "").includes(tok)) return SCORE.inside;
  return 0;
}

/** One slipped, swapped, missing or extra letter between two words. */
export function near(a: string, b: string): boolean {
  if (a === b) return true;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  while (i < la && i < lb && a[i] === b[i]) i += 1;
  if (la === lb) {
    if (a.slice(i + 1) === b.slice(i + 1)) return true;
    return a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2);
  }
  return la > lb ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}

/** A slipped letter against the start of any word in a title — words of four letters or more only. */
export function slipped(title: string, tok: string): boolean {
  if (tok.length < 4) return false;
  return fold(title).split(/\s+/).some((w) => w.length >= tok.length - 1
    && [tok.length - 1, tok.length, tok.length + 1].some((n) => n > 0 && near(tok, w.slice(0, n))));
}

export interface MatchInfo {
  total: number;
  /** Where each word matched, in word order. */
  where: MatchWhere[];
  /** The extra text that matched, when one did. */
  extraHit?: PaletteExtra;
}

/**
 * Score one row against the folded words. Null when any word matches nowhere — every word must match. `loose` allows
 * the slipped-letter fallback for agent and query names.
 */
export function scoreItem(item: PaletteItem, toks: string[], loose = false): MatchInfo | null {
  let total = KIND_LEAN[item.kind] ?? 0;
  const where: MatchWhere[] = [];
  let extraHit: PaletteExtra | undefined;
  for (const tok of toks) {
    let best = 0;
    let w: MatchWhere = "title";
    const t1 = tier(item.title, tok);
    if (t1 > best) { best = t1; w = "title"; }
    const t2 = tier(item.subtitle, tok) - SCORE.subtitlePenalty;
    if (t2 > best) { best = t2; w = "sub"; }
    if (item.kind === "query" && tier(item.agency, tok) > 0 && SCORE.agency > best) { best = SCORE.agency; w = "agency"; }
    const kwv = item.kind === "query" ? SCORE.kwQuery
      : item.kind === "action" || item.kind === "page" ? SCORE.kwActionPage : SCORE.kwOther;
    if (tier(item.keywords, tok) > 0 && kwv > best) { best = kwv; w = "kw"; }
    for (const ex of item.extra ?? []) {
      if (tok.length > 2 && tier(ex.text, tok) > 0 && SCORE.extra > best) { best = SCORE.extra; w = "extra"; extraHit = ex; }
    }
    if (best === 0 && loose && (item.kind === "agent" || item.kind === "query") && slipped(item.title, tok)) {
      best = SCORE.slipped; w = "title";
    }
    if (best === 0) return null;
    total += best;
    where.push(w);
  }
  return { total, where, extraHit };
}

/** One span of text, flagged if it is a matched run. */
export interface HighlightPart { text: string; match: boolean; }

/** A word as a literal pattern — folded words are [a-z0-9] only, but a pattern is never built from raw input. */
const literal = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Mark every matched word on the RAW text: each word marks its first word-start occurrence, or (two letters or more)
 * its first occurrence anywhere, mapped back through `foldMap`.
 */
export function highlightParts(text: string, toks: string[]): HighlightPart[] {
  if (!toks.length || !text) return [{ text, match: false }];
  const { out, map } = foldMap(text);
  const ranges: [number, number][] = [];
  for (const tok of toks) {
    let i = -1;
    const m = new RegExp(`(^| )${literal(tok)}`).exec(out);
    if (m) i = m.index + m[1].length;
    else if (tok.length > 1) i = out.indexOf(tok);
    if (i >= 0) ranges.push([map[i], map[i + tok.length - 1] + 1]);
  }
  if (!ranges.length) return [{ text, match: false }];
  ranges.sort((a, b) => a[0] - b[0]);
  const parts: HighlightPart[] = [];
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue;
    if (s > pos) parts.push({ text: text.slice(pos, s), match: false });
    parts.push({ text: text.slice(s, e), match: true });
    pos = e;
  }
  if (pos < text.length) parts.push({ text: text.slice(pos), match: false });
  return parts;
}

/** The words around the first match in a long text, from a word boundary about 22 characters before it, marked. */
export function snippetParts(text: string, toks: string[]): HighlightPart[] {
  const { out, map } = foldMap(text);
  let i = -1;
  for (const t of toks) {
    const j = out.indexOf(t);
    if (j >= 0) { i = map[j]; break; }
  }
  if (i < 0) return highlightParts(text, toks);
  let s = Math.max(0, i - 22);
  if (s > 0) {
    const sp = text.indexOf(" ", s);
    if (sp >= 0 && sp < i) s = sp + 1;
  }
  const parts = highlightParts(text.slice(s), toks);
  return s > 0 ? [{ text: "…", match: false }, ...parts] : parts;
}

/** The second line as a matched row shows it: the extra text's snippet, the agency line, or the subtitle marked. */
export function secondLineParts(item: PaletteItem, match: MatchInfo | undefined, toks: string[]):
  { label?: string; parts: HighlightPart[] } | null {
  if (item.made) return item.subtitle ? { parts: [{ text: item.subtitle, match: false }] } : null;
  if (match?.extraHit && item.kind !== "help") {
    return { label: match.extraHit.label, parts: snippetParts(match.extraHit.text, toks) };
  }
  if (item.kind === "query" && match?.where.includes("agency") && item.agencyLine) {
    return { parts: highlightParts(item.agencyLine, toks) };
  }
  return item.subtitle ? { parts: highlightParts(item.subtitle, toks) } : null;
}

/* ──────────────────────────────────────────── grouping ──────────────────────────────────────────── */

export type PaletteRow =
  | { type: "head"; label: string; count?: number }
  | { type: "item"; item: PaletteItem; match?: MatchInfo }
  /** "Show all {n} {noun}" — chooses that group's scope. `scope: "all"` is "Show all {n} in Everything". */
  | { type: "more"; scope: PaletteScope; label: string; n: number }
  /** "See these {n} on the {Agents|Queries} page", at the end of a scoped list. */
  | { type: "handoff"; scope: "Agents" | "Queries"; label: string; n: number }
  /** The no-match message. `inScope` when a scope has nothing and Everything has `elsewhere`. */
  | { type: "none"; term: string; words: number; inScope?: PaletteScope; elsewhere?: number };

export interface PaletteResult {
  rows: PaletteRow[];
  /** Matches per group — every item per group when there is no term. */
  counts: Partial<Record<PaletteGroup, number>>;
  /** Matches in all, or null when there is no term. */
  total: number | null;
  toks: string[];
}

export const isSelectable = (r: PaletteRow | undefined): boolean =>
  !!r && ((r.type === "item" && !r.item.soon) || r.type === "more" || r.type === "handoff");

/** Title case for the "Add “{Term}” as an agent" row. */
const titleCase = (s: string) => s.replace(/(^|\s)(\S)/g, (_m, a: string, c: string) => a + c.toUpperCase());

/** The no-match rows: add the term as an agent, or look for it in the Help centre. */
export function noMatchItems(term: string): PaletteItem[] {
  const name = term.trim().replace(/\s+/g, " ");
  const nice = titleCase(name);
  return [
    {
      id: "made:new-agent", group: "Actions", kind: "action", made: true,
      title: `Add “${nice}” as an agent`, subtitle: "Opens a new agent card with the name filled in",
      run: { kind: "newAgent", name: nice },
    },
    {
      id: "made:help-find", group: "Help", kind: "help", made: true,
      title: `Look for “${name}” in the Help centre`, subtitle: "Guides and answers",
      run: { kind: "helpSearch", term: name },
    },
  ];
}

export interface SearchOptions {
  /** Recently opened ids, newest first — the "Jump back in" rows. Missing records are skipped. */
  recents?: string[];
}

/** Before you type: "Start something" is these three; with nothing opened yet, "Go to" is these four. */
export const START_IDS = ["act:query", "act:record", "act:agent"];
export const DAY_ONE_PAGE_IDS = ["page:dashboard", "page:queries", "page:agents", "page:todo"];
export const RECENT_SHOWN = 4;

/**
 * SEARCH — the rows to draw for a term and a scope (the mock's `search()`).
 *
 * With Everything: a single Best match, then the rest by group in GROUP_ORDER, capped, each capped group ending with a
 * "Show all" row. With a scope: that group only, uncapped, no Best match; Agents and Queries end with a hand-off row.
 * A slipped letter is tried only when nothing matches as typed. One row per agent: a query is listed apart only when
 * the words say something about the query.
 */
export function searchPalette(corpus: PaletteItem[], term: string, scope: PaletteScope, opts: SearchOptions = {}): PaletteResult {
  const toks = tokens(term);
  const rows: PaletteRow[] = [];
  const counts: Partial<Record<PaletteGroup, number>> = {};

  if (!toks.length) {
    for (const it of corpus) counts[it.group] = (counts[it.group] ?? 0) + 1;
    const byId = new Map(corpus.map((it) => [it.id, it]));
    const pick = (ids: string[]) => ids.map((id) => byId.get(id)).filter((x): x is PaletteItem => !!x);
    if (scope === "all") {
      const rec = pick(opts.recents ?? []).slice(0, RECENT_SHOWN);
      if (rec.length) {
        rows.push({ type: "head", label: "Jump back in" });
        for (const it of rec) rows.push({ type: "item", item: it });
      }
      rows.push({ type: "head", label: GROUP_LABEL.Actions });
      for (const it of pick(START_IDS)) rows.push({ type: "item", item: it });
      if (!rec.length) {
        rows.push({ type: "head", label: GROUP_LABEL.Pages });
        for (const it of pick(DAY_ONE_PAGE_IDS)) rows.push({ type: "item", item: it });
      }
    } else {
      rows.push({ type: "head", label: GROUP_LABEL[scope] });
      for (const it of corpus.filter((x) => x.group === scope)) rows.push({ type: "item", item: it });
    }
    return { rows, counts, total: null, toks };
  }

  let hits: { item: PaletteItem; m: MatchInfo; i: number }[] = [];
  corpus.forEach((item, i) => { const m = scoreItem(item, toks); if (m) hits.push({ item, m, i }); });
  /* a slipped letter only counts when nothing matches as typed */
  if (!hits.length) corpus.forEach((item, i) => { const m = scoreItem(item, toks, true); if (m) hits.push({ item, m, i }); });

  /* one row per agent: a query is listed apart only when the words say something about the query */
  const agentIds = new Set(hits.filter((h) => h.item.kind === "agent").map((h) => h.item.agentId));
  hits = hits.filter((h) => !(h.item.kind === "query" && h.item.agentId && agentIds.has(h.item.agentId)
    && h.m.where.every((w) => w === "title" || w === "agency")));
  hits.sort((a, b) => (b.m.total - a.m.total) || (a.i - b.i));
  for (const h of hits) counts[h.item.group] = (counts[h.item.group] ?? 0) + 1;
  const total = hits.length;

  if (!total) {
    rows.push({ type: "none", term: term.trim().replace(/\s+/g, " "), words: toks.length });
    rows.push({ type: "head", label: "From here" });
    for (const it of noMatchItems(term)) rows.push({ type: "item", item: it });
    return { rows, counts, total: 0, toks };
  }

  const inScope = scope === "all" ? hits : hits.filter((h) => h.item.group === scope);
  if (scope !== "all" && !inScope.length) {
    rows.push({ type: "none", term: term.trim(), words: toks.length, inScope: scope, elsewhere: total });
    rows.push({ type: "more", scope: "all", label: `Show all ${total} in Everything`, n: total });
    return { rows, counts, total, toks };
  }

  let rest = inScope;
  if (scope === "all") {
    const top = inScope.find((h) => !h.item.soon);
    if (top) {
      rows.push({ type: "head", label: "Best match" });
      rows.push({ type: "item", item: top.item, match: top.m });
      rest = inScope.filter((h) => h !== top);
    }
  }
  for (const g of scope === "all" ? GROUP_ORDER : [scope]) {
    const gh = rest.filter((h) => h.item.group === g);
    if (!gh.length) continue;
    const cap = scope === "all" ? GROUP_CAP[g] : Infinity;
    const capped = gh.length > cap;
    /* the heading and the "Show all" row name the group's whole count, Best match included */
    const n = counts[g] ?? gh.length;
    rows.push(capped ? { type: "head", label: GROUP_LABEL[g], count: n } : { type: "head", label: GROUP_LABEL[g] });
    for (const h of gh.slice(0, cap)) rows.push({ type: "item", item: h.item, match: h.m });
    if (capped) rows.push({ type: "more", scope: g, label: `Show all ${n} ${GROUP_NOUN[g]}`, n });
  }
  if (scope === "Agents" || scope === "Queries") {
    rows.push({ type: "handoff", scope, label: `See these ${inScope.length} on the ${scope} page`, n: inScope.length });
  }
  return { rows, counts, total, toks };
}

/* ──────────────────────────────────────────── the corpus ──────────────────────────────────────────── */

/** THE ACTIONS, in order. Every one dispatches to a handler that already exists. */
export const PALETTE_ACTIONS: PaletteItem[] = [
  {
    id: "act:query", group: "Actions", kind: "action",
    /* the second line names the active manuscript at render time ("for Murphy's Day Out") — the corpus has no user state */
    title: "Log a query", subtitle: "Start a new query", keywords: "new add send submit",
    run: { kind: "capture", capture: "query" },
  },
  {
    id: "act:record", group: "Actions", kind: "action",
    title: "Record a response", subtitle: "Log what an agent said",
    keywords: "reply rejection request offer heard back answer",
    run: { kind: "capture", capture: "record" },
  },
  {
    id: "act:agent", group: "Actions", kind: "action",
    title: "Add an agent", subtitle: "Put someone new on your list", keywords: "new contact create",
    run: { kind: "capture", capture: "agent" },
  },
  {
    id: "act:import", group: "Actions", kind: "action",
    title: "Import from a spreadsheet", subtitle: "Bring your tracker in", keywords: "csv excel smart import tracker upload",
    run: { kind: "path", path: "/import" },
  },
  {
    id: "act:export", group: "Actions", kind: "action",
    title: "Export your queries", subtitle: "Download them as a CSV file", keywords: "csv download backup spreadsheet",
    run: { kind: "export" },
  },
  {
    id: "act:feedback", group: "Actions", kind: "action",
    title: "Give feedback", subtitle: "Tell us what’s broken or missing", keywords: "bug idea report problem suggestion",
    run: { kind: "feedback" },
  },
  {
    id: "act:manuscript", group: "Actions", kind: "action",
    title: "Add a manuscript", subtitle: "One manuscript during the beta", keywords: "new book project", soon: true,
    run: { kind: "navigate", tab: "manuscripts", sub: "Add a manuscript" },
  },
];

/*
 * THE PAGES — the workspace nav, in its order and by its own labels, plus the pages outside it. Ids, blurbs and
 * keywords stay keyed by path here: an id is an identifier and a blurb is the palette's own job. A nav page with no
 * entry below still appears, with no blurb, rather than silently going missing.
 */
const NAV_PAGE_META: Readonly<Record<string, { id: string; subtitle: string; keywords?: string }>> = {
  "/dashboard": { id: "page:dashboard", subtitle: "Your desk" },
  "/queries": { id: "page:queries", subtitle: "Every query and where it stands", keywords: "queries query centre birds-eye" },
  "/queries/responses": { id: "page:responses", subtitle: "Every answer from agents", keywords: "replies rejections rejection collection answers" },
  "/queries/analytics": { id: "page:analytics", subtitle: "How your querying is going", keywords: "stats charts numbers" },
  "/agents": { id: "page:agents", subtitle: "Everyone you are querying", keywords: "agents contact list contacts" },
  "/agents/discover": { id: "page:discover", subtitle: "Find new agents", keywords: "scout community" },
  "/manuscripts": { id: "page:manuscripts", subtitle: "Your shelf", keywords: "manuscript manuscripts book synopsis" },
  "/materials/letters": { id: "page:letters", subtitle: "Your query letters", keywords: "letters query letters materials" },
  "/queries/packages": { id: "page:packages", subtitle: "Submission package workshop", keywords: "packages submission packages materials" },
  "/manuscripts/versions": { id: "page:versions", subtitle: "Every version of your book, and what each one landed", keywords: "drafts revisions" },
  "/manuscripts/comps": { id: "page:comps", subtitle: "Find comps for your book", keywords: "comps comparable titles" },
  "/your-notes": { id: "page:your-notes", subtitle: "Everything you’ve told us, and what happened", keywords: "feedback" },
  ...Object.fromEntries(TODO_ROUTES.map((r) => [r.path, {
    id: r.id === "list" ? "page:todo" : `page:todo-${r.id}`, subtitle: r.blurb,
    keywords: r.id === "list" ? "tasks todo to-do reminders" : r.id === "noteboard" ? "corkboard notes noteboard stacks" : undefined,
  }])),
};

const NAV_PAGES: PaletteItem[] = workspaceSections({ todo: 0 }).flatMap((sec) => (sec.children ?? []).map((ch): PaletteItem => {
  const meta = NAV_PAGE_META[ch.path];
  return {
    id: meta?.id ?? `page:${ch.id}`, group: "Pages", kind: "page", title: ch.label, subtitle: meta?.subtitle ?? "",
    keywords: meta?.keywords, run: { kind: "path", path: ch.path },
  };
}));

export const PALETTE_PAGES: PaletteItem[] = [
  ...NAV_PAGES,
  /* Shell nav v3 (13 Nov): Your notes left the nav's sections, so the palette names it here */
  { id: "page:your-notes", group: "Pages", kind: "page", title: "Your notes", subtitle: NAV_PAGE_META["/your-notes"].subtitle, keywords: NAV_PAGE_META["/your-notes"].keywords, run: { kind: "path", path: "/your-notes" } },
  { id: "page:import", group: "Pages", kind: "page", title: "Import", subtitle: "Bring in queries from a spreadsheet", keywords: "smart import template csv excel", run: { kind: "path", path: "/import" } },
  { id: "page:account", group: "Pages", kind: "page", title: "Account", subtitle: "Your details and preferences", keywords: "settings password email profile", run: { kind: "path", path: "/account" } },
  { id: "page:plans", group: "Pages", kind: "page", title: "Plans", subtitle: "What Pro adds", keywords: "pro pricing upgrade", run: { kind: "path", path: "/plans" } },
  /* Task settings is a SHEET inside /todo, not a route: go there, then dispatch the event the account menu uses */
  { id: "page:task-settings", group: "Pages", kind: "page", title: "Task settings", subtitle: "Choose what appears on your to-do list", keywords: "settings", run: { kind: "taskSettings" } },
  { id: "page:help", group: "Pages", kind: "page", title: "Help centre", subtitle: "Guides and answers", keywords: "help support guide", run: { kind: "path", path: "/help" } },
];

/** One labelled fact in the peek: a 13px label over a 15px value, with an optional quieter line. */
export interface PeekFact { label: string; value: string; line?: string | null; wide?: boolean }

/** What the peek shows for a row — data only, worded from the app's own helpers when the corpus is built. */
export type PalettePeek =
  | { kind: "agent"; sub: string; status?: string; queriedLine?: string; manuscript: string; facts: PeekFact[] }
  | { kind: "query"; status: string; who: string; facts: PeekFact[] }
  | { kind: "task"; text: string; facts: PeekFact[] }
  | { kind: "note"; text: string; colour: string }
  | { kind: "material"; sub: string; facts: PeekFact[] }
  | { kind: "text"; text: string };

/** "Not stated", as elsewhere, for an absent value. */
export const NOT_STATED = "Not stated";

/** The pieces of a query row the corpus reads — the Query Centre's own stamped row, built by the host. */
export interface QueryRowFacts {
  /** "14 Sep" — the card's Sent value (lib/qc153 queriedFact). */
  sent: string | null;
  /** "9 days ago" — the card's Sent line. */
  sentLine: string | null;
  sentMs: number | null;
  /** The card's Next box, as worded there (lib/qc154 nextBox154). */
  next: { label: string; value: string; line: string | null };
  /** The card's Last heard box (lib/qc153 heardFact). */
  heard: { value: string; line: string | null };
  /** Gone quiet, by the Query Centre's own test (lib/qc154 isQuietCard). */
  quiet: boolean;
  /** Whose move: the row's court (lib/qcSummary courtOf). */
  court: "you" | "agent" | "offer" | "closed";
}

export interface CorpusAgent {
  id: string; name?: string; agency?: string; city?: string; genres?: string[] | string; mswlNotes?: string;
  submissionStatus?: string; responseTimeWeeks?: number; materialsWanted?: string[];
}
export interface CorpusQuery { id: string; agentId: string; manuscriptId: string; status: string; packageId?: string }

export interface CorpusInput {
  agents: CorpusAgent[];
  queries: CorpusQuery[];
  /** How an agent's name and agency read — the app's ONE display rule, passed in. */
  agentLabel: (a: { id: string; name?: string; agency?: string }) => { primary: string; secondary: string };
  /** The Query Centre's stamped row facts, by query id. Absent: no state words, no dates. */
  rows?: ReadonlyMap<string, QueryRowFacts>;
  /** Their policy as worded on the card, by agent id. */
  policy?: (agentId: string) => { value: string; line: string | null } | null;
  /** The active manuscript — an agent row's chip and peek are its query on this one. */
  activeManuscriptId?: string | null;
  activeManuscriptTitle?: string;
  /** Package names by id (every package — a query's line names the one it went with). */
  packageNames?: ReadonlyMap<string, string>;
  /** The tasks the To-do list shows today (its own selector), already worded. */
  tasks?: { key: string; title: string; due: string | null; about: string | null }[];
  /** The Corkboard's notes, with their paper colour resolved. */
  notes?: { id: string; text: string; colour: string }[];
  /** Live letters and live packages for the active manuscript, with the lines their pages show. */
  letters?: { id: string; name: string; line: string; facts: PeekFact[] }[];
  packages?: { id: string; name: string; line: string; facts: PeekFact[] }[];
  /** Help articles: title, slug, and the body as plain text. */
  help?: { slug: string; title: string; body: string; lede?: string }[];
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];

/**
 * THE STATE WORDS a query is found by — read off the Query Centre's own row (its court and its quiet test), never a
 * second calculation.
 */
export function stateWords(r: Pick<QueryRowFacts, "court" | "quiet"> | undefined): string {
  if (!r) return "";
  if (r.quiet) return "gone quiet nudge";
  if (r.court === "closed") return "closed";
  if (r.court === "agent") return "with the agent waiting";
  return "your move with you needs you";
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** BUILD THE CORPUS from already-loaded state. Order matters: it is the tie-break (score, then corpus position). */
export function buildCorpus(input: CorpusInput): PaletteItem[] {
  const { agents, queries, agentLabel, rows, policy, activeManuscriptId, packageNames } = input;
  const ms = input.activeManuscriptTitle ?? "this manuscript";
  const agentById = new Map(agents.map((a) => [a.id, a]));
  const activeQueryOf = new Map<string, CorpusQuery>();
  for (const q of queries) if (activeManuscriptId && q.manuscriptId === activeManuscriptId && !activeQueryOf.has(q.agentId)) activeQueryOf.set(q.agentId, q);

  const agentItems: PaletteItem[] = agents.map((a) => {
    const { primary, secondary } = agentLabel(a);
    const sub = [secondary, a.city].filter(Boolean).join(" · ");
    const genres = Array.isArray(a.genres) ? a.genres.join(", ") : a.genres;
    const extra: PaletteExtra[] = [];
    if (a.mswlNotes) extra.push({ label: "Wishlist", text: a.mswlNotes });
    if (genres) extra.push({ label: "Genres", text: genres });
    const q = activeQueryOf.get(a.id);
    const r = q ? rows?.get(q.id) : undefined;
    const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? Math.round(a.responseTimeWeeks) : null;
    const facts: PeekFact[] = [
      { label: "Submissions", value: a.submissionStatus === "Open" || a.submissionStatus === "Closed" ? a.submissionStatus : NOT_STATED },
      { label: "Usually replies in", value: weeks ? `About ${weeks} week${weeks === 1 ? "" : "s"}` : NOT_STATED },
      { label: "Asks for", value: a.materialsWanted?.length ? a.materialsWanted.join(", ") : NOT_STATED, wide: true },
    ];
    return {
      id: `agent:${a.id}`, group: "Agents", kind: "agent", agentId: a.id,
      title: primary, subtitle: sub || undefined, extra, status: q?.status,
      run: { kind: "agentCard", agentId: a.id },
      second: q
        ? { label: "Open the query", run: { kind: "query", queryId: q.id } }
        : { label: `Log a query to ${firstName(primary)}`, run: { kind: "logQueryTo", agentId: a.id } },
      peek: {
        kind: "agent", sub: [secondary, a.city].filter(Boolean).join(", "), status: q?.status, manuscript: ms,
        queriedLine: q ? (r?.sent ? `Queried ${r.sent} for ${ms}` : `Queried for ${ms}`) : undefined, facts,
      },
    };
  });

  const queryItems: PaletteItem[] = queries.map((q) => {
    const agent = agentById.get(q.agentId);
    const who = agent ? agentLabel(agent).primary : "Unknown agent";
    const r = rows?.get(q.id);
    const pkg = q.packageId ? packageNames?.get(q.packageId) : undefined;
    const sentBit = r?.sent ? `queried ${r.sent}` : "queried";
    const lead = r?.quiet ? `Gone quiet · ${sentBit}` : sentBit.charAt(0).toUpperCase() + sentBit.slice(1);
    const subtitle = [lead, pkg].filter(Boolean).join(" · ");
    const month = r?.sentMs != null ? MONTHS[new Date(r.sentMs).getMonth()] : "";
    const pol = policy?.(q.agentId);
    const closed = r ? r.court === "closed" : false;
    return {
      id: `query:${q.id}`, group: "Queries", kind: "query", agentId: q.agentId,
      title: who, subtitle,
      keywords: [q.status, stageWord(q.status), stateWords(r), month, pkg].filter(Boolean).join(" "),
      agency: agent?.agency,
      agencyLine: agent?.agency ? [agent.agency, r?.sent ? `queried ${r.sent}` : null].filter(Boolean).join(" · ") : undefined,
      status: q.status,
      run: { kind: "query", queryId: q.id },
      second: closed ? undefined : { label: "Record a response", run: { kind: "recordFor", queryId: q.id } },
      peek: {
        kind: "query", status: q.status, who: [who, agent?.agency].filter(Boolean).join(", "),
        facts: [
          { label: "Sent", value: [r?.sent ?? NOT_STATED, pkg].filter(Boolean).join(" · "), line: r?.sentLine ?? null },
          { label: r?.next.label ?? "Next", value: r?.next.value ?? NOT_STATED, line: r?.next.line ?? null },
          { label: "Last heard", value: r?.heard.value ?? NOT_STATED, line: r?.heard.line ?? null, wide: true },
          { label: "Their policy", value: pol && pol.value !== "—" ? pol.value : NOT_STATED, line: pol?.line ?? null, wide: true },
        ],
      },
    };
  });

  const taskItems: PaletteItem[] = (input.tasks ?? []).map((t) => ({
    id: `task:${t.key}`, group: "Tasks", kind: "task",
    title: t.title, subtitle: t.due ? `Due ${t.due}` : "No date", keywords: "task to-do todo",
    run: { kind: "task", taskId: t.key },
    peek: { kind: "task", text: t.title, facts: [{ label: "Due", value: t.due ?? "No date" }, { label: "About", value: t.about ?? "Nothing linked" }] },
  }));
  const noteItems: PaletteItem[] = (input.notes ?? []).map((n) => ({
    id: `note:${n.id}`, group: "Notes", kind: "note",
    title: n.text, subtitle: "On your Corkboard", keywords: "note", colour: n.colour,
    run: { kind: "note", noteId: n.id },
    peek: { kind: "note", text: n.text, colour: n.colour },
  }));
  const materialItems: PaletteItem[] = [
    ...(input.letters ?? []).map((l): PaletteItem => ({
      id: `letter:${l.id}`, group: "Materials", kind: "material", materialKind: "letter",
      title: l.name, subtitle: `Query letter · ${l.line}`, keywords: "query letter materials",
      run: { kind: "letter", letterId: l.id }, peek: { kind: "material", sub: "Query letter", facts: l.facts },
    })),
    ...(input.packages ?? []).map((p): PaletteItem => ({
      id: `package:${p.id}`, group: "Materials", kind: "material", materialKind: "package",
      title: p.name, subtitle: `Package · ${p.line}`, keywords: "package materials",
      run: { kind: "package", packageId: p.id }, peek: { kind: "material", sub: "Package", facts: p.facts },
    })),
  ];
  const helpItems: PaletteItem[] = (input.help ?? []).map((h) => ({
    id: `help:${h.slug}`, group: "Help", kind: "help",
    title: h.title, subtitle: "Help centre", keywords: "help guide", extra: h.body ? [{ label: "", text: h.body }] : [],
    run: { kind: "help", slug: h.slug },
    peek: { kind: "text", text: h.lede || h.body.slice(0, 280) },
  }));

  return [...agentItems, ...queryItems, ...taskItems, ...noteItems, ...materialItems, ...PALETTE_ACTIONS, ...PALETTE_PAGES, ...helpItems];
}

/** The stage a status is in, as a word to be found by ("full", "partial", "offer"…). */
const stageWord = (status: string): string => stageOf(status);
