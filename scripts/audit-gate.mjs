/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE CI DEPENDENCY AUDIT GATE (dependency audit fix v1, 8 Nov 2026).
 *
 * Runs `npm audit --json` in the root and in functions/ and FAILS on any critical or high
 * advisory not named in scripts/audit-allowlist.mjs. It replaced `npm audit --audit-level=high
 * || true`, which could not fail.
 *
 * It decides per ADVISORY (its GHSA id and its own severity), not per package: a package npm marks
 * "high" only because something it depends on is high carries no advisory of its own, and the
 * advisory is what an allowlist entry has to name.
 *
 * ⚠️ AN AUDIT THAT DID NOT ANSWER IS A FAILURE, NEVER A PASS. A registry outage gives no JSON;
 * reading that as "no advisories" would be the `|| true` again by another route.
 *
 * Usage: node scripts/audit-gate.mjs            (both installs)
 *        node scripts/audit-gate.mjs root       (one)
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { AUDIT_ALLOWLIST } from "./audit-allowlist.mjs";

const BLOCKING = new Set(["critical", "high"]);

/** Every critical/high advisory in one `npm audit --json` report, once each. */
export function blockingAdvisories(report) {
  if (!report || typeof report !== "object" || !report.vulnerabilities) throw new Error("not an npm audit report");
  const found = new Map();
  for (const [pkg, v] of Object.entries(report.vulnerabilities)) {
    for (const via of v.via ?? []) {
      if (typeof via !== "object" || !BLOCKING.has(via.severity)) continue;
      const id = String(via.url ?? "").split("/").pop() || `source-${via.source}`;
      if (!found.has(id)) found.set(id, { id, severity: via.severity, package: via.name ?? pkg, title: via.title ?? "" });
    }
  }
  return [...found.values()];
}

/** Split one install's advisories into the accepted and the failing. */
export function decide(scope, advisories, allowlist) {
  const accepted = [], failing = [];
  for (const a of advisories) {
    const ok = allowlist.some((e) => e.id === a.id && e.scope === scope && e.package === a.package);
    (ok ? accepted : failing).push(a);
  }
  const stale = allowlist.filter((e) => e.scope === scope && !advisories.some((a) => a.id === e.id && a.package === e.package));
  return { accepted, failing, stale };
}

function audit(dir) {
  let out;
  try {
    out = execFileSync("npm", ["audit", "--json"], { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    // npm audit exits non-zero whenever it finds anything; the JSON is still on stdout.
    out = e.stdout;
  }
  try {
    return JSON.parse(out);
  } catch {
    throw new Error(`npm audit in ${dir} gave no readable report — treated as a failure`);
  }
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const scopes = { root, functions: resolve(root, "functions") };
  const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(scopes);
  let failed = false;
  for (const scope of wanted) {
    if (!scopes[scope]) throw new Error(`unknown scope ${scope}`);
    const report = audit(scopes[scope]);
    const { accepted, failing, stale } = decide(scope, blockingAdvisories(report), AUDIT_ALLOWLIST);
    console.log(`\n${scope}: ${JSON.stringify(report.metadata?.vulnerabilities ?? {})}`);
    for (const a of accepted) console.log(`  accepted  ${a.severity} ${a.id} ${a.package} — ${a.title}`);
    for (const a of failing) console.log(`  FAILING   ${a.severity} ${a.id} ${a.package} — ${a.title}`);
    for (const e of stale) console.log(`  stale allowlist entry (matches nothing now): ${e.id} ${e.package}`);
    if (failing.length) failed = true;
  }
  if (failed) {
    console.error("\nDependency audit gate: critical/high advisories not in scripts/audit-allowlist.mjs.");
    process.exit(1);
  }
  console.log("\nDependency audit gate: no unaccepted critical/high advisories.");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
