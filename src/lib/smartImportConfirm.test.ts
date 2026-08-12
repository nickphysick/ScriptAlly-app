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
import { confirmFileLead, overviewLead } from "./smartImportConfirm";

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
    const branchB = src("../components/onboarding/BranchB.tsx");
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

describe("the overview lead names only categories that have a count", () => {
  it("says everything read cleanly when all three are zero", () => {
    expect(overviewLead({ agentsFix: 0, agentsSharpen: 0, queriesSharpen: 0 }))
      .toBe("It all read cleanly — your history's ready to come straight in.");
  });

  /**
   * ⚠️ THE CASE THE OLD COPY GOT WRONG: no agent problems at all, three query flags. The single
   * hardcoded sentence still announced that agents needed a fix, directly above an Agents column
   * showing zero of both non-ready tiers.
   */
  it("does not mention agents when no agent has anything outstanding", () => {
    const lead = overviewLead({ agentsFix: 0, agentsSharpen: 0, queriesSharpen: 3 });
    expect(lead).not.toMatch(/agent/i);
    expect(lead).toContain("3 queries");
  });

  it("does not mention queries when no query has anything outstanding", () => {
    const lead = overviewLead({ agentsFix: 0, agentsSharpen: 2, queriesSharpen: 0 });
    expect(lead).not.toMatch(/quer/i);
    expect(lead).toContain("2 agents");
  });

  it("names every category that does have a count", () => {
    const lead = overviewLead({ agentsFix: 1, agentsSharpen: 2, queriesSharpen: 3 });
    expect(lead).toContain("one agent needs a decision");
    expect(lead).toContain("2 agents have details to sharpen");
    expect(lead).toContain("3 queries have details to sharpen");
  });

  it("agrees singular with plural", () => {
    const one = overviewLead({ agentsFix: 0, agentsSharpen: 0, queriesSharpen: 1 });
    expect(one).toContain("one query has a detail to sharpen");
    expect(one).not.toContain("queries");
  });

  /** The app reports, never appraises — no adverb telling the writer whether this is good or bad. */
  it("states the position without judging it", () => {
    for (const counts of [
      { agentsFix: 1, agentsSharpen: 0, queriesSharpen: 0 },
      { agentsFix: 0, agentsSharpen: 9, queriesSharpen: 40 },
      { agentsFix: 0, agentsSharpen: 0, queriesSharpen: 0 },
    ]) {
      expect(overviewLead(counts)).not.toMatch(/\b(only|just|already|still|good|bad|slow|poor|great|unfortunately)\b/i);
    }
  });
});
