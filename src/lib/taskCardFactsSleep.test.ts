/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE EQUALITY PACK A2 OWES (tasks-workflow, Pack A2) ══════════════════════════════════════
 *
 * `figureFor` used to be handed a `snoozedKeys` set the page built from `boardCols.snoozed`. That
 * tied it to a board derived with `pendingSaveId` — page state — which is what stopped
 * `useTaskPaneSession` building its journey from `(card, data)` alone. It now answers "is this card
 * asleep?" itself, by calling the SAME `snoozedCards` that `boardColumns` calls.
 *
 * ⚠️ THE OBLIGATION IS THE MID-SAVE CASE, AND IT IS PROVED HERE RATHER THAN RACED IN A BROWSER.
 * The worry the pack names is real: `pendingSaveId` is set only while an optimistic create is in
 * flight, so an equality asserted at rest would not discharge it. A UI race would be the weaker
 * answer anyway — it observes ONE save and cannot say the next is safe. Calling the derivation
 * twice, with and without `hiddenUserTaskId`, decides it for EVERY save, deterministically.
 *
 * ⚠️ AND THE REASON IT HOLDS IS STRUCTURAL, WHICH THE FIXTURE ALSO PINS. `assembleBoardColumns`
 * filters `userTasks` by `hiddenUserTaskId` only for `assembleBoard` — the LANES — and hands
 * `boardColumns` the UNFILTERED `input.userTasks`. So the flag never reaches the snoozed column at
 * all; the parameter carried a dependency the value never had.
 */
import { describe, it, expect } from "vitest";
import { Query, Agent, UserTask, TaskFlag, QueryStatus } from "../types";
import { assembleBoardColumns, snoozedCards, boardEligible } from "./todoColumns";

const TODAY = "2026-08-19";
const NOW = Date.parse("2026-08-19T12:00:00Z");
const EMPTY = {
  tasks: [], userTasks: [], queries: [], agents: [], manuscripts: [],
  taskFlags: [], activities: [], today: TODAY, now: NOW,
};
const q = (over: Partial<Query>): Query =>
  ({ id: "q1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED,
     dateSent: "2026-06-01T09:00:00Z", ...over } as Query);
const ag = (over: Partial<Agent>): Agent =>
  ({ id: "a1", name: "Dara Okafor", agency: "Okafor Reps", ...over } as Agent);
/* ⚠️ A `dueDate` IS WHAT MAKES A USER CARD A TASK. The two-natures law: a dateless user card is a
   NOTE, and `boardEligible` filters notes out of every column — so a fixture of dateless tasks is
   inert in the lanes and the non-vacuity check below correctly refused it. Dated, they are cards. */
const ut = (over: Partial<UserTask>): UserTask =>
  ({ id: "ut1", userId: "u", text: "Chase the reference", createdAt: "2026-08-01T09:00:00Z",
     dueDate: TODAY, ...over } as UserTask);

/* a flag that is genuinely ASLEEP on the fixture's clock — back in September */
const sleeping: TaskFlag[] = [{
  id: "f1", userId: "u", taskType: "no_response_close", queryId: "q1",
  snoozeCount: 1, snoozedUntil: "2026-09-08T00:00:00Z",
} as TaskFlag];

describe("⚠️ the snoozed column is invariant to pendingSaveId — the mid-save equality", () => {
  const input = { ...EMPTY, queries: [q({})], agents: [ag({})], userTasks: [ut({})], taskFlags: sleeping };

  it("the fixture is not vacuous — something IS asleep", () => {
    const { cols } = assembleBoardColumns(input);
    expect(cols.snoozed.length, "no snoozed card — every equality below would be trivial")
      .toBeGreaterThan(0);
  });

  /* ⚠️ THIS IS THE PACK'S OBLIGATION, DISCHARGED. `hiddenUserTaskId` is what `pendingSaveId`
     becomes; setting it is exactly the mid-flight state a browser race would be trying to catch. */
  it("with a save in flight, the column is IDENTICAL — key for key, in order", () => {
    const atRest = assembleBoardColumns(input).cols.snoozed;
    const midSave = assembleBoardColumns({ ...input, hiddenUserTaskId: "ut1" }).cols.snoozed;
    expect(midSave.map((c) => c.key)).toEqual(atRest.map((c) => c.key));
  });

  /* ⚠️ AND IT BITES THE LANES, so the fixture proves the flag is doing SOMETHING — an invariance
     test whose input has no effect anywhere proves only that the input was ignored everywhere. */
  it("the same flag DOES change the lanes — so the invariance above is about the column, not a no-op", () => {
    const atRest = assembleBoardColumns({ ...input, userTasks: [ut({}), ut({ id: "ut2", text: "Second" })] });
    const midSave = assembleBoardColumns({
      ...input, userTasks: [ut({}), ut({ id: "ut2", text: "Second" })], hiddenUserTaskId: "ut2",
    });
    const lanes = (r: typeof atRest) => [...r.cols.todo, ...r.cols.today].map((c) => c.key);
    expect(lanes(midSave).length, "hiddenUserTaskId changed nothing at all — the fixture is inert")
      .toBeLessThan(lanes(atRest).length);
  });

  /* ⚠️ AND `figureFor`'s RE-DERIVATION IS THE COLUMN'S OWN CALL, not a re-expression of it — so
     equality is a property of construction rather than a claim needing its own proof. This asserts
     the two produce the same set on the same data. */
  it("figureFor's derivation equals boardColumns' column, on the same data", () => {
    const { cols } = assembleBoardColumns(input);
    const reDerived = boardEligible(snoozedCards({
      flags: input.taskFlags, queries: input.queries, agents: input.agents,
      manuscripts: input.manuscripts, userTasks: input.userTasks, nowMs: NOW,
    }));
    expect(reDerived.map((c) => c.key)).toEqual(cols.snoozed.map((c) => c.key));
  });
});
