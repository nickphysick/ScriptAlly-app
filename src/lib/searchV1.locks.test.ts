/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Search v1 — the matching locks (SV1-U1 … SV1-U9, prompt Part E). Each was run red against the palette as it stood
 * at 343976d1c before its green was trusted (reports/search-v1.md lists the reds).
 *
 * ⚠️ THE CORE IS READ THROUGH `rowsFor`, which speaks to either shape of the module: today's `searchPalette()` and the
 * retired `rankItems()`. That is what let these locks go red on BEHAVIOUR against the old code rather than on a
 * missing import. Once the old shape is gone the fallback is dead weight, and harmless.
 */
import { describe, it, expect } from "vitest";
import * as sp from "./searchPalette";

type Item = { id: string; kind: string; title: string; group: string; subtitle?: string };
type Row =
  | { type: "head"; label: string; count?: number }
  | { type: "item"; item: Item }
  | { type: "more"; label: string; n: number }
  | { type: string; [k: string]: unknown };

const M = sp as unknown as Record<string, (...a: unknown[]) => unknown>;
const agentLabel = (a: { name?: string; agency?: string }) => ({ primary: a.name ?? "", secondary: a.agency ?? "" });

/** One input both corpus builders accept: the extra fields are ignored by whichever does not read them. */
function corpusOf(agents: Record<string, unknown>[], queries: Record<string, unknown>[] = []): Item[] {
  return M.buildCorpus({
    agents, queries, manuscripts: [], now: Date.parse("2026-11-19T12:00:00Z"), agentLabel,
    tasks: [], notes: [], letters: [], packages: [], help: [], activeManuscriptId: "m1", activeManuscriptTitle: "Murphy’s Day Out",
  }) as Item[];
}

/** The rows drawn for a term under Everything. */
function rowsFor(corpus: Item[], term: string): Row[] {
  if (typeof M.searchPalette === "function") return (M.searchPalette(corpus, term, "all") as { rows: Row[] }).rows;
  return (M.rankItems(corpus, term) as Item[]).map((item) => ({ type: "item", item }));
}
const itemsOf = (rows: Row[]) => rows.filter((r): r is { type: "item"; item: Item } => r.type === "item").map((r) => r.item);
const titles = (rows: Row[]) => itemsOf(rows).map((i) => i.title);

/** The text a title marks for a term, joined — through either highlighter's signature. */
function marked(title: string, term: string): string[] {
  const toks = typeof M.tokens === "function" ? M.tokens(term) : null;
  const parts = (toks ? M.highlightParts(title, toks) : M.highlightParts(title, term)) as { text: string; match: boolean }[];
  return parts.filter((p) => p.match).map((p) => p.text);
}

const ag = (id: string, name: string, agency = "", extra: Record<string, unknown> = {}) => ({ id, name, agency, city: "London", ...extra });
const qu = (id: string, agentId: string, status: string) => ({ id, agentId, manuscriptId: "m1", status, dateSent: "2026-09-14T09:00:00Z" });

describe("Search v1 matching locks", () => {
  it("SV1-U1 · “full marsh” and “marsh full” both find the query for Marsh at Full requested", () => {
    const c = corpusOf([ag("a1", "Imogen Marsh", "Marsh & Vale Literary"), ag("a2", "Tobias Wren", "Wren & Calloway")],
      [qu("q1", "a1", "Full Requested"), qu("q2", "a2", "Queried")]);
    for (const term of ["full marsh", "marsh full"]) {
      const its = itemsOf(rowsFor(c, term));
      expect(its.some((i) => i.id === "query:q1"), term).toBe(true);
      expect(its.some((i) => i.id === "query:q2"), term).toBe(false);
    }
  });

  it("SV1-U2 · “zoe” puts Zoë first; “orourke” finds O'Rourke and marks the whole name", () => {
    const c = corpusOf([ag("a1", "Chloe Zoeller"), ag("a2", "Zoë Achterberg"), ag("a3", "Callum O'Rourke")]);
    expect(titles(rowsFor(c, "zoe"))[0]).toBe("Zoë Achterberg");
    expect(titles(rowsFor(c, "orourke"))).toContain("Callum O'Rourke");
    expect(marked("Callum O'Rourke", "orourke")).toEqual(["O'Rourke"]);
    expect(marked("Zoë Achterberg", "zoe")).toEqual(["Zoë"]);
  });

  it("SV1-U3 · “aisah” finds Aisha only when nothing matches “aisah” as typed", () => {
    const alone = corpusOf([ag("a1", "Aisha Rahman", "The Quillfeather Agency")]);
    expect(titles(rowsFor(alone, "aisah"))).toContain("Aisha Rahman");
    const withExact = corpusOf([ag("a1", "Aisha Rahman", "The Quillfeather Agency"), ag("a2", "Aisah Lim", "Northlight")]);
    const t = titles(rowsFor(withExact, "aisah"));
    expect(t).toContain("Aisah Lim");
    expect(t).not.toContain("Aisha Rahman");
  });

  it("SV1-U4 · a one-letter word marks only the starts of words, and never matches a wishlist", () => {
    const c = corpusOf([
      ag("a1", "Anna Lee", ""), ag("a2", "Dana Black", ""),
      ag("a3", "Ben Fox", "", { mswlNotes: "a story about apples" }),
    ]);
    const t = titles(rowsFor(c, "a"));
    expect(t).toContain("Anna Lee");
    expect(t).not.toContain("Dana Black");
    expect(t).not.toContain("Ben Fox");
    expect(marked("Anna Lee", "a")).toEqual(["A"]);
    expect(marked("Dana Black", "a")).toEqual([]);
  });

  it("SV1-U5 · an agent's name gives one row for that agent, not two; “offer” lists the query", () => {
    const c = corpusOf([ag("a1", "Imogen Marsh", "Marsh & Vale Literary"), ag("a2", "Aisha Rahman", "Quillfeather")],
      [qu("q1", "a1", "Full Requested"), qu("q2", "a2", "Offer")]);
    const marsh = itemsOf(rowsFor(c, "imogen marsh"));
    expect(marsh.filter((i) => i.title.startsWith("Imogen Marsh") || i.title.includes("Imogen Marsh")).length).toBe(1);
    expect(marsh.some((i) => i.kind === "agent")).toBe(true);
    expect(itemsOf(rowsFor(c, "offer")).some((i) => i.id === "query:q2")).toBe(true);
  });

  it("SV1-U6 · with 20 agents matching, Everything shows a Best match, four agents and “Show all 20 agents”", () => {
    const c = corpusOf(Array.from({ length: 20 }, (_, i) => ag(`a${i}`, `Sam Agent${i}`, "Wren")));
    const rows = rowsFor(c, "sam");
    const heads = rows.filter((r) => r.type === "head").map((r) => (r as { label: string }).label);
    expect(heads[0]).toBe("Best match");
    expect(heads[1]).toBe("Agents");
    const agentsHead = rows.findIndex((r) => r.type === "head" && (r as { label: string }).label === "Agents");
    const after = rows.slice(agentsHead + 1);
    const nextNonItem = after.findIndex((r) => r.type !== "item");
    expect(nextNonItem).toBe(4);
    expect((after[4] as { label: string }).label).toBe("Show all 20 agents");
  });

  it("SV1-U7 · “reply” finds Record a response; “csv” finds Export your queries and Import from a spreadsheet", () => {
    const c = corpusOf([ag("a1", "Imogen Marsh")]);
    expect(titles(rowsFor(c, "reply"))).toContain("Record a response");
    const csv = titles(rowsFor(c, "csv"));
    expect(csv).toContain("Export your queries");
    expect(csv).toContain("Import from a spreadsheet");
  });

  it("SV1-U8 · a word found only in a wishlist returns the agent with the wishlist snippet", () => {
    const c = corpusOf([
      ag("a1", "Priya Nair", "Marsh & Vale", { mswlNotes: "Debut crime writers. Police procedurals with a twist, and locked-room mysteries." }),
      ag("a2", "Tobias Wren", "Wren & Calloway", { mswlNotes: "Literary crime, quiet and strange." }),
    ]);
    const rows = rowsFor(c, "locked room");
    expect(titles(rows)).toEqual(["Priya Nair"]);
    const hit = rows.find((r) => r.type === "item") as { item: Item; match?: unknown };
    const line = M.secondLineParts(hit.item, hit.match, M.tokens("locked room")) as { label?: string; parts: { text: string; match: boolean }[] };
    expect(line.label).toBe("Wishlist");
    expect(line.parts.filter((p) => p.match).map((p) => p.text)).toEqual(["locked", "room"]);
    expect(line.parts[0].text).toBe("…");
  });

  it("SV1-U9 · nothing scores from loose subsequence: “jmsh” does not find Juliet Mushens", () => {
    const c = corpusOf([ag("a1", "Juliet Mushens", "Mushens Entertainment")]);
    expect(titles(rowsFor(c, "jmsh"))).not.toContain("Juliet Mushens");
  });
});
