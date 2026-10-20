/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — THE ARTICLE ROUTE, `/help/{slug}`, and the one function every exact-path table asks.
 *
 * ⚠️ FIVE TABLES MATCH WORKSPACE ROUTES BY EXACT PATH (routeTiers, App's unknown-path redirect, shellForRoute, the
 *    shell's crumb and rib table, the bar's page name). Each asks `routeBase(path)` rather than gaining a pattern of its
 *    own, so an article is "/help" to every one of them and a sixth table cannot learn a different rule.
 * ⚠️ A SLUG THAT NAMES NO ARTICLE IS STILL A HELP PATH HERE: the Help Centre itself sends it to /help (lock HC1-C2).
 *    Deciding that needs the article list, which a route table must not import.
 */

export const HELP_PATH = "/help";
const ARTICLE_PATH = /^\/help\/([a-z0-9][a-z0-9-]*)$/;

/** `/help/add-an-agent` → `add-an-agent`; anything else → null. */
export function helpSlugOf(path: string): string | null {
  const m = ARTICLE_PATH.exec(path.replace(/\/+$/, ""));
  return m ? m[1] : null;
}

/** The route an exact-path table should look up: an article is the Help Centre. */
export function routeBase(path: string): string {
  return helpSlugOf(path) ? HELP_PATH : path;
}
