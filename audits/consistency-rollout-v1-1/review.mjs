#!/usr/bin/env node
/**
 * Consistency roll-out v1.1 — the review page.
 *   node audits/consistency-rollout-v1-1/review.mjs <backup dir>
 * Reads <dir>/results.json (the phases: what changed in plain English, status, commits, exceptions, crop pairs),
 * <dir>/wording.json (Phase 2's before-and-after table, each row applied / left / skipped / not copy / key kept) and
 * <dir>/claude-md.diff, and writes <dir>/review.html. Crops are referenced by relative path (<dir>/crops/<label>/<page>/
 * <id>.png) and never committed.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
const D = resolve(process.argv[2]);
const OUT = resolve(D, "review.html");
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const res = JSON.parse(readFileSync(resolve(D, "results.json"), "utf8"));
const words = existsSync(resolve(D, "wording.json")) ? JSON.parse(readFileSync(resolve(D, "wording.json"), "utf8")) : [];
const diff = existsSync(resolve(D, "claude-md.diff")) ? readFileSync(resolve(D, "claude-md.diff"), "utf8") : "";
const fig = (p, cap) => {
  const abs = resolve(D, p);
  return existsSync(abs)
    ? `<figure><img src="${esc(relative(D, abs))}" loading="lazy" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`
    : `<figure class="miss"><div>not on screen in this run</div><figcaption>${esc(cap)}</figcaption></figure>`;
};
const pairs = (xs) => (xs && xs.length ? xs.map((c) => `<div class="pair"><h4>${esc(c.title)}</h4>${fig(c.before, "before")}${fig(c.after, c.afterCap || "after")}</div>`).join("") : "<p class=mut>No crops for this phase.</p>");
const list = (xs) => (xs && xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p class=mut>None.</p>");
const rows = res.phases.map((p) => `<tr><td>${esc(p.n)}</td><td>${esc(p.title)}</td><td class="st st-${esc(p.status.split(" ")[0])}">${esc(p.status)}</td><td>${esc(p.short)}</td><td><code>${esc((p.commits || []).join(" "))}</code></td></tr>`).join("");
const sections = res.phases.map((p) => `<section id="p${esc(p.n)}"><h2>Phase ${esc(p.n)} · ${esc(p.title)}</h2>
<p class="meta"><b>${esc(p.status)}</b>${p.commits && p.commits.length ? ` · <code>${esc(p.commits.join(" "))}</code>` : ""}</p>
<h3>What changed</h3>${(p.plain || []).map((x) => `<p>${esc(x)}</p>`).join("")}
${p.measured ? `<h3>Measured</h3>${list(p.measured)}` : ""}
<h3>Skipped, reverted or reported</h3>${list(p.exceptions)}
${p.id === "wording" ? wordingTable() : ""}${p.id === "claude" ? `<h3>The CLAUDE.md diff</h3><pre>${esc(diff)}</pre>` : ""}
<h3>Before and after</h3>${pairs(p.crops)}</section>`).join("");
function wordingTable() {
  const n = (s) => words.filter((w) => w.outcome === s).length;
  return `<h3>The wording table</h3><p class="meta">${words.length} rows: ${n("applied")} applied · ${n("left")} left · ${n("skipped")} skipped · ${n("key kept")} internal keys kept · ${n("not copy")} not copy</p>
<table class="wt"><thead><tr><th>#</th><th>Where</th><th>Before</th><th>After</th><th>Outcome</th><th>Note</th></tr></thead><tbody>${words.map((w) => `<tr class="o-${esc(w.outcome.replace(/ /g, "-"))}"><td>${esc(w.row)}</td><td><code>${esc(w.loc)}</code></td><td>${esc(w.before)}</td><td>${esc(w.after)}</td><td>${esc(w.outcome)}</td><td>${esc(w.note)}</td></tr>`).join("")}</tbody></table>`;
}
const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consistency v1.1 review</title>
<style>
:root{--ink:#1c130f;--mut:#6f645b;--line:#e2d9cc;--bg:#f2eee8;--card:#fff;--ok:#2a3a52;--warn:#7a3f31}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ink:#f2ece4;--mut:#b9ada1;--line:#4a4038;--bg:#1d1916;--card:#27221e;--ok:#9fb3cf;--warn:#e2a48f}}
:root[data-theme="dark"]{--ink:#f2ece4;--mut:#b9ada1;--line:#4a4038;--bg:#1d1916;--card:#27221e;--ok:#9fb3cf;--warn:#e2a48f}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,serif}
main{max-width:1180px;margin:0 auto;padding:32px 16px 80px}
h1{font-size:30px;margin:0 0 6px}h2{font-size:22px;margin:40px 0 6px;border-top:1px solid var(--line);padding-top:24px}h3{font-size:16px;margin:18px 0 6px}h4{font-size:13px;margin:0 0 6px;color:var(--mut);font-weight:normal;grid-column:1/-1}
.mut,.meta{color:var(--mut)}code{font-size:13px}pre{white-space:pre-wrap;font-size:12.5px;background:var(--card);border:1px solid var(--line);padding:10px;border-radius:8px;overflow-x:auto}
table{width:100%;border-collapse:collapse;background:var(--card);font-size:14px}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.wt{font-size:13px}.wt td:nth-child(2){max-width:220px;word-break:break-all}
.o-left td:nth-child(5),.o-skipped td:nth-child(5){color:var(--warn);font-weight:bold}.o-applied td:nth-child(5){color:var(--ok)}
.st-landed{color:var(--ok);font-weight:bold}.st-partly,.st-skipped,.st-reported{color:var(--warn);font-weight:bold}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:8px}
figure{margin:0;min-width:0}figure img{display:block;max-width:100%;height:auto;border:1px solid var(--line)}figcaption{font-size:12px;color:var(--mut)}
figure.miss div{padding:24px;border:1px dashed var(--line);color:var(--mut);font-size:13px}
@media (max-width:700px){.pair{grid-template-columns:1fr}.wt{display:block;overflow-x:auto}}
</style></head><body><main>
<h1>Consistency roll-out v1.1</h1>
<p class="meta">${esc(res.meta)}</p>
<table><thead><tr><th>Phase</th><th>What</th><th>Status</th><th>In short</th><th>Commits</th></tr></thead><tbody>${rows}</tbody></table>
${res.notes ? `<h2>Notes</h2>${list(res.notes)}` : ""}
${sections}
</main></body></html>`;
writeFileSync(OUT, html);
console.log(`wrote ${OUT} (${html.length} bytes)`);
