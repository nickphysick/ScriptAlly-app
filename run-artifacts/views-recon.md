# To-do — the three views, recon

Contract `design-refs/todo-three-views-contract.html` md5 `180d51fc828d990d646d30edf8b0ccd6` (matches the brief), opened as a file URL and rendered.
Page: `http://127.0.0.1:4201`, `/todo`, at 1440×900. Every value is `getComputedStyle`; every position is a measured rect. Nothing here is typed by hand.

## grid

### `.grid` → `.tkt-grid`

present · 0 of 3 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `0.33 0.33 0.33` | `0.33 0.33 0.33` | = |
| `gap` | `14px` | `14px` | = |
| *offset in `itself`* | `0,0` · `1100×903.5` | `0,0` · `1100×1860.4` | = |
| *host* | `1100×903.5` | `1100×1860.4` | |

### `.card` → `.tkt`

present · 1 of 12 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(230, 223, 214)` | **≠** |
| `border-radius` | `12px` | `12px` | = |
| `box-shadow` | `rgba(58, 28, 20, 0.04) 0px 1px 2px 0px` | `rgba(58, 28, 20, 0.04) 0px 1px 2px 0px` | = |
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `0.02 0.98` | `0.02 0.98` | = |
| `position` | `relative` | `relative` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| *offset in `.grid`* | `0,0` · `357.3×169.5` | `0,2` · `357.3×169.3` | = |
| *host* | `1100×903.5` | `1100×1860.4` | |

### `.card .edge` → `.tkt .edge`

present · 1 of 2 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `background-color` | `rgb(241, 219, 208)` | `rgb(215, 224, 232)` | **≠** |
| `background-image` | `none` | `none` | = |
| *offset in `.card`* | `1,1` · `6×167.5` | `1,1` · `6×167.3` | = |
| *host* | `357.3×169.5` | `357.3×169.3` | |

### `.card .in` → `.tkt .in`

present · 0 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `padding-top` | `14px` | `14px` | = |
| `padding-right` | `16px` | `16px` | = |
| `padding-bottom` | `12px` | `12px` | = |
| `padding-left` | `16px` | `16px` | = |
| `display` | `flex` | `flex` | = |
| `flex-direction` | `column` | `column` | = |
| `gap` | `9px` | `9px` | = |
| `min-width` | `0px` | `0px` | = |
| *offset in `.card`* | `7,1` · `349.3×167.5` | `7,1` · `349.3×167.3` | = |
| *host* | `357.3×169.5` | `357.3×169.3` | |

### `.card .top` → `.tkt .top`

present · 0 of 3 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `space-between` | `space-between` | = |
| *offset in `.card .in`* | `16,14` · `317.3×22` | `16,14` · `317.3×22` | = |
| *host* | `349.3×167.5` | `349.3×167.3` | |

### `.tag` → `.tkt .tag`

present · 0 of 11 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `height` | `22px` | `22px` | = |
| `padding-top` | `0px` | `0px` | = |
| `padding-right` | `9px` | `9px` | = |
| `padding-bottom` | `0px` | `0px` | = |
| `padding-left` | `9px` | `9px` | = |
| `border-radius` | `999px` | `999px` | = |
| `font-size` | `10.5px` | `10.5px` | = |
| `font-weight` | `500` | `500` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `6px` | `6px` | = |
| *offset in `.card .top`* | `0,0` · `89×22` | `0,0` · `78.7×22` | = |
| *host* | `317.3×22` | `317.3×22` | |

### `.msc` → `.tkt .msc`

present · 0 of 13 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `5px` | `5px` | = |
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `8px` | `8px` | = |
| `letter-spacing` | `0.64px` | `0.64px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(191, 178, 163)` | `rgb(191, 178, 163)` | = |
| `max-width` | `46%` | `46%` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.card .top`* | `214.3,5.5` · `103×11` | `241.2,5` · `76.2×12` | = |
| *host* | `317.3×22` | `317.3×22` | |

### `.card .ttl` → `.tkt .ttl`

present · 4 of 5 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `18px` | `14.5px` | **≠** |
| `font-weight` | `500` | `600` | **≠** |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `line-height` | `22.5px` | `18.85px` | **≠** |
| `font-family` | `"Playfair Display", serif` | `Inter, sans-serif` | **≠** |
| *offset in `.card .in`* | `16,45` · `317.3×22.5` | `16,45` · `317.3×18.8` | = |
| *host* | `349.3×167.5` | `349.3×167.3` | |

### `.card .facts` → `.tkt .facts`

present · 0 of 10 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `0.50 0.50` | `0.50 0.50` | = |
| `gap` | `8px 12px` | `8px 12px` | = |
| `padding-top` | `9px` | `9px` | = |
| `padding-right` | `0px` | `0px` | = |
| `padding-bottom` | `0px` | `0px` | = |
| `padding-left` | `0px` | `0px` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `dashed` | `dashed` | = |
| `border-top-color` | `rgb(224, 213, 200)` | `rgb(224, 213, 200)` | = |
| *offset in `.card .in`* | `16,76.5` · `317.3×36` | `16,72.8` · `317.3×39.5` | = |
| *host* | `349.3×167.5` | `349.3×167.3` | |

### `.card .cell .k` → `.tkt .cell .k`

present · 1 of 5 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `7px` | `7px` | = |
| `letter-spacing` | `0.91px` | `0.91px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(156, 136, 120)` | `rgb(125, 116, 105)` | **≠** |
| *offset in `.card .facts`* | `0,10` · `152.7×9` | `0,10` · `152.7×10.5` | = |
| *host* | `317.3×36` | `317.3×39.5` | |

### `.card .cell .v` → `.tkt .cell .v`

present · 0 of 4 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `12px` | `12px` | = |
| `font-weight` | `500` | `500` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `margin-top` | `2px` | `2px` | = |
| *offset in `.card .facts`* | `0,21` · `152.7×15` | `0,22.5` · `152.7×17` | = |
| *host* | `317.3×36` | `317.3×39.5` | |

### `.card .tfoot` → `.tkt .tfoot`

present · 0 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `8px` | `8px` | = |
| `padding-top` | `9px` | `9px` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `dashed` | `dashed` | = |
| `border-top-color` | `rgb(224, 213, 200)` | `rgb(224, 213, 200)` | = |
| `min-width` | `0px` | `0px` | = |
| *offset in `.card .in`* | `16,121.5` · `317.3×34` | `16,121.3` · `317.3×34` | = |
| *host* | `349.3×167.5` | `349.3×167.3` | |

### `.av` → `.tkt .tfoot .av`

present · 0 of 16 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `24px` | `24px` | = |
| `height` | `24px` | `24px` | = |
| `border-radius` | `50%` | `50%` | = |
| `background-color` | `rgb(239, 228, 220)` | `rgb(239, 228, 220)` | = |
| `background-image` | `none` | `none` | = |
| `color` | `rgb(124, 58, 42)` | `rgb(124, 58, 42)` | = |
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `8px` | `8px` | = |
| `font-weight` | `500` | `500` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgba(124, 58, 42, 0.18)` | `rgba(124, 58, 42, 0.18)` | = |
| `flex-shrink` | `0` | `0` | = |
| *offset in `.card .tfoot`* | `0,10` · `24×24` | `0,10` · `24×24` | = |
| *host* | `317.3×34` | `317.3×34` | |

### `.qs` → `.tkt .tfoot .qs`

present · 0 of 7 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `6px` | `6px` | = |
| `font-size` | `11px` | `11px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `font-weight` | `500` | `500` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| *offset in `.card .tfoot`* | `223.9,15` · `93.4×14` | `276.5,13.8` · `40.8×16.5` | = |
| *host* | `317.3×34` | `317.3×34` | |

---

## list

### `.listv` → `.tlc`

present · 1 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(230, 220, 205)` | **≠** |
| `border-radius` | `16px` | `16px` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `box-shadow` | `rgba(58, 28, 20, 0.04) 0px 1px 2px 0px, rgba(58, 28, 20, 0.05) 0px 6px 20px 0px` | `rgba(58, 28, 20, 0.04) 0px 1px 2px 0px, rgba(58, 28, 20, 0.05) 0px 6px 20px 0px` | = |
| *offset in `itself`* | `0,0` · `1100×1348` | `0,0` · `1100×401.5` | = |
| *host* | `1100×1348` | `1100×401.5` | |

### `.lhd` → `.tlc .lhd`

present · 0 of 11 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `0.01 0.28 0.22 0.10 0.21 0.18` | `0.01 0.28 0.22 0.10 0.21 0.18` | = |
| `gap` | `18px` | `18px` | = |
| `align-items` | `center` | `center` | = |
| `padding-top` | `16px` | `16px` | = |
| `padding-right` | `22px` | `22px` | = |
| `padding-bottom` | `12px` | `12px` | = |
| `padding-left` | `22px` | `22px` | = |
| `border-bottom-width` | `1px` | `1px` | = |
| `border-bottom-style` | `solid` | `solid` | = |
| `border-bottom-color` | `rgb(231, 221, 210)` | `rgb(231, 221, 210)` | = |
| *offset in `.listv`* | `1,1` · `1098×41` | `1,1` · `1098×41.8` | = |
| *host* | `1100×1348` | `1100×401.5` | |

### `.lgh` → `.tlc .grp`
> the app calls the group head `.grp`; see the report — a rename would have cost 41 measurement suites and asserted a spelling

present · 0 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `12px` | `12px` | = |
| `padding-top` | `22px` | `22px` | = |
| `padding-right` | `22px` | `22px` | = |
| `padding-bottom` | `12px` | `12px` | = |
| `padding-left` | `22px` | `22px` | = |
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| *offset in `.listv`* | `1,42` · `1098×62` | `1,42.8` · `1098×65.5` | = |
| *host* | `1100×1348` | `1100×401.5` | |

### `.lgh .t` → `.tlc .grp .g-lbl`

present · 0 of 6 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `21px` | `21px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `font-weight` | `500` | `500` | = |
| `letter-spacing` | `normal` | `normal` | = |
| `text-transform` | `none` | `none` | = |
| *offset in `.lgh`* | `22,22` · `142.1×28` | `22,22` · `142.1×31.5` | = |
| *host* | `1098×62` | `1098×65.5` | |

### `.lgh .n` → `.tlc .grp .g-n`

present · 1 of 15 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `13px` | `13px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(230, 220, 205)` | **≠** |
| `border-radius` | `999px` | `999px` | = |
| `padding-top` | `2px` | `2px` | = |
| `padding-right` | `11px` | `11px` | = |
| `padding-bottom` | `2px` | `2px` | = |
| `padding-left` | `11px` | `11px` | = |
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `letter-spacing` | `normal` | `normal` | = |
| `text-transform` | `none` | `none` | = |
| *offset in `.lgh`* | `176.1,24.5` · `30.7×23` | `176.1,25` · `38×25.5` | = |
| *host* | `1098×62` | `1098×65.5` | |

### `.lgh .rule` → *(no app selector)*

**MISSING on dev.** `—` matched 0, none visible.

| property | contract | dev |
|---|---|---|
| `flex-grow` | `1` | **absent** |
| `flex-shrink` | `1` | **absent** |
| `flex-basis` | `0%` | **absent** |
| `height` | `1px` | **absent** |
| `background-color` | `rgb(233, 224, 210)` | **absent** |
| `background-image` | `none` | **absent** |
| *position* | `{"dx":218.8,"dy":35.5,"w":857.2,"h":1,"hostW":1098,"hostH":62}` | **absent** |

### `.lrow` → `.tlc .row`
> the app calls it `.row` — the round's one recorded name deviation, and the reason is at the rule

present · 0 of 12 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-template-columns` | `0.01 0.28 0.22 0.10 0.21 0.18` | `0.01 0.28 0.22 0.10 0.21 0.18` | = |
| `gap` | `18px` | `18px` | = |
| `align-items` | `center` | `center` | = |
| `padding-top` | `16px` | `16px` | = |
| `padding-right` | `22px` | `22px` | = |
| `padding-bottom` | `16px` | `16px` | = |
| `padding-left` | `22px` | `22px` | = |
| `border-bottom-width` | `1px` | `1px` | = |
| `border-bottom-style` | `solid` | `solid` | = |
| `border-bottom-color` | `rgb(243, 236, 227)` | `rgb(243, 236, 227)` | = |
| `position` | `relative` | `relative` | = |
| *offset in `.listv`* | `1,104` · `1098×80` | `1,108.3` · `1098×79` | = |
| *host* | `1100×1348` | `1100×401.5` | |

### `.ledge` → `.tlc .row .ledge`

present · 1 of 7 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `position` | `absolute` | `absolute` | = |
| `left` | `0px` | `0px` | = |
| `top` | `0px` | `0px` | = |
| `bottom` | `0px` | `0px` | = |
| `width` | `5px` | `5px` | = |
| `background-color` | `rgb(241, 219, 208)` | `rgb(215, 224, 232)` | **≠** |
| `background-image` | `none` | `none` | = |
| *offset in `.lrow`* | `0,0` · `5×79` | `0,0` · `5×78` | = |
| *host* | `1098×80` | `1098×79` | |

### `.ltask .t` → `.tlc .ltask .t`

present · 0 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `17.5px` | `17.5px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `font-weight` | `500` | `500` | = |
| `line-height` | `21px` | `21px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.lrow`* | `46,18.5` · `268.3×21` | `46,16.5` · `268.3×21` | = |
| *host* | `1098×80` | `1098×79` | |

### `.ltask .k` → `.tlc .ltask .k`

present · 0 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `inline-flex` | `inline-flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `7px` | `7px` | = |
| `margin-top` | `5px` | `5px` | = |
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `7.5px` | `7.5px` | = |
| `letter-spacing` | `0.975px` | `0.975px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `font-weight` | `500` | `500` | = |
| *offset in `.ltask`* | `0,26` · `90.2×12` | `0,26` · `90.2×12` | = |
| *host* | `268.3×42` | `268.3×45` | |

### `.lag` → `.tlc .lag`

present · 0 of 4 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `11px` | `11px` | = |
| `min-width` | `0px` | `0px` | = |
| *offset in `.lrow`* | `332.3,21.3` · `210×36.4` | `332.3,19.9` · `210×38.1` | = |
| *host* | `1098×80` | `1098×79` | |

### `.lag .n` → `.tlc .lag .n`

present · 0 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `16px` | `16px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `line-height` | `18.4px` | `18.4px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.lag`* | `35,0` · `113.3×18.4` | `35,0` · `86.4×18.4` | = |
| *host* | `210×36.4` | `210×38.1` | |

### `.lag .a` → `.tlc .lag .a`

present · 0 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-style` | `italic` | `italic` | = |
| `font-size` | `12.5px` | `12.5px` | = |
| `color` | `rgb(106, 88, 74)` | `rgb(106, 88, 74)` | = |
| `margin-top` | `1px` | `1px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.lag`* | `35,19.4` · `113.3×17` | `35,19.4` · `86.4×18.8` | = |
| *host* | `210×36.4` | `210×38.1` | |

### `.lchip` → `.tlc .lchip`

present · 1 of 7 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `52px` | `52px` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(230, 220, 205)` | **≠** |
| `border-radius` | `9px` | `9px` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| *offset in `.lrow`* | `560.3,16` · `52×47` | `560.3,18.3` · `52×41.5` | = |
| *host* | `1098×80` | `1098×79` | |

### `.lstands` → `.tlc .lstands`

present · 0 of 4 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `min-width` | `0px` | `0px` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `12px` | `12px` | = |
| *offset in `.lrow`* | `674.3,16.5` · `205.7×46` | `674.3,16` · `205.7×46` | = |
| *host* | `1098×80` | `1098×79` | |

### `.stamp` → `.tlc .stamp`

present · 0 of 17 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `46px` | `46px` | = |
| `height` | `46px` | `46px` | = |
| `border-radius` | `50%` | `50%` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `dashed` | `dashed` | = |
| `border-top-color` | `rgb(216, 203, 187)` | `rgb(216, 203, 187)` | = |
| `display` | `flex` | `flex` | = |
| `flex-direction` | `column` | `column` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| `flex-shrink` | `0` | `0` | = |
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `6px` | `6px` | = |
| `letter-spacing` | `0.48px` | `0.48px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(179, 164, 148)` | `rgb(179, 164, 148)` | = |
| `line-height` | `8.1px` | `8.1px` | = |
| *offset in `.lstands`* | `0,0` · `46×46` | `0,0` · `46×46` | = |
| *host* | `205.7×46` | `205.7×46` | |

### `.lstands .l1` → `.tlc .lstands .l1`

present · 0 of 6 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `12.5px` | `12.5px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.lstands`* | `58,8.5` · `110.3×15` | `58,6` · `89.3×18.8` | = |
| *host* | `205.7×46` | `205.7×46` | |

### `.lstands .l2` → `.tlc .lstands .l2`

present · 0 of 10 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `7.5px` | `7.5px` | = |
| `letter-spacing` | `0.75px` | `0.75px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(179, 164, 148)` | `rgb(179, 164, 148)` | = |
| `margin-top` | `4px` | `4px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.lstands`* | `58,27.5` · `110.3×10` | `58,28.8` · `89.3×11.3` | = |
| *host* | `205.7×46` | `205.7×46` | |

### `.lact` → `.tlc .lact`

present · 0 of 4 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `7px` | `7px` | = |
| `justify-content` | `flex-end` | `flex-end` | = |
| *offset in `.lrow`* | `898,22.5` · `178×34` | `898,22` · `178×34` | = |
| *host* | `1098×80` | `1098×79` | |

### `.lact .go` → `.tlc .lact .go`

present · 0 of 15 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `height` | `34px` | `34px` | = |
| `padding-top` | `0px` | `0px` | = |
| `padding-right` | `15px` | `15px` | = |
| `padding-bottom` | `0px` | `0px` | = |
| `padding-left` | `15px` | `15px` | = |
| `border-radius` | `9px` | `9px` | = |
| `background-color` | `rgb(245, 226, 218)` | `rgb(245, 226, 218)` | = |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 200, 188)` | `rgb(232, 200, 188)` | = |
| `color` | `rgb(124, 58, 42)` | `rgb(124, 58, 42)` | = |
| `font-size` | `12px` | `12px` | = |
| `font-weight` | `500` | `500` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| *offset in `.lact`* | `6.7,0` · `89.3×34` | `29.6,0` · `66.4×34` | = |
| *host* | `178×34` | `178×34` | |

### `.lact .ic` → `.tlc .lact .ic`

present · 1 of 13 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `34px` | `34px` | = |
| `height` | `34px` | `34px` | = |
| `border-radius` | `9px` | `9px` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(230, 220, 205)` | **≠** |
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `color` | `rgb(138, 122, 108)` | `rgb(138, 122, 108)` | = |
| `font-size` | `12px` | `12px` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| *offset in `.lact`* | `103,0` · `34×34` | `103,0` · `34×34` | = |
| *host* | `178×34` | `178×34` | |

---

## board

### `.board` → `.brd`

present · 1 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `grid` | `grid` | = |
| `grid-auto-flow` | `column` | `column` | = |
| `grid-auto-columns` | `300px` | `300px` | = |
| `gap` | `20px` | `20px` | = |
| `height` | `522px` | `401.5px` | **≠** |
| `min-height` | `0px` | `0px` | = |
| `overflow-x` | `auto` | `auto` | = |
| `padding-bottom` | `6px` | `6px` | = |
| *offset in `itself`* | `0,0` · `1100×522` | `0,0` · `1100×401.5` | = |
| *host* | `1100×522` | `1100×401.5` | |

### `.col` → `.brd-col`

present · 0 of 3 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `min-height` | `0px` | `0px` | = |
| `display` | `flex` | `flex` | = |
| `flex-direction` | `column` | `column` | = |
| *offset in `.board`* | `0,0` · `300×516` | `0,0` · `300×395.5` | = |
| *host* | `1100×522` | `1100×401.5` | |

### `.colh` → `.brd-colh`

present · 0 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `padding-top` | `6px` | `6px` | = |
| `padding-right` | `6px` | `6px` | = |
| `padding-bottom` | `10px` | `10px` | = |
| `padding-left` | `6px` | `6px` | = |
| `border-bottom-width` | `3px` | `3px` | = |
| `border-bottom-style` | `solid` | `solid` | = |
| `border-bottom-color` | `rgb(231, 221, 210)` | `rgb(231, 221, 210)` | = |
| `margin-bottom` | `12px` | `12px` | = |
| *offset in `.col`* | `0,0` · `300×61` | `0,0` · `300×61.6` | = |
| *host* | `300×516` | `300×395.5` | |

### `.colh .r1` → `.brd-colh .r1`

present · 0 of 3 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `10px` | `10px` | = |
| *offset in `.colh`* | `6,6` · `288×30` | `6,6` · `288×28.6` | = |
| *host* | `300×61` | `300×61.6` | |

### `.colh .ic` → `.brd-colh .ic`

present · 0 of 12 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `28px` | `28px` | = |
| `height` | `28px` | `28px` | = |
| `border-radius` | `50%` | `50%` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(124, 58, 42)` | `rgb(124, 58, 42)` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| `font-size` | `12px` | `12px` | = |
| `color` | `rgb(124, 58, 42)` | `rgb(124, 58, 42)` | = |
| `flex-shrink` | `0` | `0` | = |
| *offset in `.colh .r1`* | `0,1` · `28×28` | `0,0.3` · `28×28` | = |
| *host* | `288×30` | `288×28.6` | |

### `.colh .t` → `.brd-colh .t`

present · 0 of 4 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `22px` | `22px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `font-weight` | `400` | `400` | = |
| *offset in `.colh .r1`* | `38,0` · `146.7×30` | `38,0` · `146.7×28.6` | = |
| *host* | `288×30` | `288×28.6` | |

### `.colh .c` → `.brd-colh .c`

present · 1 of 14 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `margin-left` | `67.4062px` | `67.2344px` | **≠** |
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `12px` | `12px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(232, 224, 216)` | = |
| `border-radius` | `999px` | `999px` | = |
| `padding-top` | `2px` | `2px` | = |
| `padding-right` | `9px` | `9px` | = |
| `padding-bottom` | `2px` | `2px` | = |
| `padding-left` | `9px` | `9px` | = |
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| *offset in `.colh .r1`* | `262.1,4` · `25.9×22` | `261.9,2.3` · `26.1×24` | = |
| *host* | `288×30` | `288×28.6` | |

### `.colh .r2` → `.brd-colh .r2`

present · 0 of 7 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `8px` | `8px` | = |
| `letter-spacing` | `1.12px` | `1.12px` | = |
| `text-transform` | `uppercase` | `uppercase` | = |
| `color` | `rgb(138, 122, 108)` | `rgb(138, 122, 108)` | = |
| `padding-left` | `38px` | `38px` | = |
| `margin-top` | `2px` | `2px` | = |
| *offset in `.colh`* | `6,38` · `288×10` | `6,36.6` · `288×12` | = |
| *host* | `300×61` | `300×61.6` | |

### `.stack` → `.brd-stack`

present · 0 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `overflow-y` | `auto` | `auto` | = |
| `min-height` | `0px` | `0px` | = |
| `display` | `flex` | `flex` | = |
| `flex-direction` | `column` | `column` | = |
| `gap` | `12px` | `12px` | = |
| `padding-top` | `2px` | `2px` | = |
| `padding-right` | `2px` | `2px` | = |
| `padding-bottom` | `8px` | `8px` | = |
| `padding-left` | `2px` | `2px` | = |
| *offset in `.col`* | `0,73` · `300×290.2` | `0,73.6` · `300×321.9` | = |
| *host* | `300×516` | `300×395.5` | |

### `.bcard` → `.brd-card`

present · 1 of 9 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `background-color` | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | = |
| `background-image` | `none` | `none` | = |
| `border-radius` | `12px` | `12px` | = |
| `box-shadow` | `rgba(58, 28, 20, 0.05) 0px 1px 2px 0px, rgba(58, 28, 20, 0.06) 0px 6px 18px 0px` | `rgba(58, 28, 20, 0.05) 0px 1px 2px 0px, rgba(58, 28, 20, 0.06) 0px 6px 18px 0px` | = |
| `border-top-width` | `3px` | `3px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(241, 219, 208)` | `rgb(231, 221, 210)` | **≠** |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| *offset in `.stack`* | `2,2` · `296×61.3` | `2,2` · `296×62.9` | = |
| *host* | `300×290.2` | `300×321.9` | |

### `.bcard .main` → `.brd-card .main`

present · 0 of 7 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `10px` | `10px` | = |
| `padding-top` | `11px` | `11px` | = |
| `padding-right` | `12px` | `12px` | = |
| `padding-bottom` | `11px` | `11px` | = |
| `padding-left` | `12px` | `12px` | = |
| *offset in `.bcard`* | `0,3` · `296×58.3` | `0,3` · `296×59.9` | = |
| *host* | `296×61.3` | `296×62.9` | |

### `.bcard .disc` → `.brd-card .disc`

present · 0 of 16 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `width` | `34px` | `34px` | = |
| `height` | `34px` | `34px` | = |
| `border-radius` | `50%` | `50%` | = |
| `background-color` | `rgb(253, 250, 245)` | `rgb(253, 250, 245)` | = |
| `background-image` | `none` | `none` | = |
| `border-top-width` | `1px` | `1px` | = |
| `border-top-style` | `solid` | `solid` | = |
| `border-top-color` | `rgb(232, 224, 216)` | `rgb(232, 224, 216)` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `justify-content` | `center` | `center` | = |
| `font-family` | `"JetBrains Mono", monospace` | `"JetBrains Mono", monospace` | = |
| `font-size` | `10px` | `10px` | = |
| `font-weight` | `500` | `500` | = |
| `color` | `rgb(122, 101, 81)` | `rgb(122, 101, 81)` | = |
| `flex-shrink` | `0` | `0` | = |
| *offset in `.bcard .main`* | `12,12.1` · `34×34` | `12,12.9` · `34×34` | = |
| *host* | `296×58.3` | `296×59.9` | |

### `.bcard .nm` → `.brd-card .nm`

present · 0 of 8 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-family` | `"Playfair Display", serif` | `"Playfair Display", serif` | = |
| `font-size` | `16px` | `16px` | = |
| `color` | `rgb(58, 28, 20)` | `rgb(58, 28, 20)` | = |
| `line-height` | `18.4px` | `18.4px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| *offset in `.bcard .main`* | `56,11.4` · `203.3×18.4` | `56,11` · `183.7×18.4` | = |
| *host* | `296×58.3` | `296×59.9` | |

### `.bcard .ag` → `.brd-card .ag`

present · 0 of 11 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `font-size` | `11px` | `11px` | = |
| `color` | `rgb(106, 88, 74)` | `rgb(106, 88, 74)` | = |
| `font-weight` | `300` | `300` | = |
| `margin-top` | `3px` | `3px` | = |
| `white-space` | `nowrap` | `nowrap` | = |
| `overflow-x` | `hidden` | `hidden` | = |
| `overflow-y` | `hidden` | `hidden` | = |
| `text-overflow` | `ellipsis` | `ellipsis` | = |
| `display` | `flex` | `flex` | = |
| `align-items` | `center` | `center` | = |
| `gap` | `6px` | `6px` | = |
| *offset in `.bcard .main`* | `56,32.8` · `203.3×14` | `56,32.4` · `183.7×16.5` | = |
| *host* | `296×58.3` | `296×59.9` | |

### `.bcard .bw` → `.brd-card .bw:has(b)`
> matched on a card that HAS a wait — the two pages' first board card differ in whether their task carries a date, and a `no date` chip is one line where a figure over a unit is two. A fixture difference, not a design one.

present · 0 of 3 properties differ · position matches

| property | contract | dev | |
|---|---|---|---|
| `margin-left` | `0px` | `0px` | = |
| `flex-shrink` | `0` | `0` | = |
| `line-height` | `17.6px` | `17.6px` | = |
| *offset in `.bcard .main`* | `269.3,11` · `14.7×36.3` | `254.6,11.8` · `29.4×36.3` | = |
| *host* | `296×58.3` | `296×59.9` | |

---

## Which of these do not exist on dev at all

- **grid** — none
- **list** — `.lgh .rule`
- **board** — none

## Summary

- **grid** — 0 of 14 absent · 14 present, of which 0 sit in the wrong place · 7 property disagreements against 100 matches
- **list** — 1 of 21 absent · 20 present, of which 0 sit in the wrong place · 5 property disagreements against 179 matches
- **board** — 0 of 15 absent · 15 present, of which 0 sit in the wrong place · 3 property disagreements against 119 matches
