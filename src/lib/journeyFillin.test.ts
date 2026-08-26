/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PHASE 6 — close, fill-in and note.
 *
 * ⚠️ THESE ARE UNIT LOCKS BECAUSE THE CARDS DO NOT EXIST ON THE MEASUREMENT ACCOUNT, AND THAT IS
 * STATED RATHER THAN QUIETLY PREFERRED. The single-query fill-in is raised only BELOW
 * `BULK_MATERIALS_THRESHOLD` (3) gaps — above it the board shows one cohort card instead — and the
 * harness account has 32, so `materials_unrecorded` cannot appear there at all. It also holds no
 * user note. The round's own report names both, and names what would make them measurable.
 *
 * The rule this repo records is that a layout claim is measured on a page; these are claims about
 * DECLARATIONS and about what a pure function returns, which is what a unit lock is for.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { flowFor, JOURNEYS, type JourneyId } from "./journeys";
import { requiredFor } from "./paneGate";
import { paneSentYMD } from "./paneCommit";
import { IMPORT_DAY_OPTIONS, DAY_OPTIONS, daySetFor, dayIsOn } from "../components/todo/TaskPaneBody";

const NOW = new Date("2026-08-26T09:00:00Z");
/** comments carry the words these locks forbid, so every source read strips them first */
const decls = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("Phase 6 · the fill-in's honest answer", () => {
  it("“I can’t remember” asks nothing, records nothing, and stops the asking", () => {
    const f = flowFor("fillin", "forget")!;
    expect(f, "the forget flow is gone").toBeTruthy();
    /* no questions is the whole point — a flow with none is not a flow missing its list */
    expect(f.questions).toEqual([]);
    /* and its write is the mute, not a committer: nothing reaches the query */
    expect(f.writes.kind).toBe("mute");
    /* it says what it does not touch, in its own standing line */
    expect(f.info ?? "").toMatch(/nothing is recorded and nothing is invented/i);
    expect(f.info ?? "").toMatch(/the query itself is untouched/i);
  });

  it("the mute is routed to the app's own per-query mute, and commits nothing", () => {
    const src = decls(readFileSync("src/components/todo/useTaskPaneSession.tsx", "utf8"));
    /* BOTH halves: the branch exists, AND it returns before reaching the committer */
    expect(src).toMatch(/w\.kind === "mute"[\s\S]{0,120}host\.mute/);
    expect(src).toMatch(/w\.kind === "mute"[\s\S]{0,160}return;/);
  });
});

describe("Phase 6 · “Not sure” leaves the date blank rather than guessing", () => {
  it("the two import answers resolve to no date at all", () => {
    expect(paneSentYMD({ kind: "unsure" }, NOW)).toBeNull();
    expect(paneSentYMD({ kind: "keep" }, NOW)).toBeNull();
  });

  it("and the send's own answers still resolve, so nothing was widened by accident", () => {
    expect(paneSentYMD({ kind: "today" }, NOW)).toBe("2026-08-26");
    expect(paneSentYMD({ kind: "yesterday" }, NOW)).toBe("2026-08-25");
    expect(paneSentYMD({ kind: "date", ymd: "2026-07-04" }, NOW)).toBe("2026-07-04");
    expect(paneSentYMD({ kind: "date", ymd: "" }, NOW)).toBeNull();
  });

  it("the fill-in offers the contract's three answers, and the send's are unchanged", () => {
    expect(IMPORT_DAY_OPTIONS.map((o) => o.label)).toEqual([
      "I know the date…",
      "Around then — keep the import date",
      "Not sure",
    ]);
    expect(DAY_OPTIONS.map((o) => o.label)).toEqual(["Today", "Yesterday", "Another date…"]);
  });

  it("the fill-in's flow asks for that set, and every other flow asks for the send's", () => {
    const fill = flowFor("fillin", "fill")!;
    expect(fill.dayset).toBe("import");
    expect(daySetFor(fill.dayset)).toBe(IMPORT_DAY_OPTIONS);
    /* ⚠️ THE OTHER HALF. An override asserted alone passes on a page where EVERY flow overrides. */
    const others = (Object.keys(JOURNEYS) as JourneyId[])
      .flatMap((id) => Object.entries(JOURNEYS[id].flows).map(([k, f]) => [id + "." + k, f] as const))
      .filter(([name]) => name !== "fillin.fill");
    expect(others.filter(([, f]) => f.dayset !== undefined).map(([n]) => n)).toEqual([]);
    expect(daySetFor(undefined)).toBe(DAY_OPTIONS);
  });

  it("each import answer lights its own pill and no other", () => {
    expect(dayIsOn({ kind: "unsure" }, "Not sure")).toBe(true);
    expect(dayIsOn({ kind: "unsure" }, "Around then — keep the import date")).toBe(false);
    expect(dayIsOn({ kind: "keep" }, "Around then — keep the import date")).toBe(true);
    expect(dayIsOn({ kind: "keep" }, "Not sure")).toBe(false);
    /* both sets reveal the same picker, so the date member lights whichever asked for it */
    expect(dayIsOn({ kind: "date", ymd: "" }, "I know the date…")).toBe(true);
    expect(dayIsOn({ kind: "date", ymd: "" }, "Another date…")).toBe(true);
    /* and an import answer never lights a send pill */
    expect(dayIsOn({ kind: "unsure" }, "Today")).toBe(false);
    expect(dayIsOn({ kind: "keep" }, "Yesterday")).toBe(false);
  });

  /**
   * ⚠️ THE ANSWER IS NOT WRITTEN, AND THIS LOCK STATES THAT RATHER THAN HIDING IT.
   *
   * The fill-in's When is REQUIRED and reaches nothing: `commitMaterialsFromPane` writes the
   * parcel alone. Writing `dateSent` here was tried in this phase and reverted —
   * `recomputeQuery` is that field's single writer and derives it from the activity log, so a
   * direct `updateQuery` would be overwritten and would meanwhile leave `responseDeadline`
   * describing a send date the record no longer claims. `materialsAcceptance.test.ts` caught it.
   *
   * Locked as a KNOWN GAP so that whoever closes it has to come here and say how — by writing an
   * activity, or by making the question optional. A silent fix would trip the acceptance lock;
   * this one says why.
   */
  it("the date answer is NOT written — a known gap, held open deliberately", () => {
    const src = decls(readFileSync("src/components/todo/useTaskCommit.tsx", "utf8"));
    expect(src).toMatch(/commitMaterialsFromPane[\s\S]{0,200}writeQueryMaterials\(card, v\.recordRows\)/);
    expect(src, "the materials writer grew a date write").not.toMatch(/writeQueryMaterials\([\s\S]{0,200}dateSent/);
  });
});

describe("Phase 6 · a note asks no When, because the tick carries its date", () => {
  it("neither note flow lists the send's day question", () => {
    for (const intent of ["tick", "date"] as const) {
      const f = flowFor("note", intent)!;
      expect(f, "note." + intent + " is gone").toBeTruthy();
      expect(f.questions, "note." + intent + " asks When").not.toContain("when");
    }
  });

  it("and the gate requires nothing of a note, so no row can appear from that side either", () => {
    expect(requiredFor("note")).toEqual([]);
  });

  it("the two intents are the only two things the app can add to someone else's words", () => {
    expect(JOURNEYS.note.fork.options.map((o) => o.id)).toEqual(["tick", "date"]);
  });
});

describe("Phase 6 · the strip's grammar is READ, not merely declared", () => {
  /**
   * ⚠️ THIS IS THE LOCK THE ROUND EXISTS FOR. `JourneyFlow.strip` declared seven grammars and had
   * no reader: every flow but the close and the send fell through to the consequences sentence,
   * which reads two answers those flows never ask, so the strip rendered a bare dash. The previous
   * assertion required only that each flow DECLARE a grammar — a test that a field is filled in.
   */
  it("every grammar any flow declares has a branch in the pane that renders it", () => {
    const declared = new Set<string>();
    for (const id of Object.keys(JOURNEYS) as JourneyId[]) {
      for (const f of Object.values(JOURNEYS[id].flows)) declared.add(f.strip);
    }
    expect(declared.size, "no grammars were collected — the sweep found nothing").toBeGreaterThan(4);
    const src = decls(readFileSync("src/components/todo/useTaskPaneSession.tsx", "utf8"));
    const unread = [...declared].filter((g) => !src.includes('g === "' + g + '"'));
    expect(unread, "declared and unread: " + unread.join(", ")).toEqual([]);
  });

  it("and the pane branches on nothing the declaration does not offer", () => {
    const declared = new Set<string>();
    for (const id of Object.keys(JOURNEYS) as JourneyId[]) {
      for (const f of Object.values(JOURNEYS[id].flows)) declared.add(f.strip);
    }
    const src = decls(readFileSync("src/components/todo/useTaskPaneSession.tsx", "utf8"));
    const branched = [...src.matchAll(/g === "([a-z]+)"/g)].map((m) => m[1]);
    expect(branched.length, "no branches found — the probe is reading the wrong file").toBeGreaterThan(4);
    expect([...new Set(branched)].filter((g) => !declared.has(g))).toEqual([]);
  });
});
