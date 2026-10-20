#!/usr/bin/env python3
"""Help Centre v1 — the src mutations behind HC1's red runs, one named break per lock.

  python3 tests/e2e/hc1Mutate.py <tree> apply <LOCK>    # back the file up (path-derived name), apply the break
  python3 tests/e2e/hc1Mutate.py <tree> undo <LOCK>     # put the backup back, byte for byte

Run in the MEASUREMENT worktree, never the primary checkout: an undo there is a copy from a backup, never `git checkout`.
HC1-H1 restores the old Help Centre whole (`git show 6a7a0715:src/components/HelpCentre.tsx`).
"""
import os, shutil, subprocess, sys

MUT = {
    "HC1-H2": ("src/components/help/HelpHome.tsx", "const cards = GUIDE_PAGES.map(", "const cards = Array.from({ length: 9 }, (_, i) => GUIDE_PAGES[i % GUIDE_PAGES.length]).map("),
    "HC1-H3": ("src/content/help/search.ts", ": e.text.toLowerCase().includes(term) ? 2 : -1;", ": false ? 2 : -1;"),
    "HC1-H4": ("src/components/help/HelpHome.tsx", 'if (e.key !== "/" || e.metaKey', 'if (true || e.metaKey'),
    "HC1-C1": ("src/components/help/HelpArticlePage.tsx", "    requestGuideStep(link.page, link.key);\n", "    void requestGuideStep;\n"),
    "HC1-C2": ("src/components/HelpCentre.tsx", 'if (!a) return <Navigate to="/help" replace />;', 'if (!a) return <div className="hc" data-hc="article" />;'),
    "HC1-C3": ("src/lib/beta.ts", '  "Something I liked",\n] as const;', '  "Something I liked",\n  "Article",\n] as const;'),
    "HC1-C4": ("src/content/help/model.ts", '  return mode !== "production";', "  return mode !== \"production\" || true;"),
    "HC1-C5": ("src/content/help/articles.ts", 'slug: "find-an-agent", area: "agents"', 'slug: "find-an-agent-unwritten", area: "agents"'),
}

tree, verb, lock = sys.argv[1], sys.argv[2], sys.argv[3]
rel = "src/components/HelpCentre.tsx" if lock == "HC1-H1" else MUT[lock][0]
path = os.path.join(tree, rel)
bak = os.path.join("/tmp/hc1-mut", rel.replace("/", "-") + ".bak")
os.makedirs("/tmp/hc1-mut", exist_ok=True)
if verb == "apply":
    s = open(path).read()
    shutil.copyfile(path, bak)
    if lock == "HC1-H1":
        old = subprocess.run(["git", "-C", tree, "show", "6a7a0715:src/components/HelpCentre.tsx"], capture_output=True, text=True, check=True).stdout
        open(path, "w").write(old)
    else:
        _, a, b = MUT[lock]
        assert s.count(a) == 1, f"{lock}: anchor not found exactly once in {rel}"
        open(path, "w").write(s.replace(a, b))
    print(f"{lock}: applied to {rel}")
elif verb == "undo":
    shutil.copyfile(bak, path)
    os.remove(bak)
    print(f"{lock}: restored {rel}")
