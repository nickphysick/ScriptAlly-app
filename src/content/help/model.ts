/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1, Part A — THE SHAPE OF A HELP ARTICLE, the six areas, and the pure rules every surface reads: the read
 * time, the text a search looks through, and whether a draft shows its DRAFT tag.
 *
 * ⚠️ THE ARTICLES ARE DATA (`./articles.ts`), NOT JSX. A body is plain text with two marks: `**bold**` and a control's
 *    label in backticks, `` `+ Add an agent` ``, which draws as a `ui` chip. Nothing else is markup, so a search reads the
 *    same words a reader does.
 */

export type HelpAreaId = "queries" | "agents" | "materials" | "tasks" | "setup" | "basics";

export interface HelpArea {
  id: HelpAreaId;
  name: string;
  eyebrow: string;
  heading: string;
}

/** The six areas, in the order the Help Centre shows them. */
export const HELP_AREAS: readonly HelpArea[] = [
  { id: "queries", name: "Queries", eyebrow: "QUERIES", heading: "Logging and tracking" },
  { id: "agents", name: "Agents", eyebrow: "AGENTS", heading: "Your contact list" },
  { id: "materials", name: "Materials", eyebrow: "MATERIALS", heading: "Manuscripts and packages" },
  { id: "tasks", name: "Tasks", eyebrow: "TASKS", heading: "To-do, calendar, corkboard" },
  { id: "setup", name: "Getting set up", eyebrow: "GETTING SET UP", heading: "Imports and your account" },
  { id: "basics", name: "Querying basics", eyebrow: "QUERYING BASICS", heading: "How UK querying works" },
];

export interface HelpGuideLink {
  /** the page whose guide holds the item ("Contact list", "Query Centre") */
  page: string;
  key: string;
}

export interface HelpArticle {
  slug: string;
  area: HelpAreaId;
  title: string;
  lede: string;
  steps?: { title: string; body: string }[];
  body?: string;
  tip?: { label: string; text: string };
  /** a figure slot's caption (the screenshot is not taken yet) */
  figure?: string;
  related: string[];
  /** the guide item this article teaches; one article on two pages lists both */
  guide?: HelpGuideLink | HelpGuideLink[];
  /** YYYY-MM-DD */
  updated: string;
  /** written from the app's behaviour, not yet reviewed: tagged DRAFT on dev builds */
  draft?: boolean;
}

export const guidesOf = (a: Pick<HelpArticle, "guide">): HelpGuideLink[] => (a.guide ? (Array.isArray(a.guide) ? a.guide : [a.guide]) : []);

/** The words a reader reads: title, lede, steps, body, tip. Marks stripped. */
export function articleText(a: HelpArticle): string {
  const parts = [a.title, a.lede, ...(a.steps ?? []).flatMap((s) => [s.title, s.body]), a.body ?? "", a.tip ? `${a.tip.label} ${a.tip.text}` : ""];
  return parts.join(" ").replace(/\*\*|`/g, "");
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

/** Words ÷ 200, rounded up, as "N min"; under 100 words, "30 sec". */
export function readTime(a: HelpArticle): string {
  const w = wordCount(articleText(a));
  if (w < 100) return "30 sec";
  return `${Math.ceil(w / 200)} min`;
}

/** A DRAFT tag shows on dev builds (vite --mode development) and never in production. */
export function showDrafts(mode: string): boolean {
  return mode !== "production";
}

/* ── the two marks ── */

export type BodyRun = { t: "text"; v: string } | { t: "b"; v: string } | { t: "ui"; v: string };

/** `**bold**` and `` `ui` `` into runs; everything else is text. */
export function parseRuns(s: string): BodyRun[] {
  const out: BodyRun[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let at = 0;
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > at) out.push({ t: "text", v: s.slice(at, m.index) });
    out.push(m[1] !== undefined ? { t: "b", v: m[1] } : { t: "ui", v: m[2] });
    at = m.index + m[0].length;
  }
  if (at < s.length) out.push({ t: "text", v: s.slice(at) });
  return out;
}
