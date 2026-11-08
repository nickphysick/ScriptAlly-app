/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The CI dependency audit gate (scripts/audit-gate.mjs) and its allowlist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { blockingAdvisories, decide } from "../../scripts/audit-gate.mjs";
import { AUDIT_ALLOWLIST } from "../../scripts/audit-allowlist.mjs";

const adv = (severity: string, id: string, name: string) => ({ severity, name, title: id, url: `https://github.com/advisories/${id}` });
const report = {
  metadata: { vulnerabilities: { high: 2, critical: 1 } },
  vulnerabilities: {
    a: { via: [adv("high", "GHSA-aaaa", "a")] },
    b: { via: ["a"] },                                  // high only through a: no advisory of its own
    c: { via: [adv("critical", "GHSA-cccc", "c"), adv("moderate", "GHSA-mmmm", "c")] },
  },
};

describe("the audit gate", () => {
  it("collects each critical/high advisory once, and ignores moderate and chain-only entries", () => {
    expect(blockingAdvisories(report).map((a: { id: string }) => a.id).sort()).toEqual(["GHSA-aaaa", "GHSA-cccc"]);
  });

  it("fails on anything not allowlisted for that exact scope and package", () => {
    const list = [{ id: "GHSA-aaaa", scope: "root", package: "a" }, { id: "GHSA-cccc", scope: "functions", package: "c" }];
    const r = decide("root", blockingAdvisories(report), list);
    expect(r.accepted.map((a: { id: string }) => a.id)).toEqual(["GHSA-aaaa"]);
    expect(r.failing.map((a: { id: string }) => a.id)).toEqual(["GHSA-cccc"]);
  });

  it("names an allowlist entry that no longer matches anything", () => {
    const r = decide("root", [], [{ id: "GHSA-gone", scope: "root", package: "x" }]);
    expect(r.stale.map((e: { id: string }) => e.id)).toEqual(["GHSA-gone"]);
  });

  it("refuses a report that is not an npm audit report, rather than passing it", () => {
    expect(() => blockingAdvisories(null)).toThrow();
    expect(() => blockingAdvisories({})).toThrow();
  });

  it("every allowlist entry is specific, reasoned and dated", () => {
    expect(AUDIT_ALLOWLIST.length).toBeGreaterThan(0);
    for (const e of AUDIT_ALLOWLIST) {
      expect(e.id).toMatch(/^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/);
      expect(["root", "functions"]).toContain(e.scope);
      expect(e.package.length).toBeGreaterThan(0);
      expect(e.reason.length).toBeGreaterThan(20);
      expect(e.added).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("CI runs the gate, and nothing lets the audit step pass regardless", () => {
    const ci = readFileSync(resolve(__dirname, "../../.github/workflows/ci.yml"), "utf8");
    expect(ci).toContain("node scripts/audit-gate.mjs");
    expect(ci).not.toMatch(/npm audit[^\n]*\|\|\s*true/);
  });
});
