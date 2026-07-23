/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Workbench shell locks (workbench pack Phase 1; ref design-refs/todo-workbench-shell-v1.html,
 * Option B normative). Logic-only test policy → drawer fold, masthead composition, the corner
 * retirement and the panel transplant are pinned at the source/rule-text layer; feel checks are
 * Nick's in-browser list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const shell = readFileSync(join(here, "..", "shell", "AppShell.tsx"), "utf8");

const rule = (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};

describe("Final Shape P2 — THE FILTER RAIL (vertical quiet pills; the squares are extinct)", () => {
  it("248px sticky white panel, locked left; the assembly is 1364", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-asm: 1364px; --tdb-rail: 248px;");
    expect(rule(".tdb-fside")).toContain("width: var(--tdb-rail)");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)");
    expect(page).toContain('<aside className="tdb-fside" aria-label="Filters">');
  });
  it("SHOW: seven vertical pills in the locked order, 34px rows, dot left + count right, zero 40%", () => {
    for (const call of ['railPill("OFFERS", "offers", fc.offers, "p")', 'railPill("AGENT WAITING", "overToYou", fc.overToYou, "p")', 'railPill("MATERIALS", "materials", fc.materials, "lat")', 'railPill("WISH LISTS", "mswl", fc.mswl, "lat")', 'railPill("STALE", "stale", fc.stale, "lat")', 'railPill("SNOOZED", "snoozed", fc.snoozed, "lat")', 'railPill("NOTES", "notes", fc.notes, "y")']) {
      expect(page).toContain(call);
    }
    const order = ["OFFERS", "AGENT WAITING", "MATERIALS", "WISH LISTS", "STALE", "SNOOZED", "NOTES"];
    let last = -1;
    for (const l of order) { const i = page.indexOf(`railPill("${l}"`); expect(i).toBeGreaterThan(last); last = i; }
    expect(rule(".tdb-fpill")).toContain("height: 34px");
    expect(rule(".tdb-fpill.z")).toContain("opacity: 0.4");
    expect(rule(".tdb-fpill .tdb-fn")).toContain("margin-left: auto");
  });
  it("v4 P2: SHOW ALL is the default-selected pill AND the reset; narrowing keeps nar/dim; no RESET row", () => {
    const nar = rule(".tdb-fpill.nar");
    expect(nar).toContain("border-color: #7c3a2a");
    expect(nar).toContain("font-weight: 700");
    expect(page).toContain('className={`tdb-fpill showall${resting ? " sel" : ""}`} aria-pressed={resting} onClick={() => setFilters({ ...DEFAULT_FILTERS })}');
    expect(page).toContain('SHOW ALL<span className="tdb-fn">{fnFace(shownY, searchTotal ?? shownY)}</span>'); // P4: the match total during search
    expect(rule(".tdb-fpill.sel")).toContain("border-color: var(--ink)");
    expect(css).toContain('.tdb-fpill.sel::before { content: "✓"; font-size: 9px; }');
    expect(page).not.toContain("tdb-frst");
    expect(css).not.toContain("tdb-frst");
    // SHOW ALL sits first, directly under the FILTER header
    const sec = page.indexOf('>FILTER{searchActive');
    const sa = page.indexOf("SHOW ALL<span");
    expect(sa).toBeGreaterThan(sec);
    expect(sa).toBeLessThan(page.indexOf('railPill("OFFERS"'));
    expect(page).toContain('>FILTER{searchActive && ('); // P4: the header grows the query chip
  });
  it("v4 P2: Begin focused session leads the rail (same wiring); the foot keeps Task settings only", () => {
    expect(page).toContain('className="tdb-btnp tdb-fsb2" disabled={boardCards.length === 0} onClick={() => setFlow({ items: boardCards.map((card) => ({ kind: "card" as const, card })) })}>▶ Begin focused session</button>'); // the ink primary
    expect(rule(".tdb-btnp")).toContain("height: 42px"); // frame P2: Begin at 42
    const panel = page.slice(page.indexOf("function renderToolbelt"), page.indexOf("function renderRail"));
    expect(panel.indexOf("tdb-fsb2")).toBeLessThan(panel.indexOf(">FILTER{"));
    expect(panel).toContain('className="tdb-setrow"');
  });
  it("the lens below a divider; the same state the search composes with", () => {
    expect(page.indexOf('className="tdb-fdivider"')).toBeLessThan(page.indexOf("TODAY’S LIST<span"));
    expect(page).toContain('aria-pressed={filters.todayOnly} onClick={() => setF("todayOnly", !filters.todayOnly)}');
    expect(page).toContain("matchesSearch(c, search, sctx)");
  });
  it("v4 P5: the foot keeps Task settings ONLY — the Pro square left for the banner", () => {
    expect(page).toContain('className="tdb-setrow" onClick={() => setSettingsOpen(true)}');
    expect(page).toContain('<svg className="tdb-cog" width="20" height="20"'); // frame P3: the bare cog, no roundel
    // the square-era classes stay extinct — bounded so the polish-P3 colleague's distinct
    // names (tdb-prok2 / tdb-progoP) don't false-trip the ban
    for (const stale of [/tdb-prosq/, /tdb-prok(?!2)/, /tdb-progo(?!P)/]) {
      expect(page).not.toMatch(stale);
      expect(css).not.toMatch(stale);
    }
    expect(page).not.toContain("tdb-sq"); // the squares stay extinct
  });
});
describe("P1 — the corner retirement + the AppShell's one out-of-page line", () => {
  it("the FAB, pop-up chrome and fixed settings button are gone from the page", () => {
    expect(page).not.toContain("tdb-fab");
    expect(page).not.toContain("tdb-setbtn");
    expect(page).not.toContain("tdb-pop\"");
    expect(page).not.toContain("todayOpen");
    expect(css).not.toContain(".tdb-fab");
    expect(css).not.toContain(".tdb-setbtn");
    expect(css).not.toMatch(/\.tdb-pop\s*\{/);
  });
  it("the panel is the VI 'Today' card — ref anatomy, same state + handlers", () => {
    expect(page).toContain('<div className="tdb-today2">');
    for (const inner of ["tdb-th", "tdb-thr", "tdb-rollbar", "tdb-tcommit", "tdb-trow", "tdb-ghostbox", "tdb-grow", "tdb-donerow", "tdb-tdone", "tdb-drow", "tdb-tf2", "tdb-btnh", "tdb-btnp sm"]) {
      expect(page).toContain(inner);
    }
    expect(rule(".tdb-th")).not.toContain("hk-sage"); // VI P1: plain paper header, no sage band
    // the add flow survives: Add more / Help me pick / ＋ Add + Work the list, same handlers
    expect(page).toContain(">＋ Add more</button>");
    expect(page).toContain(">Help me pick</button>");
    expect(page).toContain(">＋ Add</button>");
    // evening C2: Work the list is the RITUAL walk (sage whole-walk) over the same committed set
    expect(page).toContain('setFlow({ items: committedCards.map((card) => ({ kind: "card", card })), ritual: true });'); // III P1: review-free by construction, no filter
    expect(page).toContain(">Work the list</button>");
  });
  it("VI P3 reversed the route hide: the FAB shows on /todo with the two-item menu; elsewhere it navigates", () => {
    expect(shell).not.toContain('{routeKey !== "todo" && (');
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
    expect(shell).toContain("Help centre"); // the menu's first item (multi-line JSX)
    expect(shell).toContain('window.dispatchEvent(new CustomEvent("sa:todo-replay-tour"))');
  });
});

describe("v4 P6 — empty-state copy + sweep", () => {
  it("the empty Notes lane shows ONLY the quiet ＋ (no placeholder sentence, repo-wide)", () => {
    expect(page).not.toContain("Nothing jotted yet");
    expect(page).toContain('className="tdb-ghostcard quiet" onClick={addTask} aria-label="Add a note"');
    expect(css).toContain(".tdb-ghostcard.quiet");
  });
  it("no orphan Pro-square / RESET / header-Begin selectors; the tour targets the rail's button", () => {
    for (const stale of ["tdb-prosq", "tdb-frst", "tdb-herorow", "tdb-fsb\""]) {
      expect(page).not.toContain(stale.replace("\\", ""));
      expect(css).not.toContain(stale.replace("\\", ""));
    }
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('sel: ".tdb-fsb2"');
  });
});

describe("frame P2 — THE BUTTON LAW (ink primary + hairline secondaries; the press is retired)", () => {
  it("the primitives: tailored ink (#2a1a13/#1d100c/cream, 600, .02em, 42/34) + two-tone hairlines (34)", () => {
    const p = rule(".tdb-btnp");
    expect(p).toContain("background: #2a1a13");
    expect(p).toContain("border: 1px solid #1d100c");
    expect(p).toContain("color: #f3e7da");
    expect(p).toContain("height: 42px");
    expect(p).toContain("font-weight: 600");
    expect(p).toContain("letter-spacing: 0.02em");
    expect(p).toContain("display: inline-flex");
    expect(css).toContain(".tdb-btnp:hover:not(:disabled) { background: var(--ink); }"); // hover deepens to full ink
    expect(rule(".tdb-btnp.sm")).toContain("height: 34px");
    const h = rule(".tdb-btnh");
    expect(h).toContain("height: 34px");
    expect(h).toContain("border: 1px solid var(--line)");
    expect(h).toContain("color: #6b5a4e");
    expect(h).toContain("font-weight: 600");
    const em = rule(".tdb-btnh.em");
    expect(em).toContain("border-color: var(--ink)");
    expect(em).toContain("font-weight: 700");
  });
  it("assignment audit: ink ONLY for the singular page-level actions; rows/cards never ink-solid", () => {
    expect(page).toContain('className="tdb-btnp tdb-fsb2"'); // Begin (rail)
    expect((page.match(/className="tdb-btnp sm"/g) ?? []).length).toBe(1); // Work the list (Today)
    expect(page).toContain('className="tdb-btnp sm tdb-rvopen2"'); // Open it › (the review banner)
    expect((page.match(/tdb-btnp/g) ?? []).length).toBe(3); // the full ink census — three, nowhere else
    expect(page).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(page).toContain('className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>');
    expect(page).toContain('className="tdb-btnh" onClick={() => toggleToday(c)}');
    expect(page).toContain('className="tdb-btnh" onClick={helpMePick}>＋ Add more</button>');
    // the card verbs adopt the TONES at their own compact geometry — the ink-solid face is dead
    // toolbelt P2/P3: the compact verb family is gone — the card stack rides the law's own
    // hairline primitives at 30px (no ink-solid anywhere in the expansion)
    expect(css).toContain(".tdb-vstack .tdb-btnh { height: 30px; width: 100%; font-size: 10px; }");
    expect(css).not.toContain(".tdb-verb");
  });
  it("fixed heights + centring hold: the Today pair sits level; the toggle's active chip = white + ink ring, shadowless", () => {
    expect(css).toContain(".tdb-tf2 .tdb-btnh, .tdb-tf2 .tdb-btnp { flex: 1; padding: 0; white-space: nowrap; }");
    const on = rule(".tdb-vseg button.on");
    expect(on).toContain("background: var(--white, #fff)");
    expect(on).toContain("border: 1px solid var(--ink)");
    expect(on).not.toContain("box-shadow");
  });
  it("the press is EXTINCT: no offset shadows, no translate steps, no press reduced-motion branch, no cta classes", () => {
    expect(page).not.toContain("tdb-cta");
    expect(css).not.toContain("tdb-cta");
    expect(css).not.toMatch(/box-shadow: [12]px [12]px 0/);
    expect(css).not.toContain("translate(1px, 1px)");
    expect(css).not.toContain("translate(2px, 2px)");
  });
});

describe("doc pass P3 — the document header (the grey toolbar band)", () => {
  it("the band spans the sheet's top on BOTH views: it sits before the view branch, meta left + segment right", () => {
    const head = page.indexOf('className="tdb-dochead"');
    const body = page.indexOf('className="tdb-sheetbody"');
    const branch = page.indexOf('desk === "new-desk"');
    expect(head).toBeGreaterThan(page.indexOf('className="tdb-mainc"'));
    expect(head).toBeLessThan(body);
    expect(body).toBeLessThan(branch); // the branch (cards ⇄ ledger ⇄ desk states) lives inside the body
    expect(page).not.toContain("tdb-sheethead"); // the corner row's container is superseded
    expect(css).not.toContain("tdb-sheethead");
  });
  it("frame P1 — the lighter greys: wash, rule, on-grey meta ink; NO title node in the bar", () => {
    const b = rule(".tdb-dochead");
    expect(b).toContain("background: linear-gradient(180deg, #f4f3f1, #f0eeeb)");
    expect(b).toContain("border-bottom: 1px solid #e5e3de");
    expect(rule(".tdb-bartext")).toContain("color: #4d4238"); // detail P2: the Playfair line took the meta's slot
    expect(page).not.toContain("tdb-doct"); // the centred "To do" idea is dropped
    expect(page).not.toContain(">To do<");
  });
  it("frame P1 — the segment on the paler ground: #faf9f8 track, #dbd9d4 border, 30×22 chips", () => {
    const t = rule(".tdb-vseg");
    expect(t).toContain("background: #faf9f8");
    expect(t).toContain("border: 1px solid #dbd9d4");
    expect(t).toContain("height: 30px");
    expect(rule(".tdb-vseg button")).toContain("height: 22px");
    const on = rule(".tdb-vseg button.on");
    expect(on).toContain("background: var(--white, #fff)");
    expect(on).toContain("border: 1px solid var(--ink)");
    expect(on).not.toContain("box-shadow"); // frame P2: the half-press died with the press
  });
  it("radius continuity WITHOUT overflow:hidden (sticky must survive): the band's own 15px top corners", () => {
    expect(rule(".tdb-dochead")).toContain("border-radius: 15px 15px 0 0");
    expect(rule(".tdb-mainc")).not.toContain("overflow"); // hidden would re-scope the lane headings' sticky
  });
});

describe("frame P4 — sweep", () => {
  it("the press primitives + the roundel are extinct; the tour's review stop targets the rail row", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('".tdb-rvchip"'); // toolbelt P3: the chip is the standing home
    expect(tour).not.toContain("tdb-rvbox");
    expect(tour).not.toContain("tdb-rvrow");
    expect(tour).toContain("or the chip beneath Begin");
    expect(page).not.toContain("tdb-cta");
    expect(css).not.toContain("tdb-cta");
    expect(page).not.toContain("tdb-sic");
    expect(css).not.toContain("tdb-sic");
  });
  it("no tour step references Task settings (recon: none existed — nothing to retarget)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).not.toContain("Task settings");
    expect(tour).not.toContain("tdb-setrow");
  });
});

describe("detail P5 — sweep", () => {
  it("the colleague, the mono meta, the moon/chevron and the chip's cup are all extinct; the banner keeps the big cup", () => {
    for (const dead of ["tdb-shmeta", "tdb-rvcups", "☾", "Snooze or dismiss ▾"]) {
      expect(page).not.toContain(dead);
      expect(css).not.toContain(dead);
    }
    expect(css).not.toMatch(/tdb-pro(?!pill)/); // the colleague family; FocusFlow's propill lives
    expect(page).toContain('className="tdb-rvcupb"'); // the review banner's cup — the asset's remaining user
  });
  it("no tour step touches the bar text or the Pro area (recon: nothing to retarget)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).not.toContain("bartext");
    expect(tour).not.toContain("Showing");
    expect(tour).not.toContain("tdb-colo");
    expect(tour).not.toContain("SCRIPTALLY PRO");
  });
});

describe("detail P3 — ledger Notes parity + the clock snooze", () => {
  it("the ☰ Notes section stands even when EMPTY: the pack's wash, the dashed add-row wired to addTask", () => {
    expect(page).toContain("{(!active || vNt.length > 0) && (");
    expect(page).toContain('<button type="button" className="tdb-laddrow" onClick={addTask}>＋ Add a note</button>');
    expect(page).toContain("{!ledgerFold.nt && (vNt.length > 0 ? vNt.map(runRow) : (");
    const r = rule(".tdb-laddrow");
    expect(r).toContain("border: 1.5px dashed #d9c87a");
    expect(r).toContain("justify-content: center");
    expect(rule(".tdb-lsec.n")).toContain("background: linear-gradient(180deg, #fbf8ec, #f9f5e4)");
    expect(rule(".tdb-lsec.n")).toContain("border-color: #ece2c6");
  });
  it("the clock snooze: the plain outline clock leads the label in BOTH views from the ONE constant; moon + chevron dead", () => {
    // the clock follows TypeGlyph's grammar as a page-scoped sibling — TypeGlyph itself is
    // LOCKED to the three material ComponentTypes (the recon resolution, reported)
    expect(page).toContain('const ClockGlyph: React.FC<{ size?: number }> = ({ size = 13 }) => (');
    expect(page).toContain('<circle cx="12" cy="12" r="9" />');
    expect(page).toContain('<path d="M12 7v5l3.5 2" />');
    expect(page).toContain('stroke="currentColor"');
    expect((page.match(/<ClockGlyph \/>\{VERB_LABELS\.later\}/g) ?? []).length).toBe(3); // the card menu + ledger batch + batch card — one constant, one glyph
    expect(page).toContain('later: "Snooze or dismiss",');
    expect(page).not.toContain("☾");
    expect(page).not.toContain("Snooze or dismiss ▾");
  });
});

describe("toolbelt P3 — sweep", () => {
  it("the short-verb family is extinct in the stylesheet; the tour speaks the new grammar", () => {
    expect(css).not.toContain(".tdb-verb ");
    expect(css).not.toContain(".tdb-verb:");
    expect(css).not.toContain(".tdb-verb.");
    expect(css).not.toContain(".tdb-verbs");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain("Action now, Today\\u2019s list, or snooze"); // the .ts carries the \\u2019 escape
    expect(tour).not.toContain("done, Today, or later");
  });
});

describe("toolbelt P1 — the three-element stack (option C)", () => {
  it("the aside is the transparent 10px stack; Begin + the chip are FREE-STANDING (never children of the filter card)", () => {
    const f = rule(".tdb-fside");
    expect(f).toContain("gap: 10px");
    expect(f).not.toContain("background");
    expect(f).not.toContain("overflow");
    const card = rule(".tdb-fbox");
    expect(card).toContain("background: var(--white, #fff)");
    expect(card).toContain("border-radius: 16px");
    expect(card).toContain("overflow: hidden");
    const belt = page.slice(page.indexOf("function renderToolbelt"), page.indexOf("function renderFilterCard"));
    expect(belt).toContain("tdb-fsb2");
    expect(belt).toContain('className="tdb-rvchip"');
    expect(belt).toContain('<div className="tdb-fbox">{renderFilterCard()}</div>');
    const beginAt = belt.indexOf("tdb-fsb2");
    const chipAt = belt.indexOf("tdb-rvchip");
    const cardAt = belt.indexOf("tdb-fbox");
    expect(beginAt).toBeGreaterThan(-1);
    expect(beginAt).toBeLessThan(chipAt);
    expect(chipAt).toBeLessThan(cardAt); // Begin → chip → the card, siblings in order
  });
  it("Begin free-standing: 44 tall, full width, the soft shadow (the toolbelt bakes 44 over the law's 42)", () => {
    const b = rule(".tdb-fsb2");
    expect(b).toContain("height: 44px");
    expect(b).toContain("width: 100%");
    expect(b).toContain("box-shadow: 0 3px 12px rgba(29, 16, 12, 0.22)");
  });
  it("detail P2 — the +28 air: the work row opens 50 above the three columns (22 + 28)", () => {
    expect(rule(".tdb-ws")).toContain("padding: 50px 0 26px" /* detail P2: +28 air */);
  });
  it("detail P2 — the chip is Begin's EXACT INVERSE: identical geometry, colours swapped; no cup; the dot inline", () => {
    const c = rule(".tdb-rvchip");
    const b = rule(".tdb-btnp");
    // geometry equality with Begin (computed from the two rules)
    for (const decl of ["height: 44px", "justify-content: center", "font-size: 12.5px", "font-weight: 600", "letter-spacing: 0.02em", "line-height: 1", "padding: 0 20px", "border-radius: 99px"]) {
      expect(c).toContain(decl);
      expect(b).toContain(decl.replace("height: 44px", "height: 42px")); // Begin's base is 42; the toolbelt override lifts BOTH to 44
    }
    expect(rule(".tdb-fsb2")).toContain("height: 44px"); // the pair stands at 44 together
    // the colour inversion: cream fill · ink text · the primary's border hex
    expect(c).toContain("background: #f3e7da");
    expect(c).toContain("color: #2a1a13");
    expect(c).toContain("border: 1px solid #1d100c");
    // no cup on the chip; the dot rides INLINE after the label (no right-align)
    const belt = page.slice(page.indexOf("function renderToolbelt"), page.indexOf("function renderFilterCard"));
    expect(belt).not.toContain("tdb-rvcups");
    expect(page).toContain("title={`WK ${reviewWin.weekNumber}`} onClick={openReview}");
    expect(page).toContain("{!reviewSeen && <span className=\"tdb-rvnew\" aria-hidden />}".replace(/\\/g, ""));
    expect(rule(".tdb-rvnew")).not.toContain("margin-left");
    expect(rule(".tdb-rvnew")).toContain("background: #c96a55");
    expect(page).not.toContain("tdb-rvwk"); // the resting face stays uncrowded
  });
  it("the afterlife transfers VERBATIM to the chip: banner until opened/dismissed, dot cleared by opening, per-week reset", () => {
    expect(page).toContain("const openReview = () => { markReviewSeen(); openSundayReview(); };");
    expect(page).toContain("{reviewWin && !reviewSeen && !reviewDismissed && (");
    expect(page).toContain("const reviewSeen = !reviewWin || reviewSeenWk === reviewWin.key || reviewOpened;");
    expect(page).toContain("const reviewDismissed = !reviewWin || reviewDismissedWk === reviewWin.key;");
    expect(page).toContain('localStorage.setItem("sa.todoReviewSeen", reviewWin.key)');
  });
  it("the filter card holds ONLY the FILTER band (top radius, no top border) + pills + divider + lens + the foot; REVIEW band gone", () => {
    expect(css).toContain(".tdb-rsech.fc1 { border-top: none; border-radius: 15px 15px 0 0; }");
    expect(page).toContain('className="tdb-rsech fc1"');
    expect(page).not.toContain(">REVIEW</div>");
    expect(page).not.toContain("tdb-rvrow"); // (FocusFlow's review-mode .tdb-rvrow is a different, live namesake — css keeps it)
    const cardFn = page.slice(page.indexOf("function renderFilterCard"), page.indexOf("function renderRail"));
    expect(cardFn).toContain("SHOW ALL<span");
    expect(cardFn).toContain('className="tdb-fdivider"');
    expect(cardFn).toContain("TODAY’S LIST<span");
    expect(cardFn).toContain('className="tdb-setrow"');
    expect(cardFn).not.toContain("tdb-fsb2"); // Begin is not the card's child
    expect(cardFn).not.toContain("tdb-rvchip"); // nor the chip
  });
  it("the fold: the <1428 drawer carries the SAME toolbelt whole (the icon rail stays extinct — recon: retired chrome)", () => {
    expect((page.match(/\{renderToolbelt\(\)\}/g) ?? []).length).toBe(2); // aside + drawer
    expect(page).not.toContain("tdb-ric");
  });
  it("the foot: a bare 20px cog + label, same wiring; the roundel selector is gone", () => {
    expect(page).toContain('className="tdb-setrow" onClick={() => setSettingsOpen(true)}');
    expect(page).not.toContain("tdb-sic");
    expect(css).not.toContain("tdb-sic");
    expect(rule(".tdb-cog")).toContain("flex: 0 0 auto");
  });
});

describe("doc pass P2 — the width tier (≥1700 → 4-up with Today)", () => {
  it("the tier media: asm 1624 + sheet 1072 + a 4-up grid, tokens only (never a hard card width)", () => {
    const m = css.match(/@media \(min-width: 1700px\) \{([\s\S]*?)\n\}/);
    expect(m).toBeTruthy();
    const tier = m![1];
    expect(tier).toContain("--tdb-asm: 1624px; --tdb-sheet: 1072px;");
    expect(tier).toContain(".tdb-wrap .tdb-grid { grid-template-columns: repeat(4, var(--tdb-cardw)); }");
    expect(tier).not.toContain("250px"); // the card token, never a magic width
  });
  it("the matrix: base 3-up · today-off 4-up everywhere (higher specificity than the tier) · compact unchanged", () => {
    expect(rule(".tdb-grid")).toContain("repeat(3, var(--tdb-cardw))"); // <1700, Today visible → 1512 runs 3-up
    expect(css).toContain(".tdb-wrap.today-off { --tdb-asm: 1344px; --tdb-sheet: 1072px; }"); // (0,2,0) beats the media's .tdb-wrap
    expect(css).toContain(".tdb-wrap.today-off .tdb-grid { grid-template-columns: repeat(4, var(--tdb-cardw)); }");
    expect(css).toContain("@media (max-width: 1427.98px) { .tdb-wrap { --tdb-asm: 1092px; } .tdb-wrap.today-off { --tdb-asm: 1072px; } }");
    expect(rule(".tdb-wrap")).toContain("--tdb-cardw: 250px"); // ONE card width for every cell at every tier
  });
  it("the edge gutter is the 32px token (the pack's 48→32), padded on the wrap", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-edge: 32px;");
    expect(w).toContain("padding: 0 var(--tdb-edge) 48px");
  });
  it("the transition branch: the tier steps ride the SAME 220ms width mechanics as the Today mount; reduced motion instant", () => {
    expect(rule(".tdb-asm")).toContain("transition: width 220ms ease");
    expect(rule(".tdb-centre")).toContain("transition: width 220ms ease");
    expect(css).toContain(".tdb-asm, .tdb-centre { transition: none; }");
    // the run sheet consumes the same widths: both views render inside .tdb-mainc (width 100% of the stack)
    expect(rule(".tdb-mainc")).toContain("width: 100%");
  });
});

describe("polish P5 — sweep: dead selectors out; disabled joins the inert grammar", () => {
  it("the replaced/dead classes are extinct in the stylesheet (verified repo-dead before deletion)", () => {
    for (const dead of ["tdb-worklist", "tdb-pick", "tdb-bffind", "tdb-rdate", "tdb-ge ", "tdb-tags", "tdb-mid ", "tdb-miniav", "tdb-ffconfetti", "tdb-ffoctx", "tdb-ffofferq", "tdb-ffbt", "tdb-ffbs", "tdb-docband", "tdb-letter"]) {
      expect(css).not.toContain("." + dead.trim() + " ");
      expect(css).not.toContain("." + dead.trim() + ":");
      expect(css).not.toContain("." + dead.trim() + ",");
    }
  });
  it("the button law's disabled state is the INERT GRAMMAR, not opacity — the page law holds for every control", () => {
    expect(css).not.toContain(".tdb-btnp:disabled { opacity");
    expect(css).toContain(".tdb-btnp:disabled, .tdb-btnh:disabled,");
    expect(css).toMatch(/\.tdb-btnp:disabled, \.tdb-btnh:disabled,[^{]*\{\n?[^}]*cursor: not-allowed/);
  });
});

describe("polish P4 — THE REACTIVE RAIL (search-facet counts, the struck totals, the query chip)", () => {
  it("ONE derivation: the pills re-count via the SAME filterCounts over search-narrowed sets — never a parallel tally", () => {
    expect(page).toContain("const searchActive = search.trim().length > 0;");
    expect(page).toContain("? filterCounts({ doCards: sDo, hkGroups: sGroups, staleCards: sStale, ntCards: sNt, committedCount: committedCards.filter((c) => matchesSearch(c, search, sctx)).length })");
    // groups narrow WHOLE, exactly as the sheet keeps them
    expect(page).toContain("hkGroups.filter((g) => groupMatchesSearch(g, search))");
    // the match total reuses the shownX composition (cards + hkGapCount gaps)
    expect(page).toContain("sDo.length + hkGapCount(sGroups) + sStale.length + sNt.length");
    expect((page.match(/filterCounts\(/g) ?? []).length).toBe(2); // fc + searchFc — no third tally
  });
  it("the struck pair renders during search only, and only when the count CHANGED", () => {
    expect(page).toContain("searchActive && live !== base ? (<><s className=\"tdb-was\">{base}</s>{live}</>) : (<>{base}</>)");
    expect(page).toContain('{label}<span className="tdb-fn">{fnFace(count, live)}</span>');
    expect(page).toContain("TODAY’S LIST<span className=\"tdb-fn\">{fnFace(fc.today, searchFc ? searchFc.today : fc.today)}</span>".replace(/\\/g, ""));
    expect(css).toContain(".tdb-fn .tdb-was { color: #cfc4b8; text-decoration: line-through; margin-right: 5px; }");
  });
  it("zero-match pills DIM in place (the live count keys the existing 40%) — never hidden, never reordered", () => {
    expect(page).toContain("const live = searchFc ? searchFc[key] : count;");
    expect(page).toContain("${live === 0 ? \" z\" : \"\"}".replace(/\\/g, ""));
    expect(rule(".tdb-fpill.z")).toContain("opacity: 0.4");
  });
  it("the FILTER header grows the removable query chip: pink tag law, quoted uppercased term, ✕ clears the search", () => {
    expect(page).toContain("“{search.trim().toUpperCase()}” <span aria-hidden>✕</span>");
    expect(page).toContain('className="tdb-fq" aria-label="Clear the search" onClick={() => setSearch("")}');
    const q = rule(".tdb-fq");
    expect(q).toContain("color: #7c3a2a");
    expect(q).toContain("background: var(--pink-t)");
    expect(q).toContain("border: 1px solid var(--pink-b)");
    expect(q).toContain("border-radius: 99px");
    expect(rule(".tdb-rsech")).toContain("display: flex"); // the band carries the chip row
  });
  it("composition holds both ways: the pills narrow the same shared filter state the search composes with", () => {
    expect(page).toContain("visibleDoCard(c, filters, today) && matchesSearch(c, search, sctx)");
    expect(page).toContain("visibleGroup(g, filters) && groupMatchesSearch(g, search)");
  });
});

describe("v4 P3 — conditional Today + the 4-up board", () => {
  it("Today mounts only with content (committed OR done today); the wrap flags today-off", () => {
    expect(page).toContain("const todayActive = committedCards.length > 0 || doneN > 0;");
    expect(page).toContain("{!narrow && todayShown && (");
    expect(page).toContain('className={`tdb-wrap${todayShown ? "" : " today-off"}`}');
  });
  it("the grid steps 4-up ⇄ 3-up via tokens; cards stay 250 (only the count changes)", () => {
    expect(css).toContain(".tdb-wrap.today-off { --tdb-asm: 1344px; --tdb-sheet: 1072px; }");
    expect(css).toContain(".tdb-wrap.today-off .tdb-grid { grid-template-columns: repeat(4, var(--tdb-cardw)); }");
    expect(rule(".tdb-grid")).toContain("repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-centre")).toContain("transition: width 220ms ease"); // the stack carries the Today width step
  });
  it("the slide: in/out 220ms ease; exit lags the unmount; reduced motion = instant", () => {
    expect(css).toContain(".tdb-railr.in { animation: tdbTodayIn 220ms ease; }");
    expect(css).toContain(".tdb-railr.out { animation: tdbTodayOut 220ms ease forwards; }");
    expect(page).toContain("window.setTimeout(() => { setTodayShown(false); setTodayLeaving(false); }, 220);");
    expect(page).toContain('window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-railr.in, .tdb-railr.out { animation: none; }");
  });
  it("the Today panel: lifted white card with the diary-sage header (the pack's hexes)", () => {
    expect(rule(".tdb-today2")).toContain("box-shadow: 0 8px 22px rgba(58, 28, 20, 0.14)");
    expect(rule(".tdb-th")).toContain("linear-gradient(180deg, #d7ddd5, #d5dbd3)");
    expect(rule(".tdb-th .tdb-t")).toContain("color: #3d4a3b");
    expect(rule(".tdb-th .tdb-thr")).toContain("color: #5a6e58");
  });
});

describe("Final Shape P6 — remnant sweep · a11y", () => {
  it("GREP SWEEP — strip/deck/post-it/reel/ledger-table/selection remnants all extinct", () => {
    const stale = [
      "post-it", "postit", "tdb-strip", "tdb-deck", "deckPill", "tdb-reel", "reelFit", "REEL_PAGE",
      "tdb-pg", "tdb-lgrid", "tdb-ltd", "tdb-bulk", "todoSelection", "tdb-ric", // (tdb-lrow returned as doc-pass P4's row card — a different object, same name)
      "tdb-sq", "tdb-lrail", "renderStrip", "renderDeck", "soloPostit", "scroll-snap",
    ];
    for (const t of stale) {
      expect(page).not.toContain(t);
      expect(css).not.toContain(t);
    }
  });
  it("A11Y: the drawer is focus-trapped (Tab cycles, Esc closes, scrim click closes); one panel, two mounts", () => {
    expect(page).toContain('if (e.key === "Escape") { e.stopPropagation(); setFilterDrawerOpen(false); return; }');
    expect(page).toContain("if (e.shiftKey && document.activeElement === first)");
    expect(page).toContain('className="tdb-fdscrim" onClick={() => setFilterDrawerOpen(false)}');
    expect((page.match(/\{renderToolbelt\(\)\}/g) ?? []).length).toBe(2);
  });
  it("A11Y: sticky headings are single elements (no aria-hidden duplicates to manage)", () => {
    expect((page.match(/className=\{`tdb-lh2 /g) ?? []).length).toBe(1); // the Lane builder (the ledger grew its own washed heading, doc pass P4)
  });
});

describe("Final Shape P4 — the wrapped grid + sticky headings", () => {
  it("the grid: repeat(3, cardw) + g12, ALL cards rendered (no truncation, no pagers)", () => {
    expect(rule(".tdb-grid")).toContain("display: grid; grid-template-columns: repeat(3, var(--tdb-cardw)); gap: var(--g12)");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("tdb-reelpg");
  });
  it("the heading is sticky within the page scroll, sheet-backed, at the final scale (28/19/24×3)", () => {
    const h = rule(".tdb-lh2");
    expect(h).toContain("position: sticky; top: 0;");
    expect(h).toContain("background: var(--white, #fff)");
    expect(rule(".tdb-lh2 .tdb-lgt")).toContain("font-size: 19px");
    expect(rule(".tdb-lh2 .tdb-lgt::after")).toContain("width: 24px; height: 3px");
    expect(rule(".tdb-playb")).toContain("width: 28px; height: 28px");
  });
  it("the hover invariants hold (the hotfix suite re-asserts the cell/surface law)", () => {
    expect(rule(".tdb-cell")).toContain("height: var(--tdb-cardh)");
    expect(rule(".tdb-vwrap")).toContain("grid-template-rows: 0fr");
  });
});

describe("polish P3 — the centre stack: three sibling containers", () => {
  it("review card · sheet · Pro colleague — siblings inside .tdb-centre; the sheet holds neither", () => {
    const centre = page.indexOf('className="tdb-centre"');
    const box = page.indexOf('className="tdb-rvbox"');
    const mainc = page.indexOf('className="tdb-mainc"');
    const banner = page.indexOf("<ProBanner");
    expect(centre).toBeGreaterThan(0);
    expect(box).toBeGreaterThan(centre);
    expect(mainc).toBeGreaterThan(box);
    expect(banner).toBeGreaterThan(mainc);
    const c = rule(".tdb-centre");
    expect(c).toContain("width: var(--tdb-sheet)");
    expect(c).toContain("flex-direction: column");
    expect(c).toContain("gap: 16px");
    expect(rule(".tdb-mainc")).toContain("width: 100%");
    expect(page).not.toContain("tdb-docband");
    expect(css).not.toContain("tdb-docband");
  });
  it("detail P2 — the bar line: Playfair sentence off the SAME shared derivation, lining+tabular figures; the segment right", () => {
    expect(page).toContain(">Showing {shownX} of {shownY} items on your list</span>"); // live under search — the reactive-rail derivation
    const t = rule(".tdb-bartext");
    expect(t).toContain("font-family: var(--f12-serif)");
    expect(t).toContain("font-size: 14.5px");
    expect(t).toContain("font-weight: 400");
    expect(t).toContain("font-variant-numeric: lining-nums tabular-nums");
    expect(page).not.toContain("tdb-shmeta"); // the mono meta is gone
    expect(css).not.toContain("tdb-shmeta");
    expect(page).not.toContain("OPEN · SHOWING"); // no mono remnant
    expect(page).toContain('className="tdb-vseg" role="group" aria-label="View"');
    expect(page).toContain('onClick={() => pickView("cards")}>▦</button>');
    expect(page).toContain('onClick={() => pickView("ledger")}>☰</button>');
    expect(rule(".tdb-vseg")).toContain("margin-left: auto");
  });
  it("ONE review surface repo-wide: the rvbox; the strip banner classes are extinct", () => {
    expect(page).not.toContain("tdb-rvhead");
    expect(css).not.toContain("tdb-rvhead");
    expect((page.match(/tdb-rvbox/g) ?? []).length).toBe(1);
    expect(page).toContain(">Open it ›</button>"); // frame P3: the flip died with the afterlife
  });
});

describe("Final Shape P1 — the hero + the floating search", () => {
  it("v4: the hero is CENTRED on the bare ground — no band, no border, title over search", () => {
    expect(rule(".tdb-hero")).toContain("text-align: center");
    expect(rule(".tdb-hero")).not.toContain("background");
    expect(rule(".tdb-hero")).not.toContain("border");
    expect(page).toContain('<h1 className="tdb-ask">What’s on your desk?</h1>');
    expect(rule(".tdb-ask")).toContain("font-size: 64px"); // polish: 64
    expect(rule(".tdb-ask")).toContain("letter-spacing: -0.015em");
    const hero = page.slice(page.indexOf("function renderHero"), page.indexOf("// ── Final Shape P2"));
    expect(hero).not.toContain("Begin focused session"); // moved to the rail (v4 P2)
    expect(hero).not.toContain("tdb-fsb\""); // no focused-session control in the header
  });
  it("v4: the search sits centred directly beneath the title (the band overlap retired)", () => {
    const sr = rule(".tdb-srchrow");
    expect(sr).toContain("justify-content: center");
    expect(sr).toContain("margin: 22px 0 6px"); // polish spacing
    const bs = rule(".tdb-bigsearch");
    expect(bs).toContain("width: 380px"); // doc pass P1: 540 → 380
    expect(bs).toContain("height: 46px");
    expect(page).toContain('placeholder="Search"'); // polish: exactly "Search"
    expect(page).toContain("matchesSearch(c, search, sctx)");
  });
  it("doc pass P1 — the ⌘K ADVERT is gone (the shortcut works on); the 19px glass rides the right-hand oat roundel", () => {
    expect(page).not.toContain("<kbd aria-hidden>⌘K</kbd>");
    expect(css).not.toContain(".tdb-bigsearch kbd");
    // the icon: 19px stroke glass inside the 34px oat roundel, AFTER the input (right end)
    expect(page).toContain('<span className="tdb-mag" aria-hidden>');
    expect(page).toContain('<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"');
    const input = page.indexOf("ref={searchRef}");
    expect(page.indexOf('className="tdb-mag"')).toBeGreaterThan(input);
    const mag = rule(".tdb-mag");
    expect(mag).toContain("width: 34px");
    expect(mag).toContain("border-radius: 50%");
    expect(mag).toContain("background: var(--oat)");
    expect(mag).toContain("margin-left: auto");
    // ⌘K still focuses the pill — the handler survives the badge
    expect(page).toContain('e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)');
    // the reactive rail composes with the same search state, untouched
    expect(page).toContain("const searchActive = search.trim().length > 0;");
  });
  it("⌘K guards on visibility (the page stays mounted behind other routes); Esc chain: search then filters", () => {
    expect(page).toContain("wrapRef.current.offsetParent === null");
    expect(page).toContain('if (search) { setSearch(""); return; }');
    expect(page).toContain("if (!isResting(filtersRef.current) || filtersRef.current.todayOnly) setFilters(DEFAULT_FILTERS);");
  });
  it("view state persists under sa.todoView (default cards; P3 made the Ledger face live)", () => {
    expect(page).toContain('localStorage.getItem("sa.todoView")');
  });
  it("ZERO strip/deck/post-it remnants", () => {
    for (const stale of ["tdb-strip", "tdb-striprow", "tdb-tblock", "tdb-postit", "tdb-pv", "tdb-pk", "soloPostit", "renderStrip", "tdb-deck", "tdb-deckrow", "tdb-ctl", "tdb-dsrch", "tdb-vdiv", "deckPill", "tdb-dspc", "renderDeck", "tdb-fdrop", "filterDropOpen"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
});
describe("P2 — card view: the grid replaces the reels; renames land", () => {
  it("Final Shape P4 — THE WRAPPED GRID: 3 fixed columns, all cards, one scroll; reels/snap stay retired", () => {
    expect(rule(".tdb-grid")).toContain("grid-template-columns: repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-grid")).toContain("gap: var(--g12)");
    expect(page).toContain('<div className="tdb-grid">{children}</div>');
    expect(page).not.toContain("reelFit");
    expect(page).not.toContain("laneFit");
    expect(page).not.toContain("REEL_PAGE");
    expect(css).not.toContain("scroll-snap");
  });
  it("v2 anatomy: 27px band, 12.5px titles, content-sized cards, tighter body", () => {
    expect(rule(".tdb-band")).toContain("min-height: 27px");
    expect(rule(".tdb-tt")).toContain("font-size: 12.5px");
    expect(rule(".tdb-tile")).not.toContain("min-height");
    expect(rule(".tdb-body")).toContain("padding: 10px 12px 12px");
  });
  it("VI P3: the Focus pill became the PLAY BUTTON — full wording in title/aria; Batch fix stands", () => {
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain('onClick={() => setFlow({ items: [{ kind: "group", group: g }] })}>{VERB_LABELS.action}</button>'); // the batch card's lead (toolbelt P2 parity)
    expect(page).not.toContain("Fix together");
    expect(page).not.toContain(">▶ Focus on"); // the pill text is extinct in both views
  });
});

describe("doc pass P6 — sweep", () => {
  it("quickPause is gone (call-less since the table died); the sheethead container stays extinct", () => {
    expect(page).not.toContain("quickPause");
    expect(page).not.toContain("tdb-sheethead");
    expect(css).not.toContain("tdb-sheethead");
  });
  it("the tour's card stop targets the ledger's row class (never the extinct step)", () => {
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    expect(tour).toContain('".tdb-tile, .tdb-gcard, .tdb-lrow"');
    expect(tour).not.toContain("tdb-step");
  });
  it("the reactive rail rode through; the heights hold on the law's primitives (rewritten in frame P2)", () => {
    expect(page).toContain("const searchFc = searchActive");
    expect(page).toContain('>FILTER{searchActive && (');
    expect(rule(".tdb-btnp")).toContain("height: 42px");
    expect(rule(".tdb-btnp.sm")).toContain("height: 34px");
    expect(rule(".tdb-btnh")).toContain("height: 34px");
  });
});

describe("doc pass P4 — LEDGER v2 (washed sections · Action now · the head checkbox)", () => {
  it("the view toggle is LIVE both ways and persisted (sa.todoView)", () => {
    expect(page).toContain('view === "ledger" ? renderLedger() : (');
    expect(page).toContain('localStorage.setItem("sa.todoView"');
  });
  it("washed sections: whisper pink/latte per ref A + the DERIVED notes whisper; rows are white cards inside", () => {
    expect(rule(".tdb-lsec.p")).toContain("background: linear-gradient(180deg, #fbf1ed, #faeee9)");
    expect(rule(".tdb-lsec.p")).toContain("border-color: #f3ddd4");
    expect(rule(".tdb-lsec.l")).toContain("background: linear-gradient(180deg, #faf6ee, #f8f3e8)");
    expect(rule(".tdb-lsec.l")).toContain("border-color: #ede4d2");
    expect(rule(".tdb-lsec.n")).toContain("#fbf8ec"); // detail P3: the pack's hexes superseded the derived whisper
    expect(rule(".tdb-lsec")).toContain("border-radius: 14px");
    const row = rule(".tdb-lrow");
    expect(row).toContain("background: var(--white, #fff)");
    expect(row).toContain("border-radius: 11px");
    expect(row).toContain("border: 1px solid var(--line)");
    expect(row).toContain("margin-bottom: 8px");
  });
  it("the heading on the wash: play · Playfair 19 · count chip; STICKY with wash-coloured backing", () => {
    expect(rule(".tdb-lst")).toContain("font-size: 19px");
    expect(rule(".tdb-lsech")).toContain("position: sticky; top: 0");
    expect(css).toContain(".tdb-lsec.p .tdb-lsech { background: #fbf1ed; }");
    expect(css).toContain(".tdb-lsec.l .tdb-lsech { background: #faf6ee; }");
    expect(css).toContain(".tdb-lsec.n .tdb-lsech { background: #fbf8ec; }");
    expect(page).toContain('ledgerHeading("p", "do", "tdb-lane-do", "Urgent"');
    expect(page).toContain('ledgerHeading("l", "hk", "tdb-lane-hk", "Housekeeping"');
    expect(page).toContain('ledgerHeading("n", "nt", "tdb-lane-nt", "Notes to self"');
  });
  it("collapse: heading click folds (the play button opts out via stopPropagation); chevron + aria; persisted per-lane", () => {
    expect(page).toContain("onClick={() => toggleFold(lane)}");
    expect(page).toContain("aria-expanded={!folded}");
    expect(page).toContain("onClick={(e) => { e.stopPropagation(); onSession(); }}");
    expect(page).toContain('{folded ? "▸" : "▾"}');
    expect(page).toContain('localStorage.setItem("sa.todoLedgerFold", JSON.stringify(next))');
    expect(page).toContain('localStorage.getItem("sa.todoLedgerFold")');
    expect(page).toContain("{!ledgerFold.do && doSorted.map(runRow)}");
    expect(page).toContain("{!ledgerFold.hk && hkTop.map((r) => (r.kind === \"group\" ? runBatchRow(r.g) : runRow(r.c)))}".replace(/\\/g, ""));
    expect(page).toContain("{!ledgerFold.nt && (vNt.length > 0 ? vNt.map(runRow) : ("); // detail P3: the empty add-row branch
  });
  it("the actions: 32px press 'Action now' + ghosts, vertically centred; Action now OPENS (both kinds), never completes", () => {
    expect(rule(".tdb-lacts")).toContain("align-self: center");
    expect(rule(".tdb-btnh")).toContain("height: 34px"); // frame P2: the row actions ride the law's small height
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runBatchRow"));
    expect(rr).toContain('className="tdb-btnh em" onClick={() => openFlowCards([c])}>{VERB_LABELS.action}</button>');
    expect(rr).not.toContain("quickDone(c)}>Action now");
    expect(rr).toContain('{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}');
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain('const open = () => setFlow({ items: [{ kind: "group", group: g }] });');
    expect(br).toContain('className="tdb-btnh em" onClick={open}>{VERB_LABELS.action}</button>');
    expect(br).not.toContain("Today’s list"); // groups stay uncommittable — the carried resolution
  });
  it("the dropdown keeps the Later items under the renamed trigger", () => {
    expect(page).toContain('><ClockGlyph />{VERB_LABELS.later}</button>'); // ONE trigger form everywhere — the clock leads it (detail P3)
    expect((page.match(/>Remind me tomorrow<\/button>/g) ?? []).length).toBe(3); // the card menu + the ledger batch row + the batch CARD
    expect((page.match(/>Give it a week<\/button>/g) ?? []).length).toBe(3);
    expect((page.match(/>Don’t show these again<\/button>/g) ?? []).length).toBe(3);
  });
  it("quick-complete = the LEADING checkbox: the roundel ticks on row hover/focus and completes; offers + batches exempt", () => {
    expect(page).toContain('className="tdb-ldot tick" aria-label={`Mark done — ${c.title}`}');
    expect(page).toContain("onClick={(e) => { e.stopPropagation(); quickDone(c); }}");
    expect(rule(".tdb-ldot")).toContain("width: 24px");
    expect(css).toContain(".tdb-lrow:hover .tdb-ldot.tick .tdb-ldtick, .tdb-lrow:focus-within .tdb-ldot.tick .tdb-ldtick { display: inline; }");
    const ld = page.slice(page.indexOf("function ledgerDot"), page.indexOf("function runRow"));
    expect(ld).toContain('if (c.taskType === "offer_received")'); // the plain-dot branch
    const br = page.slice(page.indexOf("function runBatchRow"), page.indexOf("function ledgerHeading"));
    expect(br).toContain('<span className="tdb-ldot" aria-hidden><span className="tdb-lddot" /></span>');
  });
  it("toolbelt P2 — the divergence is RETIRED: cards + ledger read ONE shared VERB_LABELS constant", () => {
    const cv = page.slice(page.indexOf("function cardVerbs"), page.indexOf("function renderCard"));
    expect(cv).toContain("{VERB_LABELS.action}");
    expect(cv).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}");
    expect(cv).toContain("laterMenu(c)");
    // the literals live ONCE, in the constant — nowhere inline
    expect((page.match(/: "Action now"/g) ?? []).length).toBe(1); // the constant's assignment alone
    expect((page.match(/: "Snooze or dismiss"/g) ?? []).length).toBe(1);
    expect(page).not.toContain("✓ DONE");
    expect(page).not.toContain("⚡ FIX");
    expect(page).not.toContain("LATER ▾");
    const rr = page.slice(page.indexOf("function runRow"), page.indexOf("function runBatchRow"));
    expect(rr).toContain("onClick={() => openFlowCards([c])}");
  });
  it("the step family is extinct; the 9-col ledger stays extinct", () => {
    for (const stale of ["tdb-step", "runHeading", "tdb-lgrid", "tdb-lcols", "tdb-ltd", "truncateRows"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
});
describe("P4 — search + filters (source locks; the matrix lives in todoFilters.test.ts)", () => {
  it("BOTH views read the same visible sets (cards lanes and ledger sections consume vDo/vGroups/vStale/vNt)", () => {
    expect(page).toContain("{vDo.map(renderCard)}");
    expect(page).toContain("{vGroups.map(renderGroupCard)}");
    expect(page).toContain("{vStale.map(renderCard)}");
    expect(page).toContain("{vNt.map(renderCard)}");
    expect(page).toContain("sortLedgerDo(vDo, lctx, now)"); // the ledger sorts the SAME set (review-free by construction)
  });
  it("the filter derivations survive the deck's death (the rail consumes them in P2)", () => {
    expect(page).toContain("filterCounts({ doCards: board.do, hkGroups, staleCards, ntCards: board.nt, committedCount: committedCards.length })");
    expect(page).toContain("togglePill");
  });
  it("filtered-empty gets the quiet one-liner + clear action, NEVER a celebratory empty (branch order + lane skips)", () => {
    expect(page).toContain("active && !anyVisible ? (");
    expect(page).toContain("Nothing matches —");
    expect(page).toContain('onClick={() => { setFilters(DEFAULT_FILTERS); setSearch(""); }}>clear filters');
    // the celebratory desk states sit BEFORE the filter branch (they need a truly empty desk)
    const branch = page.indexOf('desk === "new-desk" ? renderNewDesk()');
    expect(branch).toBeGreaterThan(0);
    expect(branch).toBeLessThan(page.indexOf("active && !anyVisible"));
    // a filtered-empty lane HIDES rather than celebrating
    expect(page).toContain("{(!active || vDo.length > 0 || overlayCards(\"do\").length > 0) && (");
  });
  it("search state: ⌘K focuses (visibility-guarded, P1); the input re-lands in the deck (P2)", () => {
    expect(page).toContain("matchesSearch(c, search, sctx)"); // the filter plumbing survives the move
    expect(page).toContain("searchRef");
  });
});

describe("Final Shape P5 — the ledger's selection machinery is extinct", () => {
  it("no checkboxes, no bulk bar, no kebab, no additive keyboard layer, no todoSelection import", () => {
    for (const stale of ["tdb-bulk", "selVisible", "applySelectClick", "moveFocus", "EMPTY_SEL", "kfocus", "kebabAt", "todoSelection", "data-lkey"]) {
      expect(page).not.toContain(stale);
    }
  });
});
describe("A1 → Final Shape — the hero band (supersedes the strip)", () => {
  it("v4: the hero band is gone — bare ground above the work row; the strip family stays extinct", () => {
    const band = page.indexOf("{renderHero()}");
    const ws = page.indexOf('className="tdb-asm tdb-ws"');
    expect(band).toBeGreaterThan(0);
    expect(band).toBeLessThan(ws);
    expect(page).not.toContain("tdb-herorow");
    expect(page).not.toContain("tdb-strip");
  });
  it("the hero is not sticky (scrolls away); the flanking columns keep the scroll contract", () => {
    expect(rule(".tdb-hero")).not.toContain("sticky");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky; top: var(--tdb-gutter)");
  });
});
describe("A2 → Final Shape — the batch copy + roundels live on the run-sheet row", () => {
  it("the batch row reads G3_COPY (one source) and the display roundels overlap −5px", () => {
    expect(page).toContain("const copy = G3_COPY[g.rule]");
    expect(css).toContain(".tdb-avs span:first-child { margin-left: 0; }");
  });
});
describe("II·B P1 — the 24-grid + the ref masthead (todo-workbench-rail-v1.html, Option B)", () => {
  it("the grid ships as named tokens with the vocabulary comment — no magic numbers at the seams", () => {
    expect(css).toContain("WIDTH v4 — THE CENTRED ASSEMBLY"); // the Final Shape law absorbed the vocabulary
    expect(rule(".tdb-wrap")).toContain("--g24: 24px; --g12: 12px;");
    expect(rule(".tdb-ws")).toContain("gap: var(--g24)");
    expect(rule(".tdb-ws")).toContain("padding: 50px 0 26px"); // the assembly work row (v2)
    expect(rule(".tdb-fside, .tdb-railr")).toContain("top: var(--tdb-gutter)"); // the contract (gutter rides --g24)
    expect(rule(".tdb-lane")).toContain("margin-bottom: var(--g24)"); // P6 rename: reel classes extinct
    expect(rule(".tdb-lh2")).toContain("margin: 0 0 16px"); // v2: 16px clear below the heading
    expect(rule(".tdb-grid")).toContain("gap: var(--g12)"); // P4: the grid is the card-gutter consumer
  });
});

describe("III P3 — the pinned pair (supersedes the II·B controls-only drawer)", () => {
  it("Final Shape P1 (transitional): the deck is extinct; filters re-land on the rail (P2), the segment in the sheet corner (P3)", () => {
    expect(page).not.toContain("renderDeck");
    expect(page).toContain("const shownX = vDo.length + hkGapCount(vGroups) + vStale.length + vNt.length;");
    expect(page).toContain("const shownY = tiles.urgent + tiles.housekeeping + tiles.notes;");
  });
  it("retired species stay retired; the Notes inline ＋ survives in BOTH views (the ledger's nt head gained it)", () => {
    for (const gone of ["YOUR DESK", "tdb-fgl", "tdb-frow", "tdb-cbi", "tdb-newnote", "tdb-dwalk"]) {
      expect(page).not.toContain(gone);
    }
    expect(page).toContain('{onAdd && <button type="button" className="tdb-cadd" onClick={onAdd} aria-label="Add a note">＋</button>}');
    expect(page).toContain('undefined, addTask)'); // the run sheet's Notes heading ＋
  });
});

describe("II·B P3 — the companion rail (one panel, two mounts, one state)", () => {
  it("mount parity: BOTH homes call the SAME renderTodayPanel, XOR'd on narrow (no fork — halt (c) clear)", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2);
    expect(page).toContain('"Today", ALWAYS ON'); // VI P1: the column is unconditional ≥1200
    expect(page).toContain("{narrow && (");
    expect(page).toContain('window.matchMedia("(max-width: 1239.98px)")');
  });
  it("the rail: 264 sticky at the 24 offset, after the main column; noted as the future companions' home", () => {
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
    expect(rule(".tdb-fside, .tdb-railr")).toContain("position: sticky"); // the shared contract
    expect(page.indexOf('className="tdb-mainc"')).toBeLessThan(page.indexOf('tdb-railr${todayLeaving'));
  });
  it("the chip's count is the committed union — never a parallel tally — and the header slot pairs date ⇄ count", () => {
    expect(page).toContain("Today · {committedCards.length} TO GO");
    expect(page).toContain("`${committedCards.length} OF ${MAX_TODAY}`"); // VI P1: the header's count face
  });
  it("popover a11y: dialog role, aria-expanded on the chip, Esc + click-away close, reduced-motion honoured", () => {
    expect(page).toContain('aria-haspopup="dialog" aria-expanded={todayPopOpen}');
    expect(page).toContain('<div className="tdb-todaypop" role="dialog" aria-label="Today">');
    expect(page).toContain('if (e.key === "Escape") setTodayPopOpen(false);');
    expect(page).toContain('t.closest(".tdb-todaypop") || t.closest(".tdb-todaychip")');
    expect(css).toContain("@media (prefers-reduced-motion: reduce) { .tdb-todaypop { animation: none; } }");
  });
  it("the breakpoint belt: the column hides <1240 in CSS too; narrow closes the popover on widen", () => {
    expect(css).toContain("@media (max-width: 1239.98px) { .tdb-railr { display: none; } }");
    expect(page).toContain("useEffect(() => { if (!narrow) setTodayPopOpen(false); }, [narrow]);");
  });
});

describe("II·B P4 — one tag grammar + card polish", () => {
  it("the grouped card wears the standard typed tag pill; the kicker grammar is retired page-wide", () => {
    expect(page).toContain('<span className="tdb-tag due">{g.meta.label.toUpperCase()}</span>');
    expect(page).not.toContain("tdb-kick");
    expect(page).not.toContain("tdb-kd");
    expect(css).not.toContain("tdb-kick");
  });
  it("the cards view keeps the band-less lh2 heading; the ledger's washed heading is doc-pass P4's deliberate divergence", () => {
    expect(page).toContain("tdb-lh2 ${cls ===");
    expect(page).toContain('className={`tdb-lsech ${cls}`}'); // the ledger's own heading (washed, foldable)
    expect((page.match(/tdb-playb/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  it("the batch card's Never + footer CTA are extinct (the contract); the hide lives in ☾ LATER", () => {
    expect(page).not.toContain("tdb-gnever");
    expect(page).not.toContain(">Batch fix →</button>");
    expect(page).toContain("muteRuleFromCard(g); }}>Don’t show these again</button>");
  });
});

describe("Width v4 — the centred assembly tokens (Final Shape)", () => {
  it("the token set on the wrap: asm 1364 · rail 248 · sheet 812 · vp 774 · cardw 250 · Today 256", () => {
    const w = rule(".tdb-wrap");
    expect(w).toContain("--tdb-asm: 1364px;");
    expect(w).toContain("--tdb-rail: 248px;");
    expect(w).toContain("--tdb-sheet: 812px;");
    expect(w).toContain("--tdb-vp: 774px;");
    expect(w).toContain("--tdb-cardw: 250px;");
    expect(w).toContain("--tdb-today: 256px;");
    expect(w).toContain("--tdb-gutter: var(--g24);");
    expect(w).toContain("--tdb-appnav: 49px;");
  });
  it("the assembly centres; the arithmetic is the LAWS' 248+24+812+24+256", () => {
    expect(rule(".tdb-asm")).toContain("width: var(--tdb-asm); margin: 0 auto;");
    expect(css).toContain("filter rail 248 · 24 · sheet 812");
    expect(css).toContain("Today 256 = 1364px");
    expect(rule(".tdb-railr")).toContain("width: var(--tdb-today)");
  });
});
describe("Deck v2 P4 — the sheet · the exact-fit board · the rename", () => {
  it("THE SHEET: both views render inside the white panel (radius 16, hairline; the body pads below the band)", () => {
    const m = rule(".tdb-mainc");
    expect(m).toContain("width: 100%");
    expect(m).toContain("border-radius: 16px");
    expect(m).toContain("padding: 0"); // doc pass P3: the band is full-bleed; the body carries the padding
    expect(rule(".tdb-sheetbody")).toContain("padding: 16px 18px 18px");
    // one sheet, both views: the ledger + the lanes render inside .tdb-mainc (no second panel)
    const mainc = page.indexOf('className="tdb-mainc"');
    expect(mainc).toBeGreaterThan(0);
    expect(page.indexOf("renderLedger()")).toBeGreaterThan(0);
  });
  it("the grid: identical 250px columns from the one token; cards never stretch; no pagers, no partials", () => {
    expect(rule(".tdb-wrap")).toContain("--tdb-cardw: 250px;");
    expect(rule(".tdb-grid")).toContain("repeat(3, var(--tdb-cardw))");
    expect(rule(".tdb-tile")).toContain("flex: 0 0 var(--tdb-cardw)"); // the in-flow overlay faces keep the slot
    expect(page).not.toContain("tdb-reelpg");
    expect(page).not.toContain("tdb-reeltrack");
    expect(css).not.toContain("tdb-pg ");
  });
  it("filtered lanes append x OF y · FILTERED · SHOW ALL (reset)", () => {
    expect(page).toContain("{filtered.x} OF {filtered.y} · FILTERED ·");
    expect(page).toContain(">SHOW ALL</button>");
    expect(page).toContain("showAll: resetDeck");
  });
  it("THE LATTE LAW: bands/underline/post-it/dot latte; coffee survives only in journey-sheet headers", () => {
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
    expect(rule(".tdb-band.hk")).toContain("var(--lat-1)");
    expect(rule(".tdb-lh2.lat .tdb-lgt::after")).toContain("var(--lat-mark)");
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    expect(flow).toContain("cof"); // the journey-sheet family keeps coffee
  });
  it("THE RENAME, repo-wide: zero matches of the old family phrase in src (Agent waiting everywhere)", () => {
    const { execSync } = require("node:child_process");
    const needle = "over to " + "you"; // split so this lock never matches itself
    const out = execSync(`grep -ril '${needle}' ` + join(here, "..", "..") + " || true", { encoding: "utf8" }).trim();
    expect(out).toBe("");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    expect(board).toContain('due: "AGENT WAITING"');
  });
});

describe("Final Shape — the deck is extinct (P1); the dots + reducer await the rail (P2)", () => {
  it("no deck markup or styles; the family-dot tokens survive for the rail's pills", () => {
    expect(page).not.toContain("tdb-deck");
    expect(css).not.toContain("tdb-deck");
    expect(css).toContain("--dot-p: #e59b8f; --dot-lat: #cbb995; --dot-y: #d9c87a; --dot-s: #9db29a;");
  });
});
describe("Deck v2 P5 — retirement sweep · breakpoints · a11y", () => {
  it("GREP SWEEP — every mapped remnant is extinct in page + css", () => {
    const stale = [
      "tdb-pair", "tdb-paircard", "tdb-fcard", "tdb-ftop", "tdb-fstatus", "tdb-fmid", "tdb-fgrp2",
      "tdb-fcloud", "tdb-fgh", "tdb-fp ", "fpill(", "tdb-freset", "tdb-vtg", "tdb-footrows",
      "tdb-fr2", "tdb-fric", "tdb-dic", "tdb-dfold", "tdb-dsp ", "tdb-focustx", "tdb-focush",
      "tdb-focusp", "tdb-focusgo", "tdb-focusart", "tdb-tacts", "tdb-pill", "tdb-tmeta",
      "tdb-hkdot", "tdb-who", "tdb-gstack", "tdb-gsav", "tdb-gmore", "tdb-gfix", "tdb-gnever",
      "tdb-qrail", "tdb-qbtn", "tdb-ttab", "tdb-rvbanner", "tdb-rvbar", "tdb-rvcard",
      "tdb-mastband", "tdb-mastcol", "tdb-mastspacer", "tdb-msrch", "GroupFlip", "reelFit",
      "sa.todoDrawer", "emptyRailOpen", "reviewSurface", "dismissReviewBanner",
    ];
    for (const t of stale) {
      expect(page).not.toContain(t);
      expect(css).not.toContain(t);
    }
  });
  it("BREAKPOINTS (P6 final): <1428 the rail is an overlay drawer behind ⚲ FILTER beside the search; <1240 the Today popover", () => {
    expect(page).toContain('window.matchMedia("(max-width: 1427.98px)")');
    expect(css).toContain("@media (max-width: 1427.98px) { .tdb-wrap { --tdb-asm: 1092px; } .tdb-wrap.today-off { --tdb-asm: 1072px; } }");
    expect(page).toContain("⚲ FILTER · {shownX}/{shownY}"); // (multi-line JSX — no leading >)
    expect(page).toContain('className="tdb-fdrawer" role="dialog" aria-modal="true" aria-label="Filters"');
    expect(page).toContain("{renderToolbelt()}");
    expect((page.match(/\{renderToolbelt\(\)\}/g) ?? []).length).toBe(2); // aside + drawer, one panel
    expect(page).toContain('window.matchMedia("(max-width: 1239.98px)")');
    expect(page).not.toContain("tdb-ric"); // the icon rail is extinct
  });
  it("A11Y: post-its/pills pressed; cards real buttons (Enter/Space, aria-expanded = the verb reveal)", () => {
    expect((page.match(/role="button"/g) ?? []).length).toBeGreaterThanOrEqual(4); // cards + run rows
    expect((page.match(/e\.key === "Enter" \|\| e\.key === " "/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
  it("A11Y: the Later menu is arrow-navigable; focus reveals the verbs as hover does", () => {
    expect(page).toContain("function latMenuKeys(");
    expect(page).toContain('if (e.key === "ArrowDown")');
    expect((page.match(/onKeyDown=\{latMenuKeys\}/g) ?? []).length).toBeGreaterThanOrEqual(2); // cards + run-sheet batch
    expect((page.match(/onFocus=\{\(\) => armVerbs\(/g) ?? []).length).toBe(2);
  });
});

describe("Final Shape — the strip + post-its are extinct (P1); latte tokens stay", () => {
  it("no strip markup/styles; the latte family survives for bands + the rail dots", () => {
    expect(page).not.toContain("tdb-strip");
    expect(css).not.toContain("tdb-postit");
    expect(css).toContain("--lat-1: #f5efe6; --lat-2: #efe7d9; --lat-bd: #ddd0bc; --lat-mark: #cbb995; --lat-ink: #8a7048;");
  });
});
describe("VI P1 — 'Today', always on (todo-right-column-v1.html)", () => {
  it("REGRESSION LOCK — no component-level const/let below the component's return (the TDZ dead zone)", () => {
    // The render helpers are declared BELOW the main return and survive only because function
    // declarations hoist. A component-body `const`/`let` down there is dead code — never
    // initialised — and any hoisted helper reading it throws a TDZ ReferenceError at first
    // render, which the root ErrorBoundary turns into an app-wide "Something went wrong"
    // (ToDoPage is a persistent slot on every workspace route). Bit twice: openSundayReview
    // (4d4fbed) and GHOST_BARS (this lock's trigger). Pure gates can't see it — this scan can.
    const ret = page.indexOf("return (\n    <F12Page");
    expect(ret).toBeGreaterThan(0);
    const deadZone = page.slice(ret);
    expect(deadZone).not.toMatch(/^  (const|let) /m);
    expect(page).toMatch(/^const GHOST_BARS = \[64, 78, 52\];/m); // lives at module scope instead
  });

  it("THE RENAME SWEEP — 'Today's list' is extinct across the board, the sheets, the tour and the libs", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    const board = readFileSync(join(here, "..", "..", "lib", "todoBoard.ts"), "utf8");
    const walk = readFileSync(join(here, "..", "..", "lib", "todoWalk.ts"), "utf8");
    for (const src of [css, flow, tour, board, walk]) {
      expect(src).not.toContain("oday’s list"); // catches Today's/today's alike
      // (Deck v2 legalised the uppercase form: the lens pill + sage chip are named TODAY'S LIST)
    }
    // doc pass P4 re-legalised the phrase ON THE PAGE for one control only: the ledger's
    // ghost "＋/− Today's list" (ref B baked) — exactly the toggle's two forms, nowhere else
    expect((page.match(/oday’s list/g) ?? []).length).toBe(2);
    expect(page).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}"); // via the shared constant — the two literals live in VERB_LABELS alone
    expect(page).toContain('<b className="tdb-t">Today</b>');
    expect(page).toContain(">✓ TODAY</span>"); // the committed chip; the lens pill re-lands on the rail (P2)
    expect(page).toContain("{committed ? VERB_LABELS.todayRemove : VERB_LABELS.todayAdd}"); // the card stack's Today toggle (toolbelt P2)
  });
  it("the header's right slot: today's date when empty ⇄ '{n} OF 5' once anything is committed", () => {
    expect(page).toContain("{committedCards.length === 0 && doneN === 0 ? shortHeaderDate(now) : `${committedCards.length} OF ${MAX_TODAY}`}");
    expect(rule(".tdb-th .tdb-thr")).toContain("margin-left: auto");
    expect(rule(".tdb-th .tdb-thr")).toContain("font-size: 7px"); // v4: the diary head scale
  });
  it("the ghost invitation: dashed 11px-radius box, no fill; dashed 15px tick-boxes + faded bars; widths cycled", () => {
    const box = rule(".tdb-ghostbox");
    expect(box).toContain("border: 1.5px dashed rgba(58, 28, 20, 0.22)");
    expect(box).toContain("border-radius: 11px");
    expect(box).not.toContain("background"); // the card's parchment shows through
    expect(rule(".tdb-cbx")).toContain("width: 15px; height: 15px; border: 1.5px dashed rgba(58, 28, 20, 0.28)");
    expect(rule(".tdb-grow")).toContain("border-bottom: 1px dashed rgba(58, 28, 20, 0.16)");
    expect(page).toContain("const GHOST_BARS = [64, 78, 52];"); // module scope — see the regression lock
    expect(page).toContain("const ghosts = todayGhosts(committedCards.length, doneN);");
    expect(page).toContain("{ghosts > 0 && (");
  });
  it("footer verbs switch with the fill: empty = Help me pick + ＋ Add; filled = ＋ Add more + INK Work the list", () => {
    expect(page).toContain("{committedCards.length > 0 ? (");
    // frame P2: Work the list is the pair's ONE ink primary; ＋ Add is quiet furniture
    expect(page).toContain('className="tdb-btnh" onClick={() => scrollToLane("do")}>＋ Add</button>');
    expect(css).toContain(".tdb-tf2 .tdb-btnh, .tdb-tf2 .tdb-btnp { flex: 1;");
  });
});

describe("VI P3 — lane-head play buttons · help returns to the FAB", () => {
  it("a play button leads each lane head in BOTH views, full wording in title+aria, same handlers", () => {
    // cards view: the Lane's onFocusedSession; ledger view: the section's onSession — unchanged
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={onFocusedSession}');
    expect(page).toContain('className="tdb-playb" title={`Focus on ${label}`} aria-label={`Focus on ${label}`} onClick={(e) => { e.stopPropagation(); onSession(); }}'); // ledgerHeading (the fold click must not fire)
    expect(page).toContain('<path d="M1.5 1.5 L9.5 6 L1.5 10.5 Z" fill="currentColor" />');
    const b = rule(".tdb-playb");
    expect(b).toContain("width: 28px; height: 28px; border-radius: 50%"); // Final Shape: 28
    expect(b).toContain("border: 1px solid rgba(58, 28, 20, 0.16)");
    expect(css).toContain(".tdb-playb:hover { transform: scale(1.06); }");
    expect(css).not.toContain("tdb-lgs"); // the pill is extinct
    expect(css).not.toContain("tdb-lanedot"); // the lane dot went with it (ref head)
  });
  it("Final Shape P4: the pagers are extinct (the grid shows everything)", () => {
    expect(page).not.toContain("tdb-pg");
    expect(css).not.toContain("tdb-reelpg");
  });
  it("ONE help entry point: the AppShell FAB (menu on /todo) — none on the page itself", () => {
    for (const stale of ["tdb-dhelp", "helpOpen", "Help centre", "Replay the tour"]) {
      expect(page).not.toContain(stale);
    }
    expect(page).toContain('window.addEventListener("sa:todo-replay-tour"'); // the board still listens
    expect(shell).toContain('if (routeKey === "todo") setHelpMenuOpen((v) => !v);');
  });
});

describe("The column scroll contract (VI P4 → Deck v2 selectors)", () => {
  it("the shared rule: sticky at the gutter, viewport-capped via the appnav token, flex column", () => {
    const shared = rule(".tdb-fside, .tdb-railr");
    expect(shared).toContain("position: sticky; top: var(--tdb-gutter)");
    expect(shared).toContain("max-height: calc(100vh - var(--tdb-appnav) - (var(--tdb-gutter) * 2))");
    expect(shared).toContain("display: flex; flex-direction: column;");
    expect(css).toContain("THE COLUMN SCROLL CONTRACT");
  });
  it("Today keeps fixed head/foot with ONE scrolling middle; verbs never scroll away", () => {
    expect(rule(".tdb-tmid2")).toContain("overflow-y: auto; min-height: 0;");
    expect(rule(".tdb-today2")).toContain("flex: 0 1 auto; min-height: 0;");
    const card = page.slice(page.indexOf('className="tdb-today2"'), page.indexOf('className="tdb-tf2"'));
    expect(card).toContain('className="tdb-tmid2"');
  });
  it("scrollbars: thin, hairline-coloured, hover/focus-visible, gutter stable", () => {
    const mids = rule(".tdb-tmid2");
    expect(mids).toContain("scrollbar-width: thin");
    expect(mids).toContain("scrollbar-gutter: stable");
    expect(css).toContain(".tdb-tmid2:hover, .tdb-tmid2:focus-within { scrollbar-color: var(--hairline) transparent; }");
  });
});

describe("III P4 — the tucked Today tab · the masthead · the naming sweep", () => {
  it("VI P1: ONE face — the column is always mounted ≥1200; the tab, drawer and empty-rail state are extinct", () => {
    expect((page.match(/\{renderTodayPanel\(\)\}/g) ?? []).length).toBe(2); // column + narrow popover — never a third copy
    for (const stale of ["tdb-ttab", "emptyRailOpen", "sa.todoRail"]) {
      expect(page).not.toContain(stale);
      expect(css).not.toContain(stale);
    }
  });
  it("THE NAMING SWEEP — no stale strings anywhere on the board or the sheets (grep-level)", () => {
    const flow = readFileSync(join(here, "FocusFlow.tsx"), "utf8");
    const tour = readFileSync(join(here, "..", "..", "lib", "todoTour.ts"), "utf8");
    for (const stale of ["Walk me through", "walkSublabel", "walkAria"]) { // "Begin focused session" is REINSTATED as the hero's button (Final Shape)
      expect(page).not.toContain(stale);
      expect(flow).not.toContain(stale);
      expect(tour).not.toContain(stale);
    }
    expect(page).toMatch(/aria-label=\{`Focus on \$\{label\}`\}/); // cards view (the play button)
    expect(page).toMatch(/e\.stopPropagation\(\); onSession\(\)/); // the ledger heading shares the wording (play opts out of the fold click)
    expect(page).toContain("Begin focused session"); // the rail owns the walk (v4 P2)
  });
});
