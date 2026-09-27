# Query actions v1 — ledger (P6)

One line per commit. Every piece of work is either on `main` or on a named held branch.

| Phase | Commit | Files | Pushed / held | Rebased on |
|---|---|---|---|---|
| P1–P3 + D1–D3 (inert) | ee6acd42 | 99 (drawer, controls, journeys, statuses sweep, shared-file additions) | pushed to main | b82a2d6f |
| Tier 1 live (D1–D3) | a0249261 | entry.ts, ResponseJourney.tsx, qaJourneys.measure.ts | pushed to main | 475b8482 |
| §R dev rules | 964fd791 | firestore.rules, tests/rules/queryActions.rules.test.ts | pushed; DEV rules deployed 18:36:33Z (release updateTime) | ee6acd42 |
| Tier 1 K1/K3/K5 | 07003139 | entry.ts, eventKeys.ts, labellers, OneScreenTasks, ManuscriptPage, useTaskPaneSession | pushed to main | a0249261 |
| DEV hosting deploy (Tier 1) | 07003139 | served index-BDWDRI_Q.js · index-C7yV4SAX.css | deployed from clean worktree; locks 6/6 on dev; packages page smoked | — |
