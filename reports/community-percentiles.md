# Community percentiles — what a real pipeline would need

**Status: not built, and deliberately so.** The Package Workshop's Analytics tab has the presentation
layer for community comparisons behind `COMMUNITY_STATS_ENABLED`, which is `false`. This note records
what turning it on would actually require, so the decision is documented rather than rediscovered.

Nothing here is a plan or a commitment. It is the shape of the problem.

## What the design asks for

The reference (`design-refs/scriptally-packages-twotab.html`) shows three claim types:

- a KPI aside — "higher than **78%** of ScriptAlly writers"
- material pills — "TOP 10%", "BEATS 71%"
- the percentile track, with the writer's dot against a community median

All of those figures in the mock are illustrative placeholders. The mock's own header says so.

## Why it is off

There is no aggregation pipeline, and pre-launch there is no community to aggregate. A percentile
drawn from a handful of early users would be worse than silence: it would read as authoritative,
it would move wildly as users joined, and a writer would make real decisions about real submissions
on the strength of it.

## What building it would take

**1. Anonymised, opt-in aggregation.** Query outcomes are among the most sensitive things in the app —
who someone submitted to, and who said no. Aggregation would need explicit opt-in (not a buried
default), no per-writer identifiability in the aggregate, and a k-anonymity floor so a cohort can
never be small enough to single anyone out. The cohort floor already in the code
(`COHORT_FLOOR = 50`) is a display gate, not a privacy guarantee — a real pipeline needs its own.

**2. Cohort definition, which is where the honesty lives.** A raw "reply rate vs everyone" comparison
is close to meaningless, because the dominant variables are not the writer's materials:

- *Genre and age category.* Reply rates differ substantially between, say, upmarket book-club fiction
  and epic fantasy. Comparing across them measures the market, not the letter.
- *Agent selection.* A writer querying twenty well-matched mid-list agents and one querying twenty
  dream agents at the biggest agencies are not running the same experiment.
- *Agent no-response norms.* Some agents state that silence is a pass. A writer who queried ten of
  them has a structurally lower reply rate and a perfectly good submission.
- *Time.* Reply rates move with the market and the season. A cohort has to be windowed.
- *Sample size.* Both sides need a floor — the writer's own (`MIN_SENDS_FOR_CLAIM`) and the cohort's.

Without controlling for at least genre, agent no-response norms and time window, a percentile mostly
tells a writer which corner of the market they are in. That is not what the claim would appear to say.

**3. Causality discipline.** Even a well-built percentile is a RANKING, not an explanation. The code
enforces this in one place (`percentileSentence`), and it should stay that way: a package does not do
better *because* of a percentile, and a material in a requesting package did not *cause* the request —
it travelled with everything else in that package.

**4. Pro gating.** Comparisons across the community are a plausible Pro feature, which raises its own
question: if aggregation is opt-in and the comparison is paid, the writers contributing data are not
necessarily the writers who can see it. That is a product and fairness decision, not a technical one.

## How the code is arranged so this stays safe

- `COMMUNITY_STATS_ENABLED = false` — the master switch; nothing renders while it is off.
- `CommunityStatsSource` — the only interface a source may implement. Returning `null` is the normal
  answer, not an error.
- `placeholderCommunitySource` — the one implementation that exists. It answers `null` to everything.
  It is deliberately not a random generator and not a fixture curve: anything returning a number here
  would put an invented figure in front of a writer.
- `displayablePercentile()` — the single gate. Flag, non-null source answer, cohort floor and the
  writer's own sample threshold are all checked here, so a view cannot forget one.
- `communityStats.test.ts` — proves the surface cannot leak: with the flag off, no input produces a
  claim even from a source that answers everything generously.

Flipping the flag on with today's source changes nothing on screen. That is the intended behaviour.
