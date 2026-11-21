/**
 * Consistency audit v2 — proving the rules check. For one planted fault: compares the faulted run's result for the
 * page against the clean tree's, and says which rules newly failed (or failed more) there.
 *
 *   node audits/consistency-v2/proof.mjs <clean run dir> <fault run dir> <page key> <rule> <description>
 *
 * Appends one line to <fault run dir>/../proof.json. CAUGHT means: the target rule went red on that page (or its
 * failure count rose) and no other rule changed there. A rule that cannot be made to go red is reported as not
 * working, never as passing.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { evaluate } from "./rules.mjs";

const [clean, fault, page, rule, ...desc] = process.argv.slice(2);
void dirname(fileURLToPath(import.meta.url));
const C = JSON.parse(readFileSync(resolve(clean, "rules-result.json"), "utf8"));
const F = existsSync(resolve(fault, "rules-result.json")) ? JSON.parse(readFileSync(resolve(fault, "rules-result.json"), "utf8")) : evaluate(fault);
const vw = 1512;
const c = C.rows.find((r) => r.page === page && r.vw === vw);
const f = F.rows.find((r) => r.page === page && r.vw === vw);
const res = { rule, page, fault: desc.join(" "), at: new Date().toISOString() };
if (!c || !f) { res.verdict = "NOT RUN"; res.why = !c ? "no clean reading for the page" : "the faulted run did not measure the page"; }
else {
  const n = (row, r) => (row.rules[r].status === "fail" ? row.rules[r].fails.length : 0);
  const changed = Object.keys(f.rules).filter((r) => n(f, r) !== n(c, r) || f.rules[r].status !== c.rules[r].status);
  res.changed = changed.map((r) => `${r}: ${c.rules[r].status}${n(c, r) ? ` ${n(c, r)}` : ""} → ${f.rules[r].status}${n(f, r) ? ` ${n(f, r)}` : ""}`);
  const target = n(f, rule) > n(c, rule);
  res.newFails = target ? f.rules[rule].fails.filter((x) => !(c.rules[rule].fails || []).some((y) => y.sel === x.sel && y.detail === x.detail)).slice(0, 4).map((x) => `${x.sel} [${x.detail}]`) : [];
  res.verdict = target && changed.length === 1 ? "CAUGHT" : target ? "CAUGHT, BUT OTHER RULES MOVED" : "NOT CAUGHT";
}
const P = resolve(fault, "..", "proof.json");
const all = existsSync(P) ? JSON.parse(readFileSync(P, "utf8")) : [];
all.push(res);
writeFileSync(P, JSON.stringify(all, null, 1));
console.log(JSON.stringify(res, null, 1));
