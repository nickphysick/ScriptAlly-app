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
