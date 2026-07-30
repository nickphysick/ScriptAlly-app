# To-do — the save state machine + the Today panel

Two fixes: the write path stops failing invisibly, and the Today corner is rebuilt to the researched
overlay pattern. Ref: `todo-fix63.html` → `design-refs/today-panel.html` (frame 1 expanded · frame 2
the collapsed launcher; its side notes are spec rationale, not content).

## Commits

| Phase | SHA | Suite |
|---|---|---|
| the ref (fenced) | `faa6316` | — |
| P1 — the save state machine | `c2d7f9e` | 1976 |
| P2 — the Today panel, expanded | `8a1dbf4` | 2062 |
| P3 — collapse, the launcher, neighbours | `6ae1323` | 2068 |
| P4 — the sweep + this report | `<this commit>` | 2068 |

Gates green per commit (`tsc` + production build + full Vitest, pipefail); explicit-path staging.
Suites: `todoSaveMachine.test.ts` (P1) · `todayPanel.test.ts` (P2/P3).

Landed alongside, from live use of the notes feature: `a6ee4d1` (you can add another note; you can
delete one), `fd1311f` (one store owns "Notes to self"), `0124715` (the composer fits its card;
deleting asks first), `8bc3f64` (the rules bug below), `38a8a8b` (the read-only notes-store scan).

## Phase 0 — findings

The save was fire-and-forget, and the diagnosis was the opposite of what the symptom suggested:
`handleFirestoreError` **re-throws** ("callers depend on this for control flow"), so `addUserTask`'s
`return undefined` after it was **dead code** — it threw. `saveComposer` awaited it, the throw skipped
`closeComposer`, and the failure surfaced only as an unhandled rejection with **no error UI**, while
the `onSnapshot` listener flashed the optimistic doc and rolled it back. Silent failure *and* flicker,
from one unhandled throw.

The flicker's proximate cause was the undeployed rules, as briefed — but the invisible failure is a
bug regardless of what denied the write, and P1 fixes that.

## ⚠️ What the rules turned out to be — a longstanding bug, not a deploy problem

Chasing the still-denied writes produced the session's most useful find. `isValidUserTask` validated
its optional `completedAt` with `data.completedAt == null`; **Firestore rules do not return null for
an absent map key** — the expression fails — so **every user-task CREATE had been denied since these
rules were written** (the composer never writes `completedAt` on create). Every other optional field
already used the safe `!data.keys().hasAny([...])` guard; `completedAt` was the lone exception.

Diagnosed with the **Rules `:test` API** (simulating the exact write against the live ruleset, then
isolating each condition) rather than by redeploying and hoping. Fixed in `8bc3f64`.

**This is what P1 bought.** Under the old fire-and-forget path the denial was swallowed; the state
machine named it "permission", which is what pointed at the ruleset. The visible-failure design paid
for itself on its first real bug.

**Also corrected:** `CLAUDE.md`'s dual-database note is **inverted**. It says the dev app reads
`(default)` and that dev rules must go via `firebase.dev.json`; the dev app actually reads the
**`ai-studio-…`** database (the plain `firebase.json` target). Rules are now deployed to **both** dev
databases. Worth fixing in the repo — it cost real time.

## Writes still blocked until the rules are deployed

Dev is fully deployed (both databases) and everything below works there. **In prod, nothing has been
deployed** — that is the sequencing pass, and it is yours:

```
firebase deploy --only firestore:rules            # prod (firebase.json → the ai-studio DB)
```

Until that runs, **in prod**: every task/note **create is denied** (the `completedAt` bug), and any
write carrying `detail` or `surfaceOffset` is denied by the older allowlist. The save machine will now
say so plainly instead of failing silently — which is the point.

## What shipped

- **P1 — the save state machine.** idle → pending → (saved | failed). Pending disables the button
  (spinner only past ~300ms), locks the fields while keeping their content, suppresses Esc, and hides
  the in-flight id from the board so the optimistic insert **cannot flicker** (inserted once, on
  resolve). Saved closes only after the write resolves. Failed keeps the composer open, editable, with
  an inline error and a working **Try again**. Copy comes from the error **code** — `permission` vs
  `network` vs `unknown`, via the pure `src/lib/todoWrite.ts` — never a raw Firebase message, never a
  native dialog. The same no-silent-no-op rule covers **ticking** and **deleting**.
- **P2 — the panel, expanded.** The overlay elevation pair with the **no-opacity law**; the 46px sage
  header carrying derived progress (52px bar + `{done}/{total}`) and acting as the collapse control;
  single-line truncating rows with a sage circle and sub-labels only where meaningful;
  **tick-strikes-in-place** with the move deferred to the next open; the collapsed done band; **one**
  ink primary plus the ＋ roundel that now hosts "Help me pick"; a third-of-viewport cap with the rows
  taking the overflow.
- **P3 — collapse, launcher, neighbours.** One node in both states so collapse animates **height
  only** (180ms, chevron **rotates**); the collapsed header **is** the launcher (count in a sage pill),
  never vanishing while items exist and absent entirely when the list is empty; state persists per
  user across reloads and the session leave/return; and the **adjacency rule** — the help FAB steps
  clear via `--sa-fab-shift`, proven from the tokens by arithmetic.
- **P4 — the sweep.** Twelve orphaned rules removed (`.tdb-tdpill`, `.tdb-tdmin`, `.tdb-tddot`,
  `.tdb-tdot`/`.tdb-ttick` and their hover pair, `.tdb-trow .tdb-tx`/`.tdb-tm`). `themes.md` gains
  "The Today panel (settled)" and "Save state machine". The tour needed no retarget — its Today stop
  targets `.tdb-today2`, which survives, and it never named the old footer buttons.

## In-browser script (dev)

1. **Save a note** — it lands once, settled, no flicker.
2. **Force a failure** (offline, then save) — the composer keeps every character, becomes editable
   again, and offers **Try again**; the copy says *offline*, not *permission*.
3. **Tick a Today row** — it strikes **where it sits**; it only moves into the done band when you
   collapse and reopen. Undo from the toast.
4. **Collapse Today** by clicking anywhere on its header — the body animates down, the chevron
   rotates, and the header becomes the launcher with the count. **Reload** — it stayed collapsed.
5. **Watch the help "?"** — it sits clear of the corner in both states, and never beside or under it.
6. **Empty the list** — the corner disappears entirely, launcher included.
7. **Open a session** — the corner leaves with the board and returns in the same state.

## Deviations (flagged)

- **The launcher is the header, not a separate pill.** The ref draws a distinct `.launch` pill; I kept
  **one node** in both states because that is what makes "animates height only, so the corner never
  jumps" actually true. Collapsed, the header hugs its content at radius 99px, so it reads as the ref's
  pill — but it is the same element, not a swap.
- **Height animates via `max-height`** against a cap (`--td-body-cap`), not a JS-measured height. The
  repo's `Reveal` pattern exists for in-stage accordions; this panel is `position:fixed`, and a capped
  `max-height` gives the same 180ms height-only motion without the measurement machinery.
- **Two of my own classes collided** and were renamed rather than weakening real locks: `.tdb-prog`
  tripped the legitimate `tdb-pro` extinction ban → `.tdb-tprog`; `.tdb-pbar` already owned the LAWS
  track → `.tdb-tpbar`.
- **A 6px overlap I introduced and then caught** by doing the adjacency arithmetic instead of trusting
  the ref's pixel values: conflating the launcher's width cap with the FAB's clearance left the
  collapsed states overlapping. They are separate tokens now, asserted strictly.
- jsdom mounts nothing (the page is auth-gated): geometry, grammar, wiring and the arithmetic are
  source/rule-text locks; the pixels are the in-browser script.

## Close

The queue: **the prod sequencing pass** (yours — it must include `firestore:rules`, or task creation
stays denied in prod) → **Correction UI** → the **notes-store convergence** pack (size it with
`#/notes-scan`, then delete that route).
