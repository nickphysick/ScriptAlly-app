/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — THE ARTICLE MAP: the help articles this pack links to, which three a page offers under "On this
 * page" in the Help menu, which one each guide item's "Learn more" opens, and the What's new entries.
 *
 * ⚠️ THE HELP CENTRE AND ITS ARTICLES ARE THE NEXT PROMPT'S (cc-prompt-help-centre-v1). Until an article exists, a link
 *    to it goes to /help, never to a route that 404s into the app's catch-all. `LIVE_ARTICLES` is the list of slugs that
 *    have a page; it is empty today, and the next prompt fills it as it writes each one.
 */

export interface HelpArticle {
  slug: string;
  title: string;
  /** "1 min", "30 sec" */
  read: string;
}

export const HELP_ARTICLES: Record<string, HelpArticle> = {
  "add-an-agent": { slug: "add-an-agent", title: "Add an agent", read: "1 min" },
  "find-an-agent": { slug: "find-an-agent", title: "Find an agent", read: "1 min" },
  "pin-the-list": { slug: "pin-the-list", title: "Pin the list", read: "30 sec" },
  "open-an-agent": { slug: "open-an-agent", title: "Open an agent's card", read: "1 min" },
  "edit-an-agent": { slug: "edit-an-agent", title: "Edit an agent", read: "1 min" },
  "list-health": { slug: "list-health", title: "What List health measures", read: "2 min" },
  "response-policy": { slug: "response-policy", title: "Response policy explained", read: "1 min" },
  "expected-dates": { slug: "expected-dates", title: "How expected dates work", read: "2 min" },
  "status-key": { slug: "status-key", title: "Status key: every ring explained", read: "3 min" },
  "log-a-query": { slug: "log-a-query", title: "Log a query", read: "2 min" },
  "find-a-query": { slug: "find-a-query", title: "Find a query", read: "1 min" },
  "open-a-query": { slug: "open-a-query", title: "Open a query", read: "1 min" },
  "record-a-response": { slug: "record-a-response", title: "Record a response", read: "1 min" },
  "birds-eye-view": { slug: "birds-eye-view", title: "Birds-eye view", read: "2 min" },
};

/** The slugs with a page in the Help Centre. Empty until the Help Centre prompt lands. */
export const LIVE_ARTICLES: ReadonlySet<string> = new Set<string>();

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
  "Contact list": { add: "add-an-agent", search: "find-an-agent", pin: "pin-the-list", open: "open-an-agent", edit: "edit-an-agent", hk: "list-health" },
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
