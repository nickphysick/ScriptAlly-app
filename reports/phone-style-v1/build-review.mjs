#!/usr/bin/env node
/**
 * Phone style v1, Phase 5 — builds audit.md and review.html from audit.json (written by
 * `PS_ONLY=audit npm run e2e:emu -- tests/e2e/phoneStyle.measure.ts --project=pixel`).
 *   node reports/phone-style-v1/build-review.mjs
 * Read-only over the app: it reads the measurement's JSON and the shots beside it, nothing else.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = dirname(fileURLToPath(import.meta.url));
const A = JSON.parse(readFileSync(join(DIR, "audit.json"), "utf8"));
const ORDER = JSON.parse(readFileSync(join(DIR, "rollout.json"), "utf8"));

/* PS1's measured assertions, and the sheet rules each speaks for */
const MEASURED = {
  "PS1-1": "P8 · P12 sizes", "PS1-2": "P9 · P10 weights, the typewriter", "PS1-3": "P1 · P19 · P20 page, card corner and shadow",
  "PS1-4": "P15 the 16 gutter", "PS1-5": "P18 targets 48, rows 64", "PS1-6": "P6 grey on the page", "PS1-7": "P5 one coloured card",
  "PS1-8": "one filled button", "PS1-9": "P21 dashes", "PS1-10": "rows in a card",
};
const BY_EYE = ["P2", "P3", "P4", "P7", "P11", "P13", "P14", "P16", "P17"];
const slug = (n) => n.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
const screens = Object.entries(A).filter(([k]) => !k.startsWith("("));
const shot = (name) => (name === "the phone landing" ? "the-phone-landing" : name === "pricing" ? "pricing" : slug(name));

let md = `# Phone style v1 — the audit of every phone screen (Phase 5)\n\n`;
md += `Read-only: no app code changed for this. Measured at 390 × 844 on the emulator harness by PS1 in report mode (tests/e2e/phoneStyle.measure.ts, group \`audit\`), the same probe that is a hard gate on Today. Numbers are breaches counted on the rendered page — each element once per assertion. Open \`review.html\` beside this file for the shots.\n\n`;
md += `Rules PS1 cannot measure are marked *by eye* (${BY_EYE.join(", ")}): read them off each screen's shot. P22–P27 are measured separately below.\n\n`;

md += `## One table: screens by rule\n\n| Screen | ${Object.keys(MEASURED).map((k) => `${k}<br>${MEASURED[k]}`).join(" | ")} | total |\n|---|${Object.keys(MEASURED).map(() => "--:").join("|")}|--:|\n`;
for (const [n, v] of screens) {
  if (v.failed) { md += `| ${n} | FAILED: ${v.failed.slice(0, 80)} |${Object.keys(MEASURED).map(() => "").join("|")}|\n`; continue; }
  const r = v.rules; const t = Object.values(r).reduce((a, b) => a + b, 0);
  md += `| ${n} | ${Object.keys(MEASURED).map((k) => r[k] || "·").join(" | ")} | ${t} |\n`;
}

md += `\n## Proposed roll-out order\n\nMost-used screens first. Size is the work, not the count: a count of 150 that is one rule on one repeated row is small.\n\n| # | Screen(s) | Size | What would visibly change |\n|--:|---|---|---|\n`;
ORDER.forEach((o, i) => { md += `| ${i + 1} | ${o.screens} | ${o.size} | ${o.change} |\n`; });

md += `\n## Per screen\n\n`;
for (const [n, v] of screens) {
  md += `### ${n}\n\n`;
  if (v.failed) { md += `**FAILED** — the probe could not reach it: ${v.failed}\n\n`; continue; }
  md += `Shot: \`audit/${shot(n)}.png\` · population ${v.pop.texts} texts, ${v.pop.cards} cards, ${v.pop.taps} tappable, ${v.pop.rows} rows.\n\n`;
  for (const k of Object.keys(MEASURED)) {
    const s = v.samples[k] ?? [];
    if (!s.length) continue;
    md += `- **${k}** (${MEASURED[k]}): ${s.length} — ${s.slice(0, 4).map((x) => `\`${x.replace(/`/g, "'").slice(0, 90)}\``).join("; ")}${s.length > 4 ? " …" : ""}\n`;
  }
  md += `- *By eye:* ${BY_EYE.join(", ")} — see the shot.\n\n`;
}

md += `## Touch and motion (P23–P27)\n\n`;
md += `**Pressed state (P23).** Each tappable on screen was given the pressed state (DevTools' \`:active\`, forced: a synthetic touch or mouse press did not raise \`:active\` in this emulation, even on Today's rows, whose pressed state is known — Today is the calibration and shows it). A press drawn by script on pointerdown (To do's card) is not seen by this. Tappables with no pressed state:\n\n| Screen | pressed / tested | with no pressed state (first eight) |\n|---|--:|---|\n`;
for (const [n, v] of screens) { if (!v.pressed) continue; md += `| ${n} | ${v.pressed.n - v.pressed.none.length} / ${v.pressed.n} | ${v.pressed.none.slice(0, 8).map((x) => `\`${x.replace(/`/g, "'").slice(0, 40)}\``).join(", ")} |\n`; }
md += `\n**Saves with no snackbar (P25).** Measured only where an existing lock already saves and undoes in the same run: To do's right swipe (PA5-10) and filling a gap (PA5-11) — both show the snackbar with Undo. Every other save writes, and this pack's measurement writes nothing, so no other save was pressed: that list is **not measured** (a question for the roll-out pack, which can save and undo screen by screen).\n\n`;
md += `**Loads (P26).** Each root reloaded under a slow network (400 ms latency, 200 kB/s) and a 4× slower CPU; spinner = anything visible turning, or a progressbar, sampled every 100 ms; jump = cumulative layout shift.\n\n| Root | layout shift | spinner samples |\n|---|--:|--:|\n`;
for (const [p, r] of Object.entries(A["(loads)"] ?? {})) md += `| \`${p}\` | ${r.cls} | ${r.spinnerTicks} |\n`;
md += `\n**Motion (P24, P27)** is by eye: every phone stylesheet stops its animations under reduced motion (phoneV4.css, phoneV5.css), and PS1 ran with motion killed.\n\n`;

md += `## Icons (P22: a 24 box, a 1.8 line, round ends)\n\nEvery svg up to 40 wide on each screen, status marks excluded (P22 keeps status to the marks).\n\n| box | line | ends | count | on |\n|---|---|---|--:|---|\n`;
const ic = new Map();
for (const [n, v] of screens) for (const i of v.icons ?? []) { const k = `${i.box}|${i.stroke}|${i.cap}`; const e = ic.get(k) ?? { n: 0, on: new Set() }; e.n++; e.on.add(n); ic.set(k, e); }
for (const [k, e] of [...ic].sort((a, b) => b[1].n - a[1].n)) { const [b, s, c] = k.split("|"); const ok = b === "24×24" && s === "1.8px" && c === "round"; md += `| ${b} | ${s} | ${c} | ${e.n}${ok ? " ✓" : ""} | ${[...e.on].slice(0, 4).join(", ")}${e.on.size > 4 ? " …" : ""} |\n`; }

md += `\n## Colour outside the sheet — the holding value \`--pa-inset-legacy\` (ruling 1b)\n\nEach reader keeps #f8f6f2 until its screen is rolled out; the census counts each as a breach. The sheet colour each should take:\n\n| Reader | File | Takes at roll-out | Unchanged by the oat page |\n|---|---|---|---|\n`;
const TARGET = {
  ".pf-av.pf-empty": ["queryActions/phoneFlow.css", "--ps-fill (an empty avatar's ground)"], ".pf-lctray": ["queryActions/phoneFlow.css", "--ps-fill (a tray inside a card)"],
  ".pa-addrow": ["agents/phone/agentsPhone.css", "--ps-fill (a row-shaped field inside a card)"], ".pa-anote": ["agents/phone/agentsPhone.css", "--ps-fill (a note inside a card)"],
  ".pa-aq": ["agents/phone/agentsPhone.css", "white — it is a query card on the agent sheet (P1)"], ".pa-dwish": ["agents/phone/agentsPhone.css", "--ps-fill (an inset)"],
  ".pa5-gc-where": ["phone/v5/phoneV5.css", "--ps-fill (an inset in the gaps sheet)"], ".pa5bv-xpi": ["phone/v5/phoneV5.css", "--ps-fill (an opened row's inset)"],
  ".pa-mtile .pa-mi": ["phone/phoneShell.css", "--ps-fill (an icon's round ground)"], ".pa-set .sc-cf": ["phone/pages/settingsPhone.css", "--ps-fill (an inset)"],
  ".pa-pg .pa-annote": ["phone/pages/pagesPhone.css", "white (a note card, P1)"], ".pa3 .pa3-row": ["phone/v3/phoneV3.css", "--ps-press (the pressed row, P23)"],
  ".pa3 .pa3-opt.on": ["phone/v3/phoneV3.css", "--ps-press under the navy ring (the selected state; P2 keeps the ring navy)"],
};
const chain = new Map((A["(legacy, by class chain)"] ?? []).map((x) => [x.sel, x]));
const pix = new Map(); for (const [n, v] of screens) for (const l of v.legacy ?? []) pix.set(l.sel, `${l.same ? "pixels identical" : "PIXELS DIFFER"} (${n})`);
for (const [sel, [file, to]] of Object.entries(TARGET)) md += `| \`${sel}\` | ${file} | ${to} | ${pix.get(sel) ?? "not on a crawled screen"} · class chain ${chain.get(sel)?.same ? "unchanged" : "CHANGED"} |\n`;

md += `\n## Ruling 1a — the readers that follow the page\n\n`;
const fol = []; for (const [n, v] of screens) for (const f of v.followers ?? []) fol.push({ n, ...f });
for (const f of fol) md += `- ${f.n}: ${f.what} — ${f.got === f.page ? "equals the page" : `**${f.got} against the page ${f.page}**`}${f.onCard ? " — **sits on a card, not the page** (a pre-existing mismatch for the roll-out)" : ""}\n`;
md += `- The page-fold corner (\`.pa-sheetc::before\`) did not appear on a crawled screen: not measured.\n`;
writeFileSync(join(DIR, "audit.md"), md);

/* review.html — the same, with the shots */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let h = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Phone audit</title>
<style>:root{--oat:#f2eee8;--ink:#1f2633;--navy:#2a3a52;--rule:#e2dbd0;--muted:#4a4f5a}body{margin:0;background:var(--oat);color:var(--ink);font:400 16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
main{max-width:1200px;margin:0 auto;padding:32px 16px 96px}h1{font-size:28px;margin:0 0 8px}h2{font-size:20px;margin:40px 0 12px}p{max-width:70ch}
table{border-collapse:collapse;width:100%;font-size:14px;background:#fff;border-radius:12px;overflow:hidden}th,td{padding:8px 10px;border-bottom:1px solid var(--rule);text-align:left;vertical-align:top}th{font-weight:600;color:var(--muted)}td.n{text-align:right;font-variant-numeric:tabular-nums}
.tw{overflow-x:auto}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:16px}figure{margin:0;background:#fff;border-radius:12px;padding:12px}figure img{width:100%;border-radius:8px;display:block}figcaption{font-weight:600;margin:8px 0 4px}.s{font-size:14px;color:var(--muted)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--oat:#1b1d22;--ink:#e9edf3;--rule:#2e323a;--muted:#b4bac4}table,figure{background:#24272e}}</style></head><body><main>
<h1>Phone style v1 — the audit</h1><p>Every phone screen against the style sheet (design-refs/phone-style-v1/phone-style-v1.html), measured at 390 × 844 by PS1 in report mode. Today's Queries tab is built to the sheet and is the calibration: it reads zero. The full notes are in audit.md beside this page.</p>
<h2>Screens by rule</h2><div class="tw"><table><tr><th>Screen</th>${Object.keys(MEASURED).map((k) => `<th>${k}<br><span class="s">${esc(MEASURED[k])}</span></th>`).join("")}<th>total</th></tr>`;
for (const [n, v] of screens) {
  if (v.failed) { h += `<tr><td>${esc(n)}</td><td colspan="11">FAILED: ${esc(v.failed.slice(0, 120))}</td></tr>`; continue; }
  const r = v.rules; h += `<tr><td>${esc(n)}</td>${Object.keys(MEASURED).map((k) => `<td class="n">${r[k] || "·"}</td>`).join("")}<td class="n"><b>${Object.values(r).reduce((a, b) => a + b, 0)}</b></td></tr>`;
}
h += `</table></div><h2>Proposed roll-out order</h2><div class="tw"><table><tr><th>#</th><th>Screen(s)</th><th>Size</th><th>What would visibly change</th></tr>${ORDER.map((o, i) => `<tr><td class="n">${i + 1}</td><td>${esc(o.screens)}</td><td>${esc(o.size)}</td><td>${esc(o.change)}</td></tr>`).join("")}</table></div>
<h2>The screens</h2><p class="s">Rules PS1 cannot measure (${BY_EYE.join(", ")}) are read by eye from these shots.</p><div class="grid">`;
for (const [n, v] of screens) { if (v.failed) continue; const t = Object.values(v.rules).reduce((a, b) => a + b, 0); h += `<figure><img loading="lazy" src="audit/${shot(n)}.png" alt="${esc(n)}"><figcaption>${esc(n)}</figcaption><div class="s">${t} breaches · ${Object.entries(v.rules).filter(([, c]) => c).map(([k, c]) => `${k} ${c}`).join(" · ") || "none"}</div></figure>`; }
h += `</div></main></body></html>`;
writeFileSync(join(DIR, "review.html"), h);
console.log(`audit.md and review.html: ${screens.length} screens`);
