/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 Phase 2 — the resolver reaches every surface that asks which version went with a query, and every log
 * path records one (D3a), except imports (D7).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Query, SubmissionPackage } from "../types";
import { queryVersionId } from "./manuscriptSummary";
import { packagesHolding } from "./versionsV2";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("D3a — every log path goes through addQuery, which records the version", () => {
  it("the drawer's log journey and the Query Centre's create mode call addQuery without the import flag", () => {
    const log = strip(read("components/queryActions/journeys/LogJourney.tsx"));
    expect(log).toMatch(/db\.addQuery\(payload as never, false, \{ eventKey:/);
    expect(log).not.toMatch(/db\.addQuery\([^)]*imported: true/);
    const qc = strip(read("components/Queries.tsx"));
    expect(qc).toContain("await addQuery(draftToPayload(createDraft, agent) as any)");
  });
  it("D7 — every import passes { imported: true }, so addQuery records nothing for it", () => {
    for (const f of ["components/ImportCsv.tsx", "lib/smartImportCommit.ts", "lib/emailImportCommit.ts"]) {
      expect(strip(read(f)), f).toMatch(/\{ imported: true \}/);
    }
  });
  it("a correction of what was sent re-records the version from the corrected package", () => {
    const ed = strip(read("components/queryActions/journeys/EditJourney.tsx"));
    expect(ed).toContain("const pv = packageVersion(");
    expect(ed).toContain("extra.bookVersionId = pv;");
  });
});

describe("D4 — the readers", () => {
  it("the Query Centre's chip, filter and Opening read go through the resolver", () => {
    const qv = strip(read("lib/queryVersions.ts"));
    expect(qv).toMatch(/export const listVersion = [\s\S]*?=> openingRead\(query, packages, materials, versions\);/);
    expect(qv).toContain("resolveQueryVersion(query as Query");
  });
  it("the Manuscripts summary reads the query's own recorded version first", () => {
    const pkgs = [{ id: "p", bookVersionId: "bv-pkg" }] as SubmissionPackage[];
    expect(queryVersionId({ packageId: "p", bookVersionId: "bv-q" } as Query, pkgs)).toBe("bv-q");
    expect(queryVersionId({ packageId: "p" } as Query, pkgs)).toBe("bv-pkg");
  });
});

describe("deleting a version clears it from the packages that hold it, and only those that can change", () => {
  it("lists the unsent packages stating the version; a sent package's version is frozen by the rules", () => {
    const pkgs = [
      { id: "a", manuscriptId: "ms", bookVersionId: "v9" },
      { id: "b", manuscriptId: "ms", bookVersionId: "v9", firstSentAt: "2026-01-01T00:00:00Z" },
      { id: "c", manuscriptId: "ms", bookVersionId: "v1" },
      { id: "d", manuscriptId: "other", bookVersionId: "v9" },
    ] as SubmissionPackage[];
    expect(packagesHolding(pkgs, "ms", "v9").map((p) => p.id)).toEqual(["a"]);
  });
});
