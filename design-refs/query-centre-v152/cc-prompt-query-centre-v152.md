# Query Centre v152: query states, the query card as a chat thread, recording and editing (desktop)

This is a follow-up to v151.2. It **supersedes v151.2 wherever they differ**. Everything in v151.2 that isn't changed here still stands.

It covers four things, one section each:

1. **Query states:** "Your move" splits into Offers, Materials requested and Nudge due. "Gone quiet" becomes a timed state of its own. One rule colours the list's group headers and the card's band.
2. **The query card:** the landing card's frame, a fixed size, centred, sliding in with a lean. The Tracking tab becomes a chat thread with a reply box. The Agent and Materials tabs are redesigned.
3. **Recording:** the reply box opens a short form on the card that captures what's needed, then the new bubble arrives.
4. **Editing:** the pencil, "What needs changing?", Fix a mistake (with its logic checks), editing materials and packages, and editing the query's details.

## Where this runs

- **Base:** the branch dev serves, carrying v151.2. Report what it carries.
- **Branch:** `query-centre-v152`, in its own worktree.
- **Standing rules, as v151.2:**
  - **Gates and commits:**
    - Record baseline gates first. The gate is "no worse than baseline".
    - Read each gate's own exit code and its whole output.
    - `git commit --only -- <paths>`, one commit per section. `git diff --name-only HEAD` must be empty before every gate.
  - **Locks:** every lock goes red first, on the rendered page.
  - **Writing:** UK spelling. Lead the report with false premises.
  - **Don't touch:**
    - `src/components/manuscripts/**`;
    - `src/marketing/**` (read only);
    - the Contact list, the Versions page, Submission packages and the dashboard;
    - phone layouts (≤760px).
  - **No behaviour beyond what's written.** StatusDot stays the only status glyph.
  - **Deploy:** an integration branch cut from what dev serves, to **dev only**. **Don't merge to main.**

## Design refs (commit to `design-refs/query-centre-v152/`, verify, stop on a mismatch)

```
fb9276ca8b21cbc04cafb5d7b825ab8d634783d5dfd4c61128a9e22a62a6c754  query-centre-v152.html
8e03cf9cd9e2fd8e21f7571a2e6edc5999be89accc63197f456cd35c3fd74d38  query-states-v2.html
c0bc58b8c82e2650fe17bf861ae10c5181fd389994145eb3a2ab9cf6d9de57e9  screens/01-list-states-1280.png
f165313db9f873fcd8132c1b234e85169979ac2f690d1a09ec280f2460fb7b71  screens/01-list-states-1512.png
56b881603bb503261c58ef5c85116c353cfb51212f57cc4e324d18189d92a11c  screens/02-list-gone-quiet-1280.png
bc6e34a69ef7999ff2cdff1af1229404559614be49c040788b12c5c7a163f40f  screens/02-list-gone-quiet-1512.png
58f05f57d46d09d7d378f580e663420320131a20dcfed51988875368ba2c2fe0  screens/03-filter-your-move-1280.png
8ac51675d4dd9ef9a7640ce6945d5d10cfe25b3a2e0e59819047f04902f80c4c  screens/03-filter-your-move-1512.png
a0ccefd39ecd86d6a786b71601fac81627353664b7bf368004491d256b54ea59  screens/04-card-materials-requested-1280.png
c2cf71ba087c5a3fb349798b176110df45a6b4c9b14cb4c590fe5a16671371bc  screens/04-card-materials-requested-1512.png
0e45d1cdf5b61f8c1b510ff7b60519381d28bde3b5e19d01abb8bf5f3e88102a  screens/05-wait-tip-1280.png
891ff19536dace7193a597460b5dd3e7b449708d5014d1021e980e2ad44b1a48  screens/05-wait-tip-1512.png
744792055f54181548c5b4040cfcb5f7e7428563ccf0045680ee582027f0730f  screens/06-chip-detail-1280.png
a6dae0dc375e99aa4d87ab2a2c98229da81d8296dadae78d01e18604968328e6  screens/06-chip-detail-1512.png
744792055f54181548c5b4040cfcb5f7e7428563ccf0045680ee582027f0730f  screens/07-edit-on-hover-1280.png
a6dae0dc375e99aa4d87ab2a2c98229da81d8296dadae78d01e18604968328e6  screens/07-edit-on-hover-1512.png
29c0d4645f90cf1309f631e18af668cbdc6055676e320ab48481b961300b9e42  screens/08-reply-mark-full-sent-1280.png
fc23514755ba9926fc6577a19de6dcae69c9da71c76dd1e4ef7fc12911558e42  screens/08-reply-mark-full-sent-1512.png
c052a1973e4b696f0b64ea111a8594740d97e5fd97643b1117f9af2221ce1ec5  screens/09-material-version-1280.png
523639b926a6fa2efa5e11c2ee2ebe013fe9fd83d771ccd84094b7f31f808c71  screens/09-material-version-1512.png
e9b40f9e4e1ba6e9cec6d0a6a315e91c30c955ece6fb81bd91ddfe46a11f6885  screens/10-what-changes-1280.png
b5544752c64e4b2d17a73648d15cbb8493f179d32555a54d313e6744b4decf23  screens/10-what-changes-1512.png
593c3be50eaf1786424128b3a64c1746a6e3ead4929d3ec7e6bb2a564fc1c19a  screens/11-after-save-1280.png
8cb4f631977c8d20bad5ce3bbf8e62830064c8a50a67bc799b4641d0d3b6992f  screens/11-after-save-1512.png
ba1da4303ccffcf0aafe74e34c0d8f4ce4cca797f905897f2ccc76631b46e071  screens/12-card-with-the-agent-1280.png
55b0c1958578ce0c882e8c08f227a6431521f1fe68e8c1220ab42b0f6a6a234f  screens/12-card-with-the-agent-1512.png
c75c72b1d74c7fbc55fb0a5d253341f1d65c52e36ce2c432d63c61eba6e8221f  screens/13-record-response-1280.png
fa8677cee2954f5d49cedad35069fabb63a83143ef3cffa3a81b5d077dec38e0  screens/13-record-response-1512.png
c5d1457fcc27436dfd429a113fd2bbee8a1e1ac1ee944888d55750582c0cb9c2  screens/14-card-nudge-due-1280.png
ca620aa3e52138a5cbcd3ce8a83599ecdd1059deb2d2659d2ba8ea14779ef29d  screens/14-card-nudge-due-1512.png
05a403afdb8c68fcf13337b74d66b258cf6c288f43e0e327794c259e9e962cd3  screens/15-card-gone-quiet-1280.png
60e9fbbda6482ccab064f3f2b80ee2735368d8d071a8af5c4f94f8efa850f31e  screens/15-card-gone-quiet-1512.png
716e249a10cd7a4346985dea39e29999cd2a854031046af0ec197cbc0ef18efc  screens/16-card-closed-1280.png
9e237b23d1af5fb7c7da9b8b0a387d23e0e4e0362ed7f08c0783d30304e443f8  screens/16-card-closed-1512.png
5d866a2d1e378933adb4db1a0a7e60a2b4a1f3940a69742dbcbd701a018ab4a9  screens/17-what-needs-changing-1280.png
76d85da0f923621bd4798116a5f5f1fff1a188b291a50f8cc0c289d956f0952f  screens/17-what-needs-changing-1512.png
3f44910143b5a691e948f3f226b0ebf0d11ffc0916bab6b393f3107f33a88331  screens/18-fix-a-mistake-1280.png
d61e9119da470f65096392ddcf9fb9109ba30d3543fcd644796e06b05e187023  screens/18-fix-a-mistake-1512.png
2188b9a20845de45ce11298ad1d3bdc1f247ee483a299df855e988ad0123e8b5  screens/19-remove-warning-1280.png
f0fe4d0f6c0bc70f64654bf999aa42aa7f5ad5540a8a4a5f0cc9d6e86f8a7349  screens/19-remove-warning-1512.png
aec352e1a26e66d924087f048c47ab440d9a62e5ec4b4ad5e6ab988cee521af9  screens/20-calendar-greyed-1280.png
54eb5584dff98ac3fa3f8ba2c0c0c66cf3f116eb9eed3395d4076c394273548a  screens/20-calendar-greyed-1512.png
275a65680e3c7cbc75b84df26701960b3cc0361627bbf1eeeb0700d93ce3cb12  screens/21-package-picker-1280.png
fcdad491ebbe672df8f5f2be455ad8db2c6bb9dc67e1a85102996a900d534096  screens/21-package-picker-1512.png
7bec192a94ed3d583758dd6c60b3693740c19dba378306a5f16fecdc238e6c92  screens/22-sample-editor-1280.png
bbc3e1f125d39128a0a2762928ba416dacba0b581ea02dbaf151c038c081868b  screens/22-sample-editor-1512.png
396413db46c024564c6d01f20e3377b56ad5b1d6df7bf0300314bde02e3631e5  screens/23-edit-details-1280.png
cec2579c50622cfeb47935098764a348e686cd08f5c186dadb991a8c3f75fc72  screens/23-edit-details-1512.png
3a7518e4ee975be4a27ffb37c052b52ed13c2e90565103970f78c9eaff2c217c  screens/24-details-agent-picker-1280.png
afe54dcd95dc70f5e17d2387e8caf8fcc3f44d2bc5df0cf285972bcdda059b27  screens/24-details-agent-picker-1512.png
38cfbbdad7cf31b91ad13216089dffae914318e4be43b1a3a7855c8672d994f0  screens/25-agent-tab-1280.png
3d706176cbc2c6b58ccd732f1c25944cb23fd9ea1c98c61c27dad1d8ef4a3a88  screens/25-agent-tab-1512.png
24944adaa0e566bf76af9e0b9b5872593e4b39b3dc72b04a772009b884647f69  screens/26-materials-tab-1280.png
ab0e00fb8916d3075addc89b8bdac7df659f836cd05568d75694a1536f4436f7  screens/26-materials-tab-1512.png
74ee456489cd79701a2805f73cb932bdaf8c1ce91db2588f6652e1658d650bf4  screens/27-free-plan-material-1280.png
e414fcd67c17416e11fa7d8ad64c5ea7a67743ceb8d7acd76c3a2e6baeade664  screens/27-free-plan-material-1512.png
```

- **`query-centre-v152.html` is the oracle.** It's a working prototype: click a row to open its card, and use the reply box, the pencil, Edit on a bubble and every form. Open it at **1512 × 900** and **1280 × 800**.
- **`query-states-v2.html`** is a ref for one thing only: the "When does a query go quiet?" setting (§1.4). Ignore the rest of it.
- **Mock-only, not to be built:**
  - the yellow "VIEW AS Founding writer / Free plan" switch (it stands in for the account's plan);
  - the dark options panel and its alternatives;
  - "today" pinned to 8 Oct 2026, and all sample data (names, dates, letters, versions, packages, reply times);
  - "Change it on Hannah's card" showing a toast (in the build it opens the agent card, §4.5);
  - `prompt()` and `alert()` anywhere.
- **Oracles, in order:**
  1. The existing app: StatusDot, the derivation engine that decides where a query stands, the query write paths, the agent card, Submission packages and Versions data.
  2. This mock and its screens.
  3. This prompt.
- **Where the mock's script and the app disagree on data, the app wins; where they disagree on look or behaviour, the mock wins.** Say which in the report.

## 0 · Before editing, report

1. False premises first.
2. The query card component on dev today (name, where it opens from), and how it's opened from the list and from Birds-eye.
3. The derivation engine: where "your move / with the agent / gone quiet / closed" is computed, and every reader of it (list, Birds-eye, dashboard, Analytics, To-do).
4. The query write paths for: adding a step, changing a step's type, date or materials, removing a step, changing agent / method / package. Whether each is one atomic write, and how Undo works today.
5. How materials, letters, synopses, versions and packages are stored on a query step today, and what Free accounts store.
6. Where per-user settings live (for §1.4).

Then wait for a go-ahead.

## 1 · Query states (one commit)

### 1.1 The states

Every live query is in exactly one state. The state colours the list's group header and the card's band.

| State | Who's waiting | When | Header and band | Text |
|---|---|---|---|---|
| Offers | the agent, on you | an open offer | navy `#2a3a52` | white |
| Materials requested | the agent, on you | a partial or full is requested and not sent | navy `#2a3a52` | white |
| Nudge due | nobody; it's yours to nudge | past the reply date, not nudged, and the agent isn't "no reply means no" | light blue `#c5d0dd` | ink |
| With the agent | you, on the agent | inside the reply time, or inside the quiet window after a nudge | stone `#e3dbcf` | ink |
| Gone quiet | nobody; it's going cold | see §1.2 | stone fading to white (§1.3) | ink |
| Closed | nobody | passed, no response, withdrawn, offer accepted elsewhere | faded `#f1efec` | `#8a8076` |

Blues are yours, stone is theirs, stone fading to white is going cold, grey is done. Status colours stay on the pill caps only, as v151.2.

### 1.2 When a query goes quiet

- **Nudged:** it goes quiet when the quiet window (default 4 weeks) has passed since your latest nudge with no reply. Until then it's With the agent, and its reply-expected date is the nudge date plus the window. This replaces "each nudge adds 3 weeks".
- **Not nudged:** it's Nudge due from the reply date, and goes quiet once the window has passed since the reply date.
- **"No reply means no" agents** skip Nudge due: they go quiet on the reply date.
- **A reply of any kind** (request, offer, pass) takes it out of Gone quiet at once.
- Read "no reply means no" from the agent (`noResponseMeansNo`). Report if the field doesn't exist.

### 1.3 The Gone quiet colour

- **Group header:** `linear-gradient(90deg, #e3dbcf 0%, #ece6dd 40%, #fff 100%)` across the title cell only; the column labels sit on white. A 1px `#ece6de` hairline keeps the edge.
- **Card band:** `linear-gradient(90deg, #e3dbcf 0%, #ece6dd 18%, #fff 42%)`, with an inset 1px `#ece6de` bottom edge.
- No dashed or dotted borders anywhere.

### 1.4 The quiet window setting

- **Where:** Query Centre settings, as `query-states-v2.html` draws it: "When does a query go quiet?", a segmented control **2 · 3 · 4 · 6 · 8 weeks** (default 4), "after your nudge", and the line "Applies to every query; changes nothing already closed."
- Store it per user where §0.6 says settings live. It changes states, never stored data.

### 1.5 The list

- **Grouped by "Who it's with":** six groups in this order: Offers, Materials requested, Nudge due, With the agent, Gone quiet, Closed. An empty group isn't drawn.
- **Quick filters:** All · Your move · With the agent · Gone quiet · Closed. **Your move covers Offers, Materials requested and Nudge due.** Filtered, the group headers still show.
- **Row tags after the name:**
  - "Your move" (navy, white text) on Offers and Materials requested;
  - "Nudge due" (`#c5d0dd`, ink text) on Nudge due;
  - "Gone quiet" (outlined `#cfc5b7`) on Gone quiet.
- **Next column:** Gone quiet rows show "N days quiet" (from the reply date), in the late colour.
- **Button at the right:** Gone quiet rows get an outlined **"Close it →"** (as Nudge). It opens the card's close form (§3) with "Closed: no response" chosen.
- **Next action grouping:** "Close it" sorts after "Waiting to hear" and before "Nothing to do".
- **Birds-eye:** its groups don't change in this version. Its hover button says "Close it" for gone-quiet queries.

### 1.6 Everything that reads the state

Update every reader found in §0.3 so the six states mean the same everywhere on this page. **The dashboard is out of scope:** list in the report what its "needs you this week" count would change to (Offers + Materials requested + Nudge due, not Gone quiet), and don't change it.

## 2 · The query card (one commit)

### 2.1 Frame, size and position

- **Frame:** the landing card's. 7px white rim, radius 20; inside it a 1px `#d9c8ba` border at radius 14 that clips everything. Shadow `0 1px 2px rgba(28,19,15,.08), 0 26px 48px -20px rgba(28,19,15,.38), 0 70px 90px -50px rgba(28,19,15,.3)`.
- **Size:** 540 wide (504 at ≤1400). **Height is fixed at `min(700px, 100vh − 56px)`** for every query, whatever its length. The band, the head and the footer stay put; the tab body scrolls.
- **Position:** fixed, 40px from the right (28 at ≤1400), **vertically centred** in the viewport.
- **Entry:** slides in from the right, off-screen at `translate(calc(100% + 120px), −50%) rotate(9deg)`, to `translate(0, −50%) rotate(1.6deg)`, over 550ms with `cubic-bezier(.22,.9,.28,1.14)` so it overshoots slightly.
  - **The lean:** 1.6° while you're reading. Any editing or recording view straightens it to 0° (320ms), so menus and dates are level. Back on the card, it leans again.
  - **Reduced motion:** no slide, no rotation change.
- **The list stays usable behind it:** clicking another row swaps the card's contents in place. Editing views dim the page behind (as the existing scrim).

### 2.2 Band and head

- **Band:** the state's colour (§1.1) and label in mono caps: OFFER, MATERIALS REQUESTED, NUDGE DUE, WITH THE AGENT, GONE QUIET, CLOSED. "Day N" on the right; closed cards show no day. Then a **pencil** button (opens §4.1) and ✕. On navy, both buttons are white on `rgba(255,255,255,.14)`.
- **Head:** initials disc, agent name, agency in mono caps, and the status pill (white body, coloured cap, StatusDot).
- **Manuscript block** and the **Tracking · Agent · Materials** tabs, as the landing card.

### 2.3 Tracking: the chat thread

Each step is a message: the agent's on the left, yours on the right. See screens `04`, `12`, `14`–`16`.

- **Whose side:** the agent's: partial requested, full requested, offer, passed. Yours: query sent, partial sent, full sent, nudged, closed (no response), withdrawn.
- **Bubbles:**
  - the agent's: `#faf7f2` with an inset 1px `#e8dfd3`, the bottom-left corner 5px; a 24px initials disc (`#e3dbcf`) to the left, top-aligned;
  - yours: `#e9eef4`, no border, the bottom-right corner 5px, no avatar;
  - radius 14, padding `9px 13px 9px 9px`, at most 90% of the thread's width.
- **Inside each bubble, two rows beside one large icon:**
  - **the icon:** a 34px disc in the step's status cap colour with the 19px StatusDot glyph. **"Query sent" and "You nudged" have no fill**, just the glyph;
  - **row 1:** the step in Source Serif 15.5 ("Asked for a partial", "Sent the full", "You nudged Jonathan"), then the date at the right in mono caps 9.5px (`#9a9087`; `#7b8799` on yours);
  - **row 2:** the material chips (white, inset 1px `#e3dbd0`, mono caps 8.5px), and on Query sent "by email" (or the method) in italic.
- **The waits between bubbles:** a hairline divider (`#efe9e0`) with a pill in mono caps 9px: "44 days". A wait over 70 days uses `#f1e9dd` with `#86705a` text. The first divider reads "Day 1".
- **Today:** after the last step, a divider "14 days · today", its pill outlined in navy and its line `#d3dce7`. Closed queries have none.
- **The end of the thread, by state:**
  - **With the agent:** a bubble on their side, "Waiting on Jonathan", with "Day 23 of about 56 · reply expected 11 Oct" and a 30px ring showing how far through the reply time it is (navy on `#e3dbcf`). No typing dots.
  - **Nudge due:** their side, "No reply yet · Reply was due 1 Sep · 12 days ago".
  - **Gone quiet:** their side, "No reply · Quiet since 4 Oct", on `linear-gradient(90deg, #efe9e0, #faf7f2 70%)`.
  - **Materials requested / Offer / Closed:** nothing extra; the reply box says what's next.
- **Opening:** the thread opens scrolled to the end. The first time a card opens, the dividers and bubbles build in (each 380ms, staggered 45ms), and the "today" pill pulses once. No motion under reduced motion.

### 2.4 Interactions on the thread

- **Hover a wait:** a dark tooltip says what it means, in facts. Use the agent's usual time for that stage when known (from the reply time, or their partial/full windows):
  - "Jonathan replied 44 days after your query. Their usual is about 8 weeks, so this was quicker than usual."
  - "You sent the partial 44 days after Jonathan asked."
  - With no usual time, just the days. No appraisal words beyond quicker / longer / about the same as usual.
- **Click a material chip:** a tooltip says exactly what went: which letter, which synopsis, how much of which version ("First 3 chapters · Original · about 9,800 words"). Free accounts see only what the material is.
- **Hover a bubble:** an **"✎ Edit"** pill appears beside it (outside the bubble, on the open side). It opens Fix a mistake with that step selected (§4.2).
  - **It must stay reachable:** the bubble's hover area extends across the gap to the button (an invisible 96px strip), and the button stays for 350ms after the pointer leaves. Hovering the button turns it navy.
  - It's also reachable by keyboard (focus within the bubble shows it).

### 2.5 The reply box (the card's footer)

Replaces the old footer. Padding `12px 14px 14px`, a 1px `#ece6de` top rule. Left, a 44px rounded field (`#f5f1ea`) with a bold line and an italic second line; right, a 44px rounded button.

| State | Field | Button |
|---|---|---|
| Offer | Answer the offer · N days left | **Answer the offer →** navy |
| Materials requested | Send the partial / Send the full · N days left · by 15 Oct (late: "8 days late" in rust) | **Mark partial sent → / Mark full sent →** navy |
| Nudge due | Nudge Priya? · Reply was due 26 Sep | **Nudge →** outlined |
| With the agent | Heard back? · Record it when Rufus replies | **Record a response →** outlined |
| Gone quiet | Still nothing? · Close it, or keep waiting | **Close it →** outlined |
| Closed | Closed · Closed on 11 Aug | **Reopen →** outlined |

Outlined = white with an inset 1.5px navy, navy text.

### 2.6 The Agent tab (screen `25`)

- **A sand strip of three figures for this query:** Queried (date, how), Package (or "What went" for Free) with how many things went, Last heard (date and days ago).
- **A short profile list:** Replies in (with "no reply means no" or "always replies" where known), Asks for (chips; anything you didn't send is outlined in rust, with "You didn't send …" or "✓ You sent everything Clara asks for"), How to submit, Wishlist (quoted), Contact (email and website links).
- **Page counts compare properly:** 10 pages covers a request for 5.
- **Missing details** are dashed "+ Add" links, and "✎ Open Clara's card" sits at the bottom. Both open the agent card at that field.

### 2.7 The Materials tab (screen `26`)

- **A summary line:** "3 things sent to Clara · 1 request to send".
- **Each thing sent** is an outlined block: step, date, material chips, and the package chip (Pro) on Query sent.
- **An unsent request** is a dashed rust block: "Partial to send · 8 days late", saying when they asked. It goes once it's marked sent.
- **Hover a block:** "✎ Edit" opens Fix a mistake at that step.

## 3 · Recording what happened (one commit)

The reply box's button never writes on its own. It opens a short form on the card that captures everything the write needs, then shows what changes, then saves. Screens `08`–`11`, `13`.

### 3.1 The form

- **Title:** the action ("Mark full sent", "Log a nudge", "Close it"); "Record a response" for With the agent.
- **A preview of the thread at the top:** the latest step (faded), a divider with the days since ("14 days later"), and a **dashed draft bubble** of the step being added, on the side it will appear. It updates live as the step, date and materials change.
- **The step:** pre-chosen from the button. "Something else happened instead" reveals every option:
  - "Who replied" (left-aligned, in the agent's paper bubble style): asked for a partial, asked for the full, made an offer, passed;
  - "What you did" (right-aligned, in your soft navy): sent the partial, sent the full, nudged, closed it (no response).
  - Each option has its status disc. The chosen one gets a 2px navy outline.
  - **Options that would break the order are disabled with the reason** (§4.3), e.g. "After 'Partial requested' it's your move, so a nudge doesn't fit."
- **When:** today by default; the app's own calendar (no browser date input). Future days and days before the latest step are greyed out.
- **What you're sending / what went or was asked for:**
  - **Sending a partial or full:** prefilled from what the agent asked for (the request step's materials). For Pro and founding accounts, the version defaults to the one in use, and can be changed on the chip (§4.4).
  - **A request:** prefilled with the usual ask, editable.
  - Material chips and "+ Material" work as §4.4.
- **"See what changes →"** shows the step being added and what follows: where it stands, whose move it is, the new reply-expected date. Then **Save**.

### 3.2 After saving

- The card returns to Tracking. **The new bubble slides in from its own side** (500ms, slight overshoot), the "today" divider moves under it, and the end of the thread changes (e.g. "Waiting on Jonathan · Day 1 of about 56").
- **The band, the pill and the reply box change to the new state** in the same render; the list row behind changes too.
- **Undo** sits in the toast for 7s and restores everything the save wrote.

## 4 · Editing (one commit)

### 4.1 What needs changing? (screen `17`)

The pencil opens three choices:

- **Fix a mistake:** something was recorded wrong (a date, a step, what you sent). Corrects the record; nothing new goes on the timeline.
- **Something changed since:** adds a step (§3, with every option shown).
- **Edit the query's details:** who it went to, how you sent it.

### 4.2 Fix a mistake (screens `18`–`20`)

Two steps: **The details**, then **What changes** (before/after list and its consequences), then **Save the fix** with Undo.

- **Steps are drawn as bubbles,** as the thread: the agent's on the left in paper (with a 28px right margin), yours on the right in soft navy (28px left margin), each with its 34px status disc.
- **In each bubble:** the step (the app's own dropdown, not the browser's), the date (the app's calendar), ✕ to remove, the materials (§4.4), and on Query sent the package row (§4.5).
- **Between bubbles:** the wait divider with its days. **"+ Add a step I missed"** appears on the divider on hover or focus. It inserts the first step that fits between the two dates, or says none fits.
- **Outlines, not fills:** a changed step gets an inset 1.5px `#5f7b93`; a step with a problem 1.5px `#e2a08b` on `#fdf5f1` with the reason under it; the selected step 2px navy.
- **The footer:** "N to fix · N changes" (or "No changes yet"), and "See what changes →", disabled until there's a change and no problem.

### 4.3 The logic checks

These run on every change, in Fix a mistake and in the §3 form, and they decide what's disabled.

1. There's exactly one **Query sent**, and it's the earliest step.
2. Stage order: partial requested < partial sent < full requested < full sent < offer.
3. A send needs its request first (partial sent needs partial requested; full sent needs full requested).
4. No duplicate stage steps.
5. Nothing after a close (passed, no response, withdrawn).
6. No nudge while it's your move.
7. No "closed: no response" while it's your move.
8. No pass while a request to you is open, unless after an offer.
9. No dates in the future.

- **Dropdowns disable the options that would break later steps,** each with its reason.
- **The calendar greys out days** that would put steps out of order ("Greyed days would put the steps out of order").
- **Removing a step that others depend on warns first,** inline: "Remove 'Partial requested' (16 May)? 'Partial sent' (29 Jun) depends on it, so it'd go too. Where it stands goes back to Queried." with **Remove 2 steps** and **Keep it**. Removing one with no dependents asks the same with **Remove**.
- Steps marked for removal are listed under the bubbles with **Keep** to bring them back.
- **"Something changed since" can't be dated before the latest step;** it points you to Fix a mistake instead.

### 4.4 Editing materials (screens `09`, `22`, `27`)

- **Each chip is a button.** Clicking it opens a small editor for that material; ✕ on the chip removes it at once.
  - **Query letter:** Pro picks one of their saved letters or "A letter not in QueryHawk". Free: "Recorded as your query letter."
  - **Synopsis:** Pro picks a saved synopsis or "A synopsis not in QueryHawk". Free sets a length with a stepper (Any length, 1–10 pages).
  - **Opening sample:** Chapters · Pages · Words, then a stepper: chapters step 1, pages 5, words 500; switching unit snaps to 3 chapters / 10 pages / 5,000 words. The same control as the agent card.
  - **Version (Pro, on samples and fulls only, never on a request):** Original · V2 …; picking a version saved after the step's date shows "Are you sure? V2 was saved 16 days after this went."
  - **Something else:** one line, 40 characters at most. An empty one is dropped on Done.
  - Each editor ends with **Remove from this step** and **Done**.
- **"+ Material"** lists only the kinds the step doesn't have yet (one of each), plus Something else, which can repeat.

### 4.5 Packages (Pro and founding; screen `21`)

- **On Query sent only,** a "Package" row with a navy button: the package and "on query", or a dashed "None · was this sent as a package?".
- **Picking a package** fills its letter, synopsis and sample (with its version) into the chips. A package made after the query went warns "Made N days after you sent this. Are you sure?". A draft package says picking it puts it on query and locks it.
- **Packages on query never change.** If the chips no longer match the package's contents, a sand note says: "These aren't Full's contents any more, so this query will count as a one-off, not in Full's results." with **Put Full back**.
- **What changes** says the effect on results ("This query now counts in Prologue test's results").
- **Free accounts** never see packages; their materials are tracked as plain letter, synopsis and sample.

### 4.6 Edit the query's details (screens `23`, `24`)

Rows with a label column, a dot and a "was …" note on anything changed, and a footer counting changes and knock-on effects.

- **Sent to:** a picker over the Contact list, with search. Agents not yet queried come first; agents already queried for this manuscript are disabled, saying so.
- **Sent by:** Email · QueryManager · Online form · Post, as a segmented control.
- **What went:** read-only chips and the package (Pro), whether it matches what the agent asks for, and "✎ Change what went on the 'Query sent' step", which opens Fix a mistake there. There's no package picker here.
- **Reply time:** read-only from the agent, with "✎ Change it on Hannah's card", which opens the agent card at Submissions → reply time.
- **This also changes:** a blue-grey box listing the knock-on effects, e.g. the query moving to the new agent's history, a new reply-expected date from their reply time, or "Query sent" now reading "by QueryManager".
- **Save details** saves everything in one write, with Undo.

### 4.7 Behaviour shared by every editing view

- **One Escape handler:** an open menu or calendar closes first, then the view steps back one level (details → What needs changing? → card). On the card, Escape closes it.
- **Menus and calendars sit over the card,** never clipped by its scroll area: they open below their field, or above if there's no room, and stay inside the card's edges. They follow their field when the card scrolls.
- **The footer stays put** while the middle scrolls; the band and head stay put.
- **Nothing writes until Save.** Every save is one atomic write and offers Undo for 7s that restores everything it wrote.

## Locks: QC152 (each red first, at 1280 × 800 and 1512 × 900)

| Lock | Asserts | Mutation |
|---|---|---|
| L1 states | Seeded fixtures (one per state, plus a "no reply means no" agent, a nudged-then-quiet query and a nudged-within-window query) land in Offers, Materials requested, Nudge due, With the agent, Gone quiet and Closed exactly as §1.1–1.2. Changing the quiet window to 2 weeks moves the nudged-within-window query to Gone quiet. | Keep "each nudge adds 3 weeks". |
| L2 colours | Group header and card band backgrounds per state equal §1.1; Gone quiet's computed background is a gradient starting `rgb(227,219,207)` and ending white; no element on the page has a dashed or dotted border in a Gone quiet header or band. | Make Gone quiet stone. |
| L3 filters | "Your move" count = Offers + Materials requested + Nudge due; filtering shows only those groups' rows. | Count Gone quiet in Your move. |
| L4 card frame | The card is 540 ±2 wide (504 at 1280), its height equals `min(700, vh − 56)` ±1 on every fixture (short and long), its vertical centre equals the viewport's ±2, the inner border is 1px `rgb(217,200,186)` at radius 14. | Size the card to its content. |
| L5 lean | Reading: the panel's computed rotation is 1.6° ±0.1. In any editing or recording view: 0°. Reduced motion: no transition. | Keep the lean while editing. |
| L6 thread | Bubbles sit left for agent steps and right for yours; each has a 34px disc whose background is the status cap colour (transparent for Query sent and nudges); each wait divider shows the days between its neighbours; the last divider says "today"; the thread opens scrolled to the bottom. | Put every bubble on the left. |
| L7 edit button | With a real pointer: hover a bubble, move to its "✎ Edit" in 10 steps over 300ms, click: Fix a mistake opens with that step selected. | Remove the hover bridge. |
| L8 reply box | For each state the field text and button match §2.5. Pressing the button never writes: the write spy is not called until Save. | Write on press. |
| L9 capture | "Mark full sent" opens the form with the step chosen, today's date, and the request's materials prefilled (with the in-use version for Pro). Save adds exactly one step with that date and those materials, and the card's band, pill and reply box change to With the agent in the same render. Undo restores the query byte-for-byte. | Prefill from the generic default. |
| L10 logic | Each of the nine checks in §4.3 has a fixture that is refused with its message in both Fix a mistake and the §3 form; the calendar disables the offending days; removing a step with dependents shows "Remove N steps" naming them. | Drop check 3. |
| L11 materials | Sample steps are 1 / 5 / 500 and switching unit snaps to 3 / 10 / 5000; Free accounts see no version and no packages; a package-linked query whose chips change shows the one-off note, and saving clears the package link. | Keep the package link. |
| L12 details | Changing the agent shows "This also changes" with the new reply-expected date; agents already queried for this manuscript are disabled; there's no package control in the details view. | Allow a duplicate agent. |
| L13 no browser controls | No `input[type=date]`, `select` or `prompt()` in the card or its views. | Use a native select. |
| L14 no regression | QC1512 locks pass, re-pointed where this changes them (L3 header colours, L4 tags, L7 buttons; name each). Birds-eye locks pass. Phones are unchanged. | n/a |

## Report

Lead with false premises. Then give:

1. The answers to §0.
2. Each section's commit.
3. Each lock red then green, with the mutation used.
4. Screens at 1280 and 1512 beside refs `01`–`27`.
5. What the dashboard's "needs you this week" count would change to (§1.6), not changed.
6. The dev bundle hash.
7. Anything left undone, with the reason.
