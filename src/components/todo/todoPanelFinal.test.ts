/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANEL, FINAL — what SURVIVES the shell follow-up (P3): the parchment panel itself retired
 * with the hardback spine (the v2 shell draws the chrome), and its two control surfaces — the
 * CHIP BENCH (P2) and the BLUE PRO STICKER (P3, option 5) — relocated to the page body. These
 * locks pin the survivors: the bench card + chips grammar, the selection model, the sticker's
 * card language and its assistant-preview wiring. The page is auth-gated (jsdom mounts
 * nothing); pixels are Nick's in-browser checklist.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const shellCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
const pageCss = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const promo = readFileSync(join(here, "AssistantPromo.tsx"), "utf8");

/** Read a single CSS rule body by exact selector (first match). */
const ruleIn = (css: string) => (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const shell = ruleIn(shellCss);

describe("the filter chips — bare on the control line (todo rebuild P1)", () => {
  const bench = page.slice(page.indexOf("function renderFilterChips"), page.indexOf("function renderTodayCorner"));
  const chipFn = page.slice(page.indexOf("function benchChip"), page.indexOf("function renderComposer"));

  it("the chips mount INSIDE the control line — the bench slab and its funnel/FILTER head are gone", () => {
    expect(page).toContain('<div className="tdb-ctrl">');
    expect(page).toContain("{renderFilterChips()}");
    expect(page).not.toContain('className="spine-bench"');
    expect(page).not.toContain("spine-benchhead");
    expect(page).not.toContain("<b>FILTER</b>");
    expect(page).not.toContain("spine-benchclr");
    expect(page).not.toContain("tdb-benchgrow"); // the two-column bench seat went with the slab
    expect(bench).not.toContain("tdb-fpill"); // the old row-list class stays gone
    expect(shellCss).not.toContain(".spine-bench {");
  });

  it("ONE row, not two bands: chips, a flexible spacer, then the list search and the view toggle", () => {
    const ctrl = page.slice(page.indexOf('<div className="tdb-ctrl">'), page.indexOf('<div className="tdb-board">'));
    expect(ctrl.indexOf("{renderFilterChips()}")).toBeLessThan(ctrl.indexOf("tdb-ctrlsp"));
    expect(ctrl.indexOf("tdb-ctrlsp")).toBeLessThan(ctrl.indexOf("tdb-bsearch"));
    expect(ctrl.indexOf("tdb-bsearch")).toBeLessThan(ctrl.indexOf("tdb-vtog"));
    // the tightening P1: the row became the RECESSED STRIP — one bar directly beneath the hero
    const row = ruleIn(pageCss)(".tdb-ctrl");
    expect(row).toContain("display: flex");
    expect(row).toContain("margin-top: 14px"); // directly beneath the hero
    expect(row).toContain("background: var(--strip-bg)");
    expect(row).toContain("border: 1px solid var(--strip-bd)");
    expect(row).toContain("border-radius: var(--strip-r)");
    expect(row).toContain("padding: 6px 8px");
    expect(ruleIn(pageCss)(".tdb-wrap")).toContain("--strip-bg: #f5f0e8");
    expect(ruleIn(pageCss)(".tdb-wrap")).toContain("--strip-bd: #e4dbcd");
    expect(ruleIn(pageCss)(".tdb-ctrlsp")).toContain("flex: 1");
    // the search: white, bordered, 7px radius, ~200px, right-aligned within the bar
    const srch = ruleIn(pageCss)(".tdb-bsearch");
    expect(srch).toContain("width: 200px");
    expect(srch).toContain("background: #fff");
    expect(srch).toContain("border: 1px solid #e0d6c6");
    expect(srch).toContain("border-radius: 7px");
    // the toggle: a white capsule; the active segment takes the ink
    expect(ruleIn(pageCss)(".tdb-vtog")).toContain("background: #fff");
    expect(ruleIn(pageCss)(".tdb-vtog button.on")).toContain("background: #2a1a13");
  });

  it("the facets are wrapping toggle chips; All leads as the Show-all reset", () => {
    expect(bench).toContain('className={`spine-chip all${resting ? " on" : ""}`}');
    expect(bench).toContain("aria-pressed={resting}"); // All is pressed at rest
    expect(bench).toContain("fnFace(shownY, searchTotal ?? shownY)"); // the struck total on All
    for (const [label, key] of [["Offers", "offers"], ["Agent waiting", "overToYou"], ["Materials", "materials"], ["Wish lists", "mswl"], ["Stale", "stale"], ["Snoozed", "snoozed"], ["Notes", "notes"]]) {
      expect(bench).toContain(`benchChip("${label}", "${key}"`);
    }
    expect(ruleIn(pageCss)(".tdb-ctrl")).toContain("flex-wrap: wrap");
  });

  it("THE SELECTION MODEL IS UNCHANGED — chips call togglePill; one active facet, never multi-select", () => {
    expect(chipFn).toContain("setFilters((f) => togglePill(f, key))"); // the identical handler
    expect(chipFn).toContain("aria-pressed={!resting && on}");
    expect(chipFn).toContain('!resting && on ? " on" : ""');
    expect(chipFn).toContain('live === 0 ? " zero" : ""'); // zero-count = faded, still rendered
  });

  it("the strip's chips (the tightening P1): transparent at rest, warm on hover, INK when active", () => {
    // supersedes the soft-pink selected chip — inside the recessed strip the active chip is the
    // ink fill (ref .fc.on), counts mono at 60%, zero-count chips at 40% and inert.
    const chip = shell(".spine-chip");
    expect(chip).toContain("background: var(--spine-chip-bg)");
    expect(chip).toContain("border: 0"); // fill-based, never a hairline-bordered pill
    expect(chip).toContain("border-radius: 7px");
    expect(shell(".spine-chip.on")).toContain("background: var(--spine-chip-on-bg)");
    expect(shell(".spine-root")).toContain("--spine-chip-bg: transparent");
    expect(shell(".spine-root")).toContain("--spine-chip-hov: #ece5d9");
    expect(shell(".spine-root")).toContain("--spine-chip-on-bg: #2a1a13"); // ink fill
    expect(shell(".spine-root")).toContain("--spine-chip-on-tx: #f3e7da"); // cream label
    expect(shell(".spine-chipn")).toContain("opacity: 0.6"); // counts at 60%
    // a zero-count chip fades AND stops being interactive
    expect(shell(".spine-chip.zero")).toContain("opacity: 0.4");
    expect(shell(".spine-chip.zero")).toContain("pointer-events: none");
  });

  it("the active search rides as a dismissable chip; the Today's-list lens stays retired (baked)", () => {
    expect(bench).toContain('className="spine-chip q"'); // the query chip, chip grammar
    expect(bench).toContain('onClick={() => setSearch("")}'); // its ✕ clears the search
    expect(bench).toContain("✕");
    expect(bench).not.toContain("todayOnly");
    expect(page).not.toContain('setF("todayOnly"');
    expect(page).not.toContain("const setF ="); // the lens's only setter is removed
  });
});

describe("the ASSISTANT BAND — the page's closing note (briefing-slot P2)", () => {
  it("gated to non-Pro only; the count is live-derived; it opens the assistant preview", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("<AssistantBand hkCount={tiles.housekeeping} totalCount={shownY} onPreview={() => setAssistantOpen(true)} />");
    const band = promo.slice(promo.indexOf("export const AssistantBand"), promo.indexOf("export const AssistantModal"));
    expect(band).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(band).toContain("onClick={onPreview}>Meet the assistant");
  });

  it("the BLUE STICKER returns, wide, at the foot — and it is the app's only one", () => {
    const r = ruleIn(pageCss)(".tdb-asst");
    expect(r).toContain("box-shadow: 4px 4px 0 #c2cfda");
    expect(r).toContain("border: 1.5px solid #3a1c14");
    expect((pageCss.match(/#c2cfda/g) ?? []).length).toBe(1);
    expect(page).not.toContain("ProStrip");
  });
});

describe("the To-do PAGE HEADER — exactly two actions (todo rebuild P4)", () => {
  const hdr = page.slice(page.indexOf("function renderPageHeader"), page.indexOf("function renderHero"));

  it("adopts the app-wide PageHeader — TITLE ONLY (the tightening P1 removed the subtitle)", () => {
    expect(page).toContain('import { PageHeader } from "../shell/PageHeader"');
    expect(page).toContain("{renderPageHeader()}");
    expect(hdr).toContain("<PageHeader");
    expect(hdr).toContain("title=\"What\u2019s on your desk?\"");
    expect(hdr).not.toContain("description="); // no subtitle node — title + actions on one line
    // the copy is gone from the LIVE header (it survives only inside the DORMANT renderHero,
    // kept whole for the session red gate — see the "DORMANT (todo rebuild P4)" note)
    expect(hdr).not.toContain("Urgent tasks, housekeeping, notes.");
    // the hero buttons take the ref's 34px step ON THIS PAGE ONLY (the global .svh-btn stays 38)
    expect(ruleIn(pageCss)(".tdb-wrap .svh-btn")).toContain("height: var(--hero-btn-h, 34px)");
  });

  it("exactly two: 'Last week in review' (ghost, disabled with no review) and 'Add task or note' (pink primary)", () => {
    expect((hdr.match(/label:/g) ?? []).length).toBe(2);
    expect(hdr).toContain('label: "Last week in review"');
    expect(hdr).toContain("disabled: !reviewWin"); // the house disabled treatment when none exists
    expect(hdr).not.toMatch(/label: "Last week in review",[\s\S]{0,120}primary: true/); // it is the ghost
    expect(hdr).toContain('label: "Add task or note"');
    expect(hdr).toContain('onClick: () => openComposer("task")'); // notes-and-tasks P2: the hero opens TASK mode
    expect(hdr).toContain("primary: true");
  });

  it("BEGIN FOCUSED SESSION is retired from the header — and NOTHING further was deleted (red gate)", () => {
    expect(hdr).not.toContain("Begin focused session");
    expect(hdr).not.toContain("tdb-herobegin");
    // the feature itself is untouched, dormant: its state, its component and the hero that
    // hosted its crossfade all survive, awaiting a new entry point.
    expect(page).toContain("const [session, setSession] = useState");
    expect(page).toContain("<FocusedSession");
    expect(page).toContain("function renderHero()");
    expect(page).toContain("Begin focused session"); // still present in the dormant hero
  });

  it("NO DARK PILL survives in the page's own CTAs: the header's primary is the soft-pink", () => {
    const ph = readFileSync(join(here, "..", "shell", "pageHeader.css"), "utf8");
    expect(ph).toContain(".svh-btn-primary { background: var(--pink)");
  });
});
