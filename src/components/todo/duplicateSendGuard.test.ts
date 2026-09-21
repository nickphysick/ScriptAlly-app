/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The duplicate-send guard, on EVERY write path that can send (task-modal round, 21 Sep).
 *
 * ⚠️ THIS IS THE TEST THAT WOULD HAVE FAILED, AND THE REASON IT DID NOT EXIST IS THE FINDING.
 * `priorSameTypeSend` was consulted in `quickDone` and nowhere else. The dashboard's tick reached
 * it, so a second full manuscript to an agent who already had one was refused — by the ROUTE rather
 * than by the rule. The moment the tick began opening a modal and committing through
 * `commitSendFromPane` instead, that send was written with no question asked: through a clean
 * production build and **8,187 green unit tests**, because not one of them asked whether the guard
 * was still on the path a send actually takes.
 *
 * ⚠️ SO IT ASSERTS THE RULE OVER THE PATHS, NOT OVER A SURFACE (Nick, 21 Sep: *"put it beside the
 * guard, not beside the modal, so it survives the next surface change too"*). A test written
 * against the modal would go green the day a fourth surface arrives without one — which is the
 * fault it is here to prevent, one iteration along.
 *
 * ⚠️ AND IT READS THE SOURCE OF THE COMMITTERS, DELIBERATELY. `useTaskCommit` is a hook over the
 * Firebase-backed db context; this repo's test environment is `node` with no emulator, so calling
 * it would need the whole SDK mocked and the test would then be asserting the mock. What must be
 * true is structural — *every function that performs a send consults the guard before writing* —
 * and that is a claim about the file. The behavioural half (does the prompt name the right send,
 * does declining write nothing) is `todoWalk.test.ts`'s, over the pure functions.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { priorSameTypeSend, duplicateSendPrompt } from "../../lib/todoWalk";
import { ActivityType, QueryStatus } from "../../types";
import type { Activity } from "../../types";
import { sliceBetween } from "../../test/sliceBetween";

const here = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(here, "useTaskCommit.tsx"), "utf8");
/** ⚠️ COMMENTS STRIPPED — this file's own prose names every symbol it is hunting for. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/**
 * Every function in `useTaskCommit` that performs a SEND.
 *
 * ⚠️ THE LIST IS DERIVED, NOT TYPED. A hand-written list is the thing that went stale here once
 * already: it would have said `quickDone` and stayed correct-looking while a second sender arrived
 * beside it. The senders are whichever functions call `recordMaterialsSent` — the ONE mark-sent
 * write path, which the file says of itself at the call site.
 */
function sendersIn(file: string): string[] {
  const body = decls(file);
  const names: string[] = [];
  const re = /(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g;
  const starts: { name: string; at: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) starts.push({ name: m[1], at: m.index });
  starts.forEach((f, i) => {
    const seg = body.slice(f.at, i + 1 < starts.length ? starts[i + 1].at : body.length);
    if (seg.includes("recordMaterialsSent(")) names.push(f.name);
  });
  return names;
}

describe("the duplicate-send guard is on every path that can send", () => {
  /**
   * ⚠️ THE POPULATION FIRST. A sweep over an empty set passes, and "no sender is unguarded" is
   * exactly the shape that goes vacuously green the day a rename makes the finder match nothing.
   */
  it("finds both senders — the quick path and the pane's committer", () => {
    const senders = sendersIn(src);
    expect(senders.length, `senders found: ${senders.join(", ")}`).toBe(2);
    expect(senders.sort()).toEqual(["commitSendFromPane", "quickDone"]);
  });

  it("every sender consults the guard BEFORE it writes", () => {
    const body = decls(src);
    for (const name of sendersIn(src)) {
      const start = body.indexOf(`function ${name}(`);
      const rest = body.slice(start);
      const guardAt = rest.indexOf("priorSameTypeSend(");
      const writeAt = rest.indexOf("recordMaterialsSent(");
      expect(guardAt, `${name} never consults priorSameTypeSend`).toBeGreaterThan(-1);
      /* ⚠️ ORDER, NOT PRESENCE. A guard consulted after the write is a guard that has already lost;
         and a check for presence alone passes on exactly that arrangement. */
      expect(guardAt, `${name} writes before it asks`).toBeLessThan(writeAt);
    }
  });

  it("every sender REFUSES on a declined confirm, rather than asking and proceeding", () => {
    const body = decls(src);
    for (const name of sendersIn(src)) {
      const seg = name === "quickDone"
        ? sliceBetween(body, `function ${name}(`, "async function writeQueryMaterials")
        : sliceBetween(body, `function ${name}(`, "recordMaterialsSent(");
      /* the whole of the rule: declining returns false, which every caller reads as "nothing was
         written" — see `quickDone`'s own note on why it reports rather than assumes */
      expect(seg, `${name} asks without acting on the answer`)
        .toMatch(/!\(await confirmAsk\([\s\S]*?\)\)\)?\s*return false/);
    }
  });
});

/**
 * The predicate itself, over inputs the app can really produce.
 *
 * ⚠️ THE STATUS COMES FROM `getPrimaryAction`'s TARGET IN PRODUCTION, so these cases use the two
 * targets a send can have rather than a hand-picked pair — the shape this repo already records
 * against a test that handed a function an argument its callers cannot produce.
 */
describe("what counts as a repeat, and what the writer is asked", () => {
  const act = (status: QueryStatus, date: string): Activity => ({
    id: `a-${status}-${date}`, userId: "u", queryId: "q1", manuscriptId: "m1",
    activityType: ActivityType.MATERIALS_SENT, resultingStatus: status,
    date, description: "", details: "",
  } as Activity);

  it("a second send of the SAME type to the same query is a repeat", () => {
    const log = [act(QueryStatus.FULL_SENT, "2026-09-01T00:00:00.000Z")];
    expect(priorSameTypeSend(log, "q1", QueryStatus.FULL_SENT, false)).toBe("2026-09-01T00:00:00.000Z");
  });

  it("a send of a DIFFERENT type is not — a partial then a full is the journey working", () => {
    const log = [act(QueryStatus.PARTIAL_SENT, "2026-09-01T00:00:00.000Z")];
    expect(priorSameTypeSend(log, "q1", QueryStatus.FULL_SENT, false)).toBeNull();
  });

  it("another query's send is not, however alike it looks", () => {
    const log = [{ ...act(QueryStatus.FULL_SENT, "2026-09-01T00:00:00.000Z"), queryId: "q2" }];
    expect(priorSameTypeSend(log, "q1", QueryStatus.FULL_SENT, false)).toBeNull();
  });

  /* ⚠️ A RESUBMISSION IS NEVER GUARDED, and it is the one exemption: sending again is the whole
     point of an R&R, so asking would be the app arguing with a writer doing the right thing. */
  it("a resubmission is exempt", () => {
    const log = [act(QueryStatus.FULL_SENT, "2026-09-01T00:00:00.000Z")];
    expect(priorSameTypeSend(log, "q1", QueryStatus.FULL_SENT, true)).toBeNull();
  });

  it("the question names the materials, the agent and the day it went", () => {
    const msg = duplicateSendPrompt(QueryStatus.FULL_SENT, "Tobias Hark", "2026-09-21T00:00:00.000Z");
    expect(msg).toContain("full");
    expect(msg).toContain("Tobias Hark");
    /* the app's own short date, so the writer can recognise the send they are being asked about */
    expect(msg).toMatch(/21 Sept?/);
  });
});
