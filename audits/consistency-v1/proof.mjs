#!/usr/bin/env node
/**
 * Consistency audit v1 — the harness proof.
 *
 *   node audits/consistency-v1/proof.mjs <baselineRunDir> <plantedRunDir> <page-key> <vw>
 *
 * Three faults are planted on one page (in the worktree only, then reverted):
 *   1. the page title 2px larger           → part type/page-title, field fontSize
 *   2. a card's edge one shade off          → part cards/card, field border or shadow
 *   3. a primary button 4px shorter         → part buttons/primary/rest, field height
 *
 * Each must be FLAGGED: (a) the planted page's reading for that part differs from the baseline reading, and
 * (b) analysing the baseline run with the planted page swapped in, the planted value is a variant of a
 * FINDING (a group with more than one variant) that names the planted page. Prints one line per fault and
 * exits 1 if any is missed.
 */
import { readFileSync, readdirSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const [BASE, PLANT, KEY, VW] = process.argv.slice(2);
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const file = `${KEY}@${VW}.json`;
const base = JSON.parse(readFileSync(resolve(BASE, file), "utf8"));
const plant = JSON.parse(readFileSync(resolve(PLANT, file), "utf8"));

const FAULTS = [
  { name: "page title 2px larger", part: "type", role: "page-title", fields: ["fontSize"] },
  { name: "card edge one shade off", part: "cards", role: "card", fields: ["border", "shadow"] },
  { name: "primary button 4px shorter", part: "buttons", role: "primary/rest", fields: ["height"] },
];

/* merged run: the baseline with the planted page swapped in */
const MERGED = resolve(PLANT, "_merged");
rmSync(MERGED, { recursive: true, force: true });
mkdirSync(MERGED, { recursive: true });
for (const f of readdirSync(BASE).filter((f) => /@\d+\.json$/.test(f))) copyFileSync(resolve(BASE, f), resolve(MERGED, f));
copyFileSync(resolve(PLANT, file), resolve(MERGED, file));
if (existsSync(resolve(BASE, "_log.json"))) copyFileSync(resolve(BASE, "_log.json"), resolve(MERGED, "_log.json"));
execFileSync("node", [resolve(ROOT, "audits/consistency-v1/analyse.mjs"), MERGED], { stdio: "inherit" });
const F = JSON.parse(readFileSync(resolve(MERGED, "findings.json"), "utf8")).findings;

const sigs = (run, part, role) => new Set(run.records.filter((r) => r.part === part && r.role === role && r.scope !== "shell").map((r) => JSON.stringify(r.sig)));
let missed = 0;
for (const fault of FAULTS) {
  const b = sigs(base, fault.part, fault.role), p = sigs(plant, fault.part, fault.role);
  const newOnes = [...p].filter((s) => !b.has(s)).map((s) => JSON.parse(s));
  const moved = newOnes.filter((s) => fault.fields.some((k) => s[k] !== undefined));
  /* (b) is the new value a variant of a finding naming this page? */
  const group = F.find((f) => f.part === fault.part && f.role === fault.role && String(f.vw) === String(VW) && f.pages.includes(KEY));
  const flagged = group && group.variants.length > 1 && moved.some((m) => group.variants.some((v) => v.pages.includes(KEY) && fault.fields.every((k) => JSON.stringify(v.sig[k]) === JSON.stringify(m[k]))));
  const ok = moved.length > 0 && flagged;
  if (!ok) missed++;
  console.log(`[proof] ${ok ? "CAUGHT" : "MISSED"} — ${fault.name}: ${moved.length} new reading(s) on ${KEY}${moved[0] ? ` (${fault.fields.map((k) => `${k} ${JSON.stringify(moved[0][k])}`).join(", ")})` : ""}; ${group ? `finding ${group.id} (${group.variants.length} variants)` : "no finding"}`);
}
console.log(missed ? `[proof] ${missed} of 3 faults MISSED` : "[proof] all 3 faults caught");
process.exit(missed ? 1 : 0);
