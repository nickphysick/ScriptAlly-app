/**
 * Locks for the command palette's pure core. Ranking, grouping, normalisation and highlighting
 * are all decided here, so they are testable without a browser; placement, focus and scrolling
 * are browser checks (jsdom cannot judge them) and are verified in the run report instead.
 */
import { describe, it, expect } from "vitest";
import {
  EMPTY_ACTION_COUNT, GROUP_ORDER, PALETTE_ACTIONS, PaletteItem, RANK, RECENT_COUNT,
  buildCorpus, emptyStateItems, highlightParts, normalise, pushRecent, rankItems, scoreItem,
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
  it("title prefix beats title substring beats subtitle substring beats subsequence", () => {
    expect(scoreItem(item("Marsh Agency"), "mar")).toBe(RANK.titlePrefix);
    expect(scoreItem(item("The Marsh Agency"), "mar")).toBe(RANK.titleSubstring);
    expect(scoreItem(item("Nothing", "The Marsh Agency"), "mar")).toBe(RANK.subtitleSubstring);
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

describe("the empty state is never empty", () => {
  it("cold start: no recents, so the top actions stand alone", () => {
    const rows = emptyStateItems([]);
    expect(rows).toHaveLength(EMPTY_ACTION_COUNT);
    expect(rows.every((r) => r.group === "Actions")).toBe(true);
  });

  it("with recents: Recent first, then the top actions", () => {
    const rows = emptyStateItems([row({ id: "r1", title: "Jonathan Marsh" })]);
    expect(rows[0].group).toBe("Recent");
    expect(rows[0].title).toBe("Jonathan Marsh");
    expect(rows).toHaveLength(1 + EMPTY_ACTION_COUNT);
  });

  it("caps recents so the actions are always reachable without scrolling past a history", () => {
    const many = Array.from({ length: 12 }, (_, i) => row({ id: `r${i}`, title: `R${i}` }));
    const rows = emptyStateItems(many);
    expect(rows.filter((r) => r.group === "Recent")).toHaveLength(RECENT_COUNT);
  });
});

describe("pushRecent — newest first, no duplicates", () => {
  it("moves a re-opened item to the front rather than repeating it", () => {
    const a = row({ id: "a", title: "A" });
    const b = row({ id: "b", title: "B" });
    const after = pushRecent(pushRecent([a], b), a);
    expect(after.map((r) => r.id)).toEqual(["a", "b"]);
  });
});

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

  it("appears ABOVE everything when an agent matches, and dispatches to the preselect seam", () => {
    const rows = rankItems(corpus, "aisha");
    expect(rows[0].group).toBe("Jump to");
    expect(rows[0].title).toBe("Log a query to Aisha Kapoor");
    expect(rows[0].shortcut).toBe("⌘↵");
    // the EXISTING seam — LogQueryFocusForm's initialAgentId, not a new handler
    expect(rows[0].run).toEqual({ kind: "logQueryTo", agentId: "a1", name: "Aisha Kapoor" });
  });

  it("does not appear when no agent matched", () => {
    expect(rankItems(corpus, "packages").some((r) => r.group === "Jump to")).toBe(false);
  });

  it("offers ONE agent — the top-ranked one, not a second results list", () => {
    const two = buildCorpus({
      now,
      agentLabel: (a: { name?: string; agency?: string }) => ({ primary: a.name ?? "", secondary: a.agency ?? "" }),
      agents: [{ id: "a1", name: "Marcus Reed" }, { id: "a2", name: "Mark Ellery" }],
      queries: [], manuscripts: [],
    });
    const jumps = rankItems(two, "mar").filter((r) => r.group === "Jump to");
    expect(jumps).toHaveLength(1);
    expect(jumps[0].title).toBe("Log a query to Marcus Reed");
  });
});
