#!/usr/bin/env python3 -I
"""
Comparable titles v28 — prove every CX28 lock red by its named mutation.

  SA_E2E_BASE_URL=http://127.0.0.1:<port> python3 -I tests/e2e/cx28Mutations.py [LOCK ...]

Each mutation is an exact-once replacement in ONE source file: made, the dev bundle rebuilt, the lock run (and the
unit locks that read the same code), the file put back FROM A PATH-DERIVED COPY (never git), and the restore checked
byte-for-byte. Run it in the measurement worktree, and do not edit src/ while it runs.
Writes reports/comps-v28/mutation-proofs.jsonl.
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
os.chdir(ROOT)
assert os.environ.get("SA_E2E_BASE_URL"), "set SA_E2E_BASE_URL"
OUT = "reports/comps-v28/mutation-runs"; os.makedirs(OUT, exist_ok=True)
PROOFS = "reports/comps-v28/mutation-proofs.jsonl"
BAK = tempfile.mkdtemp(prefix="cx28-mut-")
PAGE = "src/components/manuscripts/ComparableTitlesPage.tsx"
SHELF = "src/lib/compsShelf.ts"

M = {
  "H1": ("Keep the v27 panel when populated", PAGE, [
    ('import { CompsStartPanel, CompsLightHeader } from "./comps28/CompsHeader";', 'import { CompsStartPanel, CompsLightHeader } from "./comps28/CompsHeader";\nimport { PanelHeader } from "../shell/PanelHeader";'),
    ("            <CompsLightHeader\n", '            <><PanelHeader kind="title" title="Comparable titles" /><CompsLightHeader\n'),
    ("              onWhere={pickWhere} onLanding={toLanding}\n            />\n", "              onWhere={pickWhere} onLanding={toLanding}\n            /></>\n"),
  ], []),
  "H2": ("Count draft comps as sent", SHELF, [('(w === "sent" ? "sent" : w === "unsent"', '(w !== "none" ? "sent" : w === "unsent"')], ["src/lib/compsShelf.test.ts"]),
  "H3": ("Render the band when empty", PAGE, [("          {listed ? (\n            <>\n              {notice", "          {listed || empty ? (\n            <>\n              {notice")], []),
  "N1": ("One banner per letter", PAGE, [("{notice ? <CompsNotice notice={notice} onLog={(id) => openPicker(id)} /> : null}", "{(model?.unrecorded ?? []).map((u) => <CompsNotice key={u.letterId} notice={noticeOf([u])!} onLog={(id) => openPicker(id)} />)}")], []),
  "S1": ("Let the find box take flex: 1", "src/components/manuscripts/comps28/comps28.css", [("  flex: 0 1 230px; min-width: 150px; width: 230px;", "  flex: 1 1 0; min-width: 150px; width: 230px;")], []),
  "S2": ('Show "Log in a letter" on a not-ready comp', SHELF, [("  if (!r.ready) {\n    const book", "  if (!r.ready && false) {\n    const book")], ["src/lib/compsShelf.test.ts"]),
  "S3": ("Turn blush at 5", SHELF, [('age > OLD_AFTER ? "old"', 'age >= OLD_AFTER ? "old"')], ["src/lib/compsShelf.test.ts"]),
  "S4": ("Sort Best response ascending", SHELF, [("return p === null ? 1 : -p;", "return p === null ? 1 : p;")], ["src/lib/compsShelf.test.ts"]),
  "S5": ("OR the filters", SHELF, [("    (!f.where || shelfWhere(r.where) === f.where)\n    && (!f.kind || r.kind === f.kind)\n    && (", "    (!f.where || shelfWhere(r.where) === f.where)\n    || (!f.kind || r.kind === f.kind)\n    || (")], ["src/lib/compsShelf.test.ts"]),
  "D1": ("Use the comps-only average", PAGE, [("averageAsked(activeMs, queries, activities)", "averageAsked(activeMs, queries.filter((q) => { const l = model?.letterOfQuery.get(q.id); return !!l && Array.isArray(letters.find((x) => x.id === l)?.compIds); }), activities)")], []),
  "D2": ("Hide unrecorded letters", SHELF, [('  return blocks.map((b, i) => ({ b, i }))', '  return blocks.filter((b) => b.group !== "unrecorded").map((b, i) => ({ b, i }))')], ["src/lib/compsShelf.test.ts"]),
  "E1": ("Close the drawer on Cancel", PAGE, [('onBack={() => setDrawer((d) => (d && d.mode === "edit" && d.back ? { mode: "view", key: d.key } : null))}', "onBack={() => setDrawer(null)}")], []),
  "E2": ("Drop the re-render lookup", "src/components/manuscripts/comps28/refocus.ts", [("    target = key ? onScreen(key) ?? (card ? onScreen(`card:${card}`) : null) : null;", "    target = null; void key; void card;")], []),
  "E3": ("Disable Save when the tip shows", "src/components/manuscripts/comps25/CompLetterPicker.tsx", [('data-cv="picker-save" disabled={!letter}', 'data-cv="picker-save" disabled={!letter || tip.length > 0}')], []),
  "L0": ("Treat loading as empty", PAGE, [("  const empty = !loading && !!activeMs && isEmpty;", "  const empty = loading || (!!activeMs && isEmpty);")], []),
}

def sh(cmd, log):
  with open(log, "w") as f:
    return subprocess.run(cmd, shell=True, stdout=f, stderr=subprocess.STDOUT).returncode

def reds(log):
  t = open(log, encoding="utf-8", errors="replace").read()
  return len(re.findall(r"^\s+✘", t, re.M)), len(re.findall(r"^\s+✓", t, re.M)), t

want = sys.argv[1:] or list(M)
for lock in want:
  name, path, reps, units = M[lock]
  bak = os.path.join(BAK, path.replace("/", "-"))
  shutil.copyfile(path, bak)
  src = open(path, encoding="utf-8").read()
  ok = True
  for a, b in reps:
    if src.count(a) != 1:
      ok = False; print(f"{lock}: anchor found {src.count(a)} times — NOT APPLIED: {a[:60]!r}"); break
    src = src.replace(a, b)
  rec = {"lock": lock, "mutation": name, "file": path}
  if ok:
    open(path, "w", encoding="utf-8").write(src)
    if sh("npm run build:dev", f"{OUT}/{lock}.build.log") != 0:
      rec["result"] = "the mutated build failed"
    else:
      code = sh(f'npx playwright test tests/e2e/compsV28.measure.ts --workers=1 -g "{lock} · "', f"{OUT}/{lock}.log")
      r, g, text = reds(f"{OUT}/{lock}.log")
      first = re.search(r"Error: (.*?)\n", text)
      rec.update({"e2e_exit": code, "e2e_red": r, "e2e_green": g, "first_error": first.group(1)[:240] if first else None})
      for u in units:
        uc = sh(f"npx vitest run {u}", f"{OUT}/{lock}.unit.log")
        rec.setdefault("unit", {})[u] = "red" if uc != 0 else "green"
  else:
    rec["result"] = "not applied"
  shutil.copyfile(bak, path)
  same = open(bak, "rb").read() == open(path, "rb").read()
  rec["restored"] = same
  assert same, f"{lock}: RESTORE FAILED for {path}"
  with open(PROOFS, "a") as f: f.write(json.dumps(rec) + "\n")
  print(json.dumps(rec))

sh("npm run build:dev", f"{OUT}/restore.build.log")
subprocess.run("node tests/e2e/seedCompsV25.mjs --empty", shell=True, stdout=subprocess.DEVNULL)
shutil.rmtree(BAK)
print("restored, rebuilt and re-seeded")
