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
