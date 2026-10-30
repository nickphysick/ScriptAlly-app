#!/usr/bin/env node
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PR2's red-before proofs for the BEHAVIOUR locks (the CSS ones take PR2_MUTATE in the page). For each named break:
 * back up the file to a path-derived name, apply the edit, build for dev, run only that lock on the Pixel, record
 * whether it went red, and put the file back from the backup — never with git, which restores to HEAD and would take
 * any uncommitted work with it (CLAUDE.md).
 *
 *   node scripts/pr2-mutate.mjs <out.jsonl> [lock …]      SA_E2E_BASE_URL must name this tree's preview
 *
 * Run it in the measurement worktree only.
 */
import { copyFileSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";

const MUT = {
  R1: { file: "src/lib/todoRoutes.ts", from: '  "/todo/calendar": "/todo",\n', to: "", what: "drop the calendar redirect" },
  R4: { file: "src/components/agents/phone/AgentsPhone.tsx", from: '<span data-pa="ag-qd">{qd.length}</span>', to: '<span data-pa="ag-qd">{qd.length + toq.length}</span>', what: "the ring counts every agent as queried" },
  R5: { file: "src/components/dashboard/phone/PhoneActivity.tsx", from: "const need = e.need && e.queryId ? e.need : null;", to: 'const need = e.queryId ? (e.need ?? { label: "Send it" }) : null;', what: "every reply (a pass included) counted as a request with an action" },
  R6: { file: "src/components/todo/phone/useTodoPhone.tsx", from: 'data-pa="tick" aria-label={`Do it: ${i.deed}`} onClick={onTick}', to: 'data-pa="tick" aria-label={`Do it: ${i.deed}`} onClick={() => {}}', what: "the tick no longer opens the task's door" },
  R7: { file: "src/components/packages/phone/PackagesPhone.tsx", from: 'const bl = bestPiece(model.figItems("let")', to: 'const bl = ((xs: { id: string; name: string; f: Fig; retired?: boolean }[]) => { const s = [...xs].filter((x) => x.f.sent > 0).sort((a, b) => b.f.sent - a.f.sent)[0]; return s ? { item: s, bars: [] } : null; })(model.figItems("let")', what: "the best letter ranked by sent count" },
  R7b: { lock: "R7", file: "src/components/packages/phone/PackagesPhone.tsx", from: 'const bv = bestPiece(model.figItems("ver")', to: 'const bv = ((xs: { id: string; name: string; f: Fig; retired?: boolean }[]) => { const s = [...xs].filter((x) => x.f.sent > 0).sort((a, b) => b.f.sent - a.f.sent)[0]; return s ? { item: s, bars: [] } : null; })(model.figItems("ver")', what: "the best version ranked by sent count, ignoring the desktop's minimum" },
  R8: { file: "src/components/packages/phone/PackagesPhone.tsx", from: "        {locked ? (\n          <>\n            <div className=\"pa-lockn\" data-pa=\"pkg-locked\">", to: "        {false ? (\n          <>\n            <div className=\"pa-lockn\" data-pa=\"pkg-locked\">", what: "a sent package offers Edit" },
  R9: { file: "src/components/packages/phone/PackagesPhone.tsx", from: "      queryLetterVersionId: let_, synopsisVersionId: syn,", to: '      queryLetterVersionId: "", synopsisVersionId: syn,', what: "Mark as ready saves without the letter (stays a draft)" },
  R10: { file: "src/components/phone/materials/PhoneLetterEditor.tsx", from: "const next = useMemo(() => (m && gone ? model.newVersionDraft(m) : null), [m, gone, model]);", to: "const next = useMemo(() => null as ReturnType<typeof model.newVersionDraft> | null, [m, gone, model]);", what: "a sent letter is saved over in place" },
  R11: { file: "src/components/packages/phone/PackagesPhone.tsx", from: "const old = compAge(c, y) != null;", to: "const old = age != null && age >= 5;", what: "the age chip is blush at five years" },
};

const out = resolve(process.argv[2] ?? "pr2-mutations.jsonl");
const want = process.argv.slice(3);
const keys = want.length ? want : Object.keys(MUT);
mkdirSync("/tmp/pr2-mut", { recursive: true });
for (const k of keys) {
  const m = MUT[k];
  const backup = `/tmp/pr2-mut/${m.file.replace(/[\/.]/g, "-")}`;
  const src = readFileSync(m.file, "utf8");
  if (!src.includes(m.from)) { appendFileSync(out, JSON.stringify({ lock: k, what: m.what, error: "anchor not found" }) + "\n"); continue; }
  copyFileSync(m.file, backup);
  let red = null, tail = "";
  try {
    writeFileSync(m.file, src.replace(m.from, m.to));
    execSync("npm run build:dev", { stdio: "pipe" });
    try {
      execSync(`npx playwright test tests/e2e/phoneRoundTwo.measure.ts --project=pixel -g "\\b${m.lock ?? k} "`, { stdio: "pipe", env: process.env });
      red = false;
    } catch (e) { red = true; tail = String(e.stdout ?? "").split("\n").filter((l) => /Error|expect|✘|Expected|Received/.test(l)).slice(0, 6).join(" | "); }
  } finally {
    copyFileSync(backup, m.file);
  }
  appendFileSync(out, JSON.stringify({ lock: k, what: m.what, red, tail }) + "\n");
  console.log(k, red ? "RED" : "green", m.what);
}
execSync("npm run build:dev", { stdio: "pipe" });
console.log("rebuilt clean");
