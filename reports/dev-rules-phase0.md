# Pack 1 Phase 0 — there is no divergence, and the seeder has been broken since the day after it was written

**Session** `dev-rules` · read-only · **DO NOT RUN PHASE 1'S DEPLOY.** There is nothing to deploy.

## The headline, and it corrects my own earlier report

`reports/dev-rules-divergence.md` — which I wrote — is **wrong on every count**. It claimed the
seeder was denied at its FIRST write (the manuscript), and concluded the deployed dev ruleset had
drifted from `main`. Established by bisection against the live rules:

| claim in that report | measured |
|---|---|
| the manuscript write is denied | **accepted** — including an exact reproduction of the seeder's own |
| the deployed ruleset has drifted from `main` | **no evidence of any divergence** |
| the rules would permit what the deploy refuses | `main` refuses the identical write, for the identical reason |

The denial is fully explained by a rule `main` and the deployed ruleset **agree** on.

## 1 · The diff, and the direction of each difference

**None found, and the method matters.** `firebase-tools` 15.22 has no command that prints a deployed
ruleset, this machine has no `gcloud`, and minting a token from the CLI's stored refresh token is
credential handling nobody asked for — so the deployed source was **not retrieved**. It was
characterised instead by what it accepts and refuses, one clause at a time
(`tests/e2e/rulesDiff.mjs`).

That is weaker than a diff and it is sufficient here, because the refusal reproduces against
`main`'s own text: **there is no behaviour to explain that `main` does not already explain.** If a
literal diff is wanted, it needs the Firebase console or an access token, and that is Nick's to run.

## 2 · The denying rule, quoted

`firestore.rules:653` — the agents' update allowlist. **`dateAdded` is not in it:**

```
allow update: if isOwner(userId) && isValidId(agentId) && isValidAgent(incoming(), userId) && (
  incoming().diff(existing()).affectedKeys().hasOnly([
    'name', 'agency', 'email', 'website', 'country', 'city', 'twitter', 'bluesky', 'instagram', 'socials', 'genres', 'mswlNotes',
    'starRating', 'submissionStatus', 'responseTimeWeeks', 'noResponseMeansNo', 'submissionMethod',
    'materialsWanted', 'lastCheckedDate', 'notes', 'agentNotes', 'requeryPreference', 'importedNeedsReview', 'setAside', 'fieldSources'
  ])
);
```

Measured, on `seed-agent-1`:

```
  keys whose value differs: dateAdded, lastCheckedDate
    stored dateAdded = "2026-04-14"  →  payload "2026-04-25"
  ❌ update { dateAdded } alone — permission-denied
  ✅ update { lastCheckedDate } alone
```

**And the rule is right.** The date an agent was added is not a thing a later write should rewrite.

### Why the seeder trips it

`seed.mjs` writes `dateAdded: iso(120 - i * 3)` — a date **relative to today**. `setDoc` without
merge is a full replace, so on an agent that already exists this is an UPDATE, and
`affectedKeys()` is a **value** diff. The day the seeder was first run, the recomputed value matched
what it had written. Every day after, it differs by exactly the days elapsed, `dateAdded` becomes an
affected key, and the allowlist refuses the batch — atomically, so all twelve agents fail together.

**It has therefore been broken since the day after it was first run, silently.** Nothing about it
is a divergence, and re-deploying rules would not have moved it a millimetre.

The manuscript survives the same treatment only because its own immutable-ish fields happen to be
absolute. `dateSent` on queries **is** allowlisted (`firestore.rules:685`), so the queries batch is
not exposed to this.

## 3 · Did the deployed ruleset hold anything uncommitted?

**No evidence that it holds anything at all beyond `main`.** Stated precisely: the deployed source
was not read, so this is an absence of evidence rather than evidence of absence — but every refusal
observed is one `main` produces too, and every acceptance is one `main` permits. There is nothing
left unexplained that a hidden rule would be needed to account for.

## 4 · What deploying `main`'s rules would break

**Nothing — and it would fix nothing either, so it must not run.** Phase 1's precondition ("the
deployed ruleset is strictly behind `main`") is not met, because the two are not shown to differ.
Deploying on this evidence would be a change made to test a theory, against shared infrastructure,
which is the opposite of this pack's purpose.

## What actually unblocks restoration

One line in `seed.mjs`: **`dateAdded` must not be recomputed on every run.** An absolute date makes
the seeder idempotent — the value never differs from what is stored, so it never becomes an affected
key. That is a fix to the seeder, not to the rules, and it is proposed rather than assumed here
because `seed.mjs` is shared infrastructure.

## Cross-session

⚠️ **Another session has uncommitted source in this tree** (`src/components/shell/WorkspacePageGrid.tsx`,
`.css`, `.test.tsx`), despite this pack's "nothing else may run in this tree". Nothing rules-related,
and this pack touched none of it — but the tree is not exclusive, and that is the same condition
that has blocked five deploys.
