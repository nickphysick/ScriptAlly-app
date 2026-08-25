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
