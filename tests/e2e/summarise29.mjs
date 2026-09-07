#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Turn a Playwright line-reporter log into a per-suite red/green table.
 *
 * ⚠️ IT COUNTS WHAT RAN, NOT WHAT PASSED. A suite that produced no `[n/N]` line at all did not run
 * — which is a different fact from failing, and the one the To-do audit found twenty-six of. Both
 * are printed; neither is inferred from the other.
 *
 *   node tests/e2e/summarise29.mjs /tmp/all29.log
 */
import { readFileSync } from "node:fs";

const log = readFileSync(process.argv[2] ?? "/tmp/all29.log", "utf8");
const lines = log.split("\n");

/** every suite the runner announced, in order */
const ran = new Map();
for (const l of lines) {
  const m = l.match(/^\[\d+\/\d+\] \[measure\] › tests\/e2e\/([A-Za-z0-9]+)\.measure\.ts/);
  if (m) ran.set(m[1], { failed: false, why: "" });
}
/** every suite the runner reported as failed, with the first line of its reason */
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^\s+\d+\) \[measure\] › tests\/e2e\/([A-Za-z0-9]+)\.measure\.ts/);
  if (!m) continue;
  const entry = ran.get(m[1]) ?? { failed: false, why: "" };
  entry.failed = true;
  for (let j = i + 1; j < Math.min(i + 8, lines.length); j++) {
    const e = lines[j].trim();
    if (e.startsWith("Error:")) { entry.why = e.slice(0, 120); break; }
  }
  ran.set(m[1], entry);
}

const rows = [...ran.entries()].sort(([a], [b]) => a.localeCompare(b));
const red = rows.filter(([, v]) => v.failed);
console.log(`| suite | result | first failure |`);
console.log(`|---|---|---|`);
for (const [name, v] of rows) {
  console.log(`| \`${name}\` | ${v.failed ? "**RED**" : "green"} | ${v.why || ""} |`);
}
console.log(`\n${rows.length - red.length} green · ${red.length} red · ${rows.length} suites ran`);
