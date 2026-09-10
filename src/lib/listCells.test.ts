/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { LIST_VERB, listStands, listSub, dateChip } from "./listCells";
import type { RowInputs } from "./taskListRow";
import type { BoardCard } from "./todoBoard";

/**
 * ⚠️ THE VERBS ARE ASSERTED AGAINST THE CONTRACT FILE, NOT AGAINST LITERALS HERE. A literal on both
 * sides is a test that agrees with itself: it goes green the day someone edits the app and the test
 * together, which is precisely the edit it exists to catch.
 */
const REF = readFileSync("design-refs/todo-three-views-contract.html", "utf8")
  .replace(/\\u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16)));

/* ⚠️ THE FIXTURE CARDS BUCKET FOR REAL — `taskType` is what `cardBucket` reads, so a card built
   without one is a `fix` whatever the test calls it. Handing the bucket in separately was the flaw
   this file found on its first run. */
const card = (taskType: string, over: Partial<BoardCard> = {}) => ({ key: "k", stream: "q", title: "t",
  who: "w", subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "W", record: "",
  committed: false, done: false, taskType, ...over } as unknown as BoardCard);
const NOTE = { key: "n", stream: "nt", title: "t", who: "", subtitle: "", due: "", warn: false,
  snoozes: 0, hk: false, initials: "", record: "", committed: false, done: false,
  nature: "task" } as unknown as BoardCard;
const inp = (taskType: string, over: Partial<RowInputs> = {}): RowInputs =>
  ({ card: card(taskType), days: 112, ...over });

describe("the row's verb is the contract's own word for that task", () => {
  it("every verb the ref prints is in the table", () => {
    /* the ref's own six, as its `act` expression writes them */
    for (const v of ["Mark sent", "Log a nudge", "Close it", "Decide", "Fill it in", "Tick it off"]) {
      expect(REF, `${v} is not a verb the contract prints`).toContain(v);
      expect(Object.values(LIST_VERB), `${v} is missing from the table`).toContain(v);
    }
  });

  it("⚠️ every bucket has one, so a new kind cannot fall through to a neighbour's action", () => {
    const all = ["send", "chase", "close", "decide", "fix", "note"];
    expect(Object.keys(LIST_VERB).sort()).toEqual([...all].sort());
    for (const b of all) expect(LIST_VERB[b as keyof typeof LIST_VERB].length).toBeGreaterThan(2);
  });
});

describe("where it stands", () => {
  it("a send emphasises the MATERIAL, because what is owed is what has not gone", () => {
    expect(listStands(inp("full_requested", { partial: true }), "1 August"))
      .toEqual({ before: "", strong: "Partial", after: " — not yet sent" });
    expect(listStands(inp("full_requested", { partial: false }), "1 August").strong).toBe("Full");
  });

  it("a nudge and a close emphasise the DATE, and the ref's wording carries it", () => {
    expect(listStands(inp("nudge_overdue"), "26 August"))
      .toEqual({ before: "Their window closed ", strong: "26 August", after: "" });
    expect(listStands(inp("no_response_close"), "14 March 2024"))
      .toEqual({ before: "No reply since ", strong: "14 March 2024", after: "" });
    expect(REF).toContain("Their window closed");
    expect(REF).toContain("No reply since");
  });

  it("⚠️ with no date it states the fact WITHOUT one — never a sentence with a hole in it", () => {
    expect(listStands(inp("nudge_overdue"), null).strong).toBe("");
    expect(listStands(inp("no_response_close"), "—").strong).toBe("");
    expect(listStands(inp("no_response_close"), null).before).not.toContain("since ");
  });

  it("fix and note are the ref's, verbatim", () => {
    expect(listStands(inp("dq_materials"), null)).toEqual({ before: "Materials ", strong: "not recorded", after: "" });
    expect(REF).toContain("Materials <b>not recorded</b>");
    expect(listStands({ card: NOTE, days: 3 }, null).before).toBe("Ticking it off is what finishes it");
    expect(REF).toContain("Ticking it off is what finishes it");
  });

  it("⚠️ decide does NOT borrow the ref's Quiet sentence — an offer is not a silence", () => {
    const s = listStands(inp("offer_received"), "3 September");
    expect(s.before).toBe("Came in ");
    expect(`${s.before}${s.strong}${s.after}`).not.toContain("still nothing");
    expect(`${s.before}${s.strong}${s.after}`).not.toContain("Nudged");
  });
});

describe("the mono sub-line takes its figure from the one span derivation", () => {
  it("phrases the ref's way around `listFragment`'s figure", () => {
    expect(listSub(inp("full_requested", { days: 112 }), "1 August")).toMatch(/ since request$/);
    expect(listSub(inp("nudge_overdue", { days: 112 }), "1 August")).toMatch(/ past window$/);
    expect(listSub(inp("no_response_close", { days: 800 }), "1 August")).toMatch(/^silent /);
    expect(listSub({ card: NOTE, days: 3 }, null)).toMatch(/^added /);
  });

  it("⚠️ states the absence in its own words where there is no figure at all", () => {
    expect(listSub(inp("full_requested", { days: null }), null)).toBe("no date on record");
    expect(listSub(inp("full_requested", { days: null }), null)).not.toContain("since request");
  });
});

describe("the date chip splits the date the row already holds", () => {
  it("month to three letters, upper, and the day", () => {
    expect(dateChip("1 August")).toEqual({ mon: "AUG", day: "1" });
    expect(dateChip("14 March 2024")).toEqual({ mon: "MAR", day: "14" });
  });
  it("⚠️ an absent date is an em dash, never a blank chip", () => {
    expect(dateChip(null)).toEqual({ mon: "", day: "—" });
    expect(dateChip("—")).toEqual({ mon: "", day: "—" });
  });
});
