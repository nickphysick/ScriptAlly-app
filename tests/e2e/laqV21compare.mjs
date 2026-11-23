/**
 * Log a query v2.1 — the side-by-side sheet: each of the ref's screens (design-refs/log-a-query-v2-1/screens) beside the
 * build's shot of the same screen (reports/log-a-query-v2-1/shots, written by laqV21.measure.ts). Reads files only.
 *
 *   node tests/e2e/laqV21compare.mjs      → reports/log-a-query-v2-1/compare/index.html
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";

const OUT = "reports/log-a-query-v2-1/compare";
const REF = "../../../design-refs/log-a-query-v2-1/screens";
const SHOTS = "../shots";
const PAIRS = [
  ["01-step-one-fixed", ["01-step-one@100"], "Step one: Not queried yet holds only agents with no query for this book"],
  ["02-step-one-already-queried-shown", ["02-step-one-already-queried-shown@100"], "Show: the already-queried agents, where each stands"],
  ["03-step-one-search-finds-queried-agent", ["03-step-one-search-finds-queried-agent@100"], "A search that finds an agent already queried"],
  ["04-not-sent-task-with-button", ["04-not-sent-task-with-button@100"], "Not sent yet: the task, with I've sent it"],
  ["05-back-at-sent-agent-chosen", ["05-back-at-sent-agent-chosen@100"], "Back at Sent from the To-do page, the agent chosen"],
  ["06-review-three-materials", ["06-review-three-materials@100", "06-review-three-materials@150"], "Review: three materials (100% and 150%)"],
  ["07-review-note-open", ["07-review-note-open@100"], "Review: the note open"],
  ["08-review-paperclip-open", ["08-review-paperclip-open@100"], "Review: the paperclip open (the card's own; Plumage colours v3 moves it)"],
  ["09-logged", [], "Logged: unchanged from v2 (reports/log-a-query-v2/shots)"],
  ["10-review-two-materials-no-date", ["10-review-two-materials-no-date@100"], "Review: two materials, no date"],
  ["11-review-one-material", ["11-review-one-material@100"], "Review: one material"],
];
const fig = (src, cap) => `<figure><img src="${src}" alt="${cap}" loading="lazy"><figcaption>${cap}</figcaption></figure>`;
const rows = PAIRS.map(([ref, shots, what]) => {
  const built = shots.filter((s) => existsSync(`reports/log-a-query-v2-1/shots/${s}.png`));
  const right = built.length ? built.map((s) => fig(`${SHOTS}/${s}.png`, `Build · ${s}`)).join("") : `<p class="none">No build shot: ${what.includes("unchanged") ? "the screen is unchanged" : "not captured in this run"}.</p>`;
  return `<section><h2>${ref.slice(0, 2)} · ${what}</h2><div class="pair">${fig(`${REF}/${ref}.png`, `Ref · ${ref}`)}<div class="built">${right}</div></div></section>`;
}).join("\n");
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/index.html`, `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Log a query v2.1 · ref beside build</title>
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
</style></head><body><h1>Log a query v2.1 · the ref beside the build</h1>
<p class="lead">Left: mock v24 (design-refs/log-a-query-v2-1/screens). Right: the build on the emulator, read by tests/e2e/laqV21.measure.ts. The query card is the real grid card, not the ref's markup.</p>
${rows}
</body></html>
`);
console.log(`compare: ${PAIRS.length} screens → ${OUT}/index.html`);
