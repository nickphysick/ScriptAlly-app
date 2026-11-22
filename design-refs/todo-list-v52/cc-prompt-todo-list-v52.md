# To-do list v52: page frame in line with the other pages, Start here in the tray, one question at a time, the live Query Centre card

This follows v51.1 (now on dev). It **supersedes v51 and v51.1 wherever they differ**. Anything those two built that this prompt doesn't change still stands. That includes the save paths, the counts, Snooze and Dismiss, own tasks, steps and links, and the batched "Fill in what you sent".

**What changes, at a glance:**
- **Frame:** a slim navy header in the Query Centre's style, centred at 1320px. The workspace sits under it at the same width. It fits the screen without page scroll.
- **Tray:** a "Start here" card at the top, with the quill illustration. It replaces the priority line in the header. The tray can be collapsed to a labelled strip if the writer wants more room. Housekeeping gets its own look.
- **Desk:** one question at a time. Answers gather as chips at the top. The primary button always sits in the same place, bottom-right of the questions column. Nothing advances until the writer presses it.
- **Preview:** the **live Query Centre card**. The card on dev's To-do today is the wrong one.

There are five parts, A to E, one commit each, plus F for locks and the report.

## Where this runs

- **Base:** the branch dev serves now. It should be `…-qc1522-td51-td511` (bundle `index-c89gelcz.js`), or later. **Stop if** it doesn't carry v51.1. Report the tip.
- **Branch:** `todo-list-v52`, in its own worktree.
- **Standing rules** (CLAUDE.md "Packs branch from the dev line"):
  - Record baseline `tsc`, both builds, Vitest and the rules tests first. The gate is "no worse than baseline". Read each gate's own exit code.
  - **Before any browser test,** list which suites already fail on dev's branch, and skip them. Run only the To-do checks and anything you touch.
  - `git commit --only -- <paths>`, never `git add -A`. One commit per part.
  - Every lock goes red first, measured on the rendered page.
  - **Don't run anything that calls a paid API,** including tests or evals, unless I've signed it off.
  - UK spelling. Copy exactly as written. Copy asserts only what the code does. Lead the report with false premises.
  - **Don't touch:** the Query Centre, the Contact list, the dashboard, the side rail, phone layouts (≤760px) or `src/marketing/**`.
- **Deploy:** re-check which branch dev serves (by bundle hash). Merge into a new `dev/…-td52` stacked on it, re-run gates and locks there, then deploy **to dev only**, after I've read the report. No rules changes are expected. **Don't merge to main.**

## Reference

Enrol at `design-refs/todo-list-v52/` and verify each SHA256 against `SHA256SUMS.txt`. **Stop if any file is absent or differs.**

- `todo-list-v52.html`: the mock. It's built inside a copy of the app shell (rail, top bar), and the shell is a stand-in: dev's real rail and top bar win. Click through it before you start.
- `images/start-here-quill.webp`: the quill and inkpot for the Start here card. If the app already has this asset, use the app's copy and report its path.
- `screens/01`–`17`, each at 1512 × 982 and 1280 × 800 (@2x):

| Screen | Shows |
|---|---|
| `01-workspace` | Header, tray with Start here, desk on question 1, preview |
| `02-option-picked` | A picked option card; Next enabled in the footer |
| `03-date-calendar` | Answer chips at the top; date strip with Older open; calendar beneath |
| `04-summary-log-it` | All answers as chips; the summary; footer "Ready to log" and **✓ Log it** |
| `05-logged` | The celebration (unchanged from v51) |
| `06-gone-quiet` | A gone-quiet task, question 1 |
| `07-gone-quiet-nudge` | The nudge follow-up with the draft; Next still in place |
| `08-offer` | An offer, question 1 |
| `09-reply-time` | The reply-time slider set to 10 weeks |
| `10-own-task` | Your own task |
| `11-tray-collapsed` | The tray collapsed to the labelled strip |
| `12-snooze` / `13-dismiss` | The pop-ups (unchanged) |
| `14-housekeeping` | Housekeeping rows: slate header, icon tiles, Quick fill chips |
| `15-snoozed-tab` / `16-done-tab` | Unchanged from v51 |
| `17-preview-hover` | Hovering the preview: "Open the full query card ↗" |

**How to read the references:**
- **All names, dates and counts are sample data.**
- **The mock's query card is a stand-in** for position and scale only. See Part D.
- **Oracles, in order:** the existing app (components, data, save paths), then this prompt, then the mock. Where the mock and the app disagree on data, the app wins. Where they disagree on look or behaviour, this prompt wins, then the mock.
- Read rendered boxes and computed values at both reference sizes, never the mock's CSS source.

## Step 0 · Recon (read-only; report, then wait for a go-ahead)

1. **False premises** first.
2. **The Query Centre's page header:** the component, and its width rule (max-width, side padding, radius, type). Part A reuses it at a slim size.
3. **The Query Centre's open query card:** its component name and test id, and how the Query Centre renders it. Also, **what the To-do preview renders today**: name the component, and explain why it differs.
4. **The Contact list's open agent card** (address book): its component name and test id.
5. **The quill-and-inkpot asset:** does the app have it already, and at what path?
6. **"Start here":** confirm the phrase builder from v51.1 (the old header line) is reused unchanged, including its apostrophe locks.

## Part A · Page frame and header (one commit)

- **Width:** the header and the workspace share one centred container, **max-width 1320px**, with the same side padding the Query Centre uses. This page is deliberately wider than the Query Centre. Below 1320px of content width, both use the full width available, as other pages do.
- **Header:** the Query Centre's navy header component, slim (`01`):
  - "Your to-do list" in the typewriter face at about 32px.
  - One italic stats line under it: "{Book} · **{n}** to do · **{n}** late · **{n}** done this week". The figures are in the typewriter face. "Late" counts dated tasks that are overdue, excluding Gone quiet.
  - "+ Add a task" sits on the right as the outlined pill the Query Centre uses.
  - **No priority line** in the header any more. It moves to Part B.
- **No page scroll:** the workspace fills the viewport under the header, with `height: calc(100vh − header − gaps)` and a minimum of 520px. The page itself doesn't scroll. The tray, the questions column and the preview scroll on their own.

## Part B · The tray (one commit)

- **Widths:**
  - tray **340px**
  - card preview **390px**
  - the questions column takes the rest
  
  These widths hold at every screen size. Don't let the tray or the preview grow on wide screens.
- **Start here** (`01`): a blush card (`#f8e2d8`, 14px radius) at the top of the To do tab, above the groups. It contains:
  - The quill illustration (about 50px wide) on the left.
  - "Start here" (600, terracotta `#9b4a33`), or "Nothing urgent · next best" when nothing is urgent.
  - The task phrase in bold. Reuse v51.1's builder, for example "Answering Tom's offer from Ellery & Finch".
  - A short reason in italic: "Due tomorrow", "8 days late", or "Nothing urgent".
  - An arrow on the right.
  
  Clicking it opens that task. When the writer is on that task, the arrow goes and the reason reads "You're on it", with a 1.5px terracotta outline. It isn't shown in the Snoozed or Done tabs, or when the tray is collapsed.
- **Collapse (optional):**
  - A **«** button sits after the filter and group buttons. It collapses the tray to a 112px strip (`11`).
  - The strip's top button, **"» All tasks"**, expands it again.
  - **No hover-to-open.**
  - The choice persists per device (localStorage, wrapped in try/catch).
  - The desk takes the freed width.
- **The collapsed strip** (`11`):
  - Group headings become short words with counts: Waiting · Nudges · Quiet · Fill in · Yours.
  - Each task is its status icon (30px), then three centred lines:
    - the agent's first name (600, 13px), or for your own tasks their first two words;
    - what it is (italic, 11.5px): Partial, Full, Offer, Nudge, Quiet, Reply time, Wishlist, Your task;
    - when (600, 11px): "8d late" in terracotta, "Today" and "Tmrw" in terracotta, "7d", "16 wks". Nothing if undated.
  - The selected task is a white tile with a 1.5px navy outline.
  - No search, tabs or Start here.
- **Housekeeping** (`14`):
  - Group header: pale slate `#e4ebf1` with text `#2f4357`, no border.
  - Row icon: a 36px tile in `#eef3f7` with a 1px `#d3dde6` ring, holding a slate (`#5f7b93`) line icon for the job: a clock for reply time, a heart for wishlist, a tag for genres, a page for what you sent. The agent's initials sit on a small slate badge (mono 8.5px, white) on the tile's bottom-right corner.
  - The "No date" text is replaced by a **"Quick fill"** chip: 22px tall, `#e4ebf1` background, `#2f4357` text, serif 12px.
- Everything else in the tray stays as in v51.1, including the focus dimming, tabs, counts and filters.

## Part C · The desk: one question at a time (one commit)

- **Layout of the questions column** (`01`–`04`):
  1. The Mentor's bubble (unchanged from v51).
  2. **The answers so far,** as compact chips under the bubble, separated from the question by a hairline:
     - each chip is 34px tall, 17px radius, `#f3eee6`;
     - it has a 22px slate (`#7d8ea6`) tick disc and the answer in bold, for example "✓ Full manuscript", "✓ V1", "✓ Mon 5 October";
     - hovering a chip shows "Change"; clicking it returns to that question with the later answers kept;
     - the chips wrap.
  3. **Only the current question.** Answered questions show only as chips, and upcoming questions aren't listed.
  4. After the last question, the summary box (unchanged from v51.1), under the chips.
- **The footer** belongs to the questions column, not the whole desk. The preview column runs full height beside it. It contains:
  - on the left: Snooze and Dismiss (as before);
  - on the right: "{n} of {m}" (italic), or "Ready to log" on the summary step;
  - then the **primary button**: Next → / Continue → / **✓ Log it** / Mark done.
  
  **The primary button is always in this one place.** Remove the sticky in-column Next from v51.
- **The footer must fit any column width.** Use a container query on the questions column, not a viewport query:
  - The primary button never shrinks.
  - The progress dashes are removed; the text "n of m" stays.
  - Below 540px of column width, Snooze and Dismiss show their icons only. They keep their accessible names and titles, and the S and D shortcuts.
  - Below 400px, "n of m" hides.
  - Never clip the footer.
- **Nothing advances on its own.** Picking an option, version, date, offer answer, close reason, wait length, reply, or moving the slider only records the choice. Only the primary button moves to the next question. Remove every timer-based advance.
- **"Check it on the card first" is removed.** The last step is just **✓ Log it**. The full card is still one click away on the preview (Part D). Remove the review drawer route from the desk, and remove any code that only it used.
- **Date question** (`03`):
  - **Remove** the hint "Today's picked. Change it if it was another day."
  - The line under the strip already states the picked date.
  - When the calendar is open, only **Older** is highlighted in the strip, not Today as well.
  - The calendar opens beneath the strip, inside the question, and is never covered by anything.
- Everything else on the desk stays as in v51.1: the option cards, the Mentor, the slider, own tasks, the batch flow and the celebration.

## Part D · The card preview: the live Query Centre card (one commit)

- **The query task preview is the live Query Centre card component.** It must be the exact one the Query Centre opens on the branch dev serves today, with:
  - its status band, such as "Gone quiet";
  - the name and agency head with the status pill;
  - the manuscript strip with genre chips;
  - the Tracking · Agent · Materials · Notes tabs;
  - the chat-style timeline.
  
  Import and render that component. Don't copy it, restyle it, or use any other card.
- **The card on dev's current To-do page is the wrong one and must be replaced.** That's the one with the navy head, "for Murphy's Day Out" and Tracking · Agent · Notes.
- **If the Query Centre card changes later, the preview must change with it** automatically.
- **Agent tasks** use the live address-book agent card that the Contact list opens, under the same rules.
- **Scaling (unchanged):** lay the card out at its true width, scale it with CSS `zoom` to fit the 390px column, and fill the column's height. Keep it read-only: nothing inside takes clicks or focus, and its footer actions and links are hidden. The pending change is drawn on it, and the affected section is outlined. The header (name) is never scrolled out of view.
- **Opening the full card** (`17`): hovering shows "Open the full query card ↗" (or "agent card"). Clicking anywhere opens the real card in its drawer, exactly as on the Query Centre or Contact list.

## Part E · Tidy (one commit)

- Remove the dead code from v51 that this change replaces: the header priority line, the in-column sticky Next, the review-drawer route from the desk, the timer advances, and the "Today's picked" hint.
- Update the To-do browser checks to match. Retire any check that asserts removed behaviour, and list each one.

## Part F · Locks: TD52 (each red first, at 1280 × 800, 1512 × 982 and 1920 × 1080)

| Lock | Asserts | Mutation |
|---|---|---|
| L1 width | The header's and the workspace's outer boxes have equal left and right edges ±1. Each is ≤1320px wide and centred. The page's scrollHeight equals its clientHeight. | Drop the max-width. |
| L2 header | The header holds the title, the stats line and "+ Add a task". No element in it contains "highest priority" or "Start here". | Keep the old priority line. |
| L3 Start here | It's the first child of the To do tab's list. It contains the quill image and the phrase from the v51.1 builder (fixtures with O'Rourke, Smith-Jones, Zoë). Clicking it opens that task. When selected, it says "You're on it". It's absent from Snoozed, Done and the collapsed strip. | Render it in the header. |
| L4 widths | The tray is 340 ±1 and the preview 390 ±1 at all three sizes. | Let the preview grow with the viewport. |
| L5 collapse | « collapses the tray to 112 ±1, and the desk gains that width. Hovering the strip doesn't expand it. "All tasks" restores it. The state survives a reload. Each strip item shows a first name, a kind and, if dated, a due label. | Expand on hover. |
| L6 one question | At every step of every task type there's exactly one open question. Each earlier answer appears as a chip, and clicking a chip returns to that question with the later answers kept. No upcoming question is in the DOM. | Render the upcoming questions. |
| L7 footer button | For every task type and step, tray open and collapsed, at all three sizes, the primary button's box lies inside the questions column, inside the viewport, and `elementFromPoint` at its centre is the button. | Set the footer to `overflow:hidden` with all labels shown. |
| L8 no auto-advance | For each choice control, clicking it and waiting 1s leaves the step index unchanged. Pressing the primary button advances it by exactly 1. | Restore a 380ms advance. |
| L9 date | Open the calendar: only Older has the selected style. The calendar's box doesn't intersect the footer's. The text "Today's picked" is absent. | Keep Today selected with the calendar open. |
| L10 no review route | No element on the desk says "Check it on the card first". Log it calls the save once and lands on the celebration. | Restore the link. |
| L11 live card | The preview's root is the same component (name or test id) as the Query Centre's open card, and for agent tasks the Contact list's. Changing a prop-driven label in that component changes the preview. | Render the old To-do card. |
| L12 housekeeping | The house header's background is `rgb(228,235,241)`. Each house row has an icon tile with an initials badge and a "Quick fill" chip, and no "No date". | Revert to the initials circle. |
| L13 no regression | The v51.1 locks still pass, re-pointed where this changes them (name each). The QC and Contact list locks still pass. | n/a |

## Report

Lead with false premises. Then give:

1. The answers to Step 0.
2. Each part's commit.
3. Each lock red then green, with its mutation.
4. Screens at 1280 and 1512 beside refs `01`–`17`.
5. The components used for the preview (Part D), and the asset path for the quill.
6. Any copy you changed to keep it true, and any place the app's data overrode the mock.
7. The dev bundle hash once deployed.
8. Anything left undone, with the reason.
