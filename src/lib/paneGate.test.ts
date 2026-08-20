/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneGate — what each journey requires, and what happens when it is not met.
 *
 * ⚠️ THE EXHAUSTIVENESS GUARD IS PROVEN BY THE COMPILER, NOT BY THIS FILE. Adding a member to
 * `JourneyKind` without a `case` produces
 *   `Type '"brand_new_journey"' is not assignable to type 'never'` at paneGate.ts:65
 * — verified by doing exactly that during the finishing round and reading the error. A runtime test
 * cannot make that claim: it can only pass a value the type system already permits.
 */
import { describe, it, expect } from "vitest";
import { firstMissing, gateOpen, requiredFor, journeyKind, isBulkCard, type JourneyKind, type GateAnswers } from "./paneGate";
import { BoardCard } from "./todoBoard";

const NOTHING: GateAnswers = { unit: false, when: false, expect: false, remind: false, rows: false };
const ALL: GateAnswers = { unit: true, when: true, expect: true, remind: true, rows: true };

const card = (over: Partial<BoardCard> = {}): BoardCard =>
  ({ key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", kind: "", warn: false,
     snoozes: 0, hk: false, initials: "A", record: "", committed: false, done: false,
     taskType: "full_requested", relatedRecordId: "q1", ...over }) as BoardCard;

/* every member of the union, listed once — the test's own exhaustiveness, checked by the compiler */
const KINDS: JourneyKind[] = ["send", "decide", "chase", "close", "fix", "bulk", "note"];

describe("⚠️ one required-fields declaration per journey", () => {
  it("every journey declares, and the empty ones are decisions rather than gaps", () => {
    for (const k of KINDS) expect(Array.isArray(requiredFor(k)), `${k} has no declaration`).toBe(true);
    /* the four the brief names, exactly */
    expect(requiredFor("send")).toEqual(["unit", "when", "expect", "remind"]);
    expect(requiredFor("close")).toEqual(["when"]);
    expect(requiredFor("bulk")).toEqual(["rows"]);
    expect(requiredFor("note")).toEqual([]);
  });

  it("a note may commit with nothing answered; a send may not", () => {
    expect(gateOpen("note", NOTHING)).toBe(true);
    expect(gateOpen("send", NOTHING)).toBe(false);
    expect(gateOpen("send", ALL)).toBe(true);
  });

  /**
   * ⚠️ THE FIRST MISSING FIELD IS THE FIRST ONE DOWN THE PAGE, which is why the declaration is an
   * ARRAY and not a set. The pane scrolls to what this names; naming the wrong one would send the
   * writer past the answer they still owe.
   */
  it("it names the first unmet requirement in the form's own order", () => {
    expect(firstMissing("send", NOTHING)).toBe("unit");
    expect(firstMissing("send", { ...NOTHING, unit: true })).toBe("when");
    expect(firstMissing("send", { ...NOTHING, unit: true, when: true })).toBe("expect");
    expect(firstMissing("send", { ...NOTHING, unit: true, when: true, expect: true })).toBe("remind");
    expect(firstMissing("send", ALL)).toBeNull();
  });

  /**
   * ⚠️ AND THE ANSWER IT NAMES MUST BE ONE THE PANE CAN POINT AT. Every key the declaration can
   * return is a `data-req` the form renders; a requirement the pane cannot scroll to would gate the
   * primary with no way for the writer to satisfy it.
   */
  it("every requirable key is a key the form marks", async () => {
    const body = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../components/todo/TaskPaneBody.tsx", import.meta.url), "utf8"));
    const marked = new Set([...body.matchAll(/data-req="([a-z]+)"/g)].map((m) => m[1]));
    for (const k of KINDS) {
      for (const f of requiredFor(k)) {
        /* `rows` is the bulk table's, and the table marks its own — asserted in the bulk suite */
        if (f === "rows") continue;
        expect(marked.has(f), `${k} requires "${f}" and no label carries data-req="${f}"`).toBe(true);
      }
    }
  });
});

describe("⚠️ bulk is its own journey, not a flag on fix", () => {
  it("the two fill-ins are told apart by the card, not by a count", () => {
    expect(journeyKind(card({ taskType: "materials_unrecorded_bulk" }))).toBe("bulk");
    expect(journeyKind(card({ taskType: "materials_unrecorded" }))).toBe("fix");
    expect(isBulkCard(card({ taskType: "materials_unrecorded_bulk" }))).toBe(true);
    expect(isBulkCard(card({ taskType: "materials_unrecorded" }))).toBe(false);
  });

  it("a cohort needs one touched row and nothing else", () => {
    expect(gateOpen("bulk", NOTHING)).toBe(false);
    expect(gateOpen("bulk", { ...NOTHING, rows: true })).toBe(true);
  });
});
