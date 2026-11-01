# Landing page — waiting-list edition v2 (1 Nov 2026)

Refs: `design-refs/landing-mobile-v17.html` (phones, ≤760px) and `design-refs/landing-desktop-v14.html`
(desktop, "Alternating bands"). Built on `main`, direct, in three phases plus three follow-up commits.

## False premises, first

1. **"Nick commits these first."** The pack was not in the repo. It was in `~/Downloads/landing-waitlist-v2-pack.zip`.
   All four SHA256s matched the prompt, so I committed them myself (`848f632d`) and enrolled both refs in
   the design-ref watchlist.
2. **`main` was 3 commits behind `origin/main`** (Nick's double opt-in messages, "no Google Analytics and no
   cookie banner", a live-verify fix). Pulled before Step 0.
3. **The ticket's fourth get.** The phone ref reads "An Early Bird discount for the writers you invite…";
   `FOUNDING_GETS` reads "An exclusive Early Bird discount…". The prompt says those strings don't change, so
   the ticket keeps "exclusive" and bolds "An exclusive Early Bird discount", as the prompt lists.
4. **The desktop nav said "Become a Founding Writer"** (capitalised, from `marketingNavState`). The pass now
   says the CTA's own words, "Become a founding writer". Two locks asserted the old label and were re-pointed.
5. **The refs still give the Birds-eye hawk a side fade.** `main` wins: fully opaque, standing on the navy
   header's bottom edge, on both layouts.
6. **The desktop ref's window has 7 rows; the phone ref's has 8.** Both are drawn as their refs draw them,
   from the same `BE_DESK_ROWS` (the desktop takes the first seven).
7. **"Keep `TrackFeature` exactly as v1 built it" and "no blush panel" disagree on phones.** v1's hawk
   coordinates were tuned for the panel's clip; without it he ran ~20px off the screen with his feet showing.
   He now stands where the ref puts him (226, 272, 140 wide). The card and its story are unchanged (`64f9a866`).
8. **Step 0's known red (`landingOnly` C3 at `/pricing`)** was from copy on the dev chain, not on `main`. On
   `main` it is green.

Step 0.4 passed: `BirdsEyeFocus` takes a `layout` prop. The layouts differ only in three CSS sizes, the name
cell and where the detail card sits. There is no second copy of the window.

## Gates

| | Baseline (after pull) | Final |
|---|---|---|
| tsc (app) | 0 errors | 0 errors |
| tsc (functions) | 0 errors | 0 errors |
| Vitest | 653 files · 9,978 passed · 3 skipped | 653 files · **9,983** passed · 3 skipped · 0 failed |
| Production build log | no errors or warnings | no errors or warnings |
| LW suite (public, local production build) | v1's LW-1…LW-6, LW-F | **22 passed** (LW-1…LW-12, LW-F) |
| `landingOnly.public.ts` | — | 13 passed |
| `landingColoursV2` V1 | asserted the stone band | passed (navy) |

## Commits

| | |
|---|---|
| `848f632d` | the pack (two refs, two images), refs enrolled |
| `c16f086a` | Phase 1 — the phone page |
| `9b6378c5` | Phase 2 — the desktop page |
| `734c31a3` | fix found by LW-4: the desktop card pile starts when its *frame* is seen |
| `21b06ff9` | Phase 3 — the LW locks |
| `64f9a866` | the phone track hawk where the ref puts him |
| (this commit) | the report and screenshots |

## What changed

**Phones (`LandingPhone`)**
- **The hero** is a navy drawer with rounded bottom corners, a soft shadow and a grab line. Its height is
  measured, not fixed. The page reads how far below the drawer's foot the Birds-eye heading sits, and sets the
  drawer's min-height so the heading and its rule show with 20px clear. Measured: 20px at both 390×844 and
  430×932.
  - "Smarten your search with QueryHawk." is followed by "See what it does ⌄", which scrolls to the heading.
- **The Birds-eye view** comes first: the heading, then `BirdsEyeFocus` in its phone layout, then the ticks in
  a soft panel.
  - The window has a 78px names column, with Eleanor's first name over her surname.
  - The detail card is under the window, tucked over its bottom-right.
  - The hawk's head peeks 13px into the first screen at 390×844.
- **The details banner**: the portrait straddles the band's top edge, "at-a-glance" is held on one line, and
  the six pills are a 2×3 grid of in-page anchors.
- **Every feature is format C**: the heading over a 44×3 navy rule, the line, the picture, then the ticks in a
  soft panel. Bands alternate `#f4ede3` / `#fbf6ef`. The agents line strikes "query" in rust; the struck word
  is `aria-hidden`.
- **The mission** is a sideways carousel of three cream cards. Each card fills the content width, and the
  carousel is the page's only scroll-snap. The dots follow the scroll position.
- **The founding pass** (`FoundingTicket`):
  - The stub states "No. N of 50", where N is `claimed + 1` from the store, or shows the label alone when the
    count hasn't loaded or the cap is reached.
  - The tear line has a notch at each side, and the four gets have their lead phrases bolded.
  - `FoundingSignup`, its `source` and the counter are unchanged. `JoinBar` now watches `.mk-tkt`.

**Desktop**
- **Nav**: `NavPass` is a see-through pill. Under its label sits a 4px bar whose blush fill is the share of
  places taken, from the same reading as `HeroPlaces`. The bar holds its space, invisible, until the count
  arrives. Pressing the pill scrolls to the founding band.
- **The Birds-eye band** sits under the hero, at the hero card's width.
  - Measured: the window is exactly the card's width (1136px at 1280, 1156 at 1440 and 1920).
  - The heading stays on one line at all three widths.
  - The window has 230px names, 48px rows, a 52px date row and the 136px hawk. The detail card sits inside the
    window's right side, with its pointer on Eleanor's row.
- **The details banner**: navy, with the text in a 760px column, glossy pills, and the 400px portrait behind
  them on the right.
- **Feature rows**: 36px headings over a 52×3 navy rule, the 19px line, a hairline and blush-disc ticks.
  - Each row carries its pill's anchor.
  - Each row sits on its own full-bleed band (84px padding, no hairline between rows). The band is the row's
    `::before`, inside the features band's isolation.
- **Vision**: navy with 36px top corners, pulled 36px over the last band, so no page ground shows between them.
  The heading is cream.

**Retired, by name**
- **Components:** `BirdsEyeShowcase` and all its CSS (`.mk-bew-*`); `FoundingClose` (the file is deleted).
- **Exports:** `FEATURE_STORY`, `WAIT_AGENTS`, `VISION_NAVY`, `BE_TITLE`, `BE_PHONE_START`, `BE_PHONE_EVENTS`,
  `BE_STAGE_NAME`.
- **Renamed exports:** `BE_LINE_PHONE` and `BE_LINE_DESK` are now `BE_LINE` (desktop only), and
  `MISSION_EYEBROW` is now `MISSION_HEADING`. All seven retired names and these three old names are asserted
  absent.
- **CSS:** the desktop Birds-eye row (`.mk-befcell`); the `.mk-frow + .mk-frow` hairline.

**Added**
- **Exports:** `PHONE_FEATURE_ORDER`, `featureAnchor`, `SEE_WHAT`, `DETAILS_*`, `PASS_LABEL`,
  `passNumber`/`passOf`, `FOUNDING_GET_LEADS` and `TickItem`.
- **Components:** `BirdsEyeBand`, `NavPass`, `DetailsBanner`, `FeatureLine`, `PageAnchor`/`scrollToId` and
  `DiscTick`.
- **`FEATURE_ROWS`** gains `points` and `strike`. It is one copy set for both layouts; phones show the rows in
  their own order.

## Locks — red, then green

Every red below is a named break (`LW_MUTATE=<name>`) run against the build it guards. Each failed naming its
reason; none crashed.

| Lock | Green reading | Red (break → reason) |
|---|---|---|
| LW-1 | 390: 17 controls, 1440: 15; only Privacy leaves; 8 / 7 in-page anchors, every target present | `LW1` a pill to `/about` → "only Privacy may leave the page"; `LW1b` an anchor to `#mk-f-nowhere` → "#mk-f-nowhere's target is on the page" |
| LW-2 | html `none`; snappers `["mk-vc"]`; 0 sticky of 780 | `LW2` html snaps → "html's scroll-snap-type y"; `LW2b` a second snapper → "the mission carousel and nothing else" |
| LW-3 | top hidden · mid **shown** · pass/FAQ/foot hidden | `LW3` → "hidden over the hero" |
| LW-4 | holds at 40%, plays at 100%, both layouts; reduced motion finished and still | **a real fault**: the first run failed "…and plays once seen" at 1440 (the pile's root was 25% on screen); fixed in `734c31a3` |
| LW-5 | 1 line, ink 1056 ≤ box 1156; window 1156 = card 1156; 0 cards in the hero | `LW5` → "one line"; `LW5b` → "window 1036 vs hero card 1156" |
| LW-6 | pile 595.2 vs illustration 620.3 (−4%) | `LW6` → "pile 381.1 vs illustration 620.3" |
| LW-7 | 390×844: heading 749→824, 20px clear; 430×932: 837→912, 20px clear | `LW7` (drawer 860px tall) → "≥16px clear below the heading's rule" |
| LW-8 | 246 elements at 390, 232 at 1440; none uppercase | `LW8` → the deep-equality list names the offenders |
| LW-9 | every target lands at 48–64px from the top, both layouts; path stays `/` | `LW9` → "Query tracking lands at the top" |
| LW-10 | three cards, each 342 = content 342; one in view at rest, the second after a swipe | `LW10` → "card 273.6 vs content 342" |
| LW-11 | six bands alternating, each 0→1440; the pixel 10px above the vision band is `rgb(251,246,239)` | `LW11` → "rgb(242,238,232) is … not the page ground"; `LW11b` → "row 1 draws its band" |
| LW-12 | unloaded: "Founding writer pass"; loaded 13/50: "No. 14 of 50"; full 50/50: label alone | source mutation (`nextPlace` falls back to No. 14) → the unloaded and full cases fail; the loaded control stays green; reverted with no diff |
| LW-F | the faces as the ref, nine pieces | `LWF` → ".mk-wl-strap" |
| landingColoursV2 V1 | desktop band `rgb(27,36,51)`, three white cards; phones show the mission's three cards | `LC2_MUTATE=V1` → expected navy, received white |

## Things to know

- **`/welcome` reads `--mk-blush`, and nothing declares it** (`welcome.css` line 194). The token sweep found
  it once `welcome.css` was counted as a reader, which was needed because it is now `--mk-stone`'s only reader.
  That page is outside this pass. The sweep holds `welcome.css` as a reader only, and says why.
- **The places bars and the pass's number are absent in every local screenshot except the one marked MOCKED**,
  because a local build has no count endpoint. On dev and live they show the real count.
- **The desktop band's heading uses `nowrap` from 1280px up** and balances onto two lines below that. At 1280
  it fits with no overflow (measured: ink width equals box width).

## Screenshots (`shots/`)

Phone 390×844:
- `phone-390-01-first-screen`, `-02-birdseye`, `-03-banner`, `-04-feature-track`, `-05-feature-agents`
- `-06-mission-card1`, `-07-mission-card2`
- `-08-ticket-no-count`, `-08b-ticket-MOCKED-count-13-of-50`
- `-09-questions-footer`

Phone 430×932: `phone-430-01-first-screen`.

Desktop 1440×900:
- `desk-1440-01-nav-hero`, `-02-birdseye-band`, `-03-banner`
- `-04-row-track`, `-05-row-agents`
- `-06-feature-to-vision`

## Dev

Deployed to dev on the dev-chain branch. The URL and the served bundle are in the closing message.
