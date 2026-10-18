/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discover v1 — lock E1, two-sided: the dev review aid (lib/discoverReviewAid) is ABSENT from a production build and
 * PRESENT in a dev one, and the production bundle carries the coming-soon page. Builds both into a scratch directory
 * (never `dist/`, so a running preview is not disturbed) and greps the JavaScript.
 *
 *   node tests/e2e/dv1BundleCheck.mjs <scratch-dir>
 *
 * ⚠️ THE NEEDLES ARE THE AID'S OWN: its window globals, its fixture ids and a fixture name. A production build that
 *    still holds any of them shipped the aid — the gate was not at the call site.
 */
import { execSync } from "node:child_process";
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2];
if (!out) throw new Error("usage: node tests/e2e/dv1BundleCheck.mjs <scratch-dir>");
const NEEDLES = ["__SA_DV_STATE", "__SA_DV_LIVE", "__SA_DV_HOLD_MS", "dvfx-", "Eleanor Whitcombe", "Fixture Agency"];
const PAGE = ["out looking", "Tell me when it"];
const js = (dir) => { const all = []; const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f.endsWith(".js")) all.push(readFileSync(p, "utf8")); } }; walk(dir); return all.join("\n"); };
const build = (mode, dir) => execSync(`npx vite build --mode ${mode} --outDir ${dir} --emptyOutDir`, { stdio: "pipe", timeout: 600_000 });

mkdirSync(out, { recursive: true });
build("production", join(out, "prod"));
build("development", join(out, "dev"));
const prod = js(join(out, "prod")), dev = js(join(out, "dev"));
const rows = [
  ...NEEDLES.map((n) => ({ check: `production lacks ${n}`, ok: !prod.includes(n) })),
  ...NEEDLES.map((n) => ({ check: `development has ${n}`, ok: dev.includes(n) })),
  ...PAGE.map((n) => ({ check: `production carries the coming-soon page (${n})`, ok: prod.includes(n) })),
];
for (const r of rows) console.log(`${r.ok ? "✓" : "✗"} ${r.check}`);
mkdirSync("reports/discover-v1/ledger", { recursive: true });
writeFileSync(`reports/discover-v1/ledger/${process.env.DV1_MUTATE ? `mut-${process.env.DV1_MUTATE}-` : ""}E1-bundle.json`, JSON.stringify(rows, null, 1));
const bad = rows.filter((r) => !r.ok).length;
console.log(`[E1] ${rows.length - bad}/${rows.length} green`);
process.exit(bad ? 1 : 0);
