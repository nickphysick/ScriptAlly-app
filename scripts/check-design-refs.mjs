#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE DESIGN-REF STALENESS CHECK ═══════════════════════════════════════════════════════════
 *
 * ⚠️ A STALE REF IS SILENT ANCHOR REPLACEMENT WEARING A DIFFERENT HAT. The failure is not that a
 * mockup changed — it is that the FILE at a path changed while everything written against that path
 * went on citing it. A commit message saying "built to `manuscripts-scroll-page.html`" is true of
 * whatever that file contained at the time and says nothing about now, and nobody re-reads a ref
 * they have already read.
 *
 * ⚠️ AND IT HAS BEEN ASKED FOR THREE TIMES AND HAND-RUN THREE TIMES, which is three chances to have
 * skipped it. Hand-running a check is the same as not having one: it works exactly as long as the
 * person remembers, and the person is the thing being guarded. So it is wired into `build:dev` and
 * `build:prod`, beside `assert-build-target.mjs`, which is the precedent for a guard that runs on
 * every build rather than on request.
 *
 * ⚠️ IT RECORDS A HASH, NOT A DATE OR A SIZE. Two of the three hand-runs found a ref whose CONTENT
 * differed while its name did not; a timestamp would have said "modified" about a re-copy of the
 * same bytes, and a size can collide. `shasum -a 256` is what was run by hand and is what is
 * recorded here.
 *
 * USAGE
 *   node scripts/check-design-refs.mjs            verify — exits 1 on any mismatch
 *   node scripts/check-design-refs.mjs --update   re-record, AFTER deliberately taking a new ref
 *
 * ⚠️ `--update` IS THE DELIBERATE ACT AND IS NEVER RUN BY A BUILD. Wiring it into one would make the
 * manifest agree with whatever is on disk at all times, which is the same as having no check.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/* ⚠️ RESOLVED FROM THIS FILE, NOT FROM `process.cwd()`. A build invoked from another directory would
   otherwise look for the manifest wherever it happened to be standing. */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST = join(ROOT, "design-refs", ".refhashes.json");

const sha = (p) => createHash("sha256").update(readFileSync(p)).digest("hex");

if (!existsSync(MANIFEST)) {
  console.error(`✗ design-ref manifest missing: ${MANIFEST}`);
  console.error("  Create it with:  node scripts/check-design-refs.mjs --update");
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
const entries = Object.entries(manifest.refs ?? {});
const update = process.argv.includes("--update");

if (update) {
  const next = {};
  for (const [rel] of entries) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(`✗ cannot record a ref that is not there: ${rel}`);
      process.exit(1);
    }
    next[rel] = sha(abs);
  }
  writeFileSync(MANIFEST, `${JSON.stringify({ ...manifest, refs: next }, null, 2)}\n`);
  console.log(`✓ recorded ${entries.length} design ref hash(es)`);
  process.exit(0);
}

const bad = [];
for (const [rel, recorded] of entries) {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) { bad.push({ rel, recorded, actual: "(file missing)" }); continue; }
  const actual = sha(abs);
  if (actual !== recorded) bad.push({ rel, recorded, actual });
}

if (bad.length === 0) {
  console.log(`✓ design refs unchanged (${entries.length} checked)`);
  process.exit(0);
}

/* ⚠️ LOUD, AND IT NAMES BOTH HASHES. "Something changed" sends the reader to `git diff`; the two
   hashes and the path let them decide in one line whether this is the ref they meant to take. */
console.error("\n✗ DESIGN REF CHANGED SINCE THE LAST RECORDED BUILD\n");
for (const b of bad) {
  console.error(`  ${b.rel}`);
  console.error(`    recorded  ${b.recorded}`);
  console.error(`    on disk   ${b.actual}\n`);
}
console.error("  Anything written against this ref cites a file that has since moved.");
console.error("  Re-read it, then record the new state deliberately:");
console.error("    node scripts/check-design-refs.mjs --update\n");
process.exit(1);
