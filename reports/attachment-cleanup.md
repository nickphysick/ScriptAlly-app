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
