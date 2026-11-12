# Retired with Phone app v4 (11 Nov 2026)

`tests/e2e/phoneAppV3.measure.ts` (PA3-1…11) measured v3's slim header, docked bar, 92% query sheet, five-step log
journey, the "Your list | Discover" switch and v3's You page. Phone app v4 replaces every one of those screens, so its
selectors (`[data-pa3="header"]`, `qsheet`, `plus-log`, `logto`, `yseg`, `going-figure`, `qview`, `addagent`…) no
longer exist. Its subjects are measured again by `tests/e2e/phoneAppV4.measure.ts` (PA4-1…11):

| PA3 lock | Now |
|---|---|
| PA3-1 header, PA3-2 content first | PA4-1/2 per screen; the root pages draw their own header |
| PA3-3 docked bar | the v4 bar (tucks on scroll); PA4-2 targets, PA4-8 reachability |
| PA3-6 overflow | PA4-3 (nothing past the right edge, at 100% and 125%) |
| PA3-7 journeys, PA3-8 chips/slider | PA4-7 (the quick log, the same writer and record) |
| PA3-9 add-agent record | the add form is v3's, unchanged; not re-measured by v4 |
| PA3-10 words | PA4-9 |
| PA3-11 desktop | PA4-11 |

The ledgers and pairs stay in `reports/phone-app-v3/` as the record of what v3 measured.
