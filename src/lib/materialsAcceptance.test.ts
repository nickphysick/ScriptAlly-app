/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ACCEPTANCE — the missing-materials work, checked as a whole rather than per module.
 *
 * ⚠️ THIS FILE ASSERTS RELATIONSHIPS BETWEEN THE PIECES, not the pieces themselves; each has its
 * own suite. What is checked here is the things that can only go wrong BETWEEN them — the single
 * and bulk paths recording the same shape, the display map never reaching storage, and no materials
 * path acquiring a status write.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TASK_TYPES, completionVia, isTickable } from "./todoActions";
import { queriesMissingMaterials, BULK_MATERIALS_THRESHOLD, isBulkMaterialsGap } from "./queryMaterialsGap";
import { recordSweepRow, fillFromAsks, sweepWrites, copyFirstDown, sweepAnsweredCount } from "./materialsSweep";
import { openSend } from "./paneJourney";
import {
  materialRowsFromAgent, materialsWantedFromRows, formatSampleSpecs, snapToUnit, UNIT_CFG,
  type MaterialRow,
} from "./agentMaterials";
import { QueryStatus } from "../types";

const page = readFileSync(join(__dirname, "..", "components", "todo", "ToDoPage.tsx"), "utf8");
/** ⚠️ comments stripped — this repo's prose names every write it deliberately does NOT perform. */
const code = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
/** ⚠️ fails loudly on a missing anchor rather than silently widening to the rest of the file. */
function fn(name: string): string {
  const i = code.indexOf(`function ${name}`);
  expect(i, `${name} not found — the anchor moved`).toBeGreaterThan(-1);
  const j = code.indexOf("\n  }", i);
  expect(j, `${name} has no end`).toBeGreaterThan(i);
  return code.slice(i, j);
}

describe("⚠️ NO MATERIALS PATH WRITES A STATUS", () => {
  const STATUS_WRITES = ["updateQueryStatus", "recordMaterialsSent", "recomputeQuery", "undoQueryStatus"];

  it.each(["writeQueryMaterials", "commitMaterialsFromPane", "commitRecordSweep"])(
    "%s performs no status write", (name) => {
      const body = fn(name);
      for (const w of STATUS_WRITES) expect(body, `${name} calls ${w}`).not.toContain(w);
    });

  /**
   * ⚠️ RETARGETED AT THE FUNCTION THAT PERFORMS THE WRITE (popup round, Phase 1). It read
   * `commitMaterialsFromPane`, which now DELEGATES: the bare `updateQuery` was lifted into
   * `writeQueryMaterials` so a send can record its parcel without also raising the fill-in
   * journey's receipt. The lock followed the write rather than the name — pointed at the delegating
   * function it would have gone green on a body that no longer writes anything at all.
   */
  it("the two recording paths write the SAME single field, and only it", () => {
    for (const name of ["writeQueryMaterials", "commitRecordSweep"]) {
      const body = fn(name);
      expect(body).toContain("materialsWanted");
      /* no other query field may ride along */
      for (const f of ["status:", "responseDeadline", "dateSent", "revisionRound", "hasAgentResponded"]) {
        expect(body, `${name} also writes ${f}`).not.toContain(f);
      }
    }
  });

  /**
   * ⚠️ AND THE SEND'S PARCEL GOES THROUGH THAT SAME WRITER, never an inline `updateQuery`. A send
   * records two things about two records; the moment it grows its own materials write, the fill-in
   * journey and the send can start recording different shapes of the same fact.
   */
  it("the send arm records its parcel through the one materials writer", () => {
    const arm = fn("commitFromPane");
    expect(arm, "the send arm stopped writing the parcel").toContain("writeQueryMaterials");
    expect(arm, "the entrance grew its own query write").not.toContain("updateQuery(");
  });

  /**
   * ⚠️ THE TWO ESCAPE PATHS ARE RETIRED, AND THE RULE OUTLIVES THEM (popup round, Phase 2).
   * `leaveMaterialsUnrecorded` and `dismissRecordSweep` were page-side functions with no caller —
   * a control was never wired to either. Leaving without recording is the pane's Dismiss verb, and
   * `commitMaterialsFromPane` already refuses to write an empty parcel.
   *
   * Stated as a RETIREMENT rather than repointed at a survivor: an anchor that is gone usually
   * means the subject is gone, and a lock hunting a replacement anchor is how a bounded slice
   * silently widens to the rest of the file. This claim is stronger than the one it replaces —
   * it holds over the whole page rather than over two function bodies.
   */
  it("⚠️ the two unwired escape paths stay retired", () => {
    for (const name of ["leaveMaterialsUnrecorded", "dismissRecordSweep"]) {
      expect(code, `${name} came back`).not.toMatch(new RegExp(`function\\s+${name}\\s*\\(`));
    }
  });

  it("and no materials card is tickable, so the quick path cannot reach a write either", () => {
    const card = (t: string) => ({ key: "k", stream: "hk", taskType: t, relatedRecordId: "r" }) as never;
    for (const t of TASK_TYPES.filter((x) => x.startsWith("materials_"))) {
      expect(isTickable(card(t))).toBe(false);
      expect(completionVia(card(t))).toBe("none");
    }
  });
});

describe("⚠️ the single and bulk paths record the SAME shape", () => {
  const asks = ["Query letter", "Synopsis", "First 3 chapters"];

  it("both encode through `materialsWantedFromRows`, so neither can invent a shape", () => {
    const single = materialsWantedFromRows(materialRowsFromAgent(asks));
    const bulk = sweepWrites(fillFromAsks([
      recordSweepRow({ queryId: "q1", agentName: "A", sentMs: 1 }, { sentOn: "x", agentMaterials: asks }),
    ]))[0].materialsWanted;
    expect(bulk).toEqual(single);
  });

  it("⚠️ and both write STORED TOKENS, never the display label", () => {
    const out = materialsWantedFromRows(materialRowsFromAgent(asks));
    expect(out).toContain("Query letter");
    expect(out).not.toContain("Covering letter");
  });
});

describe("the sample picker's behaviour", () => {
  const rows = (s: string[]) => materialRowsFromAgent(s);

  it("selecting a unit seeds THAT unit's default", () => {
    for (const u of ["Chapters", "Pages", "Words"] as const) {
      expect(snapToUnit(u)).toBe(String(UNIT_CFG[u].def));
    }
  });

  it("deselecting clears the amount", () => {
    const on = rows(["First 50 pages"]);
    expect((on.find((r) => r.kind === "qty") as { amount: string }).amount).toBe("50");
    const off = on.map((r) => (r.kind === "qty" ? { ...r, on: false, amount: "" } : r)) as MaterialRow[];
    expect((off.find((r) => r.kind === "qty") as { amount: string }).amount).toBe("");
    expect(materialsWantedFromRows(off)).not.toContain("First 50 pages");
  });

  it("two units read correctly in BOTH joins", () => {
    const two = rows(["First 3 chapters", "First 50 pages"]);
    expect(formatSampleSpecs(two, "or")).toBe("3 chapters or 50 pages");
    expect(formatSampleSpecs(two, "and")).toBe("3 chapters · 50 pages");
  });
});

describe("the bulk table's own criteria", () => {
  const cohort = () => [
    recordSweepRow({ queryId: "a", agentName: "A", sentMs: 1 }, { sentOn: "x", agentMaterials: ["Query letter"] }),
    recordSweepRow({ queryId: "b", agentName: "B", sentMs: 2 }, { sentOn: "y", agentMaterials: ["Synopsis", "First 50 pages"] }),
  ];

  it("fill-from-requirements differs per row when the agencies differ", () => {
    const w = sweepWrites(fillFromAsks(cohort()));
    expect(w[0].materialsWanted).not.toEqual(w[1].materialsWanted);
  });

  it("copy-down propagates and the count tracks", () => {
    expect(sweepAnsweredCount(cohort())).toBe(0);
    const filled = fillFromAsks(cohort());
    expect(sweepAnsweredCount(filled)).toBe(2);
    const copied = copyFirstDown(filled);
    expect(sweepWrites(copied)[1].materialsWanted).toEqual(sweepWrites(copied)[0].materialsWanted);
  });

  it("nothing answered writes nothing — the primary's inert state has a real basis", () => {
    expect(sweepWrites(cohort())).toEqual([]);
  });
});

describe("closed queries produce no materials task", () => {
  const q = (status: QueryStatus) => ({
    id: "q1", userId: "u", manuscriptId: "m1", agentId: "ag1", packageId: "", status, dateSent: "2026-02-14",
  });
  const run = (status: QueryStatus) => queriesMissingMaterials({
    queries: [q(status)] as never, activities: [],
    agents: [{ id: "ag1", name: "A", agency: "B" }] as never,
    manuscripts: [{ id: "m1", title: "T" }], displayName: (a) => a.name,
  });

  it.each([QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE])("%s raises nothing", (s) => {
    expect(run(s)).toHaveLength(0);
  });

  it("and a live one still does", () => {
    expect(run(QueryStatus.QUERIED)).toHaveLength(1);
  });
});

describe("the journey opens empty", () => {
  it("⚠️ a fresh draft records nothing — the single form's own inert state", () => {
    const v = openSend([], undefined, new Date("2026-08-19"));
    expect(materialsWantedFromRows(v.recordRows)).toEqual([]);
  });

  it("the threshold is named and the two presentations never overlap", () => {
    for (let n = 0; n <= 8; n++) {
      const bulk = isBulkMaterialsGap(n);
      expect(bulk).toBe(n >= BULK_MATERIALS_THRESHOLD);
    }
  });
});
