# Submission packages v39.1 — report (28 Oct)

Branch `submission-packages-v39-1`, cut from the tip of `submission-packages-v39` (**287bcc55**). Ref:
`design-refs/submission-packages-v39-1/submission-packages-v39-1.html` (SHA 934c0dfa…), enrolled in `.refhashes.json`.

## 1 · False premises and deviations, first

1. **The dismissal store is per device, not per account.** The pack names the page-guide store; that store is
   `lib/pageGuide.ts` → localStorage `sa.guide.<page>`. The explainer uses it (`sa.guide.packages-explainer`), so
   dismissing it on one machine does not dismiss it on another. A per-account store would need a user-document field
   and a rules change; not done.
2. **The status pill is 28 tall at 1280, not 32.** The ref's own `@container sheet (max-width:1200px)` rule shrinks
   it (12.5px type, 28 tall). Built as the ref computes; L4 holds 32 at 1512, L3 holds 28 at 1280.
3. **The ref sets the new-package drawer's field labels in mono capitals** (NAME, WHO IT'S FOR, ICON, COLOUR,
   START FROM) — the v38 lock forbade mono capitals outside two named labels. The ref is the authority, so they ship
   as the ref draws them and pk38 L8 now names them as allowed exceptions, with "Your packages".
4. **The ref sets the "Start from" option names in the typewriter.** Part B allows the typewriter for the title and
   the open package's name only, so they are the serif (600, 15).
5. **"Absent on the empty page" cannot be shown on the harness account** — it has letters, so the brand-new page is
   unreachable without deleting the writer's materials. It is held by `materialsPageSmoke.test.tsx` instead.
6. **Kickers in the results band** ("RESULTS", "DOING BEST", "SENT THE MOST") are mono capitals in the ref and stay
   serif in the app — v38's ruling, untouched by this pack (it names only "Your packages"). Visible in 07.
7. **At 1280 with four live packages, "+ New package" wraps to a second row** (02-builder-1280). The ref has three
   labels and fits. No label goes under 200 (v39 L3); not changed.

## 2 · The Contact list's inset, from code

`src/components/agents/contact/contactV25.css:52` — `--cl25-w: min(calc(var(--hsheet-w) - 48px), 1200px)`, the
card centred on the sheet. The packages page states the same thing as an inset on `.p6`:
`--pk-in: max(24px, calc((100% - 1200px) / 2))` (`pk391.css`). Measured edges, header card = Contact list card = every
block (±1): 272–1248 at 1280, 276–1476 at 1512, 480–1680 at 1920. The navy band still runs the full sheet.

## 3 · What changed, by part

- **A + E** (phase 1, 44b18a16): one width; 48 / 24 / 96 spacing.
- **B + D + F** (phase 2, 38656b13): the typewriter on the title and the open package's name only (L2 counts two);
  "Your packages" mono 11px .18em, ink 60%; the serif sizes as listed; radius 16 cards / 8 controls, one shadow plus a
  1px ink-6% ring; the materials header `#fbf9f5` with a 4px `#5e2f3a` top edge, berry title, pink placeholder.
- **C** (phase 3, cea62cf1): the selected label is flat with a 3px bar inset 18, 9 below; the others at
  saturate(.75) / opacity .8, full on hover; one status pill — "Out with agents · {n} sent" + padlock, "Ready to send",
  "Draft · needs …" — green dot when out or ready. No overlaps at 1280 (L3 checks every leaf pair).
- **G** (phase 4, 963e26e3): the explainer strip, ✕ with fade and lift, dismissal saved, never returns.
- **H** (phase 5, 74a513b8): New package and Package details are the slide-out drawer (`p6-cx-drw`, the package
  drawer's frame); the header follows the chosen colour live; Escape and the scrim close it (escape stack,
  `pageModal`). Handlers, writes and validation unchanged. The form's CSS is generated from the ref
  (`scripts/pk391/`, prefix `pa-`); the 41 `.p6-pdlg` rules and `p6-pdin` were removed from `pk40.generated.css`.

## 4 · Counts

- tsc 0 · `vite build` clean (no error/warning lines) · Vitest **678 files, 10,624 passed, 3 skipped** (no worse than
  the v39 baseline, identical counts).
- E2E, final clean run: **45 passed, 0 failed** — pk391 (11 tests), pk39, pk38, pk26 (`e2e-final.txt`).

## 5 · Locks (tests/e2e/pk391.measure.ts) and red proofs

| Lock | Red against v39 (287bcc55) | Red by its break (`PK391_MUTATE`) |
|---|---|---|
| L1 width (1280/1512/1920) | 8/19 at each width | builder back to 48: 296 vs 276 |
| L2 two typewriter elements | 3/4 | label names typewriter: 6 elements |
| L3 hero | 8/26 | selected label ringed |
| L4 rhythm | 1/6 | explainer → labels 20 |
| L5 explainer | red (timeout: no explainer) | key forgotten on load: reload shows it |
| L6 drawer | red (timeout: no drawer) | header stays Harbour after Plum |
| L7 materials header | 1/3 | header back to white |

Proofs: `redfirst-v39-base.txt`, `mutation-proofs.txt`. Rewritten v39 locks: `tests/e2e/RETIRED-submission-packages-v39-1.md`.

## 6 · Screenshots

`app/` — all ten ref screens at 1512 and 1280, and 01 at 1920 × 1080 (21 files; `PK391_SHOTS=1`).
`side-by-side/` — 01 (1280, 1512, 1920), 02, 05, 07 (1280, 1512): `node scripts/pk391/sbs.cjs …`.

## 7 · Dev deploy

See the end of this file (filled in after the deploy).
