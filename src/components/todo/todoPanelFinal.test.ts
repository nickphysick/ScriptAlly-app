/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE PANEL, FINAL (panel-final pack) — source/rule-text locks for the settled parchment panel:
 *   P1  the geometry + the breathing head (design-refs/panel-geometry.html, fix56)
 *   P2  the chip bench (design-refs/panel-chip-bench.html, fix59 · W1)
 *   P3  the blue-sticker Pro card (design-refs/pro-card.html, fix57 · option 5)
 * The page is auth-gated (jsdom mounts nothing); geometry, tokens and grammar are locked here,
 * the pixels are Nick's in-browser checklist. Supersedes the spine pack's context-zone row-list.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const here = __dirname;
const shellCss = readFileSync(join(here, "..", "shell", "todoShell.css"), "utf8");
const shellTsx = readFileSync(join(here, "..", "shell", "TodoShell.tsx"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

/** Read a single CSS rule body by exact selector (first match). */
const ruleIn = (css: string) => (sel: string): string => {
  const m = css.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\{([^}]*)\\}"));
  if (!m) throw new Error(`rule not found: ${sel}`);
  return m[1];
};
const shell = ruleIn(shellCss);

describe("panel-final P1 — panel geometry + the breathing head", () => {
  it("width: the panel is 260px, owned by the one token; the collapse tier is unchanged", () => {
    expect(shell(".spine-root")).toContain("--spine-panel-w: 260px");
    expect(shell(".spine-panel")).toContain("width: var(--spine-panel-w)");
    // the tier that turns the panel into a rail-triggered overlay is untouched
    expect(shell(".spine-root")).toContain("--tsh-collapse: 1100px");
  });

  it("the type scale lives once, on the root, at the settled sizes", () => {
    const root = shell(".spine-root");
    expect(root).toContain("--spine-row-h: 38px");
    expect(root).toContain("--spine-row-fs: 13px");
    expect(root).toContain("--spine-count-fs: 10px");
    expect(root).toContain("--spine-lab-fs: 7.5px");
    expect(root).toContain("--spine-lab-tr: 0.22em");
  });

  it("the panel rows/counts/labels READ the scale — no magic sizes left behind", () => {
    const ni = shell(".spine-ni");
    expect(ni).toContain("height: var(--spine-row-h)");
    expect(ni).toContain("font-size: var(--spine-row-fs)");
    expect(shell(".spine-n")).toContain("font-size: var(--spine-count-fs)");
    // both mono labels (category + context) take the label size AND the wider tracking
    for (const sel of [".spine-cat", ".spine-nk"]) {
      expect(shell(sel)).toContain("font-size: var(--spine-lab-fs)");
      expect(shell(sel)).toContain("letter-spacing: var(--spine-lab-tr)");
    }
    // the pre-final literals are gone from these rules
    expect(shell(".spine-ni")).not.toMatch(/height:\s*32px/);
    expect(shell(".spine-ni")).not.toMatch(/font-size:\s*11\.5px/);
    expect(shell(".spine-cat")).not.toMatch(/6\.5px/);
    expect(shell(".spine-nk")).not.toMatch(/6\.5px/);
  });

  it("the wordmark is up a step — the real brand artwork, sized 34 (not the 30 it was)", () => {
    const panelBlock = shellTsx.slice(shellTsx.indexOf('className="spine-panel"'), shellTsx.indexOf('className="tsh-mainwrap"'));
    expect(panelBlock).toContain("<ScriptAllyLogo heightPx={34} />");
    expect(panelBlock).not.toContain("heightPx={30}");
  });

  it("the breathing head: ≥28px of clear space beneath the wordmark, tokened, and it IS the first content node's offset", () => {
    const clear = /--spine-head-clear:\s*(\d+)px/.exec(shell(".spine-root"));
    expect(clear).not.toBeNull();
    expect(Number(clear![1])).toBeGreaterThanOrEqual(28);
    // the clear space rides on the wordmark's bottom padding — the token, nothing hardcoded
    expect(shell(".spine-word")).toContain("padding: 0 6px var(--spine-head-clear)");
    // the FIRST content node after the wordmark is .spine-cat; its own top padding is 0,
    // so the offset from the wordmark to the first content is EXACTLY the token
    expect(shellTsx.indexOf('className="spine-word"')).toBeLessThan(shellTsx.indexOf('className="spine-cat"'));
    expect(shell(".spine-cat")).toContain("padding: 0 6px 6px");
  });

  it("the session panel-exit stays clean at the new width — the clearing panel tracks the same token", () => {
    const clearing = shell(".spine-clearing .spine-panel");
    expect(clearing).toContain("position: absolute"); // leaves the flow so the region reclaims 260px
    expect(clearing).toContain("width: var(--spine-panel-w)"); // exit width follows the widened token
    expect(clearing).toContain("transform: translateX(-100%)"); // slides off left; the rail persists
  });
});

describe("panel-final P2 — the chip bench", () => {
  const bench = page.slice(page.indexOf("function renderFilterSection"), page.indexOf("function renderTodayCorner"));
  const chipFn = page.slice(page.indexOf("function benchChip"), page.indexOf("function renderComposer"));

  it("the context zone is the bench card, self-headed — the ruled label + the row list are retired", () => {
    // the mount passes content only (no contextLabel); the shell renders it gated on the content
    expect(page).toContain("contextContent={renderFilterSection()}");
    expect(page).not.toContain('contextLabel="TO-DO · FILTERS"');
    expect(shellTsx).toContain('{contextContent && <div className="spine-ctx">{contextContent}</div>}');
    expect(shellTsx).not.toContain('className="spine-nk"');
    expect(bench).toContain('<div className="spine-bench">');
    expect(bench).not.toContain("tdb-fpill"); // the old row-list class is gone from the render
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
    expect(bench).toContain("<Funnel size={12} />"); // lucide (TypeGlyph is locked to material types — see report)
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

  it("the active search rides as a dismissable chip; the Today's-list lens is retired (baked)", () => {
    expect(bench).toContain('className="spine-chip q"'); // the query chip, chip grammar
    expect(bench).toContain('onClick={() => setSearch("")}'); // its ✕ clears the search
    expect(bench).toContain("✕");
    // the Today lens button is GONE — no todayOnly toggle in the panel (it lives in the corner)
    expect(bench).not.toContain("todayOnly");
    expect(page).not.toContain('setF("todayOnly"');
    expect(page).not.toContain("const setF ="); // the lens's only setter is removed
  });
});
