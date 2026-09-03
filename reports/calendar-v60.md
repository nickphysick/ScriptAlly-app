# Calendar v60 — design of record pack

## Phase 0 — ref check: **HARD STOP. The ref is absent.**

The pack names `design-refs/timeline-v60.html` and instructs: *"If it is absent or the title
differs, STOP."* It is absent. Nothing was built, and no phase past 0 was attempted.

What was checked, and what each returned:

| Where | Result |
|---|---|
| `design-refs/timeline-v60.html` | **no such file** |
| `~/Downloads/*v60*` | no matches |
| `find ~ -maxdepth 4 -iname "*v60*"` (excl. node_modules/.git) | no matches |
| `~/Desktop`, `~/Desktop/ScriptAlly/` | no HTML ref; screenshots only |
| HTML modified in the repo in the last 2 days | `timeline-v55.html`, `timeline-v58.html` — both already enrolled |

The newest timeline ref that exists anywhere is **v58**:

- `design-refs/timeline-v58.html` — sha256 `128f1d3fed0fbecd8fe2944344ba2f761d946ba0d74f9300eba232fcf64f1218`
- `~/Downloads/timeline-v58.html` — **byte-identical** (same sha256), title `ScriptAlly — Calendar v58 · design of record`

So the only ref on the machine is the one this pack **supersedes and forbids consulting**
(*"v58 is superseded entirely; do not consult it"*). There is no substitute and no partial
ref to work from: every remaining phase in the pack takes its geometry, spacing, type sizes,
layering and behaviour from the absent file, and the pack deliberately carries no pixel numbers
of its own. Guessing them would produce a board that measures against nothing.

**To unblock:** drop `timeline-v60.html` into `~/Downloads` (or straight into `design-refs/`)
and the run picks up at Phase 0 — the enrolment into `.refhashes.json` is one command.

---

## The one thing the ref does not govern — colour tokens (recon, read-only)

The pack's authority split says colour is the **app's** to decide: *"The ref's colours are
approximations typed by hand. Map every one to the app's design tokens by name and use the
token, never the ref's hex."* That half is answerable now and cannot be changed by whatever
the ref turns out to say, so it was surveyed rather than left for a run that will be busy
with geometry. No source was touched.

### Mappings that are certain

| Pack's name | App token | Value | Note |
|---|---|---|---|
| blush / rose (`c98e8a` family) | `STATUS_DOT_MAP[PARTIAL_REQUESTED].base` | `#C98E8A` | **Exact.** The ref's hex *is* the app's Partial Requested base — its author took it from the status palette, so this is not an approximation at all. |
| sand (Gone quiet) | `STATUS_DOT_MAP[NO_RESPONSE].base` | `#C2B6A4` | Exact fit for "faded sand". |
| soft pink | `--pink` / `--pink-b` / `--pink-h` | `#f5e2da` / `#e8c8bc` / `#efd5ca` | The ref's `--pink/--pinkb/--pinkd` trio matches token for token. |
| note yellow | `--note-t` / `--note-b` / `--note-i` | `#faf0c8` / `#ecdda4` / `#7a6420` | Post-it family. (`--postit-note: #f8ecb0` is the flat single-value alternative.) |

### Two mappings that need a decision, not a lookup

**1. "sage" names two different tokens, and one is locked away from this use.**
`index.css:1018` states in as many words: *"StatusDot sage (`--sage`/`--sageC`/`--sageD`) is a
STATUS colour — LOCKED to StatusDots only."* So the agency-held chips and the *With agents*
section header may **not** read `--sage` (`#8a9e88`). The band family is the one to use:
`--sage-band #dce0d9` / `--sage-band-2 #d0d6cc` / `--sage-edge #c8d0c5`. Taking "the app's sage
token" literally reaches for the locked one.

**2. "ink" names three different near-blacks, and the token of that name is the wrong one.**

| Token | Value | Where |
|---|---|---|
| `--btn-ink` | `#1c130f` | the app's one near-black button fill |
| `--ink` | `#241c15` | `:root` |
| `--ink` | `#1e1a16` | `.t-f12` |

The **ref's** `--ink` is `#1c130f` — i.e. the app's `--btn-ink`, *not* the app's `--ink`. The
calendar currently restates that same literal as `--tl-nearblack: #1c130f`, read in 10 places
including two background fills (the active tab, `.tl-sd[data-dot="you"]`). So:

- Reading "ink → the Form 11 token of that name" would silently repaint every card's text
  from `#1c130f` to `#241c15` or `#1e1a16` — 12 units of red, applied to the largest text
  surface on the board, as a side effect of a tidying instruction.
- The honest change is `--tl-nearblack` → `var(--btn-ink)`: same painted value, one owner,
  and it retires a duplicated literal of exactly the kind CLAUDE.md already records costing
  time (two near-blacks one unit apart on the two buttons whose whole point was matching).

Law 1 ("no black") is **not** currently breached: `#1c130f` is the app's own near-black button
ink, not `#000`. The fault is duplication, not hue.

### Also standing

`--tl-pink: #f5e2da` duplicates `--pink` in the calendar's own layer. Same shape as
`--tl-nearblack`: the value is right and the ownership is not. The whole `--tl-*` literal block
is the natural target for the pack's "use the token, never the hex" instruction, and that work
is independent of the ref.

---

## Not attempted, and why

Phases 0.5–8 (measurement worktree, chassis, cards, groups, flags, past stages, tasks,
navigation, locks) all depend on ref geometry. Phase 8's sweep of stale `cal*` cases was also
left alone deliberately: **which** cases are stale depends on what the re-cut keeps, and
retiring a lock before knowing the target board is how coverage shrinks in silence.

**Baseline for the next run** (unchanged from v58e): 29 stale `cal*` measure cases describe the
pre-re-cut board. `datePickerHub` and `mastheadMatrix` reds belong to other sessions — leave them.
