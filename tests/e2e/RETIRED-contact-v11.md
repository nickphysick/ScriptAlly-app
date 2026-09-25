# Retired with the Contact list v11 rebuild — swept by SELECTOR, not by filename

The v11 rebuild (design-refs/contact-list-v11.html) retires the Grid/List/Board view switch, the
quick-add slot cluster, and — in later phases — the toolbar, the card grid and the right-hand
drawer. Per the house rule, this sweep was scoped by the SELECTORS the retired things are reached
through (`data-agent-card`, `.agl-lrow`, `.agl-bcard`, `[data-add-slot]`, `.agl-gap`,
`.agl-toolbar`, `.slo` on /agents, `#/contact-lab`), because a filename sweep is how six suites
survived the Query Centre's grid retirement. Recover any file from the commit that removed it.

## Phase 1 (view switch + quick-add cluster retired)

| File | Why | Subject |
|---|---|---|
| `contactViews.measure.ts` | asserted `view=list`/`view=board` in the URL and the three renderers agreeing — the switch is deleted and `?view=` is now accepted and ignored | gone |
| `contactBoard.measure.ts` | the Board renderer (`.agl-bcard`) is deleted | gone |
| `contactToolbar.measure.ts` | drives `.agl-lrow`/`.agl-bcard` through the switch to test filter/sort interplay across views | gone |
| `contactToolbarRow.measure.ts` | pins the view switch flush with the row's right edge — the switch is deleted | gone (the P3 header-row locks replace it) |
| `contactSlots.measure.ts` | the dashed add slots (`[data-add-slot]`) rendered only in the List view | gone (the torn slip replaces the idiom in P3) |
| `quickAdd.measure.ts` | the quick-add popover's only anchors were the List view's slots | gone (the pop-up editor replaces it in P4) |
| `contactPortalScope.measure.ts` | proved `ContactPeekPopover` escaped the List's horizontal scroller — both the popover and the scroller are deleted | gone |

**Dead-but-tested, deliberately left until its phase:** the quick-field half of `lib/quickAdd.ts`
(`QuickField`, `nextQuickField`, `quickDiff`, `quickWarning`) lost its last caller with the
popover; `hrefFor`/`isLiveHref` in the same module are live (ContactPeek, AgentCard). The module
is swept when P4's editor lands. `contactCard.measure.ts` (grid cards) and
`contactDrawer.measure.ts` (the SlideOver drawer) keep their subjects until P3/P4 and stay.

**Known-red rows already in RED-BACKLOG.md that this rebuild will re-point rather than fix:**
`stickyRow` (Contact list chrome slab; the masthead leaves in P2), `surfaceCensus` (control row),
`compactHeader` (reads `.agl-toolbar`; the toolbar leaves in P3).

## Phase 3 (the toolbar, the card grid's mount, and the old filter model retired)

| Subject | Disposition |
|---|---|
| `AgentToolbar.tsx` + `src/lib/agentToolbar.test.ts` | deleted — the v11 header row (`ContactControls`) replaces it; the F12Popover desks and the retired facet model went with it |
| `lib/agentFilters.ts` + its test | deleted — the last live importer was `saveOutcome`, itself retired: the v11 filter/sort/group model lives in `lib/contactList.ts`, locked fixture-derived |
| `saveOutcome` (lib/agentSaveOutcome) | function retired; the TYPE and `saveNotice` survive — the page derives survival/position against the v11 pipeline inline |
| the grid mount + card back-face peek in `AgentList` | rows render the list; `AgentCard`/`MaterialSlots`/`ContactPeek` SURVIVE as the DRAWER's dependencies until P4 retires it |
| `agentsMobile.test` "toolbar popovers present in the sheet" | retired with the toolbar; a mobile presentation for the v11 panels is the mobile pass's own follow-up |
| `contactPeek.test` / `agentDrawer.test` pins | retargeted (relocation rule): the one-renderer law's host is the drawer; the step order is the grouped `stepOrder` |

**Rows carry `data-agent-card`** (flip.ts's own selector), so the FLIP, the save-notice scroll and
any probe wanting "an agent's element" keep one address. Lab-hosted suites still alive
(`contactCard`, `contactDrawer`, `contactEmpty`, `emptyStateSpacing`, `agentAsks`) measure card
and drawer anatomy that survives only behind the drawer — they retire with it in P4.

**Found dead in passing, not this pass's to sweep:** `AgentResponseGuidelines.tsx` has ZERO
importers (pre-dates v11). P4's drawer retirement is the natural commit for it.

## Phase 4 (the pop-up replaces the drawer; the flip-card era's last dependencies retired)

| Subject | Disposition |
|---|---|
| `AgentDrawer.tsx` · `AgentEditor.tsx` · `AgentCard.tsx` · `ContactPeek.tsx` · `MaterialSlots.tsx` · `AgentMaterialsEditor.tsx` · `AgentLinkPopover.tsx` · `lib/agentDraft.ts` | deleted — `ContactProfile` (view + edit, one portal) and `ContactAgentForm` (§8.2, shared with P5's add card) replace the whole cluster; the buffered-draft law survives as the form's caller-owned draft + one `commitAgentEdits` on Save |
| `AgentResponseGuidelines.tsx` | deleted — zero importers since before v11 (flagged in P3; this was the natural commit) |
| `agentDrawer.test.tsx` · `contactCard.test.tsx` · `contactFields.test.tsx` · `contactPeek.test.tsx` · `materialSlots.test.tsx` · `agentDraft.test.ts` · `agentsMobile.test.ts` · `agentFlip.test.ts` | deleted with their subjects. The flip's five structural rules, the drawer-host law and the card's mobile breakpoints all described elements that no longer exist; the v11 narrow behaviour is @container-driven and locked by `contactV11.measure` (narrow rows) + `contactList.test` (the 700 boundary at a 758 column) |
| `tests/e2e/contactCard.measure.ts` · `contactDrawer.measure.ts` · `contactEmpty.measure.ts` · `emptyStateSpacing.measure.ts` · `agentAsks.measure.ts` | deleted — card/drawer anatomy, reachable only through the lab or the drawer, both gone (selector-swept: `.agl-acard`, `.agl-drawer`, `data-clv="peek"`) |
| `agentMotion.test` "three beats" / "id adoption" / "scrolls FULLY into view" | the crossfade–breath–travel, the in-grid draft node and the taller-than-viewport editor scroll all died with the card; the SURVIVING law — the outcome is computed before the FLIP measurement, through the page's own sort — is retargeted onto the v11 anchors in the same file |
| `expectedDate.test` "§2 · Done and Discard no longer share a class" | retired — the incident's lesson (a shared chassis named for one of two actions) is kept in the note; the pop-up's Cancel/Save share no class named for either |
| `agentList.test` colour/dim/door-band cases + `lib/agentList.ts` `agentStateClass`/`agentCardDims` | retired together — the live-query-outranks-the-shut-door law moved to `contactStanding` + the pop-up band label, and `contactFixture.test` now derives the carve-out through `contactStanding` |
| `agentLayout.test` "THREE columns" + "hover — shadow, never a lift" | retired — `.agl-grid` and `.agl-acard` are deleted; shadow-never-lift stays the app-wide law (CLAUDE.md) |
| `lib/quickAdd.ts` quick-field half (`QuickField`, `QUICK_ORDER`, `quickWarning`, `quickDiff`, `emptyQuickFields`, `nextQuickField`) | deleted (flagged in P1 as dead-but-tested). The scheme allowlist (`normaliseSubmissionsUrl`/`isLiveHref`/`hrefFor` — rendered by the pop-up) and `commitTypedGenre` (now consumed by the form's "+ Other") survive with their locks |
| `agentList.css` | rebuilt down to its live set (root tokens, grid plumbing, the notice, the empty-state CTAs); ~1,250 lines of card/editor/toolbar/drawer rules deleted. All recoverable at `2d160183`'s parent |

**Found by the sweep, repaired in this phase, and worth more than the sweep:**
- **The country picker rendered UNSTYLED in the pop-up** — every `.agl-cc*` rule was
  `.aglist`-scoped with tokens on `.aglist`, and the pop-up portals to `document.body` (the
  portal-scope law, third instance on this page's own history). It is dressed in `contactV11.css`
  under `.clv-fbody2` on the `:root` palette now, and `contactV11.measure` §11.6 asserts the
  dress on the RENDERED portal (proved red by re-scoping the rules under `.aglist`).
- **The empty state's slate strip had ALWAYS painted transparent** — `--cle-slate` read
  `--agl-band`, a token only ever declared on the deleted card's `.s-open`/`.s-shut` state rules,
  never an ancestor of the component. Repointed at `:root`'s `--clv-band-slate`; the empty-state
  suite's token sweep now includes `contactV11.css` in its defined set.
- **`notePreview` was silently denied on every save that recomputed it** (pre-existing, found by
  the P4 probe before any UI landed): the field was outside the agent-update allowlist, so the
  affectedKeys shape failed the WHOLE write. Allowlisted + `isValidAgent` clause; deployed to dev
  and re-probed ALLOWED. Prod rules deploy is Nick's (final report).

## Phase 5 (the add card)

No retirements — P5 is additive: `ContactAddCard` (the pop-up's chassis around the SAME
`ContactAgentForm`), `findDuplicateAgent` + `emptyContactDraft` in the libs, the lab's local
`addAgent` (so the after-add choreography measures over known content), and the ruling-(f)
capture repoint (`sa:contact-add` on /agents; the app-level focus form untouched elsewhere).

**Found by the §11.9 after-add case, and it reshaped the case rather than the product:**
- **The dev harness account is FREE at 34 agents, so `addAgent`'s free-tier cap refuses every
  UI add on it** — correct product behaviour, which means the app-level add form has been
  refusing on this account for as long as it has been over the cap. The cap is now ITS OWN
  rendered lock (the card stays open and says why; cleanup proves nothing was written), and the
  full §8.4 choreography (Not-yet-queried landing, centred scroll, 2.4s ring) is proven on the
  lab, where the writer is local and no account changes.
- **`harnessPlan.mjs`'s set half is DEAD, and deliberately**: the user rules'
  `incoming().plan == existing().plan` billing guard denies a client flipping its own plan, so
  the packages-era flip → prove → restore pattern no longer exists. Its docstring now says so
  (the read half survives and the cap lock uses it to assert its premise). A measurement that
  needs a Pro window needs a server-side arrangement or a Pro fixture account — neither built.
- `cleanupProbeAgent.mjs` joins the seeder: it removes the probe agent AND the `AGENT_ADDED`
  feed line the create writes, because the doc alone would leave the feed naming a stranger.
