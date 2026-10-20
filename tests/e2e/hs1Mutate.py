#!/usr/bin/env python3
"""Help system v1 — the src mutations behind HS1's red-first runs (A2, C3, C4, C5, C6, D1, E2; E3/E4 are unit).

  python3 tests/e2e/hs1Mutate.py <tree> apply <LOCK>    # back the file up (path-derived name), apply the break
  python3 tests/e2e/hs1Mutate.py <tree> undo <LOCK>     # put the backup back, byte for byte

Run in the MEASUREMENT worktree, never the primary checkout: an undo there is a copy from a backup, never `git checkout`.
"""
import os, shutil, sys

MUT = {
    "HS1-A2": ("src/components/shell/WorkspaceShell.tsx", 'if (helpOpen) claimTopbar("help"); else releaseTopbar("help");', 'if (false) claimTopbar("help"); else releaseTopbar("help");'),
    "HS1-C3": ("src/components/agents/AgentList.tsx", "quiet={!!panelParam", "quiet={false && !!panelParam"),
    "HS1-C4": ("src/components/shell/guide/PageChecklist.tsx", "onMouseEnter={() => setPaused(true)}", "onMouseEnter={() => {}}"),
    "HS1-C5": ("src/components/shell/guide/PageChecklist.tsx", "if (!note || note.final || leaving || paused) return undefined;", "if (!note || leaving || paused) return undefined;"),
    "HS1-C6": ("src/components/shell/guide/PageChecklist.tsx", "  const setSkip = (k: K, on: boolean) => {\n", "  const setSkip = (k: K, on: boolean) => { return; // HS1-C6 mutation\n"),
    "HS1-D1": ("src/components/shell/Term.tsx", "export const TERM_OPEN_MS = 350;", "export const TERM_OPEN_MS = 0;"),
    "HS1-E2": ("src/components/shell/FeedbackDock.tsx", "const close = useCallback(() => { onOpenChange(false); }, [onOpenChange]);", "const close = useCallback(() => { clearFeedbackDraft(); setD(feedbackDraft()); onOpenChange(false); }, [onOpenChange]);"),
    "HS1-E3": ("functions/src/betaFeedbackCore.ts", "  const record = feedbackRecord(data, auth);\n  const id = await deps.write(record);\n  let emailed = false;\n  let emailError = \"\";\n  try {\n",
               "  const record = feedbackRecord(data, auth);\n  await deps.send(FEEDBACK_TO_DEFAULT, feedbackEmail(record, \"pending\", deps.projectId), { replyTo: record.email ?? null }).then((o) => { if (!o.ok) throw new Error(o.reason); });\n  const id = await deps.write(record);\n  let emailed = false;\n  let emailError = \"\";\n  try {\n"),
    "HS1-E4": ("functions/src/betaFeedbackCore.ts", "  return {\n    kind, message, severity, wantsReply,", "  return {\n    ...(data as object),\n    kind, message, severity, wantsReply,"),
}

tree, verb, lock = sys.argv[1], sys.argv[2], sys.argv[3]
rel, old, new = MUT[lock]
path = os.path.join(tree, rel)
bak = os.path.join("/tmp/hs1-mut", rel.replace("/", "-") + ".bak")
os.makedirs("/tmp/hs1-mut", exist_ok=True)
if verb == "apply":
    s = open(path).read()
    assert s.count(old) == 1, f"{lock}: anchor not found exactly once in {rel}"
    shutil.copyfile(path, bak)
    open(path, "w").write(s.replace(old, new))
    print(f"{lock}: applied to {rel}")
elif verb == "undo":
    shutil.copyfile(bak, path)
    os.remove(bak)
    print(f"{lock}: restored {rel}")
