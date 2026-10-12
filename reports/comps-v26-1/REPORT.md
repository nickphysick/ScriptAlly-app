# Comparable titles v26.1 — report

Branch `comps-v26-1`, cut from `comps-v26` at `d875e1e9`. Not merged.

| Change | Commit |
|---|---|
| 1 and 3 · the exhibit's switch; focus return; AD9 and AD10 | `fbd5e33e` |
| 2 · the picker's first frame; CV25 E2 | `f8051be1` |
| 4 · the stylesheet sweep | `0e402cc5` |
| Project notes | `7350a561` |

The consolidated lock run was made at **`7350a5615c2bddf07e91331e5d973462f8b11f42`**. The dev build is recorded in `INTEGRATION.md`, on the dev branch only.

## 1. False premises

1. **The original E2 read cannot hold "never an empty frame" on its own.** Restored as asked, it reads the picker the moment it mounts, with no wait. On the unfixed build that read was GREEN in the red-first run: whether it lands in the empty frame is a matter of timing. So E2 also records every change inside the picker after it is first put in the document, and requires none. That reading is red on the unfixed build every time.
2. **Two of AD10's three claims already held in v26.** Opening the drawer put focus in Title, and Cmd/Ctrl + Enter saved from the note. Only the focus return was missing, so only those readings were red first.
3. **`CompCard` is rendered only by the exhibit.** Removing the switch from the sample cards leaves the card's live path (grip, switch, Edit and Remove as buttons) with no caller anywhere. I did not delete it.
4. **The sweep reached two things that are not rules of the old form.** The `.cpv-scope` wrapper existed only to carry the old form in the drawer, and nothing emits it now. The token `--cpv-requested` was read only by the old form's duplicate notice, and a unit lock fails on a token nothing reads. Both went.

## 2. Each change, red and green

Red first means the lock was written before the fix and run against the unchanged build (`red-first/`). Each lock was then also proved red by its named mutation against the fixed build.

| Change | Lock | Red first (unchanged build) | Red under its mutation | Green |
|---|---|---|---|---|
| 1 · exhibit switch | AD9 | `5 switch element(s) · the words "In query letter"` at both sizes | Restore the switch in the card: the same reading, at both sizes | 0 switch elements, 0 line elements, 0 grips; "Your comps 3", three cards, no buttons |
| 2 · picker first frame | CV25 E2 | `drawn with "", then changed`; six changes after it was drawn (the letter, three ticks, the count, the pressed letter) | Choose the letter in an effect: the same two readings | drawn on the current letter; 0 changes after it is drawn; 3 logged |
| 3 · focus and keys | AD10 | all four closes at both sizes: `closed true · focus on body` (8 readings) | Drop the focus return: the same 8 readings | focus in Title on opening (add and edit); ✕, Cancel and Escape return focus to "Add a comp"; Escape in edit returns it to the row's Edit; Cmd + Enter (1512) and Ctrl + Enter (1280) from the note write one comp and close the drawer |

AD9 keeps its first mutation too (restore the query line); the second logs as `AD9-switch`. E2 keeps its first (write to every letter); the second logs as `E2-firstframe`.

**What was built**

- **Picker.** The letter and its ticks are set while rendering, when the request changes, so React renders again before anything is drawn. The effect is gone.
- **Focus return.** The page remembers what had focus as the drawer opens and focuses it as the drawer closes. It does not when the drawer hands over to the picker, when the opener has left the page (the empty page's button, once the first comp is added), or when the N key opened it. `HalfDrawer` is unchanged, so the Contact list's drawer does not do this.
- **Exhibit.** One condition in `CompCard`.

## 3. The stylesheet sweep

Removed from `compsV2.css`: 28 rules, the `.cpv-scope` wrapper in three selectors, and one token. 137 rules before, 109 after; every rule not listed here is still present, compared rule by rule.

```
.cpv-lbl
.cpv-form
.cpv-fh
.cpv-fh b
.cpv-keys
.cpv-fgrid                      (and its override in the 1360px media block)
.cpv-fgrid2
.cpv-mrow
.cpv-f
.cpv-f label, .cpv-f .fl
.cpv-f .req
.cpv-f input, .cpv-f textarea
.cpv-f textarea
.cpv-f input:focus, .cpv-f textarea:focus
.cpv-f .hint
.cpv-f .err
.cpv-chipin
.cpv-chipin:focus-within
.cpv-chipin .cpv-facet
.cpv-chipin .cpv-facet button
.cpv-f .cpv-chipin input
.cpv-f .cpv-chipin input:focus
.cpv-dupe
.cpv-dupe > span
.cpv-ff
.cpv-ff .hint
.cpv-ff .btns
```

Also: `:is(.cpv-page, .cpv-scope)` became `.cpv-page` (twice), `.cpv-scope, .cpv-page {` became `.cpv-page {`, and `--cpv-requested` was deleted.

**No removed selector is used.** Each class searched as a whole word across every `.ts`, `.tsx` and `.css` file in `src/`, after the sweep:

| Class | Matches in src/ |
|---|---|
| cpv-lbl, cpv-form, cpv-fh, cpv-keys, cpv-fgrid, cpv-fgrid2, cpv-mrow, cpv-f, cpv-chipin, cpv-dupe, cpv-ff, cpv-scope | 0 each |

`--cpv-requested`: 0 matches. The ids `cpv-f-title`, `cpv-f-author` and the rest are the new form's field ids, not the class `cpv-f`, and are untouched.

**Not swept**, because they are the old page's and not the old form's: `.cpv-btn--line`, `.cpv-hint`, `.cpv-libfact`, `.cpv-full` and `body.cpv-reordering` are also named nowhere else in `src/`.

## 4. Suite results on comps-v26-1

One pass at 1512 × 900 and 1280 × 800 on a dev bundle built from the clean tree at `7350a5615c2bddf07e91331e5d973462f8b11f42` (`run-consolidated.txt`): **26 passed, none failed.**

- AD1 16 · AD2 14 · AD3 36 · AD4 14 · AD5 18 · AD6 18 · AD7 11 · AD8 12 · AD9 10 · AD10 22 (171 readings). AD1 to AD8 read the same as on `comps-v26`, reading for reading.
- B1 18 · B2 32 · C1 14 · D1 8 · D2 29 · D3 9 · D4 8 · E1 18 · F1 24 · L1 10 · A1 8 · E2 11 · A3 12 (201 readings).

Gates at the same commit: typecheck clean (app and functions), production and dev builds clean, Vitest 570 files, 8,626 passed, 3 skipped (the baseline's figures).

The query panel v1 and onboarding v9 suites run on the merged dev build; their results are in `INTEGRATION.md`.

## 5. To check

- **After the drawer closes, the row whose Edit opened it keeps its tray on show** until focus moves, because the tray shows on focus within the row. That follows from v25's rule; I did not measure it or change it.
- **Opened with N, the drawer returns focus nowhere.** There is no opener to return to.
- The first baseline Vitest run failed one suite because my new worktree lacked the functions dependencies. Linked and re-run: 570 files passed before any edit.
