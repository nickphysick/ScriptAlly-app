# Dashboard dead code — an inventory, nothing removed

*Swept 10 September 2026 against `main` at `5e2f0ae2`. Dashboard scope only: `src/components/dashboard/`
and the stylesheets in it. **Nothing in this file has been deleted.** A pack whose gates are about
the sidebar scrim is the wrong place to remove 2,338 lines; this exists so the removal can be its own
pack, with its own gates, against a list somebody has already read.*

## How the sweep was run, and where it lied first

Two passes, because the first one was wrong in the direction that reads as safe.

1. **Every class a dashboard stylesheet selects on**, comments stripped from the CSS — a lock reading
   its own prose is this repo's most-repeated false red, and a sweep reading a *component's* prose is
   the same fault from the other side: it reports a retired class as live because a comment explains
   why it went.
2. **Every class the app can emit**, comments stripped from the TSX/TS. This pass used a bare token
   match and produced two false "still live" readings — `.ds-row` found inside `tds-row`, `.sa-dash`
   inside `sa-dashroot`. Re-checked as a **bounded** class token (`["'\`\s]cls["'\`\s]`), which is the
   form this repo already settled on for class locks after `not.toContain("tdk-rec")` matched
   `tdk-recnote`.
3. **Interpolated names are invisible to any literal scan**, so every hit was read rather than
   believed. Three were live and the sweep had flagged them as needing a look: `.sa-hpanel-start` and
   `-end` come from `PanelAlign = "center" | "start" | "end"`, the four `.tier-*` from
   `` `dt-card tier-${tier}` ``, and `.dk-tip--rail` from `variant?: "rail"`. **None is dead.**
4. **Reachability is a fixed point, and tests are not callers.** Three rounds. A suite over an
   unrendered component is the "thirty-eight green tests, none of them reachable" shape this repo has
   paid for once already.
5. **What ships was checked against `dist/`, not reasoned.** A stylesheet imported only by an
   unreachable component never runs its `import "./x.css"`, so it never enters the graph — but that is
   an argument, and the bundle is a fact.

---

## 1 · Eleven components with no caller outside their own tests

2,338 lines. Nine were already unreachable; two are cascade — they are imported, but only by
something in this list.

| Component | Lines | Every mention in `src/` outside itself |
|---|---:|---|
| `StatCards.tsx` | 623 | two comments only — `DashboardStatsRow.tsx:219` *"lifted from the retired StatCards line chart"*, `lib/iconAutoFit.ts:13* *"StatCards keeps its own inline copy"* |
| `DeskStats.tsx` | 453 | nothing |
| `WhatsLivePanel.tsx` | 363 | **nothing at all** — no import, no comment, no test |
| `OneScreenGoals.tsx` | 206 | `queryingGoalsCard.test.tsx` only |
| `DeskBelow.tsx` | 169 | nothing |
| `GoalTargetSheet.tsx` | 136 | *cascade* — `OneScreenGoals.tsx:20`, itself unreachable |
| `TimelineDrawer.tsx` | 124 | `focusSlot.test.ts` and `dashboardMobile.test.ts` import its storage key |
| `DeskTodoCard.tsx` | 96 | two comments, one of which says so: `Dashboard.tsx:1483` *"The DeskTodoCard host is gone with the settled desk — the one-screen tasks card derives …"* |
| `DashboardHero.tsx` | 71 | nothing |
| `DeskCard.tsx` | 54 | *cascade* — `DeskStats.tsx:18` and `DeskBelow.tsx`, both unreachable |
| `OneScreenPro.tsx` | 43 | `oneScreenPro.test.tsx` only |

⚠️ **`DeskTodoCard` is the one to look at before removing anything**, because the repo already knows.
A first-pass grep reports `Dashboard.tsx` as an importer; strip the comments and the reference goes
with them. The file states its own obituary and the code stayed.

## 2 · Five stylesheets with no path to the bundle — 33,077 bytes

Their only importers are the components above.

| Sheet | Bytes | Sole importer(s) |
|---|---:|---|
| `queryingGoals.css` | 16,123 | `OneScreenGoals`, `GoalTargetSheet` |
| `deskStats.css` | 6,429 | `DeskStats` |
| `deskBelow.css` | 4,121 | `DeskBelow` |
| `deskTodo.css` | 3,299 | `DeskTodoCard` |
| `whatsLive.css` | 3,105 | `WhatsLivePanel` |

**Verified against the built CSS rather than argued.** `db-tlev`, `ds-row`, `wl-card`, `os-goal-dot`
and `os-goal-ill` each appear **zero** times in `dist/assets/*.css`. So this is 33 KB of repo weight,
not 33 KB of payload — which is worth knowing before anyone reaches for it as a bundle-size win.

⚠️ **`oneScreen.css:2030` describes a state that has not been true for some time:** *"The card's own
rules now live in `queryingGoals.css`, beside the component that renders them."* Neither half holds —
the sheet does not ship and the component does not render. The `.os-goal*` rules that DO ship are the
ones left behind in `oneScreen.css`, and they style nothing.

## 3 · Forty-nine selectors that have no renderer

Nine of them are named in a lock that asserts they are **gone** — `oneScreenTasks.test.tsx` sweeps
`os-trow`, `os-knd`, `os-tt`, `os-tn`, `os-tm2`, `os-endcell`, `os-stp`, `os-act`, `os-dots`,
`os-trio`, `os-p`, `os-pdot`, `os-none`; `oneScreenRail.test.tsx` sweeps `os-cardlet`, `os-tlev`,
`os-st` and others; `dashboardMobile.test.ts` forbids `sa-mdeskline` and `sa-mtodo`. Every one of those
locks is right, and the rule it forbids is still in the sheet. **The lock outlived its rule, which is
the reverse of the usual failure and just as silent.**

The rest are the retired v37 chrome, inside `dashboardV37.css`:

`sa-dtop` · `sa-dtop-date` · `sa-dtop-icon` · `sa-dtop-left` · `sa-dtop-right` · `sa-dtop-search` ·
`sa-dtop-searchwrap` · `sa-dtop-user` · `sa-stats` · `sa-scard` · `sa-segbar` · `sa-bandm` ·
`sa-bandr` · `sa-bands` · `sa-dash` · `sa-dash-panels` · `sa-mdesk-count` · `sa-mdesk-dot` ·
`sa-mdesk-go` · `sa-mdesk-sub` · `sa-mdesk-tx` · `sa-mdeskline` · `sa-mtodo` · `sa-mtodo-count` ·
`sa-mtodo-row`

⚠️ **These DO ship**, unlike everything in §2 — `dashboardV37.css` is imported by the live
`Dashboard.tsx`. `sa-dtop` reaches the built CSS **15 times** and `sa-stats` **4**, styling a floating
pill top bar the capsule bar replaced. Roughly 2 KB unminified across 17 flat rules, and **that is a
floor**: the counter reads flat rules only, not media blocks, so the true figure is higher.

Also with no renderer, in `oneScreen.css` and elsewhere: `os-chip` · `os-datechip` · `os-grow2` ·
`os-knot` · `os-lbl` · `os-pill-o` · `os-pin` · `os-spacer` · `pinframe` · `pintext` · `srow` ·
`db-below` · `db-pipe` · `ds-row` · `os-goal-dot` · `os-goal-ill`.

## 4 · A live derivation with nowhere to go

`OneScreenDashboard.tsx:97` computes `goalProgress` in a `useMemo` on every render of the dashboard.
**Nothing reads it.** It is the only occurrence of the identifier anywhere in `src/`.

It is not the arithmetic that is worth keeping — it is the six lines above it. The rail they describe
is `OneScreenGoals`, itself one of the eleven in §1, so this comment may be the only surviving record
of a decision somebody made on purpose. Verbatim, from the file:

```
  /**
   * ⚠️ DERIVED HERE, FROM THE UNSCOPED SET, AND HANDED DOWN AS A RESULT.
   *
   * A querying target is the WRITER's, not a book's — "ten queries this month" means ten, however
   * many manuscripts they went out for. Every other list the rail receives is scoped to the
   * manuscript chip, so this is the one derivation that must skip `scopeQueries`, and the rail is
   * deliberately given the finished object rather than the raw list: a second unscoped array
   * beside four scoped ones is an invitation to scope it by mistake, and the resulting bug — a
   * goal count that drops when you switch books — is not one anybody would think to look for.
   */
```

**The reasoning is sound and the prop it reasons about is passed to nothing.** Whoever removes the
`useMemo` should decide first whether the paragraph moves to `deriveGoalProgress` — where it would be
a note at the function every future caller reads — or goes with it. Deleting both is a decision, and
it should be one somebody takes rather than one a cleanup makes.

---

## What is NOT in this list, deliberately

* **`deskTooltip.css` and `DeskTooltip.tsx` are live** — `WorkspaceShell.tsx` mounts the tooltip. It
  is imported by `DeskCard` too, which is dead, and that is not evidence against it.
* **`diaryCarousel.css` ships and its renderer is reachable** — `DiaryCarousel` ← `DiaryLab` ←
  `App.tsx:495`, a DEV-only route. Reachable, small, and a different question from this one.
* **`dashboardV37.css` itself is live.** Only the selectors listed in §3 are dead. Deleting the file
  would take `StatHoverPanel` and `RowTip` with it.
