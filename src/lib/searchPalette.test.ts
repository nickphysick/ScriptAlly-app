/**
 * Locks for ⌘K search's pure core (search v1). Matching, grouping, folding and highlighting are decided here, so they
 * are testable without a browser; placement, focus and the peek are measured in tests/e2e/searchV1.measure.ts. The
 * prompt's own unit locks are SV1-U1…U9 in searchV1.locks.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  GROUP_ORDER, GROUP_LABEL, KIND_LEAN, PALETTE_ACTIONS, PALETTE_PAGES, PaletteItem, SCORE, START_IDS, DAY_ONE_PAGE_IDS,
  buildCorpus, type CorpusQuery, fold, foldMap, highlightParts, isSelectable, near, scoreItem, searchPalette, slipped, snippetParts, tier, tokens,
} from "./searchPalette";

const row = (over: Partial<PaletteItem>): PaletteItem => ({
  id: "x", group: "Agents", kind: "agent", title: "X", run: { kind: "path", path: "/x" }, ...over,
});
const heads = (rows: ReturnType<typeof searchPalette>["rows"]) =>
  rows.filter((r) => r.type === "head").map((r) => (r as { label: string }).label);
const ids = (rows: ReturnType<typeof searchPalette>["rows"]) =>
  rows.flatMap((r) => (r.type === "item" ? [r.item.id] : []));

describe("folding — case, accents, apostrophes, punctuation", () => {
  it("strips accents and keeps a map back to the raw string", () => {
    const { out, map } = foldMap("Zoë");
    expect(out).toBe("zoe");
    expect(map).toEqual([0, 1, 2]);
  });
  it("drops straight and curly apostrophes, and every other non-alphanumeric becomes a space", () => {
    expect(fold("O'Rourke")).toBe("orourke");
    expect(fold("O’Rourke")).toBe("orourke");
    expect(fold("Marsh & Vale")).toBe("marsh   vale");
    expect(tokens("  Full   MARSH ")).toEqual(["full", "marsh"]);
  });
});

describe("tiers — start 3, word start 2, inside 1", () => {
  it("scores the three tiers", () => {
    expect(tier("Marsh & Vale", "mar")).toBe(SCORE.start);
    expect(tier("Imogen Marsh", "mar")).toBe(SCORE.wordStart);
    expect(tier("Bellamarsh", "mar")).toBe(SCORE.inside);
    expect(tier("Bellamarsh", "x")).toBe(0);
  });
  it("a one-letter word only matches the start of a word", () => {
    expect(tier("Dana Black", "a")).toBe(0);
    expect(tier("Dana Black", "b")).toBe(SCORE.wordStart);
  });
});

describe("scoring a row — every word must match, in any order", () => {
  it("sums the words plus the kind's lean", () => {
    const m = scoreItem(row({ title: "Imogen Marsh", subtitle: "Marsh & Vale · London" }), ["imogen", "london"]);
    expect(m?.total).toBeCloseTo(KIND_LEAN.agent + SCORE.start + (SCORE.wordStart - SCORE.subtitlePenalty));
    expect(m?.where).toEqual(["title", "sub"]);
  });
  it("a word that matches nowhere drops the row", () => {
    expect(scoreItem(row({ title: "Imogen Marsh" }), ["imogen", "zzz"])).toBeNull();
  });
  it("a query's agency scores 1.5 and its keywords 2", () => {
    const q = row({ kind: "query", group: "Queries", title: "Imogen Marsh", agency: "Quillfeather", keywords: "Offer" });
    expect(scoreItem(q, ["quill"])?.total).toBeCloseTo(KIND_LEAN.query + SCORE.agency);
    expect(scoreItem(q, ["offer"])?.total).toBeCloseTo(KIND_LEAN.query + SCORE.kwQuery);
  });
  it("keywords score 1.2 on an action or a page, 0.7 otherwise", () => {
    expect(scoreItem(row({ kind: "action", group: "Actions", title: "Export", keywords: "csv" }), ["csv"])?.total)
      .toBeCloseTo(KIND_LEAN.action + SCORE.kwActionPage);
    expect(scoreItem(row({ kind: "task", group: "Tasks", title: "Send", keywords: "todo" }), ["todo"])?.total)
      .toBeCloseTo(KIND_LEAN.task + SCORE.kwOther);
  });
  it("extra text scores 0.6, and only for words of three letters or more", () => {
    const r = row({ title: "Priya Nair", extra: [{ label: "Wishlist", text: "locked-room mysteries" }] });
    expect(scoreItem(r, ["locked"])?.total).toBeCloseTo(KIND_LEAN.agent + SCORE.extra);
    expect(scoreItem(r, ["lo"])).toBeNull();
  });
});

describe("a slipped letter — four letters or more, names only, and only as a fallback", () => {
  it("near: one swapped, wrong, missing or extra letter", () => {
    expect(near("aisah", "aisha")).toBe(true);
    expect(near("aixha", "aisha")).toBe(true);
    expect(near("aiha", "aisha")).toBe(true);
    expect(near("aishaa", "aisha")).toBe(true);
    expect(near("asiah", "aisha")).toBe(false);
  });
  it("is never tried for a short word", () => {
    expect(slipped("Ben Fox", "bne")).toBe(false);
  });
  it("is only tried with `loose`, and only for agents and queries", () => {
    expect(scoreItem(row({ title: "Aisha Rahman" }), ["aisah"])).toBeNull();
    expect(scoreItem(row({ title: "Aisha Rahman" }), ["aisah"], true)?.total).toBeCloseTo(KIND_LEAN.agent + SCORE.slipped);
    expect(scoreItem(row({ kind: "task", group: "Tasks", title: "Aisha Rahman" }), ["aisah"], true)).toBeNull();
  });
});

describe("highlighting lands on what the reader sees", () => {
  it("marks every matched word through the fold map", () => {
    expect(highlightParts("Zoë Achterberg", ["ach", "zoe"])).toEqual([
      { text: "Zoë", match: true }, { text: " ", match: false }, { text: "Ach", match: true }, { text: "terberg", match: false },
    ]);
  });
  it("marks a whole apostrophised name", () => {
    expect(highlightParts("Callum O'Rourke", ["orourke"]).filter((p) => p.match).map((p) => p.text)).toEqual(["O'Rourke"]);
  });
  it("a snippet starts at a word boundary before the match, with an ellipsis", () => {
    const parts = snippetParts("Debut crime writers. Police procedurals with a twist, and locked-room mysteries.", ["locked"]);
    expect(parts[0]).toEqual({ text: "…", match: false });
    expect(parts.find((p) => p.match)?.text).toBe("locked");
  });
});

describe("grouping — Best match, then the fixed order, capped", () => {
  const agents = Array.from({ length: 6 }, (_, i) => row({ id: `agent:${i}`, agentId: `${i}`, title: `Sam ${i}` }));
  const tasks = Array.from({ length: 5 }, (_, i) => row({ id: `task:${i}`, kind: "task", group: "Tasks", title: `Sam task ${i}` }));
  const corpus = [...agents, ...tasks];

  it("the order is Agents, Queries, Tasks, Notes, Materials, Start something, Go to, Help", () => {
    expect(GROUP_ORDER.map((g) => GROUP_LABEL[g])).toEqual(
      ["Agents", "Queries", "Tasks", "Notes", "Materials", "Start something", "Go to", "Help"]);
  });
  it("puts one Best match first, then caps Agents at four and Tasks at three, with Show all rows", () => {
    const { rows } = searchPalette(corpus, "sam", "all");
    expect(heads(rows)).toEqual(["Best match", "Agents", "Tasks"]);
    expect(rows.filter((r) => r.type === "more").map((r) => (r as { label: string }).label))
      .toEqual(["Show all 6 agents", "Show all 5 tasks"]);
    expect(ids(rows).filter((i) => i.startsWith("agent:"))).toHaveLength(5);
    expect(ids(rows).filter((i) => i.startsWith("task:"))).toHaveLength(3);
  });
  it("a heading carries its count only when it is capped", () => {
    const { rows } = searchPalette([...agents.slice(0, 3), ...tasks], "sam", "all");
    const h = rows.filter((r) => r.type === "head") as { label: string; count?: number }[];
    expect(h.find((x) => x.label === "Agents")?.count).toBeUndefined();
    expect(h.find((x) => x.label === "Tasks")?.count).toBe(5);
  });
  it("with a scope: that group only, uncapped, no Best match, and no hand-off row (neither page's Find can be seeded)", () => {
    const { rows } = searchPalette(corpus, "sam", "Agents");
    expect(heads(rows)).toEqual(["Agents"]);
    expect(ids(rows)).toHaveLength(6);
    expect(rows.map((r) => r.type)).toEqual(["head", "item", "item", "item", "item", "item", "item"]);
  });
  it("a scope with nothing points at Everything", () => {
    const { rows } = searchPalette(agents, "sam", "Notes");
    expect(rows[0]).toMatchObject({ type: "none", inScope: "Notes", elsewhere: 6 });
    expect(rows[1]).toMatchObject({ type: "more", scope: "all", label: "Show all 6 in Everything" });
  });
  it("no match offers to add the term as an agent and to look in the Help centre", () => {
    const { rows, total } = searchPalette(corpus, "pemberton hall", "all");
    expect(total).toBe(0);
    expect(rows[0]).toMatchObject({ type: "none", term: "pemberton hall", words: 2 });
    const made = rows.flatMap((r) => (r.type === "item" ? [r.item] : []));
    expect(made.map((m) => m.title)).toEqual(["Add “Pemberton Hall” as an agent", "Look for “pemberton hall” in the Help centre"]);
    expect(made[0].run).toEqual({ kind: "newAgent", name: "Pemberton Hall" });
  });
  it("SOON rows are never selectable, and never the Best match", () => {
    const soon = PALETTE_ACTIONS.find((a) => a.soon)!;
    const { rows } = searchPalette([soon, row({ kind: "action", group: "Actions", id: "b", title: "Add a bookmark" })], "add", "all");
    const best = rows[1];
    expect(best.type === "item" && best.item.id).toBe("b");
    expect(isSelectable({ type: "item", item: soon })).toBe(false);
  });
});

describe("before you type", () => {
  const corpus = [...PALETTE_ACTIONS, ...PALETTE_PAGES, row({ id: "agent:1", title: "Imogen Marsh" })];
  it("with recents: Jump back in (four at most, missing records skipped), then Start something", () => {
    const { rows } = searchPalette(corpus, "", "all", { recents: ["gone", "agent:1", "page:queries", "page:agents", "page:todo", "page:help"] });
    expect(heads(rows)).toEqual(["Jump back in", "Start something"]);
    expect(ids(rows).slice(0, 4)).toEqual(["agent:1", "page:queries", "page:agents", "page:todo"]);
    expect(ids(rows).slice(4)).toEqual(START_IDS);
  });
  it("day one: Start something, then Go to with Dashboard, Queries, Agents and Tasks", () => {
    const { rows } = searchPalette(corpus, "", "all", { recents: [] });
    expect(heads(rows)).toEqual(["Start something", "Go to"]);
    expect(ids(rows)).toEqual([...START_IDS, ...DAY_ONE_PAGE_IDS]);
  });
});

describe("the actions and pages", () => {
  it("lists the actions in order — no Export, whose only implementation is a closure inside the Queries page", () => {
    expect(PALETTE_ACTIONS.map((a) => a.title)).toEqual([
      "Log a query", "Record a response", "Add an agent", "Import from a spreadsheet", "Give feedback", "Add a manuscript",
    ]);
    expect(PALETTE_ACTIONS.find((a) => a.id === "act:feedback")!.run).toEqual({ kind: "feedback" });
  });
  it("Task settings goes where the account menu's Task settings goes, not to Tasks", () => {
    expect(PALETTE_PAGES.find((p) => p.id === "page:task-settings")!.run).toEqual({ kind: "path", path: "/account/preferences" });
  });
  it("every day-one page id exists", () => {
    for (const id of DAY_ONE_PAGE_IDS) expect(PALETTE_PAGES.some((p) => p.id === id), id).toBe(true);
  });
  it("“settings” finds Task settings and Account by keyword", () => {
    const t = searchPalette(PALETTE_PAGES, "settings", "all").rows.flatMap((r) => (r.type === "item" ? [r.item.id] : []));
    expect(t).toEqual(expect.arrayContaining(["page:task-settings", "page:account"]));
  });
});

describe("both shells mount ONE palette", () => {
  const read = (p: string) => readFileSync(resolve(__dirname, "..", "components", "shell", p), "utf8");
  it("the hook is the only place the corpus and ⌘K are wired", () => {
    const hook = read("usePalette.tsx");
    expect(hook).toContain("buildCorpus");
    expect(hook).toContain("matchesShortcut(SHORTCUTS.search, e)");
    for (const host of ["AppShell.tsx", "TopNavHost.tsx"]) {
      expect(read(host), host).toContain("usePalette");
      expect(read(host), `${host} must not build its own corpus`).not.toContain("buildCorpus");
      expect(read(host), `${host} must not register its own ⌘K`).not.toContain('=== "k"');
    }
  });
  it("the top-nav shell really is given an opener", () => {
    expect(read("TopNavHost.tsx")).toContain("onOpenSearch={openPalette}");
  });
  it("⌘K toggles rather than only opening", () => {
    expect(read("usePalette.tsx")).toMatch(/setOpen\(\(v\) => \{[\s\S]*?if \(v\) return false;/);
  });
});

/**
 * Search standing B1 (reports/search-recon-v1/REPORT.md §4) — an agent row speaks for the agent's STANDING query on the
 * book in hand, chosen by the Contact list's own rule (lib/contactList standingQuery: the furthest-along live query,
 * else the latest close), never by whichever query happens to load first. "Open the query" opens that same query.
 */
describe("an agent row's query is the agent's standing query (B1)", () => {
  const agentRow = (qs: CorpusQuery[]) => buildCorpus({
    agents: [{ id: "a1", name: "Tom Ellery" }], queries: qs, activeManuscriptId: "m1",
    agentLabel: (a) => ({ primary: a.name ?? "", secondary: "" }),
  }).find((i) => i.id === "agent:a1")!;
  const q = (id: string, status: string): CorpusQuery => ({ id, agentId: "a1", manuscriptId: "m1", status });
  const speaksFor = (qs: CorpusQuery[]) => {
    const r = agentRow(qs);
    const peek = r.peek as { status?: string };
    const open = r.second?.run as { kind: string; queryId?: string } | undefined;
    return { status: r.status, peek: peek.status, label: r.second?.label, opens: open?.kind === "query" ? open.queryId : null };
  };

  it("Rejected then Queried shows Queried, and Open the query opens the Queried one", () => {
    expect(speaksFor([q("q1", "Rejected"), q("q2", "Queried")]))
      .toEqual({ status: "Queried", peek: "Queried", label: "Open the query", opens: "q2" });
  });
  it("Partial Sent and Full Sent shows Full Sent, and Open the query opens the Full Sent one", () => {
    expect(speaksFor([q("q1", "Partial Sent"), q("q2", "Full Sent")]))
      .toEqual({ status: "Full Sent", peek: "Full Sent", label: "Open the query", opens: "q2" });
  });
  it("reversing the input order changes nothing", () => {
    for (const qs of [[q("q1", "Rejected"), q("q2", "Queried")], [q("q1", "Partial Sent"), q("q2", "Full Sent")]]) {
      expect(speaksFor([...qs].reverse())).toEqual(speaksFor(qs));
      expect(speaksFor([...qs].reverse()).opens).toBe("q2");
    }
  });
});
