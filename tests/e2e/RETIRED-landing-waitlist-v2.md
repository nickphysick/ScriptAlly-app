# Retired or re-pointed with waitlist v2 (1 Nov)

The landing page was rebuilt to `design-refs/landing-mobile-v17.html` (phones) and
`design-refs/landing-desktop-v14.html` (desktop). No e2e file was deleted; these assertions described
pieces that no longer exist and were replaced in place. Swept by the selectors the retired pieces were
reached through (`mk-bew-*`, `mk-ccard`, `mk-frow--be`, `mk-befcell`, `mk-wl-more`, `mk-wl-whyart`).

| Where | The old assertion | Why | Now |
|---|---|---|---|
| `landingWaitlist.public.ts` LW-2 | `html` never snaps, nothing sticky | the mission is a sideways swipe again (Nick) | also: the carousel (`.mk-vc`) is the ONLY scroll-snap element |
| LW-3 | the join bar hides at `.mk-ccard` | the founding card is a pass (`FoundingTicket`, `.mk-tkt`) | the same rule, at `.mk-tkt` |
| LW-4 phone | the showcase holds its chips at 40% | `BirdsEyeShowcase` is retired | `BirdsEyeFocus layout="phone"` holds its draw-in at 40% |
| LW-4 reduced motion, phone | the showcase never changes, no animations | as above | the phone window is drawn finished with its transitions off |
| LW-5 | row 1's Birds-eye copy sits in the rows' copy column (x) | the Birds-eye view is its own band, not a row | the heading is one line at 1440 and the window is the hero card's width |
| LW-F | `.mk-bew-lab`, `.mk-wl-more span` | both retired | `.mk-bef-bar > span`, `.mk-wl-fline`, `.mk-vcard p`, `.mk-tkt-st b` |
| `landingColoursV2.measure.ts` V1 | desktop vision band stone; phone navy carousel (`.mk-vbf`) | the desktop band is navy; phones have no vision band (it was already gone since v1) | navy with three white cards; phones show the mission's three cards |

New in v2: LW-7 (the first screen), LW-8 (no uppercase), LW-9 (the pills), LW-10 (the mission's cards),
LW-11 (the bands and the vision join), LW-12 (the pass's number). Each red proof is in
`reports/landing-waitlist-v2/REPORT.md`.
