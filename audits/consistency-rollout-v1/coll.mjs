#!/usr/bin/env node
/**
 * Consistency roll-out v1 — collateral between two audit runs.
 *   node audits/consistency-rollout-v1/coll.mjs <before> <after> [--ignore cls1,cls2] [--max 12]
 * For every page × width both runs measured: each collector record is paired by part|role|class head|text (in order),
 * and any numeric field or rect edge that moved by more than 1px, or any other field that changed, is printed.
 * Records whose first two class levels carry an --ignore class are the phase's own targets and are skipped.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const [B, A] = process.argv.slice(2, 4).map((p) => resolve(p));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const IGN = new Set(arg("--ignore", "").split(",").filter(Boolean)); const MAX = +arg("--max", "12");
const isIgn = (r) => (r.cls || []).slice(0, 2).some((l) => l.split(/[.#]/).slice(1).some((c) => IGN.has(c)));
let total = 0;
for (const f of readdirSync(A).filter((f) => /@\d+\.json$/.test(f)).sort()) {
  if (!existsSync(resolve(B, f))) { console.log(`${f}: not in before`); continue; }
  const b = JSON.parse(readFileSync(resolve(B, f), "utf8")), a = JSON.parse(readFileSync(resolve(A, f), "utf8"));
  if (!a.records || !b.records) { console.log(`${f}: no records (${a.error || b.error || "failed"})`); continue; }
  const key = (r) => `${r.part}|${r.role}|${(r.cls || [])[0]}|${r.text}`;
  const am = new Map(); for (const r of a.records) { const k = key(r); if (!am.has(k)) am.set(k, []); am.get(k).push(r); }
  const used = new Map(), diffs = [];
  for (const r of b.records) {
    if (isIgn(r)) continue;
    const k = key(r); const n = used.get(k) || 0; used.set(k, n + 1); const s = (am.get(k) || [])[n];
    if (!s) { diffs.push(`${k.slice(0, 90)}: gone in after`); continue; }
    const ch = [];
    for (const fl of new Set([...Object.keys(r.sig), ...Object.keys(s.sig)])) {
      const x = r.sig[fl], y = s.sig[fl]; if (JSON.stringify(x) === JSON.stringify(y)) continue;
      if (typeof x === "number" && typeof y === "number" && Math.abs(x - y) <= 1) continue;
      ch.push(`${fl}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
    }
    for (const e of ["x", "y", "w", "h"]) if (Math.abs((r.rect?.[e] ?? 0) - (s.rect?.[e] ?? 0)) > 1) ch.push(`rect.${e}: ${r.rect[e]} → ${s.rect[e]}`);
    if (ch.length) diffs.push(`${k.slice(0, 90)}: ${ch.join("; ").slice(0, 220)}`);
  }
  total += diffs.length;
  console.log(`${f}: ${diffs.length} of ${b.records.length}`); for (const d of diffs.slice(0, MAX)) console.log(`   ${d}`);
}
console.log(`TOTAL ${total}`);
