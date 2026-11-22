/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Crash reporting v1, Phase 3 — the privacy policy names Sentry, and the CSP lets exactly its EU
 * ingest host through. If either goes, the app reports to a service the policy does not disclose,
 * or the browser blocks the report.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PRIVACY_LAST_UPDATED } from "../lib/companyInfo";

const root = join(__dirname, "..", "..");

describe("Sentry is disclosed and allowed", () => {
  it("the privacy policy names Sentry, what it receives and what it never does", () => {
    const copy = readFileSync(join(__dirname, "legalCopy.ts"), "utf8").replace(/"\s*\+\s*"/g, "");
    expect(copy).toContain("We use Sentry (Functional Software, Inc.) to tell us when something in QueryHawk breaks.");
    expect(copy).toContain("stores them in the EU. It never receives what you've written, your email address or your IP address.");
    expect(PRIVACY_LAST_UPDATED).toBe("8 November 2026");
  });

  it("connect-src carries the one Sentry origin, and no wildcard", () => {
    const csp = readFileSync(join(root, "scripts", "csp.mjs"), "utf8");
    expect(csp).toContain('"https://o4512398078967808.ingest.de.sentry.io"');
    expect(csp).not.toMatch(/\*\.(ingest\.)?(de\.)?sentry\.io/);
    for (const f of ["firebase.dev.json", "firebase.json"]) {
      const cfg = readFileSync(join(root, f), "utf8");
      expect(cfg, f).toMatch(/connect-src [^;"]*https:\/\/o4512398078967808\.ingest\.de\.sentry\.io/);
    }
  });
});
