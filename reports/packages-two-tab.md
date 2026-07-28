# Package Workshop — two-tab restructure + new-look reskin

Design authority: `design-refs/scriptally-packages-twotab.html` (committed unchanged, with an inert
HTML comment header recording its provenance).

**Commits:** `51cd729` ref → `8cada42` P2 shell+tabs → `fb8cd15` P3 workshop tab → `9c8a769` P4 flip
cards → `c70a832` P5 analytics (all) → `b363ed6` P6 in-focus + recommendations → `f94cf30` P7
community flag. Gates green per commit (tsc clean on my paths, `vite build` ✓, full Vitest).
Suite **1690 → 1717** (+27). Nothing deployed.

---

## Step 0 answers, in full

**1. Where the new look came from.** The app-shell v2 rollout (`reports/app-shell-rollout.md` →
`shell-followup.md` → the capsule/rail arc) and the agent list rebuild v2 (`bad55d3`→`ad1a03a`).

The mock's variable names do not exist in `src/`: `--ground` / `--plane-s` are the *mockups'* names.
The app renames every one to a `--shell-*` role token in `src/index.css:56-91`
(`--shell-ground: #e7e0d5`, `--shell-canvas: #fdfbf8`, `--shell-card`, `--shell-inset`,
`--shell-line`, `--shell-ink` …), with a deliberate JS twin in `src/lib/designTokens.ts:127-151`
that `shellV2Tokens.test.ts` locks against it (plus a relative-luminance depth law: card > canvas >
panel > sidebar).

`PageHeader` (`src/components/shell/PageHeader.tsx`) **is** shared and universal — 11 pages, Playfair
40/500 title, Playfair sub, ≤2 actions with at most one primary, its own closing rule. It has **no
tabs slot and no meta slot**, and `shell-followup.md` records that as law.

There is **no shared card component**. The agent list rolled `--agl-*` under `.aglist`; Discover then
*deliberately mirrored* it as `--dv-*` under `.dv2`, and `discover.css:1-20` documents why (reusing
the classes would mean mounting Discover inside `.aglist` — a shell-wiring change they declined).

**2. Themes.** Alive but functionally bypassed. `.t-capp`/`.t-bold`/`.t-edn` still mount on the
AppShell root from `queriesTheme`, and the AccountSettings radio still switches them — but
`agentList.css` (766 lines) and `shellV2.css` consume **zero** theme tokens, so the agent list,
Discover and the whole v2 shell render pixel-identical in all three. Themes now only reach legacy
surfaces (Queries' inner panes, dashboard, manuscripts). **Your call: single-look.**

**3. Active package — already exists, no new stored state.** `Manuscript.activePackageId`
(`types.ts:149`), with `resolveActivePackage()` in packageMetrics, `setActivePackage()` in
`db.tsx:1140`, and — crucially — already present in the firestore.rules manuscript update allowlist
(line 482), so writes do not hit the silent-denial trap. Its documented semantic matches the ref's
exactly: "the user-chosen default submission package for this manuscript — exactly one, never
auto-promoted", pre-filling `packageId` on a new query. `SubmissionPackage.status: "Active"|"Retired"`
is a *different* concept (archived-or-not) and is not conflated anywhere in this work.

**4. What existed vs what Analytics needed.** The workshop was one 910-line `PackageWorkshop.tsx`
(palette + bench + grid + analytics pane); `PackageStats.tsx` was deleted in Phase D, its engine
functions surviving. `packageMetrics` already had per-package `RateStat`, resolved-aware
`packageFunnel`, `packageStages`, `rankPackagesByRequests`/`strongestPackage` with
`MIN_SENDS_FOR_CLAIM`, `componentMetrics`, `packagesUsingVersion`, `resolveActivePackage`. Missing
and added: median reply time (only a MEAN existed), per-agent send status, per-material usage lines,
and the funnel's Offers stage.

**5. Tree state / collisions.** Clean at start. Another stream was actively editing
`DiscoverNewAgents.tsx`, `agents/discover.css`, `index.css` (the `--slate-*` Pro trio) and
`shell/PageHeader.tsx` throughout. **I read PageHeader but edited none of those four**, and touched
neither `--agl-*` nor `--dv-*`.

**6. `#/pkg-lab`** exists at `App.tsx:465`, gated `import.meta.env.DEV` — absent from production.

---

## Derivations added, and where each number comes from

All read-time, no stored counters.

**`packageMetrics.ts`** (+11 tests)

| Selector | What it derives |
|---|---|
| `materialUsage` | packages / sends / replies / requests / replyRate for one material, across every package it appears in |
| `materialUsageLine` | the sidebar chip's exact wording ("IN 2 PACKAGES · 3 REQUESTS" / "UNUSED") + the sage `hot` flag, so the phrasing lives in one place |
| `medianReplyDays`, `medianReplyDaysAll` | a **true median** of send→first-move spans. The pre-existing `avgReplyDays` is a MEAN and stays for its callers; a test proves one outlier drags the mean and not the median |
| `daysToWeeks` | "3.1 wks" |
| `funnelStages` | sent / replied / requests / **offers** / replyRate over any set of queries |
| `rankPackagesByReplies` | the leaderboard's order — by REPLY rate, not request rate |

**`packageAnalytics.ts`** (new, +10 tests) — composes the engine with the agent record:
`weeksSinceSent`, `overdueSends`, `sentToRows` (REPLIED / WAITING · n WKS / FULL REQUEST ★ + the
overdue flag), `rankMaterialsByReplies`, `recommendations`.

**`communityStats.ts`** (new, +9 tests) — `COMMUNITY_STATS_ENABLED`, `COHORT_FLOOR`,
`CommunityStatsSource`, `placeholderCommunitySource`, `displayablePercentile`, `percentileLabel`,
`percentileSentence`.

---

## Ref-vs-code conflicts — flagged, not silently resolved

1. **The overdue threshold does not exist as briefed.** Phase 6 said to reuse "the existing threshold
   logic (>3× the agent's `responseTimeWeeks`, floored at 12 weeks)". No such rule is in this
   codebase. The real, shared one is `taskPrecedence.replyTask()`: past the reply deadline plus
   `NUDGE_GRACE_DAYS` (14) a query owes a nudge; once a nudge has been ignored for another full
   window, or `closeAfterDays = max(2 × window, 90 days)` has passed, it owes a close. I reused that
   rather than invent the briefed numbers — creating a second definition is precisely what the brief
   warned against. **If 3×/12wk is meant to become real, it belongs in `taskPrecedence`, not here.**

2. **Header size.** The brief asked for a 36px Playfair title with an italic sub; `PageHeader` renders
   40px/500 with a non-italic Playfair sub. PageHeader won — one header grammar across 11 pages, and
   the file was another stream's live WIP. 4px difference from the ref.

3. **The card back's hero.** The ref makes REQUESTS the big number and lists a "Request rate" row —
   which contradicts the brief's own framing rule (requests are events, never a rate to optimise).
   The framing rule won: reply rate is the hero, with replies, median reply and requests-as-★ beneath.
   Layout is the ref's.

4. **"Make active" is not on the Analytics tab.** The ref puts it in the focus header and Step 0
   confirmed the primitive is real — but the fences say no Firestore writes from Analytics, so it
   lives only on the card in the Workshop tab. One-line change if you'd rather the fence bend for
   that single explicit action.

5. **"The nudge path… wired to nudgeDraft.ts".** `nudgeDraft` is a pure text builder, not a flow; the
   actual nudge (`logNudge`) is a Firestore write the fences forbid here. The recommendation points
   at the Queries Hub, where a nudge is really sent.

6. **Which card is editable — the biggest behaviour change.** The ref gives exactly one card the
   editing affordances and it is the ACTIVE one. So the edit target is: an unsaved new draft, else the
   stored active package, else the first. Editing a *different* package is now one click ("Make
   active") where before any package could be promoted to the bench for free. Ported faithfully; say
   the word if you want an edit affordance on non-active cards.

7. **The FR4 middle empty state** ("First, add your materials" + illustration) has no home in the new
   layout and was not rebuilt. The sidebar's teach line and the FR4 pulse (now on the Edit-materials
   control) carry that job.

8. **The active card's foot action.** The ref labels it "Edit"; the card is already inline-editable,
   so that slot keeps the shipped "⧉ Duplicate" rather than a no-op.

9. **Community percentiles.** Every percentile claim in the ref is a placeholder. Built behind a
   default-off flag; see `reports/community-percentiles.md`.

---

## Consolidation debt (recorded per your Step 0 ruling)

The ink-bordered card language now exists **three times**: `--agl-*` under `.aglist`, `--dv-*` under
`.dv2`, and now `--pkg-*` under `.pkgw`. All three carry value-identical copies of tokens that already
exist as `--shell-*`. This build mirrored rather than extracted, on your instruction and because
extracting would have meant editing two other streams' live surfaces mid-build. **A shared card token
set / component is the right end state** — the natural moment is once the Discover WIP lands.

A second, smaller debt: the letterpress shadow is declared three times with two different ink bases
(`rgba(49,30,25,.07)` in Discover, `rgba(46,39,35,.07)` here per the ref, and a chunkier
`6px 6px 0` cast in the agent list).

---

## Verified in a real browser (not jsdom)

At `#/pkg-lab` (the live route is auth + Pro gated), Chrome, lab fixture carrying real send/reply
dates and agent reply windows:

- **Both tabs** switch; active tab computes burgundy `#7c3a2a` on text and underline.
- **Workshop:** sidebar usage lines, all three card states, the ghost tile, and every preserved build
  behaviour — click-to-add, **drag-and-drop with the type guard** (a letter dragged at the
  sample-pages row is refused: `defaultPrevented` false, no affordance, no fill), dirty Save/Discard,
  the materials editor with its orphan guard.
- **Flip (jsdom cannot see any of this):** `preserve-3d` and `backface-visibility: hidden` computed,
  **equal face heights measured 264px = 264px**, `inert` on the hidden face in both directions, both
  faces of all three card states, and the **reduced-motion cross-fade with the rotor at `none`** (the
  media block's rules applied by hand — the harness cannot toggle the OS setting).
- **Analytics:** all four scopes, KPI band (11 sent / 82% / 4.4 wks / 3 ★), funnel, leaderboard with
  the ★ on the ranked leader and provisional marking below threshold, materials rows, the in-focus
  view with the Sent-to list and the ⚠ on the send past its window, and the derived recommendations.
- **Community surface, flag off:** 0 percentile pills, 0 tracks, no community wording anywhere in the
  rendered text. **Flag on renders identically** with the only source that exists (it answers null) —
  the contract working, and there is deliberately no fixture source to make it look otherwise.
- **The Pro showcase landing is untouched and regression-free:** still renders, still its own
  Cappuccino scope (`--ground: #f2ede7`), both CTAs present, all 57 `psw*` animations running, and no
  `.pkgw` markup or CSS inside it.

### Where the two-tab work would otherwise have touched the showcase

Two places, both handled: the host's zero-package branch returns `<PackageShowcase>` **before** the
tabbed render, so the `.pkgw` scope, the tab strip and the header action never wrap it; and the new
CSS is entirely scoped under `.pkgw`, which the showcase is never inside. Its Cappuccino-only tokens
and the `packagesCount === 0` gate are unchanged.

---

## Not done / open

- **Screenshots of the community surface "live"** are not possible without a fake source, which I
  declined to ship. Its geometry is proven by the code path and the copy by unit tests.
- **"Swap it in"** renders as a plainly-labelled non-interactive "coming soon"; the swap flow is not
  built.
- The old `PackageWorkshop.tsx` (910 lines) is now unused by the route but still imported for its
  `PackageSaveFields` type. **A retirement sweep is a natural follow-up** — deliberately not folded
  into this build.
