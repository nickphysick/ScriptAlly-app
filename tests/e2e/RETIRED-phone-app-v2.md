# Retired with Phone app v3 (11 Nov)

Below 768px the phone was rebuilt around six journeys (design-refs/phone-app-v3/). The navy band (`[data-pa="band"]`),
the floating tab capsule, the menu behind the initials, the v2 Home (`DashPhone`), the phone To-do page (`TodoPhone`),
the v1/v2 phone Queries (`QueriesPhone`), the v2 Agents list (`AgentsPhone`), the + sheet (`PhonePlusSheet`) and the
phone search page (`PhoneSearchPage`) no longer render. Every suite below opens its page through the band
(`openPhone` waits for `[data-pa="band"]`, `dm1Lib` / `qm1Lib` / `pr2Lib` for the v2 pages' own roots), so none of them
can run against v3, and each asserted a surface that is gone.

The new suite is `tests/e2e/phoneAppV3.measure.ts` (PA3-1 … PA3-11), with unit locks in `src/lib/phoneV3.test.ts`,
`src/lib/phoneV3Nav.test.ts`, `src/components/phone/v3/phoneV3Smoke.test.tsx` and the re-pointed
`src/components/shell/mobileShell.test.tsx`.

## Deleted files

- Phone app v2: `phoneAppV2Agents`, `phoneAppV2Flows`, `phoneAppV2Home`, `phoneAppV2Pages`, `phoneAppV2Pairs`,
  `phoneAppV2Queries`, `phoneAppV2Shell`, `phoneAppV2Sweep`, `phoneAppV2Todo` (`.measure.ts`).
- Phone round two and its fixes: `phoneRoundTwo`, `phoneRoundTwoDesktop`, `phoneRoundTwoJourneys`, `phoneRoundTwoPairs`,
  `phoneFixes`, `phoneLastScreens` (`.measure.ts`), and `pr2Lib.ts`.
- Dashboard on the phone v1: `dashMobileV1`, `dashMobileV1Pixel`, `dashMobileV1Shots`, `dashV118Phone` (`.measure.ts`),
  and `dm1Lib.ts`.
- Queries on a phone v1: `queriesMobileV1`, `queriesMobileV1Shots` (`.measure.ts`), `qm1Lib.ts`, and
  `qc152Phone.measure.ts` with `qc152PhoneDiff.mjs`.
- To-do on the phone v1: `todoPhoneV1.measure.ts`.

`pa2Lib.ts` is KEPT: `todoV53`, `todoV54` and `todoV55` (desktop To-do suites) import its ledger and helpers.

## Case by case, in substance

| What the retired suites held | Now |
|---|---|
| The band, its chip, initials and feedback ring; the tile band | **Rewritten: PA3-1** (≤ 76px at rest, ≤ 56px scrolled, none of the four in any header). |
| The floating, frosted, tucking tab bar | **Rewritten: PA3-3** (Today · Queries · + · Agents · You, docked to the bottom edge, white). |
| Home's hero, Up next, To-do card and Activity | **Rewritten: PA3-2** (content first) and **PA3-4** (one count: badge = Today's rows = the desktop To-do's own count; Queries' With you = Today's). |
| The phone Queries' chips, Your move groups and bands | **Rewritten: PA3-4** and **PA3-5** (no row says its status or group twice). |
| The phone pages' sideways-scroll sweeps | **Rewritten: PA3-6** at 360, 390 and 414 over every tab, pushed page, sheet and journey step. |
| The flows (log, reply, add agent) | **Rewritten: PA3-7** (the sample opens on the agent's ask, any amount, a start point), **PA3-8** (the slider), **PA3-9** (the agency rule and the full record). |
| The words sweeps ("late", "Overdue", dev labels) | **Rewritten: PA3-10.** |
| The desktop-unchanged checks of round two | **Rewritten: PA3-11** (Dashboard, Queries, Agents and To-do at 1512, DOM and pixels against the served branch). |
