# Retired with the Contact list v11 rebuild — swept by SELECTOR, not by filename

The v11 rebuild (design-refs/contact-list-v11.html) retires the Grid/List/Board view switch, the
quick-add slot cluster, and — in later phases — the toolbar, the card grid and the right-hand
drawer. Per the house rule, this sweep was scoped by the SELECTORS the retired things are reached
through (`data-agent-card`, `.agl-lrow`, `.agl-bcard`, `[data-add-slot]`, `.agl-gap`,
`.agl-toolbar`, `.slo` on /agents, `#/contact-lab`), because a filename sweep is how six suites
survived the Query Centre's grid retirement. Recover any file from the commit that removed it.

## Phase 1 (view switch + quick-add cluster retired)

| File | Why | Subject |
|---|---|---|
| `contactViews.measure.ts` | asserted `view=list`/`view=board` in the URL and the three renderers agreeing — the switch is deleted and `?view=` is now accepted and ignored | gone |
| `contactBoard.measure.ts` | the Board renderer (`.agl-bcard`) is deleted | gone |
| `contactToolbar.measure.ts` | drives `.agl-lrow`/`.agl-bcard` through the switch to test filter/sort interplay across views | gone |
| `contactToolbarRow.measure.ts` | pins the view switch flush with the row's right edge — the switch is deleted | gone (the P3 header-row locks replace it) |
| `contactSlots.measure.ts` | the dashed add slots (`[data-add-slot]`) rendered only in the List view | gone (the torn slip replaces the idiom in P3) |
| `quickAdd.measure.ts` | the quick-add popover's only anchors were the List view's slots | gone (the pop-up editor replaces it in P4) |
| `contactPortalScope.measure.ts` | proved `ContactPeekPopover` escaped the List's horizontal scroller — both the popover and the scroller are deleted | gone |

**Dead-but-tested, deliberately left until its phase:** the quick-field half of `lib/quickAdd.ts`
(`QuickField`, `nextQuickField`, `quickDiff`, `quickWarning`) lost its last caller with the
popover; `hrefFor`/`isLiveHref` in the same module are live (ContactPeek, AgentCard). The module
is swept when P4's editor lands. `contactCard.measure.ts` (grid cards) and
`contactDrawer.measure.ts` (the SlideOver drawer) keep their subjects until P3/P4 and stay.

**Known-red rows already in RED-BACKLOG.md that this rebuild will re-point rather than fix:**
`stickyRow` (Contact list chrome slab; the masthead leaves in P2), `surfaceCensus` (control row),
`compactHeader` (reads `.agl-toolbar`; the toolbar leaves in P3).
