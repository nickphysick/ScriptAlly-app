/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — THE ARTICLE MAP: the help articles this pack links to, which three a page offers under "On this
 * page" in the Help menu, which one each guide item's "Learn more" opens, and the What's new entries.
 *
 * Help Centre v1 — THE INDEX IS BUILT FROM THE ARTICLES THEMSELVES (`content/help/articles.ts`): every written article
 *    is live, its read time is computed from its words, and a slug a guide item or the Help menu names must be one of
 *    them (lock HC1-C5). A link to a slug that is not written goes to /help, never to a route that 404s.
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

/** The slugs with a page in the Help Centre: every article written. */
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
}

/** Newest first. Facts about what shipped, in the writer's words. */
export const WHATS_NEW: readonly WhatsNewEntry[] = [
  { id: "help-system", date: "2026-10-19", title: "Help on every page: definitions, page guides and a quicker way to send feedback" },
  { id: "pin-lists", date: "2026-10-18", title: "Pin the list on the Contact list and the Query Centre to give it the whole page" },
  { id: "list-health", date: "2026-10-14", title: "List health on the Contact list, and Housekeeping to fill the gaps one at a time" },
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
