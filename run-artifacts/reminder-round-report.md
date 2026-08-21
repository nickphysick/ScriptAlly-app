# To-do — the reminder, its task, and why no Close row renders

**Measured: 23 of 23 green, and ZERO "NOT RUN" for the first time in five rounds.**
`tests/e2e/deedRound.measure.ts` → `run-artifacts/deed-round.txt`.
**Screenshots:** `reports/reminder-round/` — the Close journey at 1440 and 1920, empty and complete,
plus the chase the reminder raised. **Nobody has seen these before.**
**Not deployed.**

---

## Phase 3's cause, at the top — it is the finding of the round

**No Close row rendered because the account had the rule muted. The derivation was never wrong.**

`replyTask` returns `"close"` for the fixture exactly as its own header says it will. The user
document carried:

```
mutedTaskRules: ["no_response_close", "dq_materials"]
```

…seeded by **`seedSetAside.mjs`**, whose own comment explains it picked `no_response_close` because
that is the rule the account's data can demonstrate. Its `--clean` removes them. **Nobody ran it.**
`taskSurvivesMute` then removed the task after the derivation had correctly produced it.

So a whole journey was unmeasurable for four rounds — reported NOT RUN three times — because of
**fixture residue on a shared account**. Nothing was fixed in the derivation, because nothing in it
was broken.

With the mute cleared: **Close 6**, and the journey passes every contract element on its first ever
measurement — the deed sentence, the three tiles, the sage story header with the status word, gating
on When alone, and the response-rate line verbatim.

⚠️ **And the first screenshot of it immediately found a real fault.** For a close, the strip read
**"This records Sent 21 August"** — the send grammar on a journey that is not a send. Every
non-note, non-bulk journey fell through to it. It now reads *"Closed as **no response**, today."*,
which is the distinction the form's own verbatim line spends a sentence on. **Four rounds of green
assertions never caught it, because the journey could not be rendered at all.**

---

## The allowlist answer for Phase 1

**No rules deploy, and no new field.** The brief suggested `writerNudgeDate` for symmetry with
`writerExpectedDate`; the repo's conventions say otherwise and say it better.

`Query.nudgeDate` already exists. Its declaration reads *"ISO — optional, set when a nudge reminder
is chosen"*. It is in `isValidQuery`, in the query update allowlist, and `recordMaterialsSent` has
accepted and written it all along. A symmetrical new field would have needed a deploy — **Nick's to
run, and he is out** — to say something the model already says.

---

## Per phase

| Phase | SHA | Result |
|---|---|---|
| 1 · reminder is a query field | `13c98652` | 8 seam assertions; no rules deploy |
| 2 · reminder becomes a nudge | `1a5e5c91` | 6 unit cases + measured Chase 2 → 3 |
| 3 · why no Close row | `13c98652` | **cause found; not a code bug** |
| 4 · fixture honesty | `13c98652` | re-runnable, verified twice |
| 5 · the law + recon correction | `<this>` | law already landed; recon corrected in place |

---

## What measurement caught that reading could not

**The reminder check was in the wrong place, and it made the feature unreachable.** It sat *after*
`if (now < deadlineMs + grace) return "none"` — so a reminder could never fire while the agency's
window was still open, which is precisely when a reminder exists to fire. "Chase them a week before
the six weeks are up" was impossible. Measured: a reminder a day past its date against a 52-week
window returned `"none"`.

**And the close strip**, above — found in a picture, not a test.

---

## False premises

1. **`writerNudgeDate` was the wrong name** — the field already existed under a better one.
2. **"Why no Close row" assumed a code fault.** It was fixture residue, and the code was right
   every time it was reported broken.
3. **A local marker on the user document is denied** — `thinCasesPriorMute` is not in `isValidUser`'s
   update allowlist, the same `affectedKeys` gotcha that forced delete-then-create. The fixture's
   restore memory lives in `run-artifacts/.thin-cases-restore.json` now, which is the right home
   anyway: a dev tool's note about what it borrowed, not a fact about the account.

---

## What the fixture does to the account, and how it gives it back

It **clears `no_response_close` from `mutedTaskRules`** — remembering whether it found it set, rather
than assuming — and `--clean` puts it back. `seedSetAside.mjs` may be measuring that mute
deliberately; it is exactly that stream, and this must not silently undo its work.

`--pro` and its restore work the same way.

---

## Concurrency

Other sessions were live. **No commit swept a foreign file** — the file count was checked on every
one (6, 3, 9). Nothing outside the pane, the To-do derivation and the fixture was touched.

Baseline before any edit: **tsc 0 · 6,126 passing · 0 failing**. Closing, in my own worktree:
**tsc 0 · 6,135 passing · 0 failing**. Every phase gated in its own worktree.
