# The Builder tab

Refs: `design-refs/builder-refined.html` (normative) · `package-notes.html` · `packages-tabs.html`,
copied from `~/Downloads` and committed in Phase 1. All three were present — the red gate did not
fire.

Baseline at `9be6a2b6`: tsc 0 · build 0 · vitest **420 files, 7217 passed, 1 FAILED**.

⚠️ **The baseline is not clean, and the failure is not mine.**
`workspacePageGrid.test.tsx > ⚠️ TWO MEASURES` fails on `--mast-wash-top` being spelled out in
`illustratedMasthead.css` — the masthead lane's committed work. Gate is therefore "no worse than
one failure, and that one".

---

## Phase 1 — recon

### R1 · The page's component tree, and what survives

`SubmissionPackages.tsx` (604 lines) mounts, inside one `WorkspacePageGrid`:

| | lines | fate |
|---|---|---|
| `PageHeader variant="workspace"` | — | **survives**, gains the scope line (D6) |
| `PackagesBand` (the ledger) | 248 | **survives** — Part A of the last pack; moves inside Builder |
| `MaterialsBand` (the shelf) | 179 | **superseded by the rail** (Part C) — swapped, not added |
| `TrackingBand` (three panels) | 198 | **moves wholesale** to the Tracking tab (D4) |
| `PackageDetailDrawer` | 202 | **survives**, gains the note section (D26) |
| `PackagesDrawer` ("How it works") | — | **survives**, belongs to Builder (D5) |
| `PackageModal` / `MaterialModal` | — | survive; the rail's `＋ Add` opens them |

### R2 · No tab primitive exists — one must be built

Six files carry `role="tab"`, and none is reusable. The closest, `ManuscriptTabs`, is typed to its
own `ManuscriptTabKey` union and hard-codes `MANUSCRIPT_TABS`; its header also states *"THERE IS NO
PACKAGES TAB, AND ITS ABSENCE IS THE POINT"*, which is about the book profile and would read as a
contradiction if this page borrowed the component. **See the flag below on where a shared one
should live.**

### R3 · The scope, and what the masthead may say

Scope is `localStorage["scriptally_active_manuscript_id"]` → `activeMsId` → `activeMs`, with a
first-manuscript fallback. Everything on the page derives from `msId`.

`PageHeader variant="workspace"` **accepts an action slot on a Type A page** (amendment 3, 27 Aug)
and Submission packages is Type A — so a control here would be permitted. **D6 does not want one**:
the scope line is context, and `Switch book` defers to the sidebar's existing switcher. It goes
beside the title, not in an actions slot.

⚠️ **The ref's masthead is not this app's masthead, and I am not rebuilding it.** The ref draws its
own `.masthead` with a 34px parcel icon and three artwork thumbnails. This page's committed decision
is the opposite — *"NO MARK ON THIS PAGE — the illustration IS the page's picture, and a 52px
monoline parcel opposite a drawing of parcels is the same subject twice in two hands"* — and the
banner artwork now sits there. Taking the ref's masthead would undo that. **Reported, not built.**

### R4 · The package shape and the rules

The update allowlist is now eight keys:

```
['packageName','queryLetterVersionId','synopsisVersionId','samplePagesVersionId',
 'otherMaterials','status','firstSentAt','bookVersionId']
```

…and the freeze clause names five of them once `firstSentAt` exists. **A note is additive on both
counts**: it joins the allowlist and must be kept OUT of the freeze list — which is D24's whole
point and is provable in both directions with `rulesProbe`.

### R5 · The keyboard path is an idiom the app already has

Nothing in the app assigns from a list to a target by keyboard, so there is no affordance to match.
What there IS is the idiom D14 describes: a `role="button"` element whose `Enter`/`Space` performs
its own action (`Queries.tsx:4954`, `:6042`). A chip whose action is *"fill the next empty slot of
my type"* is that idiom, not a new one.

### D7 · Everything on this page is manuscript-scoped — confirmed

`msVersions`, `msPackages`, `msQueries`, `msBookVersions` and both archived sets all filter on
`manuscriptId === msId`; `bookVersions` live on the manuscript document itself. **Nothing is
cross-manuscript.**

---

## The type tints already exist, and eight of twelve match the ref exactly

The rail's chips need letter / synopsis / version tints. The app already has the full ladder at
`:root`, role-named at the `--cap-*` layer and aliased to `--pkgt-*` for this page — so the chips
**reuse it** rather than adding the ref's parallel `--let-*` / `--syn-*` set.

| ref | value | app | value | |
|---|---|---|---|---|
| `--let-*` × 4 | | `--cap-outgoing-*` | | **identical** |
| `--syn-*` × 4 | | `--cap-incoming-*` | | **identical** |
| `--pro-ink` | `#39587a` | `--cap-pro-ink` | `#2d4a6b` | deeper |
| `--pro-a` | `#e3ebf3` | `--cap-pro-a` | `#cfdcea` | deeper |
| `--pro-b` | `#d5e1ec` | `--cap-pro-b` | `#bccfe2` | deeper |
| `--pro-edge` | `#b9cdde` | `--cap-pro-edge` | `#9db6cf` | deeper |

**The four version tokens diverge because the app deepened them on purpose**, per
`packaged-strip-cuts.html` — the note at the value says the lighter pastille was superseded because
*"the stationery band asks for more contrast"*. `builder-refined.html` carries the older, lighter
set. This is ref-against-ref, not ref-against-me, so **I am using the app's deepened values and
flagging it** — it is the same question as F-AK, which is still awaiting a ruling.

---

## Flags

* ⚠️ **THE FLAG LETTERS IN THIS PROMPT COLLIDE WITH THE LAST PACK'S.** `F-BJ` and `F-BK` are both
  already taken and were both ruled on: F-BJ was the portion derivation (ruled: derive), F-BK the
  dotted divider with no ref (ruled: build as a decision). This pack's two are recorded as **F-BL**
  and **F-BM** so the earlier rulings stay findable.
* **F-BL** (this prompt's F-BJ) — **no tab primitive existed**; one is being built. On where it
  should live: it stays in `components/packages/` for now and is not promoted. A primitive earns its
  place from a second caller, and there is exactly one; `ManuscriptTabs` is the counter-example —
  a tab rail written for one page, typed to that page's key union, which nothing else can use. If a
  third surface wants tabs, the two get reconciled then, with two real sets of requirements rather
  than one and a guess.
* **F-BM** (this prompt's F-BK) — things named here that no ref contains. **None so far**: every D
  checked against the three refs in Phase 1 was found. Two things are the other way round — the ref
  contains a masthead and artwork strip that this app deliberately does not have (R3), and the ref's
  four version tokens are the app's superseded lighter set.
* **F-AV** — the material drawer. **The rail supersedes its subject**: `MaterialsBand`'s banded
  cards are what the rail replaces, so a pass to give those cards a drawer would be a pass on a
  surface that no longer exists. Recommend closing it and re-opening against the rail chip if a
  reader-for-a-material is still wanted.
* Carry forward: Correction UI's `CorrectionDraft` widening · F-AK (four blues — now with a fourth
  instance, above) · broadsheet Phase 5 (held) · F-R, F-S, F-AB, F-AE, F-X.

---

## Phase 2 — Parts A + B, measured

Identical at 1440 and 1920, on a served build:

```
tabs        2            Builder 3 · 10  ·  Tracking 11 sent
type        Playfair Display          active rgb(46,39,35)   inactive rgb(156,136,120)
underline   2px  rgb(124,58,42)       burgundy, on the active tab only
gutter      tabLeft 327 == ledgerLeft 327            left-aligned at the body's gutter
scope       "for The Smoke Test"      below the title
duplicates  []                        no second manuscript control on the page
console     no errors
```

### D3 proven in BOTH states, because the fixture only has one of them

A census of all three manuscripts found **none** in D3's state — `seed-ms-1` has 11 sends, and the
other two have nothing at all and sit on teach-first. A sweep of the default scope would have
reported "two tabs" and proved nothing about the rule.

One covering letter was created on `seed-ms-2` to put it in the populated branch with zero sends,
and **deleted in the same run** — the census afterwards shows all three manuscripts exactly as
found.

```
with sends   tabs 2   Builder 3 · 10 · Tracking 11 sent   panel in DOM: yes
no sends     tabs 1   Builder 0 · 2                       panel in DOM: NO      teach-first: no
```

The last two columns are the ones that matter: the Tracking panel is **not in the document**, not
hidden; and `teachFirst: false` proves the case is genuinely the populated branch rather than the
first-run screen, which would have shown one tab for an unrelated reason.

### ⚠️ Two probe faults found on the way, both mine

**`document.querySelector(".wsh-sub")` returned another page's masthead.** The workspace keeps every
page MOUNTED, so the first match in the document was the To-do page's description — and the probe
reported the packages masthead as stating *"Every query, every response…"*. Scoped to the visible
`.wpg`, it reads `for The Smoke Test`. The hazard is recorded in CLAUDE.md and it still caught me.

**The scope switch timed out rather than clicking.** Per the standing rule that is the element
saying something, not an invitation to `force`. The switcher is chrome this page does not own, and
what is under test is how this PAGE responds to a change of scope — so the measurement writes
`scriptally_active_manuscript_id` and reloads, which is the same read path the page uses on every
visit.

---

## The flag register — authoritative, swept from the repo

Swept from `reports/*.md`, `CLAUDE.md` and `src/`, not from memory. **Next unused letter: `F-BN`.**

Allocated: `F-A`…`F-Z`, `F-AA`…`F-AQ`, `F-AT`…`F-AZ` (no `F-AR`/`F-AS`), `F-BA`…`F-BM` (no `F-BG`).

**The two that collided in this pack's prompt, and what they actually are:**

| | subject | ruling |
|---|---|---|
| `F-BJ` | the portion derived from `materialsWanted` rather than a second field | **ruled: derive** |
| `F-BK` | D7's dotted divider, which no ref draws | **ruled: build as a decision** |
| `F-BL` | *(this pack)* no tab primitive existed; one built, not promoted | open |
| `F-BM` | *(this pack)* `Switch book` in the ref, deliberately unbuilt | **ruled: stays unbuilt** |

⚠️ **Regenerate this by sweeping, never by remembering.** The command is one line and it is what
found the collision:

```
grep -rhoE "\bF-[A-Z]{1,2}\b" reports/*.md CLAUDE.md src/ | sort -u | tail
```

## D6's premise was wrong, and it is the third of its kind

The prompt says `Switch book` defers to *"the sidebar's existing switcher"*. The switcher is
`ShellScope` in the **top bar** — moved there deliberately, its own note saying *"it lives in the bar
because every figure on screen is filtered by it, and in the sidebar it vanished the moment the
panel collapsed."* That change of premise is what makes the link redundant rather than merely hard
to wire: a control that is always on screen does not need a second door.

Recorded beside the two from the last pack — `SUBMISSION PACKAGE` from a retired band, and the
dotted divider from a mockup — because three instances is a shape, not a slip.
