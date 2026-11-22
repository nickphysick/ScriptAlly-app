# To-do list v55 — retired and re-pointed measurements

The tray's head became one line (D1) and its collapse a 64px strip of group counts saved to the account's prefs (D5,
D6). These cases measured what v55 removed:

| Suite | Case | What happened | Why |
|---|---|---|---|
| todoV52.measure.ts | L5 · the collapse: 112, … survives a reload, every item is labelled | **retired** (skip with reason) | The 112px strip of rows is gone; the strip is 64px of group counts, saved to `todoPrefs.trayCollapsed` rather than `localStorage`. TD55 L5 and L6 hold it. |
| todoV52.measure.ts | L7 · the primary … (each width, tray collapsed) | **retired** (skip with reason) | The collapsed tray has no rows to walk (D5). TD55 L5 holds the desk's footer pinned at 64px. The "tray open" variants stand. |
| todoV53.measure.ts | L9 · the bar counts the groups, and a part scrolls the tray | **retired** (skip with reason) | The breakdown bar and its counts line are removed from the tray (D1). The page header's ring and legend give the breakdown; TD54 L5 holds them to the tray's groups. |
| todoV52.measure.ts | L14 · one count: the Done tab and its intro | **re-pointed** | The Done tab carries no count (D1: "Snoozed" and "Done"); the intro is the one place the count is stated, and the case now holds the intro to the rows shown. |
| todoV52.measure.ts | L15 · a switched-off rule … | **re-pointed** | Tabs are clicked by `[data-tws55-tab]` (the segmented `.tws-seg` is gone). Behaviour unchanged. |
| todoV53.measure.ts | L10 + L11 · no Start here, and "No date" nowhere | **re-pointed** | The old Filters button is gone, and the new menu's When chip reads "No date" (D3, the mock's word, by Nick's ruling — the reverse of v53's). The case no longer opens the menu; "No date" stays out of everything else. |
| todoWorkspaceSmoke.test.tsx | the tab and the n/m both count `seq` | **re-pointed** | D4: the To do count and the page header's count are every task (`all`), never the filtered view; the desk's n/m still counts `seq`. |

`localStorage["sa.todoTraySlim"]` is no longer read; the `removeItem` calls in todoV52/53/54's set-up are harmless and
left in place. todoV52's set-up now also clears the two saved prefs through `seedTd55.mjs`, because a collapse made
in one case is saved to the account and would otherwise open the next case on the strip.
