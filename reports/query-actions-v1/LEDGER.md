# Query actions v1 — ledger (P6)

One line per commit. Every piece of work is either on `main` or on a named held branch.

| Phase | Commit | Files | Pushed / held | Rebased on |
|---|---|---|---|---|
| P1–P3 + D1–D3 (inert) | ee6acd42 | 99 (drawer, controls, journeys, statuses sweep, shared-file additions) | pushed to main | b82a2d6f |
| Tier 1 live (D1–D3) | a0249261 | entry.ts, ResponseJourney.tsx, qaJourneys.measure.ts | pushed to main | 475b8482 |
| §R dev rules | 964fd791 | firestore.rules, tests/rules/queryActions.rules.test.ts | pushed; DEV rules deployed 18:36:33Z (release updateTime) | ee6acd42 |
| Tier 1 K1/K3/K5 | 07003139 | entry.ts, eventKeys.ts, labellers, OneScreenTasks, ManuscriptPage, useTaskPaneSession | pushed to main | a0249261 |
| DEV hosting deploy (Tier 1) | 07003139 | served index-BDWDRI_Q.js · index-C7yV4SAX.css | deployed from clean worktree; locks 6/6 on dev; packages page smoked | — |
| Tier 2 (D4, D5, card doors) | 3be073c0 | journeys, QcOpenCard, Queries.tsx, taskPrecedence, recordResponse | pushed to main | 07003139 |
| DEV hosting deploy (Tier 2) | 3be073c0 | served index-BuP41Fee.js · index-CUcQuCMB.css | deployed from clean worktree | — |
| Tier 3 (D6, D7, delete query, K3/K7, H8 widened, locks) | 4f763132 | 29 (journeys, entry.ts, snapshot, db tasks, board/calendar lanes, NudgeDesk/Modal/FocusFlow, qaLocks/qaSnapshot/qaShots) | pushed to main | 3be073c0 |
| CLAUDE.md section (shared file, own commit) | c767f11e | CLAUDE.md; corrects 4f763132's task-type list | pushed to main | 4f763132 |
