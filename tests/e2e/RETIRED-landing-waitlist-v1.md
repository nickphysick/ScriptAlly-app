# Retired with the waiting-list landing page (waitlist v1, 31 Oct)

The landing page became a waiting-list page (refs `design-refs/landing-mobile-v7.html`,
`design-refs/landing-desktop-v5.html`, `design-refs/birdseye-focus-v1.html` option 2). These
measurements held pages that no longer exist. Each is recoverable from the commit before its deletion.

Swept by the SELECTORS and copy the retired pieces were reached through (`mk-hp-*`, `mk-story`,
`mk-s3`, `mk-spimg`, `mk-vrail`, `mk-vision--navy`, `mk-ccpill`, `mk-ccmore`, `featureStoryLabel`,
`VISION_NAVY_*`, `CLOSE_LINK`, `HeroPhone`), not by filename.

## Phase 1 — the phone page

| File | Measured | Why retired |
|---|---|---|
| `landingHeroMobile.measure.ts` | the phone hero's pile, pull-up sheet and fly-past (ref landing-hero-mobile-v3) | `HeroPhone` and its sheet are deleted; the phone hero is navy with a form |
| `landingMobileV1.measure.ts` | v1's swipe strip and the founding strip (ref landing-mobile-v1) | superseded long before; its subjects are gone |
| `landingMobileV2.measure.ts` | the sticky-picture feature story and the join bar's v2 rule (ref landing-mobile-v2) | `FeatureStory` is deleted; the join bar's rule changed |
| `landingMobileV3.measure.ts` | one feature per flick, the page snapping (ref landing-mobile-v3) | no snapping, no sticky picture |
| `landingMobileV4.measure.ts` | the navy vision carousel and "Read our story →" (ref landing-mobile-v4) | `VisionNavy` is deleted; the page links nowhere but Privacy |

The new page's laws are held by `tests/e2e/landingWaitlist.measure.ts` (LW-1 … LW-6).

## Phase 2 — the desktop page

| File | Measured | Why retired |
|---|---|---|
| `landingHeroV3.measure.ts` (LH1–LH20) | the 1280-frame hero: its sub, the pile's loop and entrance, the fly-past and cast shadow, the carded layout, the counter under the actions | the hero is now the ref's white card with a form and the binocular hawk; the pile is feature row 2, played once |
| `heroWording.ts` | the init script `landingHeroV3` used to collect the pile's words | its only importer is retired |

Two of `landingHeroV3`'s claims are wider than the hero and are still held elsewhere: LH17's "no page
says 100 places" by `src/marketing/offerCopySweep.test.ts` (on every copy file), and LH20's "an agent
is named, never she or he" by `agentRef` and its locks in `landingCopy.test.ts`.

`landingColoursV2.measure.ts` is **kept**, cut to the laws that still have subjects (N1, N2, the
heights half of N3, S1, V1, F1, F2, T1). Retired from it: H1 (the old hero's ground), the anchor
half of N3 ("See how it works" → `#pulse`), their mutations (H1, H1p, N3s, V1p) and the retired
selectors in its capture list.
