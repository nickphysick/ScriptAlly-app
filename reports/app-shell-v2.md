# App shell v2 — Phase 1 · build report

**9 August 2026.** One commit. Ref: `design-refs/app-shell-v2.html`. Suite **3293 passing**
across 213 files; tsc and `npm run build` green.

The dark icon rail and the greige breadcrumb bar are gone. Sidebar and page share one ground; the
only white surface is the content window, whose **frame stays put while its body scrolls**.

**Screenshot at 1440×900** was captured and reviewed in the browser during this build — it is what
caught the two faults listed below. It is not committed as a file: the browser tooling here renders
to the session rather than to disk, so a committed image would have to be re-taken by hand. The two
faults it found are recorded in full instead.

## ⚠️ Scope discovery: the rail *was* the collapsed sidebar

Removing the rail is not a repaint. The rail was the sidebar's collapsed form and owned the only
**expand** control, so keeping `collapsed` without it leaves a state with no UI — collapse, and
there is no navigation at all. The ref carries no collapse affordance of any kind, so the sidebar
is one width, always open.

Retired with it: `collapsed`/`setShut`, the flyout machinery, the `[` shortcut, the persisted
`scriptally.shell.collapsed` key, and six pure functions (`railClick`, `railBadge`, `peeksOnHover`,
`collapseKeyAllowed`, `readCollapsed`, `writeCollapsed`) with their five suites. **The accordion
survives** — `sectionClick`/`sectionRowState` still drive which section is open. Recoverable at
`02356ba`.

## The 55, sorted — 30 DIED, 25 RETARGETED

⚠️ **55, not 54.** A fifty-fifth surfaced only after the WORKSPACE heading came out:
`workspaceTasksNav` asserted the group labels as `["Workspace","Tasks",…]`, using that heading as a
positional landmark. The ORDER rule survives untouched — Tasks simply leads now — so it is
retargeted to the full sequence rather than loosened.

Default was RETARGET; deletion required the affirmative case.

### DIED (30) — the rule ceased to exist with the rail, bar or collapse model

| # | rule |
|---|---|
| 6 | nothing in the rail varies with `collapsed` except » |
| 7 | the » control is the collapsed-only branch |
| 8 | no rule changes the rail between states |
| 9 | the rail is its own element at the rail width |
| 10 | the rail shadow is the panel's ::before |
| 11 | the rail cell takes a translucent white square |
| 15–17 | rail tooltips: compose Section · Child; intent delay; suppressed behind a flyout |
| 18 | no manuscript icon on the rail |
| 23 | the bar reads the head token |
| 26 | the bar renders INSIDE the card *(replaced by its inverse — see RETARGETED)* |
| 27 | the rail icon rests at full strength |
| 28 | the collapse control is a nav-foot row |
| 30 | the collapse row is muted, 34px, 14px chevron |
| 31 | » sits on the rail above Settings |
| 32 | both controls write the one persistence key |
| 33–37 | hover peeks; flyout navigation; flyout anchoring; Settings expands when collapsed; `[` binding |
| 45–48 | the frosted greige bar: token, blur/shadow, @supports fallback, controls on the tint |
| 50 | always frosted — no scroll state |
| 51 | falls back to SOLID OAT via @supports |
| 53 | the plan runner collapses and performs nothing else |
| 54 | the S tile is exempt — navigates, never toggles |

### RETARGETED (24) — the rule survives, pointed at the new element

| # | rule | now |
|---|---|---|
| 1 | no page paints its own ground | `--ws-ground` on `.ws-app`/`.ws-main` |
| 2 | mobile clearance rides the scroller | `sv2-stagepad` on `.ws-wbody` |
| 3 | the brand appears once | sidebar mark + wordmark; crumb carries none |
| 4 | one brand per surface | `ws-bmark` / `ws-bwm`, both ×1 |
| 5 | **the stage's identity travelled intact** | id on `.ws-wbody` |
| 12 | **no nav fill is burgundy** | `.ws-ni.on` white + ink |
| 13 | the To-do badge is a burgundy dot with a count | panel row |
| 14 | only To-do carries a badge | one `sp-ct` |
| 19 | exactly one avatar, in the right place | **inverted** — now in the panel foot |
| 20 | only the current page is ink | `.ws-cur` / `.ws-seg` on the pagebar |
| 21 | `/` throughout, never `·` | pagebar |
| 22 | the brand's single home | **inverted** — sidebar, not crumb |
| 24 | nav rows take a visible focus ring | `.ws-ni:focus-visible` |
| 25 | white surface, radius token, hairline, soft raise | `.ws-window` |
| 29 | the masthead's box-sizing is declared, not inherited | `.ws-phead`, height now content-derived |
| 38 | the brand mark routes home | `.ws-brand` → `/dashboard` |
| 39 | the shell renders on the dashboard route | smoke |
| 40 | the save whisper is mono caps | `.ws-sync` |
| 41 | the divider is 1px × 18px | `.ws-vdiv` |
| 42 | + New is INK, never pink | `.ws-nbtn` |
| 43 | exactly ONE scroll container | `.ws-wbody` |
| 44 | shell chrome font | unchanged |
| 49 | the work area does not scroll | `.ws-work` |
| 52 | no ink header inversion | `.ws-pagebar` |
| 55 | the group-label ORDER | Tasks · Queries · Agents · Materials |

**Nothing was weakened to go green.** Two assertions were *inverted* (19, 22) because the rule
survived and the correct answer flipped — the avatar and the brand both moved into the sidebar
when the rail that carried them left.

## The four scroll consumers, by behaviour

The id is a constant, so **none of them needed an edit** — including `ToDoPage.tsx`, which was left
untouched (Part 4: it was clean, and stays trivially mergeable).

1. **`stageScroll.ts`** — `lockStageScroll()` took the scroller `overflow: auto → hidden` and its
   release returned it to `auto`. Addressed by id, resolving to `.ws-wbody`. ✅
2. **Route memory** — scrolled to 250, zeroed, restored via the same `el.scrollTop = memo` path
   AppShell uses: back to 250. ✅
3. **The To-do board** — same, plus the risk case: a **stale 99999** saved against the old taller
   scroller **clamped to 5639** (its max) without throwing or jumping to nothing. ✅
4. **`MobileSheet`** — calls the same `lockStageScroll` (`MobileSheet.tsx:36`), so it is covered by
   (1). ✅

## Measured

| | scroller test | notes |
|---|---|---|
| 1280×800 | `scrollHeight === clientHeight` (710) ✅ | feed scrolls internally |
| 1440×900 | ✅ (810) | crumb reads `/ Dashboard` |
| 1920×1080 | ✅ | window inset **22 / 22**, foot clear **20** |

Also: `.ws-app`, `.ws-window` and the document all report **no scroll**; the breadcrumb is above
the window and **not inside it**; one ground confirmed (`.ws-app` and `.ws-main` background equal);
the window is `rgb(255,255,255)`.

Three routes: `/dashboard` → `/ Dashboard`; `/queries` → `Queries / Query Centre` with Query Centre
the active white tile; `/todo` renders the same chrome.

## ⚠️ Two faults the screenshot caught and the measurements did not

Both passed every geometry check while being visibly wrong — which is why the screenshot is in the
pack:

1. **`+ New` rendered as a tall black circle.** `.ws-newwrap` was swept out with the bar's rules
   (it is the menu's anchor) and `.ws-nbtn` had no `display:flex`, so the icon and label stacked.
2. **"WORKSPACE" still sat above Dashboard.** A section heading over a group of one labels nothing.

## `--head`

**The token survives, but this shell no longer reads it.** Its two remaining consumers are other
shells: `.sv2-topbar` (`ShellV2.tsx`) and `.tn-mast` (`TopNavShell.tsx`). `.ws-bar`'s use went with
the bar; `.ws-phead`'s `calc(var(--head) + …)` existed solely to close the masthead on the bar's
line, and is now content-derived with the ⚠️ rewritten in place.

## Reconciliations, recorded not asked

- The ref's `.wbody` has `padding:24px 26px`; **ours has none** — every page brings its own (the
  dashboard's `.os-content` is `16px 26px 24px`), so padding here would inset every page twice.
- `--ws-edge` (#e9e2d7) is deliberately lighter than `--shell-edge` (#e6e0d5): a divider matching a
  card's border competes with every card near it.

## For your eye

- **Cappuccino only**, again — the ground, window and nav tiles are unexamined in Bold and
  Editorial.
- The harness renders with **no signed-in user**, so the manuscript selector shows its empty card
  and the foot shows no name. Both are data, not layout.
- Phases 2 (tasks pink band) and 3 (activity card) are unchanged and follow.
