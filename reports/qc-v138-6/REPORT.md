# Query Centre v138.6 — report

Branch `query-centre-v138-6`, cut from `dev/main-cl18-todo51-cl181-qc1385` at **387a664a**: what dev served when the
pack started (`index-OpIsaxaB.js`; a dev build of 387a664a reproduces it exactly). It contains v138.5. Neither
Analytics v21 nor Contact list v18.2 had deployed over it.

| Part | Commit | |
|---|---|---|
| A · One pin | 5e51da0f | the shared hook (`usePinList`), `PinListButton`, the Query Centre on both |
| B · Sticky navy header | 8510adcf | the Query Centre's old pinned bar deleted; the navy header is the sticky row |
| C · Contact list | c70ca118 + 036a21a1 | the Contact list on A and B; a header-flash fix lock A3 found |
| D · Locks | (this commit) | QC138.6, the moves and retirements, CLAUDE.md, this report |

## False premises

1. **"On the Contact list, v16 E's count chips still show while pinned" cannot hold with Part C.** Those chips (the
   group pills) lived only in the old pinned row, and v18 had already replaced them there with compact letter tabs.
   Part C retires that row, so nothing is left to carry either. They are kept out, as Part C says, and listed for Nick.
2. **The pin is remembered per DEVICE, not per user.** "Saved per user, in the same store v16 E uses": v16 E's store
   is localStorage, which belongs to the browser, not the account. Kept as v16 E had it (localStorage
   `sa.pinList.queries` / `sa.pinList.agents`, plus the URL's `?full=1`); a per-user store would be a user-document
   field and a rules change.
3. **The shell's collapsed rail is 68px over 0.24s**, as v138.5 already reported; the pack's "as built" is that.
4. **C1 cannot be measured pinned.** The letter tabs are in the page header, which pinning hides, and the compact
   letters went with the old row: a pinned Contact list has no letter tabs to click. C1 is measured unpinned at both
   widths. **Pinned, the Contact list now has no letter navigation at all.**
5. **C1 is green on the pre-pack build**, correctly: the letter jump already landed under the old stack (CL16 C4),
   and the lock is the guarantee that it still does. Its red is by mutation only. **And the first mutation was
   vacuous:** breaking the jump's first estimate is corrected by `landUnder` (which measures the headings after the
   scroll), so the lock stayed green; the honest break is in `landUnder`, and that one is red (−10.4px).
6. **Playwright's click is not a reader's click on a sticky element.** `locator.click()` scrolls its target into view
   first, and for a STUCK sticky header that scrolls the page to the header's static position. Pressing the pin that
   way at scrollTop 1200 made the hook remember 761, which looked exactly like a broken restore. The locks press the
   pin on the element (`element.click()`).
7. **PIN1 P1 to P4 measured the pinned row's frame, which no longer exists.** They now measure the navy header (P1:
   its controls centred in it; P2: nothing painted over it; P3: both pages use the one sticky wrapper; P4: the
   headings directly under it).

## §0 Recon

1. **The two implementations.**
   - Query Centre (v138.5 G): `qcFull` in `Queries.tsx` (a `useState`), the sidebar held through `holdSidebarCollapsed`;
     no storage, no key, no F.
   - Contact list (v16 E): the shared `useFullScreenList` (built by Comparable titles v25) with
     `storageKey: "sa.contactsFull"` (localStorage, per device) and the URL's `?full=1`; Esc at the bottom of the
     escape stack (`ESC_LEVEL.pageMode`); F bound in `AgentList`'s own key handler (`SHORTCUTS.contactsFull`); the
     scroll position remembered on the way in and held on the way out for 600ms.
   - **Comparable titles** uses `useFullScreenList` (its own F, `compsFull`). **Submission packages and Responses have
     neither the hook nor a full-screen button.** Comparable titles is unchanged (it calls `useFullScreenList`
     directly; the pin behaviours are behind `usePinList`).
2. **The old pinned bars.** Query Centre: `QcPinned138` + `useQcPinned` ("{N} queries", the glyph capsule, a mirrored
   search, "+ Log a query", ↑), shown past a sentinel and always while pinned. Contact list: `ContactPinned`
   (`ContactPinnedRow` + `useContactPinned`: "{N} agents", the compact letters, "n of N · Clear", a mirrored search,
   "+ Add an agent", ↑). Both rendered in the shell's `PinnedRow` frame, whose single writer (`usePinCover`) wrote
   `--pin-cover` and whose `--pin-row-h` the headings read. Asserted by PIN1 P1–P4, QC138.1 A1 and F1 (the mirrored
   search), CL17 C1, CL18 A3 (the compact letters and the row's box), QC138 D2 (the band under the row). QC137 D and
   CL16 D1 were already retired.
3. **The navy headers.** Query Centre: `QcList138`'s `.qc138-top` (title, search, Filters, density, pin). Contact list:
   `AgentList`'s `.cl18-lh` (title, search, Filters, density, Full screen). Both held all five.

## What the Contact list lost with its old row

The compact letter tabs, the "n of N · Clear" status, a mirrored search, "+ Add an agent" and ↑ back to the top.
**While scrolled:** the slate header (now sticky) carries the search, Filters (with Clear all inside), density and the
pin, so search and filters are still in reach; the letters, "+ Add an agent" and ↑ are not. **Nothing else gives a
quick route back to the top** (none added, as asked). While pinned, there are no letters at all (false premise 4).

## The overlap with Contact list v18.2

Contact list v18.2 is in progress in a local worktree (`contact-list-v18-2`, not pushed, off d3dd2a94, so without
v138.5). It edits the same Full screen button in `AgentList.tsx` (it drops the shortcut from the button's `title`)
and the navy header's search (it drops the "/" key cap). Part C replaces that button with `PinListButton`, so those
lines will conflict when the two meet; nothing else overlaps.

## Locks — QC138.6 (`tests/e2e/qcV1386.measure.ts`, A1's source half `src/components/shell/pinList.test.ts`)

Red first on the pre-pack build (387a664a, from a separate worktree), green on the branch, red under each named
mutation (page-side through `QC1386_MUTATE`, source through `tests/e2e/qcV1386Mutate.sh`). Logs in `runs/`.

| Lock | Red on base | Green | Mutation → red |
|---|---|---|---|
| A1 one hook | no PinListButton on either page | both pages draw it with aria-keyshortcuts F; the unit lock: both use `usePinList`, neither holds the sidebar, binds F or writes the pin | the Contact list binds F again → unit red |
| A2 keys | Query Centre: F does nothing; Esc never unpins | F pins and unpins; F in the search types "f"; Esc closes Filters (still pinned), then unpins; the agent panel takes Esc first | Esc unpins first → "agents: Esc closes the agent panel only — panel 1 · pinned false" |
| A3 remembered | Query Centre not remembered; the header shows on load | loads pinned; the rail (68) on every frame from the first; no header frame; each page its own; unpin + reload → unpinned | one shared key → "agents pinned does not pin queries — true" |
| A4 scroll | Query Centre: pinning stays at 1200 | 1200 → 0 → 1200 ±2, both pages, both widths | no restore → 0 |
| A5 tooltip | no tooltip | "Pin the list" + F, pinned "Unpin" + F, no title | native title → "no native title — Pin the list" |
| B1 sticky stack | the navy header scrolls away (−1074) | header 12.0 under the sheet; headings at its bottom; the band at theirs; 0 pixels differ in the strip above | headings at top 0 → 105.8 vs 201.8 |
| B2 one bar | a pinned bar in the DOM on both pages | none, scrolled or pinned | a bar restored on scroll → 1 |
| B3 no jitter | the header does not stick (22 steps out) | 0 steps out, scrollTop held, both pages | padding changed when stuck → out |
| C1 letters | green (see false premise 5) | M lands 0–4px under the stack at both widths | landUnder against the old row → −10.4px |

### L1 — no regression

Pass unchanged: QC138.2, QC138.3, QC138.4, QC138.5, CL16 (10 skipped by design), CL17.1 (2 skipped), RS2.

Moved or retired, each with a note in the file:
- **PIN1 P1–P4:** rewritten onto the navy header (above); `pinLib`'s `PIN_PAGES` now names each page's navy header and
  its sticky wrapper.
- **QC138 D2:** the Waiting band sticks under the headings (it read the retired row's bottom).
- **QC138.1 A1 (pinned centring): retired** in favour of PIN1 P1 and B1–B3. **QC138.1 F1:** "mirrors the pinned
  search" retired; the rest of F1 stands.
- **CL17 C1 (the pinned row) and C2 (its 1px step test): retired** in favour of B1–B3.
- **CL18 A3:** the spy reads the one remaining strip, and its "one box" check moves to the sticky header.
- **CL18 F1/F2 (Housekeeping's score and intro) went red on a second run and are fixture state, not this pack:** the
  shared account had been left with `hkIntroSeen: true` by an earlier run (read with `tests/e2e/hkFlags.mjs`); cleared,
  both pass (`runs/CL18-F1F2-after-clearing-flags.log`). They passed on the first L1 run of the same build.
- **CL18.1 B5 is red on the pre-pack build too**: its stored capture is dated 15 Oct and the check requires it be
  today's. A date-bound fixture, not this pack's; left as is.

## Shots

`shots/`: both pages at 1512 and 1280, at rest, scrolled 1400, pinned, and pinned and scrolled; the pin's tooltip,
pinned and not.

## Deploy

Dev moved twice while this pack was being built: first to Analytics v21 (`index-DQqNyNdX.js`), then to Contact list
v18.2 (`dev/main-cl18-todo51-cl181-qc1385-an21-cl182` 506ad105, `index-BboeA1eL.js`). v138.6 is merged onto the second
as **`dev/main-cl18-todo51-cl181-qc1385-an21-cl182-qc1386` at d66841ac**. It was built from a clean detached checkout,
the served hash was re-checked immediately before the deploy, and it was deployed to dev on 16 Oct: **`index-DalAPG6D.js`**.

- **The merge's one real conflict:** v18.2 edited the Contact list's Full screen button (it dropped the shortcut from
  the `title`), and Part C replaces that button with `PinListButton`. Part C's button was kept, and it has no `title`.
- **On the merged build:** QC138.6 has 10 passed; CL18.2 has 22 passed and 1 failed. **CL18.2 C5 ("no keycaps on /agents")
  is red because of the pin's tooltip:** v138.6 A5 asks for an "F" keycap in it on both pages, and v18.2 rules out every
  keycap on the Contact list. The two packs conflict, so this is for Nick (below). Nothing else in CL18.2 is affected.

## For Nick

- **The pin's "F" keycap on the Contact list:** keep it (v138.6 A5), or hide it there (v18.2 C5)? On dev now it shows.

- **Should Comparable titles, Submission packages and Responses get the same pin and sticky header next?** Comparable
  titles already has the full-screen hook (unchanged here); the other two have neither.
- **Does the Contact list need its letters, "+ Add an agent" or the group pills back somewhere while scrolled or
  pinned?** Pinned, it has no letter navigation at all now.
