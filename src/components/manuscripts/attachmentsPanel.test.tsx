/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ A SOURCE LOCK, NOT A RENDER TEST, AND THE REASON IS THE SAME ONE THAT MOVED THE PANEL OUT OF
 * `OverviewPane`. This component needs the Firestore listener, so it imports `useScriptAllyDb`,
 * which transitively initialises Firebase auth at module scope — rendering it here would make this
 * file fail to LOAD with `auth/invalid-api-key`, which is not a failing test but a file that never
 * ran.
 *
 * ⚠️ SO THE BEHAVIOURAL CLAIMS LIVE IN `attachmentRows.test.ts`, WHERE THEY ARE REAL. That module
 * is pure and was proved red before it was written. What is asserted here is that the component
 * uses it — a composition claim, which is the half a pure test cannot make.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const src = readFileSync(join(__dirname, "AttachmentsPanel.tsx"), "utf8");
/** A source lock asserts over CODE, never the prose explaining it. */
const decls = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the attachments panel", () => {
  /**
   * ⚠️ THE COMPOSITION CLAIM. The rows must come from `attachmentRows`, which cannot mark an
   * in-flight upload committed. A panel that merged its own arrays would put optimism straight back
   * in, and every assertion in attachmentRows.test.ts would go on passing about a function nobody
   * calls — the shape this repo records as a whole cluster of green tests with no caller.
   */
  it("renders through attachmentRows and merges nothing itself", () => {
    expect(decls).toContain("attachmentRows(mine, uploads)");
    /* The committed list is filtered from the listener's array and nothing is pushed into it. */
    expect(decls).toContain("attachments.filter((a) => a.manuscriptId === manuscriptId)");
    expect(decls, "the panel built its own merged list").not.toMatch(/\[\s*\.\.\.uploads\s*,\s*\.\.\.mine/);
  });

  /**
   * ⚠️ A FAILURE REPLACES THE PENDING ROW. Removing it would tell the writer nothing at all — the
   * same silent discard as showing it wrongly as stored.
   *
   * ⚠️ AND THE SLICE IS THE CATCH BLOCK, NOT THE WHOLE HANDLER. The first form asserted that the
   * handler contained `kind: "failed"` anywhere — satisfied by the PRE-FLIGHT refusal branch above
   * it, so a mutation that silently dropped the caught failure left it green. It was a property of
   * the parts standing in for a claim about one branch.
   */
  it("turns a CAUGHT failure into a failed row rather than dropping it", () => {
    const handler = decls.slice(decls.indexOf("async function onPick"), decls.indexOf("async function onDownload"));
    expect(handler, "the handler moved").not.toBe("");

    const from = handler.indexOf("} catch");
    const to = handler.indexOf("} finally");
    expect(from, "the catch block is gone").toBeGreaterThan(-1);
    expect(to, "the finally anchor is gone").toBeGreaterThan(from);
    const caught = handler.slice(from, to);
    expect(caught, "a caught failure is silently removed").toContain('kind: "failed"');
    expect(caught, "the catch drops the row instead of marking it").not.toContain("filter((x) => x.id !== id)");

    /* And the success path is the ONLY one that drops it. */
    const success = handler.slice(handler.indexOf("await addAttachment"), from);
    expect(success).toContain("filter((x) => x.id !== id)");
  });

  /**
   * ⚠️ THE CAP MESSAGE MAY NOT IMPLY A CONTROL. 20 files is a UI limit; the rules do not count. The
   * wording states what applies here and does not claim a refusal.
   */
  it("states the file cap without claiming it is enforced", () => {
    expect(decls).toContain("files is the limit here");
    for (const word of ["not allowed", "forbidden", "denied", "rejected by"]) {
      expect(decls.toLowerCase(), `the cap message implies a server refusal: ${word}`)
        .not.toContain(word);
    }
  });

  /** ⚠️ NO RED, AND NO VERDICT WORDS. The page reports; it does not alarm. */
  it("carries no alarm colouring and no verdict language", () => {
    expect(decls, "a red was introduced").not.toMatch(/#[a-f0-9]*(?:e0|f0|ff)0{0,2}[0-9a-f]{0,2}\b|\bred\b|crimson/i);
    for (const w of ["failed to", "error!", "invalid", "you must", "you should"]) {
      expect(decls.toLowerCase()).not.toContain(w);
    }
  });

  /** The three material caps, stated once each and read from the one module. */
  it("reads its caps from lib/attachments rather than restating them", () => {
    expect(decls).toContain('from "../../lib/attachments"');
    expect(decls, "a cap was restated in the component").not.toMatch(/25 \* 1024|26214400|>= 20\b/);
  });
});
