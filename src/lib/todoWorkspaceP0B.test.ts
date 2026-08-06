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

describe("Phase 0B — the KIND pill never renders empty", () => {
  it("the source really is the To-do page (anchor)", () => {
    expect(SRC).toContain("tdb-ktag");
    expect(SRC.length).toBeGreaterThan(1000);
  });

  it("EVERY tdb-ktag carrying a card's kind is guarded on that kind", () => {
    // The three sites that render `c.kind` — the card band, the ledger row, the member row.
    // Each must be preceded by the `c.kind &&` guard on the same line.
    const kindLines = SRC.split("\n").filter((l) => l.includes("tdb-ktag") && l.includes("c.kind"));
    expect(kindLines.length).toBeGreaterThanOrEqual(3); // anchor: the sites exist
    for (const line of kindLines) {
      expect(line, `unguarded kind pill: ${line.trim()}`).toContain("c.kind &&");
    }
  });

  it("the offer star can no longer interpolate an absent kind", () => {
    // `★ ${c.kind}` is fine ONLY behind the guard; the guard is asserted above, so what this
    // pins is that no OTHER form of the interpolation crept back in unguarded.
    const starLines = SRC.split("\n").filter((l) => l.includes("★ ${c.kind}"));
    expect(starLines.length).toBeGreaterThanOrEqual(1); // anchor
    for (const line of starLines) {
      expect(line).toContain("c.kind &&");
    }
  });
});

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
