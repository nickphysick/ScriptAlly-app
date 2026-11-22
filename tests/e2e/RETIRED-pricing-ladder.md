# Retired by the pricing ladder (26 Oct 2026)

Refs: `design-refs/pricing-plans-ladder-v1.html` (desktop, wording) and `design-refs/pricing-phone-plans-v1.html`
(phone, layout A). Report: `reports/pricing-ladder/REPORT.md`.

| Lock | Why it went | What holds the claim now |
|---|---|---|
| `pricingMobile.desktop.measure.ts` (whole file) | It held desktop `/pricing` byte-identical to the pre-phone build. This pack changes the desktop on purpose (the ladder, the questions under the cards), so the lock's subject no longer exists. | `pricingLadder.measure.ts` PL-1, PL-2, PL-4, PL-5 at 1440 and 1280; `pricingV4.measure.ts` PV4-1…PV4-5 for the founding box. |
| `pricingMobile.measure.ts` PVM-5 (the swipe track) | The Free / Pro swipe track and its switch are deleted. | PL-3 (the pinned tabs) and PL-4 (no track). |
| `pricingMobile.measure.ts` PVM-9 (the copy) | It held the eight answers to the phone ref, three of which the ladder ref rewords. | PL-5, at both widths: the three changed answers from the ladder ref's wording panel, the other five from the phone ref, the tails, and the retired words. |
| `pricingMobile.measure.ts` mutation `stretch` | Its subject (the track's `align-items`) is gone. | — |
| `scripts/pricing-mobile-mutate.mjs` breaks `tiertap`, `tierswipe`, `copy`, and the tile half of `sheet` | Their subjects are gone, or moved to PL-5. | `scripts/pricing-ladder-mutate.mjs`. |

**Re-pointed, not retired:** PV4-3 (the fitting row is checked and flagged, instead of a navy tile), PV4-4 (the
row price and the Pro card's link carry the faces), PVM-6 (opened from the Pro card's link; ends at the close,
because PL-2 owns what "See it in the plans" does), PVM-7 and PVM-10 (scroll to the section, open from the
Pro card), and both files' opt-in screenshot passes.
