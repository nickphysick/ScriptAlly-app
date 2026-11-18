# Submission packages v62 — locks retired and re-pointed

v62 (design-refs/submission-packages-v62/) rebuilds the page to the v62 mock: the shared navy header with a first-visit
note and a Pro tag for founding writers, "Your packages" beside the open package (What's in it, What an agent receives),
What came back (three counts, a verdict, Who got it), and All your packages side by side. The builder (Pk26Builder →
Pk393Builder), the package drawer (Pk38Drawer, Pk39Labels), Results (Pk41Results), the empty card (Pk42Empty, PkTile),
the dialog (Pk26Dialog) and v43's list, Change, bar and day one (Pk43*) are deleted. Every e2e file that measured those
is deleted with them; git history keeps them. The new locks are tests/e2e/pk62.measure.ts,
src/lib/packagesV62.test.ts and the re-pointed unit locks below.

## Deleted

| File | Measured | Now held by |
|---|---|---|
| pk26, pk26Mutate | v26's builder, tiles and rows | pk62 P1, P7 |
| pk38, pk38.shots | the package drawer and Results | pk62 P1 (What came back), P2 |
| pk39, pk39.shots, pk391, pk391.shots, pk392, pk392.shots | v39's header card, panel, drawers | pk62 P1, P6 |
| pk393, pk393.shots | the Steps + preview builder | pk62 P1 (the preview), P7 (the piece lists) |
| pk41, pk41.shots, pk41Fixture | v41's page, the founding band, Results | pk62 P1; the founding note in materialsPageSmoke |
| pk42, pk42.shots | v42's tiles and How it works | pk62 P5 (How it works) |
| pk43, pk43Probe | v43's header, desk, list, Change, bar, day one | pk62 P1, P4, P7 |

## Skipped

| File | Case | Why |
|---|---|---|
| laqV12 | V12-2 "a package's builder: that package is preselected" | the builder's "Log a query with it" door is deleted; the v62 page draws no log door |

## Re-pointed (the claim unchanged, the selector moved)

| File | Case | Change |
|---|---|---|
| wsHeaders | the `pk` page | root `[data-pk41='page']` → `[data-pk62='page']` |
| unit pk43.test.ts | P6, P8, P5 | the header, Change and the bar are v62's (Pk62Header, Pk62Slim, `isFinished`, `useForNew`) |
| unit materialsBand.test.ts | D1, D3 | the pieces are picked in the open package's lists; the put-away way back is there |
| unit workspacePageGrid.test.tsx | the Packages root | `pk43 pk62`, measure in pk62.css §0 |
| unit pk42HowItWorks.test.tsx | the page's How it works | the page mounts Pk62How; Pk42HowItWorks is kept, unmounted |
| unit materialsPageSmoke.test.tsx | `/queries/packages` | day one, nothing sent, and sent |

Not re-pointed: `sh2Lib.ts` ART's `/queries/packages` selector (`.phc-art`) already matched nothing before v62.
