/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The source-level breaks that prove two-door import v1's locks go red (reports/two-door-import/).
 * A page break (threetiles, tplpicker) is applied in the page by `TDI_MUTATE`; a break in what the
 * code does has to be a source change (and, for a page lock, a rebuild), and this is how each one is
 * made and undone.
 *
 *   node scripts/tdi-mutate.mjs apply <name>     then run the lock (unit: vitest; page: npm run e2e:emu)
 *   node scripts/tdi-mutate.mjs restore           puts every touched file back
 *
 * ⚠️ RUN IT IN THE BUILD'S OWN WORKTREE, NEVER IN A SHARED CHECKOUT. Backups are named by the file's
 * PATH, never its basename, and `restore` copies them back rather than asking git, which would
 * restore HEAD and take any uncommitted work with the mutation.
 * ⚠️ IT REFUSES TO APPLY OVER AN UNRESTORED BREAK, so two breaks cannot silently stack.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const DIR = ".tdi-mut";
const ROUTE = "src/lib/importReadRoute.ts";
const FLOW = "src/components/import/ImportFlow.tsx";
const RULES = "src/lib/importRules.ts";
const DECK = "src/components/onboarding/v9/DeckQuestions.tsx";
const GATE = "src/lib/reviewGate.ts";

/** name → [file, exact text, replacement][] */
const BREAKS = {
  /* H1: every file goes to Smart Import */
  alwayssmart: [[ROUTE, 'return TEMPLATE_HEADERS.every((h) => seen.has(h)) ? "headings" : "smart";', 'return "smart";']],
  /* H2: the headings route is skipped, so a headings file takes the Smart Import path */
  callsmart: [[FLOW, 'if ((await readRouteOfFile(file)) === "headings") { await pickTemplateFile(file); return; }', "void readRouteOfFile; void pickTemplateFile;"]],
  /* R1: the rules settle nothing */
  nosettle: [[RULES, "  const count: Record<SettledKind, number> = {", "  if (model) return { agents: model.agents, queries: model.queries, settled: [], raised: [] };\n  const count: Record<SettledKind, number> = {"]],
  /* R2: the status cell wins over its dates */
  statuswins: [[RULES, "  const dated = q.timeline.filter((e) => !!e.date);\n  if (dated.length === 0) return q.status;", "  const dated = q.timeline.filter((e) => !!e.date);\n  if (dated.length >= 0) return q.status;"]],
  /* Q3: a blank agency is asked again */
  askagency: [[RULES, "    return { ...a, agencyWaived: true };", "    return a;"]],
  /* Q1: the dates can be kept out of order */
  keepasgiven: [
    [DECK, 'disabled={bad} onClick={onConfirm} data-order="confirm"', 'disabled={false} onClick={onConfirm} data-order="confirm"'],
    [RULES, "  if (datesOutOfOrder(q)) return q;\n  return { ...q, reasons: q.reasons.map((r) => (r.code === \"dates-out-of-order\"", "  return { ...q, reasons: q.reasons.map((r) => (r.code === \"dates-out-of-order\""],
  ],
  /* Q2: the gate does not count an outcome-missing question */
  gateopen: [[GATE, "const r = q.reasons.find((x) => !x.resolved);", 'const r = q.reasons.find((x) => !x.resolved && x.code !== "outcome-missing");']],
};

const backup = (f) => `${DIR}/${f.replace(/\//g, "-")}`;
const [, , cmd, name] = process.argv;
if (cmd === "apply") {
  const list = BREAKS[name];
  if (!list) { console.error(`no break called ${name}: ${Object.keys(BREAKS).join(", ")}`); process.exit(1); }
  if (existsSync(DIR) && readdirSync(DIR).length) { console.error(`STOP: ${DIR}/ holds an unrestored break — run restore first`); process.exit(1); }
  mkdirSync(DIR, { recursive: true });
  for (const [f] of list) if (!existsSync(backup(f))) copyFileSync(f, backup(f));
  for (const [f, from, to] of list) {
    const src = readFileSync(f, "utf8");
    if (src.split(from).length !== 2) { console.error(`STOP: ${f} does not contain exactly one of: ${from}`); process.exit(1); }
    writeFileSync(f, src.replace(from, to));
  }
  console.log(`applied ${name} (${list.length} edit${list.length > 1 ? "s" : ""})`);
} else if (cmd === "restore") {
  if (!existsSync(DIR)) { console.log("nothing to restore"); process.exit(0); }
  for (const b of readdirSync(DIR)) {
    const f = Object.values(BREAKS).flat().map(([p]) => p).find((p) => backup(p) === `${DIR}/${b}`);
    if (!f) { console.error(`STOP: ${DIR}/${b} matches no known file`); process.exit(1); }
    copyFileSync(`${DIR}/${b}`, f);
  }
  rmSync(DIR, { recursive: true, force: true });
  console.log("restored");
} else {
  console.error("usage: node scripts/tdi-mutate.mjs <apply <name>|restore>");
  process.exit(1);
}
