# Leftovers from the domain move: the report (18 Oct)

Branch `leftovers-queryhawk`, cut from `release/live-1` at **`a0115a4d`**. Pushed, not merged.
**Nothing was deployed, and dev was not touched.**

| Part | Commit | What |
|---|---|---|
| A | `a5243fb2` | the reply-to warning |
| B | `cdf3e0b6` | the last "ScriptAlly" |

## False premises

1. **"Re-point `toContain("not currently delivering")`."** Done, but the bigger finding is that a
   literal search for that phrase **misses the file the warning lives in**. The warning was written
   as `"…not currently " + "delivering…"`, split across two lines, so the phrase never appears in one
   piece. The first draft of R1 went red on the test file only and would have passed `emailConfig.ts`.
   R1 now joins concatenated strings before matching, and its mutation re-creates the split form.
2. **"There may be UI copy that says ScriptAlly."** There isn't. No `alt`, `aria-label`, `title`, toast
   or JSX text in `src/` says ScriptAlly. The wordmark component's `alt` already reads QueryHawk.
   - The only ScriptAlly *artwork* still drawn is `/scriptally-logo-v2.png`, used by `SidebarNav`.
     Per CLAUDE.md that component is off the live path and powers only the dev `#/shell-lab`.
   - An image can't be fixed by a text edit, so this is reported, not changed.
3. **"`functions/.env.example` sets `WAITLIST_REPLY_TO`."** Only as a commented line in the prod
   template block. That file is never loaded; it is a template for Nick to copy.
4. **The forwarding claim appeared in three more phrasings** besides "not currently delivering":
   "currently diverted" (×3), "currently bounces" and "until forwarding delivers". `emailCopy.ts`
   carried one of them. All are rewritten.

## §0 Recon

### 0.1 · The reply-to warning

**Readers:**

- `replyToWarning` is read by `email.ts:86`, where it is logged as `email.config`, and by
  `emailConfig.test.ts`.
- `REPLY_TO_ENV` is read by `emailConfig.ts` (resolve and warning), `emailConfig.test.ts`, and now
  `replyToTruth.test.ts`.

**Stale comments and text, all rewritten:**

| File | Where | Claim |
|---|---|---|
| `emailConfig.ts` | `SUPPORT_EMAIL` docblock | "currently diverted" |
| `emailConfig.ts` | `contactEmail` doc | "until forwarding delivers" |
| `emailConfig.ts` | `resolveMailConfig` comment | "currently bounces" |
| `emailConfig.ts` | `replyToWarning` docblock | Namecheap, MX record |
| `emailConfig.ts` | the warning string | "not currently delivering" |
| `email.ts` | `:84–85` | "not currently delivering" |
| `email.test.ts` | `:118–120` | "not currently delivering", MX, forwarding |
| `emailConfig.test.ts` | `:46–47` | "not currently delivering" |
| `emailConfig.test.ts` | `:58` | the assertion |
| `emailConfig.test.ts` | `:177–181` | "currently diverted", "the diverted from-address" |
| `emailCopy.ts` | `:84–86` | "currently diverted" |

Left as they are:

- `functions/.env.example:32` is already history.
- The general principle "a printed address that bounces is worse than a dead Reply-To" still holds.
- The other "bounce" hits in `src/` are UI words (debounce, the to-do "bounce").

### 0.2 · "ScriptAlly", tests excluded

| Hit | Class | Action |
|---|---|---|
| `useScriptAllyDb` (137 uses), `ScriptAllyLogo` (12, incl. the file name), image file names | IDENTIFIER | left |
| `functions/src/smartImportPrompt.ts:15` "…into ScriptAlly's structure." | MODEL-FACING | → QueryHawk |
| `functions/src/emailImportCore.ts:129` "…pasted into ScriptAlly and propose…" | MODEL-FACING | → QueryHawk |
| `public/queries-preview.html` `<title>` and the `.wm` wordmark | DEV-TOOL | → QueryHawk (its "S" monogram left) |
| `public/theme-editor.html` `<title>` | DEV-TOOL | → QueryHawk |
| `src/components/forms/forms.css:2` "ScriptAlly — Standard Form Pattern" | CURRENT-FACT COMMENT | → QueryHawk |
| `src/components/onboarding/SetupFrame.tsx:21`, `src/components/shell/workspaceShell.css:605`, and the ~140 other comment mentions | HISTORY COMMENT | left |
| USER-FACING | — | **none found** |

### 0.3 · `WAITLIST_REPLY_TO`

- `functions/.env.scriptally-dev`: **set** (as `WAITLIST_REPLY_TO`).
- `functions/.env.example`: **template line only** (`# WAITLIST_REPLY_TO`).

## Locks

| Lock | Red on base | Red under mutation | Green |
|---|---|---|---|
| **R1** no "not currently delivering" / "forwarding delivers" under `functions/src` (comments stripped, strings joined); the warning is the exact agreed sentence | `a0115a4d`: `emailConfig.ts`, `emailConfig.test.ts`, and the wording | the old split string put back → `emailConfig.ts` flagged, wording wrong | ✓ |
| **R2** no bare `ScriptAlly` in any shipping `.ts/.tsx/.html` (comments stripped); identifier set exactly `{ScriptAllyLogo, useScriptAllyDb}` | `a5243fb2`: the four files of §0.2 | "ScriptAlly" back in `smartImportPrompt.ts` | ✓ |

## Gates

`set -o pipefail`, each gate's own exit code, read as counts.

| | Baseline `a0115a4d` | After A | Final `cdf3e0b6` |
|---|---|---|---|
| tsc (root, functions) | 0, 0 | 0, 0 | 0, 0 |
| builds (dev, prod) | 0, 0; no error or warning lines | same | same |
| Vitest | 607 files · 9,045 passed · 3 skipped | 608 · 9,047 · 3 | **609 · 9,050 · 3** |

## For Nick: merging into `release/live-1`

Dry runs only; nothing was merged.

- **A fast-forward.** `release/live-1` hasn't moved since this branch was cut (still `a0115a4d`), so
  merging only moves it on by these two commits. No conflicts are possible.
- **It also merges cleanly** (checked with `git merge-tree`) with `domain-queryhawk-net` and with both
  branches dev runs on (`…-cx28-qhnet` and `…-cx28-qhnet-td52`).
- **Recommendation: merge it before go-live.** Otherwise the live waitlist function would log a
  warning that tells you replies are being lost when they aren't, and the two AI prompts would tell
  the model it works for ScriptAlly.
- **No dev deploy is needed for any of it to be correct on dev later.** The next functions deploy
  from a branch that includes it picks it up.
