# ⚠️ SUPERSEDED AND WRONG — see `reports/dev-rules-phase0.md`

**Every claim below is false.** I wrote this, and bisection against the live rules (`dev-rules`
Phase 0, 23 Aug) refuted it point by point: the manuscript write is ACCEPTED, including an exact
reproduction of the seeder's own; there is no evidence the deployed ruleset differs from `main`
anywhere; and the denial is the agents' update allowlist omitting `dateAdded` — a rule `main`
carries identically, and a correct one.

The real cause was `seed.mjs` recomputing `dateAdded` relative to TODAY on every run, so on any
day but the first it became an affected key and the batch was refused atomically. Fixed; the
account restores, `seed-query-11` included.

**The reasoning error worth keeping:** "denied at its first write" was inferred from the absence
of the next log line, never verified. The write it named had never been tested.

---

# STOP THE LINE — the deployed dev ruleset has drifted from `firestore.rules` on `main`

**Found** 23 Aug, during Pack B Phase 2's rendered check · **not touched** — the packages session is
live in this tree and dev rules are its recent territory.

## The symptom, and why it is not a footnote

`node tests/e2e/seed.mjs` — the canonical restore for the dev harness account — **fails at its very
first write** with `PERMISSION_DENIED`. That write is one manuscript, `seed-ms-1`.

The consequence is the reason this is stop-the-line rather than a nuisance: **the harness account
can no longer be restored.** Every measurement that consumes a fixture degrades it permanently.
Pack B's commit check consumed all three Send cards in three runs and could not put them back.

## What has been ruled out

- **Stale rules.** `node tests/e2e/rulesProbe.mjs` reports the deployed dev ruleset **current** —
  every must-be-ACCEPTED case accepted, every must-be-DENIED case denied, across the backfill heal,
  the Noteboard colour and the querying-goals list.
- **An invalid document.** The account's manuscripts carry exactly the key set `seed.mjs` writes —
  `ageCategory, comps, genre, id, logline, shelved, status, statusChangedDate, title, userId,
  wordCount` — and every one satisfies `isValidManuscript` in the tree's `firestore.rules`. The
  update allowlist contains all of them.
- **A dirty tree.** `git status --porcelain firestore.rules` is clean; the tree's rules are `main`'s.
- **A bad id.** `seed-ms-1` satisfies `isValidId`.

So the tree's rules would permit the write and the deployed rules do not. **The deployed dev
ruleset is not the one in `main`.** The likely route is a dev rules deploy made from a tree holding
uncommitted rules changes — which the memory note about prod being two commits behind dev is
consistent with.

## The pack

Small, and **report before changing anything**:

1. Fetch the deployed dev ruleset and **diff it against `main`'s `firestore.rules`**. The CLI does
   not print the source, so read the release and its `updateTime` under `--debug`.
2. Establish **which is correct** — the deployed rules may be ahead (someone's undeployed work is
   in them) or behind. Do not assume `main` wins.
3. Report the diff and the judgement. Only then deploy, and **only** rules:
   `firebase deploy --only firestore:rules --config firebase.dev.json --project scriptally-dev`.
4. **Never as a side effect of another pack** — the file's own rule, and the reason this is a pack.
5. Re-run `seed.mjs` and confirm the account restores.

## Evidence to hand

- `seed.mjs` output: signs in, then `FirebaseError: 7 PERMISSION_DENIED` before its first log line.
- `rulesProbe.mjs`: full pass, dated 23 Aug.
- The account's manuscript key sets, read through the client SDK as the harness user.
