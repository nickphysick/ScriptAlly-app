# What you sent refinements + smaller-tonal monograms

Two revisions to the Queries pane. On `main` in `/Users/nickphysick/ScriptAlly-il` (branch
`claude-il`, the standing worktree — no new branch). One commit per phase, revertible. Gates green
before each commit (tsc + production build + full Vitest — **938 green**; rules-compile unaffected, no
rules touched). No new fields, no rules changes.

**Design refs — both committed** (⚠ **spec-derived**; colours from `.t-f12` tokens, not the files'
hex): `design-refs/whatyousent-b-refined.html` (updated to the final editor) and
`design-refs/monogram-styles.html`.

---

## Phase 1 — What-you-sent editor polish (`8866219`)
- **Save → soft-pink CTA** (`#f5e2da` fill / `#e8c8bc` border / burgundy text, matching "Log a query")
  — no longer burgundy-filled.
- **Unit toggle selected → inset `--ink` ring, no fill**; unselected stay plain/muted.
- **Quantity input loses its placeholder** (empty field, no "e.g. …").
- **Query letter / Synopsis are toggles** — the pip reads **"Mark sent"** when unsent; clicking the row
  flips it. Un-marking is a **correction to a factual record**: `toggleDocMaterial` →
  `updateQuery(materialsWanted)`, a plain field patch that **writes no timeline-log entry** (consistent
  with the corrections model elsewhere — verified: no `addActivity`/status write in that path).
- **Sample materials gains a "Remove" link beside "Change"** → clears it back to **"Not included"**
  (the in-editor remove button is retired; one home). Remove is the same no-log correction path.

## Phase 2 — Submission-package action by plan (`8c18298`)
The package foot row's action gates on the **same plan check the app uses**
(`currentUser?.plan === UserPlan.PRO`):
- **Pro** → **"Attach a submission package"** → the packages page (as today).
- **Free** → a **slate "Upgrade to attach a submission package"** → `onNavigate("plans")` (the existing
  in-app upgrade/plans flow, same target as AccountSettings / Nav / MaterialsField).
Attaching itself **stays Pro-gated** — only the label + route change for free users.

## Phase 3 — Query-list monograms → smaller tonal (`<this commit>`)
Per `monogram-styles.html` (smaller-tonal): the query-list agent monograms become **32px, warm-grey
tonal fill, ink initials, no border** — so colour stays reserved for the semantic StatusDots and the
monogram column stops dominating the left edge.

### Shared-component handling (the Step-0 scoping)
`.f12-av` is a **shared** class: `.f12-row .f12-av` styles the monogram in **both** the query list
(`Queries.tsx`) **and** the Contact List (`Agents.tsx`). The large reading-pane header uses a different
class (`.f12-bigav`); the account chip uses `.f12-av2`. To scope the change to the query list **only**,
I added an **additive `.f12-av--sm` modifier** to the query-list span alone and a matching rule in
`f12.css` (placed after the base rule so it wins at equal specificity):

- **Changed:** the query-list monogram (`Queries.tsx` — `f12-av f12-av--sm`).
- **Unchanged:** the Contact List monogram (`Agents.tsx`, plain `.f12-av`), the reading-pane header
  monogram (`.f12-bigav`, 76px), and the account-chip monogram (`.f12-av2`).

The warm-grey token `--mono-tonal: #ece5db` is defined in **`f12.css`** (a `.t-f12` block), **not**
`index.css` — a parallel stream holds an uncommitted theme retoken in index.css and the working
discipline forbids touching another stream's WIP. Flagged to fold into index.css's `.t-f12` token
block once that lands (same precedent as `contentColumn.css`).

---

## Confirmations
- Save is **soft-pink**; unit toggle is **outline-selected**; the quantity **placeholder is gone**.
- Query letter / Synopsis / sample materials **toggle & remove as corrections — no timeline log**.
- Package action **gates Attach (Pro) / Upgrade (free)** off the app's plan check.
- Monogram change **scoped to the query list** via an additive variant; Contact List / reading-pane
  header / account chip untouched (shared-component handling above).
- **No new fields, no rules changes.** Tokens not hex (`--mono-tonal` added in `f12.css`); UK spelling;
  locked components consumed verbatim (`TypeGlyph`, `StatusDot`, `F12Menu`).

### Git log (this pass)
```
<phase-3>  feat(queries): query-list monograms → smaller warm-grey tonal (scoped)
8c18298    feat(queries): submission-package action reads Attach (Pro) / Upgrade (free)
8866219    feat(queries): What-you-sent editor polish (soft-pink save, outline toggle)
```
Clean `git status` after the Phase 3 commit (bar the pre-existing out-of-scope theme WIP
`themes.md`/`index.css`, untouched); every phase individually revertible. No deploy, no branch, no PR.

## ⚠ Verify in-browser on dev (auth-gated — the preview harness can't log in)
- What-you-sent: soft-pink Save; outline unit toggle; empty quantity; toggling Query letter/Synopsis
  (Mark sent ↔ Sent, no log); sample Change/Remove; free-vs-Pro package action.
- The query list at 32px warm-grey tonal monograms; confirm the Contact List monograms are unchanged.
