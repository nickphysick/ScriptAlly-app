/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * What actually goes at each stage (journeys pack, Phase 3).
 *
 * ⚠️ THE FAULT THESE EXIST FOR: the build this replaces offered a synopsis on EVERY send, so the
 * writer was invited to re-send something the agent has held since the original submission.
 * Offering to send what someone already has is not a neutral default — it is the app suggesting
 * work that should not happen, on the surface whose job is recording what did.
 */
import { describe, it, expect } from "vitest";
import { journeyMaterials, synopsisStateFor, journeySummary } from "./journeyMaterials";
import { cardBucket } from "./todoBuckets";

const rows = (b: Parameters<typeof journeyMaterials>[0], t?: string, syn: "held" | "none" | "unknown" = "held") =>
  journeyMaterials(b, t, syn, "Greg");

describe("⚠️ A PARTIAL OR A FULL IS PAGES AND NOTHING ELSE", () => {
  it("a full requested lists the manuscript, and only that", () => {
    const m = rows("send", "full_requested");
    expect(m.rows.map((r) => r.label)).toEqual(["The manuscript"]);
    expect(m.rows[0].on).toBe(true);
  });

  it("a partial lists the pages the agent asked for, and only that", () => {
    const m = rows("send", "partial_requested");
    expect(m.rows).toHaveLength(1);
    expect(m.rows[0].on).toBe(true);
  });

  /**
   * ⚠️ THE SAMPLE TAKES THE AGENT'S OWN WORDS WHERE THEY MADE AN ASK. A row reading "First 50
   * pages" over a request that said three chapters is the app putting words in an agency's mouth.
   */
  it("the sample is named from the agent's ask, and falls back honestly", () => {
    expect(journeyMaterials("send", "partial_requested", "held", "Greg", ["First three chapters"]).rows[0].label)
      .toBe("First three chapters");
    expect(journeyMaterials("send", "partial_requested", "held", "Greg", []).rows[0].label).toBe("The partial");
    /* never an invented specific */
    expect(journeyMaterials("send", "partial_requested", "held", "Greg").rows[0].label).not.toMatch(/\d/);
  });

  /**
   * ⚠️ THIS ASSERTION USED TO PASS `"send"`, AND AN R&R CARD CANNOT PRODUCE THAT BUCKET. The
   * journey's real call site passes `cardBucket(card)`, which for `revise_resubmit` is `decide` —
   * and `decide` sat in the no-materials guard, so both rows returned `[]` on screen while this
   * test went green against an argument no caller could supply. A unit test that hands a function
   * an input its callers cannot is testing a function nobody runs.
   *
   * ⚠️ SO THE BUCKET IS DERIVED HERE, NOT NAMED. Writing `"decide"` as a literal would go green the
   * day `cardBucket` moved R&R somewhere else, which is the same fault one step along.
   */
  it("an R&R goes back with the work AND an account of what changed, both pre-ticked — AT ITS REAL BUCKET", () => {
    const bucket = cardBucket({ taskType: "revise_resubmit" } as unknown as Parameters<typeof cardBucket>[0]);
    const m = journeyMaterials(bucket, "revise_resubmit", "held", "Greg");
    expect(m.rows.map((r) => r.label)).toEqual(["The revised manuscript", "A note on what changed"]);
    expect(m.rows.every((r) => r.on)).toBe(true);
  });

  it("⚠️ A CHASE AND A CLOSE CARRY NO MATERIALS — nothing is being sent", () => {
    for (const b of ["chase", "close", "fix", "note", "decide"] as const) {
      expect(rows(b).rows, b).toEqual([]);
      expect(rows(b).note, b).toBeNull();
    }
  });
});

describe("⚠️ THE SYNOPSIS ROW IS CONDITIONAL AND JUSTIFIES ITSELF ON SCREEN", () => {
  it("a known absence earns the row, states why, and is NOT pre-ticked", () => {
    const m = rows("send", "full_requested", "none");
    const syn = m.rows.find((r) => r.id === "synopsis");
    expect(syn).toBeTruthy();
    /* the record can say the agent has never seen one; it cannot say the writer means to send one */
    expect(syn!.on).toBe(false);
    expect(syn!.sub).toContain("no synopsis");
    expect(m.note).toBeNull();
  });

  it("a held synopsis yields no row, and the step says so once, quietly", () => {
    const m = rows("send", "full_requested", "held");
    expect(m.rows.find((r) => r.id === "synopsis")).toBeUndefined();
    expect(m.note).toContain("already holds");
    expect(m.note).toContain("query letter and synopsis");
  });

  /**
   * ⚠️ UNKNOWN IS NOT "NONE". A query logged before packages existed has not told us a synopsis
   * was absent, only that nothing linked it — treating silence as an absence would put a row, and
   * a claim about the agency's submission route, on most historical queries.
   */
  it("⚠️ UNKNOWN HIDES THE ROW AND CLAIMS NOTHING", () => {
    const m = rows("send", "full_requested", "unknown");
    expect(m.rows.find((r) => r.id === "synopsis")).toBeUndefined();
    expect(m.note).toBeNull();
  });

  it("the state is read structurally from the package, never parsed", () => {
    const find = (id: string) => ({ q: { synopsisVersionId: "v9" }, none: { synopsisVersionId: "" } }[id]);
    const filled = (v: string | null | undefined) => !!v && v !== "";
    expect(synopsisStateFor("q", find, filled)).toBe("held");
    expect(synopsisStateFor("none", find, filled)).toBe("none");
    /* no package linked, or a dangling id — both unknown */
    expect(synopsisStateFor(undefined, find, filled)).toBe("unknown");
    expect(synopsisStateFor("missing", find, filled)).toBe("unknown");
  });
});

describe("⚠️ THE SUMMARY STRIP READS LIVE FORM STATE, never the string it is about to compose", () => {
  it("it assembles from ticks, channel and date", () => {
    expect(journeySummary({ materials: ["The first fifty pages"], channel: "Email", when: "today" }))
      .toBe("Going on the record: the first fifty pages, email, today.");
  });

  /* ⚠️ BOTH HALVES OF THIS CASE WERE BUGS THE FIRST TIME IT RAN: only the first material was
     lowercased ("…manuscript and A note on what changed"), and the DATE was being lowercased with
     everything else ("12 aug"), which is a date the app has damaged. */
  it("it lists several materials as a sentence, and leaves the date's case alone", () => {
    expect(journeySummary({ materials: ["The revised manuscript", "A note on what changed"], when: "12 Aug" }))
      .toBe("Going on the record: the revised manuscript and a note on what changed, 12 Aug.");
  });

  /**
   * ⚠️ A CLEARED FORM SAYS SO PLAINLY rather than rendering an empty sentence — the commit button
   * must never be the first time the writer sees what is about to be written, and "Going on the
   * record: ." is worse than saying nothing is chosen.
   */
  it("⚠️ NOTHING SELECTED READS AS NOTHING SELECTED", () => {
    expect(journeySummary({ materials: [] })).toBe("Nothing selected yet.");
    expect(journeySummary({ materials: [], also: "   " })).toBe("Nothing selected yet.");
  });

  it("a note alone is still an account of what will be written", () => {
    expect(journeySummary({ materials: [], also: "posted, not emailed" })).toBe("Going on the record: your note.");
  });
});
