# Query letters v2.1: top tips in the header, and the "no words yet" state

13 Nov 2026 · branch `query-letters-v2-1` (pushed) · dev line `dev/clh2-nwv1-clh21-ql21` (pushed) · ref `design-refs/query-letters-v2-1/query-letters-v2-1.html` (sha256 `fd6f7c72…1313d3`, matches)

## False premises and disagreements (first)

1. **CLAUDE.md's "direct-to-main only".** Known; Nick's standing ruling is that packs branch from the dev line, so this one did.
2. **The four premises held.**
   - The sent-text lock is client-only (`updateVersion`, `src/lib/db.tsx`); `firestore.rules` allows `contentDraft` on any version update, so no rules change was needed.
   - A letter can have no `contentDraft`, with or without a `fileName`.
   - `inUseLetter` and "Use for new queries" are unchanged.
   - v2 rendered the package line inside the header's in-use block.
3. **Undo would have hit the lock.** The Undo of an add-once save writes empty text back onto a sent letter that by then has text, which the lock refuses. The rule therefore carries one more case: `restoring` may put the text back to **empty**, and only to empty.
4. **The served line's QL2-11 was already stale.** Phone app v5 (8985b5e3a, on the line before this pack) sends `/materials/letters` on a phone to Materials' Letters tab. v2's lock still expected v3's `/manuscripts#materials`. The redirect is untouched; the lock follows v5 (782c8f3a7).
5. **One wording choice.** The brief says to make "query"/"result" singular for one. In the sent-no-text paragraph, one query reads "Its 1 query and its result stay exactly as they are." ("their" becomes "its" too, or the sentence breaks).
6. **The ref's "What your agents ask for" header variant is not built.** It sits in the ref's code with no control in the reference strip, and the brief asks only for the tip.
7. **Screenshots are from the emulator build of the deployed commit, not from dev.** The fixture (a sent letter with no text, an unsent one kept in a file, a package holding another letter) exists only in the emulator seed. Dev runs on live dev Firestore, which has no such letters, and a live run is opt-in. The code is the same commit dev serves.

## Baseline vs final

| Gate | Baseline (2d7e66e69) | Final (782c8f3a7) |
|---|---|---|
| `tsc --noEmit` | 0 errors | 0 errors |
| `vite build` | clean | clean |
| Vitest | 3 failed / 12 372 passed | 3 failed / 12 381 passed |

The three failures are the same in both columns: `emuGuard` "no recipe…" and `firestoreTarget` ×2. Their offender lists diff identical, and the new seed is not among them.

## Phases

| Commit | What |
|---|---|
| e8f36e2ad | **A**: the ref + `SHA256SUMS`; `tests/e2e/seedQueryLettersV21.mjs`; `tests/e2e/queryLettersV21.measure.ts` |
| 67552b164 | **B + C** in one commit: they share the page, `LetterDesk.tsx`, the stylesheet and the smoke |
| 782c8f3a7 | QL2-11 follows phone v5's redirect (see 4 above) |

**B, the Top tip.** `TopTip.tsx` takes the third column:
- "Top tip" and "Next tip" over the 2px navy rule;
- a white card with the quill, the title and the sentence;
- five marks, with the current one navy.

Next tip wraps after the fifth. The position is kept in `localStorage` (`scriptally_ql_tip`), with every access in try/catch, so with no storage it starts at tip 1. Tip 4 reads `LETTER_MIN_SENT`. On day one the column stays empty.

The in-use block, its "Change" link, the picker and their state, Escape layer and outside-click listener are deleted. The package line now sits under the in-use letter's name and meta, with the same wording and link.

**C, the "no words yet" state.** Any letter with no text shows the ref's ruled sheet:
- **Unsent:** "The words aren't here yet", with Paste the text and Upload the file.
- **Sent:** a lock line above the sheet and "What did this letter say?", with Add the text you sent and Upload the file, and the add-once note beneath.

Both first buttons open the v2 editor on **that** letter (`kind: "edit"`), empty. "Upload the file" reads a text file into it, or records another file by name, and saves to that letter. Saving gives "Saved {name}." with Undo back to empty. This replaces v2's new-version path for a sent letter with no text.

**Removed with what replaced it:**
- v2's dashed file box and `letterBits.isFileOnly` (nothing reads it now);
- the picker, in-use-line and file-box CSS.

### The add-once rule: the exact line that changed (`src/lib/db.tsx`, `updateVersion`)

Before:
```ts
    if (content && isVersionSent(id, queries, packages)) {
```
After:
```ts
    if (content && isVersionSent(id, queries, packages) && !contentWriteAllowed({
      sent: true, savedText: versions.find((v) => v.id === id)?.contentDraft,
      hasIncomingText: "contentDraft" in fields, incomingText: fields.contentDraft, restoring: opts?.restoring,
    })) {
```
`contentWriteAllowed` (new, `src/lib/versionLock.ts`) lets a content write through on a sent version only while its saved text is empty, or as the `restoring` Undo that puts the text back to empty. Nothing wider changed: a sent letter with text refuses every content write as before.

## Locks: red before, green after

**Red** = 2d7e66e69 + Phase A (the page as v2 left it). **Green** = 67552b164. Both on the emulators, one worker.

| Lock | Red | Green |
|---|---|---|
| QL21-1 third column is the tip card; no in-use block, Change or picker (1440 + 1920) | ✘ | ✓ |
| QL21-2 Next tip walks 1→5, wraps to 1, navy mark follows, a reload keeps it | ✘ | ✓ |
| QL21-3 tip 4 = `LETTER_MIN_SENT` (read from the source, 15) | ✘ | ✓ |
| QL21-4 Use for new queries from a letter, with Undo | ✘ (in the same test as QL21-5) | ✓ |
| QL21-5 package line on the in-use letter; absent elsewhere and when the package's letter is in use (both populations proven) | ✘ | ✓ |
| QL21-6 unsent no-text: "The words aren't here yet"; no sheet on the page has empty rendered text (1440 + 1920) | ✘ | ✓ |
| QL21-6b "Upload the file" loads a text file into the editor for THAT letter | ✘ | ✓ |
| QL21-7 sent no-text: add → Save writes that letter once; figures "1 sent 1 replied 0 asked for more" unchanged; Undo restores empty | ✘ | ✓ |
| QL21-8 afterwards: no Edit or Add, typing + ⌘S changes nothing; direct write refused (unit) | ✘ | ✓ |
| QL21-9 a sent letter with text: direct write refused (unit; v2's lock holds) | n/a (the function is new) | ✓ |

Unit: `src/lib/versionLock.addOnce.test.ts`, 6 cases. It covers locks 7, 8 and 9's write rule, plus a source check that `updateVersion` calls the rule above its `updateDoc`. Before the change the module export did not exist. The smoke gains the tip, both no-text states and the package line's new home.

### Lock 10: v2's own locks

All 14 of v2's own tests pass on the branch. Four changed, each because it read something v2.1 removes or something another pack had already changed:

- **QL2-1:** measured the in-use block's left edge; now the tip block's (still 1020 = rail at 1440, 1414 at 1920).
- **QL2-3:** read the default selection's name from the in-use block; now from the flagged row.
- **QL2-6/8:** read the in-use name from the block; now from the flagged row.
- **QL2-11:** v3's phone URL → phone v5's (see 4 above).

## Screenshots

`shots/`, at 1440 and 1920:

| File | Shows |
|---|---|
| `01-header-tip` | the header with a tip |
| `04-sent-no-text` | a sent letter with no text |
| `03-unsent-no-text` | an unsent letter with no text |
| `05-sent-text-added` | the same sent letter after its text is added (locked again, toast with Undo) |

## Dev deploy

- Before: `index-B3ztqgGG.js` from `dev/clh2-nwv1-clh21` @ 2d7e66e69, this branch's base.
- Merged into: `dev/clh2-nwv1-clh21-ql21` @ 782c8f3a7 (a fast-forward of that line; pushed).
- After: **`index-Jb3RX17u.js`**. Built from a clean checkout of the pushed tip, behind a served-hash check. Hosting only; prod not touched.

## Worktrees

The scratch deploy checkout is removed. `ScriptAlly-ql21` is removed once this report is pushed.
