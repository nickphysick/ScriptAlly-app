/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * paneCommit — the pane's answers reaching the committers, and the takeover no longer opening.
 *
 * ⚠️ THE SEAM, NOT THE SURFACE. What broke here was never a writer: every committer was correct and
 * unreachable, and the primary opened a dialog instead. So these assert the JOIN — that the form's
 * value shape becomes the committers' value shape without losing an answer, and that the entrance
 * routes to a write rather than to a mount.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { paneCommits, paneCommitValues, paneSentYMD, paneExpectISO, paneNudgeISO } from "./paneCommit";
import type { JourneyKind } from "./paneJourney";
import type { SendBodyValues } from "../components/todo/TaskPaneBody";
import { materialRowsFromAgent } from "./agentMaterials";
import { DEFAULT_CHECKBACK_DAYS } from "./todoWalk";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
/** ⚠️ comments stripped — this file's prose names every surface it deliberately stopped opening. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(read("../components/todo/ToDoPage.tsx"));

function slice(name: string): string {
  const i = page.indexOf(`function ${name}`);
  expect(i, `${name} not found — the anchor moved`).toBeGreaterThan(-1);
  const j = page.indexOf("\n  }", i);
  expect(j, `${name} has no end`).toBeGreaterThan(i);
  return page.slice(i, j);
}

const NOW = new Date("2026-08-21T09:00:00");
const body = (over: Partial<SendBodyValues> = {}): SendBodyValues => ({
  rows: materialRowsFromAgent([]), alongside: "", when: null, expect: null, remind: null, also: "", ...over,
});

/* every member of the union, listed once — the compiler checks this list is complete */
const KINDS: JourneyKind[] = ["send", "chase", "close", "offer", "note", "fix", "materials"];

describe("⚠️ which journeys the pane commits — declared, never defaulted", () => {
  it("every journey states an answer", () => {
    for (const k of KINDS) expect(typeof paneCommits(k), `${k} has no declaration`).toBe("boolean");
  });

  /**
   * ⚠️ THE TWO FALSE ONES ARE THE POINT. An offer asks for a branch and a decision; an agent-record
   * gap asks for a response window, materials and a wish list. This form draws none of those, so
   * routing them to their committers would run a writer with nothing to write — behind a button
   * that had just told the writer it recorded something.
   */
  it("the two the form cannot answer keep the hand-off, and the other five do not", () => {
    expect(paneCommits("offer")).toBe(false);
    expect(paneCommits("fix")).toBe(false);
    for (const k of ["send", "chase", "close", "materials", "note"] as JourneyKind[]) {
      expect(paneCommits(k), `${k} still hands off`).toBe(true);
    }
  });
});

describe("⚠️ the pane's answers reach the committer's shape", () => {
  it("an unanswered day is null, and a revealed-but-empty date is too", () => {
    expect(paneSentYMD(null, NOW)).toBeNull();
    expect(paneSentYMD({ kind: "date", ymd: "" }, NOW)).toBeNull();
    expect(paneSentYMD({ kind: "today" }, NOW)).toBe("2026-08-21");
    expect(paneSentYMD({ kind: "yesterday" }, NOW)).toBe("2026-08-20");
    expect(paneSentYMD({ kind: "date", ymd: "2026-07-04" }, NOW)).toBe("2026-07-04");
  });

  /**
   * ⚠️ A WINDOW WITH NOTHING TO HANG OFF IS NOT A DATE. The pane requires both answers on a send, so
   * this is the shape of a journey mid-answer — and the honest output is absence, not today.
   */
  it("a window resolves only once there is a send date", () => {
    expect(paneExpectISO({ kind: "weeks", weeks: 6 }, null)).toBeUndefined();
    const iso = paneExpectISO({ kind: "weeks", weeks: 6 }, "2026-08-21");
    expect(iso).toBeTruthy();
    expect(new Date(iso!).getTime()).toBeGreaterThan(new Date("2026-09-25").getTime());
  });

  it("a lead is measured back from the expected reply, and needs one to exist", () => {
    const expectISO = new Date("2026-10-02T12:00:00").toISOString();
    expect(paneNudgeISO({ kind: "lead", days: 7 }, expectISO)!.slice(0, 10)).toBe("2026-09-25");
    /* "on the day" is a real answer and lands on the day, not near it */
    expect(paneNudgeISO({ kind: "lead", days: 0 }, expectISO)).toBe(expectISO);
    expect(paneNudgeISO({ kind: "lead", days: 7 }, undefined)).toBeUndefined();
  });

  /**
   * ⚠️ `No reminder` AND "not asked" BOTH RESOLVE TO ABSENT, and that is correct rather than lossy —
   * the difference between them is a fact about the conversation, not about the query.
   */
  it("declining a reminder writes nothing, and so does not having chosen", () => {
    expect(paneNudgeISO({ kind: "none" }, new Date().toISOString())).toBeUndefined();
    expect(paneNudgeISO(null, new Date().toISOString())).toBeUndefined();
  });

  /**
   * ⚠️ THE ANSWER THE WRITE ROUND RESCUED, ASSERTED AT THE JOIN. The send form REQUIRES an
   * expectation and a reminder; before this round they travelled as a takeover prefill, so the day
   * the primary began committing in place they would have been demanded and then dropped.
   */
  it("a fully answered send carries its expectation and its reminder into the values", () => {
    const v = paneCommitValues({
      kind: "send", now: NOW, queryMethod: "Post",
      body: body({ when: { kind: "today" }, expect: { kind: "weeks", weeks: 6 }, remind: { kind: "lead", days: 7 } }),
    });
    expect(v.sentDate).toBe("2026-08-21");
    expect(v.method).toBe("Post");
    expect(v.writerExpectedDate, "the expectation was dropped at the boundary").toBeTruthy();
    expect(v.nudgeDate, "the reminder was dropped at the boundary").toBeTruthy();
    /* the reminder sits a week before the expectation — one arithmetic, not two */
    expect(new Date(v.writerExpectedDate!).getTime() - new Date(v.nudgeDate!).getTime())
      .toBe(7 * 86400000);
  });

  it("an unanswered pair leaves both keys absent rather than stamping today", () => {
    const v = paneCommitValues({ kind: "send", now: NOW, body: body({ when: { kind: "today" } }) });
    expect("writerExpectedDate" in v && v.writerExpectedDate !== undefined).toBe(false);
    expect("nudgeDate" in v && v.nudgeDate !== undefined).toBe(false);
  });

  /**
   * ⚠️ THE CLOSE'S REASON IS FIXED BECAUSE THE JOURNEY IS. The close bucket is exactly
   * `no_response_close`, and the pane's own strip says "Closed as no response" before the press —
   * so the write agrees with the sentence the writer read. `null` would make the primary do nothing.
   */
  it("a close carries the reason its own strip promised, and nothing else does", () => {
    expect(paneCommitValues({ kind: "close", now: NOW, body: body({ when: { kind: "today" } }) }).reason)
      .toBe("no_reply");
    expect(paneCommitValues({ kind: "send", now: NOW, body: body() }).reason).toBeNull();
  });

  it("the chase carries the shared check-back default, not a second number", () => {
    expect(paneCommitValues({ kind: "chase", now: NOW, body: body() }).checkBackDays)
      .toBe(DEFAULT_CHECKBACK_DAYS);
  });

  /**
   * ⚠️ TWO FREE-TEXT FIELDS, TWO DESTINATIONS, AND SWAPPING THEM IS SILENT. "Anything else going
   * with it?" is part of the PARCEL (the committer appends it to materials); "Anything else?" is
   * the note kept on file. Both are strings, so nothing downstream would notice the exchange.
   */
  it("the parcel's extra and the remembered note do not change places", () => {
    const v = paneCommitValues({ kind: "send", now: NOW, body: body({ alongside: "author bio", also: "posted late" }) });
    expect(v.also).toBe("author bio");
    expect(v.note).toBe("posted late");
  });
});

describe("⚠️ the primary commits, and mounts nothing", () => {
  /**
   * ⚠️ THE SOURCE CLAIM, BOUNDED TO THE FUNCTION. `openFlowCards` still exists and is still right
   * for the two journeys this form cannot answer — so the assertion is not that the call is gone
   * from the file, but that it is GUARDED behind the declaration that names them.
   */
  it("dockPrimary routes to the write, and reaches the takeover only past `paneCommits`", () => {
    const body = slice("dockPrimary");
    expect(body, "the primary stopped committing").toContain("commitFromPane(");
    expect(body, "the primary stopped building the pane's answers").toContain("paneCommitValues(");
    const guard = body.indexOf("paneCommits(");
    const mount = body.indexOf("openFlowCards(");
    expect(guard, "the declaration is not consulted").toBeGreaterThan(-1);
    expect(mount, "the hand-off vanished — the two undrawn journeys have nowhere to go")
      .toBeGreaterThan(guard);
  });

  /**
   * ⚠️ THE PREFILL WAS THE BRIDGE, AND THE BRIDGE IS GONE FROM THIS PATH. It existed only to carry
   * the pane's answers ACROSS the takeover boundary. `setFlowPrefill` survives elsewhere — the
   * receipt's "Edit details" re-opens the journey with what the quick ✓ logged — so this is bounded
   * to `dockPrimary` rather than swept from the file.
   */
  it("the primary no longer prefills a takeover with answers it could write itself", () => {
    expect(slice("dockPrimary")).not.toContain("setFlowPrefill");
  });

  /**
   * ⚠️ ADVANCING IS GATED ON HAVING WRITTEN. A failed or empty commit that still moved the writer on
   * would report success by moving — the one receipt nobody reads and everybody believes.
   */
  it("it advances only on a commit that wrote", () => {
    const body = slice("dockPrimary");
    const wrote = body.indexOf("if (!wrote) return;");
    const advance = body.indexOf("setDockKey(nextKey)");
    expect(wrote, "the commit's answer is not consulted before advancing").toBeGreaterThan(-1);
    expect(advance).toBeGreaterThan(wrote);
    /* and the next card is read BEFORE the write — the board is derived, so afterwards it is gone */
    expect(body.indexOf("const nextKey")).toBeLessThan(body.indexOf("commitFromPane("));
  });

  /**
   * ⚠️ THE SEND'S TWO ANSWERS REACH THE PAYLOAD. `markSentWriteArgs` has accepted both for a round;
   * what was missing was a committer that passed them. Asserted on the payload, not on the write
   * path, because the write path was never the thing that dropped them.
   */
  it("the send committer carries the expectation and the reminder", () => {
    const body = slice("commitSendFromPane");
    expect(body, "the expectation is dropped again").toContain("v.writerExpectedDate");
    expect(body, "the reminder is dropped again").toContain("v.nudgeDate");
  });

  /**
   * ⚠️ EVERY ARM REPORTS WHETHER IT WROTE. A committer returning `void` would make "did anything
   * happen" unanswerable at the entrance, and the pane would advance on all seven regardless.
   */
  it("the entrance and every arm it routes to return a verdict", () => {
    expect(slice("commitFromPane")).toContain("Promise<boolean>");
    for (const n of ["commitSendFromPane", "commitChaseFromPane", "commitCloseFromPane",
                     "commitMaterialsFromPane", "commitRecordSweep", "commitOfferFromPane",
                     "commitFixFromPane"]) {
      expect(slice(n), `${n} does not say whether it wrote`).toContain("Promise<boolean>");
    }
  });
});
