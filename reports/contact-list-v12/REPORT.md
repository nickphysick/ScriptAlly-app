# Contact list v12 — the card index. Morning report, 3 October.

**All six phases are on `main` and pushed — P1 `789341f1` · P2 `6f5194ef` · P3 `74f57c0d` ·
P4 `da30cf1a` · P5 `0acba57b` · P6 `dd81c3ed` — each committed after its own green, measured
phase, per the brief. No deploys were made.** The measurement worktree's preview is still
serving the finished build signed in at **http://127.0.0.1:4399** if you want to walk it; the
page is `/agents`, and the empty state shows by setting `__SA_LH_COUNT = 0` in the console (the
LH review aid) or on a blank account. Screenshots of every phase went to you as it landed.

The page now is: the full-painting hero with the v12 sentence and the average-reply clause →
the sticky A–Z index strip ("All · 37" on parchment, counts under the lettered cells) → the
head in the Query Centre's dress (dashed-underlined title, serif tally, value-carrying chips)
→ slate tab dividers over m4 dossier rows → Housekeeping in the slate. The empty state is the
v8 construction's first build: the three ways in, the ink banner, and two previews the page
renders live.

## The two false premises, as accepted

Both were accepted in the go-ahead and both held: the **empty state was a first build** (nothing
v8 drew had ever shipped — built page-scoped under `contact/`, oracle-exact save the stated
deviations below, with the lift-candidate note now in CLAUDE.md), and the **hero was a retune of
the living header**, not a new header (the archivist painting at native 1141, the sentence and
average-reply clause in `contactHeaderCopy`, the Discover secondary replacing the retired paste
pill).

## The two rulings, as applied

1. **Tokens:** the accent family is `--clv-slate / -pale / -tray / -ink` at the ruling's hexes;
   `--slate` (Pro) untouched; the accent law is in CLAUDE.md in your exact words. **And see the
   finding below — the family's declaration had a story.**
2. **The quick-add and the paste pill retired with the hero.** "+ Add an agent" opens the
   centred card directly everywhere, including the empty state's header; the pageHeaderV2,
   switcherV2 and livingEmpty locks were retargeted with dated notes and the app-shell session
   was told.

## The finding of the run: the accent family was declared nowhere, and two green runs never saw it

P1's commit message says the family "lands in the page's portal-safe set". Its diff never added
it — `git show 789341f1:…contactV11.css | grep clv-slate` is empty. My P2 summary repeated the
claim. When P3's divider tab and row strips first READ the tokens, both `var()`s dropped in
silence, the tab and every calm strip painted **transparent** — and §10.4/§10.5 went green,
because each lock's expected value was a probe of the same unresolvable token: **two nothings
agreeing**. What caught it was mutation F: turning the tab transparent on purpose changed
nothing observable and the lock stayed green, which is the tell the red-first discipline exists
to produce. The family is declared now, every colour lock on the page asserts its token
*resolves* before comparing against it, and nothing broken ever shipped — the reads were
uncommitted. The false records (P1's message, my summary) are corrected in P3's commit and in
CLAUDE.md.

A second latent v11 fault fell out of P4's locks the same way: **Housekeeping's tray title had
never painted its declared face**. It is an `<h2>`, brand.tsx forces heading faces with
`!important`, and "Housekeeping" rendered Playfair through all of v11 — on every screenshot,
read by nobody, me included. Mutation J's failure message names the brand serif verbatim. The
claw-back is applied there and, pre-emptively, to every heading in P5's empty chrome.

## Mock-wins divergences and stated deviations

- `surnameOf` is the oracle's own arithmetic: last word, `O' → O`, **no Mc/Mac handling** —
  the mock beat the prose. `#` (the nameless fallback) has a group but **no strip cell**, as
  the mock draws none: reachable in data, unindexed, accepted.
- The **marked letter is derived from rects on scroll**, not the brief's IntersectionObserver —
  the house IO-misses-are-permanent law, stated at the component. It is a scroll-spy: it marks
  letters passing the strip mid-flight by design.
- The narrow boundary is the mock's **720** container query (my in-flight plan said 700 —
  corrected to the oracle before anything shipped).
- The dividers' `scroll-margin-top` states the 8px landing **net of the grid's own 12px
  `scroll-padding-top`** — without the subtraction the divider lands at 20 (measured).
- The row's unqueried line keeps v11's **"Not queried yet"** inside v12's dress (the mock
  writes "Not yet queried"); a copy swap is one string if wanted.
- The torn slips' buttons read the mock's bare **"Add"** (v11 said "Add genres"), each with an
  aria-label naming which.
- The ways sit **below the shared header's rule**, not inside its card as the mock draws —
  LH7 holds the empty and populated headers to one shape, and that contract is the app-shell
  session's.
- The §3 **quiet Discover line is kept** at the empty page's foot; the oracle omits it, and
  dropping it would carve this page out of the living-headers contract for nothing.
- The previews' feet dissolve by **mask, not the mock's painted gradient** — the exhibition
  band is translucent white over the page ground, so no painted colour could match it.
- The banner rides **inside** the Example band so LH8's on-screen claim holds at 900 tall.

## Dispositions

- **The template tile downloads the real asset** (`/QueryHawk-pipeline-import-template.xlsx`)
  as a plain `<a download>`; the Smart-import tile takes the same bridge as the rail's Import
  entry. **The agents-only import sheet is still a later asset** (carried from v11).
- **`CountCards` is deleted** — P2 took the list mount, P5 the exhibit's; the strip indexes,
  it never filters, and the v11 tiles' pool-OR has no successor on purpose.
- **Prod Firestore rules remain yours to deploy** (carried from v11; dev is current).
- The LivingHeaders file leaves exactly **two 1280 copy rows with you**, as the app-shell
  session wrote: the many-branch sentence wraps to three lines in the 437px text block, and
  "148 agents on file" overflows by 5px at three digits. Their options: shorten the sentence;
  a Contact-scoped two-line reservation at ≤1360; or a shorter headline form. (Their finding-2
  fix — the `.ph-ms` line box — is on main and everything else is green for /agents.)

## Per-phase evidence

Every phase: tsc clean, production build clean, full Vitest green (8,237 at close, 511 files),
and the e2e locks run against the deployed worktree build — **natural red first against the
tip-without-the-phase build, green on the phase's build, then mutations, each red at its own
assertion and restored from path-derived backups in the measurement worktree.**

| Phase | Landed | Locks | Reds proven |
|---|---|---|---|
| P1 hero + doors | `789341f1` | §10.1 ×2 widths + the add-door case | natural red + the hidden-copy fix in pageHeaderV2 §4.6 |
| P2 strip + head | `6f5194ef` | §10.2 (census ×3 derivations, the landing, the mark, All), §10.3; retargets in pageHeaderV2/LH3/LIVING_HEADERS.md | natural ×3 files; mutations A (counts off), B (margin off → gap 0), C (un-stickied → strip at −404), D (tally underlined) |
| P3 dividers + rows | `74f57c0d` | §10.4, §10.5 (per-branch strips, clamp under stress) + 4 P2-era retargets | natural ×4; F (tab slate — red only after the family fix, recorded both ways), G (clamp off → 87.7 vs 35.1), H (late ink off) |
| P4 slate head | `da30cf1a` | §10.6 (token probes throughout) | natural; I (blush tray), J (claw-back off — names Playfair), K (active white off) |
| P5 empty state | `0acba57b` | §10.7 (anatomy, faces, downloads, previews, both doors driven) | natural (absence); L (q column shows), M (mask off), N (recommended pill plain) |
| P6 record | `dd81c3ed` | — | — |

**One mutation is honestly a non-red and is recorded as such:** E — removing the strip's
one-line height rule does **not** redden LH3 (a one-line 7px count is the same height at "1"
and "148"), so LH3's teeth on this page are its population check, which the strip-less natural
red proved. The Living-headers session was told in those words.

**And one process lesson, now in CLAUDE.md:** P2's runs were `-g`-scoped to its own cases, and
the full file's first run (in P3) surfaced four P2-era casualties that had been red undetected —
the two count-card cases, the row census pinned to the old default grouping, and the floating
bar raising its chip through a deleted tile. After a phase that changes defaults or removes a
surface, the whole suite runs before the phase is called landed.

Final state of the whole file: **30 tests, ~514 assertions, all green** on the finished build,
with the retired cases named in `tests/e2e/RETIRED-contact-v11.md`'s new v12 section.
