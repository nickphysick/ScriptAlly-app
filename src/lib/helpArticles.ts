/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — THE ARTICLE MAP: the help articles this pack links to, which three a page offers under "On this
 * page" in the Help menu, which one each guide item's "Learn more" opens, and the What's new entries.
 *
 * Help Centre v1 — THE INDEX IS BUILT FROM THE ARTICLES THEMSELVES (`content/help/articles.ts`): every PUBLISHED
 *    article is live (non-workspace v1, Phase 7: a draft is not), its read time is computed from its words, and a slug
 *    a guide item or the Help menu names must be written (lock HC1-C5). A link to a slug that is not published goes to
 *    /help, never to the not-found screen: the Help menu leaves a draft out, and "Learn more" opens the Help centre.
 */
import { HELP_ARTICLE_LIST } from "../content/help/articles";
import { readTime } from "../content/help/model";

export interface HelpArticle {
  slug: string;
  title: string;
  /** "1 min", "30 sec" */
  read: string;
}

export const HELP_ARTICLES: Record<string, HelpArticle> = Object.fromEntries(
  HELP_ARTICLE_LIST.map((a) => [a.slug, { slug: a.slug, title: a.title, read: readTime(a) }]),
);

/** The slugs with a page in the Help Centre: every article published. */
export const LIVE_ARTICLES: ReadonlySet<string> = new Set<string>(HELP_ARTICLE_LIST.map((a) => a.slug));

/** Where an article link goes: its page if it exists, else the Help Centre. */
export function articleHref(slug: string | undefined | null): string {
  return slug && LIVE_ARTICLES.has(slug) ? `/help/${slug}` : "/help";
}

/** The Help menu's "On this page", by page name (the folder tab's name). A page with none leaves the section out. */
export const PAGE_ARTICLES: Record<string, readonly string[]> = {
  "Contact list": ["add-an-agent", "list-health", "pin-the-list"],
  "Query Centre": ["log-a-query", "record-a-response", "birds-eye-view"],
};

/** Each guide item's "Learn more", by page and item key. */
export const ITEM_ARTICLES: Record<string, Record<string, string>> = {
  "Contact list": { add: "add-an-agent", search: "find-an-agent", pin: "go-full-screen", open: "open-an-agent", edit: "edit-an-agent", hk: "list-health" },
  "Query Centre": { log: "log-a-query", find: "find-a-query", pin: "pin-the-list", open: "open-a-query", resp: "record-a-response", birds: "birds-eye-view" },
};

/* ── What's new ── */

export interface WhatsNewEntry {
  id: string;
  /** ISO date it shipped */
  date: string;
  title: string;
  /** The line under it on the Help home ("Fixed 6 Nov, after a founding writer's note"). */
  line: string;
}

/**
 * In the ref's order (not by date — the badge reads dates, not order). Facts about what shipped, in the writer's words.
 * ⚠️ ONE LIST (non-workspace v1.1, 7c): the Help home's "New in QueryHawk" (help-centre-v1 ref) and the Help menu's
 * badge both read this, so the badge never counts entries the page does not show.
 */
export const WHATS_NEW: readonly WhatsNewEntry[] = [
  { id: "agency-caps-import", date: "2026-11-06", title: "Agency names survive an import in capitals", line: "Fixed 6 Nov, after a founding writer's note" },
  { id: "query-letters-page", date: "2026-11-12", title: "Query letters has its own page", line: "Added 12 Nov" },
];

export const WHATS_NEW_SEEN_KEY = "sa.whatsNew.seen";

/** The entries newer than the last time the writer opened /help#whats-new. */
export function whatsNewUnseen(entries: readonly WhatsNewEntry[] = WHATS_NEW): number {
  let seen = "";
  try { seen = localStorage.getItem(WHATS_NEW_SEEN_KEY) ?? ""; } catch { /* none */ }
  return entries.filter((e) => !seen || e.date > seen).length;
}
/** Opening /help#whats-new: everything up to the newest entry has been seen. */
export function markWhatsNewSeen(entries: readonly WhatsNewEntry[] = WHATS_NEW): void {
  const newest = entries.reduce((m, e) => (e.date > m ? e.date : m), "");
  try { localStorage.setItem(WHATS_NEW_SEEN_KEY, newest); } catch { /* none */ }
}
