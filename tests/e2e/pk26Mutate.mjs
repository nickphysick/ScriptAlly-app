/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v26 — the SOURCE breaks behind PK26-R, PK26-E and PK26-X (the in-page ones are in
 * pk26.measure.ts). Run in the worktree you measure in, never the primary checkout:
 *
 *   node tests/e2e/pk26Mutate.mjs PK26-R      # break it (a backup of each file goes to $PK26_BAK, path-derived)
 *   npm run build:dev && PK26_MUTATE=PK26-R SA_E2E_BASE_URL=… npx playwright test tests/e2e/pk26.measure.ts -g "PK26-R "
 *   node tests/e2e/pk26Mutate.mjs --restore   # put every file back from its backup
 *
 * ⚠️ RESTORED FROM A PATH-DERIVED BACKUP, NEVER `git checkout` (CLAUDE.md: a git restore of a hand edit deletes work).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BAK = process.env.PK26_BAK ?? "/tmp/pk26-mut";
const keyOf = (p) => p.replace(/[\\/]/g, "-");
const BREAKS = {
  "PK26-R": [["src/lib/packagesRoute.ts", "return p === OLD_PACKAGES_PATH ? `${PACKAGES_PATH}${search}${hash}` : null;", "return p === OLD_PACKAGES_PATH ? PACKAGES_PATH : null;"]],
  "PK26-E": [["src/lib/packageEditions.ts", "return { edition: n, editions: [...list, editionRecord(n, nowIso, { ...p, ...next }, summaryFor({ ...p, ...next }))] };",
    "return { edition: n, editions: [...list.map((e) => (e.n === 1 ? editionRecord(1, e.startedAt, { ...p, ...next }, e.summary) : e)), editionRecord(n, nowIso, { ...p, ...next }, summaryFor({ ...p, ...next }))] };"]],
};
BREAKS["PK26-X"] = BREAKS["PK26-E"];

if (process.argv[2] === "--restore") {
  if (!existsSync(BAK)) { console.log("nothing to restore"); process.exit(0); }
  for (const f of readdirSync(BAK)) {
    const orig = JSON.parse(readFileSync(join(BAK, f), "utf8"));
    writeFileSync(orig.path, orig.text);
    console.log(`restored ${orig.path}`);
  }
  process.exit(0);
}
const lock = process.argv[2];
const edits = BREAKS[lock];
if (!edits) throw new Error(`no source break for ${lock}`);
mkdirSync(BAK, { recursive: true });
for (const [path, a, b] of edits) {
  const text = readFileSync(path, "utf8");
  if (!text.includes(a)) throw new Error(`${lock}: the line to break is not in ${path} — the lock's target moved`);
  const bak = join(BAK, keyOf(path) + ".json");
  if (!existsSync(bak)) writeFileSync(bak, JSON.stringify({ path, text }));
  writeFileSync(path, text.replace(a, b));
  console.log(`broke ${path} for ${lock}`);
}
