#!/usr/bin/env node
/**
 * Consistency fixes v1 — the review page (local only: it embeds screenshots of a copy of live data, and the repo is
 * public, so audits/consistency-fixes-v1/local/ is git-ignored).
 *
 *   node audits/consistency-fixes-v1/review.mjs <verdicts.json> <step0 instances.json> <step0 shots dir> <out.html>
 *
 * One self-contained page: images are embedded as data URIs.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const [VERD, INST, STEP0SHOTS, OUT] = process.argv.slice(2).map((p) => resolve(p));
const V = JSON.parse(readFileSync(VERD, "utf8")).verdicts;
const I = JSON.parse(readFileSync(INST, "utf8"));
const LOCAL = resolve(ROOT, "audits/consistency-fixes-v1/local/shots");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const img = (p, alt = "") => (p && existsSync(p) ? `<img alt="${esc(alt)}" src="data:image/png;base64,${readFileSync(p).toString("base64")}">` : `<div class="none">no crop</div>`);
const PAGE = { "overlay-Add-an-agent-journey": "Add an agent (journey)", agents: "Contact list", "agents-discover": "Discover", dashboard: "Dashboard", "your-notes": "Your notes", "overlay-Log-a-query-journey": "Log a query (journey)", "overlay-Query-card-slide-out": "Query card (slide-out)", todo: "To-do list", queries: "Query Centre", "queries-responses": "Responses", pricing: "Pricing", "queries-analytics": "Analytics (page guide)", contact: "Contact", import: "Import" };

const FIXED = {
  "R1-aap-info": "The little “i” info mark beside a pill: 11.5px → 12px.",
  "R1-cl26-bang": "The “!” badge on an agent's disc: 11px → 12px.",
  "R1-dv1-step": "The 1-2-3 step numerals in How it works: 11px → 12px.",
  "R1-d22-road": "The founding road's note counts (“1 note”, “3 notes”…): 11.5px → 12px.",
  "R1-laq-g": "The agent initials in the journey's big rows: 11px → 12px.",
  "R1-qc152-band": "The query card's stage band label (“OFFER”, “MATERIALS REQUESTED”): 11px → 12px.",
  "R1-qc152-av": "The query card's avatar initials: 8.5px → 12px.",
  "R1-qc153-more": "The “+39” overflow chip: 11px → 12px.",
  "R1-rsp15-stamp": "The date stamps (“20 Aug”): 11px → 12px.",
  "R1-tws-kbd": "The S / D key hints on Snooze and Done: 11px → 12px.",
  "R1-mk-fbtag": "“Founding writers” tag: 9.9px → 12px.",
  "R1-mk-fbmorelbl": "“What founding writers get” toggle: 10.6px → 12px.",
  "R1-pgd": "The page guide's “1 of 3”: 9px → 12px.",
  "R2-queries-signoff": "The list's sign-off “+ Log a query” is now the outline style beside it; the header's “+ Log a query” stays the one filled navy.",
  "R2-responses-share": "“Share your story” is now the page's outline style; “+ Record a response” in the header stays the one filled navy.",
  "R3-todo-wait": "“Agents are waiting” was a blush-filled button; now the desk's outline style. (Its “16” count keeps its white pill, which now sits on white.)",
};
const UNDONE = {
  "R1-dv1-pro": "The PRO tag (9px): at 12px its line grew 18 → 21px.",
  "R1-impg-fact": "Import's tile facts (9px): each tile grew 4.5px taller.",
  "R1-qc152-ag": "The query card's agency line (10.5px): its row grew 17px wider and 2.4px taller, and moved the tabs below it 1.4px.",
  "R1-qc152-ms": "The query card's manuscript line (10px): its row grew 60px wider and 7.6px taller.",
  "R1-qc152-bkc": "The query card's book chips (9.5px): the chip row grew 60px wider and 4.7px taller.",
  "R1-mk-rungline": "Pricing's ladder rate lines (.56rem = 9px): each rung grew 4px taller.",
  "R2-contact-send": "Contact's “Send message” in navy (the colour its phone rule already uses): it measured clean, but left --mk-ink-hov declared and unread, so src/marketing/marketingTokens.test.ts went red. Passing it would mean deleting a token or editing the test; reverted in 6214aad77.",
  "R1-laq-faces": "Log a query's stacked initials (8px): the measurements passed, but at 12px the letters run under the next overlapping circle (\u201cAK\u201d reads \u201cAI\u201d). Seen in the screenshot; reverted.",
  "R1-d60-hin": "The Dashboard ring's “OF 53” (8.5px): it passed its own check, but moved the “14” above it by 2.3px.",
};
const crop = (label, id) => { for (const [k, f] of Object.entries(V[id]?.pages || {})) { const page = k.split("@")[0]; const p = resolve(LOCAL, label, page, `${id}.png`); if (existsSync(p)) return { page, p }; } return { page: null, p: null }; };

let html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Consistency fixes v1 review</title>
<style>:root{--bg:#f6f2ec;--card:#fffdf9;--ink:#241c15;--muted:#7a6d62;--line:#e4dbd0}@media (prefers-color-scheme:dark){:root{--bg:#1b1814;--card:#24201b;--ink:#efe8de;--muted:#a69a8e;--line:#3a332b}}
body{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:0 auto}h1{font-size:28px;margin:0 0 6px}h2{font-size:21px;margin:36px 0 10px;border-bottom:1px solid var(--line);padding-bottom:6px}h3{font-size:16px;margin:0 0 6px}
.c{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:10px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px}.pair figure{margin:0}.pair img,.g img{max-width:100%;border:1px solid var(--line);background:#fff;display:block}figcaption,.m{font-size:12px;color:var(--muted)}code{font:12px ui-monospace,monospace;background:rgba(127,127,127,.12);padding:1px 4px;border-radius:3px}.g{display:flex;flex-wrap:wrap;gap:8px}.g img{max-height:120px}.none{font-size:12px;color:var(--muted)}table{border-collapse:collapse;font-size:13px}td,th{border-bottom:1px solid var(--line);padding:3px 8px;text-align:left}</style></head><body><main>
<h1>Consistency fixes v1 — review</h1><p class="m">Before and after at 1512×982 on dev's commit 5d8ef0504 (emulator harness account). Local only; not committed.</p><h2>Fixed (${Object.keys(FIXED).length})</h2>`;
for (const [id, words] of Object.entries(FIXED)) {
  const b = crop("before", id), a = crop("after", id);
  html += `<div class="c"><h3>${esc(PAGE[b.page || a.page] || b.page || "")} — ${esc(id)}</h3><p>${esc(words)}</p><p class="m">Selector <code>${esc(V[id]?.sel)}</code> · ${V[id]?.measured ?? 0} element readings, both widths, no wrap, clip, overlap or container growth over 2px.</p><div class="pair"><figure>${img(b.p, "before")}<figcaption>Before</figcaption></figure><figure>${img(a.p, "after")}<figcaption>After</figcaption></figure></div></div>`;
}
html += `<h2>Tried and undone (${Object.keys(UNDONE).length})</h2>`;
for (const [id, why] of Object.entries(UNDONE)) {
  const b = crop("before", id), a = crop("after", id);
  html += `<div class="c"><h3>${esc(PAGE[b.page] || b.page || "")} — ${esc(id)}</h3><p>${esc(why)} Undone; padding and widths were not adjusted to make it fit.</p><div class="pair"><figure>${img(b.p)}<figcaption>Before (as it stays)</figcaption></figure><figure>${img(a.p)}<figcaption>At 12px (undone)</figcaption></figure></div></div>`;
}
/* left alone: shell, audit-only, exempt, and R2/R4 left for Nick — crops from the Step 0 run */
const shot0 = (page, id, rule) => resolve(STEP0SHOTS, page, `${rule}-${id}.png`);
const left = (title, why, items, rule) => {
  html += `<div class="c"><h3>${esc(title)}</h3><p>${esc(why)}</p><table><tr><th>Page</th><th>Element</th><th>Value</th><th>Source</th></tr>${items.map((x) => `<tr><td>${esc(x.page)}</td><td><code>${esc(x.element.slice(0, 50))}</code> “${esc((x.examples[0] || "").slice(0, 30))}”</td><td>${esc(x.value)}</td><td><code>${esc(x.sources[0]?.at || "")}</code></td></tr>`).join("")}</table><div class="g">${items.slice(0, 8).map((x) => img(shot0(x.page, x.ids[0], rule))).join("")}</div></div>`;
};
html += `<h2>Left alone</h2>`;
const at = (x) => x.sources[0]?.at || "";
left("The app shell — for Nick's ruling (ruling 2)", "Recent designs Nick approved: the rail, the top bar, the beta pill, the manuscript spine. Not changed.", I.r1.filter((x) => /src\/components\/shell\/(betaChrome|inkShell|manuscriptSpine|sidebarRail)\.css|onboarding\.css:150/.test(at(x))).filter((x, i, a) => a.findIndex((y) => at(y) === at(x)) === i), "r1");
left("Audit-only: the search palette", "src/components/shell/searchInk.css is changed on the unmerged branch search-v1.", I.r1.filter((x) => /searchInk\.css/.test(at(x))), "r1");
left("Exempt: artwork, illustration labels and scaled-down copies", "The landing's hero card and before/after window are shrunk copies; the ILLUSTRATION placeholders label artwork; the To-do chevron is a zero-size glyph.", I.r1.filter((x) => /heroCard\.css|queriesPhone\.css|waitlist\.css|discover1\.css:332|marketing\.css:2386|todoWs\.css:129/.test(at(x))), "r1");
left("Not text: the sort arrow", "Responses' “↓” is an icon glyph in a sort chip.", I.r1.filter((x) => /qcv141\.css/.test(at(x))), "r1");
left("R2 — Dashboard: not obvious which button does the view's main job", "“Close this list” (the set-up checklist) and “Open task” (Next up) are both filled navy; neither is the header's action (the header's buttons are cream). Changed nothing.", I.r2.filter((x) => x.page === "dashboard" && /fv2-finclose|d2-open/.test(x.element)), "r2");
left("R4 — Settings: “Delete account…” in red, a possible exception for Nick", "Ruling 6: left as is.", I.r4, "r4");
/* R5 */
html += `<h2>R5 — burgundy and rust text (report only)</h2>`;
const R5 = [
  ["The beta strip (shell)", /sa-betapill|sa-betastrip/, "src/components/shell/betaChrome.css:32 (the Beta pill, #7c3a2a) and :45 (the strip's links, #7c3a2a)", "label; link"],
  ["The app footer's column headings", /af-col/, "src/components/shell/appFooter.css:34 (#8a4a3c)", "heading"],
  ["The founding band", /d22-how|d22-ask/, "src/components/dashboard/v2/dash2Founding.css:26 (How it works, #7a3f31) and :88 (emphasis, #7a3f31)", "link; emphasis inside a sentence"],
  ["Your notes' key chips", /yn-oc/, "src/components/notes/yourNotes.css:95, :97 (#7a3f31)", "label (chip)"],
  ["Settings avatar initial", /sc-id-av/, "src/components/settings/settingsInk.css:162 (var(--ink-terra-deep), #9a5638)", "label (monogram)"],
  ["Manuscripts “Coming soon”", /ms29-soon/, "src/components/manuscripts/v29/msv29.css:105 (#5a2a22)", "label (pill)"],
  ["Comps “In your current letter”", /cp32-rowu/, "src/components/manuscripts/comps32/comps32.css:99 (#7a3f33)", "label (pill)"],
  ["The landing hero card", /mk-lc-band/, "src/marketing/HeroCard.tsx:53 (YOU.fg #7c3a2a, the animated card)", "illustration"],
  ["To-do “days late” figures", /tws-du/, "src/components/todo/ws/todoWs.css:24 --tw-late (#9b4330), read at :165", "numeral and its label"],
];
for (const [title, re, src, kind] of R5) {
  const items = I.r5.filter((x) => re.test(x.chain.slice(0, 3).join(" ")));
  const pages = [...new Set(items.map((x) => x.page))];
  html += `<div class="c"><h3>${esc(title)} — ${pages.length} page${pages.length === 1 ? "" : "s"}, ${items.reduce((s, x) => s + x.n, 0)} elements</h3><p class="m">Source: <code>${esc(src)}</code> · What it is: ${esc(kind)} · Colours: ${esc([...new Set(items.map((x) => x.value))].join(", "))}</p><p class="m">Pages: ${esc(pages.join(", "))}</p><div class="g">${items.slice(0, 4).map((x) => img(shot0(x.page, x.ids[0], "r5"))).join("")}</div></div>`;
}
html += `</main></body></html>`;
writeFileSync(OUT, html);
console.log(`[review] ${OUT} (${Math.round(html.length / 1024)} KB)`);
