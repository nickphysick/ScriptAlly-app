# Attachment surfaces — six removals, one trap, one lie (25 Aug)

## Part 1 — the picker could not be dismissed, and its Escape was a decoy

⚠️ **The premise holds, and the reason is worse than "no handler".** `PackagePicker` *did* carry an
Escape handler — as `onKeyDown` **on the panel**, which fires only while focus is inside it. Nothing
focused the panel on open, so the key never reached it. There was no outside-click either
(`useFixedMenu` positions and does **not** dismiss — easy to assume otherwise) and no visible
control. **Three routes, none of them working.**

Now: a document-level `keydown`, a document-level `pointerdown` outside test, and a `×` in the head.
Escape is deliberately **not** stopped, for the reason `RemovePopover` already states — this is a
panel over a page that owns its own Escape handling.

⚠️ **The outside-click listener binds on the next frame.** Bound synchronously it catches the very
`pointerdown` that opened the panel and closes on the click that asked for it.

**D2:** every route calls `onClose` and only `onClose`. The attachment happens in `onPick` and
nowhere else.

### F-AO — the audit: one broken, four complete

| dialog | Escape | outside | visible close | verdict |
|---|---|---|---|---|
| **`PackagePicker`** | on-panel only, never focused | **none** | **none** | **0 of 3 — fixed** |
| `CorrectionSheet` | on-panel, and it **does** focus (`firstRef.current?.focus()`) | `.cor-scrim` onClick | Cancel ×3 | complete |
| `RemovePopover` | document `keydown` | document `pointerdown` | Cancel | complete |
| `PackageModal` | document `keydown` | backdrop with a target check | `×` + Cancel | complete |
| `PackagesDrawer` | via `Form11Drawer` | scrim | `×` + "Got it" | complete (driven when built) |

The distinction that mattered: an on-panel `onKeyDown` is only a dismissal route **if something
focuses the panel**. Two dialogs use that pattern and only one of them focuses.

## Part 2 — the conflict copy is deleted, and it described an impossible write

The line read *"Covering letter is already attached — the package's copy will sit beside it"*. That
announces a duplicate, and a query holds a package **or** a loose list, never both:
`materialsLinkWrites` clears one side as it writes the other. **There is no beside-it and never was
— the copy described a write the code cannot perform.**

Deleted with it: `overlaps`, `overlapNote`, their tests, the `.qc-pkgclash` rule, and the picker's
`existing` prop — which fed nothing else and would otherwise have been left accepted-and-unread.

### F-AP — D6's answer: no, and it is structural

```
44 queries · link-only 8 · loose-only 3 · BOTH 0
```

`materialsLinkWrites` returns `{ packageId, materialsWanted: [] }` or `{ packageId: "", materialsWanted }`
— one shape or the other, never a merge. The replacement is stated once, in `switchToPackage`'s
confirm, which is the honest place: a sentence about what happens to the whole send rather than a
warning stapled to each option.

## Parts 3–5 — the four removals

**D7 · `SAVE AS PACKAGE ›` gone.** Building a package is packages-page work; offering it inside a
record of what was sent is a conversion nudge where facts belong.

**D8 · the loose row's dashed slot gone.** It rendered empty on the live page, and loose materials
are not an object needing an emblem. **D9: the packaged strip keeps its parcel and seal** — it *is*
a named, contained thing, and the contrast between the two rows is the design. Asserted, so the
removal cannot creep: the lock now requires `PARCEL_SLOT` to survive.

**D10 · the third `+ Attach` gone from the fork's state.** The fork already asks the whole question;
this repeated one of its two answers three inches below. ⚠️ **It is hidden, not unmounted** — the
fork's `List materials` opens this very menu by clicking its trigger ref, so removing the element
would break the branch it duplicates.

**D11 · the lock notice gone from the strip. D12: `CHANGE PACKAGE` and `REMOVE` stay.** ⚠️ **D13
verified before removing, not after:** the packages card renders `LOCKED_NOTE` + `LOCKED_WHY`
(`PackagesBand:127`) and the drawer's "Worth knowing" says a sent package's contents stop changing
(`PackagesDrawer:58`). Nothing was lost.

### ⚠️ Removing the promote orphaned the replacement confirm — and D5 wanted it kept

`switchToPackage` sat behind `Save as package ›`: confirm, *then* open the picker. With that control
retired its only caller went, which would have left a package silently replacing a listed set from
the Attach menu. So the question **moved to where the write happens**: choosing a package while
materials are listed now asks first, and — because the writer has chosen by then — **it can name the
package**, which the old wording could not.

### ⚠️ An existing lock forbade the expression D10 needed, and it was right to

`queryCentreChassis` forbids `baseMaterialsFor(activeQuery, activeAgent).length`, because a count
over three visible rows states what the reader can already see. D10 needs that length as a
**branch** — it renders no number. The lock was a substring test, so it caught a use it was never
written about; it now names the **rendering** shapes (`meta={…}`, `{…}`) instead. The law is
unchanged and stated more precisely than before.

Also retired with their subjects: `SHEETS_SLOT`, `.qc-loose-promote`, the loose slot's CSS rule, and
six `sentStrip` cases — replaced by the inverse assertions, which are stronger. ⚠️ **My own new lock
caught my own comment** on its first run: the stylesheet's prose *names* `.qc-loose-promote` to
record the retirement, which is exactly the documentation this repo wants and exactly what a bare
`toContain` fails on. Comments stripped first, per the standing rule.

## Phase 4 — all four states, counted at 1440

**44 of 44 rows swept.**

| state | strip | loose | fork | gone-msg | promote | loose slot | +Attach | lock | parcel | seal | pointers |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **packaged** | 1 | 0 | 0 | 0 | 0 | 0 | 0 | **0** | **1** | **1** | Change package · Remove |
| **loose** | 0 | 1 | 0 | 0 | **0** | **0** | 1 | 0 | 0 | 0 | — |
| **unattached** | 0 | 0 | 1 | 0 | 0 | 0 | **0** | 0 | 0 | 0 | — |
| **package removed** | 0 | 0 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | — |

Exactly one attachment block per state. All four removals absent in every state. The packaged strip
keeps its parcel, its seal and both pointer controls (D9, D12). `+ Attach` survives only where
materials are listed, which is where it means something.

⚠️ **The first run reported D10 as failing, and the probe was wrong.** `offsetParent !== null` is the
usual visibility test and does **not** catch `visibility: hidden` — an element taken off the page
still has an offset parent. The D10 control is hidden that way deliberately, because the fork's
`List materials` clicks its ref. The census now checks computed visibility too.

---

# The stationery band — Option B (25 Aug)

Ref committed. **Only the packaged attachment changes**; the loose row, the fork, the picker and the
confirms are untouched (D7).

## Measured at 1440 and 1920

```
card       white · box-shadow rgb(227,235,243) 0 0 0 3px + the soft drop
head       linear-gradient(#e3ebf3, #d5e1ec) · glyph 1 · label "SUBMISSION PACKAGE"
name       "Comps-led variant" · Playfair Display 17px · overflow −0.09 · has a descender
pills      3 · dashed placeholders 0
actions    CHANGE PACKAGE · REMOVE — outside the card
```

⚠️ **The ref gives the name no `line-height`, so it takes the standing floor rather than a mockup
value.** This file's history records two crops from exactly that shape. Measured on the fractional
rect with a 1px threshold: **−0.09** at both widths, on a name that carries a `p`.

## D6 — long names wrap, and the label never squeezes

Seeded `"The Complete Autumn Submission Bundle for Literary Agents"`, then restored:

```
@1440   4 lines · collide false · label intact · overflow −0.38
@1920   2 lines · collide false · label intact · overflow −0.19
```

`margin-left: auto` + `flex: none` on the label is what does it: the name grows leftward into the
space before the label and **wraps** rather than pushing it off the end.

⚠️ **The four-material case cannot be seeded, and that is a fact about the model rather than a gap
in the test.** `linkedChips` maps `packageItems`, which is the package's **three slots** — letter,
synopsis, sample. `otherMaterials` is free text the strip does not render. **Three pills is the
maximum a packaged card can hold today.** The body's wrap was proven anyway: at 1440 the three pills
already occupy two rows (`bodyRows: 2`), which is the behaviour D6 was asking about.

*(This is the standing open question recorded in CLAUDE.md — `Other` has no home in the package
model — surfacing again from a different direction. Not resolved here.)*

## D5 — the dashed placeholders are gone from this surface

No dashed border survives anywhere in the card. `PARCEL_SLOT`, `SHEETS_SLOT` and `STRIP_PLATE_PX`
are deleted; the mark is drawn inline at 15px. **The artist's slot inventory is updated** in
`reports/packages-two-state.md` with the two retired rows and the reason; the first-visit carousel
and the three stage discs are unchanged and still wanted.

## D4 — the actions leave the object, and the keyboard can still reach them

```
at rest           opacity 0
on hover          opacity 1
pointer away      opacity 0
keyboard focus    active true · opacity 1
titles            "Change which package this query used" · "Change this query to carry no package"
```

⚠️ **It is `opacity`, not `display` or `visibility`** — both of those take the buttons out of the tab
order, so `:focus-within` could never fire: the element would have to be focusable before it could be
focused into. Opacity keeps them reachable by Tab, which is what makes the focus reveal work rather
than merely look like it should.

⚠️ **And the first run reported focus-within as broken about a working reveal** — it read `opacity`
during the 0.15s transition, which reports where the property *started*. This repo's own standing
trap, and `liftMotionSuppression` is what makes it live.

On a coarse pointer the actions render visible: there is no hover to give, and unreachable is not a
state to ship while the mobile pass is pending.

### F-AQ — no interaction with the pane's in-place grammar

On a packaged query the pane's only in-place control is the send method (`Email`), and it sits
**outside** `.qc-attach`. Focusing it leaves the band's actions at `opacity: 0`. The reveal is scoped
to the attachment block and cannot be tripped by the pane's own editing.

## Phase 4 — all four states, 44 of 44 rows

| state | card | glyph | label | dashed | acts outside | loose | fork | gone | promote | +Attach |
|---|---|---|---|---|---|---|---|---|---|---|
| **packaged** | 1 | 1 | 1 | **0** | **true** | 0 | 0 | 0 | 0 | 0 |
| **loose** | 0 | 0 | 0 | 0 | — | 1 | 0 | 0 | **0** | 1 |
| **unattached** | 0 | 0 | 0 | 0 | — | 0 | 1 | 0 | 0 | **0** |
| **package removed** | 0 | 0 | 0 | 0 | — | 0 | 1 | 1 | 0 | 0 |

**Zero regressions** against the previous report's per-state counts — the loose row, the fork and the
removed-package message are unchanged (D7).
