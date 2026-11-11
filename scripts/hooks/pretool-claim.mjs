#!/usr/bin/env node
/**
 * Claude Code PreToolUse hook (Bash | Edit | Write | MultiEdit | NotebookEdit) — one session per
 * worktree (claim-core.mjs). A change to an unclaimed worktree claims it; a change to a worktree
 * claimed by another live session is blocked (exit 2); reading always passes. Subagents share their
 * session's id and pass. FAILS OPEN: an error here allows the call and is logged to
 * ~/.cache/queryhawk/hook-errors.log.
 */
import { bashRoots, branchOf, decide, editRoot, findOwnerPid, firstTaskOf, makeStore } from "./claim-core.mjs";
import { logHookError } from "./slot-core.mjs";

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  try {
    const input = JSON.parse(raw || "{}");
    const tool = input.tool_name;
    const roots = tool === "Bash" ? bashRoots(input.tool_input?.command, input.cwd)
      : ["Edit", "Write", "MultiEdit", "NotebookEdit"].includes(tool) ? [editRoot(input.tool_input)].filter(Boolean) : [];
    if (!roots.length || !input.session_id) process.exit(0);
    const store = makeStore();
    let me = null;
    const notes = [];
    for (const root of roots) {
      me ??= { sessionId: input.session_id, ownerPid: Number(process.env.CLAIM_OWNER_PID) || findOwnerPid(), firstTask: firstTaskOf(input.transcript_path) };
      const v = decide(root, me, { store, branch: branchOf });
      if (!v.allow) { process.stderr.write(`${v.reason}\n`); process.exit(2); }
      if (v.note) notes.push(v.note);
    }
    if (notes.length) process.stdout.write(JSON.stringify({ systemMessage: notes.join(" ") }) + "\n");
    process.exit(0);
  } catch (e) {
    logHookError("pretool-claim", e);
    process.exit(0);
  }
});
