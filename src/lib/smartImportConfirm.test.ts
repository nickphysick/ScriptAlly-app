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
      .toBe("It all read cleanly. Your history's ready to come straight in.");
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
    /* Lower-cased: the list opens a sentence now, so its first letter is a capital. */
    const lead = overviewLead({ agentsFix: 1, agentsSharpen: 2, queriesSharpen: 3 }).toLowerCase();
    expect(lead).toContain("one agent needs a decision");
    expect(lead).toContain("2 agents have details to sharpen");
    expect(lead).toContain("3 queries have details to sharpen");
  });

  it("agrees singular with plural", () => {
    const one = overviewLead({ agentsFix: 0, agentsSharpen: 0, queriesSharpen: 1 }).toLowerCase();
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

/**
 * Lock S3 (onboarding v5 part 2) — the lead is two sentences with no dash, and its clauses and their
 * joins are the baseline's. `baselineLead` is the function as it stood on 5f5c503d, kept here so
 * the comparison is against what was, not against a second copy of what is.
 */
const baselineLead = ({ agentsFix, agentsSharpen, queriesSharpen }: { agentsFix: number; agentsSharpen: number; queriesSharpen: number }): string => {
  if (agentsFix === 0 && agentsSharpen === 0 && queriesSharpen === 0) return "It all read cleanly — your history's ready to come straight in.";
  const clauses: string[] = [];
  if (agentsFix > 0) clauses.push(agentsFix === 1 ? "one agent needs a decision" : `${agentsFix} agents need a decision`);
  if (agentsSharpen > 0) clauses.push(agentsSharpen === 1 ? "one agent has a detail to sharpen" : `${agentsSharpen} agents have details to sharpen`);
  if (queriesSharpen > 0) clauses.push(queriesSharpen === 1 ? "one query has a detail to sharpen" : `${queriesSharpen} queries have details to sharpen`);
  const list = clauses.length === 1 ? clauses[0] : `${clauses.slice(0, -1).join(", ")} and ${clauses[clauses.length - 1]}`;
  return `Most of it's ready to go — ${list}.`;
};

describe("S3 — the lead: no dash, the baseline's clauses and joins", () => {
  const cases = [
    { agentsFix: 0, agentsSharpen: 0, queriesSharpen: 0 },
    { agentsFix: 1, agentsSharpen: 0, queriesSharpen: 0 },
    { agentsFix: 2, agentsSharpen: 1, queriesSharpen: 3 },
  ];
  for (const c of cases) {
    const now = overviewLead(c);
    const was = baselineLead(c);
    it(`(${c.agentsFix},${c.agentsSharpen},${c.queriesSharpen}) has no dash`, () => {
      expect(now).not.toMatch(/[—–]/);
      expect(now).not.toContain(" - ");
    });
    it(`(${c.agentsFix},${c.agentsSharpen},${c.queriesSharpen}) keeps the baseline's clauses and joins`, () => {
      /* Everything after the opening sentence, lower-cased on both sides: only the dash became a
         full stop and the list's first letter a capital. */
      const tail = (s: string, sep: string) => s.slice(s.indexOf(sep) + sep.length).toLowerCase();
      expect(tail(now, ". ")).toBe(tail(was, " — "));
      expect(now.split(". ")[0]).toBe(was.split(" — ")[0]);
    });
  }
  it("the list opens with a capital", () => {
    expect(overviewLead({ agentsFix: 1, agentsSharpen: 0, queriesSharpen: 0 })).toBe("Most of it's ready to go. One agent needs a decision.");
    expect(overviewLead({ agentsFix: 2, agentsSharpen: 1, queriesSharpen: 3 }))
      .toBe("Most of it's ready to go. 2 agents need a decision, one agent has a detail to sharpen and 3 queries have details to sharpen.");
  });
});
