# To-do — the drawer's anatomy, recon

Contract `design-refs/todo-qc-style.html` md5 `ee08dd45d0735816dacc06a8409c1e33`, opened as a file URL and rendered; task index 0 (family `now`, verb `Send`).
Deployed page: `dev`, `/todo` in **grid** view, ticket 1 (a Send — ticket 0 is an offer, whose journey draws no fork), drawer open.
Both at 1440×900. Every value is `getComputedStyle`; nothing here is typed by hand.

## The table

### `.drawer` → `.slo`

present · contract 640×900 · dev 640×900 · 2 of 12 properties differ

| property | contract | dev | |
|---|---|---|---|
| `position` | `fixed` | `fixed` | = |
| `top` | `0px` | `0px` | = |
| `right` | `0px` | `0px` | = |
| `bottom` | `0px` | `0px` | = |
| `width` | `640px` | `640px` | = |
| `background-color` | `rgb(253, 250, 245)` | `rgb(253, 250, 245)` | = |
| `background-image` | `none` | `none` | = |
| `box-shadow` | `rgba(36, 18, 9, 0.24) -18px 0px 48px 0px` | `rgba(58, 28, 20, 0.14) -6px 0px 30px 0px` | ≠ *(waived)* |
| `transform` | `none` | `matrix(1, 0, 0, 1, 0, 0)` | **≠** |
| `z-index` | `70` | `70` | = |
| `display` | `flex` | `flex` | = |
| `flex-direction` | `column` | `column` | = |

- waived `boxShadow`: the app's drawer is a shared primitive with its own lift; the contract draws a single-use panel

### `.dtop` → `.tpn .dhead`

present · contract 640×54 · dev 624×47 · 4 of 7 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `10px` | `10px` | = |
| `padding-top` | `14px` | `10px` | **≠** |
| `padding-right` | `18px` | `12px` | **≠** |
| `padding-bottom` | `12px` | `10px` | **≠** |
| `padding-left` | `24px` | `18px` | **≠** |

### `.dhero` → `.tpn .dhero`

**MISSING on dev.** `.tpn .dhero` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `margin-top` | `0px` | **absent** |
| `margin-right` | `24px` | **absent** |
| `margin-bottom` | `0px` | **absent** |
| `margin-left` | `24px` | **absent** |
| `border-radius` | `14px` | **absent** |
| `padding-top` | `18px` | **absent** |
| `padding-right` | `20px` | **absent** |
| `padding-bottom` | `16px` | **absent** |
| `padding-left` | `20px` | **absent** |
| `border-top-width` | `1px` | **absent** |
| `border-top-style` | `solid` | **absent** |
| `border-top-color` | `rgba(58, 28, 20, 0.08)` | **absent** |
| `background-color` | `rgba(0, 0, 0, 0)` | **absent** |
| `background-image` | `linear-gradient(135deg, rgb(246, 227, 218), rgb(240, 214, 202))` | **absent** |

### `.dhero .title` → `.tpn .dhero .title`

**MISSING on dev.** `.tpn .dhero .title` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `font-family` | `"Playfair Display", serif` | **absent** |
| `font-size` | `22px` | **absent** |
| `font-weight` | `500` | **absent** |
| `color` | `rgb(58, 28, 20)` | **absent** |
| `line-height` | `28.16px` | **absent** |

### `.dhero .line` → `.tpn .dhero .line`

**MISSING on dev.** `.tpn .dhero .line` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `font-size` | `12.5px` | **absent** |
| `color` | `rgba(58, 28, 20, 0.72)` | **absent** |
| `font-weight` | `300` | **absent** |
| `margin-top` | `8px` | **absent** |
| `line-height` | `18.75px` | **absent** |

### `.dhero .chips` → `.tpn .dhero .chips`

**MISSING on dev.** `.tpn .dhero .chips` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `display` | `flex` | **absent** |
| `gap` | `8px` | **absent** |
| `margin-top` | `14px` | **absent** |
| `flex-wrap` | `wrap` | **absent** |

### `.chip` → `.tpn .dhero .chip`

**MISSING on dev.** `.tpn .dhero .chip` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `display` | `flex` | **absent** |
| `align-items` | `center` | **absent** |
| `gap` | `6px` | **absent** |
| `height` | `26px` | **absent** |
| `padding-top` | `0px` | **absent** |
| `padding-right` | `10px` | **absent** |
| `padding-bottom` | `0px` | **absent** |
| `padding-left` | `10px` | **absent** |
| `border-radius` | `999px` | **absent** |
| `background-color` | `rgba(255, 253, 250, 0.75)` | **absent** |
| `background-image` | `none` | **absent** |
| `border-top-width` | `1px` | **absent** |
| `border-top-style` | `solid` | **absent** |
| `border-top-color` | `rgba(58, 28, 20, 0.1)` | **absent** |
| `font-size` | `11px` | **absent** |
| `color` | `rgb(58, 28, 20)` | **absent** |
| `font-weight` | `500` | **absent** |

### `.dbody` → `.tpn .workscroll`

present · contract 640×625.9 · dev 384×375.4 · 4 of 9 properties differ

| property | contract | dev | |
|---|---|---|---|
| `flex-grow` | `1` | `1` | = |
| `flex-shrink` | `1` | `1` | = |
| `flex-basis` | `auto` | `auto` | = |
| `min-height` | `0px` | `0px` | = |
| `overflow-y` | `auto` | `auto` | = |
| `padding-top` | `20px` | `0px` | **≠** |
| `padding-right` | `24px` | `0px` | **≠** |
| `padding-bottom` | `24px` | `0px` | **≠** |
| `padding-left` | `24px` | `0px` | **≠** |

### `.ql` → `.tpn .forklbl`
> NAME COLLISION: the app's `.ql` is the question LABEL (the contract's `.q .lb`); the contract's `.ql` is the fork's lead line, which the app calls `.forklbl`

present · contract 592×12 · dev 336×14.3 · 0 of 10 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `9px` | `9.5px` | = |
| `letter-spacing` | `1.08px` | `0.95px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `font-weight` | `500` | `500` | = |
| `display` | `flex` | `flex` | = |
| `gap` | `8px` | `9px` | = |
| `align-items` | `center` | `center` | = |
| `margin-bottom` | `10px` | `10px` | = |

### `.fk` → `.tpn .fk`

present · contract 592×68 · dev 336×58.8 · 13 of 18 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `38px 470.891px 21.1094px` | `26px 260px 0px` | **≠** |
| `column-gap` | `14px` | `11px` | **≠** |
| `align-items` | `center` | `center` | = |
| `padding-top` | `14px` | `11px` | **≠** |
| `padding-right` | `16px` | `13px` | **≠** |
| `padding-bottom` | `14px` | `11px` | **≠** |
| `padding-left` | `16px` | `13px` | **≠** |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(224, 213, 200)` | **≠** |
| `border-radius` | `14px` | `10px` | **≠** |
| `background-color` | `rgb(255, 255, 255)` | `rgb(253, 251, 247)` | **≠** |
| `background-image` | `none` | `none` | = |
| `margin-bottom` | `9px` | `0px` | **≠** |
| `min-height` | `66px` | `56px` | **≠** |
| `width` | `592px` | `336px` | **≠** |
| `box-shadow` | `rgba(58, 28, 20, 0.03) 0px 1px 2px 0px` | `none` | **≠** |

### `.fk .g` → `.tpn .fk .g`

present · contract 38×38 · dev 26×26 · 6 of 15 properties differ

| property | contract | dev | |
|---|---|---|---|
| `width` | `38px` | `26px` | **≠** |
| `height` | `38px` | `26px` | **≠** |
| `border-radius` | `50%` | `7px` | **≠** |
| `background-color` | `rgb(253, 250, 245)` | `rgb(255, 255, 255)` | **≠** |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(231, 221, 210)` | `rgb(224, 213, 200)` | **≠** |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| `font-size` | `15px` | `14px` | = |
| `color` | `rgb(124, 58, 42)` | `rgb(138, 122, 108)` | **≠** |
| `grid-row-start` | `1` | `1` | = |
| `grid-row-end` | `3` | `3` | = |

### `.fk .t` → `.tpn .fk .t`

present · contract 470.9×17 · dev 260×17.5 · 0 of 3 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `14px` | `13px` | = |
| `font-weight` | `500` | `500` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |

### `.fk .s` → `.tpn .fk .s`

present · contract 470.9×14 · dev 260×15.2 · 1 of 5 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `11.5px` | `10.5px` | = |
| `color` | `rgb(138, 122, 108)` | `rgb(138, 122, 108)` | = |
| `font-weight` | `300` | `300` | = |
| `grid-column` | `2` | `2` | = |
| `margin-top` | `2px` | `0px` | **≠** |

### `.fk kbd` → `.tpn .fk kbd`

**MISSING on dev.** `.tpn .fk kbd` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | **absent** |
| `font-size` | `8.5px` | **absent** |
| `background-color` | `rgb(253, 250, 245)` | **absent** |
| `background-image` | `none` | **absent** |
| `border-top-width` | `1px` | **absent** |
| `border-top-style` | `solid` | **absent** |
| `border-top-color` | `rgb(224, 213, 200)` | **absent** |
| `border-radius` | `5px` | **absent** |
| `padding-top` | `2px` | **absent** |
| `padding-right` | `7px` | **absent** |
| `padding-bottom` | `2px` | **absent** |
| `padding-left` | `7px` | **absent** |
| `color` | `rgb(179, 164, 148)` | **absent** |

### `.ledger` → `.tpn .ledger`

⚠️ the CONTRACT has no visible `.ledger` in this state (matched 0) — nothing to compare against.

### `.q .head` → `.tpn .q .head`

⚠️ the CONTRACT has no visible `.q .head` in this state (matched 0) — nothing to compare against.

### `.dfoot` → `.tpn .foot`

present · contract 640×61 · dev 624×55 · 5 of 13 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `9px` | `10px` | = |
| `padding-top` | `13px` | `10px` | **≠** |
| `padding-right` | `24px` | `16px` | **≠** |
| `padding-bottom` | `13px` | `10px` | **≠** |
| `padding-left` | `24px` | `16px` | **≠** |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(231, 221, 210)` | `rgb(231, 221, 210)` | = |
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `min-height` | `60px` | `54px` | **≠** |

### `.pop` → `.slo .rail`
> the app merges `.pop` and `.pc` into one element — the card IS the reference column

present · contract 301.7×471 · dev 302×488.5 · 0 of 8 properties differ

| property | contract | dev | |
|---|---|---|---|
| `position` | `fixed` | `fixed` | = |
| `right` | `668px` | `668px` | = |
| `top` | `118px` | `118px` | = |
| `width` | `292px` | `292px` | = |
| `z-index` | `69` | `69` | = |
| `transform` | `matrix(0.999781, -0.0209424, 0.0209424, 0.999781, 0, 0)` | `matrix(0.999781, -0.0209424, 0.0209424, 0.999781, 0, 0)` | = |
| `opacity` | `1` | `1` | = |
| `pointer-events` | `auto` | `auto` | = |

### `.pc` → `.slo .rail`

present · contract 301.7×471 · dev 302×488.5 · 0 of 9 properties differ

| property | contract | dev | |
|---|---|---|---|
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(232, 224, 216)` | = |
| `border-radius` | `14px` | `14px` | = |
| `box-shadow` | `rgba(36, 18, 9, 0.24) 0px 18px 44px 0px, rgba(36, 18, 9, 0.08) 0px 2px 6px 0px` | `rgba(36, 18, 9, 0.24) 0px 18px 44px 0px, rgba(36, 18, 9, 0.08) 0px 2px 6px 0px` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |

### `.qhead` → `.tpn .qhead`

present · contract 291.8×96.1 · dev 291.7×92.1 · 1 of 7 properties differ

| property | contract | dev | |
|---|---|---|---|
| `padding-top` | `14px` | `12px` | **≠** |
| `padding-right` | `16px` | `16px` | = |
| `padding-bottom` | `13px` | `12px` | = |
| `padding-left` | `16px` | `16px` | = |
| `border-bottom-width` | `1px` | `1px` | = |
| `border-bottom-style` | `solid` | `solid` | = |
| `border-bottom-color` | `rgba(58, 28, 20, 0.1)` | `rgba(58, 28, 20, 0.1)` | = |

- waived `backgroundColor`: the tint is DERIVED from the Query Centre's stage ladder rather than the ref's private TINT table, so the two palettes are deliberately different values for the same idea

### `.qhead .lbl` → `.tpn .qhead .lbl`

present · contract 258.3×23.4 · dev 258.3×23.4 · 0 of 8 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `7.5px` | `7.5px` | = |
| `letter-spacing` | `1.05px` | `1.05px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgba(58, 28, 20, 0.55)` | `rgba(58, 28, 20, 0.55)` | = |
| `display` | `flex` | `flex` | = |
| `justify-content` | `space-between` | `space-between` | = |
| `align-items` | `center` | `center` | = |

### `.qhead .st` → `.tpn .qhead .st`

present · contract 258.4×27.4 · dev 258.4×26.2 · 0 of 8 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `8px` | `8px` | = |
| `margin-top` | `8px` | `8px` | = |
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `17px` | `16px` | = |
| `font-weight` | `500` | `500` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |

### `.qhead .since` → `.tpn .qhead .since`

present · contract 258.2×15.4 · dev 258.2×16.7 · 0 of 6 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `7.5px` | `7.5px` | = |
| `letter-spacing` | `0.75px` | `0.75px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgba(58, 28, 20, 0.55)` | `rgba(58, 28, 20, 0.55)` | = |
| `margin-top` | `4px` | `3px` | = |

### `.who` → `.tpn .who`

present · contract 291.1×63.1 · dev 291.1×59.8 · 0 of 10 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `10px` | `10px` | = |
| `padding-top` | `12px` | `11px` | = |
| `padding-right` | `16px` | `16px` | = |
| `padding-bottom` | `12px` | `11px` | = |
| `padding-left` | `16px` | `16px` | = |
| `border-bottom-width` | `1px` | `1px` | = |
| `border-bottom-style` | `solid` | `solid` | = |
| `border-bottom-color` | `rgb(231, 221, 210)` | `rgb(231, 221, 210)` | = |

### `.facts` → `.tpn .rail .facts`

present · contract 292.2×114 · dev 293.6×180.5 · 0 of 4 properties differ

| property | contract | dev | |
|---|---|---|---|
| `padding-top` | `8px` | `8px` | = |
| `padding-right` | `16px` | `16px` | = |
| `padding-bottom` | `6px` | `6px` | = |
| `padding-left` | `16px` | `16px` | = |

### `.fact` → `.tpn .rail .fact`

present · contract 258.6×34.4 · dev 258.8×46.9 · 1 of 8 properties differ

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `82px 166px` | `78px 170px` | **≠** |
| `gap` | `10px` | `10px` | = |
| `padding-top` | `7px` | `7px` | = |
| `padding-right` | `0px` | `0px` | = |
| `padding-bottom` | `7px` | `7px` | = |
| `padding-left` | `0px` | `0px` | = |
| `align-items` | `baseline` | `baseline` | = |

### `.subh` → `.tpn .rail .sub`

present · contract 290.6×37.1 · dev 290.6×39.1 · 0 of 13 properties differ

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `8px` | `8px` | = |
| `letter-spacing` | `1.12px` | `1.12px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(179, 164, 148)` | `rgb(179, 164, 148)` | = |
| `padding-top` | `12px` | `12px` | = |
| `padding-right` | `16px` | `16px` | = |
| `padding-bottom` | `8px` | `8px` | = |
| `padding-left` | `16px` | `16px` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(231, 221, 210)` | `rgb(231, 221, 210)` | = |
| `margin-top` | `6px` | `6px` | = |

### `.tl` → `.tpn .rail .tl`

present · contract 292.7×138 · dev 291.7×90.7 · 4 of 5 properties differ

| property | contract | dev | |
|---|---|---|---|
| `position` | `relative` | `relative` | = |
| `padding-top` | `2px` | `0px` | **≠** |
| `padding-right` | `16px` | `0px` | **≠** |
| `padding-bottom` | `8px` | `0px` | **≠** |
| `padding-left` | `36px` | `18px` | **≠** |

### `.te` → `.tpn .rail .tl-e`
> the app calls a rung `.tl-e` — `taskPane.css` records the rename deliberately, so this is a name difference and not a missing element

present · contract 238.6×37 · dev 272.8×48 · 4 of 7 properties differ

| property | contract | dev | |
|---|---|---|---|
| `position` | `relative` | `relative` | = |
| `padding-top` | `4px` | `6px` | **≠** |
| `padding-right` | `0px` | `0px` | = |
| `padding-bottom` | `4px` | `6px` | **≠** |
| `padding-left` | `0px` | `0px` | = |
| `font-size` | `11.5px` | `16px` | **≠** |
| `font-weight` | `500` | `400` | **≠** |

### `.gapl` → `.tpn .rail .tl-e.minor`
> the contract's `.gapl` is a SILENCE label between rungs; the app has no silence line and its nearest neighbour is the lesser rung `.tl-e.minor`, which is a different claim — reported, not equated

**MISSING on dev.** `.tpn .rail .tl-e.minor` matched 0 elements, none visible.

| property | contract | dev |
|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | **absent** |
| `font-size` | `6.5px` | **absent** |
| `letter-spacing` | `0.585px` | **absent** |
| `text-transform` | `uppercase` | **absent** |
| `color` | `rgb(200, 184, 166)` | **absent** |
| `padding-top` | `2px` | **absent** |
| `padding-right` | `0px` | **absent** |
| `padding-bottom` | `2px` | **absent** |
| `padding-left` | `0px` | **absent** |

### `.qbtn` → `.tpn .qbtn`

present · contract 119.5×17.5 · dev 100.8×20.6 · 3 of 10 properties differ

| property | contract | dev | |
|---|---|---|---|
| `margin-top` | `8px` | `10px` | **≠** |
| `margin-right` | `16px` | `16px` | = |
| `margin-bottom` | `16px` | `14px` | **≠** |
| `margin-left` | `16px` | `16px` | = |
| `font-size` | `11.5px` | `11px` | = |
| `color` | `rgb(124, 58, 42)` | `rgb(124, 58, 42)` | = |
| `border-bottom-width` | `1px` | `1px` | = |
| `border-bottom-style` | `dotted` | `dotted` | = |
| `border-bottom-color` | `rgba(124, 58, 42, 0.4)` | `rgba(124, 58, 42, 0.4)` | = |
| `display` | `inline-block` | `block` | **≠** |

---

## Which of these exist on dev at all

**7 of 31 elements are absent**: `.dhero` · `.dhero .title` · `.dhero .line` · `.dhero .chips` · `.chip` · `.fk kbd` · `.gapl`.

Of the 24 present, 12 differ from the contract in at least one property — 48 property disagreements against 147 matches.

### the index card's anchor

- contract: gap to the drawer **23.2px**, top **115px**
- dev:      gap to the drawer **23px**, top **115px**

### the app's drawer, as rendered

`.slo` holds these classes: `SVGAnimatedString]` `[object` `a` `ab` `absent` `actbar` `av` `b-close` `cl` `d` `dhead` `dl` `dnav` `fact` `facts` `fam` `fk` `foot` `fork` `forklbl` `forkwrap` `form` `g` `in` `k` `lbl` `lead` `lk` `n` `now` `pane` `pos` `qbtn` `qhead` `quiet` `rail` `rim` `rtl` `s` `sa-statusdot__pulse` `sd` `sheet` `since` `sqm` `st` `sub` `t` `title` `tl` `tl-e` `tpn` `u-now` `v` `wcol` `who` `willrec` `work` `workscroll` `x`

### the drawer's width chain, `.workscroll` upward

| element | width | grid-template-columns | margin-right |
|---|---|---|---|
| `workscroll` | 384 | `none` | `0px` |
| `work` | 384 | `none` | `0px` |
| `rim` | 626 | `384px 240px` | `0px` |
| `sheet` | 640 | `none` | `0px` |
| `wcol` | 640 | `none` | `0px` |
| `pane u-now` | 640 | `none` | `0px` |
| `tpn` | 640 | `none` | `0px` |
| `slo` | 640 | `none` | `0px` |

`.tl`'s children carry: `tl-e` · `tl-e now`
