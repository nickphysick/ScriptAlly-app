# The red backlog — 52 e2e files that were failing before Query Centre v11

**Measured, not surveyed.** Every file here was run twice on 20 Sep: once against v11
(`0bad1b38`) and once against the commit before this pass began (`6022eb41`), both from isolated
worktrees with their own bundles, both with zero `bundleGuard` refusals. A file is listed only
where **both** runs are red, and only where the same number of its tests ran in each — a file whose
runs were of different lengths was withheld rather than guessed at.

⚠️ **THIS IS A CENSUS, NOT A DIAGNOSIS.** The verdict column is inferred from two pieces of
evidence: whether the file still reaches for a selector a previous pass retired, and how it failed.
Where those two agree the verdict is safe; where a file names no dead selector and fails on an
assertion, "genuinely broken" means *nobody has looked*, not *the app is wrong*. **Nothing here has
been fixed, and nothing was re-run to produce it.**

⚠️ **AND THE HEADLINE IS THE POINT: 36 of the 52 still reach for a selector that no longer
renders** — overwhelmingly `.f12-*`, the three-column pane unreachable since `GRID_IS_THE_PAGE`,
and `.qcc` / `[data-qcc-id]`, the card grid v11 replaced. That is the same fault as the 47
measurements retired in `RETIRED-query-centre-v11.md`: suites entering through a door that was
bricked up, finding nothing, and reporting it as a fault in the room. **Most of this backlog is one
problem counted 36 times.**

⚠️ **WHAT IT MEANS FOR THE GATE.** This repo's convention is "no worse than baseline". With 52
files red before a pass starts, that gate cannot distinguish a new break from the noise — which is
how ten v11-caused failures sat unnoticed among them until they were measured apart. The backlog is
the gate's precondition, not a tidy-up.

## The count

| verdict | files | meaning |
|---|---:|---|
| **re-point** | 41 | the subject is still live; the route in, or the selector, moved |
| **genuinely broken** | 11 | fails on an assertion with no retired selector in it — needs a look |

| subject | files |
|---|---:|
| **moved** — names a retired selector | 36 |
| **live** — no retired selector found | 16 |

## The files

`red` is failing tests over tests run, in the **pre-v11** run — so it is the size of the problem
before this pass, not after it.

| file | verdict | subject | red | last touched | what it measures | evidence |
|---|---|---|---:|---|---|---|
| `analyticsChain` | **re-point** | moved | 1/1 | 2026-08-21 | Analytics — the fixed-viewport chain, measured on a real page | names f12-body; assertion — check which; `Error Context: test-results/analyticsChain.measure.ts--7500d-r-content-that-` |
| `analyticsPolish` | **re-point** | live | 1/2 | 2026-08-19 | Analytics — the polish pass, measured on the real page at two widths | an element it waits for is not there; `Error: page.evaluate: TypeError: Cannot read properties of null (reading 'ge` |
| `band` | **re-point** | moved | 2/2 | 2026-08-25 | ⚠️ FRACTIONAL RECT, 1px THRESHOLD — the ref gives no line-height and this file's history | enters via f12-row; `Error: locator.click: Test timeout of 480000ms exceeded.` |
| `bandActs` | **re-point** | moved | 1/1 | 2026-08-25 | move away, then reach them with the keyboard only | enters via f12-row; `Error: locator.click: Test timeout of 300000ms exceeded.` |
| `bandD6` | **re-point** | moved | 1/1 | 2026-08-25 | collide: hr.right > lr.left + 1, | enters via f12-row; `Error: locator.click: Test timeout of 420000ms exceeded.` |
| `barBinding` | **re-point** | moved | 1/3 | 2026-08-30 | WHERE EACH PAGE SCROLLS, AND WHAT THE COLLAPSED BAR BINDS TO BECAUSE OF IT | names f12-rows; assertion — check which; `Error: Calendar declares `.tpl-zone, .l-body, .cal-fpbody` but that resolves` |
| `calFixes` | **re-point** | moved | 5/8 | 2026-09-12 | THE FOUR FIXES, ON THE RENDERED PAGE — historic fills, the today line, the header, the reveal | names .qcc; assertion — check which; `Error: no past stages on this board — nothing to measure` |
| `calMast64` | **genuinely broken** | live | 1/4 | 2026-09-05 | CALENDAR v64 ADDENDUM — masthead CTA, no action strip | asserts a value the page disagrees with; `Error: the mastheads differ beyond the named set: ["sub: present on to-do on` |
| `calProbe60` | **genuinely broken** | live | 2/4 | 2026-09-04 | v60d Phase 1 — the probe | asserts a value the page disagrees with; `Error: "Alasdair Crewe" does not look like the name it replaces` |
| `chromeGround` | **genuinely broken** | live | 2/3 | 2026-08-30 | THE PINNED BAND IS OPAQUE — proved by sampling what was PAINTED | asserts a value the page disagrees with; `Error: only 3 page(s) had anything passing behind their chrome — the sweep n` |
| `cmd` | **re-point** | moved | 2/2 | 2026-08-30 | cols: cs.gridTemplateColumns, gap: cs.columnGap, | enters via f12-body, f12-lhead; `Error: locator.click: Test timeout of 90000ms exceeded.` |
| `compactHeader` | **genuinely broken** | live | 5/6 | 2026-09-04 | ══ THE COMPACT HEADER — one row, ten pages ═══════════════════════════════════════════════════ | asserts a value the page disagrees with; `Error: To-do list: the row is 112px, but padding 40 / icon -1 / title 37.1 /` |
| `contentGeometry` | **re-point** | live | 1/1 | 2026-08-25 | TWO MEASURES — the content takes its page's, the masthead takes one constant | an element it waits for is not there; `Error: page.waitForTimeout: Test timeout of 90000ms exceeded.` |
| `detachPackage` | **re-point** | moved | 1/1 | 2026-08-23 | ══ F-O — the attach round trip, driven ═══════════════════════════════════════════════════════ | names f12-row; assertion — check which; `Error Context: test-results/detachPackage.measure.ts-F-4ef4c-e-menu-and-surv` |
| `drawer3` | **re-point** | moved | 4/6 | 2026-09-06 | Drawer-3 run — chrome D and geometry 1, measured. §1: the stage block's one tint across three | enters via .qcc, data-qcc-id; `Error: locator.click: Test timeout of 90000ms exceeded.` |
| `engagement` | **re-point** | live | 1/1 | 2026-08-14 | COLLAPSE ON ENGAGEMENT — the gate | an element it waits for is not there; `Error: page.evaluate: TypeError: Cannot read properties of null (reading 'cl` |
| `f10Recon` | **re-point** | moved | 1/1 | 2026-08-24 | a query with no package, so the Attach menu is in its ordinary state | enters via f12-row; `Error: locator.click: Test timeout of 240000ms exceeded.` |
| `fAQ` | **re-point** | moved | 1/1 | 2026-08-25 | F-AQ — does the pane | enters via f12-row; `Error: locator.click: Test timeout of 240000ms exceeded.` |
| `fadRender` | **re-point** | moved | 1/1 | 2026-08-24 | id, userId: uid, manuscriptId: "seed-ms-1", agentId: "seed-agent-1", | names f12-row; assertion — check which; `Error: nothing was swept` |
| `forkAndLink` | **re-point** | moved | 1/1 | 2026-08-24 | scope already contains, so naming an id off-scope silently selects nothing and every locator | names f12-popwrap, f12-row; assertion — check which; `Error: no query reaches the fork at all` |
| `frame2` | **re-point** | moved | 1/1 | 2026-09-07 | FRAME PARITY, COUNTS, PANE PRESENCE, COPY, TYPE SCALE | names f12-list; assertion — check which; `Error: 19 red` |
| `holdingReply` | **re-point** | moved | 1/1 | 2026-08-18 | Phase 6 — record a holding reply on a long-silent query and check the four claims | enters via f12-ghead, f12-group; `Error: locator.click: Test timeout of 150000ms exceeded.` |
| `illoRules` | **genuinely broken** | live | 9/15 | 2026-08-30 | ══ THE THREE RULES OF THE ILLUSTRATED MASTHEAD, ASSERTED AS ARITHMETIC ═══════════════════════ | asserts a value the page disagrees with; `Error: Submission packages: the reveal opens at 660, inside the header's ink` |
| `importDrive` | **re-point** | moved | 1/1 | 2026-08-24 | ⚠️ SCOPED: every workspace page stays mounted, so a bare `textarea` matches a hidden copy | names f12-idname, f12-row; assertion — check which; `Error: expect(received).toBeGreaterThan(expected)` |
| `importNoPackage` | **re-point** | moved | 1/1 | 2026-08-24 | ⚠️ THE DEFECT IS PROVEN BEFORE THE FIX IS. Nothing on either account had ever been imported, so | names f12-idname, f12-row; assertion — check which; `Error: the dangling link rendered like any healthy query` |
| `importUnmatched` | **re-point** | moved | 1/1 | 2026-08-24 | all three failure cases, plus one clean row so "matched" is not zero | names f12-row; assertion — check which; `Error: rows are still being dropped from the list` |
| `inplaceGrammar` | **re-point** | moved | 1/1 | 2026-08-24 | F-Y — the pane | enters via f12-row; `Error: locator.click: Test timeout of 240000ms exceeded.` |
| `journeys` | **re-point** | moved | 6/6 | 2026-08-13 | §4 GATE — the two Query Centre journeys, on the real seeded page | names f12-body, f12-ctl; assertion — check which; `Error: browsing does not hold the resting card` |
| `linkedChips` | **re-point** | moved | 1/1 | 2026-08-24 | D-D5 — a linked package | names f12-row; assertion — check which; `Error: no packaged strip rendered on any query` |
| `mastheadMatrix` | **genuinely broken** | live | 1/2 | 2026-09-19 | THE ACCEPTANCE MATRIX — the in-flow masthead, every in-scope page, on a real browser | asserts a value the page disagrees with; `Error: Query Centre: the masthead is 120px, but rule 8 / padding 0 / kicker ` |
| `matrix` | **re-point** | moved | 2/2 | 2026-08-23 | THE ACCEPTANCE MATRIX — every in-scope page, both viewports | names f12-body, f12-lhead; assertion — check which; `Error: Query Centre: the content starts at 0, but the scroller's padding (18` |
| `moveDest` | **re-point** | moved | 1/1 | 2026-08-25 | responseReceivedAt: q.responseReceivedAt ?? null, | names f12-nm, f12-row; assertion — check which; `TimeoutError: locator.click: Timeout 20000ms exceeded.` |
| `moveEntry` | **re-point** | moved | 1/1 | 2026-08-25 | Both queries' stored derived state, so D4 can be asserted from the source of truth | names f12-nm, f12-row; assertion — check which; `Error: no timeline offers a correction control` |
| `optionA` | **re-point** | live | 3/3 | 2026-08-26 | anything above ~48 means something was carried over that should not have been — so the number is | an element it waits for is not there; `Error: expect(locator).toBeVisible() failed` |
| `packageAttach` | **re-point** | moved | 1/1 | 2026-08-20 | F7 acceptance — attach a package to an EXISTING query through EditQueryDrawer, on the deployed | enters via f12-row; `Error: locator.click: Test timeout of 240000ms exceeded.` |
| `packagesConsolidated` | **re-point** | moved | 1/3 | 2026-08-23 | ══ PACKAGES, CONSOLIDATED — driven, at two widths ════════════════════════════════════════════ | names f12-row; assertion — check which; `Error: no query rows — the harness account has no data to measure` |
| `partDRecon` | **re-point** | moved | 1/1 | 2026-08-24 | ── the stored side ─────────────────────────────────────────────────────────────────── | names f12-row; assertion — check which; `Error: nothing was sampled — the census proves nothing` |
| `pkgFlow` | **re-point** | moved | 6/11 | 2026-08-20 | Submission packages — the ecosystem flow, driven | enters via f12-row; `Error: locator.click: Test timeout of 90000ms exceeded.` |
| `pkgTracking` | **genuinely broken** | live | 1/1 | 2026-08-23 | §3/§4 · the derived tracking block on the Packages page | asserts a value the page disagrees with; `Error: no tracking block on the packages page` |
| `pointerControls` | **re-point** | moved | 1/1 | 2026-08-24 | The packages page's derived figures — D5's before/after | names f12-popwrap, f12-row; assertion — check which; `Error: Requests by material did not parse` |
| `r3Visibility` | **re-point** | moved | 1/1 | 2026-08-24 | id, userId: uid, manuscriptId: msId, agentId: "seed-agent-1", packageId: "", | names f12-row; assertion — check which; `Error: expect(received).toBeGreaterThan(expected)` |
| `serifClip` | **genuinely broken** | live | 1/1 | 2026-08-21 | ⚠️ THE ORIGIN, BECAUSE THE MISTAKE WAS A CORRECT RULE APPLIED TO THE WRONG TYPE. `line-height: 1` | asserts a value the page disagrees with; `Error: the chrome did not settle — the check below would be about the restin` |
| `slimBar` | **genuinely broken** | live | 1/4 | 2026-09-04 | ══ THE SLIM BAR AND THE HANDOFF ══════════════════════════════════════════════════════════════ | asserts a value the page disagrees with; `Error: Analytics: the bar flipped 0 times on the way up` |
| `stampWiring` | **re-point** | moved | 1/1 | 2026-08-24 | control sits inside `isMobile && mobileDetailOn` — so the only deterministic route to the one UI | enters via f12-row; `Error: locator.click: Test timeout of 300000ms exceeded.` |
| `stickyRow` | **genuinely broken** | live | 2/2 | 2026-08-21 | ⚠️ FOUR OF THE FIVE ROWS ARE BRAND NEW, so their sticky behaviour has never been seen by anyone | asserts a value the page disagrees with; `Error: Contact list: the chrome slab is not sticky` |
| `stripAudit` | **re-point** | live | 1/1 | 2026-08-12 | §1 AUDIT — report-only. What actually differs between one page's collapsed strip and another's | an element it waits for is not there; `Error: page.evaluate: TypeError: Cannot read properties of null (reading 'ge` |
| `surfaceCensus` | **re-point** | moved | 1/2 | 2026-09-13 | THE SURFACE CENSUS — every major surface, OPENED, and read as computed values | names .qcc; assertion — check which; `Error: Contact list: the control row wrapped onto 2 lines` |
| `todoEdges` | **re-point** | moved | 1/2 | 2026-09-07 | The grid and the board used to ride inside `TaskList`'s card — white, 1px border, 12px radius, | names .qcc, qct-tile; assertion — check which; `Error: D7 · the card's header IS the ladder value for this query's status — ` |
| `unassigned` | **re-point** | moved | 1/1 | 2026-08-24 | id, userId: uid, manuscriptId: msId, agentId: agId, packageId: "", | names f12-idname, f12-row; assertion — check which; `Error: an unresolvable row is still being dropped from the list` |
| `versionColumn` | **re-point** | moved | 1/1 | 2026-08-26 | node tests/e2e/seedBookVersions.mjs 3 | names f12-foot, f12-mid; assertion — check which; `Error: no 'All manuscripts' option — scope was never widened` |
| `washEdges` | **genuinely broken** | live | 3/3 | 2026-08-27 | THE WASH REACHES THE WINDOW'S EDGES — proved by sampling what was PAINTED at both of them | asserts a value the page disagrees with; `Error: Analytics: the masthead band does not reach the window's LEFT inner e` |
| `writerDeploy` | **re-point** | moved | 1/1 | 2026-08-18 | The check is runtime because nothing else is honest: the rules file in git says what WILL be | names f12-pane, f12-row; assertion — check which; `TimeoutError: locator.click: Timeout 8000ms exceeded.` |

## How to work it

1. **Take the 36 "moved" first, by selector rather than by file.** `grep -rln "f12-" tests/e2e/`
   and `grep -rln "data-qcc-id\|\.qcc" tests/e2e/` are the two sweeps; `tests/e2e/openQuery.ts`
   already exists as the one way in for the Query Centre, and `tests/e2e/todoOpen.ts` for the To-do
   page. **Scope the sweep by the selector, not by the filename** — six of v11's ten were missed
   because they are called `deskPaint` and `rungCrop`.
2. **Then decide retire-or-re-point per file, not per sweep.** A suite whose whole subject went
   (the card grid's verb band, the old tiles) should be retired by name with a reason, as
   `RETIRED-query-centre-v11.md` does. A suite whose subject is live and merely moved should be
   re-pointed and kept.
3. **Leave the 11 "genuinely broken" until last**, and treat each as its own question. Some will be
   stale expectations from a deliberate redesign; some will be real. None has been read.
