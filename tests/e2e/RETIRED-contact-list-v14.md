# Retired by Contact list v14

Each entry names what retired, why, and where its claim lives now (if anywhere).

## Phase 1 — the carousel and the figure presses (v14 §1.3, §1.4)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-3 · figures fill the carousel, not the list | The carousel is retired and the figures are not pressable | CL14-2 (figures inert) |
| `contactV13.measure.ts` | CL13-4 · carousel cards are the agent card | The carousel is retired | Its card-signature half moves to CL14-3 (the next-step section's card); `agentCardParts.test.tsx` keeps the shared-blocks signature |
| `contactV13.measure.ts` | CL13-11 · ← → on the focused track | The carousel's keys left with it (`carouselBack`, `carouselForward` unregistered) | — |
| `contactV13.measure.ts` | CL13-12 · three placeholder cards; the selector waits for data | The carousel's placeholders left with it | The shimmer is read off a placeholder row; the section's card returns to the loading beat in Phase 2 |
| `src/lib/contactCarousel.test.ts` | the whole file | `lib/contactCarousel.ts` (the three sets and the figure sets) is deleted | The next-step section's states (Phase 2, `lib/contactNextStep`) |

**Rewritten, not retired:** CL13-1 (the band is v131's compact hero card: 178 tall, 18px corners, a 150 disc; it no longer starts at the bar or spans the column), CL13-S (no figure is pressable), CL13-13 (step 2 is "Your next step").

## Phase 3 — the open banner, the slim bar and the slate workspace (v14 §3, ruling Q7)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-B · banner | The open banner is replaced by the "Your agents" bar | CL14-5 |
| `contactV13.measure.ts` | CL13-SB · sticky bar | The sticky slim bar retires with the banner (ruling Q7); the sticky column labels are the list's only sticky element | — (Phase 6's stuck-labels lock) |
| `contactV13.measure.ts` | CL13-5 · workspace | The slate workspace and the banner's perch are replaced by the white panel and its ink bar | CL14-5 (the panel); Phase 5's locks (group headers, rows) |
| `contactV11.measure.ts` | v12 §10.2 · "the divider lands clear of the slim bar" (one assertion) | The slim bar retired (ruling Q7) | The rest of the case — the census, the landing on its own margin, the mark, All — still runs |

**Rewritten, not retired:** CL13-7 (a set pill stays white on the ink bar — v13's anthracite fill would vanish into it; CL14-5 holds the white), CL13-12 (the art waiting for data is the bar's `.cl14-art`).

**Deleted components (their only reader was this page):** `shell/OpenBanner`, `shell/StickyBar` (+ `useStuckPast`), `shell/Workspace`, and their sheets.

## Phase 4 — v13's facet model: the Filters pill, the filter line and the unversioned memory (v14 §4)

| Suite | Case | Why | Now |
|---|---|---|---|
| `contactV13.measure.ts` | CL13-7 · pills | The Filters pill and its seven-section popover are replaced by the filter strip | The Group and Sort pills, the direction, one popover at a time, Escape and an outside press → CL14-8; the strip → CL14-7, CL14-10 |
| `contactV13.measure.ts` | CL13-F · filter line | The "Showing n of N" line and its chips are retired; the strip shows its own state, and the bar says "Showing n of N" | CL14-7 (live application, Clear all); CL14-5 (the bar's line); the "No agents match" message and its Clear stay |
| `contactV13.measure.ts` | CL13-8 · remembered settings | The memory is versioned (`sa.contactList.v2`) and validated | CL14-9 |
| `src/lib/contactList.test.ts` | the v13 filter, grouping and sort cases (`facetOptions`, `stand`/`fit`/`profile`/`rating`/`locs`, Where you stand, Agency, Location, Open to queries, Fit, Next date, Your rating, First name) | Nick's filter, group and sort set supersedes v13's (ruling, 7 Oct) | The v14 cases in the same file |

**Deleted with them:** `listState`/`listDiff` (their only reader was CL13-7), the `.cl13-fline`/`.cl13-fchip`/`.cl13-clr` rules, `filterValueLabel`, `facetOptions`, `FilterCtx`, `compareDue`, `STATUS_OPTIONS`.
