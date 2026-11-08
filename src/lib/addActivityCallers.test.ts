/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EVERY addActivity CALL IN db.tsx, AND HOW ITS FAILURE IS HANDLED (timeline writer fix v1).
 *
 * The feed entry is narration: it must never decide whether the writer's action succeeded. So
 * every call is one of:
 *   - run through `narrate` (lib/narrate.ts), directly or as the narrator a write core runs
 *     after its own write lands (createManuscript, updateManuscriptFields, commitNudge);
 *   - the one durable record whose failure is reported by checking `success` (deleteManuscript).
 * A new call that is none of these fails this census, which is the point: decide which it is.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const db = strip(readFileSync(resolve(__dirname, "db.tsx"), "utf8"));

/** The 40 characters before each `addActivity(` call (not the declaration, not the context value). */
const calls = [...db.matchAll(/addActivity\(/g)].map((m) => db.slice(Math.max(0, m.index! - 48), m.index!).replace(/\s+/g, " "));

const HANDLED: [string, RegExp][] = [
  ["narrate(() => addActivity", /narrate\(\(\) => $/],
  ["a write core's narrator (createManuscript)", /\(newMs\) => $/],
  ["a write core's narrator (updateManuscriptFields)", /\? \(\) => $/],
  ["commitNudge's writeTwin", /writeTwin: \(\) => $/],
  ["the delete record, checked", /const deleteRecord = await $/],
];

describe("every addActivity call in db.tsx is narration or a checked record", () => {
  it("finds the calls (so an empty sweep cannot pass)", () => {
    expect(calls.length).toBe(9);
  });

  it("each call is one of the handled shapes", () => {
    const unhandled = calls.filter((c) => !HANDLED.some(([, re]) => re.test(c)));
    expect(unhandled, "an addActivity call whose failure handling is not one of the known shapes").toEqual([]);
  });

  it("the census, by shape", () => {
    const tally = Object.fromEntries(HANDLED.map(([name, re]) => [name, calls.filter((c) => re.test(c)).length]));
    expect(tally).toEqual({
      "narrate(() => addActivity": 5,                         // addAgent, updateAgent, deleteAgent, recordHoldingReply, recordOfferDecision
      "a write core's narrator (createManuscript)": 1,       // addManuscript
      "a write core's narrator (updateManuscriptFields)": 1, // updateManuscript
      "commitNudge's writeTwin": 1,                          // logNudge
      "the delete record, checked": 1,                       // deleteManuscript
    });
  });
});
