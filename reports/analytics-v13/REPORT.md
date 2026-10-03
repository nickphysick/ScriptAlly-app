# Analytics v13 — run report (3 Oct)

Branch `analytics-v13`, worktree `../ScriptAlly-analytics-v13`, off `origin/main` @ `da30cf1a`. **Not merged, not pushed, not deployed** (rule 4).
Ref: `design-refs/analytics-v13.html`, SHA256 `dcc58775…3a38f`, 37,629 bytes.

## False premises

1. **"`design-refs/analytics-v13.html`" was in the repo.** It wasn't. `~/Downloads/analytics-v13.html` matches the prompt's hash and size, so I committed and enrolled it.
2. **"This supersedes `cc-prompt-analytics-v2a.md` (never run)."** v2a *did* run. It was merged on 29 Sep (`bebf63a0`) and deployed to dev. Living headers v3 then put a living header on top of it (`2c0cd923`). This pass replaces both on this page.
3. **"The ref is the oracle" — but the ref does not style its own figure frame.** `.fig`, `.fh`, `.key`, `.two`, `.chap.white`, `.n` and `.nm` are used in its markup and declared nowhere in its `<style>`. Rendered, it shows no white containers, a stacked two-up and an unstyled key. The prompt's baked decisions are the spec for those parts.
4. **"Share of 27: asked for more / no reply yet / closed for silence / withdrawn."** Those four sum to 27 only because the ref's data has no cold rejection. Real data has cold rejections, so the bar adds **"passed on the letter"**. The requests bar likewise adds **"requested, not sent yet"**. Both bars are locked to sum to their population.
5. **The ref's caveat "no reply is … left out of the rates until they close."** That is false for this page's rate: requests ÷ queries sent counts still-out queries in the denominator. The note now says what the code does.
6. **"Sized to the viewport so … the paragraph, the grid and the button are all visible on load" at 1440×820.** This app's scrollport is 684px at 820, against 710 in the ref. The grid also has a 44px bottom hem that washes whatever sits under it. So at 1440×820 the paragraph hides — by measured overflow, not a guess — and the headline, the 2×2 grid and the button all fit clear of the hem. At 1920×1080 the paragraph shows.
7. **"Dev showed a median wait of 434 days from 2 responses."** Not on this build. See §F below.
8. **"Screenshots on dev."** Rule 4 forbids deploys, so the screenshots come from a local `vite preview` of `build:dev` against the dev Firestore (harness account).

## 1. Gates, baseline → final

| | Baseline (`origin/main` @ da30cf1a) | Final |
|---|---|---|
| tsc | 0 errors | 0 errors |
| build | exit 0, clean | exit 0, clean |
| Vitest | 511 files · 8,237 passed · 3 skipped | 511 files · 8,244 passed · 3 skipped |
| Playwright `analyticsV13.measure.ts` | red at its first check (page absent) | **70 checks, 0 failed** |

## 2. Step 0

The full answers are in `STEP0.md`. In summary:

- **A.** Shell v3 had landed (gate passed). The page carried v2a plus a living header; both are replaced. `/queries/analytics` stays in `LIVING_ROUTES`, which keeps the page name in the bar's breadcrumb.
- **B.** The active manuscript comes from the localStorage key plus re-navigation, and the page keys on `useLocation().key` (gate passed).
- **C.** Every figure is derivable. Nothing had to be left out. One fallback: a reply with no log rung falls back to the query document's own dated incoming rungs (carried over from v2a).
- **D.** The time-range control and Export are removed (the ref has neither). Export had never worked. **Nick to decide whether either comes back.**
- **E.** See §4 and `tests/e2e/RETIRED-analytics-v13.md`.
- **F. Seed.**
  - *Harbour of Glass* (the default manuscript): 8 queries · 3 requests · 2 fulls · 0 offers · 1 dated reply against a window (3 from agencies that state none) · first query 3 Mar 2026.
  - *The Smoke Test* (`seed-ms-1`): 57 queries · 21 requests · 14 fulls · 1 offer · 25 dated replies · first query 18 Apr 2024 ("898 days" — the old seed-date fault is still real).
- **G. Tokens.**
  - The five state fills are `:root` `--state-*`; anthracite is `--sp-anthracite`.
  - The ref's rust `#b4553f` has no token. The page uses `--o-ms` (#8a4a3c), which is the ref's own CSS `--rust`.
  - The anthracite steps are drawn as opacity on `--sp-anthracite`, as the ref's funnel does.
  - The placeholder tint → `--state-you`.

## 3. Per phase

| Phase | SHA | Measured |
|---|---|---|
| P1 data layer | `b376347f` | unit (44 model tests) |
| P2 harness | `4d1cd906` | red against main (page absent) |
| P3 scaffold | `7c74b8b0` | rendered 1440×820 (found: button clipped; fixed) |
| P4 funnel + sent | `192bf72b` | rendered |
| P5 rate + reply window | `0b3e14f1` | rendered (found: share label clipped; fixed) |
| P6 wait times | `a908f577` | rendered (found: two-up offset, rust rendering ink; fixed) |
| P7 lanes + caveats + full run | `bb4592d3` | **66/66** |
| lock proofs | `2fcfacf6` | 18 mutations; harness tightened; **70/70** |
| finish | this commit | empty-state examples stacked; final run **70/70** |

## 4. Every lock, proved red

Each lock was broken by a targeted mutation in the worktree, built, measured, and restored from a backup with its hash verified (`mutation-proofs.jsonl`, `mutate.mjs`):

| Lock | Mutation that turned it red |
|---|---|
| `feature-fits` | +200px |
| `feature-max-760` | cap 1000 |
| `feature-clear-of-hem` | hem term removed |
| `button-visible` | button pushed 400px down |
| `feature-text-whole` | paragraph forced on |
| `no-living-header` | `.ph` added |
| `seven-sections` | section renumbered |
| `white-containers` | white dropped from section 3 |
| `caveats-last` | element after section 6 |
| `figure-0-present` | funnel unmounted |
| `figure-0-marks` | marks hidden |
| `nav-seven` | one dot removed |
| `nav-on-screen` | nav pushed outside |
| `take-a-look-scrolls` | scrolls to section 2 |
| `nav-tracks-0` | IntersectionObserver silenced |
| `nav-tracks-3` | active state latched on the first section |
| `tooltip-on-hover` | `show` emptied |
| `no-burgundy` | `#7c3a2a` on a reading |

**Found by the proofs:** the first `button-visible` stayed green with the paragraph forced on. The text column is centred, so overflow clips the *top* (eyebrow, headline) while the button stays inside. The fix was to require the button inside the container's own box and to add `feature-text-whole`. Both are re-proved red.

**Not separately mutated:** `page-present` / `population` / `*-present` counts beyond section 0, `figures-populated`, `tooltip-population`, `no-burgundy-population`, `feature-parts-population`. These are population preconditions, not properties.

## 5. Controls omitted

- **Export** — never worked; not in the ref.
- **Time range** (All / 6m / 3m) — not in the ref.
- **The ref's segmented controls** — its CSS has `.seg` but it renders none.

## 6. Deferred (escalated here, not in comments)

1. **Merge to `main` and the dev deploy** — both yours.
2. **The census suites** listed in `RETIRED-analytics-v2a.md` — still not re-pointed.
3. **Nothing on this page shows the "no window stated" replies**: 3 of 4 on *Harbour of Glass*.
4. **The lanes on a long history** (*The Smoke Test*: 57 rows over 898 days) draw one 20-unit row per query, about 1,100px tall. No cap, by design (every query is a mark). It may want a fold.
5. **`lib/analyticsModel.ts` still computes the v2a-only blocks** (`story`, `hero`, `journey`, `volume`) — now unread by any component. Their tests keep them honest; they need a sweep.
6. **The `--o-ms` rust is darker than the ref's chart rust `#b4553f`.** A token for the chart rust is Nick's call.

## 7. Screenshots (local `build:dev`, 1440×820 unless named)

- `theme-cappuccino*.png`, `theme-bold*.png`, `theme-editorial*.png` (theme class swapped in the DOM)
- `seed-ms-1*.png` (every section)
- `page-1920*.png`
- `empty-state*.png` (`seed-ms-empty`)
- `skeleton.png` (held with `__SA_QC_HOLD_MS`)
- `phase*.png`
