/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corkboard v2, Part A — the pure layer every figure on the page comes from (ref design-refs/corkboard-v13/).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  boardPrefs, boardSentence, dropOrder, frontBack, glance, glanceRows, inGlance, linkFields, linkOf, pileOf, piles,
  sortBoard, tagsForPile, stillStarted, pileSlug, PILE_SUGGESTIONS,
} from "./corkboard";
import { LEGACY_PAPER, NOTE_PAPERS, noteColour, paperHex, paperOf } from "./noteboard";
import type { UserTask } from "../types";

const t = (id: string, over: Partial<UserTask> = {}): UserTask => ({
  id, userId: "u", text: id, done: false, createdAt: `2026-10-${String(10 + Number(id.replace(/\D/g, "") || 0)).padStart(2, "0")}T10:00:00.000Z`,
  updatedAt: "", ...over,
});

const REF = readFileSync(resolve(__dirname, "../../design-refs/corkboard-v13/corkboard-v13.html"), "utf8");

describe("the five papers", () => {
  it("are the ref's COLOURS, name and hex, in its order", () => {
    const m = REF.match(/const COLOURS=\[(.*?)\];/);
    expect(m).not.toBeNull();
    const ref = [...m![1].matchAll(/\['(\w+)','(\w+)','(#[0-9a-f]{6})'\]/g)].map((x) => ({ v: x[1], name: x[2], hex: x[3] }));
    expect(ref).toHaveLength(5);
    expect(NOTE_PAPERS.map((p) => ({ ...p }))).toEqual(ref);
  });
  it("map the old three when read, and absence is butter", () => {
    expect(LEGACY_PAPER).toEqual({ yellow: "butter", pink: "blush", sage: "powder" });
    expect(noteColour({ colour: "yellow" })).toBe("butter");
    expect(noteColour({ colour: "pink" })).toBe("blush");
    expect(noteColour({ colour: "sage" })).toBe("powder");
    expect(noteColour({})).toBe("butter");
    expect(noteColour({ colour: "stone" })).toBe("stone");
    expect(paperOf("nonsense")).toBe("butter");
    expect(paperHex("sage")).toBe("#e2e7ef");
  });
  it("no green anywhere in the table", () => {
    expect(NOTE_PAPERS.map((p) => p.v)).not.toContain("sage");
    expect(NOTE_PAPERS.map((p) => p.name.toLowerCase()).join(" ")).not.toMatch(/green|sage/);
  });
});

describe("prefs", () => {
  it("v1's free and tidy read as board; unknown sort reads new", () => {
    expect(boardPrefs({ todoPrefs: { noteboard: { view: "tidy" } } }).view).toBe("board");
    expect(boardPrefs({ todoPrefs: { noteboard: { view: "free" } } }).view).toBe("board");
    expect(boardPrefs({ todoPrefs: { noteboard: { view: "piles" } } }).view).toBe("piles");
    /* v2.1 adds `started` (the piles started here with no notes yet); absent reads [] */
    expect(boardPrefs(null)).toEqual({ view: "board", sort: "new", order: [], started: [] });
    expect(boardPrefs({ todoPrefs: { noteboard: { sort: "colour", order: ["a", 3, "b"] } } })).toEqual({ view: "board", sort: "colour", order: ["a", "b"], started: [] });
    expect(boardPrefs({ todoPrefs: { noteboard: { started: ["t1", 2, "", "t2"] } } }).started).toEqual(["t1", "t2"]);
  });
});

describe("Corkboard v2.1 · starting a pile", () => {
  it("a started pile with no notes is listed, empty, in A to Z order; Loose stays last", () => {
    const label = (k: string) => ({ ta: "agents", tz: "zeta", tn: "new" } as Record<string, string>)[k] ?? k;
    const p = piles([{ tags: ["tz"] }, { tags: [] }], label, ["tn", "ta"]);
    expect(p.map((x) => [x.k, x.notes.length])).toEqual([["ta", 0], ["tn", 0], ["tz", 1], ["", 1]]);
  });
  it("a started pile leaves the list once a note carries it as its first tag", () => {
    expect(stillStarted(["a", "b"], [{ tags: ["b", "a"] }])).toEqual(["a"]);
  });
  it("a typed pile name becomes the tag label it mints", () => {
    expect(pileSlug("#Agents to look into")).toBe("agents-to-look-into");
    expect(pileSlug("  synopsis ")).toBe("synopsis");
    expect([...PILE_SUGGESTIONS]).toEqual(["agents", "letter", "synopsis", "comps", "ideas", "research", "to-check"]);
  });
});

describe("links", () => {
  it("at most one is set by a write, and null clears the others", () => {
    expect(linkFields({ kind: "agent", id: "a1" })).toEqual({ agentId: "a1", queryId: null, manuscriptId: null });
    expect(linkFields(null)).toEqual({ agentId: null, queryId: null, manuscriptId: null });
    expect(linkOf({ queryId: "q", agentId: "a" })).toEqual({ kind: "query", id: "q" });
  });
});

describe("glance", () => {
  const notes = [t("n1", { agentId: "a" }), t("n2", { manuscriptId: "m", dueDate: "2026-11-09" }), t("n3", { pinned: true }), t("n4")];
  it("counts links, dated notes and pins", () => {
    expect(glance(notes)).toEqual({ linked: 2, onTodo: 1, pinned: 1 });
    expect(notes.filter((n) => inGlance(n, "linked")).map((n) => n.id)).toEqual(["n1", "n2"]);
  });
  it("a row at zero is not shown", () => {
    expect(glanceRows({ linked: 0, onTodo: 1, pinned: 0 }).map((r) => r.k)).toEqual(["onTodo"]);
    expect(glanceRows({ linked: 1, onTodo: 0, pinned: 0 })[0].words).toBe("linked to an agent");
    expect(glanceRows({ linked: 4, onTodo: 0, pinned: 0 })[0].words).toBe("linked to agents");
  });
  it("the sentence: singular, plural, and the to-do clause only when there is one", () => {
    const s = (a: number, b: number) => boardSentence(a, b).map((r) => r.t).join("");
    expect(s(13, 1)).toBe("13 notes on your board. 1 is on your to-do list.");
    expect(s(1, 0)).toBe("One note on your board.");
    expect(s(4, 2)).toBe("4 notes on your board. 2 are on your to-do list.");
    expect(s(0, 0)).toBe("Jot down anything worth remembering while you query.");
  });
});

describe("sorting (CB6: pinned first in every sort)", () => {
  const notes = [t("n1"), t("n2", { pinned: true }), t("n3"), t("n4")];
  const paper = (n: UserTask) => noteColour(n);
  for (const sort of ["new", "old", "colour", "mine"] as const) {
    it(`${sort}: the pinned note is first`, () => {
      expect(sortBoard(notes, sort, ["n4", "n1"], paper)[0].id).toBe("n2");
    });
  }
  it("newest, oldest, my order", () => {
    expect(sortBoard(notes, "new", [], paper).map((n) => n.id)).toEqual(["n2", "n4", "n3", "n1"]);
    expect(sortBoard(notes, "old", [], paper).map((n) => n.id)).toEqual(["n2", "n1", "n3", "n4"]);
    expect(sortBoard(notes, "mine", ["n4", "n1"], paper).map((n) => n.id)).toEqual(["n2", "n4", "n1", "n3"]);
  });
  it("by colour follows the five papers, old values mapped", () => {
    const c = [t("n1", { colour: "stone" }), t("n2", { colour: "sage" }), t("n3", { colour: "yellow" })];
    expect(sortBoard(c, "colour", [], paper).map((n) => n.id)).toEqual(["n3", "n2", "n1"]);
  });
  it("dropOrder and frontBack keep every id exactly once", () => {
    const shown = ["a", "b", "c", "d"];
    expect(dropOrder(shown, "d", "b", false)).toEqual(["a", "d", "b", "c"]);
    expect(dropOrder(shown, "a", "c", true)).toEqual(["b", "c", "a", "d"]);
    expect(frontBack(shown, "c", "front")).toEqual(["c", "a", "b", "d"]);
    expect(frontBack(shown, "a", "back")).toEqual(["b", "c", "d", "a"]);
  });
});

describe("piles are tags (CB8)", () => {
  const label = (id: string) => ({ t1: "synopsis", t2: "agents", t3: "comps" } as Record<string, string>)[id] ?? id;
  const notes = [t("n1", { tags: ["t1", "t3"] }), t("n2", { tags: ["t2"] }), t("n3"), t("n4", { tags: ["t2"] })];
  it("a note's pile is its first tag, A to Z by label, Loose notes last", () => {
    expect(pileOf(notes[0])).toBe("t1");
    expect(pileOf(notes[2])).toBe("");
    expect(piles(notes, label).map((p) => p.k)).toEqual(["t2", "t1", ""]);
  });
  it("moving sets the pile's tag first and keeps the rest", () => {
    expect(tagsForPile(["t1", "t3"], "t2")).toEqual(["t2", "t3"]);
    expect(tagsForPile(["t1", "t2"], "t2")).toEqual(["t2"]);
    expect(tagsForPile(undefined, "t2")).toEqual(["t2"]);
    expect(tagsForPile(["t1", "t3"], "")).toEqual(["t3"]);
  });
});
