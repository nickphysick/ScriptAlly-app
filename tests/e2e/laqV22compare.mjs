/**
 * Log a query v2.2 — the side-by-side sheet: each of the ref's screens (design-refs/log-a-query-v2-2/screens) beside the
 * build's shot of the same screen (reports/log-a-query-v2-2/after, written by laqV22.measure.ts). Reads files only.
 *
 *   node tests/e2e/laqV22compare.mjs      → reports/log-a-query-v2-2/compare/index.html
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const OUT = "reports/log-a-query-v2-2/compare";
const REF = "../../../design-refs/log-a-query-v2-2/screens";
const SHOTS = "../after";
const PAIRS = [
  ["01-review", ["review-three@100", "review-three@150"], "Review: three materials (100% and 150%)"],
  ["02-review-materials-tile-open", ["review-three-popup@100", "review-three-popup@150"], "Review: the materials tile's pop-up, inside the card's width"],
  ["03-note-box-open", ["notes-03-box-open"], "Review: Add a note opens the Notes tab's writing box"],
  ["04-note-typed", ["notes-04-typed"], "Review: a note typed"],
  ["05-note-added", ["notes-05-added"], "Review: the note added, as the tab draws it, Edit and Delete shown"],
  ["06-note-being-edited", ["notes-06-editing"], "Review: a note edited in place"],
  ["07-review-with-a-note-top", ["notes-07-two-and-box", "notes-08-on-the-card"], "Review with a note; and the note on the query card's Notes tab after logging"],
  ["08-logged-stamp-on-the-corner", ["logged-three@100", "logged-one@100", "logged-nodate@100", "logged-three@150"], "Logged: the card full width, the stamp on its corner (three, one, two materials / no date; 150%)"],
  ["09-not-sent", ["not-sent@100"], "Not sent yet: \u201cThe task is on your To-do page.\u201d"],
];
const fig = (src, cap) => `<figure><img src="${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const rows = PAIRS.map(([ref, shots, what]) => {
  const built = shots.filter((s) => existsSync(`reports/log-a-query-v2-2/after/${s}.png`));
  const right = built.length ? built.map((s) => fig(`${SHOTS}/${s}.png`, `Build · ${s}`)).join("") : `<p class="none">No build shot: ${what.includes("unchanged") ? "the screen is unchanged" : "not captured in this run"}.</p>`;
  return `<section><h2>${ref.slice(0, 2)} · ${what}</h2><div class="pair">${fig(`${REF}/${ref}.png`, `Ref · ${ref}`)}<div class="built">${right}</div></div></section>`;
}).join("\n");
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Log a query v2.2 · ref beside build</title>
<style>
:root{--ink:#1c130f;--mut:#5b4f47;--page:#f2eee8;--line:#e2d9cc}
@media (prefers-color-scheme:dark){:root{--ink:#f2eee8;--mut:#c9bfb4;--page:#1b2433;--line:#3a4558}}
body{margin:0;padding:24px 16px 60px;background:var(--page);color:var(--ink);font:16px/1.45 Georgia,serif}
h1{font-size:24px;margin:0 0 6px}p.lead{margin:0 0 24px;color:var(--mut)}
section{margin:0 0 36px;padding-top:16px;border-top:1px solid var(--line)}h2{font-size:17px;margin:0 0 12px}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.built{display:grid;gap:16px}
figure{margin:0}img{display:block;width:100%;height:auto;border-radius:10px;box-shadow:0 0 0 1px var(--line)}
figcaption{font-size:13px;color:var(--mut);margin-top:6px}.none{color:var(--mut);font-style:italic}
@media (max-width:700px){.pair{grid-template-columns:1fr}}
</style></head><body><h1>Log a query v2.2 · the ref beside the build</h1>
<p class="lead">Left: mock v25 (design-refs/log-a-query-v2-2/screens). Right: the build on the emulator, read by tests/e2e/laqV22.measure.ts. The query card is the real grid card (QcCard154 as Plumage colours v3 left it), not the ref's drawing of it; the build's panel is narrower than the ref's 1052px canvas.</p>
${rows}
</body></html>
`);
console.log(`compare: ${PAIRS.length} screens → ${OUT}/index.html`);
