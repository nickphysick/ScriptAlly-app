# Audit — slicing assertions in the `renderToStaticMarkup` specs

**Commit:** `a825600`. Gates green (tsc clean, `vite build` ✓). **Vitest 1737 — unchanged.** No deploys.

The count doesn't move because the anchors are extra assertions inside existing `it` blocks, and
vitest counts tests, not assertions. No new test cases were added, because none were needed — see the
headline finding.

---

## Headline finding: nothing turned red

**No assertion in these three specs was vacuous.** Every anchor currently matches, so the guards added
here are preventive, not repairs. You asked for the list of assertions that turn red once guarded so
you could see what they were supposed to cover — that list is empty, and it's worth saying plainly
rather than dressing the audit up as a rescue.

What the audit *did* establish is that the hazard is real and unevenly distributed: one of the three
specs is immune by construction, and the two that slice each had exactly one site where a miss could
have gone quiet.

## The inventory — 7 sites

| Spec | Sites | Verdict |
|---|---|---|
| `shellV2Smoke.test.tsx` | **0** | Immune by construction — it asserts `toContain`/`toMatch` against whole strings throughout and never extracts. Nothing to change. |
| `pageHeader.test.tsx` | 1 | `css.match(…)?.[1] ?? ""` — **guarded** |
| `workshopEmpty.test.tsx` | 6 | 3 counts (self-anchoring) + 2 splits + 1 slice — **guarded** |

### Guarded, and why each mattered

**`pageHeader.test.tsx:78`** — the disabled-button CSS rule, read with `?? ""`. Its four positive
assertions would fail on a missed match, so the test couldn't go silently green *today*. The exposure
was narrower: `.not.toContain("opacity")` and `.not.toContain("dashed")` are both satisfied by an
empty string, so if the CSS were ever reformatted those two would stop testing the thing they exist
for — never-opacity-only, never-dashed — while the failure pointed somewhere else. Now the regex is
asserted against the CSS with `toMatch` before being used to extract, so a reformatted rule fails
naming *the rule*.

**`workshopEmpty.test.tsx`** — four guards:
- the shell marker is asserted present before the split;
- the shell-count anchor is **restated inside** the `it` that consumes it, so that test no longer
  depends on a sibling test having run (it was reading a `const` computed in the enclosing `describe`);
- each shell is asserted to contain its footer boundary before being sliced on it;
- the resulting slice is asserted non-empty before the focusability check runs on it.

### Left alone deliberately

The three `match(/…/g)` counts assert `toHaveLength(n)` where n > 0. **That assertion is the anchor** —
a missed match gives length 0 and fails. Adding a preceding `toContain` would read as diligence while
adding no check, so it wasn't added.

## Correcting my own account of the original bug

I described the first failure as the good failure mode. You called it luck, and you were right — but
the mechanism is worth pinning down, because it isn't the one the audit was framed around.

There are **two** failure directions:

| Shape | What happens | Behaviour |
|---|---|---|
| Slice to **nothing** — `match(…)?.[1] ?? ""`, `split(x)[1]` when `x` is absent | negative assertions on an empty string all pass | **silent green** |
| Slice to **everything** — `split(x)[0]` when `x` is absent | you get the whole remaining document | depends what's in it |

My bug was the second. `split('<div class="pkgw-gfoot">')[0]` on a marker that didn't exist returned
the shell *plus the rest of the page*, and the rest of the page happened to contain the example band's
button — so the "nothing focusable" assertion failed. **Had the example band sat above the skeletons
instead of below them, that test would have passed while inspecting the wrong markup entirely.** So:
luck, exactly as you said, and the slice-to-everything direction is the sneakier of the two, because
whether it fails depends on unrelated page order.

**Verified the guard fires.** Re-breaking `SHELL_FOOT` to the wrong class now fails at the anchor with

```
expected '<div class="gband">…' to contain '<div class="pkgw-gfoot">'
```

naming the marker, rather than at a focusable-element assertion three lines later.

---

## Is it worth a CLAUDE.md house rule? Yes

Three reasons: the pattern is already in three specs and will spread as more auth-gated surfaces get
smoke coverage; the failure is silent in one direction and order-dependent in the other, so neither
review nor a green suite catches it; and the fix is one line, so the rule costs nothing to follow.

Suggested wording — for the conventions area, near the existing testing notes:

> **String-rendering specs — anchor before you slice.** Component specs render through
> `renderToStaticMarkup` (there is no jsdom in this repo) and assert against the HTML string. Whenever
> a spec **slices, splits or extracts** on a class or marker, assert that the marker exists first —
> one `expect` per slice. A missing marker fails in one of two silent ways: extracting yields `""` (or
> `?? ""` / `?? []`), and every `.not.toContain` on an empty string passes; or `split(marker)[0]`
> yields the whole rest of the document, and whether the test notices depends on what happens to sit
> further down the page. Both go green while testing nothing. Prefer whole-string `toContain` /
> `toMatch` where it will do the job — `shellV2Smoke.test.tsx` never slices and is immune by
> construction. Where a slice is genuinely needed, restate its anchor inside each `it` that consumes
> it rather than relying on a `const` in the enclosing `describe`.

I have **not** added it to CLAUDE.md — that file is shared and edited by other streams, and a docs
edit wasn't in this brief. Say the word and it's a one-line commit.

## Not started

Phase D — the old-builder retirement and `pkg-lab` removal — remains gated on your dev review, and
`PackageWorkshop.tsx` is untouched.
