/**
 * Locks for the command palette's pure core. Ranking, grouping, normalisation and highlighting
 * are all decided here, so they are testable without a browser; placement, focus and scrolling
 * are browser checks (jsdom cannot judge them) and are verified in the run report instead.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  EMPTY_ACTION_COUNT, EMPTY_PAGE_COUNT, GROUP_ORDER, PALETTE_ACTIONS, PaletteItem, RANK,
  buildCorpus, emptyStateItems, highlightParts, normalise, rankItems, scoreItem,
} from "./searchPalette";

const item = (title: string, subtitle?: string): Pick<PaletteItem, "title" | "subtitle"> =>
  ({ title, subtitle });

const row = (over: Partial<PaletteItem>): PaletteItem => ({
  id: "x", group: "Agents", kind: "agent", title: "X", run: { kind: "path", path: "/x" }, ...over,
});

describe("normalise — case and punctuation are stripped from both sides", () => {
  it("lets orourke find O'Rourke", () => {
    expect(normalise("O'Rourke")).toBe("orourke");
    expect(normalise("orourke")).toBe(normalise("O'Rourke"));
  });
  it("ignores spacing and ampersands", () => {
    expect(normalise("Inkwell & Stone")).toBe("inkwellstone");
  });
});

describe("scoreItem — ranked, not filtered", () => {
  /* ⚠️ BAKED 20's SCALE: prefix 3 > word-boundary 2 > substring 1, with a subtitle match half a
     point back. The WORD-BOUNDARY tier is new in the shell rebuild and is the one that was
     missing — without it a surname match scored level with an incidental one. */
  it("prefix beats word-boundary beats substring, and a subtitle is half a point back", () => {
    expect(scoreItem(item("Marsh Agency"), "mar")).toBe(RANK.titlePrefix);
    expect(scoreItem(item("The Marsh Agency"), "mar")).toBe(RANK.titleWordBoundary);
    expect(scoreItem(item("Postmarsh"), "mar")).toBe(RANK.titleSubstring);
    expect(scoreItem(item("Nothing", "Marsh Agency"), "mar"))
      .toBe(RANK.titlePrefix - RANK.subtitlePenalty);
    expect(scoreItem(item("Nothing", "The Marsh Agency"), "mar"))
      .toBe(RANK.titleWordBoundary - RANK.subtitlePenalty);
    // a title match always wins over the same match on a subtitle
    expect(scoreItem(item("Marsh Agency"), "mar"))
      .toBeGreaterThan(scoreItem(item("Nothing", "Marsh Agency"), "mar"));
    // ⚠️ aisah → Aisha is a TRANSPOSITION, not a subsequence: walking "aishakapoor" for
    // a-i-s-a-h, the h never comes back round. The subsequence tier cannot see it, which is why
    // there is a typo tier at all.
    expect(scoreItem(item("Aisha Kapoor"), "aisah")).toBe(RANK.typo);
    // a genuine subsequence — the letters in order, gaps allowed
    expect(scoreItem(item("Jonathan Marsh"), "jntn")).toBe(RANK.looseSubsequence);
  });

  it("the typo tier is ONE adjacent swap, not a general fuzzy match", () => {
    expect(scoreItem(item("Marsh Agency"), "amrsh")).toBe(RANK.typo);   // one swap
    expect(scoreItem(item("Marsh Agency"), "amrhs")).not.toBe(RANK.typo); // two
  });

  it("a non-match is a non-match, not a weak match", () => {
    expect(scoreItem(item("Aisha Kapoor"), "zzzz")).toBe(RANK.noMatch);
  });

  it("an empty term scores everything the same — the empty state does its own thing", () => {
    expect(scoreItem(item("Anything"), "")).toBe(0);
    expect(scoreItem(item("Anything"), "   ")).toBe(0);
  });

  it("punctuation in the DATA does not defeat a plain-typed term", () => {
    expect(scoreItem(item("Daniel O'Rourke"), "orourke")).toBeGreaterThan(RANK.noMatch);
    expect(scoreItem(item("Inkwell & Stone"), "inkwell stone")).toBeGreaterThan(RANK.noMatch);
  });

  it("the loose tier reads the TITLE only — a subtitle at that looseness is noise", () => {
    // every letter of "queries" appears in order in this subtitle, but it must not match
    expect(scoreItem(item("Zzz", "quite a few entries"), "queries")).toBe(RANK.noMatch);
  });
});

describe("rankItems — group order, and stable within a group", () => {
  const corpus: PaletteItem[] = [
    row({ id: "p1", group: "Pages", kind: "page", title: "Packages" }),
    row({ id: "a1", group: "Agents", title: "Pat Ackroyd" }),
    row({ id: "a2", group: "Agents", title: "Packham Literary" }),
    row({ id: "q1", group: "Queries", kind: "query", title: "Pack — full sent" }),
  ];

  it("lays groups out in the canonical order regardless of score", () => {
    const groups = rankItems(corpus, "pack").map((r) => r.group);
    const seen = [...new Set(groups)];
    const expected = GROUP_ORDER.filter((g) => seen.includes(g));
    expect(seen).toEqual(expected);
  });

  it("an empty term returns nothing — the empty state is a separate path", () => {
    expect(rankItems(corpus, "")).toEqual([]);
    expect(rankItems(corpus, "  ")).toEqual([]);
  });

  it("drops non-matches entirely", () => {
    expect(rankItems(corpus, "zzzz")).toEqual([]);
  });

  it("orders WITHIN a group by score — a prefix hit beats a mid-title hit", () => {
    const agents = rankItems(corpus, "pack").filter((r) => r.group === "Agents");
    expect(agents.map((a) => a.title)).toEqual(["Packham Literary", "Pat Ackroyd"]);
  });
});

describe("highlightParts — the mark lands on what the reader can see", () => {
  it("splits around the matched run", () => {
    expect(highlightParts("The Marsh Agency", "marsh")).toEqual([
      { text: "The ", match: false },
      { text: "Marsh", match: true },
      { text: " Agency", match: false },
    ]);
  });

  it("marks a leading match without an empty leading part", () => {
    expect(highlightParts("Marsh", "mar")).toEqual([
      { text: "Mar", match: true },
      { text: "sh", match: false },
    ]);
  });

  it("⚠️ marks NOTHING when the match only existed after normalisation", () => {
    // `orourke` ranks O'Rourke via normalise(), but there is no literal run to mark — marking a
    // best guess would put the burgundy on the wrong characters.
    expect(highlightParts("Daniel O'Rourke", "orourke")).toEqual([
      { text: "Daniel O'Rourke", match: false },
    ]);
  });

  it("an empty term marks nothing", () => {
    expect(highlightParts("Anything", "")).toEqual([{ text: "Anything", match: false }]);
  });
});

/* ⚠️ SESSION RECENTS ARE RETIRED (shell-rebuild Phase 5). Baked 20 specifies the empty state
   exactly — three actions and four pages — and the Recent group was the only place recents ever
   rendered. Their blocks were deleted with them rather than left asserting an export nothing
   calls. A real feature was lost; it is recorded in the run report. */
describe("the empty state is never empty — Baked 20: three actions, four pages", () => {
  it("shows three actions and four pages, in that order", () => {
    const rows = emptyStateItems();
    expect(rows).toHaveLength(EMPTY_ACTION_COUNT + EMPTY_PAGE_COUNT);
    expect(rows.slice(0, EMPTY_ACTION_COUNT).every((r) => r.group === "Actions")).toBe(true);
    expect(rows.slice(EMPTY_ACTION_COUNT).every((r) => r.group === "Pages")).toBe(true);
  });

  it("takes no argument — there is no history to pass it", () => {
    expect(emptyStateItems.length).toBe(0);
  });
});

/* (The `pushRecent` block was deleted with the function it tested — see the note above the
   empty-state describe. Retired by Baked 20, deliberately, not lost by accident.) */

describe("⚠️ every action dispatches to an EXISTING handler", () => {
  it("captures use the rail's contracts; the rest use the navigate bridge", () => {
    const kinds = PALETTE_ACTIONS.map((a) => a.run.kind);
    expect(new Set(kinds)).toEqual(new Set(["capture", "navigate"]));
    const captures = PALETTE_ACTIONS.filter((a) => a.run.kind === "capture")
      .map((a) => (a.run as { capture: string }).capture);
    // exactly the three existing capture contracts — no fourth, no renamed one
    expect(new Set(captures)).toEqual(new Set(["query", "record", "agent"]));
  });

  it("the runnable actions carry their shortcuts — the palette is where they are learnt", () => {
    const byId = Object.fromEntries(PALETTE_ACTIONS.map((a) => [a.id, a]));
    expect(byId["act:query"].shortcut).toBe("⌘L");
    expect(byId["act:record"].shortcut).toBe("⌘R");
  });
});

describe("buildCorpus — second lines carry context, over already-loaded data", () => {
  const now = Date.parse("2026-07-30T12:00:00");
  const agentLabel = (a: { name?: string; agency?: string }) =>
    ({ primary: a.name || a.agency || "", secondary: a.name ? (a.agency ?? "") : "Agent not specified" });
  const input = {
    now, agentLabel,
    agents: [{ id: "a1", name: "Daniel O'Rourke", agency: "Inkwell & Stone", city: "Dublin" }],
    queries: [{ id: "q1", agentId: "a1", manuscriptId: "m1", status: "Full Sent", dateSent: "2026-07-21T09:00:00" }],
    manuscripts: [{ id: "m1", title: "Murphy's Day Out", genre: "Thriller", wordCount: 50000 }],
  };

  it("agents show agency and city", () => {
    const a = buildCorpus(input).find((i) => i.id === "agent:a1")!;
    expect(a.title).toBe("Daniel O'Rourke");
    expect(a.subtitle).toBe("Inkwell & Stone · Dublin");
  });

  it("queries show manuscript and age, and CARRY THEIR STATUS for the real StatusDot", () => {
    const q = buildCorpus(input).find((i) => i.id === "query:q1")!;
    expect(q.title).toBe("Daniel O'Rourke — Full Sent");
    expect(q.subtitle).toBe("Murphy's Day Out · 9 days ago");
    // the row renders StatusDot from this — never a locally drawn circle
    expect(q.status).toBe("Full Sent");
  });

  it("manuscripts show genre, word count and query count — singular-safe", () => {
    const m = buildCorpus(input).find((i) => i.id === "ms:m1")!;
    expect(m.subtitle).toBe("Thriller · 50,000 words · 1 query");
  });

  it("an undated query says nothing rather than inventing an age", () => {
    const q = buildCorpus({ ...input, queries: [{ id: "q2", agentId: "a1", manuscriptId: "m1", status: "Queried" }] })
      .find((i) => i.id === "query:q2")!;
    expect(q.subtitle).toBe("Murphy's Day Out");
  });

  it("pages and features are results — including Task settings and Help centre", () => {
    const corpus = buildCorpus(input);
    expect(rankItems(corpus, "pack").some((r) => r.title === "Packages")).toBe(true);
    expect(rankItems(corpus, "settings").some((r) => r.title === "Task settings")).toBe(true);
    expect(rankItems(corpus, "help").some((r) => r.title === "Help centre")).toBe(true);
  });

  it("the status is searchable — 'full' finds the full-sent query", () => {
    expect(rankItems(buildCorpus(input), "full").some((r) => r.id === "query:q1")).toBe(true);
  });
});


describe("Jump to — the contextual action", () => {
  const now = Date.parse("2026-07-30T12:00:00");
  const corpus = buildCorpus({
    now,
    agentLabel: (a: { name?: string; agency?: string }) => ({ primary: a.name ?? "", secondary: a.agency ?? "" }),
    agents: [{ id: "a1", name: "Aisha Kapoor", agency: "The Lantern Agency" }],
    queries: [], manuscripts: [],
  });

  /* ⚠️ IT IS THE TOP OF ACTIONS NOW, not a group of its own (Baked 20, shell-rebuild Phase 5).
     Actions is the first group, so it is still the first row on screen — but the heading it used
     to bring with it is gone, because a one-row group is a label wearing a heading's clothes. */
  it("leads the Actions group when an agent matches, and dispatches to the preselect seam", () => {
    const rows = rankItems(corpus, "aisha");
    expect(rows[0].group).toBe("Actions");
    expect(rows[0].title).toBe("Log a query to Aisha Kapoor");
    expect(rows[0].shortcut).toBe("⌘↵");
    // the EXISTING seam — LogQueryFocusForm's initialAgentId, not a new handler
    expect(rows[0].run).toEqual({ kind: "logQueryTo", agentId: "a1", name: "Aisha Kapoor" });
  });

  it("does not appear when no agent matched", () => {
    expect(rankItems(corpus, "packages").some((r) => r.title.startsWith("Log a query to")))
      .toBe(false);
  });

  it("offers ONE agent — the top-ranked one, not a second results list", () => {
    const two = buildCorpus({
      now,
      agentLabel: (a: { name?: string; agency?: string }) => ({ primary: a.name ?? "", secondary: a.agency ?? "" }),
      agents: [{ id: "a1", name: "Marcus Reed" }, { id: "a2", name: "Mark Ellery" }],
      queries: [], manuscripts: [],
    });
    const jumps = rankItems(two, "mar").filter((r) => r.title.startsWith("Log a query to"));
    expect(jumps).toHaveLength(1);
    expect(jumps[0].title).toBe("Log a query to Marcus Reed");
  });
});

/**
 * ⚠️ THE PALETTE NOW HAS TWO HOSTS, AND MUST STILL BE ONE PALETTE (shell-rebuild pack, Phase 5).
 * It was mounted inside AppShell — the workspace shell — so on /dashboard the search pill opened
 * nothing and ⌘K did nothing at all. The fix is a shared `usePalette` hook rather than a second
 * copy of the block, because two copies would register ⌘K twice: two listeners, both calling
 * preventDefault, on the app's one universal shortcut.
 */
describe("both shells mount ONE palette", () => {
  const read = (p: string) =>
    readFileSync(resolve(__dirname, "..", "components", "shell", p), "utf8");

  it("the hook is the only place the corpus and ⌘K are wired", () => {
    const hook = read("usePalette.tsx");
    expect(hook).toContain("buildCorpus");
    expect(hook).toContain('e.key.toLowerCase() === "k"');
    for (const host of ["AppShell.tsx", "TopNavHost.tsx"]) {
      expect(read(host), host).toContain("usePalette");
      expect(read(host), `${host} must not build its own corpus`).not.toContain("buildCorpus");
      expect(read(host), `${host} must not register its own ⌘K`).not.toContain('=== "k"');
    }
  });

  it("the top-nav shell really is given an opener — the gap this phase closed", () => {
    expect(read("TopNavHost.tsx")).toContain("onOpenSearch={openPalette}");
  });

  /* Baked 20 — ⌘K TOGGLES. Pressing it with the palette open closes it, which is what the hand
     expects of a shortcut that is a switch. */
  it("⌘K toggles rather than only opening", () => {
    const hook = read("usePalette.tsx");
    expect(hook).toMatch(/setOpen\(\(v\) => \{[\s\S]*?if \(v\) return false;/);
  });
});
