/**
 * Smart Import evaluation — the conversion snapshot, free to run.
 *
 *   npx tsx functions/eval/snapshot.ts <out.json>            write every fixture's converted text
 *   npx tsx functions/eval/snapshot.ts <out.json> <before.json>  …and list which fixtures changed
 *
 * A conversion fix must change the text of the fixtures it targets and NO OTHER. Comparing two
 * snapshots says exactly that, before a penny is spent re-running the model.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bufferToCsv } from "../../src/lib/sheetText";
import { FIXTURE_DIR, repoRoot, type Manifest } from "./types";

if (require.main === module) {
  const [out, before] = process.argv.slice(2);
  if (!out) throw new Error("usage: snapshot.ts <out.json> [<before.json>]");
  const root = repoRoot();
  const manifest: Manifest = JSON.parse(readFileSync(join(root, FIXTURE_DIR, "manifest.json"), "utf8"));
  const snap: Record<string, string> = {};
  for (const f of manifest.fixtures) snap[f.id] = bufferToCsv(readFileSync(join(root, f.file)));
  writeFileSync(out, JSON.stringify(snap, null, 1));
  if (before) {
    const old: Record<string, string> = JSON.parse(readFileSync(before, "utf8"));
    const changed = Object.keys(snap).filter((k) => snap[k] !== old[k]);
    console.log(`${changed.length} of ${Object.keys(snap).length} fixtures' converted text changed${changed.length ? ":\n  " + changed.join("\n  ") : "."}`);
  }
}
