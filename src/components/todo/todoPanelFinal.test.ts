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
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const promo = readFileSync(join(here, "AssistantPromo.tsx"), "utf8");

/** Read a single CSS rule body by exact selector (first match). */
const ruleIn = (css: string) => (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const shell = ruleIn(shellCss);

describe("the chip bench — relocated to the page body (shell follow-up P3)", () => {
  const bench = page.slice(page.indexOf("function renderFilterSection"), page.indexOf("function renderTodayCorner"));
  const chipFn = page.slice(page.indexOf("function benchChip"), page.indexOf("function renderComposer"));

  it("ONE bench mount, seated in the body beside the Pro sticker", () => {
    expect(page).toContain('<div className="tdb-benchgrow">{renderFilterSection()}</div>');
    expect(bench).toContain('<div className="spine-bench">');
    expect(bench).not.toContain("tdb-fpill"); // the old row-list class stays gone
  });

  it("the bench card: the deeper-parchment inset, its own tokens, radius 12", () => {
    const root = shell(".spine-root");
    expect(root).toContain("--spine-bench-bg: #ece4d4");
    expect(root).toContain("--spine-bench-bd: #dbcfb8");
    const card = shell(".spine-bench");
    expect(card).toContain("background: var(--spine-bench-bg)");
    expect(card).toContain("border: 1px solid var(--spine-bench-bd)");
    expect(card).toContain("border-radius: 12px");
  });

  it("the header: the funnel + the mono FILTER label + a Clear link shown ONLY when a facet narrows", () => {
    expect(bench).toContain('<div className="spine-benchhead">');
    expect(bench).toContain("<Funnel size={12} />"); // lucide (TypeGlyph is locked to material types)
    expect(bench).toContain("<b>FILTER</b>");
    expect(bench).toContain("{!resting && ("); // Clear renders only when a narrower facet is active
    expect(bench).toContain('className="spine-benchclr" onClick={() => setFilters({ ...DEFAULT_FILTERS })}');
    expect(shell(".spine-benchhead b")).toContain("font-family: var(--f12-mono)"); // FILTER is mono
  });

  it("the facets are wrapping toggle chips; All leads as the Show-all reset", () => {
    expect(bench).toContain('className={`spine-chip all${resting ? " on" : ""}`}');
    expect(bench).toContain("aria-pressed={resting}"); // All is pressed at rest
    expect(bench).toContain("fnFace(shownY, searchTotal ?? shownY)"); // the struck total on All
    for (const [label, key] of [["Offers", "offers"], ["Agent waiting", "overToYou"], ["Materials", "materials"], ["Wish lists", "mswl"], ["Stale", "stale"], ["Snoozed", "snoozed"], ["Notes", "notes"]]) {
      expect(bench).toContain(`benchChip("${label}", "${key}"`);
    }
    expect(shell(".spine-chips")).toContain("flex-wrap: wrap");
  });

  it("THE SELECTION MODEL IS UNCHANGED — chips call togglePill; one active facet, never multi-select", () => {
    expect(chipFn).toContain("setFilters((f) => togglePill(f, key))"); // the identical handler
    expect(chipFn).toContain("aria-pressed={!resting && on}");
    expect(chipFn).toContain('!resting && on ? " on" : ""'); // selected = the ink fill
    expect(chipFn).toContain('live === 0 ? " zero" : ""'); // zero-count = faded, still rendered
    const chip = shell(".spine-chip");
    expect(chip).toContain("background: var(--spine-chip-bg)");
    expect(chip).toContain("border: 1px solid var(--spine-chip-bd)");
    expect(shell(".spine-chip.on")).toContain("background: var(--spine-chip-on-bg)");
    expect(shell(".spine-chip.on")).toContain("color: var(--spine-chip-on-tx)");
    expect(shell(".spine-chip.zero")).toContain("opacity: 0.45");
    expect(shell(".spine-root")).toContain("--spine-chip-on-bg: #3a2c20");
    expect(shell(".spine-root")).toContain("--spine-chip-on-tx: #f3e7da");
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

describe("the blue Pro sticker — relocated to the page body (shell follow-up P3)", () => {
  it("gated to non-Pro only; the count is live-derived; it opens the assistant preview", () => {
    expect(page).toContain("{!isProUser(currentUser) && (");
    expect(page).toContain("<ProSticker hkCount={tiles.housekeeping} totalCount={shownY} onPreview={() => setAssistantOpen(true)} />");
    const sticker = promo.slice(promo.indexOf("export const ProSticker"), promo.indexOf("export const AssistantModal"));
    expect(sticker).toContain("{hkCount} of your {totalCount} tasks could run in the background whilst you write.");
    expect(sticker).toContain("onClick={onPreview}>Meet the assistant →");
  });

  it("the sticker is the board's card language turned blue — the ONLY blue sticker in the app", () => {
    const root = shell(".spine-root");
    expect(root).toContain("--spine-pro-bg: #fdf6f2"); // warm-white ground
    expect(root).toContain("--spine-pro-bd: #3a1c14"); // the ink border
    expect(root).toContain("--spine-pro-block: #c2cfda"); // the pastille-blue offset block
    expect(root).toContain("--spine-pro-pill-bg: #6A89A7"); // the slate pill
    const card = shell(".spine-pro");
    expect(card).toContain("border: 1.5px solid var(--spine-pro-bd)");
    expect(card).toContain("box-shadow: 4px 4px 0 var(--spine-pro-block)"); // the 4px blue block
    expect(shell(".spine-pro-title")).toContain("font-family: var(--f12-serif)"); // Playfair title
    expect(shell(".spine-pro-link")).toContain("color: var(--spine-pro-link)"); // the slate link
  });
});
