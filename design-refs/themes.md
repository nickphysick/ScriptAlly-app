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
