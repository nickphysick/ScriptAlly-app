/**
 * Smart Import evaluation — before and after, fixture by fixture.
 *
 *   npx tsx functions/eval/compare.ts <before report dir> <after report dir>
 *
 * Prints a markdown table for every fixture present in both reports (first run): pass, field
 * accuracy, dropped, invented and wrong fields, before → after. Reads results.json only.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./types";

export function compareTable(before: any, after: any): string {
  const byId = new Map<string, any>(before.results.map((r: any) => [r.id, r]));
  const rows = ["| Fixture | Pass | Field accuracy | Dropped | Invented | Wrong fields | Coverage |", "|---|---|---|---|---|---|---|"];
  const pct = (s: any) => (s.fieldsCompared ? `${((100 * s.fieldsCorrect) / s.fieldsCompared).toFixed(1)}%` : "—");
  const cov = (r: any) => `${((100 * r.conversion.coverage.visible) / (r.conversion.coverage.facts || 1)).toFixed(0)}%`;
  for (const a of after.results) {
    const b = byId.get(a.id);
    if (!b) continue;
    const sb = b.runs[0].score, sa = a.runs[0].score;
    rows.push(`| ${a.id} | ${sb.pass ? "✓" : "✗"} → ${sa.pass ? "✓" : "✗"} | ${pct(sb)} → ${pct(sa)} | ${sb.dropped.length} → ${sa.dropped.length} | ${sb.invented.length} → ${sa.invented.length} | ${sb.wrong.length} → ${sa.wrong.length} | ${cov(b)} → ${cov(a)} |`);
  }
  return rows.join("\n");
}

if (require.main === module) {
  const [b, a] = process.argv.slice(2);
  if (!b || !a) throw new Error("usage: compare.ts <before report dir> <after report dir>");
  const root = repoRoot();
  const read = (d: string) => JSON.parse(readFileSync(join(root, d, "results.json"), "utf8"));
  console.log(compareTable(read(b), read(a)));
}
