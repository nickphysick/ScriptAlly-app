#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * cb2Mutate — Corkboard v2's red-first proofs. Each lock has one named break; this applies it to the source, runs that
 * lock on the emulator build (`npm run e2e:emu`), records whether it went red, and puts the file back from a copy
 * taken before the edit (a path-derived backup, never `git checkout`).
 *
 *   node tests/e2e/cb2Mutate.mjs CB3 CB7 …   (no names: all fourteen)
 *
 * Results append to reports/corkboard-v2/mutation-proofs.jsonl.
 */
import { readFileSync, writeFileSync, copyFileSync, mkdirSync, appendFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PAGE = "src/components/todo/TodoNoteboardPage.tsx";
const M = {
  CB1: ["Rewrite old colours on read", PAGE, [
    "  const notesAll = useMemo(() => sortNotes(userTasks), [userTasks]);",
    "  const notesAll = useMemo(() => sortNotes(userTasks), [userTasks]);\n  useEffect(() => { for (const n of notesAll) if (n.colour && !(NOTE_COLOURS as readonly string[]).includes(n.colour)) void setUserTaskColour(n.id, paperOf(n.colour)); }, [notesAll]); // eslint-disable-line",
  ]],
  CB2: ["Hard-code \"13\"", "src/components/todo/corkboard/CbHeader.tsx", ["boardSentence(count, glance.onTodo)", "boardSentence(13, glance.onTodo)"]],
  CB3: ["Filter on tags", PAGE, ["&& (!special || inGlance(n, special))", "&& (!special || (n.tags ?? []).length > 0)"]],
  CB4: ["Inherit the serif", "src/components/todo/corkboard/corkboard.css", ["font: 400 17px/1.42 var(--cb2-type) !important;", "font: 400 17px/1.42 var(--cb2-serif) !important;"]],
  CB5: ["Always show \"Read all\"", "src/components/todo/corkboard/CbWall.tsx", ["if (btn) btn.hidden = !(b.scrollHeight > b.clientHeight + 2);", "if (btn) btn.hidden = false;"]],
  CB6: ["Sort before pinning", "src/lib/corkboard.ts", ["  return [...list.filter((n) => n.pinned), ...list.filter((n) => !n.pinned)];", "  return list;"]],
  CB7: ["Write the whole todoPrefs", PAGE, [
    "const paths: Record<string, unknown> = { \"todoPrefs.noteboard.order\": ids };",
    "const paths: Record<string, unknown> = { todoPrefs: { ...(currentUser?.todoPrefs ?? {}), noteboard: { ...(currentUser?.todoPrefs?.noteboard ?? {}), order: ids, ...(toMine ? { sort: \"mine\" } : {}) } } };",
  ], ["    if (toMine) paths[\"todoPrefs.noteboard.sort\"] = \"mine\";\n", ""]],
  CB8: ["Replace all tags", PAGE, ["    const next = tagsForPile(was, k);", "    const next = k ? [k] : [];"]],
  CB9: ["Write colour on the task", PAGE, [
    "    try { id = await addUserTask({ text, dueDate: due, ...(detail ? { detail } : {}) }); }",
    "    try { id = await addUserTask({ text, dueDate: due, ...(detail ? { detail } : {}) }); if (id) await setUserTaskColour(id, \"blush\"); }",
  ]],
  CB10: ["Keep them in component state", PAGE, [
    "  const prefs = boardPrefs(currentUser);\n  const view: BoardView = prefs.view;\n  const sort: BoardSort = prefs.sort;\n  const setBoardView = async (next: BoardView) => {\n    try { await updateUserPaths({ \"todoPrefs.noteboard.view\": next }); }",
    "  const prefs = boardPrefs(currentUser);\n  const [view, setLv] = useState<BoardView>(\"board\");\n  const [sort, setLs] = useState<BoardSort>(\"new\");\n  const setBoardView = async (next: BoardView) => {\n    try { setLv(next); }",
  ], ["    try { await updateUserPaths({ \"todoPrefs.noteboard.sort\": next }); }", "    try { setLs(next); }"]],
  CB11: ["Show the wall", PAGE, ["{empty ? <CbEmpty onKeep={(ex) => void keepExample(ex)} /> : (", "{false ? <CbEmpty onKeep={(ex) => void keepExample(ex)} /> : ("]],
  CB12: ["Allow drag on phone", PAGE, ["draggable={!phone}", "draggable={true}", "all"]],
  CB14: ["Narrow to the new five", "firestore.rules", [
    "data.colour in ['butter', 'blush', 'powder', 'sand', 'stone', 'pink', 'sage', 'yellow']",
    "data.colour in ['butter', 'blush', 'powder', 'sand', 'stone']",
  ]],
};

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(M);
mkdirSync("reports/corkboard-v2", { recursive: true });
mkdirSync("/tmp/cb2mut", { recursive: true });
for (const name of names) {
  const [what, file, ...edits] = M[name];
  const backup = `/tmp/cb2mut/${file.replace(/\//g, "-")}`;
  copyFileSync(file, backup);
  let src = readFileSync(file, "utf8");
  for (const [from, to, all] of edits) {
    if (!src.includes(from)) { console.error(`✗ ${name}: anchor not found in ${file}: ${from.slice(0, 80)}`); copyFileSync(backup, file); process.exit(2); }
    src = all ? src.split(from).join(to) : src.replace(from, to);
  }
  writeFileSync(file, src);
  /* the emulator's ports are fixed and shared with other sessions' runs: wait until they are free */
  spawnSync("sh", ["-c", "until ! lsof -nP -iTCP:4405 -sTCP:LISTEN >/dev/null 2>&1 && ! lsof -nP -iTCP:8085 -sTCP:LISTEN >/dev/null 2>&1; do sleep 5; done"]);
  const r = spawnSync("npm", ["run", "e2e:emu", "--", "tests/e2e/corkboardV2.measure.ts", "--project=measure", "-g", `${name} `], {
    encoding: "utf8", env: { ...process.env, CB2_MUTATE: name }, maxBuffer: 64 * 1024 * 1024,
  });
  copyFileSync(backup, file);
  const out = `${r.stdout}\n${r.stderr}`;
  writeFileSync(`reports/corkboard-v2/mutation-${name}.log`, out.replace(/\x1b\[[0-9;]*m/g, ""));
  /* a run that never reached its lock (a taken port, a build error) is neither red nor green: say so */
  const ran = new RegExp(`${name} [^\\n]*\\(`).test(out.replace(/\x1b\[[0-9;]*m/g, "")) || /\d+ passed/.test(out);
  const red = /\d+ failed/.test(out) && !/\b0 failed/.test(out);
  const reason = (out.match(/✗ CB\d+ · [^\n]+/) ?? [""])[0];
  appendFileSync("reports/corkboard-v2/mutation-proofs.jsonl", `${JSON.stringify({ lock: name, mutation: what, file, ran, red, reason, at: new Date().toISOString() })}\n`);
  console.log(`${!ran ? "DID NOT RUN" : red ? "RED  " : "GREEN"} ${name} — ${what}${reason ? `  (${reason})` : ""}`);
}
