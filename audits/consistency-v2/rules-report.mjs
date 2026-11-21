/**
 * Consistency audit v2 — writes the committed record of a rules check run: rules-clean.json (every failure that is not
 * an exception, grouped by rule and selector, with pages and widths; text per the public-repo rule) and copies the
 * proof table to proof.json. rules-result.json itself stays in the run folder (it holds raw page text).
 *
 *   node audits/consistency-v2/rules-report.mjs <clean run dir> [<proof json>]
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { RULES } from "./rules.mjs";
import { safeText } from "./textsafe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = resolve(process.argv[2]);
const res = JSON.parse(readFileSync(resolve(RUN, "rules-result.json"), "utf8"));
const agg = {};
for (const row of res.rows) for (const [rule, s] of Object.entries(row.rules)) for (const f of s.fails || []) {
  const k = `${rule}§${f.sel}§${f.detail}`;
  const e = (agg[k] = agg[k] || { rule, sel: f.sel, detail: f.detail, text: safeText(f.text || "", f.role || ""), pages: new Set(), widths: new Set(), n: 0 });
  e.n++; e.pages.add(row.page); e.widths.add(row.vw);
}
const byRule = Object.fromEntries(Object.keys(RULES).map((r) => [r, Object.values(agg).filter((e) => e.rule === r).sort((a, b) => b.pages.size - a.pages.size || b.n - a.n).map((e) => ({ ...e, pages: [...e.pages].sort(), widths: [...e.widths].sort() }))]));
const pagesFailing = Object.fromEntries(Object.keys(RULES).map((r) => [r, [...new Set(res.rows.filter((x) => x.rules[r].status === "fail").map((x) => x.page))].sort()]));
const table = res.rows.map((x) => ({ page: x.page, vw: x.vw, family: x.family, ...Object.fromEntries(Object.entries(x.rules).map(([r, s]) => [r, s.status === "fail" ? s.fails.length : s.status])) }));
const out = {
  generated: new Date().toISOString(), rules: RULES, pagesFailing, failures: byRule,
  exemptedTotal: res.rows.reduce((s, x) => s + Object.values(x.rules).reduce((t, y) => t + (y.exempt || 0), 0), 0),
  unusedExceptions: res.unusedExceptions, failedToLoad: res.failedToLoad, table,
};
writeFileSync(resolve(HERE, "rules-clean.json"), JSON.stringify(out, null, 1));
if (process.argv[3] && existsSync(process.argv[3])) writeFileSync(resolve(HERE, "proof.json"), readFileSync(process.argv[3]));
console.log(Object.entries(byRule).map(([r, l]) => `${r}: ${pagesFailing[r].length} page names, ${l.length} distinct failures`).join("\n"));
