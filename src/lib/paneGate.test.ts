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
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TaskPaneBody } from "../components/todo/TaskPaneBody";
import { firstMissing, gateOpen, requiredFor, journeyKind, isBulkCard, requirementsFor, unanswered, missingPhrase, type JourneyKind, type GateAnswers } from "./paneGate";
import { BoardCard } from "./todoBoard";
import { recordSweepRow, fillFromAsks, copyFirstDown, type RecordSweepRow } from "./materialsSweep";

const NOTHING: GateAnswers = { unit: false, when: false, expect: false, remind: false, rows: false,
  holdday: false, checkin: false, again: false };
const ALL: GateAnswers = { unit: true, when: true, expect: true, remind: true, rows: true,
  holdday: true, checkin: true, again: true };

const card = (over: Partial<BoardCard> = {}): BoardCard =>
  ({ key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", kind: "", warn: false,
     snoozes: 0, hk: false, initials: "A", record: "", committed: false, done: false,
     taskType: "full_requested", relatedRecordId: "q1", ...over }) as BoardCard;

/* every member of the union, listed once — the test's own exhaustiveness, checked by the compiler */
const KINDS: JourneyKind[] = ["send", "decide", "chase", "close", "fix", "bulk", "note"];

/**
 * ⚠️ THE FORM, RENDERED FROM THE DECLARATION — never a hand-written row list (workspace round,
 * Phase 3). The two locks below used to SCRAPE `TaskPaneBody.tsx` for `data-req="when"` and
 * `sect("s-when")` literals, and the ledger emits both from an expression now, so both went red
 * over a form that had become MORE correct rather than less: the rows ARE `requirementsFor(kind)`,
 * so a requirement the form does not ask about is no longer expressible.
 *
 * A rendered artefact is what a claim about "the form marks this" was always about. It also
 * survives the relocation a source scrape cannot: move the component and this follows it by import
 * rather than by path.
 */
/**
 * ⚠️ `null` FOR A COHORT, BECAUSE THE SESSION NEVER MOUNTS THIS COMPONENT FOR ONE. A bulk card gets
 * `BulkFillTable`; handing `TaskPaneBody` a `rows` requirement renders a ledger row with no control
 * under it — a state no caller can produce, which is the "test the function with an input its
 * callers cannot supply" fault. The cohort's anchor is asserted against the table that really draws
 * it. This refusal is also what caught the case: the first version of this helper rendered bulk and
 * the new completeness half went red on a row the app has never shown anyone.
 */
const renderForm = (kind: JourneyKind): string | null =>
  kind === "bulk" ? null :
  renderToStaticMarkup(React.createElement(TaskPaneBody, {
    value: { rows: [], alongside: "", when: null, expect: null, remind: null, also: "",
             hold: null, checkin: null, again: null },
    onChange: () => {},
    questions: requirementsFor(kind).map((r) => ({
      id: r.id, field: r.field, label: r.label, answered: false,
    })),
    openId: null,
  }));

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
  it("every requirable key is a key the form marks", () => {
    for (const k of KINDS) {
      const html = renderForm(k);
      /* `rows` is the bulk table's, and the table marks its own — asserted in the bulk suite */
      if (html === null) { expect(requiredFor(k)).toEqual(["rows"]); continue; }
      const marked = new Set([...html.matchAll(/data-req="([a-z]+)"/g)].map((m) => m[1]));
      const want = requiredFor(k).filter((f) => f !== "rows");
      for (const f of want) {
        expect(marked.has(f), `${k} requires "${f}" and no row carries data-req="${f}"`).toBe(true);
      }
      /* ⚠️ AND NOTHING ELSE IS MARKED. The old scrape could only ever say "the form contains this
         key somewhere"; a render says the form asks exactly the questions the gate refuses on,
         which is the half that catches a form asking about something nobody requires. */
      expect([...marked].sort(), `${k} asks a question the declaration does not require`)
        .toEqual([...want].sort());
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

/**
 * ⚠️ THE TWO FILLS DO DIFFERENT THINGS, and the difference is the whole reason there are two.
 * One reads each agency's own requirements — so rows differ where the agencies differ; the other
 * says "the same as the first". A single template applied to every row would state that every send
 * carried the same parcel, which is the claim neither button is allowed to make.
 */
describe("⚠️ the bulk table's two fills", () => {
  const row = (queryId: string, asks: string[], sentMs: number): RecordSweepRow =>
    recordSweepRow({ queryId, agentName: `A-${queryId}`, dateSent: new Date(sentMs).toISOString() } as never,
      { sentOn: "1 Jan 2026", agentMaterials: asks });

  it("filling from requirements gives DIFFERENT rows where the agencies differ", () => {
    const before = [row("a", ["Query Letter"], 1), row("b", ["Query Letter", "Synopsis"], 2)];
    const after = fillFromAsks(before);
    const on = (r: RecordSweepRow) => r.rows.filter((x) => x.on).map((x) => x.key).sort().join(",");
    expect(on(after[0])).not.toBe(on(after[1]));
    /* and a row whose agent records nothing is LEFT UNTOUCHED — an empty requirement is not a
       statement that nothing was sent */
    const none = fillFromAsks([row("c", [], 3)]);
    expect(none[0].rows.some((x) => x.on)).toBe(false);
  });

  it("copy-down propagates the FIRST row, and only it", () => {
    const before = [row("a", ["Query Letter", "Synopsis"], 1), row("b", [], 2), row("c", [], 3)];
    const filled = fillFromAsks([before[0]]).concat(before.slice(1));
    const after = copyFirstDown(filled);
    const on = (r: RecordSweepRow) => r.rows.filter((x) => x.on).map((x) => x.key).sort().join(",");
    expect(on(after[1])).toBe(on(after[0]));
    expect(on(after[2])).toBe(on(after[0]));
  });
});

/**
 * ⚠️ FOUR SURFACES, ONE LIST (steer round, Phase 1). The square, the chip, the missing line and the
 * scroll target are four statements about one set. This asserts they cannot come apart — not that
 * each reads the right variable, which is the assertion that let the deed synonyms drift for months.
 */
describe("⚠️ the four surfaces read one declaration", () => {
  it("with two answers missing, chip, line and square all name the same two", () => {
    const a: GateAnswers = { unit: true, when: false, expect: true, remind: false, rows: false, holdday: false, checkin: false, again: false };
    const missing = unanswered("send", a);

    /* the chip's number */
    expect(missing).toHaveLength(2);
    /* the line's names, through the one grammar */
    expect(missingPhrase(missing.map((m) => m.name))).toBe("when it went and your reminder");
    /* the square's anchor and the scroll target — the same first entry, not two lookups */
    expect(missing[0].id).toBe("s-when");
    expect(firstMissing("send", a)).toBe(missing[0].field);
  });

  it("the phrase is one grammar, whatever the count", () => {
    expect(missingPhrase([])).toBe("");
    expect(missingPhrase(["one"])).toBe("one");
    expect(missingPhrase(["one", "two"])).toBe("one and two");
    expect(missingPhrase(["one", "two", "three"])).toBe("one, two and three");
  });

  /**
   * ⚠️ AND EVERY DECLARED ANCHOR MUST BE AN ANCHOR THE PANE RENDERS. A requirement the square
   * cannot sit on, or the scroll cannot reach, would gate the primary and point at nothing.
   * Scanned over the WHOLE body, not the first level — P5.1's lesson from the finish round.
   */
  /**
   * ⚠️ RETARGETED, ON NICK'S RULING (tasks-workflow, Pack B Phase 1) — and the LAW IS UNCHANGED.
   *
   * It used to scrape `id="(s-[a-z]+)"` out of the source. `TaskPaneBody` now takes an `idPrefix`
   * so two mounts cannot collide, which makes the attribute an EXPRESSION rather than a literal —
   * and **no prefix mechanism can keep `id="s-unit"` literal in source**, so the old form and the
   * feature were mutually exclusive rather than merely inconvenient.
   *
   * ⚠️ THE SECTION'S OWN NAME IS STILL A LITERAL, which is what this scrapes now: every section is
   * declared `sect("s-unit")`, and `sect` is the helper that decides whether a section is next. So
   * this still answers "does a section exist for every declared requirement", in source, cheaply —
   * and it cannot be defeated by the id's spelling changing again.
   *
   * ⚠️ AND THE STRONGER FORM OF THIS LAW NOW RUNS ON A RENDERED PAGE, which is where it belongs:
   * `tests/e2e/packB.measure.ts` mounts the pane and asserts every declared anchor RESOLVES to an
   * element that exists. A source test can only ever prove the code was written; that one proves
   * the section is there to be scrolled to, which is the thing the gate actually promises.
   */
  it("every requirement's id is a row the form declares", async () => {
    /* ⚠️ THE COHORT'S ANCHOR IS STILL READ FROM SOURCE, AND THAT IS THE RIGHT TOOL FOR IT.
       `BulkFillTable` renders one `<table id="s-rows">` — a literal, one anchor, no prefix — so
       "this literal is still emitted" is exactly the claim a source read makes well. Everything
       else is a RENDERED row, because "the form declares a row for this requirement" is a claim
       about output. */
    const table = await import("node:fs").then((fs) =>
      fs.readFileSync(new URL("../components/todo/BulkFillTable.tsx", import.meta.url), "utf8"));
    const cohortIds = new Set([...table.matchAll(/id="(s-[a-z]+)"/g)].map((m) => m[1]));
    expect(cohortIds.size, "no cohort anchor found at all — the scrape is broken, not the table")
      .toBeGreaterThan(0);
    for (const k of KINDS) {
      const html = renderForm(k) ?? "";
      const ids = new Set([...html.matchAll(/id="(s-[a-z]+)"/g)].map((m) => m[1]));
      for (const r of requirementsFor(k)) {
        const found = ids.has(r.id) || cohortIds.has(r.id);
        expect(found, `${k} requires "${r.name}" at #${r.id} and no row carries it`).toBe(true);
      }
    }
  });

  it("a note declares nothing, so no surface has anything to say", () => {
    const none: GateAnswers = { unit: false, when: false, expect: false, remind: false, rows: false, holdday: false, checkin: false, again: false };
    expect(requirementsFor("note")).toEqual([]);
    expect(unanswered("note", none)).toEqual([]);
    expect(missingPhrase([])).toBe("");
  });
});
