/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PROVE THE REDS — run each mutation in the catalogue and record which assertions notice.
 *
 * ⚠️ A GREEN SUITE PROVES NOTHING UNTIL SOMEONE HAS WATCHED IT GO RED. These two were fully green
 * for five days over a pane that had been rebuilt twice underneath them. This walks
 * `tests/e2e/mutate.ts`, breaking one named thing at a time, and reports for every assertion
 * whether anything was ever able to make it fail.
 *
 * An assertion that no mutation could redden is NOT proved safe — it is either guarding something
 * this catalogue cannot reach (behaviour: ordering, focus, what a click does) or guarding nothing.
 * The report separates those two by naming which mutations were aimed at it.
 *
 *   SA_E2E_BASE_URL=http://localhost:4300 node tests/e2e/proveReds.mjs
 *   SA_E2E_BASE_URL=... node tests/e2e/proveReds.mjs square-gone hairline-last   # a subset
 */
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.SA_E2E_BASE_URL;
if (!BASE) throw new Error("SA_E2E_BASE_URL is required — point it at a local vite preview");

/* the catalogue is TypeScript; read it as text rather than importing a TS module from node */
const src = readFileSync("tests/e2e/mutate.ts", "utf8");
const names = [...src.matchAll(/^  "([a-z0-9-]+)": \{/gm)].map((m) => m[1]);
const targetsOf = (name) => {
  const i = src.indexOf(`  "${name}": {`);
  const seg = src.slice(i, i + 400);
  const t = seg.match(/targets: \[([^\]]*)\]/);
  return t ? [...t[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
};
const sourceOnly = (name) => {
  const i = src.indexOf(`  "${name}": {`);
  return /sourceOnly:/.test(src.slice(i, src.indexOf("},", i)));
};

const wanted = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const list = wanted.length ? wanted : names;
mkdirSync("run-artifacts/prove-reds", { recursive: true });

const SUITES = [
  { file: "tests/e2e/steerRound.measure.ts", out: "SA_SR_OUT", label: "steer" },
  { file: "tests/e2e/finishRound.measure.ts", out: "SA_FR_OUT", label: "finish" },
];

/** run one suite, return { id: ok } */
function runSuite(suite, mutation) {
  const out = `run-artifacts/prove-reds/${suite.label}-${mutation || "baseline"}.txt`;
  try {
    execFileSync("npx", ["playwright", "test", suite.file, "--reporter=line"], {
      env: { ...process.env, SA_E2E_BASE_URL: BASE, [suite.out]: out, ...(mutation ? { SA_MUTATE: mutation } : {}) },
      stdio: "pipe", timeout: 15 * 60 * 1000,
    });
  } catch { /* a red suite exits non-zero; the report on disk is the result */ }
  if (!existsSync(out)) return null;
  const txt = readFileSync(out, "utf8");
  const res = {};
  /* ⚠️ SUITE-QUALIFIED KEYS. Both suites number their cases from P1, so a bare "P2.1" is two
     different assertions — a report keyed on it would credit one suite's red to the other's case. */
  for (const m of txt.matchAll(/^  (green|RED  )  (P[0-9.]+)/gm)) res[suite.label + ":" + m[2]] = m[1] === "green";
  return res;
}

console.log("── baseline (no mutation)");
const base = {};
for (const s of SUITES) {
  const r = runSuite(s, "");
  if (!r) { console.log("   " + s.label + ": NO REPORT — the suite did not run"); continue; }
  Object.assign(base, r);
  const red = Object.entries(r).filter(([, ok]) => !ok).map(([k]) => k);
  console.log("   " + s.label + ": " + Object.keys(r).length + " assertions, "
    + (red.length ? red.length + " RED (" + red.join(",") + ")" : "all green"));
}

/** assertion id → the mutations that reddened it */
const reddenedBy = {};
for (const id of Object.keys(base)) reddenedBy[id] = [];
const aimedAt = {};
for (const id of Object.keys(base)) aimedAt[id] = [];

for (const name of list) {
  const targets = targetsOf(name);
  for (const t of targets) if (aimedAt[t]) aimedAt[t].push(name);
  /* ⚠️ RUN ONLY THE SUITE THE MUTATION AIMS AT. Running both doubles a forty-minute walk to buy
     nothing: a stylesheet aimed at the steer round's square cannot tell you anything new about the
     finishing round, and the baseline already covers both. */
  const owners = SUITES.filter((s) => targets.some((t) => t.startsWith(s.label + ":")));
  process.stdout.write("── " + name.padEnd(22) + " targets " + targets.join(",").padEnd(34));
  const got = {};
  for (const s of (owners.length ? owners : SUITES)) Object.assign(got, runSuite(s, name) ?? {});
  const flipped = Object.keys(got).filter((id) => base[id] === true && got[id] === false);
  for (const id of flipped) reddenedBy[id].push(name);
  const hit = targets.filter((t) => flipped.includes(t));
  const miss = targets.filter((t) => !flipped.includes(t));
  console.log(" → reddened " + (flipped.length ? flipped.join(",") : "NOTHING")
    + (miss.length ? "   ⚠️ MISSED " + miss.join(",") : ""));
}

const lines = ["── prove-reds · " + Object.keys(base).length + " assertions · " + list.length + " mutations", ""];
const never = [];
for (const id of Object.keys(base).sort()) {
  const by = reddenedBy[id];
  if (by.length) lines.push("  PROVED RED   " + id.padEnd(8) + " by " + by.join(", "));
  else { never.push(id); lines.push("  not proved   " + id.padEnd(8)
    + (aimedAt[id].length ? " — aimed at by " + aimedAt[id].join(", ") + " and stayed green" : " — no mutation in the catalogue targets it")); }
}
lines.push("", "not proved red: " + (never.length ? never.join(", ") : "none"));
const report = lines.join("\n");
writeFileSync("run-artifacts/prove-reds.txt", report);
console.log("\n" + report + "\n");
