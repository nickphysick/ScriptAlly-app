# Query actions v11 — build spec from the mock

Source: `design-refs/query-actions-v11.html` (168,087 bytes, 1,287 lines; NOT modified). Everything below is read off that file. Line numbers (`L123`) refer to the mock with the one base64 image string replaced by `<STRIPPED>` — no other line changes, so they match the original.

**How to read this.** Section 1 is the CSS, section 2 the DOM, section 3 the logic and every copy string (functions quoted verbatim), 4 the illustration, 5 fonts, 6 surprises. Where the mock declares a selector more than once, the **resolved** value is given in the §1.0 table — build from the resolved column, not from the first block you find.

**The mock's shipped configuration** (L621–624): `body[data-hdr=ink]` (anthracite header), `body[data-lay=jour]` (journey / stepper layout), `body[data-ws=A]` (nudge "where it stands" = timeline). The other header formats (`band`, `hero`, `compact`, `tile`), layouts (`sec`, `acc`) and nudge variants (`B`, `C`, `D`) are **alternatives left in the file and unreachable from its UI** — the review pill only exposes Speed and Motion. They are documented in the raw CSS below for completeness but are NOT part of the build.

Today in the mock is fixed: `TODAY = new Date(2026,8,27)` (Sun 27 Sep 2026). Book: `Murphy's Day Out`, 50,000 words, 24 chapters, 250 words/page → `PAGES = 200`, `WPC = 2083` (words per chapter, rounded).

---

## 0. Tokens

```css
:root{--ink:#1c130f;--ink70:rgba(28,19,15,.7);--ink45:rgba(28,19,15,.45);--ink25:rgba(28,19,15,.25);--hair:rgba(28,19,15,.1);--btn:#2a3a52;--frame:#7c3a2a;--page:#f5f1eb;--side:#e7e3dc;--rust:#8a4a3c;
 --sand:#f7efe3;--rose:#f5e6df;--sage:#e0e5dd;--offer:#d7e0e8;--stone:#e4e1db;--blush:#e9c9b8;
 --machine:'Special Elite',monospace;--serif:'Source Serif 4',Georgia,serif;--mono:'JetBrains Mono',monospace}
```

Motion tokens (L324–325; `--k` is the Slow-mo multiplier, 1 normally, 3 in slow-mo):

```css
:root{--k:1;--t1:calc(120ms*var(--k));--t2:calc(200ms*var(--k));--t3:calc(280ms*var(--k));--t4:calc(360ms*var(--k));--out:cubic-bezier(.2,.8,.2,1);--in:cubic-bezier(.4,0,1,1)}
body.slow{--k:3}
```

| token | value | used for |
|---|---|---|
| `--t1` | 120ms | chip colour transitions, disc delay, reduced-motion transition |
| `--t2` | 200ms | scrim fade, step slide, tick, pop, toast, discard bar, quill dip delay |
| `--t3` | 280ms | drawer open, card, stepper fill, disc, row leave, `.changed` status tick |
| `--t4` | 360ms | quill dip, row arrive; plan line draws at `--t4 × 1.3` = 468ms |
| `--out` | `cubic-bezier(.2,.8,.2,1)` | every entrance |
| `--in` | `cubic-bezier(.4,0,1,1)` | drawer close, row leave |

Colour roles in use: `--btn #2a3a52` (anthracite — primary buttons, selected chips, the ink header), `--rust #8a4a3c` (warnings, blocks, today line, weekend dots), `--sand` (header ground in other formats; "check" gate; Queried dot; row wash), `--rose` (warn notes, check step disc, "requested" statuses), `--sage` (ok notes, done step disc, "sent" statuses, ✓ Told), `--blush #e9c9b8` (quill disc; nudge dots; to-do consequences), `--stone` (closed), `--offer` (Offer/Signed), `--page #f5f1eb` (info notes, plan panels). Hover washes `#f7f3ee` / `#f3eee7` / `#faf7f2`; pressed primary `#233145`; field-ish grey `#f3eee7`.

---

## 1. CSS

### 1.0 Duplicated selectors — the resolved values (LAST base rule wins; `!important` noted)

| selector | declared at | resolved (what renders in the shipped config) |
|---|---|---|
| `.scrim` transition | L39 `.25s`, L326 | `transition: opacity var(--t2) ease` |
| `.drawer` transition | L76, L327, L328 (closing) | open: `transform var(--t3) var(--out)`; while `body:not(.s-drawer)`: `transform calc(var(--t3)*.85) var(--in)` (238ms) |
| `.card` transition | L42, L329 | `transform var(--t3) var(--out), opacity var(--t2)` |
| `.toast` | L72, L380 | merged: position/colour/font from L72; `display:flex; align-items:center; gap:14px; padding:10px 10px 10px 18px; border-radius:24px; pointer-events:auto; transition: opacity var(--t2), transform var(--t2) var(--out); z-index:90; max-width:520px` from L380 (L72's `z-index:46`, `.3s`, `pointer-events:none`, `padding 12px 18px`, `radius 20px` are overridden). NB: the toast is `pointer-events:auto` even while hidden (opacity 0). |
| `.dbody` | L93, L209, L235 (jour) | `flex:1; overflow:auto; background:#fff; padding:0 24px 30px` (jour wins over L209's `#f7f4ef`) |
| `.sec` | L94, L211 | `padding:18px 0 4px; position:relative`; `.sec+.sec` L95 border is reset by L220 in jour (`border-top:0; margin-top:0`) |
| `.sec .sech` | L96, L210 | `display:none` — the `<p class="sech">` headings in the render functions NEVER show; the numbered/plain `.shd` header injected by `layout()` replaces them |
| `.shd b` | L215, L238 | jour: `font-size:22px` (Special Elite). `.shd .num` and `.shd .sum` are `display:none` in jour |
| `.stl` | L248, L342 | merged: `flex:1; height:1.5px; background:var(--ink25); margin-top:12px; min-width:4px; position:relative; overflow:hidden` |
| `.stp.cur i` | L244, L301 `!important` | `background:var(--btn)!important; color:#fff!important; box-shadow:none!important` |
| `.dtop img` | L81, L259 `margin:0!important` | margin 0 (L81's negative margins are dead); `height:104px` from L81 is overridden per header format by `.qwrap img` |
| `.dhead .dx` | L86, L435 | `top:8px` (rest from L86) |
| `.dfoot` | L202, L314 | merged + `position:relative` |
| `.save` | L203, L297 | merged: `flex:1; height:48px; border-radius:24px; … ; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; padding:0 18px` |
| `.ev` | L56, L498 | merged + `position:relative` |
| `.chip` | L101, L355 | merged + `transition: background var(--t1), color var(--t1), box-shadow var(--t1)` |
| `.card footer` | L64, L509 | merged + `align-items:center; flex-wrap:wrap` |
| `body[data-hdr=ink] .dhead` | L279, L296, L427, L433 | **`background:var(--btn); border-bottom:0; padding:20px 24px 14px`** (L427 sets `14px 24px 14px`, L433 then `padding-top:20px`) |
| `body[data-hdr=ink] .qwrap` | L283, L333, L431 | `width:56px; height:56px; border-radius:50%; background:var(--blush); margin:0 40px 0 0; overflow:visible;` + `.qwrap` base (L258) `display:flex; align-items:flex-end; justify-content:center; flex:none; position:relative` + `animation: disc var(--t3) var(--out) both; animation-delay: var(--t1)` |
| `body[data-hdr=ink] .qwrap img` | L284, L432 | `height:64px; position:absolute; bottom:3px; left:50%; transform:translateX(-46%)`; plus `.dip` animation (L331) whose keyframes carry the same `translateX(-46%)` |
| `body[data-hdr=ink] .dhead h2` | L281, L430 (and L85 base) | `margin:4px 0 0; font-family:var(--machine); font-weight:400; font-size:22px; line-height:1.1; color:#fff` |
| `body[data-hdr=ink] .dtop` | L79, L428 | `display:flex; align-items:center; gap:12px; min-height:0` |
| `body[data-hdr=ink] .dtop .tt` | L80, L429 | `flex:1; padding:0` |
| `body[data-hdr=ink] .who` | L87, L285, L434 | `display:flex; align-items:center; gap:10px; margin-top:12px; background:#fff; border-radius:12px; padding:8px 12px; box-shadow:none` (+ `position:relative; z-index:1` from L82) |
| `.rad em` / `.rad em.go` | L451, L450 | `.rad em.go` (0-2-1) beats `.rad em` (0-1-1) on specificity despite coming first → `background:#f3eee7; color:var(--ink70)` |

### 1.1 Scrim, card (the query card behind the drawer), dock chip, rows

```css
.qrow{position:relative;display:grid;grid-template-columns:44px minmax(0,1.3fr) minmax(0,1fr) auto;align-items:center;gap:14px;height:76px;margin-top:10px;padding:0 20px;border-radius:14px;background:#fff;box-shadow:0 1px 2px rgba(28,19,15,.05),0 10px 24px -18px rgba(28,19,15,.22);cursor:pointer}
.av{width:34px;height:34px;border-radius:50%;background:var(--btn);color:#f5f1eb;font:700 9px var(--mono);display:flex;align-items:center;justify-content:center;flex:none}
.qn b{display:block;font-weight:600;font-size:16.5px}.qn small{font:400 8.5px var(--mono);letter-spacing:.12em;color:var(--ink45)}
.st{display:flex;align-items:center;gap:8px;font-family:var(--machine);font-size:14px}
.st i{width:10px;height:10px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(28,19,15,.18)}
.due{font:700 8.5px var(--mono);letter-spacing:.1em;text-align:right}
.due.over{color:var(--rust)}
.qacts{position:absolute;right:14px;top:50%;transform:translateY(-50%);display:none;gap:6px;background:#fff;padding-left:10px}
.qrow:hover .qacts{display:flex}.qrow:hover .due{visibility:hidden}
.qa{border:0;background:#fff;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.22);border-radius:9px;font:400 8.5px var(--mono);letter-spacing:.1em;padding:8px 10px;cursor:pointer}
.qa:hover{background:#f7f3ee}
.scrim{position:fixed;inset:0;background:rgba(28,19,15,.45);opacity:0;pointer-events:none;transition:opacity .25s;z-index:40}
body.s-dim .scrim{opacity:1;pointer-events:auto}
/* card */
.card{position:fixed;left:50%;top:50%;width:580px;max-height:min(640px,86vh);transform:translate(-50%,-50%);background:#fff;border-radius:16px;box-shadow:0 30px 70px -20px rgba(28,19,15,.55);z-index:50;opacity:0;pointer-events:none;transition:transform .28s cubic-bezier(.2,.8,.2,1),opacity .24s;display:flex;flex-direction:column;overflow:hidden}
body.s-card .card{opacity:1;pointer-events:auto}
body.s-docked .card{transform:translate(-50%,-50%) translate(calc(-50vw + 320px),calc(50vh - 90px)) scale(.08);opacity:0;pointer-events:none}
.card header{display:flex;align-items:center;gap:14px;padding:20px 22px 16px;border-bottom:1px solid var(--hair)}
.card header .av{width:42px;height:42px;font-size:11px}
.card header b{display:block;font-family:var(--machine);font-weight:400;font-size:22px;line-height:1.1}
.card header small{font:400 8.5px var(--mono);letter-spacing:.12em;color:var(--ink45)}
.card .x{margin-left:auto;border:0;background:none;font-size:20px;color:var(--ink45);cursor:pointer;padding:6px}
.chipst{display:inline-flex;align-items:center;gap:7px;font-family:var(--machine);font-size:13px;padding:5px 12px;border-radius:12px;margin-left:6px;white-space:nowrap}
.chipst i{width:9px;height:9px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 1px rgba(28,19,15,.18)}
.tabs{display:flex;gap:2px;padding:0 22px;border-bottom:1px solid var(--hair)}
.tabs span{font:400 9px var(--mono);letter-spacing:.14em;padding:12px 12px;color:var(--ink45)}
.tabs span.on{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}
.tl{flex:1;overflow:auto;padding:16px 22px}
.ev{display:flex;gap:12px;padding:11px 6px;border-bottom:1px solid var(--hair);align-items:baseline;border-radius:8px}
.ev i{width:9px;height:9px;border-radius:50%;flex:none;box-shadow:inset 0 0 0 1px rgba(28,19,15,.18);transform:translateY(-1px)}
.ev b{font-family:var(--machine);font-weight:400;font-size:14.5px}
.ev em{font-style:normal;font-size:13px;color:var(--ink70);margin-left:6px}
.ev small{margin-left:auto;font:400 8.5px var(--mono);letter-spacing:.1em;color:var(--ink45);white-space:nowrap}
.ev.plan b{color:var(--ink70)}.ev.plan i{background:#fff!important;box-shadow:inset 0 0 0 1.4px var(--ink45)}
.ev.new{animation:flash 1.6s ease-out}
@keyframes flash{0%{background:var(--sage)}100%{background:transparent}}
.card footer{display:flex;gap:8px;padding:16px 22px;border-top:1px solid var(--hair)}
.cb{height:42px;padding:0 16px;border-radius:21px;font-family:var(--machine);font-size:14px;border:0;cursor:pointer;background:#fff;box-shadow:inset 0 0 0 1.3px rgba(28,19,15,.25)}
.cb.pri{background:var(--btn);color:#fff;box-shadow:none}
.cb:hover{background:#f7f3ee}.cb.pri:hover{background:#233145}
.dock{position:fixed;left:20px;bottom:18px;display:flex;align-items:center;gap:10px;background:var(--ink);color:#f5f1eb;border-radius:22px;padding:8px 16px 8px 8px;font-family:var(--machine);font-size:14px;box-shadow:0 12px 30px -10px rgba(28,19,15,.6);z-index:46;opacity:0;transform:translateY(8px);pointer-events:none;transition:.25s .12s}
body.s-docked .dock{opacity:1;transform:none}
.dock .av{width:28px;height:28px;font-size:8px;background:#3d4f6b}
.dock i{width:8px;height:8px;border-radius:50%}
.toast{position:fixed;left:20px;bottom:18px;background:var(--ink);color:#f5f1eb;border-radius:20px;padding:12px 18px;font-family:var(--machine);font-size:14px;z-index:46;opacity:0;transform:translateY(8px);transition:.3s;pointer-events:none}
.toast.on{opacity:1;transform:none}
```

### 1.2 Drawer shell, header, agent card ("who"), body, sections, fields

```css
/* ===== drawer ===== */
.drawer{position:fixed;top:0;right:0;bottom:0;width:500px;max-width:100vw;background:#fff;z-index:60;transform:translateX(102%);transition:transform .3s cubic-bezier(.2,.8,.2,1);box-shadow:-24px 0 60px -30px rgba(28,19,15,.5);display:flex;flex-direction:column}
body.s-drawer .drawer{transform:none}
.dhead{padding:20px 24px 16px;border-bottom:1px solid var(--hair);background:var(--sand);position:relative}
.dtop{display:flex;align-items:flex-end;gap:12px;min-height:92px}
.dtop .tt{flex:1;padding-bottom:12px}
.dtop img{height:104px;width:auto;margin:-8px 30px -16px 0;position:relative;z-index:0;pointer-events:none}
.dhead .who{position:relative;z-index:1}
.dhead.bare .dtop img{margin-bottom:-17px}
.dhead .mode{font:400 9px var(--mono);letter-spacing:.16em;color:var(--ink45)}
.dhead h2{margin:6px 0 0;font-family:var(--machine);font-weight:400;font-size:26px;line-height:1.1}
.dhead .dx{position:absolute;right:12px;top:10px;z-index:2;border:0;background:none;font-size:20px;color:var(--ink45);cursor:pointer;padding:6px}
.who{display:flex;align-items:center;gap:10px;margin-top:14px;background:#fff;border-radius:12px;padding:10px 12px;box-shadow:inset 0 0 0 1px var(--hair)}
.who .av{width:32px;height:32px;font-size:8px}
.who b{display:block;font-weight:600;font-size:15px}.who small{display:block;font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45);margin-top:2px}
.who .tags{margin-left:auto;display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.tag{font:400 7.5px var(--mono);letter-spacing:.12em;padding:3px 7px;border-radius:6px;background:#f3eee7;color:var(--ink70);white-space:nowrap}
.tag.dark{background:var(--btn);color:#fff}
.dbody{flex:1;overflow:auto;padding:6px 24px 30px}
.sec{padding:18px 0 4px}
.sec+.sec{border-top:1px solid var(--hair);margin-top:14px}
.sech{font-family:var(--machine);font-size:17px;margin:0 0 2px}
.secs{font-size:13px;color:var(--ink70);margin:0 0 6px}
.fl{font:400 8.5px var(--mono);letter-spacing:.14em;color:var(--ink45);margin:16px 0 8px;display:flex;align-items:center;gap:8px}
.fl .r{margin-left:auto;letter-spacing:.08em;text-transform:none;font-size:9px}
.chips{display:flex;flex-wrap:wrap;gap:7px}
.chip{font-family:var(--machine);font-size:13.5px;padding:8px 13px;border-radius:18px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.22);cursor:pointer;background:#fff;border:0;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.chip small{font:400 8px var(--mono);letter-spacing:.08em;opacity:.65}
.chip:hover{background:#f7f3ee}
.chip.on{background:var(--btn);color:#fff;box-shadow:none}.chip.on:hover{background:#233145}
.chip.dis{opacity:.4;pointer-events:none}
.chip.ghost{box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.22);border:0;outline:1px dashed rgba(28,19,15,.3);outline-offset:-1px}
.chip .ic{display:flex}
/* date field */
.dfield{position:relative}
.dres{display:flex;align-items:baseline;gap:10px;margin-top:10px;padding:8px 2px 6px;border-bottom:1.5px dashed rgba(28,19,15,.25)}
.dres b{font-family:var(--machine);font-weight:400;font-size:17px}
.dres span{font:400 8.5px var(--mono);letter-spacing:.1em;color:var(--ink45)}
.dres .shift{margin-left:auto;color:var(--rust)}
.cal{position:absolute;left:0;top:calc(100% + 8px);width:300px;background:#fff;border-radius:14px;box-shadow:0 22px 50px -18px rgba(28,19,15,.5),0 0 0 1px var(--hair);padding:14px;z-index:20}
.cal .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
.cal .mh b{font-family:var(--machine);font-weight:400;font-size:16px}
.cal .mh button{border:0;background:none;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;color:var(--ink70)}
.cal .mh button:hover{background:#f3eee7}
.cal .dow,.cal .grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center}
.cal .dow span{font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45);padding:4px 0}
.cal .grid span{height:34px;display:flex;align-items:center;justify-content:center;border-radius:50%;font-size:14px;cursor:pointer;position:relative}
.cal .grid span:hover{background:#f3eee7}
.cal .grid span.mut{color:var(--ink25)}
.cal .grid span.no{color:var(--ink25);pointer-events:none;text-decoration:line-through;text-decoration-color:rgba(28,19,15,.15)}
.cal .grid span.td{box-shadow:inset 0 0 0 1.5px var(--ink45)}
.cal .grid span.sel{background:var(--btn);color:#fff;box-shadow:none}
.cal .grid span.wk::after{content:"";position:absolute;bottom:4px;width:3px;height:3px;border-radius:50%;background:var(--rust)}
.cal .cf{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--hair);font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45)}
.cal .cf button{border:0;background:none;font-family:var(--machine);font-size:13px;cursor:pointer;color:var(--ink);padding:4px 6px;border-radius:6px}
.cal .cf button:hover{background:#f3eee7}
/* toggles */
.tgl{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:12px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.14);cursor:pointer;background:#fff;margin-top:8px}
.tgl .bx{width:20px;height:20px;border-radius:6px;box-shadow:inset 0 0 0 1.4px var(--ink45);display:flex;align-items:center;justify-content:center;flex:none;font-size:13px;color:#fff}
.tgl.on .bx{background:var(--btn);box-shadow:none}
.tgl b{font-family:var(--machine);font-weight:400;font-size:15px}
.tgl small{margin-left:auto;font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45)}
/* sample */
.samp{margin-top:8px;border-radius:14px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.14);padding:14px}
.samp.off{padding:11px 14px}
.srow{display:flex;align-items:center;gap:12px}
.srow b{font-family:var(--machine);font-weight:400;font-size:15px}
.seg{display:inline-flex;background:#f3eee7;border-radius:11px;padding:3px;gap:2px}
.seg span{font-family:var(--machine);font-size:13px;padding:6px 11px;border-radius:9px;cursor:pointer;color:var(--ink70);white-space:nowrap}
.seg span.on{background:#fff;color:var(--ink);box-shadow:0 1px 2px rgba(28,19,15,.12)}
.seg.wide{display:flex}.seg.wide span{flex:1;text-align:center}
.amt{display:flex;align-items:center;gap:12px;margin-top:14px}
.step{display:inline-flex;align-items:center;background:#fff;border-radius:12px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.22)}
.step button{width:38px;height:40px;border:0;background:none;cursor:pointer;font-size:18px;color:var(--ink70)}
.step button:hover{color:var(--ink)}
.step b{min-width:74px;text-align:center;font-family:var(--machine);font-weight:400;font-size:20px}
.step.sm b{min-width:64px;font-size:17px}.step.sm button{width:32px;height:34px}
.unitl{font-family:var(--machine);font-size:15px;color:var(--ink70)}
.presets{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
.presets .chip{padding:5px 10px;font-size:12.5px}
.from{margin-top:14px}
.sectline{display:flex;align-items:center;gap:10px;white-space:nowrap;margin-top:10px;font-family:var(--machine);font-size:14.5px;color:var(--ink70)}
.sline{margin-top:12px;padding-top:11px;border-top:1px dashed rgba(28,19,15,.18);display:flex;align-items:baseline;gap:10px}
.sline b{font-family:var(--machine);font-weight:400;font-size:15px}
.sline span{margin-left:auto;font:400 8.5px var(--mono);letter-spacing:.08em;color:var(--ink45);white-space:nowrap}
/* notes */
.note{margin-top:12px;border-radius:12px;padding:11px 14px;font-size:13.5px;line-height:1.45;display:flex;gap:10px;align-items:flex-start}
.note .ni{font:700 8px var(--mono);letter-spacing:.1em;padding:3px 6px;border-radius:5px;flex:none;margin-top:2px}
.note.ok{background:var(--sage)}.note.ok .ni{background:#fff;color:#4f6149}
.note.warn{background:var(--rose)}.note.warn .ni{background:#fff;color:var(--rust)}
.note.info{background:var(--page)}.note.info .ni{background:#fff;color:var(--ink70)}
.note b{font-family:var(--machine);font-weight:400}
.note a{color:var(--ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-family:var(--machine);font-size:13px;white-space:nowrap}
.fta{width:100%;min-height:72px;border:1.5px dashed rgba(28,19,15,.22);border-radius:12px;background:none;font-family:var(--serif);font-size:15px;padding:10px 12px;color:var(--ink);outline:none;resize:vertical}
.fta:focus{border-color:rgba(28,19,15,.45)}
/* agent picker */
.apick{position:relative}
.fin{width:100%;border:0;border-bottom:1.5px dashed rgba(28,19,15,.25);background:none;font-family:var(--machine);font-size:18px;padding:8px 2px;color:var(--ink);outline:none}
.fin:focus{border-bottom-color:rgba(28,19,15,.5)}
.sugg{position:absolute;left:0;right:0;top:calc(100% + 6px);background:#fff;border-radius:14px;box-shadow:0 22px 50px -18px rgba(28,19,15,.5),0 0 0 1px var(--hair);padding:6px;z-index:20}
.sugg .it{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer}
.sugg .it:hover,.sugg .it.hi{background:#f7f3ee}
.sugg .it b{display:block;font-weight:600;font-size:14.5px}.sugg .it small{font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45)}
.sugg .it .tag{margin-left:auto}
.sugg .new{font-family:var(--machine);font-size:14px;border-top:1px solid var(--hair);margin-top:4px;padding:10px}
/* timeline preview */
.plan{margin-top:16px;border-radius:14px;background:var(--page);padding:16px 18px 14px}
.plan h5{margin:0 0 12px;font:400 8.5px var(--mono);letter-spacing:.14em;color:var(--ink45)}
.track{position:relative;height:104px;margin:0 8px}
.track .ln{position:absolute;left:0;right:0;top:50px;height:2px;background:rgba(28,19,15,.14);border-radius:2px}
.track .pt{position:absolute;top:44px;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#fff;box-shadow:inset 0 0 0 2px var(--ink)}
.track .pt.done{background:var(--ink)}
.track .pt.fut{box-shadow:inset 0 0 0 1.6px var(--ink45)}
.track .pt.nudge{background:var(--blush);box-shadow:inset 0 0 0 1.6px var(--rust)}
.track .pt.close{background:var(--stone);box-shadow:inset 0 0 0 1.6px var(--ink45)}
.track .lab{position:absolute;white-space:nowrap;text-align:center;line-height:1.25}
.track .lab.hi{top:4px}.track .lab.lo{top:66px}.track .lab.lo2{top:96px}.track.deep{height:132px}
.track .lab b{display:block;font-family:var(--machine);font-weight:400;font-size:12.5px}
.track .lab span{display:block;font:400 8px var(--mono);letter-spacing:.08em;color:var(--ink45)}
.track .tdy{position:absolute;top:40px;width:0;height:22px;border-left:1.5px dashed var(--rust)}
.plan h5 .tk{float:right;color:var(--rust)}
/* consequences */
.saves{margin-top:20px;border-radius:14px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.14);padding:14px 16px}
.saves h5{margin:0 0 8px;font:400 8.5px var(--mono);letter-spacing:.14em;color:var(--ink45)}
.saves li{list-style:none;display:flex;gap:10px;padding:5px 0;font-size:14px;line-height:1.4}
.saves ul{margin:0;padding:0}
.saves li i{width:8px;height:8px;border-radius:50%;flex:none;margin-top:6px;box-shadow:inset 0 0 0 1px rgba(28,19,15,.2)}
.dfoot{display:flex;gap:10px;align-items:center;padding:16px 24px;border-top:1px solid var(--hair)}
.save{flex:1;height:48px;border-radius:24px;background:var(--btn);color:#fff;font-family:var(--machine);font-size:16px;border:0;cursor:pointer}
.save:hover{background:#233145}
.save:disabled{opacity:.35;cursor:default}
.cancel{border:0;background:none;font-family:var(--machine);font-size:14px;color:var(--ink70);cursor:pointer;padding:10px 14px}
.hidden{display:none!important}
```

### 1.3 Section/layout variants, stepper, recap (review), header formats

Only `body[data-lay=jour]` and `body[data-hdr=ink]` are live. The rest is kept verbatim so nothing is lost.

```css
/* ===== v4: section layouts ===== */
.dbody{background:#f7f4ef}
.sec .sech{display:none}
.sec{position:relative}
.shd{display:flex;align-items:center;gap:10px;min-width:0}
.shd .num{width:24px;height:24px;border-radius:50%;background:var(--btn);color:#fff;font:700 9.5px var(--mono);display:flex;align-items:center;justify-content:center;flex:none}
.shd .num.done{background:var(--sage);color:#4f6149}
.shd b{font-family:var(--machine);font-weight:400;font-size:18px;white-space:nowrap}
.shd .sum{margin-left:auto;font:400 8.5px var(--mono);letter-spacing:.08em;color:var(--ink45);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;text-transform:uppercase}
.shd .ed{display:none;font:700 8px var(--mono);letter-spacing:.12em;color:var(--ink70);flex:none}
/* sections: each a card with a clear numbered header */
body[data-lay=sec] .sec,body[data-lay=acc] .sec{background:#fff;border-radius:16px;box-shadow:0 1px 2px rgba(28,19,15,.05),0 0 0 1px var(--hair);padding:16px 18px 18px;margin:0 0 12px}
body[data-lay=sec] .sec+.sec,body[data-lay=acc] .sec+.sec,body[data-lay=jour] .sec+.sec{border-top:0;margin-top:0}
body[data-lay=sec] .shd{padding-bottom:12px;margin-bottom:2px;border-bottom:1px solid var(--hair)}
body[data-lay=sec] .shd .sum{display:none}
body[data-lay=sec] .dbody,body[data-lay=acc] .dbody{padding:16px 18px 30px}
/* accordion */
body[data-lay=acc] .sec.shut{padding:14px 18px;cursor:pointer}
body[data-lay=acc] .sec.shut > :not(.shd){display:none}
body[data-lay=acc] .sec.shut .ed{display:block}
body[data-lay=acc] .sec.shut:hover{box-shadow:0 1px 2px rgba(28,19,15,.05),0 0 0 1px rgba(28,19,15,.25)}
body[data-lay=acc] .sec:not(.shut){box-shadow:0 0 0 1.5px var(--btn),0 12px 28px -18px rgba(28,19,15,.35)}
body[data-lay=acc] .sec:not(.shut) .shd{padding-bottom:12px;border-bottom:1px solid var(--hair)}
body[data-lay=acc] .sec:not(.shut) .shd .sum{display:none}
.cont{display:block;width:100%;margin-top:18px;height:42px;border-radius:21px;border:0;background:#f3eee7;font-family:var(--machine);font-size:14px;cursor:pointer}
.cont:hover{background:#ebe4da}
/* journey */
body[data-lay=jour] .dbody{background:#fff;padding:0 24px 30px}
body[data-lay=jour] .shd{margin:18px 0 4px}
body[data-lay=jour] .shd .num{display:none}
body[data-lay=jour] .shd b{font-size:22px}
body[data-lay=jour] .shd .sum{display:none}
.stepper{position:sticky;top:0;z-index:5;background:#fff;display:flex;align-items:flex-start;padding:16px 0 12px;border-bottom:1px solid var(--hair);margin:0 -24px;padding-left:18px;padding-right:18px}
.stp{display:flex;flex-direction:column;align-items:center;gap:6px;flex:none;width:64px;text-align:center;cursor:default}
.stp.go{cursor:pointer}
.stp i{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.4px var(--ink25);font:700 9.5px var(--mono);font-style:normal;display:flex;align-items:center;justify-content:center;color:var(--ink45);background:#fff}
.stp.cur i{background:var(--btn);color:#fff;box-shadow:none}
.stp.done i{background:var(--sage);color:#4f6149;box-shadow:none}
.stp em{font-style:normal;font:400 7.5px var(--mono);letter-spacing:.06em;color:var(--ink45);line-height:1.3;text-transform:uppercase}
.stp.cur em{color:var(--ink)}
.stl{flex:1;height:1.5px;background:var(--ink25);margin-top:12px;min-width:4px}
.recap{margin-top:20px}
.recap h5{margin:0 0 6px;font:400 8.5px var(--mono);letter-spacing:.14em;color:var(--ink45)}
.recap .rr{display:grid;grid-template-columns:150px 1fr auto;gap:12px;align-items:baseline;padding:11px 2px;border-bottom:1px solid var(--hair);cursor:pointer}
.recap .rr:hover{background:#faf7f2}
.recap .rr b{font-family:var(--machine);font-weight:400;font-size:14.5px}
.recap .rr span{font-size:14px}
.recap .rr u{text-decoration:none;font:700 8px var(--mono);letter-spacing:.12em;color:var(--ink45)}
.back{border:0;background:none;font-family:var(--machine);font-size:14px;color:var(--ink);cursor:pointer;padding:10px 6px}
/* ===== v4: header formats ===== */
.qwrap{display:flex;align-items:flex-end;justify-content:center;flex:none;position:relative}
.dtop img{margin:0!important}
/* band: sand, quill on the right standing on the edge */
body[data-hdr=band] .qwrap{height:112px;margin:-12px 34px -16px 0}
body[data-hdr=band] .qwrap img{height:100%}
body[data-hdr=band] .dhead.bare .qwrap{margin-bottom:-17px}
/* hero: taller, bigger quill bleeding off the top */
body[data-hdr=hero] .dhead{padding-top:30px}
body[data-hdr=hero] .dtop{min-height:132px}
body[data-hdr=hero] h2{font-size:32px;white-space:nowrap}
body[data-hdr=hero] .qwrap{height:172px;margin:-40px 26px -18px 0}
body[data-hdr=hero] .qwrap img{height:100%}
body[data-hdr=hero] .dhead.bare .qwrap{margin-bottom:-17px}
/* compact: white header, small quill before the title */
body[data-hdr=compact] .dhead{background:#fff;padding:16px 24px 14px}
body[data-hdr=compact] .dtop{min-height:0;align-items:center;gap:14px}
body[data-hdr=compact] .qwrap{order:-1;height:62px;width:50px}
body[data-hdr=compact] .qwrap img{height:100%}
body[data-hdr=compact] .dtop .tt{padding:0}
body[data-hdr=compact] .who{margin-top:12px;background:#faf7f2}
/* ink: anthracite band, quill in a blush disc */
body[data-hdr=ink] .dhead{background:var(--btn);border-bottom:0}
body[data-hdr=ink] .dhead .mode{color:rgba(255,255,255,.6)}
body[data-hdr=ink] .dhead h2{color:#fff}
body[data-hdr=ink] .dhead .dx{color:rgba(255,255,255,.7)}
body[data-hdr=ink] .qwrap{width:92px;height:92px;border-radius:50%;background:var(--blush);margin:0 38px 4px 0;overflow:visible}
body[data-hdr=ink] .qwrap img{height:118px;position:absolute;bottom:4px;left:50%;transform:translateX(-46%)}
body[data-hdr=ink] .who{box-shadow:none}
/* tile: quill in a sand tile on the left, title beside */
body[data-hdr=tile] .dhead{background:#fff;padding:20px 24px 16px}
body[data-hdr=tile] .dtop{min-height:0;align-items:center;gap:16px}
body[data-hdr=tile] .qwrap{order:-1;width:78px;height:78px;border-radius:18px;background:var(--sand);box-shadow:inset 0 0 0 1px rgba(28,19,15,.08);overflow:hidden;align-items:flex-end}
body[data-hdr=tile] .qwrap img{height:88px;margin-bottom:-6px!important}
body[data-hdr=tile] .dtop .tt{padding:0}
body[data-hdr=tile] h2{font-size:28px}
body[data-hdr=tile] .who{background:#faf7f2}
```

### 1.4 Guardrails: step states, gates (review verdict), review rows, skip link, discard bar

```css
/* ===== v5: guardrails ===== */
body[data-hdr=ink] .dhead{padding-top:36px}
.save{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding:0 18px}
.stp.auto i{box-shadow:inset 0 0 0 1.4px var(--ink25);background:#fff;color:var(--ink45)}
.stp.chk i{background:var(--rose);color:var(--rust);box-shadow:inset 0 0 0 1.4px rgba(138,74,60,.45)}
.stp.blk i{background:var(--rust);color:#fff;box-shadow:none}
.stp.cur i{background:var(--btn)!important;color:#fff!important;box-shadow:none!important}
.stp.chk em,.stp.blk em{color:var(--rust)}
.gate{border-radius:14px;padding:14px 16px;margin:4px 0 18px}
.gate b{display:block;font-family:var(--machine);font-weight:400;font-size:18px}
.gate span{display:block;font-size:13.5px;color:var(--ink70);margin-top:3px}
.gate.ok{background:var(--sage)}.gate.chk{background:var(--sand)}.gate.blk{background:var(--rust)}.gate.blk b{color:#fff}
.recap .rr span small{display:block;margin-top:4px;font:400 8px var(--mono);letter-spacing:.08em}
.recap .rr small.fm{color:var(--rust);font:400 13px var(--serif);letter-spacing:0}
.recap .rr small.au{color:var(--ink45)}
.recap .rr.blk{background:var(--rose);border-radius:10px;padding-left:10px;padding-right:10px;border-bottom-color:transparent;margin:2px 0}
.recap .rr.blk u{color:var(--rust)}
.plan.rv{margin-top:20px}
.skip{border:0;background:none;font-family:var(--machine);font-size:14px;color:var(--ink);cursor:pointer;padding:10px 4px;text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--ink25)}
.dfoot{position:relative}
.dfoot .conf{display:none;position:absolute;inset:0;background:var(--ink);color:#f5f1eb;align-items:center;gap:10px;padding:0 20px 0 24px}
.dfoot.confirm .conf{display:flex}
.conf span{flex:1;font-size:13px;color:rgba(245,241,235,.75)}
.conf span b{display:block;font-family:var(--machine);font-weight:400;font-size:16px;color:#fff}
.conf button{height:40px;border-radius:20px;border:0;font-family:var(--machine);font-size:14px;padding:0 16px;cursor:pointer}
.conf .keep{background:#fff;color:var(--ink)}.conf .disc{background:none;color:#f5f1eb;box-shadow:inset 0 0 0 1.2px rgba(255,255,255,.4)}
```

### 1.5 Motion — keyframes, row washes, save spinner, undo toast + countdown ring, reduced motion

```css
/* ===== v6: motion ===== */
:root{--k:1;--t1:calc(120ms*var(--k));--t2:calc(200ms*var(--k));--t3:calc(280ms*var(--k));--t4:calc(360ms*var(--k));--out:cubic-bezier(.2,.8,.2,1);--in:cubic-bezier(.4,0,1,1)}
body.slow{--k:3}
.scrim{transition:opacity var(--t2) ease}
.drawer{transition:transform var(--t3) var(--out)}
body:not(.s-drawer) .drawer{transition:transform calc(var(--t3)*.85) var(--in)}
.card{transition:transform var(--t3) var(--out),opacity var(--t2)}
/* quill dips in when the drawer opens */
.qwrap img.dip{animation:dip var(--t4) var(--out) both;animation-delay:var(--t2);transform-origin:50% 100%}
@keyframes dip{from{opacity:0;transform:translateX(-46%) translateY(10px) rotate(-12deg)}to{opacity:1;transform:translateX(-46%) translateY(0) rotate(0)}}
body[data-hdr=ink] .qwrap{animation:disc var(--t3) var(--out) both;animation-delay:var(--t1)}
body.opening[data-hdr=ink] .qwrap{animation-name:disc}
@keyframes disc{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}
/* step changes slide in the direction of travel */
.sec.in-f{animation:inF var(--t2) var(--out) both}
.sec.in-b{animation:inB var(--t2) var(--out) both}
@keyframes inF{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:none}}
@keyframes inB{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:none}}
.recap.in-f,.gate.in-f{animation:inF var(--t2) var(--out) both}
.stl{position:relative;overflow:hidden}
.stl::after{content:"";position:absolute;inset:0;background:#4f6149;transform:scaleX(0);transform-origin:left}
.stl.done::after{transform:none}
.stl.fill::after{animation:fill var(--t3) var(--out) both}
@keyframes fill{from{transform:scaleX(0)}to{transform:none}}
.stp.cur.pop i{animation:pop var(--t2) var(--out) both}
@keyframes pop{from{transform:scale(.7)}to{transform:none}}
/* values tick when they change */
.tick{display:inline-block;animation:tick var(--t2) var(--out) both}
@keyframes tick{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.tick.dn{animation-name:tickd}
@keyframes tickd{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.chip:active,.cb:active,.save:active{transform:scale(.97)}
.chip{transition:background var(--t1),color var(--t1),box-shadow var(--t1)}
/* the plan draws itself on the review */
.plan.rv .ln{transform-origin:left;animation:fill calc(var(--t4)*1.3) var(--out) both;animation-delay:var(--t1)}
.plan.rv .pt,.plan.rv .lab{animation:ptin var(--t2) var(--out) both}
@keyframes ptin{from{opacity:0;transform:scale(.4)}to{opacity:1}}
.plan.rv .lab{animation-name:fadeup}
@keyframes fadeup{from{opacity:0;margin-top:4px}to{opacity:1;margin-top:0}}
/* save button */
.save.busy{pointer-events:none;background:#233145}
.save.busy::after{content:"";display:inline-block;width:14px;height:14px;margin-left:10px;border-radius:50%;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;vertical-align:-2px;animation:spin calc(700ms*var(--k)) linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
/* rows arrive, change and leave */
.qrow.arrive{animation:arrive var(--t4) var(--out) both, wash calc(1800ms*var(--k)) ease-out var(--t4) both}
@keyframes arrive{from{max-height:0;margin-top:0;opacity:0;transform:translateY(-8px)}to{max-height:76px;opacity:1;transform:none}}
.qrow.changed{animation:wash calc(1800ms*var(--k)) ease-out both}
@keyframes wash{0%{background:var(--sand);box-shadow:0 0 0 1.5px rgba(138,74,60,.35)}100%{background:#fff}}
.qrow.changed .st,.qrow.changed .due{animation:tick var(--t3) var(--out) both;animation-delay:var(--t1)}
.qrow.leave{animation:leave var(--t3) var(--in) both;overflow:hidden}
@keyframes leave{from{max-height:76px;opacity:1}to{max-height:0;margin-top:0;opacity:0;padding-top:0;padding-bottom:0}}
.qrow.undone{animation:washu calc(1400ms*var(--k)) ease-out both}
@keyframes washu{0%{background:var(--stone)}100%{background:#fff}}
/* discard bar slides up */
.dfoot.confirm .conf{animation:up var(--t2) var(--out) both}
@keyframes up{from{transform:translateY(100%)}to{transform:none}}
/* toast with undo */
.toast{display:flex;align-items:center;gap:14px;padding:10px 10px 10px 18px;border-radius:24px;pointer-events:auto;transition:opacity var(--t2),transform var(--t2) var(--out);z-index:90;max-width:520px}
.toast .tx{display:flex;flex-direction:column}
.toast .tx b{font-weight:400}
.toast .tx small{font:400 8px var(--mono);letter-spacing:.1em;color:rgba(245,241,235,.55);margin-top:3px}
.toast .ub{display:flex;align-items:center;gap:8px;height:36px;border-radius:18px;border:0;background:rgba(255,255,255,.12);color:#fff;font-family:var(--machine);font-size:14px;padding:0 8px 0 14px;cursor:pointer}
.toast .ub:hover{background:rgba(255,255,255,.2)}
.toast .ub kbd{font:400 8px var(--mono);letter-spacing:.06em;color:rgba(255,255,255,.55)}
.toast .ring{width:22px;height:22px;transform:rotate(-90deg)}
.toast .ring circle{fill:none;stroke-width:2.2}
.toast .ring .bg{stroke:rgba(255,255,255,.18)}
.toast .ring .fg{stroke:#fff;stroke-dasharray:57;stroke-dashoffset:0}
.toast.on .ring .fg{animation:ring var(--dur,8s) linear forwards}
.toast:hover .ring .fg{animation-play-state:paused}
@keyframes ring{to{stroke-dashoffset:57}}
.toast .view{border:0;background:none;color:rgba(245,241,235,.8);font-family:var(--machine);font-size:13px;cursor:pointer;text-decoration:underline;text-underline-offset:3px;text-decoration-color:rgba(255,255,255,.3)}
.toast.done .ub,.toast.done .view{display:none}
/* reduced motion: fades only */
body.rm *,body.rm *::before,body.rm *::after{animation-duration:1ms!important;animation-delay:0ms!important;transition-duration:var(--t1)!important}
body.rm .drawer,body.rm .card{transition-property:opacity!important}
body.rm .drawer{transform:none;opacity:0;pointer-events:none}body.rm.s-drawer .drawer{opacity:1;pointer-events:auto}
body.rm .toast.on .ring .fg{animation-duration:var(--dur,8s)!important}
```

### 1.6 Nudge journey: facts, paths, letter (the letter/paths/facts blocks are unused by the shipped render — see §6)

```css
/* ===== v7: nudge journey ===== */
.facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:4px}
.facts>div{background:#faf7f2;border-radius:12px;padding:11px 12px}
.facts>div.hot{background:var(--rose)}
.facts small{display:block;font:400 7.5px var(--mono);letter-spacing:.12em;color:var(--ink45)}
.facts b{display:block;font-family:var(--machine);font-weight:400;font-size:15px;margin-top:6px}
.facts span{display:block;font:400 8px var(--mono);letter-spacing:.06em;color:var(--ink45);margin-top:3px;text-transform:uppercase}
.paths{display:flex;flex-direction:column;gap:8px}
.path{display:block;text-align:left;border:0;background:#fff;border-radius:14px;padding:13px 16px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.16);cursor:pointer;transition:box-shadow var(--t1),background var(--t1)}
.path:hover{box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.4)}
.path.on{box-shadow:inset 0 0 0 2px var(--btn);background:#f7f9fb}
.path b{display:block;font-family:var(--machine);font-weight:400;font-size:16px}
.path span{display:block;font-size:13.5px;color:var(--ink70);margin-top:2px}
.path em{display:inline-block;font-style:normal;font:700 7.5px var(--mono);letter-spacing:.1em;background:var(--sage);color:#4f6149;padding:3px 7px;border-radius:5px;margin-top:8px}
.letter{margin-top:14px;border-radius:14px;background:#fffdf9;box-shadow:0 1px 2px rgba(28,19,15,.06),inset 0 0 0 1px rgba(28,19,15,.1);overflow:hidden}
.letter .lh{padding:11px 16px;border-bottom:1px dashed rgba(28,19,15,.15)}
.letter .lh small{font:400 7.5px var(--mono);letter-spacing:.12em;color:var(--ink45);margin-right:8px}
.letter .lh b{font-family:var(--machine);font-weight:400;font-size:14px}
.letter .lb{padding:14px 16px 16px;white-space:pre-wrap;font-size:14.5px;line-height:1.5}
.lacts{display:flex;align-items:center;gap:8px;margin-top:10px;flex-wrap:wrap}
.lacts .lt{flex:1 1 100%;font-size:12.5px;color:var(--ink45);margin-top:2px}
```

### 1.7 Smaller ink header (v8 — the resolved values are in §1.0)

```css
/* ===== v8: a smaller header ===== */
body[data-hdr=ink] .dhead{padding:14px 24px 14px}
body[data-hdr=ink] .dtop{min-height:0;align-items:center}
body[data-hdr=ink] .dtop .tt{padding:0}
body[data-hdr=ink] .dhead h2{font-size:22px;margin-top:4px}
body[data-hdr=ink] .qwrap{width:56px;height:56px;margin:0 40px 0 0}
body[data-hdr=ink] .qwrap img{height:64px;bottom:3px}
body[data-hdr=ink] .dhead{padding-top:20px}
body[data-hdr=ink] .who{margin-top:12px;padding:8px 12px}
.dhead .dx{top:8px}
```

### 1.8 "Where it stands" variants, radios, ledger, progress bar

`.rads`/`.rad`, `.wsl`, `.track .pt.today` and `.why` are live; `.story`, `.ledger`, `.pbar`/`.pb`/`.pleg`, `.orclose`, `.seg.big` belong to variants B–D.

```css
/* ===== v9: where-it-stands variants ===== */
.wsA{margin-top:4px}
.track .pt.today{background:#fff;box-shadow:inset 0 0 0 2px var(--rust)}
.wsl{font-size:15px;line-height:1.5;margin:12px 0 0}
.rads{display:flex;flex-direction:column;border-radius:14px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.14);overflow:hidden}
.rad{display:flex;align-items:center;gap:12px;text-align:left;border:0;background:#fff;padding:12px 14px;cursor:pointer;border-top:1px solid var(--hair)}
.rad:first-child{border-top:0}
.rad:hover{background:#faf7f2}
.rad i{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--ink45);flex:none}
.rad.on i{box-shadow:inset 0 0 0 5px var(--btn)}
.rad b{display:block;font-family:var(--machine);font-weight:400;font-size:15.5px}
.rad small{display:block;font-size:13px;color:var(--ink70);margin-top:1px}
.rad em.go{background:#f3eee7;color:var(--ink70)}
.rad em,.why em{font-style:normal;font:700 7.5px var(--mono);letter-spacing:.1em;background:var(--sage);color:#4f6149;padding:3px 7px;border-radius:5px;margin-left:auto;flex:none}
.why{font-size:14px;margin:14px 0 10px;display:flex;align-items:center;gap:8px}.why em{margin:0}
.story{font-family:var(--machine);font-size:21px;line-height:1.45;margin:6px 0 4px}
.story u{text-decoration:none;box-shadow:inset 0 -.38em 0 var(--blush)}
.seg.big span{padding:11px 10px;font-size:14.5px}
.orclose{margin:10px 0 0;font-size:14px;color:var(--ink70);text-align:center}
.orclose a{color:var(--ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer;font-family:var(--machine)}
.ledger{border-top:1px solid var(--hair)}
.ledger>div{display:grid;grid-template-columns:130px 1fr auto;gap:12px;align-items:baseline;padding:11px 2px;border-bottom:1px solid var(--hair)}
.ledger b{font-family:var(--machine);font-weight:400;font-size:14.5px}
.ledger span{font-size:14.5px}
.ledger small{font:400 8.5px var(--mono);letter-spacing:.08em;color:var(--ink45);text-transform:uppercase}
.ledger .hot small{color:var(--rust);font-weight:700}
.pbar{margin-top:4px}
.ptop{display:flex;align-items:baseline;justify-content:space-between}
.ptop b{font-family:var(--machine);font-weight:400;font-size:24px}
.ptop span{font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45)}
.pb{position:relative;height:22px;border-radius:11px;background:#f3eee7;margin-top:8px;overflow:visible}
.pb i{position:absolute;top:0;bottom:0}
.pb .in{left:0;background:var(--sand);border-radius:11px 0 0 11px;box-shadow:inset 0 0 0 1px rgba(28,19,15,.06)}
.pb .ov{background:var(--rose);box-shadow:inset 0 0 0 1px rgba(138,74,60,.2)}
.pb .wl{width:0;border-left:2px solid var(--ink);top:-4px;bottom:-4px}
.pb .nd{width:10px;height:10px;top:6px;margin-left:-5px;border-radius:50%;background:var(--blush);box-shadow:inset 0 0 0 1.5px var(--rust)}
.pb .now{width:0;border-left:1.5px dashed var(--rust);top:-6px;bottom:-6px}
.pleg{position:relative;height:16px;margin-top:6px;font:400 7.5px var(--mono);letter-spacing:.08em;color:var(--ink45)}
.pleg span{position:absolute;white-space:nowrap}
.pleg span+span{transform:translateX(-50%)}
.pbar p{font-size:14.5px;margin:12px 0 0}.pbar p b{font-family:var(--machine);font-weight:400}
```

### 1.9 v11: submission-package tiles, offer "others" list, Tracking-tab Edit/Delete + inline confirm, card-footer delete, review pill

```css
/* ===== v11 ===== */
.pkgs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:6px}
.pkg{text-align:left;border:0;background:#fff;border-radius:12px;padding:10px 12px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.16);cursor:pointer}
.pkg:hover{box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.4)}
.pkg.on{box-shadow:inset 0 0 0 2px var(--btn);background:#f7f9fb}
.pkg b{display:block;font-family:var(--machine);font-weight:400;font-size:14px}
.pkg b em{font-style:normal;font:700 7px var(--mono);letter-spacing:.08em;background:var(--sage);color:#4f6149;padding:2px 5px;border-radius:4px;margin-left:4px;vertical-align:2px}
.pkg small{display:block;font-size:12px;color:var(--ink70);margin-top:3px;line-height:1.3}
.othr{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.oth{border-radius:12px;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.14);padding:10px 12px}
.ot{display:flex;align-items:center;gap:10px}
.ot .av{width:28px;height:28px;font-size:8px}
.ot b{display:block;font-weight:600;font-size:14.5px}.ot small{font:400 7.5px var(--mono);letter-spacing:.1em;color:var(--ink45)}
.told{margin-left:auto;border:0;border-radius:14px;padding:6px 12px;font-family:var(--machine);font-size:13px;cursor:pointer;background:#fff;box-shadow:inset 0 0 0 1.2px rgba(28,19,15,.25)}
.told.on{background:var(--sage);box-shadow:none;color:#3f5139}
.seg.sm{margin-top:10px}.seg.sm span{font-size:12px;padding:6px 6px}
.othr .tgl{margin-top:0}
.ev{position:relative}
.evx{position:absolute;right:6px;top:50%;transform:translateY(-50%);display:none;gap:6px;background:#fff;padding-left:10px}
.ev:hover .evx{display:flex}.ev:hover small{visibility:hidden}
.evx u{text-decoration:none;font:700 8px var(--mono);letter-spacing:.1em;padding:5px 8px;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(28,19,15,.22);cursor:pointer}
.evx u:hover{background:#f7f3ee}
.delc{display:flex;align-items:center;gap:8px;background:var(--ink);color:#f5f1eb;border-radius:12px;padding:10px 10px 10px 14px;margin:4px 0;width:100%}
.delc span{flex:1;font-size:12.5px;color:rgba(245,241,235,.75)}.delc span b{display:block;font-family:var(--machine);font-weight:400;font-size:14.5px;color:#fff}
.delc button{border:0;border-radius:16px;height:32px;padding:0 12px;font-family:var(--machine);font-size:13px;cursor:pointer;background:#fff;color:var(--ink)}
.delc button.d{background:var(--rust);color:#fff}
.cdel{margin-left:auto;border:0;background:none;font:700 8px var(--mono);letter-spacing:.1em;color:var(--ink45);cursor:pointer}
.cdel:hover{color:var(--rust)}
.card footer{align-items:center;flex-wrap:wrap}
/* review pill */
.rvp{position:fixed;left:calc(248px + (100vw - 248px - 500px)/2);top:84px;transform:translateX(-50%);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:3px;padding:6px 8px 6px 14px;border-radius:22px;background:#fff;box-shadow:0 10px 30px -10px rgba(28,19,15,.45),0 0 0 1px var(--hair);font:400 12px var(--machine);z-index:80;max-width:calc(100vw - 540px)}
.rvp button{border:0;background:none;font:inherit;padding:6px 10px;border-radius:14px;cursor:pointer}
.rvp button[aria-pressed=true]{background:var(--ink);color:#fff}
.rvp .sp{width:1px;height:20px;background:var(--hair);margin:0 6px}
```

Notes on the Tracking-tab chips (`.evx`): they are absolutely positioned on the right of each `.ev` row, hidden until `.ev:hover`, and while shown the row's date (`.ev small`) is `visibility:hidden` so the chips sit in its place. They are **mono 700 8px, letter-spacing .1em** with a 1px inset hairline, `padding:5px 8px; border-radius:7px`. The inline confirm (`.delc`) is an ink (`#1c130f`) bar that REPLACES the row (entry delete) or the whole card footer (query delete); its Delete button is rust.

---

## 2. DOM

### 2.1 Static markup (L529–543, verbatim)

```html
<div class="scrim" id="scrim"></div>
<div class="card" id="card" role="dialog">
 <header><span class="av" id="cAv"></span><span><b id="cName"></b><small id="cSub"></small></span><span class="chipst" id="cSt"><i></i><span></span></span><button class="x" onclick="closeCard()">×</button></header>
 <div class="tabs"><span>OVERVIEW</span><span class="on">TRACKING</span><span>MATERIALS</span><span>NOTES</span></div>
 <div class="tl" id="cTl"></div>
 <footer id="cFoot"></footer>
</div>
<div class="dock" id="dock"><span class="av" id="dAv"></span><span id="dName"></span><i id="dDot"></i></div>
<aside class="drawer" id="drawer">
 <div class="dhead" id="dHead"><div class="dtop"><div class="tt"><div class="mode" id="mMode"></div><h2 id="mTitle"></h2></div><span class="qwrap"><img id="quill" alt=""></span></div><button class="dx" onclick="cancelDrawer()">×</button><div id="mWho"></div></div>
 <div class="dbody" id="mBody"></div>
 <div class="dfoot" id="dfoot"><button class="back" id="mBack" onclick="go(-1)">‹ Back</button><button class="save" id="mSave" onclick="primary()"></button><button class="skip" id="mSkip" onclick="review()">Review</button><button class="cancel" onclick="cancelDrawer()">Cancel</button><div class="conf"><span><b>Discard this query?</b>What you've entered will be lost.</span><button class="keep" onclick="F._conf=false;render()">Keep editing</button><button class="disc" onclick="F._conf=false;F._force=true;cancelDrawer()">Discard</button></div></div>
</aside>
<div class="toast" id="toast" onmouseenter="toastPause(true)" onmouseleave="toastPause(false)"><span class="tx"><b id="tMsg"></b><small id="tSub"></small></span><button class="view" id="tView">View</button><button class="view" id="tAgain" onclick="hideToast(true);openDrawer('log','again')">Log another</button><button class="ub" id="tUndo" onclick="undo()">Undo <kbd id="tKey">⌘Z</kbd><svg class="ring" viewBox="0 0 22 22"><circle class="bg" cx="11" cy="11" r="9"/><circle class="fg" cx="11" cy="11" r="9"/></svg></button></div>
<div class="rvp" id="rvp">Speed <button data-sp="1">1×</button><button data-sp="3">Slow-mo</button><span class="sp"></span>Motion <button data-mo="full">Full</button><button data-mo="rm">Reduced</button></div>
```

Notes:
- The header's `.qwrap` sits AFTER `.tt` in source; in the ink format it is not re-ordered (only `compact`/`tile` use `order:-1`), so the blush disc is on the **right**, 40px in from the right edge of `.dtop`, with the × absolutely at `right:12px; top:8px`.
- `#mWho` is filled with the `who()` card only when the drawer is opened on an existing query; with no query (`Log a query`) the header gets `.bare` and the card is absent.
- `#mBody` is fully re-rendered on every state change; `layout()` then post-processes it (injects `.shd` headers, the stepper, the "worth a look" note, hides all but the current section, builds the review).

### 2.2 The agent card ("who") — generated by `who()` (L826)

```js
function who(a,q,extra){return`<div class="who"><span class="av">${a.i}</span><span><b>${a.n}</b><small>${a.a.toUpperCase()}${q?` · ${q.st.toUpperCase()} · SENT ${up(q.sent)}`:` · REPLIES IN ~${a.wks} WKS · ${a.via.toUpperCase()}`}</small></span><span class="tags">${a.nrmn?'<span class="tag dark">NO REPLY MEANS NO</span>':''}${extra||''}</span></div>`}
```

Rendered (existing query):
```html
<div class="who"><span class="av">AK</span><span><b>Aisha Kapoor</b><small>THE LANTERN AGENCY · QUERIED · SENT 14 AUG</small></span><span class="tags"></span></div>
```
Without a query (log flow, after choosing the agent) the small line is `THE LANTERN AGENCY · REPLIES IN ~6 WKS · EMAIL` and the `extra` slot carries a `CHANGE` link (mono 8px, .1em, ink45). An agent with `nrmn` adds `<span class="tag dark">NO REPLY MEANS NO</span>`.

### 2.3 A rendered body after `layout()` (journey layout, step 0 of the Nudge flow, representative)

```html
<div class="dbody" id="mBody">
  <div class="stepper">
    <span class="stp cur pop go" data-i="0"><i>1</i><em>Where it stands</em></span><span class="stl"></span>
    <span class="stp auto go" data-i="1"><i>2</i><em>The nudge</em></span><span class="stl"></span>
    <span class="stp auto go" data-i="2"><i>3</i><em>If it's still quiet</em></span><span class="stl"></span>
    <span class="stp go" data-i="3"><i>4</i><em>Check and log</em></span>
  </div>
  <div class="sec in-f" data-t="Where it stands" data-s="Logging a nudge">
    <div class="shd"><span class="num">1</span><b>Where it stands</b><span class="sum">Logging a nudge</span><span class="ed">EDIT</span></div>
    <div class="plan wsA"><h5>SO FAR</h5><div class="track">…</div></div>
    <p class="wsl">Eleanor's 8-week window closed …, and you nudged on Sun 2 Aug.</p>
    <div class="fl">WHAT WOULD YOU LIKE TO DO?</div>
    <div class="rads"><button class="rad on"><i></i><span><b>I’ve sent a nudge</b><small>…</small></span></button>…</div>
  </div>
  <div class="sec hidden" data-f="check" data-fm="A second nudge — you last nudged Sun 2 Aug" data-t="The nudge" data-s="…">…</div>
  <div class="sec hidden" …>…</div>
  <div class="saves hidden"><h5>WHEN YOU SAVE</h5><ul><li><i style="background:var(--blush)"></i><span>…</span></li></ul></div>
</div>
```

Each section is a `<div class="sec">` carrying:
- `data-t` — its title (stepper label, header, review row label);
- `data-s` — its one-line summary (review row value);
- optionally `data-f="block"|"check"` and `data-fm` — the guard and its message (built by `fa()`, L846).

```js
function fa(l,m){return l?` data-f="${l}" data-fm="${String(m).replace(/"/g,'&quot;')}"`:''}
```

### 2.4 The review step (built by `layout()` when `F.step === n`)

```html
<div class="recap in-f">
  <div class="gate ok|chk|blk"><b>Ready to log</b><span>Nothing looks out of place.</span></div>
  <h5>YOUR ANSWERS</h5>
  <div class="rr done|auto|chk|blk" onclick="…jump to i…"><b>{data-t}</b><span>{data-s or —}<small class="fm">{data-fm}</small>|<small class="au">SUGGESTED · NOT OPENED</small></span><u>EDIT|FIX</u></div>
  …
</div>
<div class="plan rv" style="margin-top:20px">…the LAST .plan in the body, moved here…</div>
<div class="saves"><h5>WHEN YOU SAVE</h5><ul>…</ul></div>
```

### 2.5 Footer (`.dfoot`)
`‹ Back` (hidden on step 0) · primary `.save` (flex 1) · `Review` skip link · `Cancel`. The discard bar `.conf` overlays the whole footer (absolute inset 0, ink ground) when `.dfoot.confirm`.

### 2.6 Card timeline row with chips, and the two inline confirms

```html
<div class="ev new" data-k="0"><i style="background:var(--sage)"></i><b>Nudge sent</b><em>Email</em><small>2 AUG 2026</small>
  <span class="evx"><u onclick="EDITK=0;openDrawer('edit',cur,true)">Edit</u><u onclick="askDel(0)">Delete</u></span></div>

<!-- after "Delete" on a non-oldest entry: replaces that row -->
<div class="delc"><span><b>Delete “Nudge sent”?</b>The status goes back to the entry before it.</span><button>Keep</button><button class="d">Delete</button></div>

<!-- after "Delete query", or Delete on the OLDEST entry: replaces the whole card footer -->
<div class="delc"><span><b>Delete this whole query?</b>Its history and reminders go too.</span><button>Keep</button><button class="d">Delete</button></div>
```
Planned items at the top of the timeline (not deletable, no chips):
```html
<div class="ev plan"><i></i><b>Nudge planned</b><em>reminder on your to-do</em><small>3 OCT 2026</small></div>
<div class="ev plan"><i></i><b>Consider closing</b><small>25 OCT 2026</small></div>
```

---

## 3. Logic and copy

### 3.1 Date helpers, relative text, weekend shift (L547–564, verbatim)

```js
/* ---------- dates ---------- */
const TODAY=new Date(2026,8,27);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONL=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const D=(y,m,d)=>new Date(y,m,d);
const add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const same=(a,b)=>a&&b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
const diff=(a,b)=>Math.round((new Date(a.getFullYear(),a.getMonth(),a.getDate())-new Date(b.getFullYear(),b.getMonth(),b.getDate()))/864e5);
const fmt=d=>`${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
const fmtY=d=>`${fmt(d)} ${d.getFullYear()}`;
const up=d=>`${d.getDate()} ${MON[d.getMonth()]}`.toUpperCase();
function rel(d){const n=diff(d,TODAY);if(n===0)return'today';if(n===-1)return'yesterday';if(n===1)return'tomorrow';
 if(n<0){const a=-n;return a<14?`${a} days ago`:a<63?`${Math.round(a/7)} weeks ago`:`${Math.round(a/30)} months ago`}
 return n<14?`in ${n} days`:n<63?`in ${Math.round(n/7)} weeks`:`in ${Math.round(n/30)} months`}
const weekend=d=>d.getDay()===0||d.getDay()===6;
const offWeekend=d=>d.getDay()===6?add(d,2):d.getDay()===0?add(d,1):d;
function lastWeekday(){let d=add(TODAY,-2);while(weekend(d))d=add(d,-1);return d} // the working day before yesterday
```

- `fmt` → `Sun 27 Sep`; `fmtY` → `Sun 27 Sep 2026`; `up` → `27 SEP` (no weekday, uppercase).
- `rel`: 0 `today`, −1 `yesterday`, +1 `tomorrow`; |n| < 14 → `N days ago` / `in N days`; < 63 → weeks (rounded); else months (n/30 rounded).
- **Weekend shift** `offWeekend`: Saturday → Monday (+2), Sunday → Monday (+1). Applied to every *reminder/to-do* date (nudge anchors, `send the pages` tip, tell-the-others to-dos, withdraw-tell, matsent nudge) — NOT to reply-expected dates or chosen deadlines. When an anchor was moved, the date field shows a rust `MOVED OFF THE WEEKEND` on its result line (`DFSHIFT`).
- `lastWeekday()` is defined and never called.

### 3.2 Data model the mock assumes (L566–597)

```js
/* ---------- the book ---------- */
const BOOK={title:"Murphy's Day Out",words:50000,chapters:24,wpp:250};
const PAGES=Math.round(BOOK.words/BOOK.wpp), WPC=Math.round(BOOK.words/BOOK.chapters);

/* ---------- data ---------- */
const COL={Queried:'var(--sand)','Partial requested':'var(--rose)','Partial sent':'var(--sage)','Full requested':'var(--rose)','Full sent':'var(--sage)','Revise & resubmit':'var(--rose)',Offer:'var(--offer)',Signed:'var(--offer)',Resubmitted:'var(--sage)',Closed:'var(--stone)',Passed:'var(--stone)'};
const AG={
 AK:{i:'AK',n:'Aisha Kapoor',first:'Aisha',a:'The Lantern Agency',wks:6,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'chapters',amt:3,from:1}},
 MR:{i:'MR',n:'Marcus Reed',first:'Marcus',a:'Bloomsbury Quill',wks:8,nrmn:false,via:'QueryManager',wants:{ql:1,syn:0,unit:'pages',amt:10,from:1}},
 EW:{i:'EW',n:'Eleanor Whitfield',first:'Eleanor',a:'Greenfield Literary',wks:8,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'pages',amt:50,from:1}},
 WT:{i:'WT',n:'William Tan',first:'William',a:'Foxglove Literary',wks:12,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'chapters',amt:3,from:1}},
 HV:{i:'HV',n:'Harriet Vane-Coe',first:'Harriet',a:'Stillwater Reps',wks:6,nrmn:true,via:'Online form',wants:{ql:1,syn:0,unit:'words',amt:5000,from:1}},
 SD:{i:'SD',n:'Sophie Dunn',first:'Sophie',a:'Arden & Lowe',wks:8,nrmn:false,via:'QueryManager',wants:{ql:1,syn:1,unit:'pages',amt:10,from:1}},
 TH:{i:'TH',n:'Tom Hartley',first:'Tom',a:'Hartley & Rowe',wks:12,nrmn:true,via:'Email',wants:{ql:1,syn:0,unit:'words',amt:5000,from:1}},
 PA:{i:'PA',n:'Priya Anand',first:'Priya',a:'The Story Collective',wks:10,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'chapters',amt:3,from:1}},
 FL:{i:'FL',n:'Freya Lowe',first:'Freya',a:'The Lantern Agency',wks:6,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'chapters',amt:3,from:1}},
 OB:{i:'OB',n:'Oliver Bright',first:'Oliver',a:'Bright Lines',wks:4,nrmn:false,via:'Email',wants:{ql:1,syn:1,unit:'none',amt:0,from:1}}
};
const Q=[
 {ag:'AK',st:'Queried',sent:D(2026,7,14),nudges:[],tl:[['Queried',D(2026,7,14),'Query, synopsis, first 3 chapters']]},
 {ag:'MR',st:'Partial requested',sent:D(2026,6,23),sendBy:D(2026,9,3),req:{s:{unit:'pages',amt:50,from:1,sect:false,fu:null},syn:false,on:D(2026,8,20)},nudges:[],tl:[['Partial requested',D(2026,8,20),'First 50 pages · send by 3 Oct'],['Queried',D(2026,6,23)]]},
 {ag:'EW',st:'Queried',sent:D(2026,5,29),nudges:[D(2026,8,2)],tl:[['Nudge sent',D(2026,8,2)],['Queried',D(2026,5,29)]]},
 {ag:'WT',st:'Full sent',sent:D(2026,7,11),fullSent:D(2026,8,18),nudges:[],tl:[['Full sent',D(2026,8,18)],['Full requested',D(2026,8,10)],['Queried',D(2026,7,11)]]},
 {ag:'HV',st:'Queried',sent:D(2026,7,16),nudges:[],tl:[['Queried',D(2026,7,16),'Query, first 5,000 words']]},
 {ag:'PA',st:'Offer',sent:D(2026,5,20),fullSent:D(2026,7,24),offerOn:D(2026,8,22),offerBy:D(2026,9,6),nudges:[],others:{},call:'none',tl:[['Offer',D(2026,8,22),'answer by 6 Oct'],['Full sent',D(2026,7,24)],['Full requested',D(2026,7,10)],['Queried',D(2026,5,20)]]},
 {ag:'TH',st:'Closed',sent:D(2026,5,2),nudges:[],tl:[['Query closed',D(2026,8,15),'No reply'],['Queried',D(2026,5,2)]]},
 {ag:'OB',st:'Passed',sent:D(2026,4,10),nudges:[],tl:[['Passed',D(2026,5,12),'Form rejection'],['Queried',D(2026,4,10)]]}
];
Q.forEach((q,i)=>{q.id='q'+i;q.window=add(q.fullSent||q.sent,(q.fullSent?12:AG[q.ag].wks)*7)});
const ACTIVE=()=>Q.filter(q=>!['Closed','Passed','Offer','Signed'].includes(q.st));
const LIVE=q=>!['Closed','Passed','Signed'].includes(q.st);
const OWE=q=>['Partial requested','Full requested','Revise & resubmit'].includes(q.st);
```

`q.window` = reply-expected date: from `fullSent` + 12 weeks if a full has gone, else `sent` + the agent's `wks`.

### 3.3 Row due text (the right-hand column of a Query Centre row) and row quick actions (L599–618)

```js
function dueText(q){
 if(q.st==='Partial requested'||q.st==='Full requested')return{t:`SEND BY ${up(q.sendBy||add(TODAY,7))}`,o:false};
 if(q.st==='Revise & resubmit')return{t:`RESUBMIT BY ${up(q.sendBy||add(TODAY,28))}`,o:false};
 if(q.st==='Closed'){const e=q.tl.find(x=>x[0]==='Query closed');return{t:`CLOSED${e&&e[2]?' · '+e[2].toUpperCase():''}`,o:false}}
 if(q.st==='Passed')return{t:'PASSED',o:false};
 if(q.st==='Signed')return{t:'YOUR AGENT',o:false};
 if(q.st==='Offer'){const n=diff(q.offerBy,TODAY);return{t:`ANSWER BY ${up(q.offerBy)} · ${n} DAYS`,o:n<=7}}
 if(q.nudgePlan)return{t:`NUDGE PLANNED ${up(q.nudgePlan)}`,o:false};
 if(q.closePlan){const n=diff(TODAY,q.closePlan);return{t:n>=0?`NUDGED ${up(q.nudges[q.nudges.length-1])} · CONSIDER CLOSING`:`NUDGED ${up(q.nudges[q.nudges.length-1])} · CLOSE BY ${up(q.closePlan)}`,o:n>=0}}
 const n=diff(TODAY,q.window);
 if(n>0){const a=AG[q.ag];return{t:a.nrmn?`${n} DAYS PAST · NO REPLY MEANS NO`:q.nudges.length?`${n} DAYS OVERDUE · NUDGED ${up(q.nudges[q.nudges.length-1])}`:`${n} DAYS OVERDUE · NUDGE`,o:true}}
 if(n===0)return{t:'REPLY WINDOW CLOSES TODAY',o:true};
 return{t:`REPLY EXPECTED ${up(q.window)}`,o:false};
}
const $=id=>document.getElementById(id);
function rows(){$('rows').innerHTML=Q.map((q,x)=>{const a=AG[q.ag],d=dueText(q);return`<div class="qrow" data-id="${q.id}" onclick="openCard(${x})">
 <span class="av">${a.i}</span><span class="qn"><b>${a.n}</b><small>${a.a.toUpperCase()} · MURPHY'S DAY OUT</small></span>
 <span class="st"><i style="background:${COL[q.st]||'var(--stone)'}"></i>${q.st}</span>
 <span class="due${d.o?' over':''}">${d.t}</span>
 <span class="qacts" onclick="event.stopPropagation()">${OWE(q)?`<button class="qa" onclick="openDrawer('matsent',${x})">✓ SENT IT</button>`:q.st==='Offer'?`<button class="qa" onclick="openDrawer('offer',${x})">OFFER</button>`:!LIVE(q)?`<button class="qa" onclick="openDrawer('resp',${x})">LATE REPLY</button>`:`<button class="qa" onclick="openDrawer('resp',${x})">✓ RESPONSE</button><button class="qa" onclick="openDrawer('nudge',${x})">NUDGE</button>`}</span></div>`}).join('')}
```

Row hover actions (`.qacts`) by status: owed (Partial/Full requested, R&R) → `✓ SENT IT`; Offer → `OFFER`; closed/passed/signed → `LATE REPLY`; otherwise `✓ RESPONSE` + `NUDGE`.

### 3.4 The query card, its footer buttons by status, Tracking-tab Edit/Delete (L629–655)

```js
/* ---------- card ---------- */
let cur=null,fromCard=false,F=null;
function openCard(x){cur=x;const q=Q[x],a=AG[q.ag];
 $('cAv').textContent=a.i;$('cName').textContent=a.n;$('cSub').textContent=a.a.toUpperCase()+' · MURPHY’S DAY OUT';
 const st=$('cSt');st.style.background=COL[q.st]||'var(--stone)';st.querySelector('span').textContent=q.st;
 let plan='';if(q.nudgePlan)plan=`<div class="ev plan"><i></i><b>Nudge planned</b><em>reminder on your to-do</em><small>${up(q.nudgePlan)} ${q.nudgePlan.getFullYear()}</small></div>`;
 if(q.closePlan)plan+=`<div class="ev plan"><i></i><b>Consider closing</b><small>${up(q.closePlan)} ${q.closePlan.getFullYear()}</small></div>`;
 $('cTl').innerHTML=plan+q.tl.map((e,k)=>`<div class="ev${e[3]?' new':''}" data-k="${k}"><i style="background:${COL[e[0]]||'var(--stone)'}"></i><b>${e[0]}</b>${e[2]?`<em>${e[2]}</em>`:''}<small>${up(e[1])} ${e[1].getFullYear()}</small><span class="evx"><u onclick="EDITK=${k};openDrawer('edit',cur,true)">Edit</u><u onclick="askDel(${k})">Delete</u></span></div>`).join('');
 q.tl.forEach(e=>e[3]=false);
 const closed=['Closed','Passed'].includes(q.st);let f='';
 if(closed)f=`<button class="cb pri" onclick="openDrawer('resp',cur,true)">Record a late reply</button>`;
 else if(q.st==='Signed')f=`<button class="cb" disabled>Your agent</button>`;
 else if(q.st==='Offer')f=`<button class="cb pri" onclick="openDrawer('offer',cur,true)">Offer: next steps</button>`;
 else if(OWE(q))f=`<button class="cb pri" onclick="openDrawer('matsent',cur,true)">I've sent it</button><button class="cb" onclick="openDrawer('resp',cur,true)">Record a response</button><button class="cb" onclick="openDrawer('close',cur,true)">Close</button>`;
 else f=`<button class="cb pri" onclick="openDrawer('resp',cur,true)">Record a response</button><button class="cb" onclick="openDrawer('nudge',cur,true)">Nudge</button><button class="cb" onclick="openDrawer('close',cur,true)">Close query</button>`;
 $('cFoot').innerHTML=f+`<button class="cdel" onclick="askDel(-1)">Delete query</button>`;
 document.body.classList.add('s-dim','s-card');document.body.classList.remove('s-docked')}
function askDel(k){const q=Q[cur];const whole=k<0||k===q.tl.length-1;
 const html=`<div class="delc"><span><b>${whole?'Delete this whole query?':`Delete “${q.tl[k][0]}”?`}</b>${whole?'Its history and reminders go too.':'The status goes back to the entry before it.'}</span><button onclick="openCard(cur)">Keep</button><button class="d" onclick="doDel(${whole?-1:k})">Delete</button></div>`;
 if(whole)$('cFoot').innerHTML=html;else{const r=document.querySelector(`.ev[data-k="${k}"]`);r.outerHTML=html}}
const STATUSOF=e=>e==='Nudge sent'||e==='Offer call'?null:e==='Query closed'||e==='Offer declined'?'Closed':e==='Offer accepted'?'Signed':e;
function doDel(k){const snap=structuredClone(Q);const q=Q[cur],a=AG[q.ag];let msg;
 if(k<0){Q.splice(cur,1);UNDO={snap,hit:q.id,kind:'changed',msg:`Query deleted · ${a.n}`};closeCard();rows();msg=UNDO.msg;showToast(msg,'ITS HISTORY AND REMINDERS WENT WITH IT',true);return}
 const gone=q.tl.splice(k,1)[0];if(gone[0]==='Nudge sent')q.nudges=q.nudges.filter(n=>!same(n,gone[1]));
 const st=q.tl.map(e=>STATUSOF(e[0])).find(Boolean)||'Queried';q.st=st;
 UNDO={snap,hit:q.id,kind:'changed',msg:`Entry deleted · ${a.n}`};openCard(cur);rows();showToast(UNDO.msg,`“${gone[0].toUpperCase()}” REMOVED · STATUS NOW ${st.toUpperCase()}`,true)}
function closeCard(){document.body.classList.remove('s-dim','s-card','s-docked');cur=null}
```

**Card footer by status** (L638–644), always followed by the quiet `Delete query` (`.cdel`, mono 700 8px, rust on hover):

| status | buttons (first is `.cb.pri`) |
|---|---|
| Closed, Passed | `Record a late reply` |
| Signed | `Your agent` (disabled, plain) |
| Offer | `Offer: next steps` |
| Partial requested, Full requested, Revise & resubmit | `I've sent it` · `Record a response` · `Close` |
| everything else (Queried, Partial/Full sent, Resubmitted…) | `Record a response` · `Nudge` · `Close query` |

Card header sub-line: `{AGENCY UPPER} · MURPHY’S DAY OUT` (curly apostrophe here; the row uses a straight one — see §6).

Delete copy:
- whole query (or the oldest entry, which IS the query): `Delete this whole query?` / `Its history and reminders go too.` → toast `Query deleted · {Agent name}` / `ITS HISTORY AND REMINDERS WENT WITH IT`
- one entry: `Delete “{entry}”?` / `The status goes back to the entry before it.` → toast `Entry deleted · {Agent name}` / `“{ENTRY UPPER}” REMOVED · STATUS NOW {STATUS UPPER}`
- Buttons: `Keep` (white) · `Delete` (rust).
- The status after deleting an entry is re-derived from the newest remaining entry via `STATUSOF` (nudges and offer calls carry no status; `Query closed`/`Offer declined` → `Closed`; `Offer accepted` → `Signed`), default `Queried`.

**Opening a drawer from the card "docks" it** (`s-docked`): the card scales to 8% and flies to the bottom-left (`translate(calc(-50vw + 320px), calc(50vh - 90px)) scale(.08)`, opacity 0) while the ink dock chip (avatar, name, status dot) fades up at `left:20px; bottom:18px` with a 120ms delay. On save the card reopens in place 200ms later; on cancel it simply un-docks.

### 3.5 Submission packages, units, sample conversion, sample naming, match notes (L657–696)

```js
/* ---------- submission packages ---------- */
const PKGS=[{k:'std',n:'Standard',v:{ql:'Query letter v3',syn:'Synopsis v2'},m:{ql:1,syn:1,s:{unit:'chapters',amt:3,from:1,sect:false,fu:null}}},
 {k:'open',n:'Opening pages',v:{ql:'Query letter v3',syn:'Synopsis v2'},m:{ql:1,syn:1,s:{unit:'pages',amt:10,from:1,sect:false,fu:null}}},
 {k:'lean',n:'Letter and 5,000 words',v:{ql:'Query letter v3'},m:{ql:1,syn:0,s:{unit:'words',amt:5000,from:1,sect:false,fu:null}}}];
const pkgMatch=(p,w)=>p.m.ql===w.ql&&p.m.syn===w.syn&&p.m.s.unit===w.unit&&p.m.s.amt===w.amt;
/* ---------- materials helpers ---------- */
const UNIT={pages:{step:5,min:1,max:PAGES,pre:[5,10,25,50],def:10,one:'page',many:'pages'},
 words:{step:500,min:500,max:BOOK.words,pre:[1000,2500,5000,10000],def:5000,one:'word',many:'words'},
 chapters:{step:1,min:1,max:BOOK.chapters,pre:[1,2,3,5],def:3,one:'chapter',many:'chapters'}};
const n0=n=>n.toLocaleString('en-GB');
const toWords=(u,a)=>u==='pages'?a*BOOK.wpp:u==='chapters'?a*WPC:a;
function convert(u1,a,u2){const w=toWords(u1,a);let v;
 if(u2==='words')v=Math.max(500,Math.round(w/500)*500);
 else if(u2==='pages'){v=w/BOOK.wpp;v=v<5?Math.max(1,Math.round(v)):Math.round(v/5)*5}
 else v=Math.max(1,Math.round(w/WPC));
 return Math.min(v,UNIT[u2].max)}
const FU={chapter:{step:1,min:2,max:BOOK.chapters,def:4},page:{step:5,min:2,max:PAGES,def:40},word:{step:1000,min:1000,max:BOOK.words-1000,def:20000}};
const defFU=u=>u==='pages'?'page':u==='words'?'chapter':'chapter';
function sampleName(s){if(!s||s.unit==='none')return'no sample';const U=UNIT[s.unit],a=s.amt;
 const word=a===1?U.one:U.many;
 if(!s.sect)return`first ${n0(a)} ${word}`;
 const fu=s.fu||defFU(s.unit),f=s.from;
 if(s.unit==='chapters'&&fu==='chapter')return a===1?`chapter ${f}`:`chapters ${f}–${f+a-1}`;
 if(s.unit==='pages'&&fu==='page')return`pages ${n0(f)}–${n0(f+a-1)}`;
 if(s.unit==='words'&&fu==='word')return`words ${n0(f)}–${n0(f+a)}`;
 return`${n0(a)} ${word} from ${fu} ${n0(f)}`}
function sampleApprox(s){if(s.unit==='none')return'';const w=toWords(s.unit,s.amt);const pc=Math.round(w/BOOK.words*100);
 if(s.unit==='words')return`≈ ${(s.amt/WPC).toFixed(1)} CHAPTERS · ${pc}% OF THE BOOK`;
 return`≈ ${n0(Math.round(w/50)*50)} WORDS · ${pc}% OF THE BOOK`}
function pkgName(m){const p=[];if(m.ql)p.push('query letter');if(m.syn)p.push('synopsis');if(m.s.unit!=='none')p.push(sampleName(m.s));
 if(!p.length)return'nothing selected';const t=p.join(p.length>2?', ':' and ').replace(/, ([^,]*)$/,' and $1');return t[0].toUpperCase()+t.slice(1)}
function matchNotes(m,a){if(!a)return'';const w=a.wants,out=[];
 if(w.ql&&!m.ql)out.push(`${a.first} asks for a query letter`);
 if(w.syn&&!m.syn)out.push(`${a.first} asks for a synopsis`);
 if(!w.syn&&m.syn)out.push(`${a.first} doesn't ask for a synopsis`);
 const ws={unit:w.unit,amt:w.amt,from:w.from};
 if(w.unit==='none'&&m.s.unit!=='none')out.push(`${a.first} doesn't ask for a sample`);
 else if(w.unit!=='none'&&(m.s.unit!==w.unit||m.s.amt!==w.amt||m.s.sect))out.push(`${a.first} asks for the ${sampleName(ws)}${m.s.unit==='none'?'':` — you're sending ${!m.s.sect?'the ':''}${sampleName(m.s)}`}`);
 if(!out.length)return`<div class="note ok"><span class="ni">MATCH</span><span>Matches what ${a.first} asks for.</span></div>`;
 return`<div class="note warn"><span class="ni">CHECK</span><span>${out.join('. ')}. <a onclick="useAsk()">Use ${a.first}'s list</a></span></div>`}
```

**Sample control rules**, as coded:
- Units: `Pages` (step 5, min 1, max 200, presets 5/10/25/50, default 10) · `Words` (step 500, min 500, max 50,000, presets 1,000/2,500/5,000/10,000, default 5,000) · `Chapters` (step 1, min 1, max 24, presets 1/2/3/5, default 3) · `None` (only where `allowNone` — the log flow).
- Switching unit converts the amount through words (`convert`): → words rounds to 500 (min 500); → pages: under 5 rounds to the page (min 1), else rounds to 5; → chapters rounds (min 1); clamped to the unit max. Switching from None sets the new unit's default.
- `+/−` (`bump`, L798–802): pages step by 1 below 5, snap to multiples of 5 above; words snap to 500s; chapters ±1. Clamped.
- "A specific section": `setSect` turns on a second row `Starting at [Chapter|Page|Word] [− n +]`. Default "from" unit: pages→`page`, words→`chapter`, chapters→`chapter`. Defaults: chapter 4, page 40, word 20,000. Min: chapter 2, page 2, word 1,000. Switching the from-unit converts the position via words.
- **Summary text** (`sampleName`): `first 10 pages`, `first 1 chapter` (singular when 1), `first 5,000 words`; with a section: `chapters 4–6`, `chapter 4`, `pages 40–49`, `words 20,000–25,000`, otherwise `{amt} {unit} from {from-unit} {n}` (e.g. `5,000 words from chapter 4`). None → `no sample`.
- **Approximation** (`sampleApprox`): words → `≈ {amt/WPC to 1dp} CHAPTERS · {pc}% OF THE BOOK`; pages/chapters → `≈ {words rounded to 50} WORDS · {pc}% OF THE BOOK`.
- **Package name** (`pkgName`): `Query letter, synopsis and first 3 chapters`; two parts joined with ` and `; nothing → `nothing selected`. First letter capitalised.

Controls in `matBlock`/`sampleBlock` (verbatim):

```js
/* ---------- materials block ---------- */
function matBlock(m,a,label){const s=m.s,U=UNIT[s.unit];
 const L=F.log,pk=PKGS.find(p=>p.k===L.pkg);
 let ph=`<div class="fl">SUBMISSION PACKAGE<span class="r">FROM YOUR MANUSCRIPT'S MATERIALS</span></div><div class="pkgs">${PKGS.map(p=>`<button class="pkg${L.pkg===p.k?' on':''}" onclick="pickPkg('${p.k}')"><b>${p.n}${a&&pkgMatch(p,a.wants)?' <em>MATCHES '+a.first.toUpperCase()+'</em>':''}</b><small>${pkgName(p.m)}</small></button>`).join('')}<button class="pkg${L.pkg==='custom'?' on':''}" onclick="F.log.pkg='custom';render()"><b>Custom</b><small>Choose the pieces yourself</small></button></div>`;
 let h=`<div class="fl">${label}${a?`<span class="r">${a.first.toUpperCase()} ASKS FOR: ${pkgName({ql:a.wants.ql,syn:a.wants.syn,s:{unit:a.wants.unit,amt:a.wants.amt,from:1}}).toUpperCase()}</span>`:''}</div>`;
 h=ph+h;h+=`<div class="tgl${m.ql?' on':''}" onclick="F.${F.mode}.mat.ql^=1;touch();render()"><span class="bx">${m.ql?'✓':''}</span><b>Query letter</b><small>${m.ql?'V3 · CURRENT':''}</small></div>`;
 h+=`<div class="tgl${m.syn?' on':''}" onclick="F.${F.mode}.mat.syn^=1;touch();render()"><span class="bx">${m.syn?'✓':''}</span><b>Synopsis</b><small>${m.syn?'V2 · CURRENT':''}</small></div>`;
 h+=sampleBlock(`F.${F.mode}.mat.s`,s,true);
 h+=`<div class="sline"><b>${pkgName(m)}</b><span>${s.unit!=='none'?sampleApprox(s):''}</span></div>`;
 h+=matchNotes(m,a);return h}
function sampleBlock(path,s,allowNone){const U=UNIT[s.unit];
 const units=['pages','words','chapters'].concat(allowNone?['none']:[]);
 let h=`<div class="samp${s.unit==='none'?' off':''}"><div class="srow"><b>Sample</b><span class="seg" style="margin-left:auto">${units.map(u=>`<span class="${s.unit===u?'on':''}" onclick="setUnit('${path}','${u}')">${u==='none'?'None':u[0].toUpperCase()+u.slice(1)}</span>`).join('')}</span></div>`;
 if(s.unit!=='none'){
  const pv=AMTLAST[path];const tk=pv!==undefined&&pv!==s.amt?(s.amt>pv?'tick':'tick dn'):'';AMTLAST[path]=s.amt;
  h+=`<div class="amt"><span class="step"><button onclick="bump('${path}',-1)">−</button><b><span class="${tk}">${n0(s.amt)}</span></b><button onclick="bump('${path}',1)">+</button></span><span class="unitl">${s.amt===1?U.one:U.many}</span></div>`;
  h+=`<div class="presets">${U.pre.map(p=>`<button class="chip${s.amt===p?' on':''}" onclick="setAmt('${path}',${p})">${n0(p)}</button>`).join('')}</div>`;
  h+=`<div class="from"><span class="seg wide"><span class="${!s.sect?'on':''}" onclick="setSect('${path}',false)">From the opening</span><span class="${s.sect?'on':''}" onclick="setSect('${path}',true)">A specific section</span></span>`;
  if(s.sect){const fu=s.fu||defFU(s.unit);
   h+=`<div class="sectline">Starting at<span class="seg">${['chapter','page','word'].map(u=>`<span class="${fu===u?'on':''}" onclick="setFU('${path}','${u}')">${u[0].toUpperCase()+u.slice(1)}</span>`).join('')}</span><span class="step sm"><button onclick="bumpFrom('${path}',-1)">−</button><b>${n0(s.from)}</b><button onclick="bumpFrom('${path}',1)">+</button></span></div>`}
  h+=`</div>`}
 return h+`</div>`}
function S(path){return eval(path)}
function setUnit(path,u){const s=S(path);if(u!=='none'&&s.unit!=='none'){s.amt=convert(s.unit,s.amt,u)}
 else if(u!=='none')s.amt=UNIT[u].def;s.unit=u;touch();render()}
function bump(path,d){const s=S(path),U=UNIT[s.unit];let v=s.amt;
 if(s.unit==='pages'){if(d>0)v=v<5?v+1:(Math.floor(v/5)+1)*5;else v=v<=5?v-1:(Math.ceil(v/5)-1)*5}
 else if(s.unit==='words'){v=d>0?(Math.floor(v/500)+1)*500:(Math.ceil(v/500)-1)*500}
 else v=v+d;
 s.amt=Math.max(U.min,Math.min(U.max,v));touch();render()}
function setAmt(path,v){S(path).amt=v;touch();render()}
function setSect(path,on){const s=S(path);s.sect=on;if(on){s.fu=s.fu||defFU(s.unit);if(s.from<=1)s.from=FU[s.fu].def}else s.from=1;touch();render()}
function setFU(path,u){const s=S(path),old=s.fu||defFU(s.unit);if(old!==u){const w=old==='chapter'?(s.from-1)*WPC:old==='page'?(s.from-1)*BOOK.wpp:s.from;s.from=u==='chapter'?Math.max(2,Math.round(w/WPC)+1):u==='page'?Math.max(2,Math.round(w/BOOK.wpp/5)*5||2):Math.max(1000,Math.round(w/1000)*1000);s.fu=u}touch();render()}
function bumpFrom(path,d){const s=S(path),F2=FU[s.fu||defFU(s.unit)];let v=s.from+d*F2.step;if(F2.step>1)v=d>0?Math.floor(s.from/F2.step)*F2.step+F2.step:Math.ceil(s.from/F2.step)*F2.step-F2.step;s.from=Math.max(F2.min,Math.min(F2.max,v));touch();render()}
function touch(){if(F.mode==='log'){F.log.mat.u=true;F.log.pkg='custom'}}
function pickPkg(k){const p=PKGS.find(x=>x.k===k);F.log.pkg=k;F.log.mat={ql:p.m.ql,syn:p.m.syn,s:structuredClone(p.m.s),u:false};render()}
function useAsk(){const a=AG[F.log.ag];F.log.mat=freshMat(a);render()}
```

Copy in the materials block: `SUBMISSION PACKAGE` / `FROM YOUR MANUSCRIPT'S MATERIALS`; package tiles `Standard` (`Query letter, synopsis and first 3 chapters`), `Opening pages` (`Query letter, synopsis and first 10 pages`), `Letter and 5,000 words` (`Query letter and first 5,000 words`), `Custom` / `Choose the pieces yourself`; a matching package carries `MATCHES {FIRST UPPER}` (sage mini-tag). Right label: `{FIRST} ASKS FOR: {PACKAGE NAME UPPER}`. Toggles: `Query letter` (`V3 · CURRENT` when on), `Synopsis` (`V2 · CURRENT`). Sample row: `Sample` + seg; `From the opening` | `A specific section`; `Starting at`. Match notes: `MATCH` — `Matches what {first} asks for.`; `CHECK` — sentences joined by `. `: `{first} asks for a query letter` · `{first} asks for a synopsis` · `{first} doesn't ask for a synopsis` · `{first} doesn't ask for a sample` · `{first} asks for the {sample} — you're sending [the ]{sample}`, then the link `Use {first}'s list`. Any edit of the materials flips the package to `Custom` (`touch`).

### 3.6 Drawer state, open/cancel (L698–724)

```js
/* ---------- drawer state ---------- */
function freshMat(a){const w=a?a.wants:{ql:1,syn:1,unit:'chapters',amt:3,from:1};return{ql:w.ql,syn:w.syn,s:{unit:w.unit,amt:w.unit==='none'?UNIT.chapters.def:w.amt,from:1,sect:false,fu:null},u:false}}
let LASTLOG=null,EDITK=0;
function openDrawer(mode,x,card){fromCard=!!card;if(x==='again'){cur=null}else if(x!==null&&x!==undefined)cur=x;else cur=null;
 const q=cur!==null?Q[cur]:null,a=q?AG[q.ag]:null;
 F={mode,cal:null,
  log:{pkg:'custom',ag:null,typed:'',ms:0,sent:TODAY,via:'Email',mat:freshMat(null),note:'',expect:null,expectMode:'usual',ifNo:'nudge',nudgeWhen:'week',nudgeDate:null},
  resp:{type:null,recv:TODAY,s:{unit:'pages',amt:50,from:1,sect:false},syn:false,sendByMode:'2w',sendBy:add(TODAY,14),remind:'2d',fb:'form',offerBy:add(TODAY,14),offerByMode:'2w',notify:true},
  nudge:{tab:null,sent:TODAY,via:a?a.via:'Email',thenMode:'4w',then:add(TODAY,28),whenMode:null,when:null},
  close:{why:null,on:TODAY,onMode:'t',wd:'offer',told:false,remindTell:true,recheck:'3m'},
  ms:{s:q&&q.req?structuredClone(q.req.s):{unit:'pages',amt:50,from:1,sect:false,fu:null},syn:!!(q&&q.req&&q.req.syn),ver:'v4',changed:'',sent:TODAY,via:a?a.via:'Email',expMode:null,exp:null,ifNo:'nudge'},
  of:q&&q.st==='Offer'?{others:structuredClone(q.others||{}),call:q.call||'none',callOn:add(TODAY,2),dec:'wait',withdraw:{},remindTell:true}:null,
  edit:null};
 if(q){const rc=nudgeRec(q,AG[q.ag]);F.nudge.tab=rc.tab;
  const nw=nudgeAnchors(q);const pickN=nw.find(z=>z.k==='week')||nw[0];F.nudge.whenMode=pickN.k;F.nudge.when=pickN.d;}
 document.body.classList.add('s-dim','s-drawer');F._lastStep=0;
 const qi=$('quill');qi.classList.remove('dip');void qi.offsetWidth;qi.classList.add('dip');const qw=qi.parentNode;qw.style.animation='none';void qw.offsetWidth;qw.style.animation='';
 if(fromCard){document.body.classList.add('s-docked');$('dAv').textContent=a.i;$('dName').textContent=a.n;$('dDot').style.background=COL[q.st]||'var(--stone)'}
 F.open=0;F.step=0;DFLAST={};AMTLAST={};
 if(q&&diff(TODAY,q.window)>0&&!['Partial requested','Full requested','Revise & resubmit'].includes(q.st))F.close.why='noreply';
 if(mode==='log')F._focusAg=true;
 if(mode==='log'&&LASTLOG&&x==='again'){F.log.sent=LASTLOG.sent;F.log.via=LASTLOG.via;F.log.pkg=LASTLOG.pkg;F.log.mat=structuredClone(LASTLOG.mat);F._again=true}
 if(mode==='edit')F.edit={k:EDITK,d:new Date(q.tl[EDITK][1]),orig:new Date(q.tl[EDITK][1])},F._note=q.tl[EDITK][2]||'';
 render();$('mBody').scrollTop=0}
function cancelDrawer(){if(F&&!F._force&&F.mode==='log'&&F.log.ag){if(!F._conf){F._conf=true;render()};return}
 document.body.classList.remove('s-drawer');
 if(fromCard)document.body.classList.remove('s-docked');else if(!document.body.classList.contains('s-card'))document.body.classList.remove('s-dim');F=null}
```

Discard bar (log flow only, and only once an agent has been chosen): `Discard this query?` / `What you've entered will be lost.` · `Keep editing` · `Discard`. Every other flow cancels without asking.

### 3.7 Date field + calendar popover (L726–771, verbatim)

```js
/* ---------- date field ---------- */
// opts: key (path in F), dir past|future, anchors [{k,label,d,sub}], min, max, mode path for chip selection
function dateField(id,label,val,anchors,dir,right,forceKey){
 const hit=forceKey?anchors.find(x=>x.k===forceKey):anchors.find(x=>x.d&&same(x.d,val));
 const custom=!hit&&!!val;
 let h=`${label?`<div class="fl">${label}${right?`<span class="r">${right}</span>`:''}</div>`:''}<div class="dfield" data-df="${id}"><div class="chips">`;
 h+=anchors.map(x=>`<button class="chip${hit&&hit.k===x.k?' on':''}" onclick="pickDate('${id}','${x.k}')">${x.label}${x.sub?` <small>${x.sub}</small>`:''}</button>`).join('');
 h+=`<button class="chip ghost${custom?' on':''}" data-cal onclick="toggleCal('${id}')"><span class="ic"><svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4.5" width="14" height="12.5" rx="2"/><path d="M3 8.5h14M7 3v3M13 3v3"/></svg></span>${custom?fmt(val):'Pick a date'}</button>`;
 h+=`</div>`;
 const ch=DFLAST[id]!==undefined&&DFLAST[id]!==(val?val.getTime():0);const dn=ch&&val&&DFLAST[id]>val.getTime();DFLAST[id]=val?val.getTime():0;
 if(val)h+=`<div class="dres"><b class="${ch?'tick'+(dn?' dn':''):''}">${fmtY(val)}</b><span>${rel(val).toUpperCase()}</span>${DFSHIFT[id]?`<span class="shift">${DFSHIFT[id]}</span>`:''}</div>`;
 if(F.cal&&F.cal.id===id)h+=calHTML(id,val,dir);
 h+=`</div>`;DF[id]={anchors,dir};return h}
let DF={},DFSHIFT={},DFLAST={},AMTLAST={};
function calHTML(id,val,dir){const v=F.cal.view,first=D(v.getFullYear(),v.getMonth(),1),start=(first.getDay()+6)%7;
 const dim=D(v.getFullYear(),v.getMonth()+1,0).getDate();let g='';
 for(let i=0;i<start;i++)g+=`<span class="mut">${D(v.getFullYear(),v.getMonth(),i-start+1).getDate()}</span>`;
 for(let d=1;d<=dim;d++){const dd=D(v.getFullYear(),v.getMonth(),d);const bad=(dir==='past'&&diff(dd,TODAY)>0)||(dir==='future'&&diff(dd,TODAY)<0);
  g+=`<span class="${bad?'no':''}${same(dd,TODAY)?' td':''}${same(dd,val)?' sel':''}${dir==='future'&&weekend(dd)&&!bad?' wk':''}" onclick="calPick('${id}',${dd.getTime()})">${d}</span>`}
 return`<div class="cal" onclick="event.stopPropagation()"><div class="mh"><button onclick="calNav(-1)">‹</button><b>${MONL[v.getMonth()]} ${v.getFullYear()}</b><button onclick="calNav(1)">›</button></div>
 <div class="dow"><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span></div><div class="grid">${g}</div>
 <div class="cf"><span>${dir==='past'?'NO FUTURE DATES':dir==='future'?'• WEEKEND':''}</span><button onclick="calPick('${id}',${TODAY.getTime()})">Today</button></div></div>`}
function toggleCal(id){const v=getVal(id)||TODAY;F.cal=(F.cal&&F.cal.id===id)?null:{id,view:D(v.getFullYear(),v.getMonth(),1)};render()}
function calNav(n){F.cal.view=D(F.cal.view.getFullYear(),F.cal.view.getMonth()+n,1);render()}
function calPick(id,t){setVal(id,new Date(t),'custom');F.cal=null;render()}
function pickDate(id,k){const x=DF[id].anchors.find(a=>a.k===k);setVal(id,x.d?new Date(x.d):null,k);F.cal=null;render()}
document.addEventListener('pointerdown',e=>{if(F&&F.cal&&!e.target.closest('.cal')&&!e.target.closest('[data-cal]')){F.cal=null;render()}},true);
function getVal(id){return{msSent:F.ms&&F.ms.sent,msExp:F.ms&&F.ms.exp,ofCall:F.of&&F.of.callOn,edDate:F.edit&&F.edit.d,logSent:F.log.sent,logExpect:F.log.expect,logNudge:F.log.nudgeDate,recv:F.resp.recv,sendBy:F.resp.sendBy,offerBy:F.resp.offerBy,nSent:F.nudge.sent,nThen:F.nudge.then,nWhen:F.nudge.when,closeOn:F.close.on}[id]}
function setVal(id,d,k){
 if(id==='logSent'){F.log.sent=d}
 if(id==='logExpect'){F.log.expect=d;F.log.expectMode=k}
 if(id==='logNudge'){F.log.nudgeDate=d;F.log.nudgeWhen=k}
 if(id==='recv')F.resp.recv=d;
 if(id==='sendBy'){if(d)F.resp.sendBy=d;F.resp.sendByMode=k}
 if(id==='offerBy'){F.resp.offerBy=d;F.resp.offerByMode=k}
 if(id==='nSent')F.nudge.sent=d;
 if(id==='nThen'){F.nudge.then=d;F.nudge.thenMode=k}
 if(id==='nWhen'){F.nudge.when=d;F.nudge.whenMode=k}
 if(id==='closeOn')F.close.on=d;
 if(id==='msSent')F.ms.sent=d;if(id==='msExp'){F.ms.exp=d;F.ms.expMode=k}if(id==='ofCall')F.of.callOn=d;if(id==='edDate')F.edit.d=d}
function pastAnchors(){const y=add(TODAY,-1);return[{k:'t',label:'Today',d:TODAY,sub:`${TODAY.getDate()} ${MON[TODAY.getMonth()]}`},{k:'y',label:'Yesterday',d:y,sub:`${y.getDate()} ${MON[y.getMonth()]}`}]}
function nudgeAnchors(q){const a=AG[q.ag];const w=q.window;const out=[];
 if(diff(w,TODAY)>=0){[['w0','When the window closes',0],['week','A week after',7],['2w','Two weeks after',14]].forEach(([k,l,n])=>out.push({k,label:l,d:offWeekend(add(w,n)),raw:add(w,n)}))}
 else{[['tm','Tomorrow',1],['1w','In a week',7],['2w','In two weeks',14]].forEach(([k,l,n])=>out.push({k,label:l,d:offWeekend(add(TODAY,n)),raw:add(TODAY,n)}))}
 out.forEach(x=>{x.sub=`${x.d.getDate()} ${MON[x.d.getMonth()]}`});return out}
function futureWeeks(base,list){return list.map(([k,l,n])=>({k,label:l,d:add(base,n),sub:`${add(base,n).getDate()} ${MON[add(base,n).getMonth()]}`}))}
```

Date-field behaviour:
- A row of anchor chips, each `label` + optional mono `sub` (e.g. `Today 27 Sep`), then a dashed-outline ghost chip with a calendar glyph reading `Pick a date` — or, when the value matches no anchor, that ghost chip is `.on` and reads the date (`Sun 4 Oct`).
- Below: the result line `.dres` — `fmtY(val)` in Special Elite 17px + `rel(val)` upper in mono, and a rust `MOVED OFF THE WEEKEND` at the right when shifted. The date ticks up/down (`.tick`/`.tick.dn`) when it changes.
- Calendar: Monday-first grid, leading days of the previous month muted; `past` fields strike through future days (footer note `NO FUTURE DATES`); `future` fields strike past days and put a rust dot under weekend days (footer `• WEEKEND`); today ringed; selected filled anthracite; footer `Today` button. Closes on outside pointerdown (capture phase) and on Escape (Escape closes the calendar before anything else).
- Anchor sets: **past** = `Today {d Mon}` · `Yesterday {d Mon}`. **Nudge** (`nudgeAnchors`) = if the window has not yet closed: `When the window closes` / `A week after` / `Two weeks after` (window + 0/7/14, weekend-shifted); if it has: `Tomorrow` / `In a week` / `In two weeks` (today + 1/7/14, weekend-shifted). Default pick is the `week` key if present, else the first. **futureWeeks(base, list)** — relative to a base date, NOT weekend-shifted.

### 3.8 The plan track (timeline) layout — L811–823, verbatim

```js
/* ---------- plan track ---------- */
function track(pts){const points=[];pts.forEach(p=>{const last=points[points.length-1];if(last&&Math.abs(diff(p.d,last.d))<=2){last.l=last.l+' · '+p.l.toLowerCase();last.c=p.c;last.s=p.s||last.s}else points.push({...p})});
 const t0=points[0].d,t1=points[points.length-1].d;const span=Math.max(1,diff(t1,t0));
 const pos=d=>Math.max(0,Math.min(100,diff(d,t0)/span*100));
 let h=`<div class="track"><div class="ln"></div>`;
 const tp=diff(TODAY,t0)>=0&&diff(TODAY,t1)<=0?pos(TODAY):null;
 if(tp!==null&&tp>2&&tp<98)h+=`<div class="tdy" style="left:${tp}%"></div>`;
 const TW=400,ends={hi:-1e9,lo:-1e9,lo2:-1e9};let deep=false;
 points.forEach((p,i)=>{const x=pos(p.d);const w=Math.max(p.l.length*7.4,(up(p.d)+(p.s?` · ${p.s}`:'')).length*5.6)+10;const px=x/100*TW;
  const l0=x<8?px-w*.14:x>92?px-w*.86:px-w/2;
  let row=l0>=ends.hi?'hi':l0>=ends.lo?'lo':'lo2';if(row==='lo2')deep=true;ends[row]=l0+w;const al=x<8?'translateX(-14%)':x>92?'translateX(-86%)':'translateX(-50%)';
  h+=`<div class="pt ${p.c||''}" style="left:${x}%"></div><div class="lab ${row}" style="left:${x}%;transform:${al}"><b>${p.l}</b><span>${up(p.d)}${p.s?` · ${p.s}`:''}</span></div>`});
 return (deep?h.replace('<div class="track">','<div class="track deep">'):h)+`</div>`}
```

Rules:
- **Merge**: points within **2 days** of the previous (kept) point merge into it: labels join with ` · ` and the later label lower-cased (`Reply due · nudge`), the later point's class wins, the sub-label carries forward.
- Positions are `%` of the span between the first and last point (span ≥ 1 day), clamped 0–100.
- Today line (`.tdy`, rust dashed, 22px tall at top 40) only when today falls inside the span and at 2–98%.
- **Label rows**: nominal track width `TW=400`. Label width ≈ `max(label chars × 7.4, (date + sub) chars × 5.6) + 10`. Anchor: <8% left-anchored (`translateX(-14%)`), >92% right-anchored (`translateX(-86%)`), else centred. Each label takes the first row whose previous label ended before this one starts: `hi` (above the line, top 4) → `lo` (below, top 66) → `lo2` (top 96). Using `lo2` switches the track to `.deep` (132px tall instead of 104).
- Label = `<b>` Special Elite 12.5px + `<span>` mono 8px `{DD MON}[ · {sub}]`.
- Dot classes: `done` (ink fill), `fut` (white, ink45 ring), `nudge` (blush fill, rust ring), `close` (stone fill, ink45 ring), `today` (white, rust ring), none (white, 2px ink ring).
- Every `.plan` h5 reads `THE PLAN` / `THE RECORD` / `WHAT'S AHEAD` / `SO FAR`, and all but `SO FAR` carry a rust right-floated `┆ TODAY` key.
- On the review the LAST `.plan` in the body is moved below the answers and animated: line scales in over 468ms after 120ms; dots and labels fade in pairwise, each pair 90ms after the previous (`calc(var(--t2) + floor(k/2)×90ms)`).

### 3.9 The journey layout: stepper, "worth a look", review verdict, footer — L1184–1235 verbatim

```js
/* ---------- layouts: sections / accordion / journey ---------- */
function layout(){const b=$('mBody'),lay=document.body.dataset.lay;const secs=[...b.querySelectorAll(':scope > .sec')];const saves=b.querySelector(':scope > .saves');
 const n=secs.length;F.open=Math.min(F.open,n-1);const last=n;
 F.seen=F.seen||new Set();
 const blocked=secs.findIndex(s=>s.dataset.f==='block');
 if(F.step>n)F.step=n;
 if(lay==='jour'&&blocked>=0&&F.step>blocked&&F.step===last&&!F._reviewOk){} // review can show blocks
 if(lay==='jour')F.seen.add(F.step);
 const dir=F._lastStep===undefined||F._lastStep===F.step?0:(F.step>F._lastStep?1:-1);const moved=dir!==0;const fromS=F._lastStep;F._lastStep=F.step;
 const state=i=>{const f=secs[i].dataset.f;if(f==='block')return'blk';if(f==='check')return'chk';return F.seen.has(i)?'done':'auto'};
 secs.forEach((s,i)=>{const hd=document.createElement('div');hd.className='shd';
  const done=lay==='jour'?i<F.step:lay==='acc'?i<F.open:false;
  hd.innerHTML=`<span class="num${done?' done':''}">${done?'✓':i+1}</span><b>${s.dataset.t||''}</b><span class="sum">${s.dataset.s||''}</span><span class="ed">EDIT</span>`;
  s.prepend(hd);
  if(lay==='jour'&&s.dataset.f==='check'&&i===F.step&&!s.querySelector('.note.warn')){const nb=document.createElement('div');nb.className='note warn';nb.innerHTML=`<span class="ni">WORTH A LOOK</span><span>${s.dataset.fm}. You can still carry on.</span>`;hd.after(nb)}
  if(lay==='acc'){const shut=i!==F.open;s.classList.toggle('shut',shut);if(shut)hd.onclick=()=>{F.open=i;render()};
   else if(i<n-1&&F._ok){const c=document.createElement('button');c.className='cont';c.innerHTML=`Continue · ${secs[i+1].dataset.t}`;c.onclick=()=>{F.open=i+1;render()};s.appendChild(c)}}
  if(lay==='jour'){s.classList.toggle('hidden',i!==F.step);if(moved&&i===F.step)s.classList.add(dir>0?'in-f':'in-b')}});
 if(lay==='jour'){
  // move the plan to the review step
  const plans=[...b.querySelectorAll('.sec .plan')];
  const st=document.createElement('div');st.className='stepper';
  const VB=verb();const names=secs.map(s=>s.dataset.t).concat(['Check and '+VB]);
  st.innerHTML=names.map((t,i)=>{const shown=k=>{const x=state(k);return x==='blk'&&!F.seen.has(k)?'auto':x};const cls=i===F.step?'cur':i<n?shown(i):(secs.some((z,k)=>z.dataset.f==='block'&&F.seen.has(k)&&k!==F.step)?'blk':'');const ic=i===F.step?i+1:cls==='done'?'✓':cls==='blk'||cls==='chk'?'!':i+1;
   return`<span class="stp ${cls}${i===F.step&&moved?' pop':''} go" data-i="${i}"><i>${ic}</i><em>${t}</em></span>`}).map((x,i,arr)=>i<arr.length-1?x+`<span class="stl${i<F.step?(moved&&dir>0&&i>=fromS&&i<F.step?' done fill':' done'):''}"></span>`:x).join('');
  st.querySelectorAll('.stp').forEach(x=>x.onclick=()=>{if(!F._ok&&+x.dataset.i>0)return;F.step=+x.dataset.i;F._jump=true;render()});
  b.prepend(st);
  if(saves)saves.classList.toggle('hidden',F.step!==last);
  if(F.step===last){
   const rc=document.createElement('div');rc.className='recap'+(moved?' in-f':'');
   const nb=secs.filter(s=>s.dataset.f==='block').length,nc=secs.filter(s=>s.dataset.f==='check').length;
   let top='';if(nb)top=`<div class="gate blk"><b>${nb===1?'One thing':nb+' things'} to fix before this can be logged</b></div>`;
   else if(nc)top=`<div class="gate chk"><b>Ready to ${VB}</b><span>${nc===1?'One thing looks':nc+' things look'} different from usual — worth a glance, but it won't stop you.</span></div>`;
   else top=`<div class="gate ok"><b>Ready to ${VB}</b><span>Nothing looks out of place.</span></div>`;
   rc.innerHTML=top+`<h5>YOUR ANSWERS</h5>`+secs.map((s,i)=>{const stt=state(i);
    return`<div class="rr ${stt}" onclick="F.step=${i};F._jump=true;render()"><b>${s.dataset.t}</b><span>${s.dataset.s||'—'}${stt==='blk'||stt==='chk'?`<small class="fm">${s.dataset.fm}</small>`:''}${stt==='auto'?'<small class="au">SUGGESTED · NOT OPENED</small>':''}</span><u>${stt==='blk'?'FIX':'EDIT'}</u></div>`}).join('');
   b.insertBefore(rc,saves||null);
   if(plans.length){const pl=plans[plans.length-1];if(moved)pl.classList.add('rv');else pl.classList.add('rvs');pl.style.marginTop='20px';b.insertBefore(pl,saves||null);pl.querySelectorAll('.pt,.lab').forEach((e,k)=>e.style.animationDelay=`calc(var(--t2) + ${Math.floor(k/2)*90}ms*var(--k))`)}
  }
 }
 // footer
 const sv=$('mSave'),bk=$('mBack'),sk=$('mSkip');
 const curBlocked=lay==='jour'&&F.step<last&&secs[F.step]&&secs[F.step].dataset.f==='block';
 if(lay==='jour'&&F.step<last){sv.textContent=`Next · ${F.step+1<n?secs[F.step+1].dataset.t:'Check and '+verb()}`;sv.disabled=!F._ok||curBlocked}
 else{sv.textContent=F._btn;sv.disabled=!F._ok||(lay==='jour'&&blocked>=0)}
 bk.classList.toggle('hidden',!(lay==='jour'&&F.step>0));
 sk.classList.toggle('hidden',!(lay==='jour'&&F._ok&&F.step<last-1&&!curBlocked));
 $('dfoot').classList.toggle('confirm',!!F._conf);
}
function review(){F.step=$('mBody').querySelectorAll(':scope > .sec').length;F._jump=true;render()}
function primary(){if(document.body.dataset.lay==='jour'){const n=$('mBody').querySelectorAll(':scope > .sec').length;if(F.step<n){F.step++;F._jump=true;render();return}}save()}
function go(d){F.step=Math.max(0,F.step+d);F._jump=true;render()}
```

Rules as coded:
- **Steps** = every `.sec` in the body in order, plus a final review step named `Check and {verb}`. `verb()` (L1038): log → `log`; resp → `save`; close → `close`; matsent → `log`; edit → `save`; nudge → `schedule` (Remind me) or `log`; offer → `save` / `accept` / `decline`.
- **Step disc states**: `cur` (anthracite, number) · `done` (sage ✓, seen and no guard) · `auto` (white outline, number — "suggested, not opened") · `chk` (rose disc, rust `!`, rust label) · `blk` (rust disc, white `!`, rust label). A `blk` step shows as `auto` until it has been seen. The review disc turns `blk` if any block has been seen on another step.
- **Connectors** (`.stl`) before the current step are filled sage-dark (`#4f6149`); newly passed ones animate the fill (280ms).
- **Blocks** stop you: Next is disabled on a blocked current step, the `Review` skip link hides, the steppers' discs are not clickable while `!F._ok` (except step 0), and on the review the primary is disabled if any section is blocked.
- **Checks** never stop you: on the current step, if it has `data-f="check"` and no `.note.warn` of its own, `layout()` inserts `WORTH A LOOK` — `{data-fm}. You can still carry on.`
- **Review verdict** (`.gate`): blocks → rust `{One thing|N things} to fix before this can be logged` (NB "logged" in every flow); else checks → sand `Ready to {verb}` / `{One thing looks|N things look} different from usual — worth a glance, but it won't stop you.`; else sage `Ready to {verb}` / `Nothing looks out of place.`
- **Review rows** (`YOUR ANSWERS`): label (`data-t`), value (`data-s` or `—`), the guard message in rust serif 13px for chk/blk, `SUGGESTED · NOT OPENED` for steps never visited; action `EDIT` or `FIX` (blk rows get a rose ground). Clicking a row jumps to that step.
- **Footer**: primary reads `Next · {next step title}` (or `Next · Check and {verb}` on the last question); on the review it reads the flow's button (`Log query`, `Save response`, …). `‹ Back` from step 1 on. `Review` (underlined skip) shown when the form is OK, not blocked, and there are at least two steps to go.
- **Step change motion**: the incoming section slides 28px in the direction of travel (`in-f`/`in-b`, 200ms); the current disc pops from .7.
- `WHEN YOU SAVE` (the consequences list) is shown **only on the review step**. Each line has a small dot whose colour is the second element (`#fff` if none).

### 3.10 JOURNEY — Log a query (`mode 'log'`) — L845–908 verbatim

Header: mode `LOG A QUERY`, title `Log a query` (all modes, L825):

```js
const MODES={log:['LOG A QUERY','Log a query'],resp:['RECORD A RESPONSE','Record a response'],nudge:['NUDGE','Nudge'],close:['CLOSE QUERY','Close query'],matsent:['SENT WHAT THEY ASKED FOR','I\u2019ve sent it'],offer:['OFFER OF REPRESENTATION','The offer'],edit:['CORRECT THE RECORD','Edit an entry']};
```

```js
/* LOG */
function fa(l,m){return l?` data-f="${l}" data-fm="${String(m).replace(/"/g,'&quot;')}"`:''}
function renderLog(){const L=F.log,a=L.ag?AG[L.ag]:null;let h='',saves=[];
 const dup=a?Q.find(q=>q.ag===L.ag&&LIVE(q)&&!q._new):null;
 const prev=a&&!dup?Q.find(q=>q.ag===L.ag&&!LIVE(q)):null;
 const sameAg=a?Q.find(q=>q.ag!==L.ag&&AG[q.ag].a===a.a&&LIVE(q)):null;
 const f1=!a?fa('block','Choose the agent you queried'):(dup&&!L.requery)?fa('block',`You already have a live query with ${a.first} for this book, sent ${fmt(dup.sent)}`):'';
 const f1b=!f1&&sameAg?fa('check',`You have a live query with ${AG[sameAg.ag].n}, also at ${a.a}`):'';
 const f2=a&&L.via!==a.via?fa('check',`${a.first} takes queries by ${a.via} — you've chosen ${L.via}`):'';
 const nothing=a&&!L.mat.ql&&!L.mat.syn&&L.mat.s.unit==='none';
 let f3='';if(nothing)f3=fa('block','Nothing is marked as sent');else if(a){const w=a.wants,m=L.mat,iss=[];if(w.ql&&!m.ql)iss.push('no query letter');if(w.syn&&!m.syn)iss.push('no synopsis');if(w.unit!=='none'&&(m.s.unit!==w.unit||m.s.amt!==w.amt||m.s.sect))iss.push(`${a.first} asks for the ${sampleName({unit:w.unit,amt:w.amt,from:1})}`);if(iss.length)f3=fa('check',`Different from ${a.first}'s guidelines: ${iss.join('; ')}`)}
 h+=`<div class="sec"${f1||f1b} data-t="Agent and book" data-s="${a?a.n+' · Murphy&#39;s Day Out'+(a&&Q.find(q=>q.ag===L.ag&&!LIVE(q))?' · requery':''):'Choose the agent'}"><div class="fl">WHO YOU QUERIED</div>`;
 if(a){if(dup)h+=`<div class="note ${L.requery?'info':'warn'}" style="margin-bottom:10px"><span class="ni">${L.requery?'NOTED':'ALREADY LIVE'}</span><span>${L.requery?`Logging a second, separate query to ${a.first}.`:`You already have a live query with ${a.first} for Murphy's Day Out, sent ${fmt(dup.sent)}. Did you mean to record a response or a nudge instead?`} <a onclick="F.log.requery=!F.log.requery;render()">${L.requery?'Undo':'It\'s a separate query'}</a></span></div>`;if(sameAg)h+=`<div class="note warn" style="margin-bottom:10px"><span class="ni">SAME AGENCY</span><span>You have a live query with <b>${AG[sameAg.ag].n}</b> at ${a.a}, sent ${fmt(sameAg.sent)}. Many agencies count a no from one agent as a no from all, so check their guidelines.</span></div>`;
 if(prev){const pe=prev.tl[0];h+=`<div class="note info" style="margin-bottom:10px"><span class="ni">QUERIED BEFORE</span><span>You queried ${a.first} with this book on ${fmt(prev.sent)} — ${pe[0].toLowerCase()} ${fmt(pe[1])}. This will be logged as a requery.</span></div>`}
 h+=who(a,null,`<a style="font:400 8px var(--mono);letter-spacing:.1em;color:var(--ink45);cursor:pointer" onclick="F.log.ag=null;F.log.typed='';F._focusAg=true;render()">CHANGE</a>`)}
 else{if(F._again)h+=`<div class="note ok" style="margin-bottom:10px"><span class="ni">KEPT</span><span>Same day, same way and the same package as your last query. Just choose the agent.</span></div>`;h+=`<div class="apick"><input class="fin" id="agIn" placeholder="Start typing an agent's name…" value="${L.typed}" oninput="agType(this.value)" onblur="setTimeout(()=>{if($('sugg'))$('sugg').innerHTML=''},150)" onkeydown="agKey(event)" autocomplete="off"><div id="sugg"></div></div>`}
 h+=`<div class="fl">MANUSCRIPT</div><div class="chips"><button class="chip on">Murphy's Day Out</button><button class="chip">The Salt Road</button></div></div>`;
 if(!a){setTimeout(()=>{if($('agIn')){agType($('agIn').value,true)}},0);return[h+`<div class="note info" style="margin-top:22px"><span class="ni">NEXT</span><span>Choose the agent first. Their reply time, how they take queries and what they ask for fill in the rest.</span></div>`,[],false,'Log query']}
 // when
 h+=`<div class="sec"${f2} data-t="Sending" data-s="${fmt(L.sent)} · ${L.via}"><p class="sech">Sent</p>`;
 h+=dateField('logSent','SENT ON',L.sent,pastAnchors(),'past');
 h+=`<div class="fl">SENT VIA<span class="r">${a.first.toUpperCase()} TAKES ${a.via.toUpperCase()}</span></div><div class="chips">${['Email','QueryManager','Online form'].map(v=>`<button class="chip${L.via===v?' on':''}" onclick="F.log.via='${v}';render()">${v}</button>`).join('')}</div></div>`;
 // what
 h+=`<div class="sec"${f3} data-t="What you sent" data-s="${L.pkg!=='custom'?PKGS.find(p=>p.k===L.pkg).n+' package · ':''}${pkgName(L.mat)}"><p class="sech">What you sent</p>`+matBlock(L.mat,a,'')+`</div>`;
 // response expectations
 const usual=add(L.sent,a.wks*7);
 const exA=[{k:'usual',label:`Their usual · ${a.wks} wks`,d:usual},{k:'+2',label:`${a.wks+2} wks`,d:add(L.sent,(a.wks+2)*7)},{k:'+4',label:`${a.wks+4} wks`,d:add(L.sent,(a.wks+4)*7)}];
 exA.forEach(x=>x.sub=`${x.d.getDate()} ${MON[x.d.getMonth()]}`);
 if(L.expectMode!=='custom'){const x=exA.find(z=>z.k===L.expectMode)||exA[0];L.expect=x.d;L.expectMode=x.k}
 if(L.nrmn===undefined)L.nrmn=a.nrmn;
 h+=`<div class="sec" data-t="Response expectations" data-s="By ${fmt(L.expect)} · ${L.nrmn?'silence is a no':'they reply'}"><p class="sech">Response expectations</p><p class="secs">What ${a.first} says about replies — change either if you know better.</p>`;
 h+=dateField('logExpect','REPLY EXPECTED BY',L.expect,exA,'future');
 h+=`<div class="fl">DOES NO REPLY MEAN NO?<span class="r">${a.nrmn?`${a.first.toUpperCase()}'S GUIDELINES SAY YES`:`${a.first.toUpperCase()}'S GUIDELINES DON'T SAY SO`}</span></div><div class="chips">${[[true,'Yes — silence is a pass'],[false,'No — they reply to everyone']].map(([v,l])=>`<button class="chip${L.nrmn===v?' on':''}" onclick="setNrmn(${v})">${l}</button>`).join('')}</div></div>`;
 // if they don't reply
 h+=`<div class="sec" @F5@ data-t="If they don't reply" data-s="@IFNO@"><p class="sech">If they don't reply</p><p class="secs">${L.nrmn?`Silence is ${a.first}'s answer, so the usual move is to close it. You can still plan a nudge.`:`Plan the chase now, so it lands on your to-do list at the right moment.`}</p>`;
 const ifs=[['nudge','Remind me to nudge'],['close','Close it'],['nothing','Do nothing']];
 h+=`<div class="fl">WHEN ${up(L.expect)} PASSES</div><div class="chips">${ifs.map(([k,l])=>`<button class="chip${L.ifNo===k?' on':''}" onclick="F.log.ifNo='${k}';F.log.ifNoSet=true;render()">${l}${L.nrmn&&k==='close'?' <small>USUAL</small>':''}</button>`).join('')}</div>`;
 let nd=null;
 if(L.ifNo==='nudge'){const na=[['w0','On the day',0],['week','A week later',7],['2w','Two weeks later',14]].map(([k,l,n])=>{const raw=add(L.expect,n),d=offWeekend(raw);return{k,label:l,d,raw,sub:`${d.getDate()} ${MON[d.getMonth()]}`}});
  if(L.nudgeWhen!=='custom'){const x=na.find(z=>z.k===L.nudgeWhen)||na[1];L.nudgeDate=x.d;L.nudgeWhen=x.k;if(!same(x.raw,x.d))DFSHIFT.logNudge=`MOVED OFF THE WEEKEND`}
  h+=dateField('logNudge','REMIND ME TO NUDGE',L.nudgeDate,na,'future');nd=L.nudgeDate;
  if(diff(nd,L.expect)<0)h+=`<div class="note warn"><span class="ni">EARLY</span><span>That's before ${a.first}'s reply window closes. An early nudge can read as impatient.</span></div>`;
  else if(L.nrmn)h+=`<div class="note info"><span class="ni">YOUR CALL</span><span>${a.first} doesn't expect nudges, but a short, polite one rarely does harm. We'll plan it as you've asked.</span></div>`}
 h=h.replace('@F5@',nd&&diff(nd,L.expect)<0?fa('check',`The nudge is before ${a.first}'s reply window closes`):'');
 h=h.replace('@IFNO@',L.ifNo==='nudge'?`Nudge reminder ${fmt(nd)}`:L.ifNo==='close'?`Close after ${fmt(L.expect)}`:'Do nothing');
 const pts=[{l:'Sent',d:L.sent,c:'done'},{l:'Reply due',d:L.expect,c:'fut'}];
 if(nd)pts.push({l:'Nudge',d:nd,c:'nudge'},{l:'Consider closing',d:add(nd,28),c:'close',s:'4 WKS ON'});
 if(L.ifNo==='close')pts[1].l='Reply due · closes';
 h+=`<div class="plan"><h5>THE PLAN<span class="tk">┆ TODAY</span></h5>${track(pts)}</div></div>`;
 // saves
 saves.push([`<b style="font-family:var(--machine);font-weight:400">Queried</b> ${a.n}, ${fmt(L.sent)}, via ${L.via}`,'var(--sand)']);
 saves.push([`${pkgName(L.mat)} recorded as sent`]);
 saves.push([`Reply expected by ${fmt(L.expect)}`]);
 if(L.ifNo==='nudge')saves.push([`“Nudge ${a.first}” lands on your to-do on ${fmt(nd)}; if still quiet, “Consider closing” four weeks after`,'var(--blush)']);
 if(L.ifNo==='close')saves.push([`Closes itself on ${fmt(add(L.expect,1))} if nothing comes back — you'll see it in the Query Centre first`,'var(--stone)']);
 return[h,saves,true,'Log query']}
function agType(v,noRender){F.log.typed=v;const t=v.trim().toLowerCase();const queried=new Set(Q.map(q=>q.ag));
 const list=Object.values(AG).filter(a=>!t||a.n.toLowerCase().includes(t)||a.a.toLowerCase().includes(t)).slice(0,5);
 let h='';if(document.activeElement&&document.activeElement.id==='agIn'||t){h=`<div class="sugg">${list.map((a,i)=>`<div class="it${i===0&&t?' hi':''}" onmousedown="pickAg('${a.i}')"><span class="av" style="width:28px;height:28px;font-size:8px">${a.i}</span><span><b>${a.n}</b><small>${a.a.toUpperCase()} · ~${a.wks} WKS</small></span>${queried.has(a.i)?'<span class="tag">ALREADY QUERIED</span>':a.nrmn?'<span class="tag">NO REPLY MEANS NO</span>':''}</div>`).join('')}${t?`<div class="new">+ Add “${v.trim()}” as a new agent</div>`:''}</div>`}
 if($('sugg'))$('sugg').innerHTML=h}
function agKey(e){if(e.key==='Enter'){const t=F.log.typed.trim().toLowerCase();const a=Object.values(AG).find(a=>a.n.toLowerCase().includes(t));if(a)pickAg(a.i)}}
function pickAg(id){const a=AG[id];F.log.ag=id;F.log.requery=false;F.log.via=a.via;F.log.mat=freshMat(a);{const p=PKGS.find(p=>pkgMatch(p,a.wants));if(p){F.log.pkg=p.k;F.log.mat={ql:p.m.ql,syn:p.m.syn,s:structuredClone(p.m.s),u:false}}else F.log.pkg='custom'}F.log.expectMode='usual';F.log.nrmn=a.nrmn;F.log.ifNoSet=false;F.log.ifNo=a.nrmn?'close':'nudge';F.log.nudgeWhen='week';render()}
function setNrmn(v){F.log.nrmn=v;if(!F.log.ifNoSet)F.log.ifNo=v?'close':'nudge';render()}
document.addEventListener('focusin',e=>{if(e.target.id==='agIn')agType(e.target.value,true)});
```

**Steps**: 1 `Agent and book` · 2 `Sending` · 3 `What you sent` · 4 `Response expectations` · 5 `If they don't reply` · review `Check and log`. Before an agent is chosen only step 1 exists (the form is not OK; primary `Log query`, disabled) and a note follows it: `NEXT` — `Choose the agent first. Their reply time, how they take queries and what they ask for fill in the rest.`

Guards:
| step | kind | message (`data-fm`) |
|---|---|---|
| Agent and book | block | `Choose the agent you queried` (no agent) |
| Agent and book | block | `You already have a live query with {first} for this book, sent {fmt}` (live query, not marked separate) |
| Agent and book | check | `You have a live query with {other agent full name}, also at {agency}` (only when no block) |
| Sending | check | `{first} takes queries by {agent via} — you've chosen {via}` |
| What you sent | block | `Nothing is marked as sent` |
| What you sent | check | `Different from {first}'s guidelines: {issues joined '; '}` — issues `no query letter`, `no synopsis`, `{first} asks for the {sample}` |
| If they don't reply | check | `The nudge is before {first}'s reply window closes` |

Summaries (`data-s`): `{Agent} · Murphy's Day Out[ · requery]` / `Choose the agent`; `{fmt(sent)} · {via}`; `[{Package} package · ]{package name}`; `By {fmt(expect)} · silence is a no|they reply`; `Nudge reminder {fmt}` / `Close after {fmt}` / `Do nothing`.

Step copy:
- `WHO YOU QUERIED`; picker input placeholder `Start typing an agent's name…`; suggestion rows `{name}` + `{AGENCY} · ~{wks} WKS` + tag `ALREADY QUERIED` or `NO REPLY MEANS NO`; the last row `+ Add “{typed}” as a new agent`. Enter picks the first match. Max 5 suggestions.
- Notes on step 1: `ALREADY LIVE` (warn) `You already have a live query with {first} for Murphy's Day Out, sent {fmt}. Did you mean to record a response or a nudge instead?` link `It's a separate query` → becomes `NOTED` (info) `Logging a second, separate query to {first}.` link `Undo`. `SAME AGENCY` (warn) `You have a live query with **{name}** at {agency}, sent {fmt}. Many agencies count a no from one agent as a no from all, so check their guidelines.` `QUERIED BEFORE` (info) `You queried {first} with this book on {fmt} — {latest entry lowercased} {fmt}. This will be logged as a requery.` On "Log another": `KEPT` (ok) `Same day, same way and the same package as your last query. Just choose the agent.`
- `MANUSCRIPT` chips: `Murphy's Day Out` (on), `The Salt Road`.
- `SENT ON` (past anchors); `SENT VIA` right label `{FIRST} TAKES {VIA UPPER}`; chips `Email` · `QueryManager` · `Online form`.
- Response expectations: sub `What {first} says about replies — change either if you know better.`; `REPLY EXPECTED BY` anchors `Their usual · {wks} wks` / `{wks+2} wks` / `{wks+4} wks` (from the sent date); `DOES NO REPLY MEAN NO?` right label `{FIRST}'S GUIDELINES SAY YES` / `{FIRST}'S GUIDELINES DON'T SAY SO`; chips `Yes — silence is a pass` / `No — they reply to everyone`.
- If they don't reply: sub `Silence is {first}'s answer, so the usual move is to close it. You can still plan a nudge.` / `Plan the chase now, so it lands on your to-do list at the right moment.`; `WHEN {DD MON} PASSES`; chips `Remind me to nudge` · `Close it` (+ `USUAL` mini-label when nrmn) · `Do nothing`. Nudge: `REMIND ME TO NUDGE` anchors `On the day` / `A week later` (default) / `Two weeks later` (reply date + 0/7/14, weekend-shifted). Notes: `EARLY` (warn) `That's before {first}'s reply window closes. An early nudge can read as impatient.` or, for nrmn agents, `YOUR CALL` (info) `{first} doesn't expect nudges, but a short, polite one rarely does harm. We'll plan it as you've asked.`
- Plan points: `Sent` (done) · `Reply due` (fut; `Reply due · closes` if Close it) · `Nudge` (nudge) · `Consider closing` (close, sub `4 WKS ON`, nudge + 28 days).
- Defaults on picking an agent (`pickAg`): via = agent's; materials = their wants, or a matching package if one exists; expectation = usual; nrmn = agent's; ifNo = `close` if nrmn else `nudge`; nudge = `A week later`. `setNrmn` re-derives ifNo only if the user hasn't touched it.

WHEN YOU SAVE:
- `**Queried** {Agent}, {fmt(sent)}, via {via}` (sand)
- `{Package name} recorded as sent`
- `Reply expected by {fmt}`
- nudge: `“Nudge {first}” lands on your to-do on {fmt}; if still quiet, “Consider closing” four weeks after` (blush)
- close: `Closes itself on {fmt(expect+1)} if nothing comes back — you'll see it in the Query Centre first` (stone)

Button `Log query` (busy label `Logging`). Toast: `Query logged · {Agent}` / `NUDGE REMINDER {DD MON} ADDED TO YOUR TO-DO` or `REPLY EXPECTED {DD MON}`, plus a `Log another` button (reopens log with sent date, via and package kept). The new row animates `arrive` then `wash`.

### 3.11 JOURNEY — Record a response (`mode 'resp'`) — L910–953 verbatim

```js
const RL={partial:'Partial requested',full:'Full requested',rr:'Revise & resubmit',pass:'Pass',offer:'Offer'};
/* RESPONSE */
function renderResp(q,a){const late=!LIVE(q);const R=F.resp;let h='',saves=[];
 const types=q.st==='Partial requested'||q.st==='Full requested'?[]:null;
 const opts=[['partial','Partial requested'],['full','Full requested'],['rr','Revise & resubmit'],['pass','Pass'],['offer','Offer']];
 if(late){const ce=q.tl[0];F._late=`<div class="note warn"><span class="ni">LATE REPLY</span><span>This query was ${q.st==='Passed'?'recorded as passed':'closed'} on ${fmt(ce[1])}${ce[2]?' ('+ce[2].toLowerCase()+')':''}. Recording a reply reopens it${q.st==='Closed'?' and replaces that ending':''}.</span></div>`}else F._late='';
 h+=`<div class="sec" data-t="The response" data-s="${R.type?RL[R.type]+' · '+fmt(R.recv):'Choose one'}">${F._late}<div class="fl">WHAT DID ${a.first.toUpperCase()} SAY?</div><div class="chips">${opts.map(([k,l])=>`<button class="chip${R.type===k?' on':''}" onclick="F.resp.type='${k}';render()">${l}</button>`).join('')}</div>`;
 h+=dateField('recv','RECEIVED ON',R.recv,pastAnchors(),'past')+`</div>`;
 if(!R.type)return[h+`<div class="note info" style="margin-top:22px"><span class="ni">NEXT</span><span>Pick the response and the rest of the form fits it.</span></div>`,[],false,'Save response'];
 const reqAnch=futureWeeks(R.recv,[['1w','In a week',7],['2w','In two weeks',14],['4w','In four weeks',28]]);
 if(R.type==='partial'){
  h+=`<div class="sec" data-t="What they asked for" data-s="${(R.syn?'Synopsis, ':'')+sampleName(R.s)}"><p class="sech">What they asked for</p><p class="secs">Most requests are the opening pages; some want a later section.</p>`+sampleBlock('F.resp.s',R.s,false);
  h+=`<div class="tgl${R.syn?' on':''}" onclick="F.resp.syn=!F.resp.syn;render()"><span class="bx">${R.syn?'✓':''}</span><b>A synopsis too</b></div>`;
  h+=`<div class="sline"><b>${R.syn?'Synopsis and ':''}${sampleName(R.s)[0].toUpperCase()+sampleName(R.s).slice(1)}</b><span>${sampleApprox(R.s)}</span></div></div>`}
 if(R.type==='rr')h+=`<div class="sec" data-t="What they'd like revised" data-s=""><p class="sech">What they'd like revised</p><textarea class="fta" placeholder="Their notes, in your words or theirs.">${F._note||''}</textarea></div>`;
 if(['partial','full','rr'].includes(R.type)){
  const anch=reqAnch.concat([{k:'none',label:'No date given',d:null}]);
  h+=`<div class="sec" data-t="${R.type==='rr'?'When you\'ll resubmit by':'When you\'ll send it by'}" data-s="${R.sendByMode==='none'?'No date given':'By '+fmt(R.sendBy)}"><p class="sech">${R.type==='rr'?'When you\'ll resubmit':'When you\'ll send it'}</p>`;
  const none=R.sendByMode==='none';
  h+=dateField('sendBy',R.type==='rr'?'RESUBMIT BY':'SEND BY',none?null:R.sendBy,anch,'future','',none?'none':null);
  if(!none){const rem=[['2d','Two days before'],['1d','The day before'],['0','On the day'],['no','No reminder']];
   h+=`<div class="fl">REMIND ME</div><div class="chips">${rem.map(([k,l])=>`<button class="chip${R.remind===k?' on':''}" onclick="F.resp.remind='${k}';render()">${l}</button>`).join('')}</div>`}
  else h+=`<div class="note info"><span class="ni">TIP</span><span>Agents who don't set a date still notice speed. We'll put “Send the ${R.type==='full'?'full':'pages'}” on your to-do for <b>${fmt(offWeekend(add(TODAY,3)))}</b>, so it doesn't drift.</span></div>`;
  h+=`</div>`}
 if(R.type==='pass'){h+=`<div class="sec" data-t="Feedback" data-s="${R.fb==='form'?'Form rejection':'A personal note'}"><div class="fl">FEEDBACK</div><div class="chips">${[['form','Form rejection'],['personal','A personal note']].map(([k,l])=>`<button class="chip${R.fb===k?' on':''}" onclick="F.resp.fb='${k}';render()">${l}</button>`).join('')}</div>`;
  if(R.fb==='personal')h+=`<div class="fl">WHAT THEY SAID</div><textarea class="fta" placeholder="Worth keeping — patterns across passes show up in Analytics.">${F._note||''}</textarea>`;
  h+=`</div>`}
 if(R.type==='offer'){const others=ACTIVE().filter(x=>x!==q);
  h+=`<div class="sec" data-t="The offer" data-s="Answer by ${fmt(R.offerBy)}"><p class="sech">The offer</p>`+dateField('offerBy','THEY\'D LIKE AN ANSWER BY',R.offerBy,futureWeeks(R.recv,[['1w','In a week',7],['2w','In two weeks',14]]),'future');
  h+=`<div class="tgl${R.notify?' on':''}" style="margin-top:16px" onclick="F.resp.notify=!F.resp.notify;render()"><span class="bx">${R.notify?'✓':''}</span><b>Tell the others who have it</b><small>${others.length} AGENTS</small></div>`;
  h+=`<div class="note info"><span class="ni">WHY</span><span>It's standard to let every agent still considering <b>Murphy's Day Out</b> know you have an offer, with your deadline. We'll add one to-do per agent: ${others.map(x=>AG[x.ag].first).join(', ')}.</span></div></div>`}
 // saves
 const lab={partial:'Partial requested',full:'Full requested',rr:'Revise & resubmit',pass:'Passed',offer:'Offer'}[R.type];
 saves.push([`${a.n} → <b style="font-family:var(--machine);font-weight:400">${lab}</b>, ${fmt(R.recv)}`,COL[lab]||'var(--stone)']);
 if(R.type==='partial')saves.push([`Request logged: ${R.syn?'synopsis and ':''}${sampleName(R.s)}`]);
 if(['partial','full','rr'].includes(R.type)){
  if(R.sendByMode==='none')saves.push([`“Send the ${R.type==='full'?'full':'pages'}” on your to-do for ${fmt(offWeekend(add(TODAY,3)))}`,'var(--blush)']);
  else{saves.push([`Your move, due ${fmt(R.sendBy)} — it joins “Your move” in the Query Centre`]);
   if(R.remind!=='no'){const off={'2d':-2,'1d':-1,'0':0}[R.remind];saves.push([`Reminder on ${fmt(add(R.sendBy,off))}`,'var(--blush)'])}}
  if(q.nudgePlan)saves.push([`Your planned nudge (${fmt(q.nudgePlan)}) is cancelled — they've replied`])}
 if(late)saves.push([`The query reopens${q.st==='Closed'?' — the “'+(q.tl[0][2]||'closed').toLowerCase()+'” ending is replaced, so Analytics counts the reply':''}`]);
 if(R.type==='pass')saves.push([`Query closed as passed. ${a.first} stays on your contact list, marked as queried for this book`,'var(--stone)']);
 if(R.type==='offer'){saves.push([`Offer deadline ${fmt(R.offerBy)} pinned to the top of your dashboard`]);if(R.notify)saves.push([`${ACTIVE().length-1} “Tell them about the offer” to-dos, due ${fmt(offWeekend(add(TODAY,1)))}`,'var(--blush)'])}
 return[h,saves,true,'Save response']}
```

Header `RECORD A RESPONSE` / `Record a response`. Steps depend on the type:
- all: 1 `The response` (summary `{label} · {fmt}` / `Choose one`)
- partial: + `What they asked for` + `When you'll send it by`
- full: + `When you'll send it by`
- rr: + `What they'd like revised` + `When you'll resubmit by`
- pass: + `Feedback`
- offer: + `The offer`
- review `Check and save`.

Copy: late reply note `LATE REPLY` (warn) `This query was recorded as passed|closed on {fmt}[ ({ending lowercased})]. Recording a reply reopens it[ and replaces that ending].`; `WHAT DID {FIRST} SAY?` chips `Partial requested` · `Full requested` · `Revise & resubmit` · `Pass` · `Offer`; `RECEIVED ON`; before a type: `NEXT` — `Pick the response and the rest of the form fits it.` Partial: sub `Most requests are the opening pages; some want a later section.`, toggle `A synopsis too`. R&R: textarea placeholder `Their notes, in your words or theirs.` Send-by: `SEND BY` / `RESUBMIT BY`, anchors `In a week` / `In two weeks` (default) / `In four weeks` from the received date, plus `No date given`; `REMIND ME` chips `Two days before` (default) · `The day before` · `On the day` · `No reminder`; with no date: `TIP` — `Agents who don't set a date still notice speed. We'll put “Send the full|pages” on your to-do for **{fmt(offWeekend(today+3))}**, so it doesn't drift.` Pass: `FEEDBACK` chips `Form rejection` · `A personal note`; `WHAT THEY SAID` placeholder `Worth keeping — patterns across passes show up in Analytics.` Offer: `THEY'D LIKE AN ANSWER BY` anchors `In a week` / `In two weeks`; toggle `Tell the others who have it` / `{N} AGENTS`; `WHY` — `It's standard to let every agent still considering **Murphy's Day Out** know you have an offer, with your deadline. We'll add one to-do per agent: {firsts joined ', '}.`

This flow has **no guards** — nothing blocks, nothing checks (the review is always sage "Ready to save" once a type is chosen).

WHEN YOU SAVE: `{Agent} → **{Label}**, {fmt}` (status colour; label `Passed` for pass) · partial: `Request logged: [synopsis and ]{sample}` · with date: `Your move, due {fmt} — it joins “Your move” in the Query Centre` and `Reminder on {fmt}` (blush) · no date: `“Send the full|pages” on your to-do for {fmt}` (blush) · planned nudge: `Your planned nudge ({fmt}) is cancelled — they've replied` · late: `The query reopens[ — the “{ending}” ending is replaced, so Analytics counts the reply]` · pass: `Query closed as passed. {first} stays on your contact list, marked as queried for this book` (stone) · offer: `Offer deadline {fmt} pinned to the top of your dashboard` and `{N} “Tell them about the offer” to-dos, due {fmt(offWeekend(today+1))}` (blush).

Button `Save response`. Toast `{Label} · {Agent}` / `SEND BY {DD MON}[ · PLANNED NUDGE CANCELLED]` | `ANSWER BY {DD MON}` | `CLOSED AS PASSED`. The new timeline entry's note: partial `[Synopsis, ]{sample}[ · send by {d Mon}]`, offer `answer by {d Mon}`, else empty.

### 3.12 JOURNEY — Nudge (`mode 'nudge'`) — L955–1037 verbatim

```js
/* NUDGE */
function nudgeRec(q,a){const past=diff(TODAY,q.window);
 if(past<0)return{tab:'plan',rec:'plan',why:`Too early — ${a.first}'s window closes ${rel(q.window)}`};
 if(q.nudges.length)return{tab:'sent',rec:'close',why:`You've already nudged ${a.first} once`};
 if(a.nrmn)return{tab:'sent',rec:'close',why:`${a.first}'s guidelines say no reply means no`};
 return{tab:'sent',rec:'sent',why:`${a.first}'s window closed ${past===0?'today':rel(q.window)}`}}
function soFar(q,a,extra){const past=diff(TODAY,q.window),fs=!!q.fullSent;
 if(['Partial requested','Full requested','Revise & resubmit'].includes(q.st)){const ev=q.tl.find(e=>e[0]===q.st);const sb=q.sendBy||add(TODAY,7);
  const pts=[{l:'Queried',d:q.sent,c:'done'},{l:q.st,d:ev?ev[1]:TODAY,c:'done'},...(extra||[]),{l:'Send by',d:sb,c:'fut'}].sort((x,y)=>x.d-y.d);
  if(!extra)pts.push({l:'Today',d:TODAY,c:'today'});return track(pts.sort((x,y)=>x.d-y.d))}
 const pts=[...(fs?[{l:'Queried',d:q.sent,c:'done'}]:[]),{l:fs?(q.sentLabel||'Full sent'):'Queried',d:q.fullSent||q.sent,c:'done'},{l:past>=0?'Window closed':'Window closes',d:q.window,c:past>=0?'done':'fut'},...q.nudges.map(n=>({l:'Nudged',d:n,c:'nudge'})),...(extra||[])].sort((x,y)=>x.d-y.d);
 if(!extra&&diff(TODAY,pts[pts.length-1].d)>0)pts.push({l:'Today',d:TODAY,c:'today'});
 return track(pts)}
function renderNudge(q,a){const N=F.nudge;let h='',saves=[];
 const past=diff(TODAY,q.window),rc=nudgeRec(q,a);
 const nudgedN=q.nudges.length;const last=nudgedN?q.nudges[nudgedN-1]:null;
 // 1 · where it stands
 const paths=[['sent','I’ve sent a nudge','Record it, and plan what happens if it’s still quiet'],['plan','Remind me to send one','Put it on your to-do list for the right day']];
 if(rc.rec==='close'||past>=28)paths.push(['close','Close it instead','If it’s time to move on']);
 const lab={sent:'Logging a nudge',plan:'Reminder to nudge'}[N.tab];
 h+=`<div class="sec" data-t="Where it stands" data-s="${lab}">`;
 const clk=k=>k==='close'?"F.mode='close';F.step=0;F._jump=true;render()":`F.nudge.tab='${k}';render()`;
 const ws=document.body.dataset.ws||'A';
 const el=diff(TODAY,q.fullSent||q.sent),win=Math.round(diff(q.window,q.fullSent||q.sent));const fs=!!q.fullSent;const startL=fs?'Full sent':'Queried';const wksN=Math.round(win/7);
 const winTxt=past>0?`closed ${past===1?'yesterday':rel(q.window)}`:past===0?'closes today':`closes ${rel(q.window)}`;
 const nudTxt=nudgedN?`you nudged on ${fmt(last)}`:`you haven't nudged yet`;
 const plannedNote=q.nudgePlan?`<div class="note info"><span class="ni">PLANNED</span><span>You planned to nudge on <b>${fmt(q.nudgePlan)}</b>.</span></div>`:'';
 const radios=()=>`<div class="rads">${paths.map(([k,t,d])=>`<button class="rad${N.tab===k?' on':''}" onclick="${clk(k)}"><i></i><span><b>${t}</b><small>${d}</small></span>${rc.rec===k?'<em>SUGGESTED</em>':''}</button>`).join('')}</div>`;
 const why=`<div class="why"><em>SUGGESTED</em> ${rc.why}.</div>`;
 if(ws==='A'){ // timeline
  const pts=[...(fs?[{l:'Queried',d:q.sent,c:'done'}]:[]),{l:startL,d:q.fullSent||q.sent,c:'done'},{l:past>=0?'Window closed':'Window closes',d:q.window,c:past>=0?'done':'fut'},...q.nudges.map(n=>({l:'Nudged',d:n,c:'nudge'}))].sort((x,y)=>x.d-y.d);
  if(diff(TODAY,pts[pts.length-1].d)>0)pts.push({l:'Today',d:TODAY,c:'today'});
  h+=`<div class="plan wsA"><h5>SO FAR</h5>${track(pts)}</div>`;
  h+=`<p class="wsl">${a.first}'s ${wksN}-week window ${winTxt}, and ${nudTxt}.</p>`+plannedNote;
  h+=`<div class="fl">WHAT WOULD YOU LIKE TO DO?</div>`+radios();
 }
 if(ws==='B'){ // sentence
  h+=`<p class="story">${fs?`You sent ${a.first} the full manuscript`:`You queried ${a.first}`} <u>${el} days ago</u>. ${a.first}'s ${wksN}-week ${fs?'reading ':''}window ${past>0?`closed <u>${past===1?'yesterday':rel(q.window)}</u>`:past===0?'closes <u>today</u>':`closes <u>${rel(q.window)}</u>`}${nudgedN?`, and you nudged on <u>${fmt(last)}</u>`:''}.${a.nrmn?' Their guidelines say no reply means no.':''}</p>`+plannedNote;
  h+=why+`<span class="seg wide big">${paths.filter(p=>p[0]!=='close').map(([k,t])=>`<span class="${N.tab===k?'on':''}" onclick="${clk(k)}">${t}</span>`).join('')}</span>`;
  if(paths.some(p=>p[0]==='close'))h+=`<p class="orclose">or <a onclick="${clk('close')}">close the query instead</a></p>`;
 }
 if(ws==='C'){ // ledger
  const rows=[['Queried',fmt(q.sent),`${diff(TODAY,q.sent)} days ago`,''],...(fs?[['Full sent',fmt(q.fullSent),`${el} days ago`,'']]:[]),[fs?'Reading window':'Reply window',`${wksN} weeks · ${fmt(q.window)}`,past>0?`${past} days over`:past===0?'today':rel(q.window),past>=0?'hot':''],['Nudges',nudgedN?`${nudgedN} · last ${fmt(last)}`:'None yet','',''],['Their guidelines',a.nrmn?'No reply means no':'They reply to everyone','','']];
  if(q.nudgePlan)rows.push(['Planned',`Nudge on ${fmt(q.nudgePlan)}`,rel(q.nudgePlan),'']);
  h+=`<div class="ledger">${rows.map(([k,v,r,c])=>`<div class="${c}"><b>${k}</b><span>${v}</span><small>${r}</small></div>`).join('')}</div>`;
  h+=`<div class="fl">WHAT WOULD YOU LIKE TO DO?</div><div class="chips">${paths.map(([k,t])=>`<button class="chip${N.tab===k?' on':''}" onclick="${clk(k)}">${t}</button>`).join('')}</div>`+why;
 }
 if(ws==='D'){ // progress bar
  const span=Math.max(win,el)*1.12;const wp=win/span*100,ep=Math.min(el/span*100,100);
  h+=`<div class="pbar"><div class="ptop"><b>Day ${el}</b><span>${wksN}-WEEK ${fs?'READING ':''}WINDOW = ${win} DAYS</span></div>
   <div class="pb"><i class="in" style="width:${Math.min(ep,wp)}%"></i>${el>win?`<i class="ov" style="left:${wp}%;width:${ep-wp}%"></i>`:''}<i class="wl" style="left:${wp}%"></i>${q.nudges.map(n=>`<i class="nd" style="left:${diff(n,q.fullSent||q.sent)/span*100}%"></i>`).join('')}<i class="now" style="left:${ep}%"></i></div>
   <div class="pleg"><span>${up(q.fullSent||q.sent)} · ${fs?'FULL SENT':'QUERIED'}</span><span style="left:${wp}%">${up(q.window)} · WINDOW</span></div>
   <p>${el>win?`<b>${el-win} days past</b> ${a.first}'s window`:el===win?`${a.first}'s window closes <b>today</b>`:`<b>${win-el} days left</b> in ${a.first}'s window`} · ${nudgedN?`nudged ${fmt(last)}`:'no nudges yet'}</p></div>`+plannedNote;
  h+=`<div class="fl">WHAT WOULD YOU LIKE TO DO?</div>`+radios();
 }
 h+=`</div>`;
 const ear=past<0?fa('check',`Earlier than ${a.first}'s window — it closes ${fmt(q.window)}`):nudgedN?fa('check',`A second nudge — you last nudged ${fmt(last)}`):a.nrmn?fa('check',`${a.first}'s guidelines say no reply means no`):'';
 if(N.tab==='sent'){
  const bad=diff(N.sent,q.sent)<0?fa('block','That date is before you queried'):ear;
  h+=`<div class="sec"${bad} data-t="The nudge" data-s="${fmt(N.sent)} · ${N.via}">`+dateField('nSent','NUDGED ON',N.sent,pastAnchors(),'past');
  h+=`<div class="fl">VIA</div><div class="chips">${['Email','QueryManager','Online form'].map(v=>`<button class="chip${N.via===v?' on':''}" onclick="F.nudge.via='${v}';render()">${v}</button>`).join('')}</div>`;
  h+=`<div class="fl">WHAT YOU SAID · OPTIONAL</div><textarea class="fta" placeholder="Paste it in if you want it on the record.">${F._note||''}</textarea></div>`}
 if(N.tab==='sent'){
  h+=`<div class="sec" data-t="If it's still quiet" data-s="Consider closing ${fmt(N.then)}"><p class="secs">A nudge usually gets an answer within a month, or never.</p>`;
  h+=dateField('nThen','CONSIDER CLOSING ON',N.then,futureWeeks(N.sent,[['2w','In two weeks',14],['4w','In four weeks',28],['6w','In six weeks',42]]).map(x=>x.k==='4w'?{...x,label:'In four weeks · usual'}:x),'future');
  h+=`<div class="plan"><h5>THE PLAN<span class="tk">┆ TODAY</span></h5>${track([{l:'Queried',d:q.sent,c:'done'},{l:past>=0?'Window closed':'Window closes',d:q.window,c:past>=0?'done':'fut'},...q.nudges.map(n=>({l:'Nudged',d:n,c:'nudge'})),{l:nudgedN?'Nudged again':'Nudged',d:N.sent,c:'nudge'},{l:'Consider closing',d:N.then,c:'close'}].sort((x,y)=>x.d-y.d))}</div></div>`;
  saves.push([`<b style="font-family:var(--machine);font-weight:400">Nudge sent</b> to ${a.n}, ${fmt(N.sent)}, via ${N.via}`,'var(--blush)']);
  saves.push([`The overdue flag clears; the row reads “Nudged ${up(N.sent)}”`]);
  saves.push([`“Consider closing” lands on your to-do on ${fmt(N.then)}`,'var(--stone)']);
  if(q.nudgePlan)saves.push([`Your planned reminder for ${fmt(q.nudgePlan)} is done — it comes off your to-do`]);
  return[h,saves,true,'Log nudge']}
 // plan
 const anchors=nudgeAnchors(q);
 const hit=anchors.find(x=>x.k===N.whenMode);if(hit&&!same(hit.raw||hit.d,hit.d))DFSHIFT.nWhen='MOVED OFF THE WEEKEND';
 const early=diff(N.when,q.window)<0?fa('check',`Before ${a.first}'s window closes on ${fmt(q.window)}`):'';
 h+=`<div class="sec"${early} data-t="When to nudge" data-s="${fmt(N.when)}"><p class="secs">${past>=0?'The window has passed, so any day from now is fair.':'Most agents say to wait until the window closes, then give it a week.'}</p>`;
 h+=dateField('nWhen','REMIND ME ON',N.when,anchors,'future');
 if(diff(N.when,q.window)<0)h+=`<div class="note warn"><span class="ni">EARLY</span><span>That's before ${a.first}'s window closes on ${fmt(q.window)}. An early nudge can read as impatient.</span></div>`;
 h+=`<div class="plan"><h5>THE PLAN<span class="tk">┆ TODAY</span></h5>${track([{l:'Queried',d:q.sent,c:'done'},{l:past>=0?'Window closed':'Window closes',d:q.window,c:past>=0?'done':'fut'},{l:'Nudge',d:N.when,c:'nudge'},{l:'Consider closing',d:add(N.when,28),c:'close',s:'4 WKS ON'}].sort((x,y)=>x.d-y.d))}</div></div>`;
 saves.push([`“Nudge ${a.first}” on your to-do for ${fmt(N.when)} — tapping it opens this drawer, ready to log the nudge`,'var(--blush)']);
 saves.push([`The row reads “Nudge planned ${up(N.when)}” until then, instead of overdue`]);
 saves.push([`If they reply first, the reminder cancels itself`]);
 return[h,saves,true,'Schedule nudge']}
```

Header `NUDGE` / `Nudge`. **Suggestion rule** (`nudgeRec`): window not yet closed → suggest `plan`, why `Too early — {first}'s window closes {rel}`; already nudged → suggest `close`, `You've already nudged {first} once`; nrmn → suggest `close`, `{first}'s guidelines say no reply means no`; else suggest `sent`, `{first}'s window closed {today|rel}`. The opening tab is `plan` when too early, else `sent` (even when close is suggested). (`rc.why` only renders in variants B/C; in A only the `SUGGESTED` tag on the radio shows.)

Steps (sent): `Where it stands` · `The nudge` · `If it's still quiet` · `Check and log`. Steps (plan): `Where it stands` · `When to nudge` · `Check and schedule`.

Where it stands (variant A): `SO FAR` track (Queried/Full sent, `Window closed|Window closes`, each `Nudged`, `Today` if later than all); sentence `{first}'s {N}-week window {closed yesterday|closed {rel}|closes today|closes {rel}}, and {you nudged on {fmt}|you haven't nudged yet}.`; `PLANNED` (info) `You planned to nudge on **{fmt}**.`; `WHAT WOULD YOU LIKE TO DO?` radios `I’ve sent a nudge` / `Record it, and plan what happens if it’s still quiet` · `Remind me to send one` / `Put it on your to-do list for the right day` · (only if close suggested or ≥28 days past the window) `Close it instead` / `If it’s time to move on` — which switches the drawer to the Close flow in place. Summary `Logging a nudge` / `Reminder to nudge`.

Guards: The nudge — block `That date is before you queried`; else check `Earlier than {first}'s window — it closes {fmt}` | `A second nudge — you last nudged {fmt}` | `{first}'s guidelines say no reply means no`. When to nudge — check `Before {first}'s window closes on {fmt}`.

The nudge: `NUDGED ON`; `VIA` chips; `WHAT YOU SAID · OPTIONAL` placeholder `Paste it in if you want it on the record.` If it's still quiet: sub `A nudge usually gets an answer within a month, or never.`; `CONSIDER CLOSING ON` anchors `In two weeks` / `In four weeks · usual` (default) / `In six weeks` from the nudge date. When to nudge: sub `The window has passed, so any day from now is fair.` / `Most agents say to wait until the window closes, then give it a week.`; `REMIND ME ON`; `EARLY` (warn) `That's before {first}'s window closes on {fmt}. An early nudge can read as impatient.` Plan: … `Nudged again`/`Nudged`, `Consider closing`; or `Nudge`, `Consider closing` (`4 WKS ON`).

WHEN YOU SAVE (sent): `**Nudge sent** to {Agent}, {fmt}, via {via}` (blush) · `The overdue flag clears; the row reads “Nudged {DD MON}”` · `“Consider closing” lands on your to-do on {fmt}` (stone) · `Your planned reminder for {fmt} is done — it comes off your to-do`. (plan): `“Nudge {first}” on your to-do for {fmt} — tapping it opens this drawer, ready to log the nudge` (blush) · `The row reads “Nudge planned {DD MON}” until then, instead of overdue` · `If they reply first, the reminder cancels itself`.

Buttons `Log nudge` / `Schedule nudge`. Toasts `Nudge logged · {Agent}` / `CONSIDER CLOSING {DD MON}`; `Nudge planned · {Agent}` / `REMINDER ON {DD MON}`.

### 3.13 JOURNEY — Close (`mode 'close'`) — L1138–1182 verbatim

```js
/* CLOSE */
const WHY={noreply:['No reply','The window has passed and it’s gone quiet'],said:['They said no','A pass is a response — we’ll record it as one'],withdraw:['I’m withdrawing','You’re taking it off their desk'],gone:['They’ve stopped taking queries','Closed to queries, or left the agency']};
function renderClose(q,a){const C=F.close;let h='',saves=[];
 const past=diff(TODAY,q.window),owe=['Partial requested','Full requested','Revise & resubmit'].includes(q.st);
 const sug=past>0&&!owe?'noreply':null;
 // 1 · where it stands + why
 h+=`<div class="sec"${C.why?'':fa('block','Choose why it’s closing')} data-t="Where it stands" data-s="${C.why?WHY[C.why][0]:'Choose a reason'}">`;
 h+=`<div class="plan wsA"><h5>SO FAR</h5>${soFar(q,a)}</div>`;
 h+=owe?`<p class="wsl">${a.first} asked for the ${q.st==='Full requested'?'full manuscript':q.st==='Partial requested'?'partial':'revision'}, and it's due by ${fmt(q.sendBy||add(TODAY,7))}.</p>`:`<p class="wsl">${a.first}'s ${Math.round(diff(q.window,q.fullSent||q.sent)/7)}-week window ${past>0?`closed ${rel(q.window)}`:past===0?'closes today':`closes ${rel(q.window)}`}${q.nudges.length?`, and you nudged on ${fmt(q.nudges[q.nudges.length-1])}`:''}.</p>`;
 if(owe)h+=`<div class="note warn"><span class="ni">YOUR MOVE</span><span>${a.first} is waiting on you. Closing drops the request — if you're not sending it, it's courteous to let ${a.first} know.</span></div>`;
 h+=`<div class="fl">WHY IS IT CLOSING?</div><div class="rads">${Object.entries(WHY).filter(([k])=>!(owe&&k==='noreply')).map(([k,[t,d]])=>`<button class="rad${C.why===k?' on':''}" onclick="${k==='said'?"F.mode='resp';F.resp.type='pass';F.step=1;F._jump=true;render()":`F.close.why='${k}';render()`}"><i></i><span><b>${t}</b><small>${d}</small></span>${sug===k?'<em>SUGGESTED</em>':k==='said'?'<em class="go">RECORD A PASS →</em>':''}</button>`).join('')}</div></div>`;
 if(!C.why)return[h,[],true,'Close query'];
 // 2 · details
 const early=C.why==='noreply'&&past<0?fa('check',`${a.first}'s window doesn't close until ${fmt(q.window)}`):'';
 const bad=diff(C.on,q.sent)<0?fa('block','That date is before you queried'):early;
 const anch=pastAnchors();if(C.why==='noreply'&&past>0)anch.push({k:'win',label:'When the window closed',d:q.window,sub:`${q.window.getDate()} ${MON[q.window.getMonth()]}`});
 const detT={noreply:'Calling it',withdraw:'Withdrawing',gone:'Their status'}[C.why];
 let ds=fmt(C.on);if(C.why==='withdraw')ds=({offer:'Offer elsewhere',revise:'Revising the book',other:'Other reason'})[C.wd]+' · '+ds;
 h+=`<div class="sec"${bad} data-t="${detT}" data-s="${ds}">`;
 if(C.why==='noreply'){
  h+=dateField('closeOn','CLOSED ON',C.on,anch,'past');
  h+=`<div class="note info"><span class="ni">FOR THE RECORD</span><span>${diff(C.on,q.fullSent||q.sent)} days of silence${q.nudges.length?` and ${q.nudges.length===1?'one nudge':q.nudges.length+' nudges'}`:''}. Analytics counts this as “no reply”, not a pass.</span></div>`}
 if(C.why==='withdraw'){
  h+=`<div class="fl">WHY</div><div class="chips">${[['offer','An offer elsewhere'],['revise','I’m revising the book'],['other','Something else']].map(([k,l])=>`<button class="chip${C.wd===k?' on':''}" onclick="F.close.wd='${k}';render()">${l}</button>`).join('')}</div>`;
  if(C.wd==='offer')h+=`<div class="note info"><span class="ni">TIP</span><span>Recording the offer on that agent's query sets up “tell the others” for every agent at once — including ${a.first}.</span></div>`;
  h+=dateField('closeOn','WITHDRAWN ON',C.on,anch,'past');
  h+=`<div class="tgl${C.told?' on':''}" style="margin-top:16px" onclick="F.close.told=!F.close.told;render()"><span class="bx">${C.told?'✓':''}</span><b>I’ve told ${a.first}</b></div>`;
  if(!C.told)h+=`<div class="tgl${C.remindTell?' on':''}" onclick="F.close.remindTell=!F.close.remindTell;render()"><span class="bx">${C.remindTell?'✓':''}</span><b>Remind me to tell ${a.first}</b><small>TOMORROW</small></div>`}
 if(C.why==='gone'){
  h+=dateField('closeOn','CLOSED ON',C.on,anch,'past');
  h+=`<div class="fl">CHECK BACK ON ${a.first.toUpperCase()}</div><div class="chips">${[['3m','In 3 months'],['6m','In 6 months'],['no','No need']].map(([k,l])=>`<button class="chip${C.recheck===k?' on':''}" onclick="F.close.recheck='${k}';render()">${l}</button>`).join('')}</div>`;
  h+=`<p class="secs" style="margin-top:8px">A reminder to see whether they've reopened, or where they've moved to.</p>`}
 h+=`<div class="fl">NOTE · OPTIONAL</div><textarea class="fta" placeholder="A line for future you.">${F._note||''}</textarea>`;
 h+=`<div class="plan"><h5>THE RECORD<span class="tk">┆ TODAY</span></h5>${soFar(q,a,[{l:'Closed',d:C.on,c:'close'}])}</div></div>`;
 // saves
 const rsn={noreply:'no reply',withdraw:'withdrawn',gone:'closed to queries'}[C.why];
 saves.push([`Query closed · ${rsn} · ${fmt(C.on)}`,'var(--stone)']);
 saves.push([`It leaves your active queries and the Birds-eye view; the full history stays on the query`]);
 if(q.nudgePlan)saves.push([`Your planned nudge (${fmt(q.nudgePlan)}) comes off your to-do`]);
 if(q.closePlan)saves.push([`“Consider closing” (${fmt(q.closePlan)}) is done — it comes off your to-do`]);
 if(owe)saves.push([`The ${q.st.toLowerCase()} is dropped from “Your move”`]);
 if(C.why==='withdraw'&&!C.told&&C.remindTell)saves.push([`“Tell ${a.first} you've withdrawn” on your to-do for ${fmt(offWeekend(add(TODAY,1)))}`,'var(--blush)']);
 if(C.why==='gone'&&C.recheck!=='no')saves.push([`“Check on ${a.first}” on your to-do in ${C.recheck==='3m'?'3':'6'} months`,'var(--blush)']);
 saves.push([`${a.first} stays on your Contact list, marked as queried for Murphy's Day Out — free to query with your next book`]);
 return[h,saves,true,'Close query']}
```

Header `CLOSE QUERY` / `Close query`. Steps: `Where it stands` · `Calling it` | `Withdrawing` | `Their status` · `Check and close`. Before a reason: step 1 carries block `Choose why it’s closing` (summary `Choose a reason`) and is the only step.

Reasons (`WHY?`): `No reply` / `The window has passed and it’s gone quiet` (hidden when material is owed; `SUGGESTED` when past the window and nothing owed — and pre-selected on open, L717) · `They said no` / `A pass is a response — we’ll record it as one` (tag `RECORD A PASS →`; clicking switches to Record a response, type Pass, step 2) · `I’m withdrawing` / `You’re taking it off their desk` · `They’ve stopped taking queries` / `Closed to queries, or left the agency`.

Owed-material copy: `{first} asked for the full manuscript|partial|revision, and it's due by {fmt}.` + `YOUR MOVE` (warn) `{first} is waiting on you. Closing drops the request — if you're not sending it, it's courteous to let {first} know.` Otherwise `{first}'s {N}-week window {…}[, and you nudged on {fmt}].`

Details: guards block `That date is before you queried`; check (no reply, window open) `{first}'s window doesn't close until {fmt}`. Anchors add `When the window closed` for no-reply past the window. No reply: `CLOSED ON`; `FOR THE RECORD` (info) `{N} days of silence[ and one nudge|N nudges]. Analytics counts this as “no reply”, not a pass.` Withdraw: `WHY` chips `An offer elsewhere` (default) · `I’m revising the book` · `Something else`; offer tip `TIP` `Recording the offer on that agent's query sets up “tell the others” for every agent at once — including {first}.`; `WITHDRAWN ON`; toggles `I’ve told {first}` and (if not) `Remind me to tell {first}` / `TOMORROW`. Gone: `CLOSED ON`; `CHECK BACK ON {FIRST}` chips `In 3 months` (default) · `In 6 months` · `No need`; `A reminder to see whether they've reopened, or where they've moved to.` All: `NOTE · OPTIONAL` placeholder `A line for future you.`; `THE RECORD` plan with `Closed`. Summary for withdraw `{Offer elsewhere|Revising the book|Other reason} · {fmt}`.

WHEN YOU SAVE: `Query closed · {no reply|withdrawn|closed to queries} · {fmt}` (stone) · `It leaves your active queries and the Birds-eye view; the full history stays on the query` · `Your planned nudge ({fmt}) comes off your to-do` · `“Consider closing” ({fmt}) is done — it comes off your to-do` · `The {status lower} is dropped from “Your move”` · `“Tell {first} you've withdrawn” on your to-do for {fmt}` (blush) · `“Check on {first}” on your to-do in 3|6 months` (blush) · `{first} stays on your Contact list, marked as queried for Murphy's Day Out — free to query with your next book`.

Button `Close query`. Toast `Query closed · {Agent}` / `AGENT STAYS ON YOUR CONTACT LIST`. Timeline entry `Query closed` with note `No reply` / `Withdrawn` / `Closed to queries`.

### 3.14 JOURNEY — I've sent it (`mode 'matsent'`, "sent what they asked for") — L1039–1083 verbatim

```js
/* SENT WHAT THEY ASKED FOR */
function renderMatSent(q,a){const M=F.ms;let h='',saves=[];
 const kind=q.st==='Full requested'?'full':q.st==='Revise & resubmit'?'rr':'partial';
 const reqOn=(q.tl.find(e=>e[0]===q.st)||[0,TODAY])[1];const due=q.sendBy||add(TODAY,7);
 const what=kind==='full'?'the full manuscript':kind==='rr'?'a revised manuscript':(q.req?`the ${sampleName(q.req.s)}`:'a partial');
 // 1 · the request
 h+=`<div class="sec" data-t="The request" data-s="${kind==='partial'&&q.req?sampleName(q.req.s):kind==='full'?'Full manuscript':'Revision'} · due ${fmt(due)}">`;
 h+=`<div class="plan wsA"><h5>SO FAR</h5>${soFar(q,a)}</div>`;
 const left=diff(due,TODAY);
 h+=`<p class="wsl">${a.first} asked for ${what} on ${fmt(reqOn)}. ${left>0?`It's due by ${fmt(due)}, ${rel(due)}.`:left===0?`It's due <b>today</b>.`:`It was due ${fmt(due)}, ${rel(due)}.`}</p></div>`;
 // 2 · what you're sending
 let f2='';
 if(kind==='partial'&&q.req){const r=q.req.s,m=M.s;if(r.unit!==m.unit||r.amt!==m.amt||!!r.sect!==!!m.sect)f2=fa('check',`${a.first} asked for the ${sampleName(r)} — you're sending ${m.sect?'':'the '}${sampleName(m)}`)}
 h+=`<div class="sec"${f2} data-t="What you're sending" data-s="${kind==='partial'?(M.syn?'Synopsis and ':'')+sampleName(M.s):kind==='full'?'Full manuscript · '+M.ver:'Revised manuscript · '+M.ver}">`;
 if(kind==='partial'){h+=sampleBlock('F.ms.s',M.s,false);
  h+=`<div class="tgl${M.syn?' on':''}" onclick="F.ms.syn=!F.ms.syn;render()"><span class="bx">${M.syn?'✓':''}</span><b>A synopsis too</b><small>${M.syn?'V2 · CURRENT':''}</small></div>`;
  h+=`<div class="sline"><b>${M.syn?'Synopsis and ':''}${sampleName(M.s)}</b><span>${sampleApprox(M.s)}</span></div>`;
  if(!f2&&q.req)h+=`<div class="note ok"><span class="ni">MATCH</span><span>Matches what ${a.first} asked for.</span></div>`;
  else if(f2)h+=`<div class="note warn"><span class="ni">CHECK</span><span>${a.first} asked for the ${sampleName(q.req.s)}. <a onclick="F.ms.s=structuredClone(Q[cur].req.s);render()">Match the request</a></span></div>`}
 else{const vers=kind==='rr'?[['v5','Draft 5','Your revision · new'],['v4','Draft 4','The version they read']]:[['v4','Draft 4','Current · 50,000 words'],['v3','Draft 3','48,200 words']];
  h+=`<div class="fl">WHICH VERSION</div><div class="rads">${vers.map(([k,t,d])=>`<button class="rad${M.ver===k?' on':''}" onclick="F.ms.ver='${k}';render()"><i></i><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>`;
  h+=`<div class="tgl${M.syn?' on':''}" style="margin-top:12px" onclick="F.ms.syn=!F.ms.syn;render()"><span class="bx">${M.syn?'✓':''}</span><b>A synopsis too</b></div>`;
  if(kind==='rr')h+=`<div class="fl">WHAT YOU CHANGED · OPTIONAL</div><textarea class="fta" placeholder="A few lines on the revision, for your own record.">${F._note||''}</textarea>`;
  if(kind==='rr'&&M.ver==='v4')h+=`<div class="note warn"><span class="ni">CHECK</span><span>That's the version ${a.first} has already read.</span></div>`}
 h+=`</div>`;
 // 3 · sent
 const bad=diff(M.sent,reqOn)<0?fa('block','That date is before they asked'):diff(M.sent,due)>0?fa('check',`That's after the ${fmt(due)} deadline`):'';
 h+=`<div class="sec"${bad} data-t="Sending it" data-s="${fmt(M.sent)} · ${M.via}">`+dateField('msSent','SENT ON',M.sent,pastAnchors(),'past');
 h+=`<div class="fl">VIA</div><div class="chips">${['Email','QueryManager','Online form'].map(v=>`<button class="chip${M.via===v?' on':''}" onclick="F.ms.via='${v}';render()">${v}</button>`).join('')}</div></div>`;
 // 4 · reading window
 const wk=kind==='partial'?[6,8,10]:[8,12,16];
 const ex=wk.map((w,i)=>({k:'w'+i,label:i===1?`Usual for a ${kind==='partial'?'partial':'full'} · ${w} wks`:`${w} wks`,d:add(M.sent,w*7)}));ex.forEach(x=>x.sub=`${x.d.getDate()} ${MON[x.d.getMonth()]}`);
 if(M.expMode!=='custom'){const x=ex.find(z=>z.k===M.expMode)||ex[1];M.exp=x.d;M.expMode=x.k}
 h+=`<div class="sec" data-t="Reading window" data-s="Reply by ${fmt(M.exp)}"><p class="secs">${kind==='partial'?'Partials':'Full manuscripts'} usually take longer than queries. We'll restart the clock from the day you sent it.</p>`;
 h+=dateField('msExp','REPLY EXPECTED BY',M.exp,ex,'future');
 h+=`<div class="fl">IF THEY DON'T REPLY BY THEN</div><div class="chips">${[['nudge','Remind me to nudge'],['nothing','Do nothing']].map(([k,l])=>`<button class="chip${M.ifNo===k?' on':''}" onclick="F.ms.ifNo='${k}';render()">${l}</button>`).join('')}</div>`;
 const nd=M.ifNo==='nudge'?offWeekend(add(M.exp,7)):null;
 const lab=kind==='full'?'Full sent':kind==='rr'?'Resubmitted':'Partial sent';
 h+=`<div class="plan"><h5>THE PLAN<span class="tk">┆ TODAY</span></h5>${track([{l:'Queried',d:q.sent,c:'done'},{l:'Requested',d:reqOn,c:'done'},{l:lab,d:M.sent,c:'done'},{l:'Reply due',d:M.exp,c:'fut'},...(nd?[{l:'Nudge',d:nd,c:'nudge'}]:[])].sort((x,y)=>x.d-y.d))}</div></div>`;
 saves.push([`${a.n} → <b style="font-family:var(--machine);font-weight:400">${lab}</b>, ${fmt(M.sent)}, via ${M.via}`,COL[lab]]);
 saves.push([`It leaves “Your move” — the ball's in ${a.first}'s court again`]);
 saves.push([`Reply expected by ${fmt(M.exp)}`]);
 if(nd)saves.push([`“Nudge ${a.first}” lands on your to-do on ${fmt(nd)}`,'var(--blush)']);
 saves.push([`Your “send by ${fmt(due)}” reminder comes off your to-do`]);
 return[h,saves,true,'Log it']}
```

Header `SENT WHAT THEY ASKED FOR` / `I’ve sent it`. Steps: `The request` · `What you're sending` · `Sending it` · `Reading window` · `Check and log`.

Copy: `{first} asked for {the {sample}|the full manuscript|a revised manuscript|a partial} on {fmt}. It's due by {fmt}, {rel}.` / `It's due **today**.` / `It was due {fmt}, {rel}.`; partial: sample block + `A synopsis too` (`V2 · CURRENT`) + summary line + `MATCH` `Matches what {first} asked for.` or `CHECK` `{first} asked for the {sample}.` link `Match the request`. Full/R&R: `WHICH VERSION` radios full `Draft 4` / `Current · 50,000 words` (default v4), `Draft 3` / `48,200 words`; R&R `Draft 5` / `Your revision · new`, `Draft 4` / `The version they read`; `A synopsis too`; R&R `WHAT YOU CHANGED · OPTIONAL` placeholder `A few lines on the revision, for your own record.`; R&R + v4 → `CHECK` `That's the version {first} has already read.` Sending: `SENT ON`, `VIA`. Reading window: sub `Partials|Full manuscripts usually take longer than queries. We'll restart the clock from the day you sent it.`; `REPLY EXPECTED BY` anchors partial 6/8/10 wks, full 8/12/16 wks, middle labelled `Usual for a partial|full · {w} wks` (default); `IF THEY DON'T REPLY BY THEN` `Remind me to nudge` · `Do nothing` (nudge = expected + 7, weekend-shifted).

Guards: What you're sending — check `{first} asked for the {req sample} — you're sending [the ]{sample}`. Sending it — block `That date is before they asked`; check `That's after the {fmt} deadline`.

WHEN YOU SAVE: `{Agent} → **{Partial sent|Full sent|Resubmitted}**, {fmt}, via {via}` (sage) · `It leaves “Your move” — the ball's in {first}'s court again` · `Reply expected by {fmt}` · `“Nudge {first}” lands on your to-do on {fmt}` (blush) · `Your “send by {fmt}” reminder comes off your to-do`. Button `Log it`. Toast `{Label} · {Agent}` / `REPLY EXPECTED {DD MON}`. NB R&R versions and synopsis are not guarded: R&R on v4 is a note, not a check.

### 3.15 JOURNEY — Offer (`mode 'offer'`) — L1085–1123 verbatim

```js
/* OFFER */
function renderOffer(q,a){const O=F.of;let h='',saves=[];
 const others=Q.filter(x=>x!==q&&LIVE(x)&&x.st!=='Offer'||(x!==q&&x.st==='Offer'));
 const left=diff(q.offerBy,TODAY);
 // 1 · the offer
 h+=`<div class="sec" data-t="The offer" data-s="Answer by ${fmt(q.offerBy)}">`;
 h+=`<div class="plan wsA"><h5>SO FAR</h5>${track([{l:'Queried',d:q.sent,c:'done'},{l:'Full sent',d:q.fullSent,c:'done'},{l:'Offer',d:q.offerOn,c:'done'},{l:'Today',d:TODAY,c:'today'},{l:'Answer by',d:q.offerBy,c:'fut'}])}</div>`;
 h+=`<p class="wsl">${a.first} offered on ${fmt(q.offerOn)}. You said you'd answer by ${fmt(q.offerBy)} — <b>${left} days</b> from now.</p></div>`;
 // 2 · the others
 const R={wait:'Waiting',full:'Wants the full',aside:'Stepped aside',offer:'Offered too'};
 others.forEach(x=>{if(!O.others[x.id])O.others[x.id]={told:false,reply:'wait'}});
 const told=others.filter(x=>O.others[x.id].told).length;
 const f2=told<others.length?fa('check',`${others.length-told} of ${others.length} still to be told`):'';
 h+=`<div class="sec"${f2} data-t="The others" data-s="${told} of ${others.length} told">`;
 h+=`<p class="secs">Everyone still considering <b>Murphy's Day Out</b> should hear about the offer and your deadline. Tick them off as you tell them, and note what they say.</p>`;
 h+=`<div class="othr">${others.map(x=>{const o=O.others[x.id],g=AG[x.ag];return`<div class="oth"><div class="ot"><span class="av">${g.i}</span><span><b>${g.n}</b><small>${x.st.toUpperCase()} · ${g.a.toUpperCase()}</small></span><button class="told${o.told?' on':''}" onclick="F.of.others['${x.id}'].told=!F.of.others['${x.id}'].told;render()">${o.told?'✓ Told':'Mark as told'}</button></div>${o.told?`<div class="seg wide sm">${Object.entries(R).map(([k,l])=>`<span class="${o.reply===k?'on':''}" onclick="F.of.others['${x.id}'].reply='${k}';render()">${l}</span>`).join('')}</div>`:''}</div>`}).join('')}</div>`;
 const wantFull=others.filter(x=>O.others[x.id].reply==='full'),rival=others.filter(x=>O.others[x.id].reply==='offer');
 if(wantFull.length)h+=`<div class="note info"><span class="ni">NEXT</span><span>${wantFull.map(x=>AG[x.ag].first).join(' and ')} ${wantFull.length>1?'want':'wants'} the full — we'll add “Send the full” to your to-do for today.</span></div>`;
 if(rival.length)h+=`<div class="note ok"><span class="ni">ANOTHER OFFER</span><span>${rival.map(x=>AG[x.ag].first).join(' and ')} offered too. Record it on ${rival.length>1?'their queries':'their query'} so you can compare.</span></div>`;
 h+=`</div>`;
 // 3 · the call
 h+=`<div class="sec" data-t="The call" data-s="${({none:'Not arranged',booked:'Booked · '+fmt(O.callOn),done:'Had the call'})[O.call]}"><p class="secs">Most agents offer a call to talk through the book and how they work. Optional.</p>`;
 h+=`<span class="seg wide">${[['none','Not arranged'],['booked','Booked'],['done','Had the call']].map(([k,l])=>`<span class="${O.call===k?'on':''}" onclick="F.of.call='${k}';render()">${l}</span>`).join('')}</span>`;
 if(O.call==='booked')h+=dateField('ofCall','CALL ON',O.callOn,futureWeeks(TODAY,[['1d','Tomorrow',1],['2d','In two days',2],['1w','In a week',7]]),'future');
 if(O.call==='done')h+=`<div class="fl">NOTES FROM THE CALL · OPTIONAL</div><textarea class="fta" placeholder="What they said about the book, edits, their list, how they work.">${F._note||''}</textarea>`;
 h+=`</div>`;
 // 4 · decision
 const dF=O.dec==='accept'&&told<others.length?fa('check','Not everyone has been told about the offer yet'):'';
 h+=`<div class="sec"${dF} data-t="Your decision" data-s="${({wait:'Still deciding',accept:'Accepting',decline:'Declining'})[O.dec]}">`;
 h+=`<div class="rads">${[['wait','Still deciding','Save your progress — nothing closes'],['accept',`Accept ${a.first}'s offer`,`${a.first} becomes your agent`],['decline',`Decline ${a.first}'s offer`,'This query closes as offer declined']].map(([k,t,d])=>`<button class="rad${O.dec===k?' on':''}" onclick="F.of.dec='${k}';render()"><i></i><span><b>${t}</b><small>${d}</small></span></button>`).join('')}</div>`;
 const wd=others.filter(x=>O.withdraw[x.id]!==false);
 if(O.dec==='accept'){h+=`<div class="fl">WITHDRAW FROM EVERYONE ELSE<span class="r">${wd.length} OF ${others.length}</span></div><div class="othr">${others.map(x=>{const g=AG[x.ag],on=O.withdraw[x.id]!==false;return`<div class="tgl${on?' on':''}" onclick="F.of.withdraw['${x.id}']=${on?'false':'true'};render()"><span class="bx">${on?'✓':''}</span><b>${g.n}</b><small>${x.st.toUpperCase()}</small></div>`}).join('')}</div>`;
  h+=`<div class="tgl${O.remindTell?' on':''}" style="margin-top:14px" onclick="F.of.remindTell=!F.of.remindTell;render()"><span class="bx">${O.remindTell?'✓':''}</span><b>Remind me to tell each of them</b></div>`}
 if(O.dec==='decline')h+=`<div class="note info"><span class="ni">FOR THE RECORD</span><span>${a.first} stays on your Contact list. Declining an offer is recorded as your decision, not a pass.</span></div>`;
 h+=`<div class="plan"><h5>${O.dec==='wait'?'WHAT\'S AHEAD':'THE RECORD'}<span class="tk">┆ TODAY</span></h5>${track(O.dec==='wait'?[{l:'Offer',d:q.offerOn,c:'done'},...(O.call==='booked'?[{l:'Call',d:O.callOn,c:'fut'}]:[]),{l:'Answer by',d:q.offerBy,c:'fut'}].sort((x,y)=>x.d-y.d):[{l:'Queried',d:q.sent,c:'done'},{l:'Full sent',d:q.fullSent,c:'done'},{l:'Offer',d:q.offerOn,c:'done'},{l:O.dec==='accept'?'Signed':'Declined',d:TODAY,c:O.dec==='accept'?'done':'close'}])}</div></div>`;
 if(O.dec==='wait'){saves.push([`Progress saved: ${told} of ${others.length} told${O.call==='booked'?`, call on ${fmt(O.callOn)}`:''}`]);if(wantFull.length)saves.push([`“Send the full” on your to-do for ${wantFull.map(x=>AG[x.ag].first).join(' and ')}`,'var(--blush)']);saves.push([`“Answer ${a.first}” stays pinned to your dashboard until ${fmt(q.offerBy)}`])}
 if(O.dec==='accept'){saves.push([`<b style="font-family:var(--machine);font-weight:400">Signed</b> — ${a.n} becomes your agent for Murphy's Day Out`,'var(--offer)']);saves.push([`${wd.length} other ${wd.length===1?'query closes':'queries close'} as “withdrawn — accepted an offer”`,'var(--stone)']);if(O.remindTell&&wd.length)saves.push([`${wd.length} “Tell them you've signed” to-dos, due ${fmt(offWeekend(add(TODAY,1)))}`,'var(--blush)']);saves.push([`Every planned nudge and reminder for this book comes off your to-do`])}
 if(O.dec==='decline'){saves.push([`Query closes · offer declined · ${fmt(TODAY)}`,'var(--stone)']);saves.push([`Your other queries carry on as they were`])}
 return[h,saves,true,({wait:'Save progress',accept:'Accept offer',decline:'Decline offer'})[O.dec]]}
```

Header `OFFER OF REPRESENTATION` / `The offer`. Steps: `The offer` · `The others` · `The call` · `Your decision` · `Check and save|accept|decline`.

Copy: `{first} offered on {fmt}. You said you'd answer by {fmt} — **{N} days** from now.`; others sub `Everyone still considering **Murphy's Day Out** should hear about the offer and your deadline. Tick them off as you tell them, and note what they say.`; each other: `{name}` / `{STATUS} · {AGENCY}` + `Mark as told` ↔ `✓ Told`; once told, seg `Waiting` · `Wants the full` · `Stepped aside` · `Offered too`. Notes: `NEXT` (info) `{A and B} want(s) the full — we'll add “Send the full” to your to-do for today.`; `ANOTHER OFFER` (ok) `{A} offered too. Record it on their query|their queries so you can compare.` Call: sub `Most agents offer a call to talk through the book and how they work. Optional.`; seg `Not arranged` · `Booked` · `Had the call`; `CALL ON` anchors `Tomorrow` / `In two days` / `In a week`; `NOTES FROM THE CALL · OPTIONAL` placeholder `What they said about the book, edits, their list, how they work.` Decision radios `Still deciding` / `Save your progress — nothing closes` · `Accept {first}'s offer` / `{first} becomes your agent` · `Decline {first}'s offer` / `This query closes as offer declined`. Accept: `WITHDRAW FROM EVERYONE ELSE` / `{n} OF {N}` + a toggle per other (default all on), `Remind me to tell each of them`. Decline: `FOR THE RECORD` `{first} stays on your Contact list. Declining an offer is recorded as your decision, not a pass.` Plan `WHAT'S AHEAD` (Offer, Call, Answer by) or `THE RECORD` (Queried, Full sent, Offer, Signed/Declined).

Guards: The others — check `{n} of {N} still to be told`. Your decision — check (accept only) `Not everyone has been told about the offer yet`. Summaries: `Answer by {fmt}`; `{told} of {N} told`; `Not arranged` / `Booked · {fmt}` / `Had the call`; `Still deciding` / `Accepting` / `Declining`.

WHEN YOU SAVE (wait): `Progress saved: {told} of {N} told[, call on {fmt}]` · `“Send the full” on your to-do for {firsts}` (blush) · `“Answer {first}” stays pinned to your dashboard until {fmt}`. (accept): `**Signed** — {Agent} becomes your agent for Murphy's Day Out` (offer blue) · `{n} other query closes|queries close as “withdrawn — accepted an offer”` (stone) · `{n} “Tell them you've signed” to-dos, due {fmt}` (blush) · `Every planned nudge and reminder for this book comes off your to-do`. (decline): `Query closes · offer declined · {fmt}` (stone) · `Your other queries carry on as they were`.

Buttons `Save progress` / `Accept offer` / `Decline offer`. Toasts `Offer progress saved · {Agent}` / `ANSWER BY {DD MON}`; `Signed with {Agent}` / `{n} OTHER QUERIES WITHDRAWN`; `Offer declined · {Agent}` / `YOUR OTHER QUERIES CARRY ON`. Timeline entries `Offer call` (`booked`), `Offer accepted`, `Offer declined`; withdrawn others get `Query closed` / `Withdrawn — accepted an offer`.

### 3.16 JOURNEY — Correct the record (`mode 'edit'`, from a Tracking row's `Edit`) — L1125–1136 verbatim

```js
/* EDIT AN ENTRY */
function renderEdit(q,a){const E=F.edit;let h='',saves=[];const ev=q.tl[E.k];
 const newer=E.k>0?q.tl[E.k-1][1]:TODAY,older=E.k<q.tl.length-1?q.tl[E.k+1][1]:null;
 const bad=diff(E.d,newer)>0?fa('block',`It must be on or before ${fmt(newer)}${E.k>0?`, when “${q.tl[E.k-1][0]}” happened`:''}`):older&&diff(E.d,older)<0?fa('block',`It must be on or after ${fmt(older)}, when “${q.tl[E.k+1][0]}” happened`):'';
 const anch=[{k:'orig',label:'As recorded',d:E.orig,sub:`${E.orig.getDate()} ${MON[E.orig.getMonth()]}`}];
 h+=`<div class="sec"${bad} data-t="${ev[0]}" data-s="${fmt(E.d)}${same(E.d,E.orig)?'':' · was '+fmt(E.orig)}">`;
 h+=`<p class="secs">Correct the date or the note. The query's plan and reminders are worked out again from the new date.</p>`;
 h+=dateField('edDate','DATE',E.d,anch,'past');
 h+=`<div class="fl">NOTE</div><textarea class="fta">${F._note||''}</textarea></div>`;
 if(!same(E.d,E.orig))saves.push([`“${ev[0]}” moves from ${fmt(E.orig)} to ${fmt(E.d)}`]);
 saves.push([`Dates worked out from it — reply expected, nudge reminders — move with it`]);
 return[h,saves,true,'Save correction']}
```

Header `CORRECT THE RECORD` / `Edit an entry`. Steps: `{entry name}` (summary `{fmt}[ · was {fmt(orig)}]`) · `Check and save`. Sub `Correct the date or the note. The query's plan and reminders are worked out again from the new date.` `DATE` with one anchor `As recorded {d Mon}` (past-only calendar); `NOTE` textarea (prefilled, no placeholder). Guards (block): `It must be on or before {fmt}[, when “{newer entry}” happened]` (newer = the next-newer entry's date, else today) / `It must be on or after {fmt}, when “{older entry}” happened`. WHEN YOU SAVE: `“{entry}” moves from {fmt} to {fmt}` (only if moved) · `Dates worked out from it — reply expected, nudge reminders — move with it`. Button `Save correction`. Toast `Entry corrected · {Agent}` / `NOTE UPDATED` or `{ENTRY UPPER} NOW {DD MON}`. Editing `Queried` also shifts `q.window` by the same number of days.

### 3.17 Save, commit, undo toast, keyboard — L1237–1286 verbatim

```js
/* ---------- save ---------- */
let UNDO=null,tTimer=null,tDeadline=0,tLeft=0;
function save(){const sv=$('mSave');if(sv.classList.contains('busy'))return;sv.classList.add('busy');sv.textContent=F.mode==='log'?'Logging':'Saving';
 setTimeout(commit,420*K())}
function commit(){const q=cur!==null?Q[cur]:null;let msg='',sub='',hit=null,kind='changed';
 const snap=structuredClone(Q);
 if(F.mode==='log'){const L=F.log,a=AG[L.ag];const nq={_new:true,id:'q'+Date.now(),ag:L.ag,st:'Queried',sent:L.sent,nudges:[],tl:[['Queried',L.sent,(L.pkg!=='custom'?PKGS.find(p=>p.k===L.pkg).n+' package: ':'')+pkgName(L.mat)+(Q.find(q=>q.ag===L.ag&&!LIVE(q))?' · requery':''),true]]};nq.window=L.expect;if(L.ifNo==='nudge')nq.nudgePlan=L.nudgeDate;Q.unshift(nq);hit=nq.id;kind='arrive';msg=`Query logged · ${a.n}`;sub=L.ifNo==='nudge'?`NUDGE REMINDER ${up(L.nudgeDate)} ADDED TO YOUR TO-DO`:`REPLY EXPECTED ${up(L.expect)}`}
 if(F.mode==='resp'&&q&&q.st==='Closed'&&q.tl[0][0]==='Query closed')q.tl.shift();
 if(F.mode==='resp'&&q){const R=F.resp,lab={partial:'Partial requested',full:'Full requested',rr:'Revise & resubmit',pass:'Passed',offer:'Offer'}[R.type];
  q.tl.unshift([lab,R.recv,R.type==='partial'?`${R.syn?'Synopsis, ':''}${sampleName(R.s)}${R.sendByMode!=='none'?` · send by ${R.sendBy.getDate()} ${MON[R.sendBy.getMonth()]}`:''}`:R.type==='offer'?`answer by ${R.offerBy.getDate()} ${MON[R.offerBy.getMonth()]}`:'',true]);
  const hadPlan=q.nudgePlan;q.st=lab;q.sendBy=R.sendByMode==='none'?offWeekend(add(TODAY,3)):R.sendBy;q.nudgePlan=null;hit=q.id;msg=`${lab} · ${AG[q.ag].n}`;sub=['partial','full','rr'].includes(R.type)?`SEND BY ${up(q.sendBy)}${hadPlan?' · PLANNED NUDGE CANCELLED':''}`:R.type==='offer'?`ANSWER BY ${up(R.offerBy)}`:'CLOSED AS PASSED'}
 if(F.mode==='nudge'&&q){const N=F.nudge;hit=q.id;if(N.tab==='sent'){q.nudges.push(N.sent);q.tl.unshift(['Nudge sent',N.sent,N.via,true]);q.nudgePlan=null;q.closePlan=N.then;msg=`Nudge logged · ${AG[q.ag].n}`;sub=`CONSIDER CLOSING ${up(N.then)}`}
  else{q.nudgePlan=N.when;msg=`Nudge planned · ${AG[q.ag].n}`;sub=`REMINDER ON ${up(N.when)}`}}
 if(F.mode==='close'&&q){q.tl.unshift(['Query closed',F.close.on,({noreply:'No reply',withdraw:'Withdrawn',gone:'Closed to queries'})[F.close.why],true]);q.closePlan=null;q.st='Closed';q.nudgePlan=null;hit=q.id;msg=`Query closed · ${AG[q.ag].n}`;sub='AGENT STAYS ON YOUR CONTACT LIST'}
 if(F.mode==='matsent'&&q){const M=F.ms;const kind=q.st==='Full requested'?'full':q.st==='Revise & resubmit'?'rr':'partial';const lab=kind==='full'?'Full sent':kind==='rr'?'Resubmitted':'Partial sent';
  q.tl.unshift([lab,M.sent,kind==='partial'?`${M.syn?'Synopsis, ':''}${sampleName(M.s)}`:(kind==='rr'?'Revised manuscript ':'Full manuscript ')+M.ver,true]);q.st=lab;q.fullSent=M.sent;q.sentLabel=lab;q.window=M.exp;q.nudgePlan=M.ifNo==='nudge'?offWeekend(add(M.exp,7)):null;q.sendBy=null;hit=q.id;msg=`${lab} · ${AG[q.ag].n}`;sub=`REPLY EXPECTED ${up(M.exp)}`}
 if(F.mode==='offer'&&q){const O=F.of;q.others=O.others;q.call=O.call;hit=q.id;
  if(O.call==='booked'&&q.call!=='booked-logged'){q.tl.unshift(['Offer call',O.callOn,'booked',true])}
  if(O.dec==='wait'){msg=`Offer progress saved · ${AG[q.ag].n}`;sub=`ANSWER BY ${up(q.offerBy)}`}
  if(O.dec==='accept'){q.st='Signed';q.tl.unshift(['Offer accepted',TODAY,'',true]);let n=0;Q.forEach(x=>{if(x!==q&&LIVE(x)&&O.withdraw[x.id]!==false){x.tl.unshift(['Query closed',TODAY,'Withdrawn — accepted an offer']);x.st='Closed';x.nudgePlan=null;n++}});msg=`Signed with ${AG[q.ag].n}`;sub=`${n} OTHER QUERIES WITHDRAWN`}
  if(O.dec==='decline'){q.st='Closed';q.tl.unshift(['Offer declined',TODAY,'',true]);msg=`Offer declined · ${AG[q.ag].n}`;sub='YOUR OTHER QUERIES CARRY ON'}}
 if(F.mode==='edit'&&q){const e=q.tl[F.edit.k];const was=e[1];e[1]=F.edit.d;e[2]=F._note!==undefined?F._note:e[2];e[3]=true;if(e[0]==='Queried'){q.sent=F.edit.d;q.window=add(q.window,diff(F.edit.d,was))}hit=q.id;msg=`Entry corrected · ${AG[q.ag].n}`;sub=same(was,F.edit.d)?'NOTE UPDATED':`${e[0].toUpperCase()} NOW ${up(F.edit.d)}`}
 if(F.mode==='log'){LASTLOG={sent:F.log.sent,via:F.log.via,pkg:F.log.pkg,mat:structuredClone(F.log.mat)}}else LASTLOG=null;
 const fc=fromCard,cardAt=cur;
 UNDO={snap,hit,kind,fc,msg};
 document.body.classList.remove('s-drawer');F=null;$('mSave').classList.remove('busy');
 const land=()=>{rows();const el=document.querySelector(`.qrow[data-id="${hit}"]`);if(el){el.classList.add(kind);el.scrollIntoView({block:'nearest',behavior:document.body.classList.contains('rm')?'auto':'smooth'})}};
 if(fc){document.body.classList.remove('s-docked');setTimeout(()=>{openCard(Q.findIndex(x=>x.id===hit));rows()},200*K())}
 else{document.body.classList.remove('s-dim','s-card','s-docked');setTimeout(land,160*K())}
 showToast(msg,sub,true)}
function showToast(msg,sub,undoable){const t=$('toast');clearTimeout(tTimer);$('tAgain').style.display=LASTLOG&&undoable?'':'none';
 $('tMsg').textContent=msg;$('tSub').textContent=sub||'';t.classList.toggle('done',!undoable);
 const dur=(undoable?8000:2200)*K();t.style.setProperty('--dur',dur+'ms');
 t.classList.remove('on');void t.offsetWidth;t.classList.add('on');
 $('tView').onclick=()=>{const x=Q.findIndex(q=>q.id===(UNDO&&UNDO.hit));hideToast(true);if(x>=0)openCard(x)};
 tLeft=dur;tDeadline=Date.now()+dur;tTimer=setTimeout(()=>hideToast(),dur)}
function hideToast(keep){$('toast').classList.remove('on');clearTimeout(tTimer);if(!keep)UNDO=null}
function toastPause(p){if(!$('toast').classList.contains('on'))return;if(p){clearTimeout(tTimer);tLeft=tDeadline-Date.now()}else{tDeadline=Date.now()+tLeft;tTimer=setTimeout(()=>hideToast(),tLeft)}}
function undo(){if(!UNDO)return;const U=UNDO;UNDO=null;
 const cardOpen=document.body.classList.contains('s-card');
 const restore=()=>{Q.splice(0,Q.length,...U.snap);rows();const el=document.querySelector(`.qrow[data-id="${U.hit}"]`);if(el)el.classList.add('undone');
  if(cardOpen){const x=Q.findIndex(q=>q.id===U.hit);if(x>=0)openCard(x);else closeCard()}};
 const el=document.querySelector(`.qrow[data-id="${U.hit}"]`);
 if(U.kind==='arrive'&&el){el.classList.remove('arrive');el.classList.add('leave');setTimeout(restore,280*K())}else restore();
 showToast('Undone',U.msg.replace(' · ',' — ').toUpperCase(),false)}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'&&UNDO&&$('toast').classList.contains('on')&&!(document.activeElement&&/INPUT|TEXTAREA/.test(document.activeElement.tagName))){e.preventDefault();undo()}});
$('scrim').onclick=()=>{if(document.body.classList.contains('s-drawer'))cancelDrawer();else closeCard()};
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;
 if(F&&F.cal){F.cal=null;render();return}
 if(document.body.classList.contains('s-drawer'))cancelDrawer();else if(document.body.classList.contains('s-card'))closeCard()});
```

- Save: button gets `.busy` (spinner, `Logging`/`Saving`), commits after 420ms × k.
- Toast: ink pill bottom-left. Undoable toasts last **8s** (`--dur`), with an `Undo ⌘Z` (or `CTRL+Z` off Apple platforms) button carrying a 22px countdown ring (circle r 9, `stroke-dasharray:57`, animates `stroke-dashoffset` 0 → 57 linearly over `--dur`); hover pauses both the timer and the ring. Non-undoable (`Undone`) toasts last 2.2s and hide View/Undo (`.toast.done`). `View` opens the affected query's card.
- Undo message: `Undone` / `{original message with the first ' · ' replaced by ' — ', uppercased}` e.g. `QUERY LOGGED — AISHA KAPOOR`.
- Undo restores a snapshot of all queries; an arrived row plays `leave` (280ms) first; the restored row gets `undone` (stone wash, 1.4s).
- ⌘/Ctrl-Z undoes while the toast is on and focus is not in an input/textarea. Escape: closes the calendar → cancels the drawer (which may raise the discard bar) → closes the card. Scrim click: cancels the drawer, else closes the card.
- **Row animations** after a save (non-card saves land 160ms after the drawer closes, row scrolled into view `nearest`, smooth unless reduced motion): `arrive` (height 0→76, 8px drop, 360ms) then `wash` (sand ground with a rust .35 1.5px ring fading to white over 1.8s, starting after 360ms); `changed` = wash + the status and due columns tick in (280ms after 120ms); `leave` (280ms, `--in`); `undone` (stone → white 1.4s). The card timeline's new entry flashes sage over 1.6s (`.ev.new`).

---

## 4. The quill-and-ink illustration

- Embedded as a **base64 WebP data URI** in a JS constant (`const QUILL="data:image/webp;base64,…"`, L546, 34,388 base64 chars) and assigned to `<img id="quill" alt="">` at runtime (L620). Not inline SVG.
- Extracted to `reports/query-actions-v1/quill.webp` — **25,790 bytes, 316 × 400 px, VP8X with an ALPH chunk (real alpha, transparent background)**.
- In the shipped ink header it renders at `height:64px` (≈ 50.6 × 64 CSS px, so ~6× source density — plenty for 2× screens), absolutely positioned in a 56px blush (`#e9c9b8`) disc: `bottom:3px; left:50%; transform:translateX(-46%)`, so it stands in the disc and rises 11px above its top edge (the disc is `overflow:visible`). Disc margin `0 40px 0 0` on the right of the title row.
- Entrance on every open: the disc scales from .6 and fades (`disc`, 280ms after 120ms); the quill "dips" in — from 10px low, rotated −12° around its foot, opacity 0 → rest (`dip`, 360ms after 200ms, `transform-origin: 50% 100%`). The JS restarts both by removing/re-adding `.dip` and resetting the disc's inline animation (L714).

---

## 5. Fonts

Loaded from Google Fonts (L3): `Special Elite`; `Source Serif 4` (opsz 8–60, 400 and 600, italic 400); `JetBrains Mono` 400 and 700.

| token | stack | used for |
|---|---|---|
| `--machine` | `'Special Elite', monospace` | titles and headings (`h2`, `.shd b`), chips, segment options, buttons, date results, radio/tile/toggle titles, review row labels, toast text (the stepper's step labels are mono, not this) |
| `--serif` | `'Source Serif 4', Georgia, serif` | body (`html,body`), notes, secs/sub copy, review values, consequences, textareas |
| `--mono` | `'JetBrains Mono', monospace` | every uppercase eyebrow/label (`.fl`, `.mode`, `.who small`, `.tag`, `.stp em`, `.sum`, `.ni`, `.dres span`, `h5`s, kbd, `.evx u`, `.cdel`) |

Against the app: the app's body sans is Source Sans Pro and its serif is Playfair; the mock's body is Source Serif 4. JetBrains Mono and Special Elite match the app's. Decide before building whether `--serif` maps to Source Serif 4 (a new face for the app) or to an existing token.

---

## 6. Surprises, shortcuts and things not to copy

1. **Heavy selector redefinition** (see §1.0): the file is cumulative (v4 → v11 blocks), and the ink header alone is declared in four places with three different paddings. `.sec .sech {display:none}` silently kills every `<p class="sech">` the render functions write.
2. **Four header formats, three layouts and four nudge "where it stands" variants** are left in; only ink + journey + A are reachable. The nudge `.facts`, `.paths`/`.path`, `.letter`/`.lacts` CSS (v7) is used by no render function at all. `lastWeekday()` is dead; `types` in `renderResp` is dead; L1190 is an empty `if`.
3. **`S(path)` uses `eval`** on strings like `F.log.mat.s` and inline `onclick` strings mutate state (`F.${F.mode}.mat.ql^=1`). Build with real state setters.
4. **`F._note` is one shared string** across every textarea in every flow — switching Nudge→Close in place carries the note across, and the log flow never stores its note in `commit`. A real build needs a field per textarea.
5. **The review verdict says "to fix before this can be *logged*" in every flow**, including Close, Offer and Correct.
6. **Response flow has no guards at all** (e.g. a received date before the query was sent is accepted); matsent R&R-on-v4 is a note, not a check.
7. **Offer "others"** filter reads `x!==q&&LIVE(x)&&x.st!=='Offer'||(x!==q&&x.st==='Offer')` — i.e. every other live query. The response flow's offer count uses `ACTIVE()` (excludes Offer, includes `q`) and subtracts 1 — off by one when recording an offer as a *late* reply on a closed query (q is not in ACTIVE).
8. **Commit on a Pass sets `q.sendBy`** to today+3 (weekend-shifted) — harmless in the mock, wrong as data.
9. **Close pre-selects "No reply"** whenever the window has passed and nothing is owed (L717), so the block on step 1 never appears in that case — the step is pre-answered but still marked `SUGGESTED · NOT OPENED` until visited.
10. **"They said no" and "Close it instead" switch flows in place** (mode change without re-opening), so the header title/mode change under the user; the step resets (resp jumps to step 2 = index 1).
11. **The discard confirmation exists only for Log a query** (and only after an agent is picked); every other flow discards silently on Cancel/Escape/scrim.
12. **Apostrophes are inconsistent and are copy**: the row sub-line is `MURPHY'S DAY OUT` (straight), the card header `MURPHY’S DAY OUT` (curly); step titles mix `If they don't reply` (straight) with `Choose why it’s closing` (curly), radios use curly (`I’ve sent a nudge`), `I've sent it` on the card footer is straight while the drawer title `I’ve sent it` is curly. Reproduce verbatim or rule on it — do not normalise by accident.
13. **Toast is `pointer-events:auto` while invisible** (the L380 block overrides L72), so its 520px box intercepts clicks bottom-left even when hidden. Don't copy.
14. **Weekend shift is uneven**: nudge/to-do dates shift; `futureWeeks` anchors (send-by, consider closing, offer answer, call) do not; reply-expected dates do not.
15. The **dock chip and the toast occupy the same spot** (`left:20px; bottom:18px`); the toast's z-index (90) puts it over the dock (46) after a save from the card.
16. The **track label-row algorithm uses a fixed nominal width of 400px** and character-count width estimates, not measured text — labels can still collide on a narrow drawer or with a different font. The drawer is 500px wide with 24px padding and the plan has 18px + 8px insets, so the real track is ~408px.
17. `.stp` has `cursor:default` but every step gets `.go` (`cursor:pointer`) — all steps are clickable once the form is OK.
