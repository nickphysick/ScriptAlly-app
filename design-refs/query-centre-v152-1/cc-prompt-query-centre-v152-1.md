# Query Centre v152.1: a quieter Queried, and the thread as a record of events (desktop)

This is a follow-up to v152 (built, on dev as `index-DK3Clp8X.js`). It **supersedes v152 wherever they differ**. Everything in v152 not changed here still stands.

Two things change:

1. **Queried gets a quieter colour.** Most queries sit at Queried, so its colour must sit back.
2. **The Tracking thread becomes a record of events only.** Where the query stands moves to the footer. The bubbles get a simple, messaging-app colour rule, and the nudge, edge cases and long threads get settled.

## Where this runs

- **Base:** `query-centre-v152` as pushed (`fd81a2961`), or what dev serves if that has moved on. Report which.
- **Branch:** `query-centre-v152-1`, in its own worktree.
- **Standing rules, as v152:**
  - **Gates and commits:**
    - Record baseline gates first. The gate is "no worse than baseline".
    - Read each gate's own exit code and its whole output.
    - `git commit --only -- <paths>`, one commit per section. `git diff --name-only HEAD` must be empty before every gate.
  - **Locks:** every lock goes red first, on the rendered page.
  - **Writing:** UK spelling. Lead the report with false premises.
  - **Don't touch:**
    - `src/components/manuscripts/**`;
    - `src/marketing/**` (read only);
    - the Contact list, Versions, Submission packages and the dashboard;
    - phone layouts (≤760px).
  - **No behaviour beyond what's written.** StatusDot stays the only status glyph.
  - **Deploy:** an integration branch cut from what dev serves, to **dev only**. **Don't merge to main.**
- **The phone window question from v152 stays open.** Leave the 12/12-week partial and full windows as you built them; Nick will rule separately.

## Design refs (commit to `design-refs/query-centre-v152-1/`, verify, stop on a mismatch)

```
39717de5bf633052c931eb8a1f7da85de2f10f43bfd813005c3ee6fe9f0b39a2  events-only.html
542f77eda21dd610ec3783d54079a44fdbdb698aea84139d4e54af9e19475920  nudge-icons.html
835b001d815c5966bab96a5f1c434838784c805f80d40d3ac15035e1887bad03  queried-and-no-reply.html
90ffebabebf135c07d7e91b7d9c22eef50a253f575fcd4f454bd879306899a26  thread-colours-3.html
b15fdd08c6496eb97388ee1962ae714f45b09e7b561ce5bd819ba0f5395a95d5  thread-edge-cases.html
04ccf8264a410163cef69bb565c7a2fb5452d5a3dffce3f8f9e57b4c8bd33a25  screens/01-colours-1280.png
363d2a06eb45fd326c01197fc6c739a3821f4bbc1a3f7343b2d6142cea0d4743  screens/01-colours-1512.png
94c275ba6e66a22d747387012da700f5dd1f411afbe340b9454041a2f1117e1b  screens/02-footer-states-1280.png
297baa8f458d403fe3b6c0e4e8ababf1e69440acf048ef6bd05f7611a129c6b1  screens/02-footer-states-1512.png
5886435043cf5dcfd6fc04490433f7e2ce05421373aac1cd702e6e6c44488bd9  screens/03-queried-pill-1280.png
bf47a29ffdd961e7f7ede79d89a9b089a3ab9103d14fa655e10edcbfe8e29a38  screens/03-queried-pill-1512.png
b3d4927e20e99a69a5116a787f6f472ba539ff50f6af9b56cf75556ea02ce99a  screens/04-nudge-icon-1280.png
4d913fca054c06660a5f9bcc6bb131f21fb80f2ea02f75b649e9dc518aa58f17  screens/04-nudge-icon-1512.png
d44bc19d6a33d98fc102a7c9262dd199e688582cf4f926fa3f4e7aa6e609ecda  screens/05-base-1280.png
23fbf938f45e98cbe99ea9326a74e29ce71e3e4974d477b0c45810e19c411e48  screens/05-base-1512.png
fd8c69d03d02cfe4507ebade87353ad60c89bd728246a707cee8fb334a419249  screens/06-several-nudges-quote-1280.png
28a1d4cadb14d50f51f7c7c88b850dbf01e2f1404df6113a99a7f47bbb642be0  screens/06-several-nudges-quote-1512.png
846de7926d0eef8808bad389418ed675b2dce9eb7144316a6a0a62742ee428cb  screens/07-rr-1280.png
faa64cac74c6adeb6bfc28fcd0a0c94edfc3849abef229c0e0e2d0a4721ac4e8  screens/07-rr-1512.png
d7b49ccd6cface15410a3903bb5d03b320b4a70174ee485dbb6fb7670efd91b0  screens/08-passed-1280.png
0803c82f08924c8d5c182c7a5ba65ed9ae896be94ef4a6a30565c1e770ab2401  screens/08-passed-1512.png
0840d0522cd4c10a7e57d8a0fe4014f7ae494f6cebb8f5f6781b511f9456b454  screens/09-withdrew-1280.png
27c85c8229558e8688f03a207cd8e94afd1e106c0dcf7e27d378cb06a57c3608  screens/09-withdrew-1512.png
e48afb623816796bb84a433b499c3477de783f4ae3c76dcd56e55a028377b2f0  screens/10-offer-told-1280.png
28b7ec6007d4a04d944f933c6dc021cc920d932e497b1e04a3a7e8f425720f71  screens/10-offer-told-1512.png
b7561fe63124141ede0826073ba48c55cfa2ff58726c4573ead3926719f1a24d  screens/11-undated-nomat-1280.png
eb48964c8bbc6f50def361c43fcb4c234862c5b03b871322ca96a60395ec38cc  screens/11-undated-nomat-1512.png
e96bf1239b723f9e14685d7777d6b126441e48c8937f7538bd8318e8b6d4be94  screens/12-collapsed-1280.png
6bfd1e6a36ed85329446baa55b4804b801bffbd00e5598b61b3d59a911af8248  screens/12-collapsed-1512.png
0a595573616d6e035bcf43e4ce6795ed0effe51e161546f04817f6a04d3905af  screens/13-draft-1280.png
e198ee3424a898ee17c852df0599624b0844e14d79340b97b0f7c2e55ddb93c4  screens/13-draft-1512.png
6809fa9d73dd765003d6ebf82f7d9dd000e4ec8db9c5f537fcc964dafbd20308  screens/14-no-colour-1280.png
dfb15c45ee2136799680c03dae14bd23744ad31b0a870e1c0cb90289dbb384e7  screens/14-no-colour-1512.png
```

| Ref | What it's the oracle for |
|---|---|
| `thread-edge-cases.html` | **The thread.** Every bubble, wait, nudge, quote, ending, undated step, collapse and draft. Use the toggles; screens `05`–`14` show set combinations. |
| `thread-colours-3.html` | **The colour rule** on three whole cards (offer, materials requested, closed). Screen `01`. |
| `events-only.html` | **The footer bar only** (its icon, two lines and button, per state). Its bubbles, opening "Queried …" line and navy "Today" pill are superseded; ignore them. Screen `02`. |
| `queried-and-no-reply.html` | **Option D only** ("Whisper of sand"): the Queried pill cap and group header. Screen `03`. Ignore A–C and the whole of part 2. |
| `nudge-icons.html` | **Option A only** (the exclamation). Screen `04`. Ignore B–F. |

- **Mock-only, not to be built:** the toggle panel and its rule note, every option not named above, and all sample data (names, dates, quotes, "6 other agents").
- **Oracles, in order:** the existing app (StatusDot, the v152 card, its writers and the derivation engine), then these refs and screens, then this prompt.

## 0 · Before editing, report

1. False premises first.
2. Where the v152 card draws the thread, the "Waiting on / No reply" end bubbles, the "today" divider and the footer.
3. Whether a step can carry free text today (for §2.6 quotes), and where the agent's reply text from Record a response is stored, if anywhere.
4. Whether "revise and resubmit" exists as a step type, and what writes it.
5. Whether "told other agents about an offer" exists in any form (a step, a task, a note).
6. Every place the Queried colour `#e6d9c6` is used on this page.

Then wait for a go-ahead.

## 1 · A quieter Queried (one commit)

- **Pill cap:** Queried's cap is `#f2ebe0` (was `#e6d9c6`). Every other status colour is unchanged.
- **Group header** when grouped by status: `#f4eee5` (screen `03`).
- **Birds-eye:** Queried bars use `#f2ebe0`; their watch-and-wait version `#f7f2ea`.
- **Everywhere on this page** that used `#e6d9c6` for Queried takes the new colour (§0.6 lists them). Phones are untouched.

## 2 · The thread (one commit)

### 2.1 Only events

The Tracking thread holds **only things that happened**. Remove, from v152:

- the "Waiting on …", "No reply yet", "No reply" and "Quiet since …" end bubbles;
- the navy "N days · today" divider and any "today" marker;
- the "Day 1" opening divider.

The thread starts with your **Query sent** bubble and ends with the last event. Where it stands lives in the footer (§3).

### 2.2 The colour rule (screen `01`)

Like a messaging app: one look is you, the other is them.

- **Your bubbles:** paper `#f6f3ee`, no border, bottom-right corner 5px, on the right. **Always paper**, whatever the step.
- **The agent's bubbles:** tinted by **what the reply was**, the same family as the status pills, with a 1px inset edge, bottom-left corner 5px, on the left, with their 24px initials disc:

| Reply | Fill | Edge |
|---|---|---|
| Asked for a partial | `#f8e7e0` | `#efd2c7` |
| Asked for the full | `#e7edf4` | `#cfdae7` |
| Asked for a revision (R&R) | `#e7edf4` | `#cfdae7` |
| Made an offer | `#e5eddf` | `#cddcc1` |
| Passed | `#f1efec` | `#e3dfd9` |

- **Glyphs are colourless:** plain ink StatusDot glyphs, 18px, in a 26px box, **no disc or fill behind them**, on both sides. Passed and your closes use the grey glyph (`#8a8076`).
- **No navy inside the thread.** Navy stays on the band and the action button only.
- **Inside a bubble:** the large glyph on the left, spanning two rows; row 1 is the step and its date (mono caps 9.5px, right); row 2 the material chips and any "by email" line.
- **Material chips** get a small line icon before the text: an envelope for the letter, a page for the synopsis, stacked pages for samples and the full manuscript. Chips are white at 75% inside bubbles.

### 2.3 Waits

- Between every two steps, the hairline divider with a pill: "44 days". **All waits are the same size**, however long. No scaling, no "long wait" colour.
- If either neighbour has no date, the pill shows "—".

### 2.4 Nudges (screens `05`, `06`)

- A nudge is yours, so it's a **paper bubble on your side**, drawn as **a reply to your query**:
  - a quote strip at the top: a 3px `#c9b9a1` bar, "**Following up**" and "Query sent · 2 Apr", on white;
  - then the **exclamation glyph** (a ring with "!", screen `04`) and "You nudged Jonathan", with the date;
  - then "by email" (the method) in italic.
- **A second or later nudge** still quotes the query, and adds "2nd nudge" (then "3rd nudge") after the title in 11px semibold `#8a8076`.
- **The exclamation glyph appears only in the thread and the record form.** Never on list rows, status pills, tags or Birds-eye, so it can't read as a warning. It isn't a status, so the StatusDot rule holds.

### 2.5 Every step, and its side

| Step | Side | Look |
|---|---|---|
| Query sent | you | paper, Queried glyph, chips, "by email" |
| You nudged | you | paper, quote strip, "!" (§2.4) |
| Sent the partial / the full / a revision | you | paper, its StatusDot, chips |
| Asked for a partial / the full | them | pink / light navy |
| Asked for a revision (R&R) | them | light navy, titled "Asked for a revision (R&R)" |
| Made an offer | them | sage |
| Passed | them | grey, grey glyph |
| You withdrew / Closed: no response | you | paper, grey glyph, the reason in italic ("signed elsewhere") |
| Told other agents | you | paper, offer glyph, "Told 6 other agents", "offer deadline 16 Oct" in italic (screen `10`) |

- **R&R:** if §0.4 says R&R isn't a step type, build only the display for it and report what writing it would need. Don't add a journey.
- **Told other agents:** if §0.5 says it doesn't exist, add it as a step type on your side, recorded from the **offer** card's "Record a response" under "What you did", with two fields: how many agents (stepper, 1–30) and the deadline you gave (the app's calendar). It needs the step-type rules change on dev only; list the prod diff.

### 2.6 What the agent said (screens `06`–`08`, `10`)

- Any agent bubble can hold **one quoted line** from their reply, under its rows: italic Source Serif 13.5, a 3px left rule at ink 18%, on white 55%, in curly quotes.
- It shows only when there's text. Store it where §0.3 says reply text lives; if nowhere, add an optional `replyNote` (500 characters) to the step, entered in the record form's "What happened" step as "What did they say? (optional)". Rules change on dev only; list the prod diff.

### 2.7 Missing data (screen `11`)

- **No date** (imported steps): the date slot says "No date" in italic 12px, and both neighbouring waits show "—".
- **No materials:** the bubble has no chips. No "Nothing recorded".

### 2.8 Long threads (screen `12`)

- With **more than five steps**, the earliest fold into one centred button, "N earlier steps · show" (`#f3efe8`, navy text). The **last three steps always show**.
- Clicking it expands the whole thread in place, for this card only. It folds again when the card reopens.

### 2.9 The record form's draft (screen `13`)

The record and edit forms preview the step being saved in the **same colours** as the thread (yours paper, theirs in their stage colour), with a 1.5px dashed `#9d917f` border and "· draft" after the title. This supersedes v152's dashed-navy draft.

## 3 · The footer: where it stands (one commit)

The footer is the only place that says where the query stands. One bar (screen `02`): a 52px rounded field (`#f5f1ea`) holding a 32px icon, then two lines, then the 52px action button.

| State | Icon | Line 1 / line 2 | Button |
|---|---|---|---|
| Materials requested | the stage glyph on its tint | Send the full / 7 days left · by 15 Oct | **Mark full sent** navy |
| R&R | light-navy glyph on its tint | Revise and resubmit / Jonathan asked on 1 Oct | **Mark revision sent** navy |
| Offer | offer glyph on sage | Tom made an offer / 1 day left · answer by 9 Oct (once others are told: You told 6 others · deadline 16 Oct) | **Answer the offer** navy |
| Nudge due | a clock | No reply from Priya yet / Reply was due 26 Sep · 12 days ago (line 2 in rust) | **Nudge** outlined |
| With the agent | the reply-time ring | Waiting on Priya / Quiet after 4 weeks · 16 days to go (or "Reply expected by 11 Oct") | **Record a response** outlined |
| Gone quiet | a clock | No reply from Daniel / Quiet since 4 Oct · close it, or keep waiting | **Close it** outlined |
| Closed (passed) | grey glyph | Jonathan passed / On 5 Oct · after the full | **Reopen** outlined |
| Closed (you withdrew) | grey glyph | You withdrew / 5 Oct · signed elsewhere | **Reopen** outlined |

- The ring is the v152 reply-time ring: navy on `#e3dbcf`, its fill the share of the window used.
- The button behaves exactly as v152's reply box (it opens the record form; it never writes).
- The band and the pill keep following the state, as v152.

## Locks: QC1521 (each red first, at 1280 × 800 and 1512 × 900)

| Lock | Asserts | Mutation |
|---|---|---|
| L1 queried | Queried pill caps compute to `rgb(242,235,224)`; the Queried status group header to `rgb(244,238,229)`; no element on the page computes to `rgb(230,217,198)`. | Restore `#e6d9c6`. |
| L2 events only | The thread contains no "Waiting on", "No reply" or "today" text and no Day 1 divider; its first bubble is Query sent; its last is the latest step. | Restore the waiting bubble. |
| L3 colour rule | Every bubble on your side has background `rgb(246,243,238)`; every agent bubble's background equals the table in §2.2 for its step; no bubble or glyph box inside the thread computes to navy `rgb(42,58,82)`; glyph boxes have a transparent background. | Tint your sent-full bubble. |
| L4 waits | All wait dividers in a thread have equal height ±1; a wait next to an undated step shows "—". | Scale the 87-day gap. |
| L5 nudge | A nudge bubble is on your side, holds "Following up" and "Query sent · {date}", and its glyph is the exclamation; a second nudge shows "2nd nudge"; no list row, pill or Birds-eye bar contains the exclamation glyph. | Use the exclamation on a row. |
| L6 quote | An agent step with reply text shows exactly one quote block; one without shows none. | Show an empty quote. |
| L7 collapse | A seven-step thread shows the fold button and exactly three bubbles; clicking it shows all seven; reopening the card folds it again. | Show four after the fold. |
| L8 footer | For one fixture per row of §3, the footer's two lines and button match the table; the thread is unchanged by state. | Put the status line back in the thread. |
| L9 no colour | With the thread in greyscale, every bubble's text still names its step (string check against §2.5). | Drop the title on agent bubbles. |
| L10 new steps | "Told other agents" saves with its count and deadline and renders per §2.5; reply text saves and renders per §2.6 (or, if not built, the report says why). | Save without the deadline. |
| L11 no regression | QC152 locks pass, re-pointed where this changes them (L6 thread, L8 reply box, L9 capture; name each). Phones are unchanged. | n/a |

## Report

Lead with false premises. Then give:

1. The answers to §0.
2. Each section's commit.
3. Each lock red then green, with the mutation used.
4. Screens at 1280 and 1512 beside refs `01`–`14`.
5. Any rules changes, deployed to dev, with the prod diff.
6. The dev bundle hash.
7. Anything left undone, with the reason.
