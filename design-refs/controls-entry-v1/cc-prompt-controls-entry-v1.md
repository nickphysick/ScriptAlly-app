# Controls: entry v1 — the reply that sits between steps

One concern: a new kind of step on a query, for a reply from the agent that does not move the status (a chaser, a holding reply, a note). This prompt builds the data, the rules and how both cards show it. It adds no way to create one from the app; "Controls: journeys v1" does that next.

## Global rules
- Work in your own worktree on branch `controls-entry-v1`, cut from the branch dev serves. Deploy to dev only. Nothing merges to main. Prod is untouched.
- `git commit --only -- <explicit paths>`. Never `git add -A`. One commit per phase.
- Record baseline tsc, build and Vitest before any edit. The gate is "no worse than baseline".
- UK spelling. No "he" or "she" for an agent: first name, or "the agent".
- The design ref is the oracle: `design-refs/controls-entry-v1/controls-v2.html`
  SHA256 `bf56e07956d34c7f21a1b8af4c6f4193bd37a6058d19a966dce29bafe54ec001`
  If the file is absent or the hash differs, STOP and report. Commit the pack to `design-refs/controls-entry-v1/` first.
- Port the ref's `.oc`, `.oc-note` and `.oc-sub` rules wholesale onto the card's existing bubble part. Read every other value from the code.

## Step 0 — recon, then report before editing
1. Confirm Record a response v2.1 is on the dev line. If not, STOP.
2. Find where v2 left out the "Something else" reply, and the database rule that blocked it. Name the rule.
3. Read `recomputeQuery`: how it derives status, last heard, the send-by and reply-expected dates, the nudge and Gone quiet.
4. Name the parts that draw the Tracking thread, the Notes tab's agent words, the Agent tab's "Last heard", and the agent card's History and Notes.
5. Say whether Agent history v1 (the "Everything / Correspondence only" switch) is on the dev line.
6. List every place a reply is counted: response rate, response time, the Dashboard's "replies in", the Responses tally.
STOP and report if any premise above is false. Name false premises at the top of the report.

## Phase 1 — the entry type
- Add one activity type to the activity log, named to fit the existing ones. Fields: from the agent; the date on their email; kind (`chaser`, `holding`, `note`); their words (optional); a new date (optional).
- Make the rules change that allows it. Deploy rules to dev only.
- `recomputeQuery` stays the single writer. For this type it never changes status. It sets last heard. With a date, it moves send-by when the query is with the writer, or reply-expected and the nudge when it is with the agent. It resets Gone quiet.
- It is corrected only through `editActivity` and `deleteActivity`.
- Tests: prove each goes red with the derivation removed.

## Phase 2 — where it does not count
- Exclude the type from response rate, response time, "replies in", the Responses tally and the day count.
- Each test must first prove its population is not empty.

## Phase 3 — the query card
- Tracking: a small note between steps, as the ref's "A small note between steps". Title, the date line when there is one, their words, the date.
- Band, track and status: unchanged. Footer: only the date line changes.
- Agent tab: "Last heard" shows the latest reply from the agent of any kind, with what it was.
- Notes tab: their words are listed with the phrase for the kind.
- The entry edits and deletes through the card's existing step editing.

## Phase 4 — the agent card
- History: the same small note, shown under "Correspondence only" as well as "Everything". If Agent history v1 is not on the dev line, add it to whatever History draws steps with today and say so.
- Notes: their words, read-only, as for any reply. Footer date as on the query card.

## Phase 5 — verify, do not build
- The Queries page card's "Next" date and the to-do task's date follow from Phase 1. Measure both on the rendered page.

## Baked decisions — do not reopen
- One type, used whichever way the query is facing.
- It is drawn as a small note between steps. Not tucked under the request, not a full bubble.
- No status of its own, ever.
- "Asked for something different" is not this type. It is an ordinary request step and moves the status.
- Titles: "{First} chased the partial / the full / the revision", "{First} sent a holding reply", "{First} sent a note".
- Notes phrases: "when chasing the full", "in a holding reply", "in a note".
- Date lines: "Send by {Fri 4 Dec}", "Reply expected by {15 Jan}".
- StatusDot is imported, never recreated. No verdict words. No green.

## Do not touch
- Manuscripts page files. The public landing site. The Log a query and Add an agent journeys. Anything on main. Prod rules.

## Final report
- False premises first. Then, phase by phase: what landed, what was measured, what went red before it went green.
- The exact rules change, written out, as an action for Nick to deploy to prod.
- Anything deferred, named, with an owner.
