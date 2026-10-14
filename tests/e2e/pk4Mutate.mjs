/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PK4 — the source mutations: what these locks guard is a decision the code makes, so the break is an edit to the
 * code, made and undone IN THE MEASUREMENT WORKTREE (never the primary checkout, never with `git checkout`). The
 * backup is path-derived, so two files can never share one.
 *
 *   node tests/e2e/pk4Mutate.mjs <name> apply
 *   node tests/e2e/pk4Mutate.mjs <name> restore
 *
 * After `apply`, rebuild (`npm run build:dev`) and run the lock with `PK4_MUTATE=<name>`; then `restore` and rebuild.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";

const M = {
  /* B1 — match a material filter on ANY edition the package has had */
  B1: ["src/components/packages/v4/PkgFilters4.tsx",
    `if (f.letters.length && !f.letters.includes(p.queryLetterVersionId)) return false;`,
    `if (f.letters.length && !f.letters.includes(p.queryLetterVersionId) && !(p.editions ?? []).some((e) => f.letters.includes(e.queryLetterVersionId))) return false;`],
  /* E1 — let under-4 rows sort by value */
  E1: ["src/lib/packageReplies.ts",
    `    const q = Number(qualifies(b.s)) - Number(qualifies(a.s));\n    if (q) return q;\n    const va`,
    `    const va`],
  /* v3 D4 — close the drawer on park-save */
  "V3-D4": ["src/components/packages/v4/PkgDrawer4.tsx",
    `if (parked) go({ m: "pkgform", d: { ...parked, [d.kind]: id } });`,
    `if (parked) go(null);`],
  /* v3 D5 — start an edition on rename (the "anything else" line is changed on every save, a contents change) */
  "V3-D5": ["src/components/packages/v4/usePackagesModel.ts",
    `packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, ...bv, otherMaterials: d.other,`,
    `packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, ...bv, otherMaterials: \`\${d.other} (mutated)\`,`],
  /* v3 D5 (b) — the v2 page's save: a deleteField() for an unset version, which the edition check cannot take */
  "V3-D5b": ["src/components/packages/v4/usePackagesModel.ts",
    `packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, ...bv, otherMaterials: d.other,`,
    `packageName: name, queryLetterVersionId: d.letter, synopsisVersionId: d.synopsis, bookVersionId: (d.version || deleteField()) as unknown as string, otherMaterials: d.other,`],
  /* v3 D6 — write on Duplicate */
  "V3-D6": ["src/components/packages/v4/PkgDrawer4.tsx",
    `{ act: "dup", label: "Duplicate", run: () => go({ m: "pkgform", d: model.dupDraft(p) }) },`,
    `{ act: "dup", label: "Duplicate", run: () => { void model.savePackage(model.dupDraft(p)); go({ m: "pkgform", d: model.dupDraft(p) }); } },`],
  /* v3 E2 — drop the 4-answered threshold from the lead cells */
  "V3-E2": ["src/lib/packageReplies.ts",
    `  const el = rows.filter((r) => qualifies(r.s));`,
    `  const el = rows;`],
  /* v3 E3 — sort by sent (the table's default key) */
  "V3-E3": ["src/components/packages/v4/PkgReplies4.tsx",
    `useState<{ key: SortKey; dir: "desc" | "asc" }>({ key: "requests", dir: "desc" })`,
    `useState<{ key: SortKey; dir: "desc" | "asc" }>({ key: "sent", dir: "desc" })`],
};

const [name, act] = process.argv.slice(2);
const m = M[name];
if (!m || !["apply", "restore"].includes(act)) { console.error(`usage: <${Object.keys(M).join("|")}> apply|restore`); process.exit(2); }
const [file, from, to] = m;
mkdirSync("/tmp/pk4/mut", { recursive: true });
const bak = `/tmp/pk4/mut/${file.replace(/[/.]/g, "-")}`;
if (act === "apply") {
  const src = readFileSync(file, "utf8");
  if (!src.includes(from)) { console.error(`${name}: the text to break is not in ${file}`); process.exit(1); }
  if (existsSync(bak)) { console.error(`${name}: a backup is already held at ${bak} — restore first`); process.exit(1); }
  copyFileSync(file, bak);
  writeFileSync(file, src.replace(from, to));
  console.log(`${name}: applied to ${file}`);
} else {
  if (!existsSync(bak)) { console.error(`${name}: no backup at ${bak}`); process.exit(1); }
  copyFileSync(bak, file);
  unlinkSync(bak);
  console.log(`${name}: restored ${file}`);
}
