# Pack — the desk chassis and the sheet's shape (for the Query Centre session)

**Filed by the Calendar session under the v65 §E ruling.** The ruling settles a question that was
open between two streams: **the desks are the shared component.** `NudgeDesk`, `MarkSentDesk`,
`RespondDesk` and `MarkClosedDesk` are the app's four writes and stay the only implementation;
there is no Action sheet, and `design-refs/action-journey.html` is read as **the specification the
desks conform to**, not a fifth thing to build.

The desks are yours. **This pack asks; it does not touch them.** Nothing in
`src/components/queries/` was modified by the Calendar session — the audit below was taken by
reading.

---

## 1 · What the Calendar has already built for you

`requestAction(kind, subject, prefill)` in `src/components/todo/TodoCalendarPage.tsx` is the single
door. **Every** action entry point on the Calendar goes through it — the bar's action button
(calm, urgent and task), the click card's action, and all six drawer rows — and it currently
reports the press and **writes nothing**. Its body is three lines with the call site you need
written above it as a comment:

```ts
const requestAction = (kind: ActionKind, subject: ActionSubject, prefill?: ActionPrefill) => {
  /* the QC chassis's call site, when it lands:
       openDesk(kind, subject, prefill)   — mounts DESK_FOR_KIND[kind] in CorrectionDesk's chassis */
  setActToast(prefill?.deed ?? kind);
};
```

`src/lib/actionKind.ts` is the shared vocabulary, unit-locked (`actionKind.test.ts`, 11 cases):

- `ActionKind` = `nudge | marksent | respond | closed | task`
- `DESK_FOR_KIND` — the one desk that owns each kind, **by name**, so a lock can resolve it
- `actionKindFor(facts)` — the resolver, which reads **`getPrimaryAction(status).kind`** rather
  than a second status table (asserted over the whole `QueryStatus` enum, so a status added later
  cannot quietly resolve to the wrong desk)

Two locks are already standing and were proved red: **exactly one component per kind exists
anywhere in `src/`**, and **no `ActionSheet` component exists**. If a chassis lands that mounts a
desk on the Calendar, `calSeam65.measure.ts`'s "no desk mounted" assertion is the one to retarget —
it names itself in its own failure message.

## 2 · What the ruling asks the desks to gain

### 2a · A modal chassis, mountable from any page

`CorrectionDesk` is already *"one scrim, one chassis"* and already takes a desk as content. What it
cannot do today is mount away from Query Centre: it takes `anchor` and `returnTo` as trigger
elements from that page (`correctingTriggerRef`). The ask is a mounting mode with **no QC anchor** —
centred, or anchored to a caller-supplied element — so the Calendar and the To-do list can mount
the same desks. One chassis, owned by your module.

### 2b · The sheet's shape, where a desk lacks it

Audited by reading, 6 Sep. **Where a desk already does one of these, nothing changes.**

| | **when** segment<br>Today · Yesterday · Pick | the one fact next | optional note | "What this does" | one primary | Undo toast |
|---|---|---|---|---|---|---|
| `NudgeDesk` | ✗ *(date field, defaults today)* | ✓ nudge-again chips | ✗ **missing** | ~ one sentence | ✓ | ✓ whole-write |
| `MarkSentDesk` | ✗ *(date field)* | ✓ reply window | ✓ | ~ one sentence | ✓ | ✓ whole-write |
| `RespondDesk` | ✗ *(date field)* | ✓ per outcome | ✓ | ~ one sentence | ✓ | ✓ whole-write |
| `MarkClosedDesk` | ✗ *(date field)* | ✓ reason cards | ✓ | ~ one sentence | ✓ | ✓ whole-write |

So the gaps are narrow and specific:

1. **The when-segment on all four.** Each has a date field defaulting to today with a "today"
   sub-label — good, but not the ref's `Today · Yesterday · Pick a date`. One control, four mounts.
2. **A note on `NudgeDesk`.** The other three have one.
3. **"What this does" as a block, not a sentence.** Each desk takes a `derivedLine` node and
   renders it in `.qrd-derived`; the ref draws a titled block with one bullet per consequence —
   *status change · the task it completes · the reminder it sets · the bar it creates* — **in the
   words the pages will show afterwards**. `deskNudgeDerived` today is a good sentence
   (*"Records a Nudged rung… Status stays Queried… ScriptAlly never sends"*) but it is one clause,
   and the lock the ruling asks for is that **the text equals the outcome the pages render**.
4. **The Undo toast's duration.** All four saves already offer Undo and revert the *whole* write
   (`saveDeskNudge` deletes the activity **and** restores `nudgeDate`/`lastNudgeSentDate`). But
   `ToastProvider`'s default is **6000ms** and the ruling says **8 seconds** — so either the desks
   pass `duration: 8000` explicitly, or the ruling accepts the house 6s. **A decision, not a bug**;
   flagged rather than changed, because the provider is shared with the whole app.

### 2c · The materials default (ruling §2)

The bracketed eight-item list in §E is **withdrawn**. "The QC picker by identity" means the app's
request-derived rows: **`PACKAGE_MATERIALS` as it is — the two** — with the standing exclusions
kept (no Full manuscript, no Author bio, no "First 50 pages"). Those exclusions are load-bearing
and documented at their values (`PACKAGE_MATERIALS`'s own *"TWO, NOT THREE"* note; CLAUDE.md's
11 Aug law with *"a standing instruction not to reinstate"*; the unit-unknown rule behind
*"Opening sample"*).

**What this pack adds is only the default:** the rows are pre-ticked to what the agent's request
named, each tagged **"asked for"**, with the one-line explanation saying so. If the request record
cannot name what was asked for, **nothing is pre-ticked and the line is omitted** — the same
honesty `MarkSentDesk`'s existing `askedLabel` already applies to the quantity (*"AS ASKED" IS A
PRE-FILL, NEVER A CLAIM*).

## 3 · The locks the ruling names

- exactly one implementation per kind, resolvable by name — **standing** (`actionKind.test.ts`)
- every entry point on the three pages calls `requestAction` — **standing for the Calendar**
  (`calSeam65.measure.ts`); To-do's row tick and QC's own buttons are yours to route
- the desk's "What this does" text **equals the outcome the pages render afterwards** — yours,
  and the strongest of the three: it is the one that stops the block becoming decoration
- the picker rendered in `MarkSentDesk` is the QC component (identity); the default derives from
  the request record; **no option outside `PACKAGE_MATERIALS` appears**

## 4 · Task completion (ruling §3)

A plain task ticks with **no desk**. A task linked to a relationship calls `requestAction` for its
kind with the task as prefill. The Calendar's task bars already call `requestAction("task", …)`;
the linked-task resolution belongs with whoever owns the tick.
