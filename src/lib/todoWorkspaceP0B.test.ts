/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The To-do workspace, Phase 0B — the render-side half of the data-bug fixes.
 *
 * Three of the four faults were derivations and are locked where they live (todoBoard.test.ts,
 * clearedToday.test.ts). This one is a TEMPLATE fault and has to be asserted against the source:
 * `.tdb-ktag` is a pill with a fill, a border and padding, so rendering it around nothing draws a
 * small blank badge that claims something and says nothing. Both ledger rows had always guarded
 * it; the card did not, which is why the fault showed in one view and not the other.
 *
 * There is no jsdom in this repo (vitest.config.ts is `environment: 'node'`), so this reads the
 * component as text. Per the repo's slice rule, every extraction asserts its anchor exists FIRST
 * — a missing anchor otherwise yields "" and makes every `.not.toContain` pass while testing
 * nothing.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const SRC = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "components", "todo", "ToDoPage.tsx"),
  "utf8"
);

/* ⚠️ "Phase 0B — the KIND pill never renders empty" IS DELETED, NOT ADJUSTED (15 Aug). Its three
   `tdb-ktag`/`c.kind` sites were the card band, the ledger row and the member row — every one of
   them inside the unreachable row/reel cluster that was removed with `runBatchRow` and
   `renderGroupCard`. A test that survives the removal of the thing it tested is a test asserting
   nothing; the guard it pinned has no render site left to guard. The empty-pill LAW itself is not
   lost — the live list is `TaskList.tsx`, and if a kind pill is ever drawn there it needs its own
   lock written against that file. */


describe("Phase 0B — the task engine names records through the display helper", () => {
  const DB = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "db.tsx"),
    "utf8"
  );

  it("the source really is the db provider (anchor)", () => {
    expect(DB).toContain("const calculatedTasks: Task[] = [];");
  });

  it("no derived task title interpolates a raw name column", () => {
    // Validity is "name OR agency", so `agent.name` can be empty and every title below drops it
    // straight into a sentence. agentPrimary is the one answer to "what do I call this record".
    expect(DB).toContain("import { agentPrimary }");
    expect(DB).toContain("const aName = agentPrimary(agent);");
    expect(DB).not.toContain("${a.name}");
    expect(DB).not.toContain("const aName = agent.name;");
  });
});
