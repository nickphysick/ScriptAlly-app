/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WORKTREE / BUNDLE ASSERTION — run before any measurement.
 *
 * ⚠️ IT ASKS THE SERVER, NOT THE DISK, AND THAT IS THE WHOLE DIFFERENCE FROM `bundleGuard`.
 * `bundleGuard` reads `dist/assets` off the filesystem and compares mtimes; both are true
 * statements about a directory, and neither is a statement about the page Chromium is handed.
 * A preview server started before a rebuild, a second checkout serving its own `dist/`, a stale
 * proxy — every one of them leaves the disk check green and the measurement wrong. This fetches
 * the document, reads the bundle URL out of it, fetches THAT, and looks inside what came back.
 *
 * Three claims, each printed whether it passes or fails:
 *   1. HEAD of this checkout, against the commit the run intends to measure.
 *   2. The served document links a built bundle, and that bundle is reachable.
 *   3. Every needle in SA_BUNDLE_NEEDLES is present in the SERVED bundle text.
 *
 * ⚠️ THE NEEDLES ARE THE ONLY CLAIM THAT SURVIVES A COINCIDENCE. HEAD matching proves what is
 * checked out; it proves nothing about what was built. A needle is a string that exists only in
 * the source under test, so finding it in the bytes the server returned is the one proof that the
 * page about to be measured contains the change.
 *
 * Usage:
 *   SA_E2E_BASE_URL=http://localhost:4321 \
 *   SA_INTENDED_COMMIT=$(git rev-parse HEAD) \
 *   SA_BUNDLE_NEEDLES='tl-fill,RIGHT NOW' \
 *   node tests/e2e/worktreeAssert.mjs
 *
 * Exit 0 = every claim held. Exit 1 = one did not, and the line above says which.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const PROD_PROJECT_ID = "gen-lang-client-0801391782";
const base = (process.env.SA_E2E_BASE_URL ?? "").replace(/\/$/, "");
const fail = [];
const say = (ok, line) => { console.log(`${ok ? "  ok " : "FAIL "} ${line}`); if (!ok) fail.push(line); };

/* ── 1 · which tree, which commit ─────────────────────────────────────────────────────────── */
const head = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const intended = (process.env.SA_INTENDED_COMMIT ?? "").trim();
console.log(`\n── worktree/bundle assertion ──`);
console.log(`  cwd      ${process.cwd()}`);
console.log(`  HEAD     ${head}`);
console.log(`  intended ${intended || "(SA_INTENDED_COMMIT unset)"}`);
if (intended) say(head === intended, `HEAD is the intended commit`);
else say(false, `SA_INTENDED_COMMIT is unset — the run cannot say what it meant to measure`);

/* what is uncommitted here, stated rather than judged: a measurement worktree legitimately
   carries the working copy of the change under test, and pretending otherwise would make this
   assertion unusable for the only job it has. */
const dirty = execSync("git status --porcelain -- src/", { encoding: "utf8" }).trim();
console.log(`  uncommitted under src/: ${dirty ? dirty.split("\n").length + " file(s)" : "none"}`);
if (dirty) for (const l of dirty.split("\n")) console.log(`      ${l}`);

/* ── 2 · the server hands back a built bundle ─────────────────────────────────────────────── */
if (!base) { say(false, "SA_E2E_BASE_URL is unset"); report(); }
if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base)) {
  console.log(`  base     ${base} (remote — bundle contents cannot be tied to this checkout)`);
  say(false, "a remote base cannot be proven built from this HEAD; measure a local preview");
  report();
}
console.log(`  base     ${base}`);

/* ⚠️ Node resolves `localhost` to ::1 first and `vite preview` binds IPv4 only, so the literal
   host can throw against a server curl and Chromium both talk to. Try both, and say which won. */
const get = async (path) => {
  let last;
  for (const host of [base, base.replace("//localhost", "//127.0.0.1")]) {
    try { const r = await fetch(host + path, { redirect: "follow" }); return { text: await r.text(), host }; }
    catch (e) { last = e; }
  }
  throw last;
};

let doc, bundleUrl, bundleText;
try { doc = await get("/"); } catch (e) { say(false, `the server did not answer: ${e.message}`); report(); }
const m = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/.exec(doc.text);
say(!!m, m ? `document links a built bundle: ${m[1]}` : "document links no built bundle (a Vite dev server serves source)");
if (!m) report();
bundleUrl = `/assets/${m[1]}`;

/* the file the server names must be the file this checkout built */
const distDir = resolve(process.cwd(), "dist/assets");
const onDisk = existsSync(distDir) && readdirSync(distDir).includes(m[1]);
say(onDisk, `${m[1]} is in this checkout's dist/assets`);

try { bundleText = (await get(bundleUrl)).text; }
catch (e) { say(false, `the bundle did not fetch: ${e.message}`); report(); }
say(bundleText.length > 10000, `bundle fetched (${Math.round(bundleText.length / 1024)} KB)`);
say(!bundleText.includes(PROD_PROJECT_ID), `served bundle is NOT a production build`);

/* ── 3 · the served bytes contain the change under test ───────────────────────────────────── */
const needles = (process.env.SA_BUNDLE_NEEDLES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
if (!needles.length) say(false, "SA_BUNDLE_NEEDLES is empty — nothing proves the bundle contains the change");
for (const n of needles) say(bundleText.includes(n), `served bundle contains ${JSON.stringify(n)}`);

report();

function report() {
  if (fail.length) {
    console.log(`\n✗ ${fail.length} claim(s) failed — do not believe any measurement taken now.\n`);
    process.exit(1);
  }
  console.log(`\n✓ every claim held — the page about to be measured is this checkout's build.\n`);
  process.exit(0);
}
