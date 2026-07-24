# ScriptAlly — Theme token reference

**This file is the single source of truth for the three app theme palettes.** Mockups and design passes must read exact token values from here rather than sampling from memory or an old HTML ref (that drift is why this doc exists).

## Where the tokens actually live

- **CSS (authoritative):** `src/index.css` — the per-theme custom properties are declared under three class selectors:
  - `.t-capp` (Cappuccino) — lines ~63–201
  - `.t-bold` (Bold Pastille) — lines ~202–329
  - `.t-edn` (Editorial) — lines ~333–471
  - Brand constants shared by all themes live in `:root` (~23–38); the grand-masthead sizing tokens in a trailing `:root` + media query (~476–477).
- **TS copy (partial, drift risk):** `src/lib/designTokens.ts` holds JS copies of the *brand constants* (burgundy, pink trio, slate, sage) plus a separate set of route-scoped `qdb*` Query-DB palettes. It does **not** hold the per-theme `.t-capp/.t-bold/.t-edn` sets — those are CSS-only.

**Regenerate this file whenever any of the above change.** The class the AppShell root applies is chosen from the user's `queriesTheme` field (`src/types.ts`).

## Themes that ship

The segmented switcher (Settings → Preferences, and the rail-foot control) is the source of truth for how many themes exist. Three ship today:

| Class | Settings label | Rail-foot label | `queriesTheme` value | Default? |
|---|---|---|---|---|
| `.t-capp` | Cappuccino | Capp | `cappuccino` | **yes** (fallback) |
| `.t-bold` | Bold Pastille | Bold | `bold` | no |
| `.t-edn` | Editorial | Editorial | `editorial` | no |

- Value → class map: `THEME_CLASS = { cappuccino: "t-capp", bold: "t-bold", editorial: "t-edn" }` (`src/components/shell/AppShell.tsx`).
- Field: `queriesTheme?: "cappuccino" | "bold" | "editorial"` (`src/types.ts`). Absent/invalid falls back to Cappuccino.
- Both switchers write the same `queriesTheme` field.

---

## Shared tokens (theme-independent)

Declared in `:root` (`src/index.css`) and consumed by every theme. Type families are set in the `@theme` block.

| Token | Value | Controls |
|---|---|---|
| `--font-sans` | `"Source Sans Pro", system-ui, …` | Body / UI text |
| `--font-serif` | `"Playfair Display", Georgia, serif` | Headings, titles |
| `--font-mono` | `"JetBrains Mono", monospace` | Eyebrows, meta, counts |
| `--content-max` | `1440px` | Shared content gutter cap |
| `--burg` | `#7c3a2a` | Primary brand ink (= `--color-burgundy`) |
| `--burg-d` | `#632e22` | Deep burgundy |
| `--ink` | `#241c15` | Near-black glyph strokes / headings on tinted bands |
| `--muted` | `#9a8c80` | Muted mono captions |
| `--pink` | `#f5e2da` | Soft-pink CTA fill |
| `--pink-b` | `#e8c8bc` | Soft-pink CTA border |
| `--pink-h` | `#efd5ca` | Soft-pink CTA hover |
| `--tl` | `#f6ddd3` | Query-letter type tint |
| `--ts` | `#e7ece4` | Synopsis type tint |
| `--tp` | `#f3e6cf` | Sample-pages type tint |
| `--slate` | `#6A89A7` | Pro pill / slate accents |
| `--sage` | `#8a9e88` | Sage accent |
| `--sage-d` | `#5a6e58` | Synopsis ink / focus ring |
| `--gold` | `#a8842c` | Sample-pages ink / star glint |
| `--hub-mast-title` | `54px` (→ `40px` at `max-height ≤ 819px`) | Grand-masthead title size |
| `--hub-mast-pad` | `22px 30px 20px` (→ `16px 30px 15px` short) | Grand-masthead padding |

**StatusDot:** never restyled by theme CSS — its palette is a component token (`--sd-hue` / `--sd-centre`, listed per theme below). Direction/stage is carried by shape, not colour. Pro pills always stay slate regardless of theme.

---

## Cappuccino — `.t-capp` (default)

Warm mocha + foam. Square chrome (`--chromerad: 0`), 1px taupe borders, flat buttons. The de-pinked espresso `--hub-*` values are **hub-scoped only** — the rest of the app keeps mocha/pink Cappuccino.

### Surfaces & borders
| Token | Value | Controls |
|---|---|---|
| `--bd` | `#d8cebf` | Border colour (soft taupe) |
| `--bdw` | `1px` | Border width |
| `--desk` | `#e8ddd0` | Working-area background (warm) |
| `--band` | `#f2ddd5` | Soft blush (To-do urgency band) |
| `--pane` | `#fffefb` | Reading-pane surface (white) |
| `--card` | `#fffefb` | Card / container surface |
| `--chromerad` | `0px` | Chrome corners — **square** |
| `--listbg` | `#ffffff` | Query-list panel bg |

### Header & bands
| Token | Value | Controls |
|---|---|---|
| `--hdr` | `#5d4037` | Header text (mocha) |
| `--band-a` | `#ece5d8` | Foam gradient start |
| `--band-b` | `#e5ddcd` | Foam gradient end |
| `--band-bd` | `rgba(112,94,70,0.25)` | Band bottom rule |
| `--band-meta` | `#705e46` | Band meta text |
| `--band-strong` | `#4a4036` | Band strong text |
| `--acc` | `#7c3a2a` | Theme accent (chip dot, pins) |

### Buttons (the one treatment)
| Token | Value | Controls |
|---|---|---|
| `--abtn-bg` | `#ffffff` | Button fill |
| `--abtn-bd` | `#ded3c2` | Button border |
| `--abtn-bdw` | `1px` | Button border width |
| `--abtn-ink` | `#5d4037` | Button text (mocha) |
| `--abtn-hov` | `#f4f2ef` | Button hover |

### Rail (nav pill + rail chrome)
| Token | Value | Controls |
|---|---|---|
| `--navpill` | `#f0e8db` | Rail active pill (foam) |
| `--navtext` | `#5d4037` | Rail active text |
| `--rail-card` | `#fffefb` | Rail surface |
| `--rail-bd` | `#e7ddd2` | Rail border |
| `--rail-bdw` | `1px` | Rail border width |
| `--rail-hair` | `#e7ddd2` | Rail hairlines |
| `--rail-shadow` | `0 1px 3px rgba(58,28,20,.05), 0 12px 30px rgba(58,28,20,.07)` | Rail shadow |
| `--rail-ink` | `#3a1c14` | Rail icons |
| `--rail-label` | `#9c8878` | Rail eyebrow labels |
| `--rail-accent` | `#7c3a2a` | Rail accent |
| `--rail-itemtx` | `#5a4a40` | Rail item text |
| `--rail-pill` | `#f1e9df` | Rail active-item pill |
| `--rail-hov` | `#f7f3ed` | Rail item hover |
| `--rail-btn-bg` | `#ffffff` | Rail capture button fill |
| `--rail-btn-bd` | `#ded3c2` | Rail capture button border |
| `--rail-btn-bdw` | `1px` | Rail capture button border width |
| `--rail-btn-tx` | `#5d4037` | Rail capture button text |
| `--rail-btn-hov` | `#f4f2ef` | Rail capture button hover |
| `--rail-btn-shadow` | `0 1px 2px rgba(58,28,20,.05)` | Rail capture button shadow |
| `--rail-peek-shadow` | `0 10px 30px rgba(58,28,20,.16)` | Hover-peek overlay shadow |
| `--rail-scrim` | `rgba(58,28,20,.12)` | Peek content scrim |

### Breadcrumb & slab
| Token | Value | Controls |
|---|---|---|
| `--crumb-bg` | `rgba(255,254,251,.55)` | Crumb strip wash |
| `--crumb-hair` | `#e7ddd2` | Crumb base hairline |
| `--crumb-seg` | `#9c8878` | Crumb segment |
| `--crumb-seg-hov` | `#5d4037` | Crumb segment hover |
| `--crumb-cur` | `#7c3a2a` | Crumb current segment |
| `--crumb-sep` | `#c9bba9` | Crumb `/` separator |
| `--slab-bg` | `#fffefb` | ChromeSlab surface |
| `--slab-bd` | `#e7ddd2` | Slab border |
| `--slab-bdw` | `1px` | Slab border width |
| `--slab-shadow` | `none` | Slab shadow |
| `--slab-ttl` | `#5d4037` | Slab title |
| `--slab-meta` | `#8a7a6c` | Slab meta |

### Command bar & column fade
| Token | Value | Controls |
|---|---|---|
| `--qp-col-bg` | `#fffefb` | Queries column fade colour |
| `--cmd-bar-bg` | `#fffdf9` | Command-bar surface |
| `--cmd-bar-bd` | `#e7ddd2` | Command-bar border |
| `--cmd-bar-bdw` | `1px` | Command-bar border width |
| `--cmd-bar-shadow` | `none` | Command-bar shadow |
| `--cmd-btn-bg` | `#ffffff` | Command button fill |
| `--cmd-btn-bd` | `#ded3c2` | Command button border |
| `--cmd-btn-bdw` | `1px` | Command button border width |
| `--cmd-btn-shadow` | `0 1px 2px rgba(58,28,20,.04)` | Command button shadow |
| `--cmd-primary-bg` | `#f6e4da` | Primary command button fill |
| `--cmd-primary-bd` | `#ecd0c2` | Primary command button border |
| `--cmd-primary-tx` | `#7c3a2a` | Primary command button text |

### StatusDot
| Token | Value | Controls |
|---|---|---|
| `--sd-hue` | `#7c3a2a` | StatusDot ring/glyph hue |
| `--sd-centre` | `#f6e4da` | StatusDot centre disc |

### Package Builder / Workshop (aliases + Builder surfaces)
| Token | Value | Controls |
|---|---|---|
| `--headT` | `var(--hdr)` → `#5d4037` | Builder heading text |
| `--btnBg` | `#fffefb` | Builder button fill (warmer white) |
| `--btnBd` | `#e0d5c8` | Builder button border |
| `--btnT` | `var(--hdr)` → `#5d4037` | Builder button text |
| `--btnH` | `#f7f2ea` | Builder button hover |
| `--selBg` | `#f3ede2` | Selected-row foam tint |
| `--winBg` | `#f5f0e6` | Result win-row foam tint |
| `--hdrOn` | `var(--hdr)` → `#5d4037` | Header text on a band fill |

### Hub token sheet (`--hub-*`) — espresso, hub-scoped
| Token | Value | Controls |
|---|---|---|
| `--hub-desk` | `#e8ddd0` | Hub desk |
| `--hub-slab` | `#fffefb` | Hub slab surface |
| `--hub-slab-rule` | `1px solid #e7ddd2` | Hub slab rule |
| `--hub-list` | `#fffefb` | Hub list panel |
| `--hub-pane-process` | `#fffefb` | Process (Queries) pane |
| `--hub-pane-reference` | `#fffefb` | Reference (Agents) pane |
| `--hub-col` | `#fffefb` | Hub column surface |
| `--hub-pane-bd` | `1px solid #d8cebf` | Pane border |
| `--hub-radius` | `6px` | Hub corner radius |
| `--hub-pane-sh` | `0 1px 3px rgba(58,28,20,.05)` | Pane shadow |
| `--hub-hair` | `#e7ddd2` | Hub hairline |
| `--hub-row-hair` | `#f2e9db` | Row hairline |
| `--hub-band-process` | `#f6f1e6` | Process paper band |
| `--hub-band-process-bd` | `rgba(107,74,47,.22)` | Process band border |
| `--hub-band-process-tx` | `#5d4037` | Process band text |
| `--hub-band-reference` | `#f6f1e6` | Reference paper band |
| `--hub-band-reference-tx` | `#5d4037` | Reference band text |
| `--hub-toggle-on` | `#705e4c` | Active toggle fill (taupe — **spec, supersedes v3 `#dcb588`**) |
| `--hub-toggle-on-tx` | `#ffffff` | Active toggle text |
| `--hub-pill-rail` | `#ffffff` | Rail pill on hub |
| `--hub-primary` | `#422701` | Primary button (**espresso — spec, supersedes v3 `#eee0c6`**) |
| `--hub-primary-bd` | `#422701` | Primary button border |
| `--hub-primary-tx` | `#ffffff` | Primary button text |
| `--hub-monogram` | `#422701` | Monogram disc (**espresso — spec, supersedes v3 `#705e46`**) |
| `--hub-monogram-tx` | `#fdfaf5` | Monogram initials |
| `--hub-row-on` | `#f6efe3` | Selected row fill |
| `--hub-cell` | `#fdfaf5` | Cell surface |
| `--hub-cell-bd` | `#efe6d8` | Cell border |
| `--hub-cmd` | `#fffdf9` | Hub command-bar surface |
| `--hub-cmd-rule` | `1px solid #e7ddd2` | Hub command-bar rule |
| `--hub-accent` | `#7c3a2a` | Hub accent |
| `--hub-ink` | `#3a1c14` | Hub ink |
| `--hub-head` | `#000000` | Masthead title ink |
| `--hub-label` | `#9c8878` | Hub labels |
| `--hub-item` | `#6a5a50` | Hub item text |
| `--hub-body` | `#5d4037` | Hub body text |
| `--hub-btn-bg` | `#ffffff` | Hub secondary button fill |
| `--hub-btn-bd` | `1px solid #d8cebf` | Hub secondary button border |
| `--hub-btn-sh` | `none` | Hub secondary button shadow |
| `--hub-btn-rad` | `7px` | Hub secondary button radius |

---

## Bold Pastille — `.t-bold`

Ink-framed vivid pink on muted blue. 1.5px ink borders (`--bdw`), rounded chrome (`--chromerad: 14px`), hard-offset shadows.

### Surfaces & borders
| Token | Value | Controls |
|---|---|---|
| `--bd` | `#1d1712` | Border colour (ink) |
| `--bdw` | `1.5px` | Border width |
| `--desk` | `#c2cfda` | Working-area background (muted blue) |
| `--band` | `#f4c7c2` | Vivid pink |
| `--pane` | `#ece2e0` | Blush (**note: hub reading panes override to white — see below**) |
| `--card` | `#fffefb` | Card surface (white — diverges from blush `--pane`) |
| `--chromerad` | `14px` | Chrome corners — **rounded** |
| `--listbg` | `#ffffff` | Query-list panel bg |

### Header & bands
| Token | Value | Controls |
|---|---|---|
| `--hdr` | `#000000` | Header text (black) |
| `--band-a` | `#f4c7c2` | Band gradient start (flat — both stops equal) |
| `--band-b` | `#f4c7c2` | Band gradient end |
| `--band-bd` | `#1d1712` | Band rule (1.5px ink via `--bdw`) |
| `--band-meta` | `#7a4438` | Band meta text |
| `--band-strong` | `#1d1712` | Band strong text |
| `--acc` | `#1d1712` | Theme accent |

### Buttons (the one treatment)
| Token | Value | Controls |
|---|---|---|
| `--abtn-bg` | `#fffefb` | Button fill |
| `--abtn-bd` | `#1d1712` | Button border (ink) |
| `--abtn-bdw` | `1.5px` | Button border width |
| `--abtn-ink` | `#1d1712` | Button text |
| `--abtn-hov` | `#f5e9e7` | Button hover |

### Rail
| Token | Value | Controls |
|---|---|---|
| `--navpill` | `#eec9c3` | Rail active pill (pink) |
| `--navtext` | `#1d1712` | Rail active text |
| `--rail-card` | `#fffefb` | Rail surface |
| `--rail-bd` | `#1d1712` | Rail border (ink) |
| `--rail-bdw` | `1.5px` | Rail border width |
| `--rail-hair` | `rgba(29,23,18,.18)` | Rail hairlines |
| `--rail-shadow` | `5px 5px 0 rgba(29,23,18,.92)` | Rail hard-offset shadow |
| `--rail-ink` | `#1d1712` | Rail icons |
| `--rail-label` | `#6a6560` | Rail eyebrow labels |
| `--rail-accent` | `#1d1712` | Rail accent |
| `--rail-itemtx` | `#2b2622` | Rail item text |
| `--rail-pill` | `#eec9c3` | Rail active-item pill |
| `--rail-hov` | `#f6efec` | Rail item hover |
| `--rail-btn-bg` | `#ffffff` | Rail capture button fill |
| `--rail-btn-bd` | `#1d1712` | Rail capture button border |
| `--rail-btn-bdw` | `1.5px` | Rail capture button border width |
| `--rail-btn-tx` | `#1d1712` | Rail capture button text |
| `--rail-btn-hov` | `#f8dcd8` | Rail capture button hover |
| `--rail-btn-shadow` | `2px 2px 0 rgba(29,23,18,.85)` | Rail capture button shadow |
| `--rail-peek-shadow` | `7px 7px 0 rgba(29,23,18,.92)` | Hover-peek overlay shadow |
| `--rail-scrim` | `rgba(29,23,18,.14)` | Peek content scrim |

### Breadcrumb & slab
| Token | Value | Controls |
|---|---|---|
| `--crumb-bg` | `rgba(255,255,255,.6)` | Crumb strip wash |
| `--crumb-hair` | `rgba(29,23,18,.18)` | Crumb base hairline |
| `--crumb-seg` | `#6a6560` | Crumb segment |
| `--crumb-seg-hov` | `#1d1712` | Crumb segment hover |
| `--crumb-cur` | `#1d1712` | Crumb current segment |
| `--crumb-sep` | `#9a948e` | Crumb `/` separator |
| `--slab-bg` | `#fffefb` | ChromeSlab surface |
| `--slab-bd` | `#1d1712` | Slab border (ink rule) |
| `--slab-bdw` | `1.5px` | Slab border width |
| `--slab-shadow` | `none` | Slab shadow |
| `--slab-ttl` | `#1d1712` | Slab title |
| `--slab-meta` | `#5e5954` | Slab meta |

### Command bar & column fade
| Token | Value | Controls |
|---|---|---|
| `--qp-col-bg` | `#fffefb` | Queries column fade colour |
| `--cmd-bar-bg` | `#fffefb` | Command-bar surface |
| `--cmd-bar-bd` | `#1d1712` | Command-bar border |
| `--cmd-bar-bdw` | `1.5px` | Command-bar border width |
| `--cmd-bar-shadow` | `none` | Command-bar shadow |
| `--cmd-btn-bg` | `#fffefb` | Command button fill |
| `--cmd-btn-bd` | `#1d1712` | Command button border |
| `--cmd-btn-bdw` | `1.5px` | Command button border width |
| `--cmd-btn-shadow` | `none` | Command button shadow |
| `--cmd-primary-bg` | `#eec9c3` | Primary command button fill |
| `--cmd-primary-bd` | `#1d1712` | Primary command button border |
| `--cmd-primary-tx` | `#1d1712` | Primary command button text |

### StatusDot
| Token | Value | Controls |
|---|---|---|
| `--sd-hue` | `#1d1712` | StatusDot ring/glyph hue |
| `--sd-centre` | `#f8dcd8` | StatusDot centre disc |

### Package Builder / Workshop (no-op aliases)
| Token | Value | Controls |
|---|---|---|
| `--headT` | `var(--ink)` → `#241c15` | Builder heading text (stays Builder ink, **not** `--hdr #000` — flagged for Bold's own pass) |
| `--btnBg` | `var(--pink)` → `#f5e2da` | Builder button fill |
| `--btnBd` | `var(--pink-b)` → `#e8c8bc` | Builder button border |
| `--btnT` | `var(--ink)` → `#241c15` | Builder button text |
| `--btnH` | `var(--pink-h)` → `#efd5ca` | Builder button hover |
| `--selBg` | `#fdf1ec` | Selected-row tint |
| `--winBg` | `#fdf1ec` | Result win-row tint |
| `--hdrOn` | `var(--ink)` → `#241c15` | Header text on the pink band |

### Hub token sheet (`--hub-*`)
| Token | Value | Controls |
|---|---|---|
| `--hub-desk` | `#c2cfda` | Hub desk |
| `--hub-slab` | `#fffefb` | Hub slab surface |
| `--hub-slab-rule` | `1.5px solid #1d1712` | Hub slab rule |
| `--hub-list` | `#ffffff` | Hub list panel |
| `--hub-pane-process` | `#ffffff` | Process pane (**supersedes locked blush `#ece2e0`**) |
| `--hub-pane-reference` | `#ffffff` | Reference pane |
| `--hub-col` | `#ffffff` | Hub column surface |
| `--hub-pane-bd` | `1.5px solid #1d1712` | Pane border |
| `--hub-radius` | `14px` | Hub corner radius |
| `--hub-pane-sh` | `4px 4px 0 rgba(29,23,18,.9)` | Pane hard-offset shadow |
| `--hub-hair` | `#4a443e` | Hub hairline |
| `--hub-row-hair` | `#d8d3cd` | Row hairline |
| `--hub-band-process` | `#f4c7c2` | Process paper band (pink) |
| `--hub-band-process-bd` | `#1d1712` | Process band border |
| `--hub-band-process-tx` | `#1d1712` | Process band text |
| `--hub-band-reference` | `#fbefef` | Reference paper band (**spec, supersedes v3 blue-grey `#d9e3ec`**) |
| `--hub-band-reference-tx` | `#1d1712` | Reference band text |
| `--hub-toggle-on` | `#f4c7c2` | Active toggle fill |
| `--hub-toggle-on-tx` | `#1d1712` | Active toggle text |
| `--hub-pill-rail` | `#ffffff` | Rail pill on hub |
| `--hub-primary` | `#f4c7c2` | Primary button (pink) |
| `--hub-primary-bd` | `#1d1712` | Primary button border |
| `--hub-primary-tx` | `#1d1712` | Primary button text |
| `--hub-monogram` | `#000000` | Monogram disc (**spec, supersedes v3 `#f8dcd8`**) |
| `--hub-monogram-tx` | `#ffffff` | Monogram initials |
| `--hub-row-on` | `#f4e4e1` | Selected row fill |
| `--hub-cell` | `#fdfaf5` | Cell surface |
| `--hub-cell-bd` | `rgba(29,23,18,.35)` | Cell border |
| `--hub-cmd` | `#ffffff` | Hub command-bar surface |
| `--hub-cmd-rule` | `1.5px solid #1d1712` | Hub command-bar rule |
| `--hub-accent` | `#1d1712` | Hub accent |
| `--hub-ink` | `#1d1712` | Hub ink |
| `--hub-head` | `#1d1712` | Masthead title ink |
| `--hub-label` | `#6a6560` | Hub labels |
| `--hub-item` | `#2b2622` | Hub item text |
| `--hub-body` | `#2b2622` | Hub body text |
| `--hub-btn-bg` | `#ffffff` | Hub secondary button fill |
| `--hub-btn-bd` | `1.5px solid #1d1712` | Hub secondary button border |
| `--hub-btn-sh` | `2px 2px 0 rgba(29,23,18,.85)` | Hub secondary button shadow |
| `--hub-btn-rad` | `9px` | Hub secondary button radius |

---

## Editorial — `.t-edn`

Graphite · Soft · Tinted. Neutral whites/greys, borderless "Soft" containers (shadow does the separating), rounded chrome (`--chromerad: 16px`). Graphite `#44484d` is the general accent; a separate midnight-blue `--a-*` set is the interactive/selected accent (see Structural differences).

### Surfaces & borders
| Token | Value | Controls |
|---|---|---|
| `--bd` | `#e3e2e0` | Border colour (hairline) |
| `--bdw` | `1px` | Border width |
| `--desk` | `#f4f4f3` | Working-area background |
| `--band` | `#f4f4f5` | Graphite 6% tint on white |
| `--pane` | `#ffffff` | Reading-pane surface |
| `--card` | `#ffffff` | Card surface |
| `--chromerad` | `16px` | Chrome corners — **rounded** |
| `--listbg` | `#ffffff` | Query-list panel bg |

### Header & bands
| Token | Value | Controls |
|---|---|---|
| `--hdr` | `#000000` | Header text (black; body ink stays `#1a1a1a`) |
| `--band-a` | `#f4f4f5` | Band gradient start |
| `--band-b` | `#f4f4f5` | Band gradient end |
| `--band-bd` | `transparent` | No band bottom border in Editorial |
| `--band-meta` | `#8b8b8b` | Band meta text |
| `--band-strong` | `#1a1a1a` | Band strong text |
| `--acc` | `#44484d` | Theme accent (graphite) |

### Editorial accent set (`--a-*`) — Editorial-only, never leaked
| Token | Value | Controls |
|---|---|---|
| `--a-ink` | `#233150` | Midnight — primary actions, selected marks, status, emphasis |
| `--a-fill` | `#dbe1ec` | Pale midnight — selected/marked fills |
| `--a-line` | `#8a97b2` | Mid — borders on accented elements |
| `--a-soft` | `#eef1f6` | Faint — hover / active-filter / selected-row backgrounds |

### Buttons (the one treatment — Tinted)
| Token | Value | Controls |
|---|---|---|
| `--abtn-bg` | `#eeeff0` | Button fill (Tinted 9%) |
| `--abtn-bd` | `transparent` | No border |
| `--abtn-bdw` | `1px` | Border width (unused visually) |
| `--abtn-ink` | `#181a1d` | Button text (85% toward black) |
| `--abtn-hov` | `#e4e5e7` | Button hover (16% tint) |

### Rail
| Token | Value | Controls |
|---|---|---|
| `--navpill` | `#ececee` | Rail active pill (10% tint) |
| `--navtext` | `#44484d` | Rail active text |
| `--rail-card` | `#ffffff` | Rail surface |
| `--rail-bd` | `transparent` | Rail border (none — shadow separates) |
| `--rail-bdw` | `0px` | Rail border width |
| `--rail-hair` | `#ececeb` | Rail hairlines |
| `--rail-shadow` | `0 1px 2px rgba(20,20,20,.05), 0 14px 36px rgba(20,20,20,.09)` | Rail layered shadow |
| `--rail-ink` | `#1a1a1a` | Rail icons |
| `--rail-label` | `#8a8d90` | Rail eyebrow labels |
| `--rail-accent` | `#44484d` | Rail accent (graphite) |
| `--rail-itemtx` | `#3c3f43` | Rail item text |
| `--rail-pill` | `#e9eaeb` | Rail active-item pill |
| `--rail-hov` | `#f3f3f2` | Rail item hover |
| `--rail-btn-bg` | `#ffffff` | Rail capture button fill (white + hairline — **not** Tinted, deliberate) |
| `--rail-btn-bd` | `#dcdcdb` | Rail capture button border |
| `--rail-btn-bdw` | `1px` | Rail capture button border width |
| `--rail-btn-tx` | `#2c2f33` | Rail capture button text |
| `--rail-btn-hov` | `#f3f3f2` | Rail capture button hover |
| `--rail-btn-shadow` | `0 1px 2px rgba(20,20,20,.04)` | Rail capture button shadow |
| `--rail-peek-shadow` | `0 2px 4px rgba(20,20,20,.06), 0 18px 44px rgba(20,20,20,.14)` | Hover-peek overlay shadow |
| `--rail-scrim` | `rgba(20,20,20,.10)` | Peek content scrim |

### Breadcrumb & slab
| Token | Value | Controls |
|---|---|---|
| `--crumb-bg` | `rgba(255,255,255,.6)` | Crumb strip wash |
| `--crumb-hair` | `#ececeb` | Crumb base hairline |
| `--crumb-seg` | `#8a8d90` | Crumb segment |
| `--crumb-seg-hov` | `#1a1a1a` | Crumb segment hover |
| `--crumb-cur` | `#44484d` | Crumb current segment |
| `--crumb-sep` | `#c4c6c8` | Crumb `/` separator |
| `--slab-bg` | `#ffffff` | ChromeSlab surface |
| `--slab-bd` | `#ececeb` | Slab border |
| `--slab-bdw` | `1px` | Slab border width |
| `--slab-shadow` | `0 3px 10px rgba(20,20,20,.04)` | Slab shadow (separates on the near-white desk — deliberate exception) |
| `--slab-ttl` | `#1a1a1a` | Slab title |
| `--slab-meta` | `#7d8083` | Slab meta |

### Command bar & column fade
| Token | Value | Controls |
|---|---|---|
| `--qp-col-bg` | `#fffefb` | Queries column fade colour |
| `--cmd-bar-bg` | `#ffffff` | Command-bar surface |
| `--cmd-bar-bd` | `#ececeb` | Command-bar border |
| `--cmd-bar-bdw` | `1px` | Command-bar border width |
| `--cmd-bar-shadow` | `0 -2px 10px rgba(20,20,20,.04)` | Command-bar shadow |
| `--cmd-btn-bg` | `#ffffff` | Command button fill |
| `--cmd-btn-bd` | `#dcdcdb` | Command button border |
| `--cmd-btn-bdw` | `1px` | Command button border width |
| `--cmd-btn-shadow` | `0 1px 2px rgba(20,20,20,.04)` | Command button shadow |
| `--cmd-primary-bg` | `#e9eaeb` | Primary command button fill |
| `--cmd-primary-bd` | `#dcdcdb` | Primary command button border |
| `--cmd-primary-tx` | `#44484d` | Primary command button text |

### StatusDot
| Token | Value | Controls |
|---|---|---|
| `--sd-hue` | `#44484d` | StatusDot ring/glyph hue |
| `--sd-centre` | `#e9eaeb` | StatusDot centre disc |

### Package Builder / Workshop (completeness aliases)
| Token | Value | Controls |
|---|---|---|
| `--headT` | `var(--hdr)` → `#000000` | Builder heading text |
| `--btnBg` | `var(--abtn-bg)` → `#eeeff0` | Builder button fill |
| `--btnBd` | `var(--abtn-bd)` → `transparent` | Builder button border |
| `--btnT` | `var(--abtn-ink)` → `#181a1d` | Builder button text |
| `--btnH` | `var(--abtn-hov)` → `#e4e5e7` | Builder button hover |
| `--selBg` | `var(--band)` → `#f4f4f5` | Selected-row tint |
| `--winBg` | `var(--band)` → `#f4f4f5` | Result win-row tint |
| `--hdrOn` | `var(--hdr)` → `#000000` | Header text on a band fill |

### Hub token sheet (`--hub-*`) — the two papers differ by typography only
| Token | Value | Controls |
|---|---|---|
| `--hub-desk` | `#f4f4f3` | Hub desk |
| `--hub-slab` | `#ffffff` | Hub slab surface |
| `--hub-slab-rule` | `1px solid #ececeb` | Hub slab rule |
| `--hub-list` | `#ffffff` | Hub list panel |
| `--hub-pane-process` | `#ffffff` | Process pane |
| `--hub-pane-reference` | `#ffffff` | Reference pane |
| `--hub-col` | `#ffffff` | Hub column surface |
| `--hub-pane-bd` | `1px solid #ececeb` | Pane border |
| `--hub-radius` | `10px` | Hub corner radius |
| `--hub-pane-sh` | `0 1px 2px rgba(20,20,20,.05), 0 12px 30px rgba(20,20,20,.07)` | Pane shadow |
| `--hub-hair` | `#ececeb` | Hub hairline |
| `--hub-row-hair` | `#f1f1f0` | Row hairline |
| `--hub-band-process` | `#eceae6` | Process paper band |
| `--hub-band-process-bd` | `#e0deda` | Process band border |
| `--hub-band-process-tx` | `#44484d` | Process band text |
| `--hub-band-reference` | `#f5f5f5` | Reference paper band (**spec, supersedes v3 white**) |
| `--hub-band-reference-tx` | `#44484d` | Reference band text |
| `--hub-toggle-on` | `#e9eaeb` | Active toggle fill |
| `--hub-toggle-on-tx` | `#1a1a1a` | Active toggle text |
| `--hub-pill-rail` | `#ffffff` | Rail pill on hub |
| `--hub-primary` | `#dedede` | Primary button (**spec, supersedes v3 `#e9eaeb`**) |
| `--hub-primary-bd` | `#dcdcdb` | Primary button border |
| `--hub-primary-tx` | `#000000` | Primary button text |
| `--hub-monogram` | `#e9eaeb` | Monogram disc |
| `--hub-monogram-tx` | `#44484d` | Monogram initials |
| `--hub-row-on` | `#f5fbff` | Selected row fill (**spec pale blue, supersedes v3 `#f1f1f0`**) |
| `--hub-cell` | `#fafaf9` | Cell surface |
| `--hub-cell-bd` | `#e6e6e5` | Cell border |
| `--hub-cmd` | `#fbfbfa` | Hub command-bar surface |
| `--hub-cmd-rule` | `1px solid #ececeb` | Hub command-bar rule |
| `--hub-accent` | `#44484d` | Hub accent |
| `--hub-ink` | `#1a1a1a` | Hub ink |
| `--hub-head` | `#1a1a1a` | Masthead title ink |
| `--hub-label` | `#8a8d90` | Hub labels |
| `--hub-item` | `#3c3f43` | Hub item text |
| `--hub-body` | `#3c3f43` | Hub body text |
| `--hub-btn-bg` | `#ffffff` | Hub secondary button fill |
| `--hub-btn-bd` | `1px solid #dcdcdb` | Hub secondary button border |
| `--hub-btn-sh` | `0 1px 2px rgba(20,20,20,.04)` | Hub secondary button shadow |
| `--hub-btn-rad` | `8px` | Hub secondary button radius |

---

## Structural differences (what makes each theme recognisable beyond colour)

These flourishes matter as much as the hexes — they are the difference between "themed correctly" and "right colours, wrong feel".

| Aspect | Cappuccino (`.t-capp`) | Bold Pastille (`.t-bold`) | Editorial (`.t-edn`) |
|---|---|---|---|
| **Chrome radius** (`--chromerad`) | `0px` — square | `14px` — rounded | `16px` — rounded |
| **Hub radius** (`--hub-radius`) | `6px` | `14px` | `10px` |
| **Border width** (`--bdw`) | `1px` taupe | `1.5px` ink | `1px` hairline |
| **Shadow language** | Soft blurred (`0 1px 3px …`) | **Hard offset** (`5px 5px 0`, `4px 4px 0`, `2px 2px 0`) | Layered soft (`… 14px 36px …`) |
| **Container borders** | Present, taupe | Present, heavy ink | Often **transparent** — borderless "Soft", shadow separates |
| **Band bottom rule** (`--band-bd`) | `rgba(112,94,70,.25)` | `#1d1712` ink | `transparent` (none) |
| **Bands** | Foam gradient (two stops) | Flat vivid pink (equal stops) | Flat 6% graphite tint |
| **Inset frame** | **Cappuccino-only** `.t-capp .qhbar::after` — square 1px `#7c3a2a` inset at 6px (Form 11 frame). Scoped so it never leaks to Bold. | none | none |

### Theme-only rules & aliases
- **Cappuccino:** the `.qhbar::after` inset frame is scoped under `.t-capp` (a past mockup bug leaked it into Bold — do not re-introduce). Hub `--hub-*` values are *hub-scoped espresso* — the rest of the app keeps mocha/pink Cappuccino.
- **Bold:** the Package Builder aliases (`--headT`, `--btnBg` …) are deliberate no-ops that keep Bold's *current* Builder look — `--headT` stays Builder ink `#241c15`, **not** the locked `--hdr #000`. Flagged in-file for Bold's own retokening pass.
- **Editorial:**
  - `.t-edn .sa-soft` — 16px radius, `border:none`, layered shadow (`0 1px 2px …, 0 12px 32px …`). The shared "Soft container" class.
  - Content overrides scoped to `.t-edn`: `.qmono` (list monograms → neutral `#f1f1ef`/`#e3e2e0`/`#555`), `.qcaveat` (handwritten notes → quiet Playfair italic `13.5px #5a5650`), `.qchip` (chips/badges → neutral `#f1f1ef`/`#e3e2e0`/`#555`).
  - The midnight `--a-*` accent set is Editorial-only and must not leak to `.t-capp`/`.t-bold`. It governs interactive/active/selected states, primary actions and status/territory indicators **only** — never headings, body, labels, structural borders or stars (those stay neutral). See CLAUDE.md "Editorial theme colour roles" for the full role map.
  - Capture buttons stay **white + hairline** (not Tinted) — a tinted fill would read as an active state beside the tinted nav pill. Deliberate.

### Theme-independent behaviour
- Theme swap fades over ≤150ms (`transition: background-color .15s ease` on all three roots).
- The grand-masthead title steps `54px → 40px` at `max-height ≤ 819px` (`--hub-mast-title`/`--hub-mast-pad`, `:root`), theme-independent; only the title *ink* is per-theme (`--hub-head`).
- StatusDot is never restyled by theme CSS — only its `--sd-hue`/`--sd-centre` component tokens change.

---

## Known state (as of 2026-07-07)

- **CSS ↔ TS drift — deep burgundy:** `src/index.css` `--burg-d: #632e22` vs `src/lib/designTokens.ts` `deepBurgundy = "#6b3023"`. Two different hexes for the same "deep burgundy" role. The shared brand constants that *do* match: burgundy `#7c3a2a`, pink trio `#f5e2da`/`#e8c8bc`/`#efd5ca`, slate `#6A89A7`, sage `#8a9e88`, sage-d `#5a6e58`. The `:root` comment in index.css already flags the pink-trio/burgundy JS copies as a consolidation risk.
- **Hub sheet supersedes the v3 mockup:** several `--hub-*` values are marked `SPEC … superseded` in-file (they come from Nick's tuner spec, which wins over `hub-token-sheet-v3.html`). Recorded inline above with the superseded value.
- **Bold `--hub-pane-process`/`-reference` = white** supersedes the previously-locked blush `#ece2e0` Queries pane. Both Bold hub panes are now white *by token*.
- **Cappuccino de-pinking is hub-scoped only** — an app-wide Capp retoken is a separate future pass; judge the hubs in isolation.
- **`queriesTheme: "editorial"`** only persists once the parked rules edit ships (per `src/types.ts`); until then Editorial is selectable but may not survive a write.
- **Route-scoped Query-DB palettes** (`qdb*` in designTokens.ts) are a *separate* system from these three themes and are intentionally not covered here.


---

## `.t-f12` — the F12 master theme (overnight nav/hub/agents run, 2026-07-13)

Applied ONLY to the Queries Hub and Contact List page roots (via `F12Page` in
`src/components/shell/F12Shell.tsx`); never app-wide. `.t-capp`/`.t-bold`/`.t-edn` are
untouched — consolidation is a separate, later job. Tokens live in `src/index.css`
(`.t-f12` block); shared shell classes in `src/components/shell/f12.css`. Values are the
mockups' `:root` (`design-refs/queries-hub-v18.html` ≡ `agents-contact-list-v7.html` — the
chrome revision replaced v14/v3).

- **Warm neutral ramp:** `--oat #f1e8dc` (chrome + ground; line `--oatline #e0d3c1`) →
  `--paper #faf6f0` (recessed canvas, hovers) → `--panel #fffdfb` (raised panes/cards) →
  `--white #ffffff` (popovers only).
- **Two line weights:** `--line #e6dccd` (structural) · `--hairline #f0eae1` (internal).
- **Warm ink ramp:** `--ink #1e1a16` · `--ink-2 #4a443c` · `--muted #7d7469` · `--faint #a89e91`.
- **Three warm shadows:** `--sh-1` cards · `--sh-2` panes · `--sh-3` popovers/drawer (+ `--sh-btn`).
- **Semantic accents:** blue = you-are-here (`--blue-t #e7eef6` / `--blue-b #d3e0ee` /
  `--blue-i #2b4a6b` — nav active, selected row); pink = needs-you (`--pink-t #f7e3dd` /
  `--pink-b #eecdc3` / `--pink-i #8a4030`, avatar `--pink-av #f6d7cf` — badges, chips, task
  counts, status pill, avatars); sage = the card header bands + the agent-header spine.
- **Primary-button pink (chrome revision):** `--pink-btn #f6cfc9` · `--pink-btn-h #f0bfb8` —
  the control bar's ONE filled CTA (Log a query / Add agent). ⚠️ v14/v3 OMITTED these two
  tokens; an undefined `var()` renders as nothing, which silently made the mockups' primary
  button transparent. Always define every token you reference.
- **To-do board bands (added 2026-07-13, board rebuild):** `--pink-hero #f9e8e2` (the Do-next
  hero gradient start) · gold advisory band for Housekeeping — `--gold-t #f6efdd` / `--gold-b
  #e7d9b8` / `--gold-i #7d621d` (with the shared `--gold #a8842c` ink) · post-it band for the
  Your-tasks column — `--note-t #faf0c8` / `--note-b #ecdda4` / `--note-i #7a6420`. ADDITIVE — no
  existing value changed; values copied from `design-refs/todo-workspace-v10.html`'s `:root`
  (continuing the "copy the mockup `:root` into `.t-f12`" pattern). Consume these for any future
  F12 advisory/note surface rather than reinventing a gold or yellow.
- **StatusDot palette (added 2026-07-15, To-do board):** `--sd-hue #7c3a2a` (burgundy ring/glyph) ·
  `--sd-centre #f8e7dc` (pale-pink centre disc) — the `--burg`/`--pinkC` pair as literals. ADDITIVE:
  `.t-f12` previously defined neither, so `StatusDot` fell back to its un-themed per-status spectrum
  (off-palette on the oat board). One hue per theme; direction/stage is carried by the dot's SHAPE,
  not colour (the StatusDot lock — the component is untouched, this is a token add).
- **Raised "diary" panel material (added 2026-07-16, To-do hero):** `--float-hairline #e9ded0` ·
  `--float-rad 22px` · `--float-sh 0 10px 34px rgba(58,28,20,0.09)` — the dashboard Dates-for-the-diary
  container (`.dc-panel` in `diaryCarousel.css`, Cappuccino values) lifted as tokens so F12 raised
  panels reuse it rather than duplicating the hexes. ADDITIVE. The To-do hero fills this material with
  `--pink-hero` (solid pale-pink) — the diary's material, the hero's colour (owner call: panel, not glass).
- **⚠️ SAGE CORRECTION (standing decision):** the band pair is the LIVE dashboard diary band —
  `--sage-band: #dce0d9; --sage-band-2: #d0d6cc` (from `diaryCarousel.css`), which WINS over
  the mockups' `#d7ddd5 → #d5dbd3`, so hub, agents and dashboard match. Edge `--sage-edge
  #c8d0c5` (mockup value, nothing live contradicts); dark-sage icon `--sageD #5a6e58` (agreed).
- **Radii:** 6 / 9 / 12 / 16 (`--r-sm/md/lg/xl`). **Layout:** `--listw 334px` · `--gut 12px` ·
  `--maxw 1520px`. **Fonts:** `--f12-mono/serif/body` (Inter added to the font links this run).
- The `.t-f12` block also carries `--crumb-*` literals so the app-wide CrumbStrip reads as the
  full-bleed header inside these pages (a token repaint — the component is untouched). Chrome
  revision: the header went WHITE — `--crumb-strip-bg #fffdfb` (--panel) with a `--crumb-strip-rule
  #e6dccd` (--line) base, replacing the original oat.
- House rules honoured: literals only (no `:root` aliasing — known freeze bug), no
  `color-mix()`, reduced-motion end-states in f12.css.

## `.t-f12` — To-do retoken additions (2026-07-16, `design-refs/todo-board-final-retoken.html`)

**The To-do page colour law** (encoded as tokens, enforced by the retoken pass):
- **Pink = Urgent identity** — lane spine `--pink-btn`, post-it `--postit-pink #f9d9d2`.
- **HK-SAGE = Housekeeping identity AND the page's ONE "done" family** — `--hk-sage #dce0d9` ·
  `--hk-sage-2 #d0d6cc` (= the LIVE dashboard diary band, verified at source against
  `--dc-band`/`--sage-band`; the dashboard wins over any mockup) · `--hk-spine #b9c3b3` (spines,
  bars, dots) · `--hk-ink #54614f` (text + deep fills: done ticks, done pill, receipt ticks) ·
  post-it `--postit-sage`. Receipts, review "Done" verbs, choice-selected states, the staged pill,
  progress-dot "done", the big-tick circles and the sweep inline receipt ALL read this family.
- **Note-yellow = Notes identity** (`--note-*`, unchanged) — post-it `--postit-note #f8ecb0`.
- **COFFEE = Today's list** (a darker patch of the desk itself, never a Pro surface) —
  `--coffee #e7dbc9` (bands) · `--coffee-2 #dccdb5` (FAB ring, rolled-over dot) · `--coffee-edge
  #d3c2a6` (borders) · `--coffee-ink #6b5a41` (text) · `--coffee-deep #8a755a` (reserve). Applies:
  pop-up header + committed chip + dashed prompt + rollover bar, the card "✓ ON TODAY" pill, the
  FAB ring.
- **Burgundy = deadline signal ONLY — and no longer a TAG fill** (amended by polish v3, see below;
  it survives in the focus flow's warn stream chip + micro-accents). **Ink = offer tag + primaries.**
- **GOLD IS RETIRED from the To-do page** (the `--gold-*` tokens remain defined for any other
  consumer; nothing on `/todo` reads them).
- **StatusDot LOCK unchanged:** `--sage/--sageC/--sageD/--sage-edge` (the `#8a9e88` family) are
  STATUS colours — on the To-do page they appear ONLY inside the real `StatusDot` component.
- Supporting: `--sub #5c554b` (option-A card sub-ink) · shadows `--sh-card` / `--sh-card-h`
  (cards straight on the oat) · `--sh-postit` (the 88px header post-its).

## `.t-f12` — Polish v3 amendments (2026-07-16, board polish pass; visual ref `todo-task-settings.html` §3)

- **THE TWO-DEPTH PINK TAG LAW (amends the retoken's tag clause; ⚠️ SUPERSEDED 2026-07-18 by THE WHITE TAG LAW below — tags are now white, not pink):** card tags trade burgundy for
  depth-of-pink — **standard status tags** (OVER TO YOU, STALE QUERY, SNOOZED ×n and kin) = soft
  pink `--pink-t` fill / `--pink-b` border / `--pink-i` text; **urgency tags** (deadline
  countdowns, N-days-no-reply — the `warn` class) = the DEEPER pink `--pink-btn` fill / `--pink-b`
  border / **`--pink-deep #6e3325`** text (NEW token, minted this pass) / weight 700 — urgency
  outranks status by depth, not hue. **Offer keeps the ink ★** (rarest thing, rarest colour);
  **note cards keep note-yellow** (`--note-t/-b/-i` scoped via `.tdb-tile.nt`). Burgundy fills no
  tag anywhere on the page; it survives in StatusDots (locked), the focus flow's warn stream chip
  (flow internals — retoken Phase E grammar, out of the polish pack's scope) and micro-accents
  (pips, progress dots, italic emphasis). Rule-text-locked in `todoTagLaw.test.ts`.
- The Urgent post-it's ink now reads `var(--pink-deep)` (was the same hex inline) — one source.

## `.t-f12` — THE COLOUR-LAW RETUNE (2026-07-17, finishing pack; ref `todo-ideas-retune.html` §1 — §2–5 are fenced exploration)

**The law INVERTS two families (supersedes the retoken's assignments for these two):**
- **COFFEE = HOUSEKEEPING IDENTITY** — the NEW `--hk-cof #e9dcc8` · `--hk-cof-2 #e2d2b9`
  (post-it/spine/kicker-dot fills) · `--hk-cof-edge #cdb58f` · `--hk-cof-ink #7a6544` (ref
  values verbatim, one shade below the oat ground). Carries: the hk post-it, lane dot, card +
  grouped-card spines, kicker + dot, the G3 progress bar, the muted-rules chips, the batch-fill
  chips (board flip + flow), the hk stream chip, unmute pills, the Spotless spine.
- **SAGE = THE TODAY'S-LIST SYSTEM (and, as before, the done family)** — `--hk-sage/-2/spine/ink`
  now carry: the commit pill's on-state ("✓ On today's list", sage gradient), the FAB (sage
  gradient pill · INK completion ring · ink title · sage-ink meta), the rollover bar, the
  commit-prompt dashes, the pick button — plus everything done-family already sage (receipts,
  ticks, the pop-up done band/badge, staged pill, choice-selected, review Done verbs).
- **Pink (urgency/status), ink (offer + primaries), note-yellow: unchanged.**
- **`--coffee-*` RETIRED FROM CONSUMPTION** (definitions kept, annotated; nothing app-wide reads
  them). `--postit-sage` is likewise orphaned (the hk post-it now reads `--hk-cof-2`).
- Incidental non-identity usages went NEUTRAL (the never-fork heading, the rail ⏸ hover) — the
  principle: sage and coffee are now meaningful; incidental colour goes neutral. Caveat asides
  stay sage-ink (the done register).

## `.t-f12` — CORNER CLUSTER: the today-family FAB wears letterpress (2026-07-18, corner pack)

The Today's-list pill is now **letterpress** — `--paper` body, 1.5px `--ink` border, radius 99, soft
float shadow (`0 6px 18px rgba(58,28,20,.12)`). The sage gradient LEFT the pill body; **sage speaks
through the pill's STATES** instead — the completion ring is ink-on-hairline, the "work done today"
puck is the sage tick (`--hk-sage`/`--hk-spine`/`--hk-ink`), the fresh-desk puck is paper + a muted
＋. The two companions (settings sliders + the AppShell help "?") are matched 38px paper circles,
hairline border, muted glyph → ink on hover; one baseline, 12px gaps (anchored to the AppShell
help's existing bottom:20/right:20). One family, three ranks: primary letterpress pill, two whisper
satellites.

## `.t-f12` — CARD ANATOMY: header bands (Variant A) SUPERSEDE the spines (2026-07-18, card-bands pack)

**The coloured left spines are RETIRED across every board card. Lane identity is now a slim tinted
HEADER BAND.** The MountCard header-fill structure (non-negotiable):
- **RIM** = the outer `.tdb-tile` / `.tdb-gcard`: white, radius 13, 3px padding, box-shadow, NO
  clip (the shadow shows). Keeps the flex-basis width (`--tdb-cardw`) — exact-fit is width-only.
- **`.tdb-frame`** = the child clip context: 1px `--line`, radius 10, `overflow:hidden`. The
  on-hover border-warm and the on-today border live here (not the rim).
- **`.tdb-band ${stream}`** = a slim ~34px header carrying ONLY the tag/kicker row, with a 1px
  identity `border-bottom`. Tints: `.do` `--pink-t`/`--pink-b` · `.hk` `--hk-cof`/`--hk-cof-edge`
  · `.nt` `--note-t`/`--note-b`.
- **`.tdb-body`** = white; the title leads, then sub / meta / pinned action pills (`.tdb-mid`
  still flex-clips beneath the band — the pills-can-never-spill invariant holds).
- **Height:** 208 → 242 (208 + the band), uniform per card class.
- **On-band tag law** (⚠️ SUPERSEDED 2026-07-18 by THE WHITE TAG LAW — tags are white board-wide now,
  so this in-band-only override is deleted; the grouped-dot clause stands): standard status tags go
  WHITE-filled; urgency `.warn` ~~keeps its deeper `--pink-btn`/`--pink-deep`/700 fill~~ is now white
  + a 1.5px ink frame; the offer keeps the ink ★; the grouped-card `--hk-kd` dot goes white-filled
  with the coffee border.
- **Overlays** (receipt / dismissed / fork / flip) cover the WHOLE frame (no band) — the fill +
  border + padding ride the frame; the rim stays white.
- **Clear (empty-state) cards** dropped their spines and went NEUTRAL (horizontal cards, not lane
  tiles — a lone band read worse than the plain hairline).
- **SUPERSEDES:** the retune's "lane spine `--pink-btn`" / "grouped-card spines" / "Spotless
  spine" references above — those spine consumers are gone; the band is the identity surface.
  `--pink-btn` remains the urgency-tag fill (unchanged); the `--hk-cof`/`--pink-t`/`--note-t`
  families now paint bands, not just chips.

## `.t-f12` — THE WHITE TAG LAW (2026-07-18, corner pack P3 — SUPERSEDES the two-depth pink tag law AND the card-bands on-band tag law)

**Every status tag is now WHITE.** The lane BANDS carry the stream colour, so a tinted tag would
double the signal — the tags step back to a neutral chip and let the band speak.
- **Standard status tags** (OVER TO YOU, STALE QUERY, SNOOZED ×n, and every `.due` kin) = `--white`
  fill / **`rgba(30,26,22,.25)`** hairline (that is `--ink` `#1e1a16` at 25%, a literal — `.t-f12`
  bans `color-mix`) / `--ink` text.
- **Urgency tags** (the `.warn` class) = white too, but a full **1.5px `--ink` frame + weight 700** —
  depth is now carried by the frame and weight, not by a deeper hue.
- **★ Offer** = the ink fill, unchanged (the rarest mark on the board).
- **Note tags** fall to the same white base — the `.tdb-tile.nt .tdb-tag` note-yellow override and
  the card-bands `.tdb-band .tdb-tag:not(...)` interim white override are both DELETED (redundant
  once the base is white board-wide).
- **Retired from tag consumption:** `--pink-t`/`--pink-b`/`--pink-i`/`--pink-btn`/`--pink-deep` and
  `--note-t/-b/-i` no longer fill or outline any tag. They survive elsewhere (bands, post-its,
  discs, buttons, the focus flow). Burgundy still fills no tag. Rule-text-locked in
  `todoTagLaw.test.ts` (incl. a "no non-offer tag draws a tinted fill" sweep).

## `.t-f12` — THE WORKBENCH (2026-07-18, workbench pack; refs todo-workbench-shell-v1.html Option B + todo-ledger-v1.html)

**The board became a workbench: drawer + centred column + two views.** A floating parchment
DRAWER (264px, sticky below the app nav, folds to a 64px icon rail; `sa.todoDrawer`) carries
＋ New note, Walk me through, the typed filters and the embedded Today's-list panel (sage header —
the corner FAB/pop-up are retired); the content column centres at **1150px** inside a 1720 row.
The masthead is ONE row: 20px Playfair title + mono date·week eyebrow, **42px post-its**, the
50×37 scrap, the ⌘K search, and the Cards/Ledger view toggle (`sa.todoView`).

**CARD GRAMMAR (amends the card-bands law — structure unchanged, scale tightened):**
- The horizontal reels/pagers/snap are RETIRED — cards live in a wrapping
  `repeat(auto-fill, minmax(230px, 1fr))` grid, 12px gaps; the page scrolls.
- RIM → `.tdb-frame` → `.tdb-band` + `.tdb-body` stands as written, at the tightened scale:
  **band 26px** (was 34), **title 14px** Playfair (was 17), body pad `10px 12px 11px`,
  **min-height 200** (was 242). Lane tints, overlays-cover-the-frame, and the pills-never-spill
  clip chain all unchanged.
- **THE WHITE TAG LAW IS INHERITED UNTOUCHED** (corner P3 stands): white fill / ink text / faint
  ink hairline; urgency = 1.5px ink frame + 700; ★ offer = ink. `todoTagLaw.test.ts` unchanged.
- **Renames (app-wide on this page):** lane heads say **"Begin focused session"**; the grouped
  card's CTA (and every batch entry) says **"Batch fix →"** — the journey internals are untouched,
  only the name changed.
- **The LEDGER view** (todo-ledger-v1.html): per-section white tables — tinted heads (pink
  `--pink-t→--pink-btn` grad · coffee `--hk-cof→--hk-cof-2` grad · note `--note-t`), the shared
  9-col grid, 44px rows, `--paper` child rows, StatusDot verbatim in STATUS. Ledger tags obey the
  white law (the batch `cof` variant re-inks border/text only). View pref `sa.todoView`.

## `.t-f12` — SHEET ANATOMY (2026-07-18, evening run C; refs todo-sheet-restyle-v1.html (E + corner exit, normative) + todo-sheet-ceremony-v1.html (§D only))

**Every sheet on the To-do page — all FocusFlow modes + Task Settings — wears one anatomy:**
- **Wrapper + sheet:** `.tdb-ffwrap` (positioning) carries the **corner exit** `.tdb-ffx` — a 44px
  parchment circle, 1.5px ink, ink ✕ (2.4/round caps), straddling top-right (−16/−16), scrim
  shadow, hover 1.06, `aria-label="Back to my desk"` — rendered AFTER the sheet (the focus trap's
  last tab stop). The sheet keeps `overflow:hidden` (band clipping); the exit never lives inside
  the clip. It is the ONLY exit chrome (the pill + chrome row are retired; progress dots + count
  live in the sheet foot). Same dismiss guard: immediate when clean, confirm when staged.
- **The BAND (layout E, default):** family gradient + 1px family border-bottom, no radius; kicker
  pill → 30px Playfair headline (`.tdb-ffq.tdb-fbh`) → italic sub, left; art slot 165×120
  fit-within + CSS `drop-shadow(0 3px 6px rgba(58,28,20,.14))` (assets ship shadowless), right.
  Absent art = a quieter band (the slot renders nothing).
- **Ceremony (layout D):** same band, column-centred (kick → art 180×130 → headline → sub).
  Reserved for: the offer celebration, the Sunday review's opening + closing screens, and the
  completion/receipt screens (saved / desk-walked / lane-swept).
- **FAMILIES (live tokens):** pink `--pink-t→--pink-btn`/`--pink-b` = urgent work (sends,
  resubmits, nudges, the offer journey — its kickers carry the ★) · coffee `--hk-cof→--hk-cof-2`/
  `--hk-cof-edge` = housekeeping (Batch fix sittings, stale closes, detail fills) · sage
  `--hk-sage→--hk-sage-2`/`--hk-spine` = ritual (the Sunday review, the save/review screens, and
  Today walks — sage WHOLE-WALK via the `ritual` prop) · parchment `--paper`/`--hairline` =
  Task Settings AND notes (notes have no family in the law's closed list — the neutral is the
  reported call). Focused sessions wear the lane they sweep (per-item stream family); mixed walks
  crossfade (the band is keyed by family, 0.2s fade, off under reduced motion).
- **Mobile ≤760:** the exit insets to 12/12; bands stack text-above-art at reduced scale; **art
  hides under 480** (the reported call). The illustration manifest lives in
  `src/components/todo/journeyArt.ts` (`send` shipped; contract in the restyle ref's header).

## `.t-f12` — THE SOFT TAG LAW (2026-07-19, Polish III P2 — third and FINAL revision; supersedes the white tag law's two exceptions)

**Every tag, both views, one look:** white fill · **1px `rgba(30,26,22,.25)`** border (the live
`--ink` at 25% — the ref's #3a1c14 realised as the token) · ink text. **★ OFFER keeps its ★
(markup) + 700** but loses the ink fill; **urgency keeps 700** but loses the 1.5px ink frame.
The ledger's coffee-tinted batch variant is retired too — no tag variant re-inks anything.
Weight and the ★ are the only remaining emphasis channels; colour belongs to the bands.
Rule-text-locked in `todoTagLaw.test.ts`.

## `.t-f12` — THE RIGHT COLUMN (2026-07-19, Polish VI; ref `todo-right-column-v1.html`)

- **"Today" (renamed from "Today's list") is ALWAYS ON** — a constant 264px column (`--tdb-today`)
  in the full-bleed grid ≥1200px; the masthead chip + popover serve below. **Its card header is
  now PLAIN PAPER** (Playfair "Today" + a mono right slot: date when empty ⇄ `{n} OF 5`) — the
  sage header band is retired; **sage survives in the Today system as the done row** (`✓ {n} DONE
  TODAY`, `--hk-ink` mono, collapsed by default), the done ticks, the "✓ ON TODAY" card pill and
  the ritual walk. The **ghost invitation** is neutral: dashed `rgba(58,28,20,.22)` box + `.28`
  tick-boxes + `.07` bars on the card's own parchment — no fill, no family.
- **The review's afterlife card** (above Today, `(dismissed ∨ Tue–Sat) ∧ unreviewed`) is the
  neutral cardx family — paper/hairline/radius 16/shadow — with a 38px white roundel holding the
  ORIGINAL `review-cup.svg` in **ink via currentColor** (inlined `?raw`; never a tinted fill).
  The thin sage bar beneath the lanes is retired.
- **Lane heads: the play button** — 32px white circle, `rgba(58,28,20,.16)` hairline, ink
  triangle (currentColor), hover scale 1.06 — replaces the Focus pill in both views; the lane
  DOT is retired (the tinted band alone carries lane identity). Pagers ride the head's right edge.
- **The V grid token family** (`--tdb-gutter`/`--tdb-appnav 49`/`--tdb-sidebar 270`/`--tdb-today
  264`) + the VI column scroll contract: both flanking columns sticky at the gutter, viewport-
  capped, fixed heads/feet, one hairline-scrollbar middle each (`.tdb-tmid2`/`.tdb-fmid`).

## `.t-f12` — THE COMMAND DECK v2 (2026-07-20, the definitive To-do page; ref `todo-deck-v2.html` THE LAWS)

- **WIDTH v3 — the centred assembly:** rail 240 · 24 · sheet 812 (18px padding wrapping a 774
  viewport = exactly 3 × 250 cards + 2 × 12 gaps) · 24 · Today 256 = **1356px**, centred at every
  viewport (`--tdb-asm/rail/sheet/vp/cardw/today`). Bar backgrounds (strip paper, deck white)
  full-bleed; contents lock to `.tdb-asm`. Cards `flex:0 0 250`, never stretch; reels snap-page
  by 3; **no partials, no edge fades** — heading pagers + counts carry "there's more".
- **THE SHEET:** both views inside the white content panel (radius 16, hairline, 18/18/8); on it
  cards wear `#d8cfc4` + `0 2px 6px rgba(58,28,20,.07)`.
- **QUIET PILLS:** resting white/hairline/ink + 7px family dot (`--dot-p #e59b8f` ·
  `--dot-lat #cbb995` · `--dot-y #d9c87a` · `--dot-s #9db29a`); zero-count 40%; narrowed =
  included pink-band burgundy 700, excluded dim, burgundy `SHOWING x OF y · RESET ✕`; Esc clears
  search then filters; the 84×102 strip post-its SOLO the same state; filtered lane heads append
  `x OF y · FILTERED · SHOW ALL`. Pill copy: OFFERS (no star) · AGENT WAITING · MATERIALS ·
  WISH LISTS · STALE · SNOOZED · NOTES · lens TODAY'S LIST (no tick).
- **THE CARD CONTRACT:** band = identity + status only (tag; sage ✓ TODAY chip; card tags keep
  ★ OFFER); body = content only (batch keeps count headline, ink-on-#ece5d8 progress, display
  roundels — flat, hairline, no pile, no roundel buttons, no footer CTA, no NEVER); click
  anywhere opens (unit→journey, batch→Batch fix); hover (~150ms intent, 180ms ease) grows the
  verb row downward as an overlay: [✓ DONE | ⚡ FIX n →] · ＋/− TODAY · ☾ LATER ▾ {tomorrow /
  a week / don't-show-these — the per-type mutedTaskRules hide, restorable in Task settings;
  offers and notes carry no hide item}.
- **THE LATTE LAW:** housekeeping = `--lat-1 #f5efe6 → --lat-2 #efe7d9`, bd `#ddd0bc`, mark
  `#cbb995` (underline/dot), ink `#8a7048` — bands, lane underline, post-it, pill dot. **Coffee
  survives only in journey-sheet headers** (FocusFlow's cof family).
- **THE RENAME:** "Over to you" → **"Agent waiting"** everywhere (tags, pills, ledger, kickers,
  copy, tests; repo-wide grep-locked). The review banner is a RESIDENT of the identity strip
  (no windows, no dismissal; Open it › ⇄ View again on the completion sentinel).

## To-do containers — stone ⚠️ SUPERSEDED (see "sage (settled)" below)

*(The stone pair `#f5f3f0`/`#e6e2db` at 36px, and the Begin/review pair seated in the sheet's
bar, were one exploration step — `todo-fix39`. Both are superseded by the sage settlement.)*

## To-do containers — sage ⚠️ container structure SUPERSEDED by the workspace shell (below); the sage pastille COLOURS it settled still hold

(The sage 42px headers + the REVIEW & FILTER sidebar-seated pair were one exploration step —
todo-fix40. The workspace shell (todo-fix48) rebuilds the frame: the parchment sidebar, the
panel, the corner Today. The sage headers survive only on Today's card + the collapsed filter
overlay; the pastille card colours are untouched throughout.)

## To-do containers — sage (settled — pastille colours)

The colour question is **closed**. The soft pastille card system stands exactly as deployed —
pink urgency, latte housekeeping, butter notes, white tag pills — and is not revisited: **the
pastille bands are SIGNAL**, the containers around them are furniture, and furniture does not
compete. Ref: `design-refs/todo-settlement.html` (todo-fix40, normative; boards fix31–fix39,
stone included, are exploration history and are not refs).

- **THE SAGE TRIO:** every container header takes one fill `#d7ddd5 → #d5dbd3` over one bottom
  rule `#b9c9b4`, from `--container-head-bg` / `--container-head-rule` on `.tdb-wrap` — one
  source, asserted unique in the sheet. Three headers, one treatment: the left sidebar's band,
  the sheet's document bar, Today's header. Today wore this first; its siblings joined it.
- **THE 42px LAW:** one height token, `--container-head-h: 42px`, for all three, contents
  flex-centred — never a padding-derived height. Each header takes its own container's top
  radii (15/15/0/0 inside a 16px container). The view toggle sits on sage at 26px (track
  `rgba(255,255,255,.55)`, the shared rule) with its active chip — white plus the ink ring —
  unchanged.
- **HEADER INKS** join the family: mono labels `--container-head-mono #5a6e58`, Playfair lines
  and titles `--container-head-ink #3d4a3b`. Sage also keeps its glyph-scale life beside them
  (Today's row dots, completion ticks, StatusDot incoming) — unchanged.
- **THE REVIEW & FILTER SEAT:** the left sidebar's band is labelled REVIEW & FILTER, and Begin
  focused session (ink) + Last week in review (white) stack full-width at the top of its body
  at `--tdb-sbpair-h: 34px`, above a `#eee8dd` hairline, with the filter pills unchanged
  beneath. In a focused session they leave with the sidebar's own slide — one animation, never
  two.
- **THE HERO** is title + search only: the search 460 × 46 with a 32px glass, over a tokened
  `--tdb-search-clear: 40px` minimum band of clear ground. The sheet's bar holds just its
  Playfair line and the view toggle.

*(No blush set was ever adopted: `todo-blush-prompt.md` was superseded before it ran, and the
board carries no blush or greige tokens.)*

## To-do workspace shell (settled)

The redesign's FINAL structure (ref `design-refs/todo-workspace-shell.html` = todo-fix48,
normative; fix31–fix47 — the blush/stone/sage settlements included — are exploration history,
superseded). The soft pastille card system is **settled and untouched** — pink urgency, latte
housekeeping, butter notes, white tag pills — because **the pastille bands are SIGNAL**; the
frame around them is furniture and does not compete.

- **THE PARCHMENT CHROME PAIR:** the always-on navigation sidebar (`.tsh-nav`, ~212px) and the
  breadcrumb bar (`.tsh-bcbar`) share one fill `#f2ede7` (`--tsh-chrome`) and are joined by
  `#e4dbcd` borders (`--tsh-chrome-border`) so they read as one continuous shell. The sidebar
  is brand → WORKSPACE nav → a slotted FILTER section → Task settings + Help centre foot; the
  bar carries the QUERYING / To-do crumb, the search white pill, and the account block.
- **THE ACTIVE-STATE LAW (never burgundy) ⚠️ AMENDED by the polish below:** the white-card
  active variant is retired — active nav items and filter rows now take the NavDrawer's faint
  parchment fill only (`--rail-pill #f1e9df`, no border/shadow/outline). Never burgundy.
- **THE PANEL:** one thin warm-grey bordered container (`.tdb-mainc`, `#fff`, `--tdb-panel-bd
  #e2dbd0`, radius 14, 22px padding) wraps the whole working area — the items row, both card
  sections, and the Pro colophon.
- **THE ITEMS LINE:** the panel's top row — Playfair `{n} items` when unfiltered, `Showing {x}
  of {y} items` when a filter or search narrows — with the unchanged cards/ledger toggle right
  and a hairline beneath. No text tabs, no Sort button.
- **THE HERO PAIR:** the hero is plain on the page — title (~33px) + quiet-grey subtitle left,
  the ink Begin pill with the underlined "Last week in review" link beneath it right. The
  search is not a hero element; it lives in the bar.
- **TODAY'S CORNER FORM:** a floating white card fixed bottom-right (`.tdb-tdpop`, 250px,
  `#ddd2c2` hairline, radius 14, deep shadow), minimising to a pill (state persisted), absent
  when empty, reusing the one renderTodayPanel (sage completion circles, Work the list).
- **Below --tsh-collapse (1100px)** the sidebar folds to an icon rail (tooltips; the FILTER
  section → a ⚲ icon opening the existing overlay). A focused session slides the sidebar off
  left and fades the bar search via `.tsh-clearing`, the breadcrumb bar staying (the v9
  app-bar exemption).

## To-do workspace shell — polish amendment (settled)

Five fixes over the deployed shell (an amendment; the shell section above stands, with these
deltas):

- **THE CENTRED COLUMN:** the hero row and the panel share ONE centred max-width column
  (`.tdb-col`, `--tdb-col-max 1360px`, `margin-inline:auto`) with equal side gutters
  (`--tdb-col-gutter`) that grow with the viewport. The title sits flush with the panel's left
  edge, the CTA/review pair flush with its right. A `--tdb-chrome-gap` (≥44px) of air sits under
  the breadcrumb bar.
- **THE SUBTITLE:** Playfair 17px regular in warm grey `#7a6a5e`, ~6px under the title. Copy:
  "Urgent tasks, housekeeping, notes. Here's everything on your to-do list." ("and notes" →
  "notes").
- **STICKER CARDS:** the family task cards (both sections + batch) wear a 1.5px ink border
  (`--tdb-sticker-bd #3a1c14`) and a hard offset block behind (`--tdb-sticker-off 5px`, no blur)
  in the family colour — pink `#f2cec1` / latte `#eee5d4` / butter `#eedfae`. Hover lifts one
  step (`6px`, `translate(-1px,-1px)`). The pastille bands + white pills are unchanged; the grid
  gap (`--tdb-grid-gap 14px`) ≥ the offset so blocks never touch. The ledger rows, the Today
  pop-up and the session page are NOT stickers.
- **EQUAL GUTTERS + FLUID TRACKS (alignment fix, todo-fix50):** the centred column's side
  gutters are equal — the wrap is the sole scroller with `scrollbar-gutter: stable both-edges`
  (tsh-body clips), so no scrollbar asymmetry shifts it. The card grid is FLUID —
  `grid-template-columns: repeat(N, 1fr)` — so cards grow to fill the panel's inner width (no
  dead space right of the last column); the tier changes the COUNT only (3-up standard, 4-up at
  ≥1700). The old "today-off → 4-up everywhere" rule is retired.
- **THE WARM ACTIVE FILL (alignment fix):** the selected fill is `#e6ddcf` — the sidebar's own
  parchment (`#f2ede7`) one step deeper, zero green — hover `#ece5d9`. The shell owns these two
  values directly (it no longer reads the app's sage `--rail-pill #e9ece4`); nav items and
  filter rows share them, still with no border/outline/shadow.
- **THE DRAWER-GRAMMAR SIDEBAR:** the sidebar mirrors the app NavDrawer via the shared `--rail-*`
  tokens — mono `.18em` section labels hairline-ruled beneath, icon+label rows in the drawer's
  height/radius/type (lucide icons), muted counts. **The active state — nav items AND filter
  rows alike — is the drawer's faint parchment fill ONLY** (`--rail-pill #f1e9df`): no border,
  no shadow, no outline, never burgundy. The white-card active variant is retired, and so is the
  ink outline on the selected filter.

