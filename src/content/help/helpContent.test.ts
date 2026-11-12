/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — the content's own rules, held where a rendered page cannot reach: every slug a link names is written
 * (HC1-C5, unit half), read times, the DRAFT flag (HC1-C4, unit half), search order (HC1-H3, unit half), and the
 * article route reaching every exact-path table.
 */
import { describe, expect, it } from "vitest";
import { HELP_ARTICLE_LIST, WRITTEN_ARTICLES, articleBySlug, writtenArticleBySlug } from "./articles";
import { HELP_AREAS, articleText, guidesOf, parseRuns, readTime, showDrafts, wordCount, type HelpArticle } from "./model";
import { searchArticles, searchHelp } from "./search";
import { ITEM_ARTICLES, LIVE_ARTICLES, PAGE_ARTICLES, articleHref, HELP_ARTICLES, WHATS_NEW } from "../../lib/helpArticles";
import { GLOSSARY } from "../../lib/glossary";
import { CONTACT_CHECKLIST, GUIDE_PAGES, QC_CHECKLIST } from "../../lib/pageChecklist";
import { helpSlugOf, routeBase } from "../../lib/helpPath";
import { tierForPath } from "../../marketing/routeTiers";
import { shellForRoute } from "../../lib/shellForRoute";
import { barPageName } from "../../lib/workspaceShell";
import { shellCrumbForPath } from "../../components/shell/shellV2Nav";

describe("HC1-C5 · every slug a link names is a written article", () => {
  /* Re-pointed (non-workspace v1, Phase 7): a named article must be WRITTEN; it links to /help/{slug} only once
     published, and to the Help centre while it is a draft, so no link in the app opens the not-found screen. */
  it("every guide item's and every page's article is written, and links to /help/{slug} once published, else /help", () => {
    const named = [...Object.values(ITEM_ARTICLES).flatMap((m) => Object.values(m)), ...Object.values(PAGE_ARTICLES).flat()];
    expect(named.length).toBeGreaterThan(10);
    for (const s of named) {
      expect(writtenArticleBySlug(s), s).toBeTruthy();
      expect(LIVE_ARTICLES.has(s), s).toBe(!!articleBySlug(s));
      expect(articleHref(s)).toBe(articleBySlug(s) ? `/help/${s}` : "/help");
    }
    expect(articleHref("add-an-agent")).toBe("/help/add-an-agent");
    expect(articleHref("log-a-query")).toBe("/help");
    expect(articleHref("not-written")).toBe("/help");
  });
  it("every guide item on both pages has its article", () => {
    for (const it of CONTACT_CHECKLIST) expect(ITEM_ARTICLES["Contact list"][it.key], it.key).toBeTruthy();
    for (const it of QC_CHECKLIST) expect(ITEM_ARTICLES["Query Centre"][it.key], it.key).toBeTruthy();
  });
  it("every glossary term links to a written article, and every related slug is written", () => {
    for (const g of Object.values(GLOSSARY)) expect(writtenArticleBySlug(g.article), g.id).toBeTruthy();
    for (const a of WRITTEN_ARTICLES) for (const r of a.related) expect(writtenArticleBySlug(r), `${a.slug} → ${r}`).toBeTruthy();
  });
  it("every guide link on an article names a real page and item, and the item's Learn more comes back to it", () => {
    for (const a of WRITTEN_ARTICLES) for (const l of guidesOf(a)) {
      const g = GUIDE_PAGES.find((p) => p.page === l.page);
      expect(g, `${a.slug}: ${l.page}`).toBeTruthy();
      expect(g!.items.some((i) => i.key === l.key), `${a.slug}: ${l.key}`).toBe(true);
      expect(ITEM_ARTICLES[l.page][l.key]).toBe(a.slug);
    }
  });
  it("slugs are unique, and the index is the content", () => {
    expect(new Set(WRITTEN_ARTICLES.map((a) => a.slug)).size).toBe(WRITTEN_ARTICLES.length);
    expect(Object.keys(HELP_ARTICLES).sort()).toEqual(HELP_ARTICLE_LIST.map((a) => a.slug).sort());
  });
});

describe("the six areas, and the articles in them", () => {
  it("are the pack's six, in order, each with articles", () => {
    expect(HELP_AREAS.map((a) => [a.name, a.eyebrow, a.heading])).toEqual([
      ["Queries", "QUERIES", "Logging and tracking"],
      ["Agents", "AGENTS", "Your contact list"],
      ["Materials", "MATERIALS", "Manuscripts and packages"],
      ["Tasks", "TASKS", "To-do, calendar, corkboard"],
      ["Getting set up", "GETTING SET UP", "Imports and your account"],
      ["Querying basics", "QUERYING BASICS", "How UK querying works"],
    ]);
    for (const area of HELP_AREAS) expect(WRITTEN_ARTICLES.some((a) => a.area === area.id), area.id).toBe(true);
  });
  it("Add an agent is the mock's lede and its five steps, in design-refs/help-centre-v1's words", () => {
    const a = articleBySlug("add-an-agent")!;
    expect(a.lede).toBe("Every query starts with an agent on your list. Add one by hand in under a minute, or bring a spreadsheet in all at once.");
    expect(a.steps!.map((s) => s.title)).toEqual(["Open the editor", "Name and agency", "What they're looking for", "Response policy", "Save"]);
    expect(a.steps!.map((s) => s.body)).toEqual([
      "On the Contact list, press `+ Add an agent` in the header. The editor slides in from the right so your list stays in view.",
      "A name or an agency is enough to start. Add the country and city if you know them.",
      "On `What they want`, pick genres from the list, and paste their wishlist in their own words.",
      "On `How to query`, set how long they take to reply, and choose `No response means no` or `Always replies`.",
      "Press `Add to your list`. Any gap List health counts shows up there, ready for later.",
    ]);
    /* re-pointed (Phase 7): the ref sets the tip's label in a sentence, not small capitals; no screenshot slot */
    expect(a.tip!.label).toBe("Quicker with a list.");
    expect(a.figure).toBeUndefined();
    expect(a.draft).toBeFalsy();
  });
  it("no article uses a verdict word, a burgundy claim or a promise to write for the writer", () => {
    for (const a of WRITTEN_ARTICLES) {
      const t = articleText(a);
      expect(t, a.slug).not.toMatch(/\b(overdue items|urgent|late|failing|tier[- ]1|pristine|best agents?)\b/i);
      expect(t, a.slug).not.toMatch(/\b(we|QueryHawk) (will )?(draft|write|send)s? (a|the|your) (nudge|letter|query)\b/i);
    }
  });
  it("What's new keeps its three entries", () => {
    expect(WHATS_NEW.map((e) => e.id)).toEqual(["help-system", "pin-lists", "list-health"]);
  });
});

describe("read time", () => {
  const mk = (words: number): HelpArticle => ({
    slug: "x", area: "agents", title: "", lede: Array.from({ length: words }, () => "word").join(" "), related: [], updated: "2026-10-20",
  });
  it("is 30 sec under 100 words, then words ÷ 200 rounded up", () => {
    expect(readTime(mk(99))).toBe("30 sec");
    expect(readTime(mk(100))).toBe("1 min");
    expect(readTime(mk(200))).toBe("1 min");
    expect(readTime(mk(201))).toBe("2 min");
  });
  it("counts what a reader reads, marks stripped", () => {
    expect(wordCount("Press `+ Add an agent` **now**.")).toBe(5);
  });
});

describe("HC1-C4 (unit) · a DRAFT tag on dev builds, never in production", () => {
  it("reads the build mode", () => {
    expect(showDrafts("development")).toBe(true);
    expect(showDrafts("production")).toBe(false);
  });
  it("the drafts are the ones the pack names as drafted", () => {
    expect(WRITTEN_ARTICLES.filter((a) => !a.draft).map((a) => a.slug)).toEqual(["add-an-agent"]);
    expect(WRITTEN_ARTICLES.filter((a) => a.draft).length).toBe(26);
  });
});

/* Re-pointed (non-workspace v1, Phase 7): the search reaches PUBLISHED articles only, so "partial" (a status whose
   article, the Status key, is a draft) and the template's body word (a draft) find nothing now. */
describe("HC1-H3 (unit) · search", () => {
  it("no hit opens a draft, and a term whose article is a draft is left out", () => {
    for (const q of ["partial", "import", "pin", "health", "nudge", "agent", "query"]) {
      for (const h of searchHelp(q)) expect(articleBySlug(h.slug), `${q} → ${h.slug}`).toBeTruthy();
    }
    expect(searchHelp("partial")).toEqual([]);
    expect(searchHelp("agent").length).toBeLessThanOrEqual(7);
  });
  it("finds words that are only in a body", () => {
    expect(searchHelp("QueryHawk-template")).toEqual([]);
    expect(searchHelp("wishlist").map((h) => h.slug)).toContain("add-an-agent");
  });
  it("nonsense finds nothing", () => {
    expect(searchHelp("zzqxv")).toEqual([]);
  });
});

/* Phase 7 lock: the Help centre home's search finds a published article by a word that is ONLY in its body */
describe("NW7-S · the home's search (searchArticles)", () => {
  it("finds Add an agent by 'wishlist', a word in its steps and not its title or lede", () => {
    const a = articleBySlug("add-an-agent")!;
    expect(`${a.title} ${a.lede}`.toLowerCase()).not.toContain("wishlist");
    expect(searchArticles("wishlist").map((x) => x.slug)).toEqual(["add-an-agent"]);
    expect(searchArticles("  WISHLIST ").map((x) => x.slug)).toEqual(["add-an-agent"]);
  });
  it("finds no draft, and nothing for nonsense", () => {
    expect(searchArticles("template")).toEqual([]);
    expect(searchArticles("zzqxv")).toEqual([]);
    expect(searchArticles("")).toEqual([]);
  });
});

describe("the two marks", () => {
  it("bold and ui", () => {
    expect(parseRuns("Press `Save` and **done**.")).toEqual([
      { t: "text", v: "Press " }, { t: "ui", v: "Save" }, { t: "text", v: " and " }, { t: "b", v: "done" }, { t: "text", v: "." },
    ]);
  });
});

describe("the article route reaches every exact-path table", () => {
  it("is /help to each of them", () => {
    expect(helpSlugOf("/help/add-an-agent")).toBe("add-an-agent");
    expect(helpSlugOf("/help")).toBeNull();
    expect(routeBase("/help/add-an-agent")).toBe("/help");
    expect(routeBase("/agents")).toBe("/agents");
    expect(tierForPath("/help/add-an-agent")).toBe("workspace");
    expect(shellForRoute("/help/add-an-agent", true)).toBe("workspace");
    expect(barPageName([], null, "/help/add-an-agent")).toEqual({ section: null, name: "Help centre" });
    expect(shellCrumbForPath("/help/add-an-agent")).toEqual({ section: "Setup", page: "Help centre" });
    expect(tierForPath("/help/a/b")).toBeNull();
  });
});

describe("HC1-C3 (unit) · the panel keeps its four kinds", () => {
  it("never offers Article", async () => {
    const { FEEDBACK_KINDS } = await import("../../lib/beta");
    expect([...FEEDBACK_KINDS]).toEqual(["Something's broken", "Something's confusing", "An idea", "Something I liked"]);
  });
});
