#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cb21Mutate — Corkboard v2.1's red-first proofs (CB15–CB21). Each lock has one named break; this applies it to the source, runs that
 * lock on the emulator build (`npm run e2e:emu`), records whether it went red, and puts the file back from a copy
 * taken before the edit (a path-derived backup, never `git checkout`).
 *
 *   node tests/e2e/cb21Mutate.mjs CB15 CB19 …   (no names: all seven)
 *
 * Results append to reports/corkboard-v2-1/mutation-proofs.jsonl.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PAGE = "src/components/todo/TodoNoteboardPage.tsx";
const M = {
  CB15: ["Render it while filtered", PAGE, ["onNew={narrowing ? undefined : () => openComposer()}", "onNew={() => openComposer()}"]],
  CB16: ["Drop the pre-tick", PAGE, ['if (act.a === "newpile") setStartFor({ k: null, sel: [note.id] });', 'if (act.a === "newpile") setStartFor({ k: null, sel: [] });']],
  CB17: ["Replace all tags", PAGE, ["await Promise.all(moved.map((n) => { const next = tagsForPile(n.tags, pile);", "await Promise.all(moved.map((n) => { const next = [pile];"]],
  CB18: ["Delete the def", PAGE, [
    'try { await updateUserPaths({ "todoPrefs.noteboard.started": prefs.started.filter((x) => x !== k) }); }',
    'try { await updateUserPaths({ "todoPrefs.noteboard.started": prefs.started.filter((x) => x !== k), tags: userTags.filter((t) => t.id !== k) }); }',
  ]],
  CB19: ["List every note", PAGE, ['notes={board.filter((n) => !startFor.k || (n.tags?.[0] ?? "") !== startFor.k)', "notes={board.filter(() => true)"]],
  CB20: ["Allow duplicates", "src/components/todo/corkboard/CbStartPile.tsx", ["const clash = !adding && !!slug && have.has(slug);", "const clash = false;"]],
  CB21: ["Fixed-width pop-up", "src/components/todo/corkboard/corkboard.css", [".cb2-sdlg .cb2-dacts { margin-top: 20px; }", ".cb2-sdlg { width: 640px !important; max-width: none !important; } .cb2-sdlg .cb2-dacts { margin-top: 20px; }"]],
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(M);
mkdirSync("reports/corkboard-v2-1", { recursive: true });
mkdirSync("/tmp/cb21mut", { recursive: true });
for (const name of names) {
  const [what, file, ...edits] = M[name];
  const backup = `/tmp/cb21mut/${file.replace(/\//g, "-")}`;
  copyFileSync(file, backup);
  let src = readFileSync(file, "utf8");
  for (const [from, to, all] of edits) {
    if (!src.includes(from)) { console.error(`✗ ${name}: anchor not found in ${file}: ${from.slice(0, 80)}`); copyFileSync(backup, file); process.exit(2); }
    src = all ? src.split(from).join(to) : src.replace(from, to);
  }
  writeFileSync(file, src);
  /* build, then wait for the shared emulator ports and start at once (tests/e2e/cb21Emu.sh) */
  const r = spawnSync("sh", ["tests/e2e/cb21Emu.sh", "tests/e2e/corkboardV21.measure.ts", "--project=measure", "-g", `${name} `], {
    encoding: "utf8", env: { ...process.env, CB2_MUTATE: name }, maxBuffer: 64 * 1024 * 1024,
  });
  copyFileSync(backup, file);
  const out = `${r.stdout}\n${r.stderr}`;
  writeFileSync(`reports/corkboard-v2-1/mutation-${name}.log`, out.replace(/\x1b\[[0-9;]*m/g, ""));
  /* a run that never reached its lock (a taken port, a build error) is neither red nor green: say so */
  const ran = new RegExp(`${name} [^\\n]*\\(`).test(out.replace(/\x1b\[[0-9;]*m/g, "")) || /\d+ passed/.test(out);
  const red = /\d+ failed/.test(out) && !/\b0 failed/.test(out);
  const reason = (out.match(/✗ CB\d+ · [^\n]+/) ?? [""])[0];
  appendFileSync("reports/corkboard-v2-1/mutation-proofs.jsonl", `${JSON.stringify({ lock: name, mutation: what, file, ran, red, reason, at: new Date().toISOString() })}\n`);
  console.log(`${!ran ? "DID NOT RUN" : red ? "RED  " : "GREEN"} ${name} — ${what}${reason ? `  (${reason})` : ""}`);
}
