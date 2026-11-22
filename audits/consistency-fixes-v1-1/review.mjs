#!/usr/bin/env node
/**
 * Consistency fixes v1.1 — the review page: for each phase, the before and after crops side by side, then what was
 * undone or left and why. Crops are read from the run folders (outside the repo) and embedded, so the page is one
 * file; it shows harness data, so it is written outside the repo too.
 *
 *   node audits/consistency-fixes-v1-1/review.mjs <shotsDir> <out.html>
 *
 * shotsDir holds <label>/<page>/<fixId>.png from CA_CHECK runs (labels: before, pre2, final, p2-99, p6).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [SHOTS, OUT] = process.argv.slice(2).map((p) => resolve(p));
const img = (label, page, id) => {
  const p = resolve(SHOTS, label, page, `${id}.png`);
  return existsSync(p) ? `<img alt="${label} ${id}" src="data:image/png;base64,${readFileSync(p).toString("base64")}">` : `<p class="miss">no crop (${label})</p>`;
};
const pair = (page, id, label, note, beforeLabel = "before") =>
  `<figure><figcaption><b>${label}</b> <span>${page} · ${id}</span>${note ? `<em>${note}</em>` : ""}</figcaption><div class="ba"><div><small>Before</small>${img(beforeLabel, page, id)}</div><div><small>After</small>${img("final", page, id)}</div></div></figure>`;

const PHASES = [
  ["Phase 1 · the white count pill", [["todo", "P1-wait-pill", "“Agents are waiting” count chip", "1px inset ring #d4cabd; box 30.2×22 unchanged"]]],
  ["Phase 2 · shell text to 12px (ruling 1)", [
    ["account-preferences", "S-rail-lbl", "Rail labels 11.5 → 12px", "“Preferences” 69.4px in its 76px item", "pre2"],
    ["dashboard", "S-rail-fb", "Feedback label 11 → 12px", "control 54 → 55px tall; foot ends at 970 of 982", "pre2"],
    ["dashboard", "S-sfield-k", "Search ⌘K hint 10 → 12px", "field stays 168×38; “Search” not truncated", "pre2"],
    ["account-profile", "S-esc", "Settings bar “esc” 8.5 → 12px", "“Back to app” stays 38px tall; 7.2px wider", "pre2"],
    ["dashboard", "S-betapill", "Beta pill 8.5 → 12px", "padding 4px → 1.5px top and bottom; strip 41.8 → 42px", "pre2"],
  ]],
  ["Phase 3 · “Close this list” as an outline (ruling 4)", [["dashboard", "D-finclose", "Close this list", "transparent, navy text, 1.5px inset navy ring; 123.1×38 unchanged"]]],
  ["Phase 4 · the Beta strip in ink (ruling 5)", [["dashboard", "B-betalink", "Beta strip link (the pill is in Phase 2’s crop)", "#7c3a2a → #3a1c14; still underlined"]]],
  ["Phase 5 · one rust, --sp-rust #7a3f31 (ruling 6)", [
    ["queries-analytics", "R-footer-h4", "App footer headings", "#8a4a3c → #7a3f31"],
    ["queries-analytics", "R-footer-made", "Footer “made” icon", "#8a4a3c → #7a3f31"],
    ["account-profile", "R-acct-av", "Settings avatar initial", "#9a5638 (--ink-terra-deep) → #7a3f31"],
    ["manuscripts", "R-ms-soon", "Manuscripts “Coming soon”", "#5a2a22 → #7a3f31; 6.49:1"],
    ["manuscripts-comps", "R-cp-rowu", "Comps “In your current letter”", "#7a3f33 → #7a3f31"],
    ["dashboard", "R-d22-keep", "Founding band (token, same colour)", "renders rgb(122, 63, 49) before and after"],
    ["your-notes", "R-yn-keep", "Your notes chips (token, same colour)", "renders rgb(122, 63, 49) before and after"],
  ]],
  ["Phase 6 · To-do day counts in ink, “past expected” (ruling 7)", [
    ["todo", "T-du-late", "Past-date day counts", "rgb(155, 67, 48) → ink rgb(58, 51, 45)"],
    ["todo", "T-hdr-line", "Header line", "“29 late · 52 to tidy” → “29 past expected · 52 to tidy”; one line, 202.3 of 209.6px"],
  ]],
];

const left = `
<section><h2>Undone</h2>
<figure><figcaption><b>Rail count badge (Phase 2)</b> <span>todo · S-rail-ct at “99+” (CA_RAIL99)</span><em>At 12px/18px, min-width 20, padding 0 5px the “99+” badge is 31.6px wide and reaches x=80.6, past the rail’s 80px edge; the nav’s scroll box cuts its round end and ring flat. Undone; it stays 9px.</em></figcaption>
<div class="ba"><div><small>12px, as tried</small>${img("p2-99", "todo", "S-rail-ct")}</div><div><small>As shipped (9px)</small>${img("final", "todo", "S-rail-ct")}</div></div></figure>
</section>
<section><h2>Left, by the prompt</h2><ul>
<li>Manuscript spine title, 10.5px — ruling 2, artwork.</li>
<li>Sign-in pages’ Beta pill (onboarding.css, 8px) — inside <code>@media (max-width: 767.98px)</code>, phone only.</li>
<li>“Delete account…” stays red — ruling 3.</li>
<li>Landing hero card burgundy — an illustration.</li>
</ul></section>
<section><h2>The other uses of --tw-late, for Nick’s ruling</h2>
<figure><figcaption><b>Dismiss pop, red option picked</b> <span>todoWs.css:304 <code>.tws-go[data-red]</code> (fill) · :483 <code>.tws-po[data-warn] span</code> (text)</span></figcaption><div class="ba one">${img("p6", "todo", "late-dismiss-pop")}</div></figure>
<figure><figcaption><b>Filter pip</b> <span>todoWs55.css:30 <code>.tws55-pip</code> (fill), shown while a filter is on</span></figcaption><div class="ba one">${img("p6", "todo", "late-filter-pip")}</div></figure>
<p>todoWs.css:540 <code>.tws-bd .tws-bdl</code> — no component renders <code>tws-bd</code>; dead CSS, no crop.</p>
</section>`;

const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Consistency fixes v1.1</title>
<style>
:root { --ink: #1c130f; --mut: #6b5f56; --line: #e3dbcf; --bg: #f5f1eb; }
body { margin: 0; padding: 24px 16px 64px; background: var(--bg); color: var(--ink); font: 15px/1.5 Georgia, serif; }
main { max-width: 1180px; margin: 0 auto; }
h1 { font-size: 28px; margin: 0 0 4px; } h2 { font-size: 20px; margin: 36px 0 12px; }
p.lede { color: var(--mut); margin: 0 0 8px; }
figure { margin: 0 0 18px; padding: 14px; background: #fff; border-radius: 12px; box-shadow: 0 0 0 1px var(--line); }
figcaption { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: baseline; margin-bottom: 10px; }
figcaption span { color: var(--mut); font: 12px ui-monospace, monospace; } figcaption em { flex-basis: 100%; color: var(--mut); }
.ba { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; } .ba.one { grid-template-columns: 1fr; }
.ba small { display: block; font: 12px ui-monospace, monospace; color: var(--mut); margin-bottom: 4px; }
.ba img { max-width: 100%; height: auto; border-radius: 6px; box-shadow: 0 0 0 1px var(--line); }
.miss { color: var(--mut); font-style: italic; }
@media (max-width: 640px) { .ba { grid-template-columns: 1fr; } }
</style></head><body><main>
<h1>Consistency fixes v1.1</h1>
<p class="lede">Branch consistency-fixes-v1-1 on dev's 003562e45 + consistency-fixes-v1. Crops at 1512×982 from the emulator harness; “before” is the state just before each phase.</p>
${PHASES.map(([h, rows]) => `<section><h2>${h}</h2>${rows.map(([p, id, l, n, b]) => pair(p, id, l, n, b)).join("")}</section>`).join("")}
${left}
</main></body></html>`;
writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${Math.round(html.length / 1024)} KB)`);
