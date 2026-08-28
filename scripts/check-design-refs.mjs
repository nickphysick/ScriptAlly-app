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
 *   node scripts/check-design-refs.mjs --update   re-record the watchlist, naming what changed
 *   node scripts/check-design-refs.mjs --update <path>   …and enrol that ref as well
 *
 * ⚠️ `--update` IS THE DELIBERATE ACT AND IS NEVER RUN BY A BUILD. Wiring it into one would make the
 * manifest agree with whatever is on disk at all times, which is the same as having no check.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
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

/**
 * ⚠️ THE MANIFEST IS A CURATED WATCHLIST OVER AN ARCHIVE — 4 guarded of 361 on disk. So `--update`
 * does NOT sweep the directory: enrolling 357 historical refs would make every build fragile and
 * the word "active" meaningless. Enrolment is an explicit act, which is what was missing.
 *
 * ⚠️ THE FAULT THIS FIXES IS THE SUCCESS LINE, NOT A MISSING SCAN. `--update` used to re-hash the
 * listed refs and print "✓ recorded 3" whether or not it had done anything you wanted. A ref was
 * committed, `--update` was run, the line was believed, and the file was never guarded. "Recorded
 * 3" was TRUE and answered a question nobody asked — the same shape as an assertion satisfied by
 * the wrong branch, or a slice bounded on the wrong anchor: a green result about the wrong subject.
 *
 * USAGE
 *   --update                 re-record the watchlist, naming what actually changed
 *   --update <path…>         enrol those refs as well, naming each
 */
const relOf = (arg) => (arg.startsWith("design-refs/") ? arg : `design-refs/${arg}`);

if (update) {
  const listed = new Set(entries.map(([rel]) => rel));
  const asked = process.argv.slice(2).filter((a) => a !== "--update").map(relOf);

  for (const rel of asked) {
    if (!existsSync(join(ROOT, rel))) {
      console.error(`✗ cannot enrol a ref that is not there: ${rel}`);
      process.exit(1);
    }
  }

  const next = {};
  for (const [rel] of entries) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) {
      console.error(`✗ cannot record a ref that is not there: ${rel}`);
      console.error("  It is on the watchlist and gone from disk — retire it deliberately, or restore it.");
      process.exit(1);
    }
    next[rel] = sha(abs);
  }
  const enrolled = asked.filter((rel) => !listed.has(rel));
  for (const rel of asked) next[rel] = sha(join(ROOT, rel));

  const rerecorded = entries.filter(([rel, was]) => next[rel] !== was).map(([rel]) => rel);

  writeFileSync(MANIFEST, `${JSON.stringify({ ...manifest, refs: next }, null, 2)}\n`);

  /**
   * ⚠️ IT NAMES WHAT IT DID, AND SAYS SO WHEN IT DID NOTHING. A count is precisely what let the
   * silent non-enrolment through: the number that moves when everything happened is the same number
   * that moves when nothing did.
   */
  for (const rel of enrolled) console.log(`✓ enrolled  + ${rel}`);
  for (const rel of rerecorded) console.log(`✓ re-recorded ~ ${rel}`);
  if (!enrolled.length && !rerecorded.length) {
    console.log(`· nothing to record — the ${entries.length} ref(s) on the watchlist are unchanged.`);
    console.log("  To guard a NEW ref, name it:  node scripts/check-design-refs.mjs --update <path>");
  } else {
    console.log(`  ${Object.keys(next).length} ref(s) now guarded.`);
  }
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
  /**
   * ⚠️ VERIFY SAYS NOTHING ABOUT UNLISTED FILES, DELIBERATELY. `design-refs/` holds 361 `.html`
   * files and the manifest guards 4: it is an ARCHIVE with a curated watchlist over it, so naming
   * the other 357 on every build is noise that trains the reader to skip the output — which is the
   * fault this script exists to fix, arriving by volume instead of by silence.
   */
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
