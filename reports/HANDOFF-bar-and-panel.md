# Handover — bar & panel pack, ready to run

**Written at the end of a long session, for a fresh one. Branch `claude-il`, worktree
`/Users/nickphysick/ScriptAlly-il`. HEAD `0f3410d`, tree clean** (one untracked file,
`reports/onboarding-recon.md`, belongs to another stream — leave it).

## Start here

**Run `bar-and-panel-prompt.md` Phases 1–3. Phase 0 is done — its answers are below.**
Ask Nick for the pack text if it is not to hand; both its mockups are already committed:
`design-refs/scriptally-bar-per-page.html` and `design-refs/scriptally-panel-foot.html`
(use **column 1** of the latter for the Pro treatment).

## What is on dev right now

`https://scriptally-dev.web.app` runs `0f3410d`. It has the 14px outer gap, the chrome
refinements, the top-bar rebuild — **and the breadcrumb missing on every page**, which is the
bug Phase 1 fixes. Nick is looking at that.

## Phase 0 — already answered, do not redo

- **Both red gates are clear.** The urgent count needs no stored field: `sidebarBoardTiles`
  already returns `tiles.urgent` / `.housekeeping` / `.notes` — exactly the three numbers both
  notification states need. And the scope chip's popover is already anchored in the bar and
  working (moved there in `3accbea`), so it needs no re-anchoring.
- **The bar already branches by route** — `ShellTopBar` takes `routeKey` and reads `pathname`, so
  the two states are one branch on `pathname === "/dashboard"`. No component duplication needed.
- **The four-tile grid dispatches to four things**, all of which must survive its removal:
  `invokeCapture("query")`, `("record")`, `("agent")`, and
  `onNavigate("manuscripts", "Add a manuscript")`. Baked 8 accounts for all four — three in the
  popover, `record` promoted to its own button.
- **The shared height token exists but needs a decision**: `--shell-head-h` is **56px** and drives
  the rail head + panel masthead; the bar is **58px**. Baked 4 wants one continuous line across
  rail, panel and capsule, so pick one value and move both onto it rather than leaving 56 and 58
  side by side.

## Two corrections this pack carries — and one is mine to undo

1. **Restore the general breadcrumb** on every non-dashboard page. I removed it everywhere in
   `3accbea` and deleted it from `CLAUDE.md` and `design-refs/app-shell.md`, so this is a
   **re-instatement, not an addition** — put the general rule back in the same commit.
2. **Leave the dashboard-specific crumb rule deleted.** That one (brand mark when collapsed /
   "Your dashboard" when expanded) is genuinely superseded — the brand is permanently in the bar
   now. Do not resurrect it.

## ⛔ The timeline is out of scope, entirely

An earlier pack told me to fold it into the bar and delete the floating version. **That was
withdrawn — it was never a decision.** Leave it exactly as it is: do not move it, delete it, or
give it a bar button, and do not report on it. The note that said otherwise is already removed
from `design-refs/app-shell.md`.

## Open question Nick asked for, that I could not answer

**The brand mark's computed rendered height, measured in the browser.** I could not get it: the
shell is behind auth and I must not enter credentials. The markup is `ScriptAllyLogo
heightPx={34}` → `style={{height:34}}` on the wrapper, `h-full w-auto` on the image, inside
`.sv2-tbbrand { padding: 10px 0 }` in a 58px bar. Nothing in that chain obviously constrains it
to 17px. **Ask Nick to inspect `#scriptally-brand-logo-root` in DevTools** — if it reads ~17px,
the constraint is not applying and that is a Phase 1 fix; if it reads 34px, it simply needs to go
to 38px.

## ⚠️ The deploy hazard — read before deploying

**Two sessions deploy to the same dev site from two checkouts, and the last one wins silently.**
This session's chrome work was live for about ninety seconds before a deploy from
`/Users/nickphysick/ScriptAlly-app` overwrote it, and it took a byte-comparison to notice.

**Always verify after deploying** rather than trusting the success message:

```
CSSPATH=$(curl -s https://scriptally-dev.web.app/ | grep -oE '/assets/index-[A-Za-z0-9_-]+\.css' | head -1)
curl -s "https://scriptally-dev.web.app$CSSPATH" | grep -c "<a class you just added>"
```

If it comes back 0, the other stream has clobbered it. `main` and `claude-il` were merged at
`b895570` (clean, zero conflicts), so re-merging before deploying is the safe move if `main` has
moved on again. Nick is aware; separate preview channels are the real fix.

## Lock debt left behind, flagged not fixed

- **Two skipped tests** in the To-do suite (`todayPanel.test.ts`, `todoWorkbench.test.ts`) assert
  the retired help FAB. They belong to the other stream's packs, so I skipped rather than rewrote
  them. Someone who owns those packs should retire them properly.
- `sessionStage.ts`'s `EXIT_BAR` (`.tdb-dochead`) and `DISSOLVE` (`.tdb-mainc`) still name extinct
  classes. They belong to the focused session, which is dormant until it regains an entry point.

## Standing decisions worth knowing

- **The focused session is unreachable** — "Begin focused session" was its only entry, retired in
  the To-do rebuild. Its machinery is intact and dormant, awaiting a new entry point. Same for the
  per-lane sweep (the lane play buttons went with the header bars).
- **The one-sidebar merge was tried and reverted.** `design-refs/app-shell.md` carries the reason:
  the lesson is about row weight and grouping, not the number of capsules. Do not re-propose it.
- **The agent list inverts the app-wide two-systems rule on purpose** — `CLAUDE.md` records it as a
  sanctioned exception. Do not "correct" it to match the Contact list.
