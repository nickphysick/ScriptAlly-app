/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the two Smart Import sentences that used to state things the counts did not support.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { confirmFileLead } from "./smartImportConfirm";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p: string) => readFileSync(resolve(here, p), "utf8");

describe("the confirm step names the file it is about to spend an import on", () => {
  it("emphasises the picked filename", () => {
    const lead = confirmFileLead("my-queries.xlsx");
    expect(lead.name).toBe("my-queries.xlsx");
    expect(lead.before + lead.name + lead.after).toContain("We'll read my-queries.xlsx");
  });

  it("falls back to an unnamed sentence only when there is genuinely no name", () => {
    for (const empty of [null, undefined, "", "   "]) {
      const lead = confirmFileLead(empty);
      expect(lead.name).toBeNull();
      expect(lead.before).toContain("your file");
    }
  });

  /**
   * ⚠️ THE REGRESSION THIS EXISTS FOR IS A WIRING BUG, NOT A COPY BUG. The sentence was always
   * correct; `fileName` was set inside `runMapping`, which the confirm screen's own primary button
   * calls, so the name arrived one screen late and the fallback rendered every time. A pure test of
   * the sentence cannot see that, so this asserts the wiring at source.
   *
   * The anchor is checked before it is used — a `pickFile` that had been renamed would otherwise
   * slice to nothing and let every assertion below pass against an empty string.
   */
  it("records the filename in pickFile, before the confirm screen mounts", () => {
    const branchB = src("../components/import/ImportFlow.tsx"); // where the handlers live since part 3
    const anchor = "const pickFile = (file: File) => {";
    expect(branchB).toContain(anchor);

    const fromPick = branchB.slice(branchB.indexOf(anchor));
    const pickBody = fromPick.slice(0, fromPick.indexOf("\n  };"));
    expect(pickBody).toContain("setFileName(file.name)");

    const runAnchor = "const runMapping = async (file: File) => {";
    expect(branchB).toContain(runAnchor);
    const fromRun = branchB.slice(branchB.indexOf(runAnchor));
    const runBody = fromRun.slice(0, fromRun.indexOf("\n  };"));
    expect(runBody).not.toContain("setFileName(");
  });
});

/* The summary's paragraph moved to lib/reviewGate (`summaryLead`) in onboarding v9, where nothing
   flagged is optional: its clauses are "need a decision" and "need an answer". Its locks are in
   reviewGate.test.ts; `overviewLead` is deleted with its last caller. */
