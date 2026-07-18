/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Corner cluster + adaptive pill source locks (corner pack). Logic-only test policy → the skin,
 * companions, and (Phase 2) the state derivation are pinned at the source/rule-text layer.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, "todo.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

describe("Corner — L1 letterpress skin + companions", () => {
  it("the pill is letterpress (parchment, 1.5px ink, float shadow) — the sage gradient is gone", () => {
    expect(css).toMatch(/\.tdb-fab \{[^}]*background: var\(--paper\)[^}]*border: 1\.5px solid var\(--ink\)[^}]*border-radius: 99px/);
    expect(css).not.toMatch(/\.tdb-fab \{[^}]*linear-gradient\(180deg, var\(--hk-sage\)/);
  });
  it("the ring is an SVG stroke (hairline track + ink progress, rounded cap), not a conic gradient", () => {
    expect(page).toContain('<circle cx="17" cy="17" r="14" fill="none" stroke="var(--line)" strokeWidth="3" />');
    expect(page).toContain('strokeLinecap="round" strokeDasharray="88" strokeDashoffset={88 - (88 * st.pct) / 100}');
    expect(css).toContain(".tdb-fabring svg { width: 34px; height: 34px; transform: rotate(-90deg); }");
    expect(page).not.toContain("conic-gradient(var(--ink)");
  });
  it("settings + pill sit on one baseline (bottom:20) with 12px gaps, matched to the 38px paper help", () => {
    expect(css).toMatch(/\.tdb-setbtn \{[^}]*right: 70px; bottom: 20px[^}]*width: 38px; height: 38px[^}]*background: var\(--paper\)/);
    expect(css).toMatch(/\.tdb-fab \{[^}]*right: 120px; bottom: 20px/); // 20 + 38 + 12 + 38 + 12
  });
  it("all three controls carry a visible focus ring", () => {
    expect(css).toContain(".tdb-fab:focus-visible { outline: 2px solid var(--hk-ink);");
    expect(css).toContain(".tdb-setbtn:focus-visible { outline: 2px solid var(--hk-ink);");
  });
});

describe("Corner — L1 adaptive three-state pill (Phase 2)", () => {
  it("the pill derives its face from pillState (single source), not ad-hoc inline branching", () => {
    expect(page).toContain("pillState, pillAria");
    expect(page).toContain("const st = pillState(committedCards.length, doneN);");
    expect(page).toContain('aria-label={pillAria(st)}');
  });
  it("all three faces are present — ring fraction (list), ✓ puck (done), + puck (fresh)", () => {
    expect(page).toContain('st.kind === "list" ?');
    expect(page).toContain('{st.done}/{st.committed}'); // truthful fraction, never a bare dash
    expect(page).toContain('st.kind === "done" ?');
    expect(page).toContain('tdb-fabpuck tick'); // the done ✓ puck
    expect(page).toContain('tdb-fabpuck plus'); // the fresh + puck
  });
  it("the inner content is keyed by state so the face crossfades on change", () => {
    expect(page).toContain('className="tdb-fabinner" key={st.kind}');
    expect(css).toContain(".tdb-fabinner {");
    expect(css).toContain("animation: tdbFabFade 0.2s ease;");
    expect(css).toContain("@keyframes tdbFabFade");
    expect(css).toMatch(/prefers-reduced-motion: reduce\) \{ \.tdb-fabinner \{ animation: none/);
  });
});
