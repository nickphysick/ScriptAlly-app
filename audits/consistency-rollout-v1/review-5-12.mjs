#!/usr/bin/env node
/**
 * Consistency roll-out v1, Phases 5–12 — the review page.
 *   node audits/consistency-rollout-v1/review-5-12.mjs <p5-12 dir>
 * Reads <dir>/results.json (one entry per phase: what changed, the counts, the exceptions, and which crop labels and
 * ids show it) and writes <dir>/../review-5-12.html. Crops are the harness's CA_RULE_SHOTS files under <dir>/crops
 * (<label>/<page>/<id>.png, cropped at 1512), referenced by relative path and never committed.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
const D = resolve(process.argv[2]);
const OUT = resolve(dirname(D), "review-5-12.html");
const R = (p) => relative(dirname(OUT), p);
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const res = JSON.parse(readFileSync(resolve(D, "results.json"), "utf8"));
const crop = (label, page, id) => resolve(D, "crops", label, page, `${id}.png`);
const fig = (p, cap) => existsSync(p)
  ? `<figure><img src="${esc(R(p))}" loading="lazy" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`
  : `<figure class="miss"><div>not on screen in this run</div><figcaption>${esc(cap)}</figcaption></figure>`;
const pages = (label) => (existsSync(resolve(D, "crops", label)) ? readdirSync(resolve(D, "crops", label)).sort() : []);
const pairs = (c) => {
  const out = [];
  for (const page of pages(c.before)) {
    if (c.pages && !c.pages.includes(page)) continue;
    for (const id of c.ids) {
      const b = crop(c.before, page, id), a = crop(c.after, page, id);
      if (!existsSync(b) && !existsSync(a)) continue;
      out.push(`<div class="pair"><h4>${esc(page)} · ${esc(id)}</h4>${fig(b, `before (${c.before})`)}${fig(a, `after (${c.after})`)}</div>`);
    }
  }
  return out.join("") || "<p class=mut>No crops for this phase.</p>";
};
const list = (xs) => (xs && xs.length ? `<ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "<p class=mut>None.</p>");
const order = ["p5", "p6", "p7", "p8", "p9", "p10", "p11", "p12"];
const rows = order.filter((k) => res[k]).map((k) => {
  const p = res[k];
  return `<tr><td>${esc(k.slice(1))}</td><td>${esc(p.title)}</td><td class="st st-${esc((p.status || "").split(" ")[0])}">${esc(p.status)}</td><td>${esc((p.pages || []).join(", "))}</td><td>${esc(p.count)}</td><td><code>${esc([p.commit, ...(p.more || [])].filter(Boolean).join(" "))}</code></td></tr>`;
}).join("");
const sections = order.filter((k) => res[k]).map((k) => {
  const p = res[k];
  return `<section id="${k}"><h2>Phase ${esc(k.slice(1))} · ${esc(p.title)}</h2>
<p class="meta"><b>${esc(p.status)}</b> · ${esc(p.count)} · <code>${esc([p.commit, ...(p.more || [])].filter(Boolean).join(" "))}</code></p>
<h3>What changed</h3><p>${esc(p.plain)}</p>
<h3>Reverted, skipped or reported</h3>${list(p.exceptions)}
<h3>Before and after</h3>${(p.crops || []).map(pairs).join("")}</section>`;
}).join("");
const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consistency Phases 5–12</title>
<style>
:root{--ink:#1c130f;--mut:#6f645b;--line:#e2d9cc;--bg:#f2eee8;--card:#fff;--ok:#2a3a52;--warn:#7a3f31}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ink:#f2ece4;--mut:#b9ada1;--line:#4a4038;--bg:#1d1916;--card:#27221e;--ok:#9fb3cf;--warn:#e2a48f}}
:root[data-theme="dark"]{--ink:#f2ece4;--mut:#b9ada1;--line:#4a4038;--bg:#1d1916;--card:#27221e;--ok:#9fb3cf;--warn:#e2a48f}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,serif}
main{max-width:1180px;margin:0 auto;padding:32px 16px 80px}
h1{font-size:30px;margin:0 0 6px}h2{font-size:22px;margin:40px 0 6px;border-top:1px solid var(--line);padding-top:24px}h3{font-size:16px;margin:18px 0 6px}h4{font-size:13px;margin:0 0 6px;color:var(--mut);font-weight:normal;grid-column:1/-1}
.mut,.meta{color:var(--mut)}code{font-size:13px}
table{width:100%;border-collapse:collapse;background:var(--card);font-size:14px}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
.st-landed{color:var(--ok);font-weight:bold}.st-partly,.st-skipped{color:var(--warn);font-weight:bold}
.pair{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:12px 0;padding:10px;background:var(--card);border:1px solid var(--line);border-radius:8px}
figure{margin:0;min-width:0}figure img{display:block;max-width:100%;height:auto;border:1px solid var(--line)}figcaption{font-size:12px;color:var(--mut)}
.miss div{display:grid;place-items:center;min-height:60px;border:1px dashed var(--line);color:var(--mut);font-size:13px}
.tw{overflow-x:auto}
@media (max-width:700px){.pair{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Consistency roll-out v1 · Phases 5–12</h1>
<p class="mut">${esc(res._intro || "")}</p>
<div class="tw"><table><tr><th>Phase</th><th>What</th><th>Status</th><th>Pages changed</th><th>Variants before → after</th><th>Commits</th></tr>${rows}</table></div>
${sections}
</main></body></html>`;
writeFileSync(OUT, html);
console.log(`wrote ${OUT}`);
