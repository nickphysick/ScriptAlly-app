/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1, Part B — THE HELP SEARCH. It looks through every article's title, lede and body (steps and tip
 * included), every glossary term, and every status name, and returns at most seven hits.
 *
 *   order   a title that STARTS with the words · a title that contains them · words found only in the text.
 *           Within a band, statuses come first (in the app's order), then glossary terms, then articles in the
 *           Help Centre's order — so "partial" lists "Partial requested" before "Partial sent".
 * ⚠️ A STATUS OR TERM IS NOT A PAGE: its hit opens the article its definition already links to (the Status key, List
 *    health, Response policy), never a route of its own.
 */
import { GLOSSARY } from "../../lib/glossary";
import { HELP_ARTICLE_LIST } from "./articles";
import { HELP_AREAS, articleText } from "./model";

export interface HelpHit {
  /** the article it opens */
  slug: string;
  title: string;
  /** mono eyebrow: the area, or "STATUS KEY" / "DEFINITION" */
  eyebrow: string;
}

interface Entry extends HelpHit { text: string; band: number }

const ENTRIES: readonly Entry[] = [
  ...Object.values(GLOSSARY).map((g): Entry => ({
    slug: g.article, title: g.title, eyebrow: g.status ? "STATUS KEY" : "DEFINITION",
    text: `${g.title} ${g.body}`, band: g.status ? 0 : 1,
  })),
  ...HELP_ARTICLE_LIST.map((a): Entry => ({
    slug: a.slug, title: a.title, eyebrow: HELP_AREAS.find((x) => x.id === a.area)?.eyebrow ?? "",
    text: articleText(a), band: 2,
  })),
];

export const SEARCH_LIMIT = 7;

export function searchHelp(q: string, limit = SEARCH_LIMIT): HelpHit[] {
  const term = q.trim().toLowerCase();
  if (!term) return [];
  const scored: { e: Entry; rank: number; i: number }[] = [];
  ENTRIES.forEach((e, i) => {
    const t = e.title.toLowerCase();
    const rank = t.startsWith(term) ? 0 : t.includes(term) ? 1 : e.text.toLowerCase().includes(term) ? 2 : -1;
    if (rank >= 0) scored.push({ e, rank, i });
  });
  scored.sort((a, b) => a.rank - b.rank || a.e.band - b.e.band || a.i - b.i);
  const seen = new Set<string>();
  const out: HelpHit[] = [];
  for (const { e } of scored) {
    const id = `${e.slug}|${e.title}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push({ slug: e.slug, title: e.title, eyebrow: e.eyebrow });
    if (out.length >= limit) break;
  }
  return out;
}
