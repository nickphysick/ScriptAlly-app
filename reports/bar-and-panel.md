# Bar and panel — run report

**Branch `claude-il`, worktree `/Users/nickphysick/ScriptAlly-il`.** Two commits:
`1df3cc4` (the bar per page + the breadcrumb) → `6d64b75` (the desk line, two actions, the folded
upsell). Gates green on each: `tsc --noEmit` clean, production build clean, full Vitest **2087
passed / 2 skipped** at close (2079 before this run; the 2 skips are the other stream's retired-FAB
locks, untouched).

---

## ⚠️ Read this first: item 1 was already done

**The shell-gap pack had already been run — at `0f3410d`, before this session started.** I did not
re-run it. Verified rather than assumed:

| What the instruction asked | State on disk |
|---|---|
| `--shell-gap: 10px → 14px` | `--shell-cap-gap: 14px` in `index.css` (**there is no `--shell-gap`**; the token has always been `--shell-cap-gap`) |
| one token, both edges | `.sv2-app { padding: var(--shell-cap-gap); gap: var(--shell-cap-gap); }` — single owner, single value |
| the JS twin | `designTokens.ts` → `shellCapGap = 14` |
| the lock | `shellV2Tokens.test.ts` asserts `"14px"` |
| the finding, symptom-first, in `CLAUDE.md` | present: *"⚠️ THE OUTER GAP LOOKS WRONG ON ONE SIDE — and the geometry is fine"* |
| never add right-side padding | stated in that same note |
| live | `--shell-cap-gap:14px` in the deployed dev CSS |

`0f3410d`'s own commit message contains the sentence the instruction repeats — *"the page was still
measuring 10px because the change was written but never run"*. It was written **and then run**, in
that commit. **Measured now: left gutter 14px, right gutter 14px, symmetric.**

**Item 3 was also already done** in the same commit: `design-refs/app-shell.md` carries the
withdrawal (*"The TIMELINE is out of scope entirely… it was never a decision"*), and I grepped
`CLAUDE.md` and the design refs for any surviving "fold the timeline into the bar" instruction —
**there is none**. The timeline is untouched by this run and unmentioned elsewhere in it.

---

## The measurement you asked for

Browser-measured at **1440×900** and **1800×950**, against the app's own compiled stylesheet and
the real asset. The shell is auth-gated and I must not enter credentials, so I measured through a
harness that reproduces the exact DOM chain from `AppShell.tsx:249–270` over the real built CSS —
the same technique the repo's own `#/shell-lab` harnesses use, and faithful because the cascade is
the app's.

### The brand mark: **it renders at exactly 38px** (34px before this run)

**The constraint was applying all along.** At `heightPx={34}` it measured 34.0px (108.8 × 34); it
is now 38px (121.6 × 38). It was never ~17px. But two real things explain why it did not look
larger, and both are now fixed or recorded:

1. **The DOM id was a duplicate.** `ScriptAllyLogo` hardcoded `id="scriptally-brand-logo-root"`, so
   the bar, the panel *and* the mobile slim bar all carried the same id. `getElementById` returns
   whichever comes first in the document — the **panel's, at 27px**. So the handover's own
   instruction ("inspect `#scriptally-brand-logo-root`") would have measured the wrong element and
   reported roughly half the bar's size. The id is a **prop** now, set at exactly one call site
   (the bar's), asserted by a lock. `idCount` measured **1**.
2. **⚠️ The artwork is only 68.4% ink.** `/scriptally-title-v2.png` is 2400×750 and the letterforms
   span y 157→669 — **513px of 750**, with ~16% dead margin above and ~11% below, baked into the
   PNG. So a 38px element shows **~26px of letterform**. This is the real answer to "it does not
   look larger": the box grew, the letters grew with it, and a third of the box is transparent
   padding. **Raising the number again will not fix this — cropping the asset is the only thing
   that would.** Recorded in `CLAUDE.md` so the next person does not chase the CSS.

### Gutters and the shared line

| | measured |
|---|---|
| ground gutter, left | **14px** |
| ground gutter, right | **14px** |
| `.sv2-app` padding / gap | 14px / 14px / 14px |
| top bar height | 58px |
| rail head | 58px |
| panel masthead | 58px |

The three heads are **one continuous line** now: `--shell-head-h` moved 56 → 58 and the bar
**reads the token** instead of restating `58px` beside it. That mismatch was how the two drifted
apart, so a lock now forbids any literal twin.

---

## Phase 1 — the bar per page (`1df3cc4`)

Two states, one component, and **exactly two things differ** — wordmark versus crumb, and where
search sits — so the bar never reads as a different component page to page.

| | Dashboard | Every working page |
|---|---|---|
| left | wordmark, 38px | **the breadcrumb** |
| search | absolutely centred, up to 440px | right, 264px, in the tools cluster |
| constant | scope · divider · help | scope · divider · help |

**The breadcrumb is a reinstatement, not an addition.** The model was never deleted — the pure
`shellCrumbForPath` was still there and still lock-tested, with nothing rendering it, and
`.sv2-crumb`'s CSS was still in the file marked dead. With the wordmark gone from working pages the
slot simply stood empty. Restored in `CLAUDE.md` **and** `design-refs/app-shell.md` in the same
commit, as instructed.

**The dashboard crumb rule stays deleted** — the dashboard reads the wordmark in that slot in every
panel state, so the rule has nothing to come back to. `.sv2-crumbmark` deleted with it.

### ⚠️ One thing the mockup could not show: true centring needs a reserve

The ref draws this bar beside a 64px rail with **no panel**, where a 440px centred field clears the
flanks easily. In the app the panel is 288px, so **at 1440 with it expanded the bar is only ~1026px
and the scope chip sat on top of the field's left edge by ~38px.** `z-index` decided which drew on
top, but the field was still occluded — **stacking is not clearance.**

Fixed at the cause: the field reserves **twice** the left flank's bounded maximum
(`--sv2-flank: 365px` on `.sv2-tb-dash`, with the scope capped at 200px there) and shrinks below
440 when it must. Measured: **440px at 1800, ~294px at 1440-with-panel, centre offset 0.00 in both,
overlap `none` in both.** Keep the token and the scope cap in step and re-measure both panel states
if either moves.

---

## Phases 2 and 3 — the panel foot (`6d64b75`)

One commit: they are one surface and the edits interleave. Ref column **1** of four, as instructed.

**The notification desk line** replaces the two Urgent/House pills, which stated two numbers side
by side and left you to work out which mattered. Pure `deskNotice(tiles)` — **no stored field**,
both figures were already in `sidebarBoardTiles` (Phase 0's red gate, confirmed).

The quiet state is a **different treatment**, not the loud one greyed out: hot is a blush fill with
a burgundy roundel; calm has no fill and no frame at all, just a hairline above it. A calm desk
should not look like an alert that happens to say zero. Singulars agree with their verbs, and an
**empty desk states no housekeeping line at all** rather than "0 housekeeping items".

**Quick actions: two controls, and all four old contracts survive** — three creates in `New`'s
popover (opening upward, since it sits at the panel's foot) and **`Record a response` promoted to
its own button**, because it is what you reach for holding a reply, not while thinking about making
something.

**The upsell is folded into the plan line.** The standalone row and its slate `PRO` pill are gone;
the account row reads `Free plan · Upgrade` with Upgrade as a plain slate link. Pro users read
`Pro plan` and get **no link**. The line also stopped being 8px mono uppercase — `FREE PLAN ·
UPGRADE` reads as a system tag, and the point of the treatment is that it is a sentence about your
account.

---

## Deviations and flags, all deliberate

1. **No Settings row in the panel foot, and no user chip in the bar.** Both mockups draw them.
   **Settings is already a rail rib and the account is already the rail's foot chip** — either
   would be a *second* mount of a control that exists. The refs drew them as context around the
   subjects they were comparing.
2. **The mockup's ⌘L / ⌘N hints are not rendered.** No shortcut registry exists in this codebase,
   so a hint would advertise a key that does nothing. Unchanged standing flag from the one-sidebar
   pack.
3. **`Escape` on the New popover is not captured.** It closes the popover but does not
   `stopImmediatePropagation` — this is permanent chrome sitting beside pages that own their own
   Escape (an open agent card's draft discard), and swallowing it at shell level would reach past
   this popover's business.
4. **Phase boundaries are mine, not the pack's.** `bar-and-panel-prompt.md` is not in the repo or
   anywhere under `~`; I worked from the two committed mockups (which are the design authority),
   the Phase 0 answers recorded in `HANDOFF-bar-and-panel.md`, and your brief. If the pack's own
   phase split differs, the *content* here should still match — every Phase 0 answer it banked is
   accounted for: the urgent count needed no stored field, the scope chip needed no re-anchoring,
   the bar already branched by route, and the 56-vs-58 height decision is taken.
5. **`SHELL_PRO_COPY` is now unread by the panel.** Kept as the baked wording; noted at the
   constant.
6. **`CLAUDE.md` never carried the capsule shell's crumb rule** — contrary to the handover's note,
   `3accbea` did not touch that file. Its "Workspace breadcrumb model" section describes the
   *retired* ChromeSlab/TopCrumbStrip era, whose components are deleted from live code. I added a
   new capsule-bar section carrying the reinstated rule and marked the legacy section superseded
   rather than editing history that was never written.
7. **The handover mis-named one skipped test.** Both skips are in `todoWorkbench.test.ts`;
   `todayPanel.test.ts` was already reconciled and now asserts the FAB's *absence*, passing.

## Not done, on purpose

The timeline, in any respect. Nothing in `3accbea` was reverted.
