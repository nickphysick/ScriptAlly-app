#!/usr/bin/env node
/**
 * Consistency audit v1 — write report.html, summary.md and findings.json into audits/consistency-v1/,
 * copying only the screenshots the report shows.
 *
 *   node audits/consistency-v1/report.mjs <runDir> [--scan <scan.json>] [--after <afterRunDir>] [--fixes <fixes.json>]
 *
 * <runDir> must already hold findings.json (analyse.mjs). With --after, each finding gets an "after" column:
 * whether the same group still shows the same variants in the after run.
 *
 * ⚠️ NO VERDICT LANGUAGE ABOUT THE DESIGN. Sentences say what differs and where; which variant is right is
 * the oracle's to say (a shared token) or Nick's.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const DIR = resolve(ROOT, "audits/consistency-v1");
const args = process.argv.slice(2);
const opt = (k) => (args.includes(k) ? args[args.indexOf(k) + 1] : null);
const RUN = resolve(args[0]);
const F = JSON.parse(readFileSync(resolve(RUN, "findings.json"), "utf8"));
const INV = JSON.parse(readFileSync(resolve(RUN, "inventory.runtime.json"), "utf8"));
const SCAN = opt("--scan") ? JSON.parse(readFileSync(resolve(opt("--scan")), "utf8")) : null;
const AFTER = opt("--after") ? JSON.parse(readFileSync(resolve(opt("--after"), "findings.json"), "utf8")) : null;
const AFTER_INV = opt("--after") ? JSON.parse(readFileSync(resolve(opt("--after"), "inventory.runtime.json"), "utf8")) : null;
const FIXES = opt("--fixes") ? JSON.parse(readFileSync(resolve(opt("--fixes")), "utf8")) : [];

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const PAGE = Object.fromEntries(INV.pages.map((p) => [p.key, p]));
const pname = (k) => PAGE[k]?.name || k;

const PART_LABEL = {
  "page-header": "page header", surfaces: "surface", type: "text", buttons: "button", cards: "card", overlays: "overlay",
  "form-controls": "form control", "in-page-nav": "in-page navigation", "tags-status": "tag / status mark", lists: "list part", footers: "footer", "small-parts": "small part",
};
const ROLE_LABEL = (part, role) => {
  const r = role.replace(/\//g, " · ");
  const hm = /^(navy|plain) · (\w+)$/.exec(role);
  if (hm) return `${hm[1] === "navy" ? "navy workspace header" : "page header"}'s ${FIELD_LABEL[hm[2]] || hm[2]}`;
  const map = { "page-title": "page title", "page-subheader": "page subheader", "section-heading": "section heading", "card-heading": "card heading", navy: "navy workspace header", plain: "plain page header", mountcard: "MountCard", card: "card", "page-background": "page background", "top-bar": "top bar" };
  return map[role] || r;
};
const FIELD_LABEL = {
  bg: "background", color: "text colour", border: "border", radius: "corner radius", shadow: "shadow", padding: "padding", height: "height", width: "width",
  fontFamily: "font", fontSize: "font size", fontWeight: "font weight", lineHeight: "line height", letterSpacing: "letter spacing", textTransform: "text case",
  topFromSheet: "distance from the top of the sheet", leftFromSheet: "left edge", titleLeft: "title inset", titleTop: "title top", subGap: "title-to-subheader gap",
  illusBox: "illustration box", illusRight: "illustration inset", rightItemInset: "right-hand item inset", gapBelow: "gap to the content below", kind: "header kind",
  frameBorder: "frame border", frameRadius: "frame radius", stroke: "stroke", bgImage: "background image", backdropFilter: "backdrop blur",
};
const NUM_WORD = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];
const num = (n) => (n < NUM_WORD.length ? NUM_WORD[n] : String(n));
const FAMILY_LABEL = { workspace: "workspace pages", dashboard: "the Dashboard", "non-workspace": "non-workspace pages", onboarding: "onboarding pages", public: "public pages", overlays: "overlays" };

function sentence(f) {
  if (f.part === "rules") return `${f.title}: ${num(f.variants.length)} distinct value${f.variants.length === 1 ? "" : "s"} on ${num(f.pages.length)} page${f.pages.length === 1 ? "" : "s"}.`;
  if (f.tier === "C" && f.variants.length === 1) return `The ${ROLE_LABEL(f.part, f.role)} on ${f.pages.map(pname).join(", ")} is held apart from the comparison.`;
  if (f.part === "page-header") return `The ${ROLE_LABEL(f.part, f.role)} has ${num(f.variants.length)} different values across ${num(f.pages.length)} pages.`;
  const what = `${ROLE_LABEL(f.part, f.role)}${["page-title", "page-subheader", "navy", "plain", "mountcard", "card"].includes(f.role) ? "" : ` (${PART_LABEL[f.part]})`}`;
  const n = f.variants.length;
  const across = `across ${num(f.pages.length)} ${f.family === "overlays" ? "overlays" : "pages"}`;
  if (f.fields.length === 1) {
    const fl = FIELD_LABEL[f.fields[0]] || f.fields[0];
    return `The ${what} has ${num(n)} different ${fl}${/s$/.test(fl) ? "es" : "s"} ${across}.`.replace("paddings", "padding values").replace("heightss", "heights").replace("fonts", "fonts").replace("shadowes", "shadows").replace("borderes", "borders");
  }
  return `The ${what} is drawn ${num(n)} different ways ${across}, differing in ${f.fields.map((k) => FIELD_LABEL[k] || k).join(", ")}.`;
}

/* ── after-run comparison ─────────────────────────────────────────────────────────────────────── */
const afterKey = (f) => `${f.family}|${f.vw}|${f.part}|${f.role}`;
const afterMap = AFTER ? new Map(AFTER.findings.map((f) => [afterKey(f), f])) : null;
function afterStatus(f) {
  if (!afterMap) return null;
  const a = afterMap.get(afterKey(f));
  if (!a) return { state: "gone", text: "No longer differs" };
  const before = new Set(f.variants.map((v) => JSON.stringify(v.sig)));
  const after = new Set(a.variants.map((v) => JSON.stringify(v.sig)));
  const same = before.size === after.size && [...before].every((s) => after.has(s));
  if (same) return { state: "same", text: `Unchanged (${a.variants.length} variants)` };
  return { state: "changed", text: `${f.variants.length} → ${a.variants.length} variants` };
}

/* ── copy only the shots the report shows ─────────────────────────────────────────────────────── */
const SHOT_DIR = resolve(DIR, "shots");
rmSync(SHOT_DIR, { recursive: true, force: true });
const used = new Set();
const useShot = (rel) => {
  if (!rel) return null;
  const src = resolve(RUN, rel);
  if (!existsSync(src)) return null;
  const dest = resolve(SHOT_DIR, rel.replace(/^shots\//, ""));
  if (!used.has(dest)) { mkdirSync(dirname(dest), { recursive: true }); copyFileSync(src, dest); used.add(dest); }
  return `shots/${rel.replace(/^shots\//, "")}`;
};
const SHOT_BUDGET = { B: 80, A: 1000, C: 0 };
const shotCount = { B: 0, A: 0, C: 0 };

/* ── html ─────────────────────────────────────────────────────────────────────────────────────── */
const show = (v) => (v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
const swatch = (v) => (/^#[0-9a-f]{6}/.test(String(v)) ? `<i class="sw" style="background:${String(v).slice(0, 7)}"></i>` : "");
function findingHtml(f) {
  const withShots = shotCount[f.tier] < SHOT_BUDGET[f.tier];
  if (withShots) shotCount[f.tier]++;
  const after = afterStatus(f);
  const fix = FIXES.find((x) => x.finding === f.id);
  const variants = f.variants.slice(0, 10).map((v, i) => {
    const ex = v.examples[0];
    const img = withShots ? useShot(ex?.shot) : null;
    const isOracle = f.oracle && f.oracle.variant === i;
    return `<div class="var${isOracle ? " oracle" : ""}">
      <div class="vh"><b>Variant ${i + 1}</b> · ${num(v.pages.length)} page${v.pages.length === 1 ? "" : "s"} · ${v.n} element${v.n === 1 ? "" : "s"}${isOracle ? ' · <span class="tag">oracle: shared token</span>' : ""}</div>
      ${img ? `<figure><img loading="lazy" src="${esc(img)}" alt=""><figcaption>${esc(pname(ex.page))}${ex.text ? ` — “${esc(ex.text.slice(0, 40))}”` : ""}</figcaption></figure>` : ex ? `<div class="noshot">${esc(pname(ex.page))}${ex.text ? ` — “${esc(ex.text.slice(0, 40))}”` : ""}</div>` : ""}
      <table>${f.fields.map((k) => `<tr><th>${esc(FIELD_LABEL[k] || k)}</th><td>${swatch(v.sig[k])}${esc(show(v.sig[k]))}</td></tr>`).join("")}</table>
      <div class="pages">${v.pages.map((p) => esc(pname(p))).join(" · ")}</div>
      <div class="src">${[...new Set(v.examples.flatMap((e) => e.sources || []))].slice(0, 4).map((s) => `<code>${esc(s)}</code>`).join(" ") || `<span class="muted">${esc((ex?.cls || [])[0] || "")}</span>`}</div>
    </div>`;
  }).join("");
  const more = f.variants.length > 10 ? `<p class="muted">…and ${f.variants.length - 10} more variants (findings.json has them all).</p>` : "";
  const same = Object.entries(f.variants[0].sig).filter(([k]) => !f.fields.includes(k)).map(([k, v]) => `${FIELD_LABEL[k] || k} ${show(v)}`).join(" · ");
  return `<section class="f t${f.tier}" id="${f.id}">
    <h3><span class="id">${f.id}</span> ${esc(sentence(f))}</h3>
    <p class="meta">${esc(FAMILY_LABEL[f.family] || f.family)} · ${f.vws ? f.vws.join(" and ") : f.vw}px wide${f.otherWidth ? ` (values shown at ${f.vw}; at ${f.otherWidth.vw} there ${f.otherWidth.variants === 1 ? "is one variant" : `are ${f.otherWidth.variants} variants`}${f.otherWidth.samePagesSplit ? ", split across the same pages" : ", split differently — findings.json has them"})` : ""} · part <code>${esc(f.part)}/${esc(f.role)}</code> · ${esc(f.reason)}${f.oracle ? ` The oracle points to variant ${f.oracle.variant + 1}: ${esc(f.oracle.why)}.` : f.tier === "B" ? " No shared token or primitive settles it." : ""}</p>
    ${after ? `<p class="after ${after.state}">After the Tier A fixes: <b>${esc(after.text)}</b></p>` : ""}
    ${fix ? `<p class="after gone">Fixed in <code>${esc(fix.commit)}</code>: ${esc(fix.what)}</p>` : ""}
    <div class="vars">${variants}</div>${more}
    ${same ? `<p class="muted small">The same in every variant: ${esc(same.slice(0, 400))}</p>` : ""}
  </section>`;
}

const B = F.findings.filter((f) => f.tier === "B");
const A = F.findings.filter((f) => f.tier === "A");
const C = F.findings.filter((f) => f.tier === "C");
const counts = F.counts;
const partRows = Object.entries(counts.part).sort((a, b) => b[1].B - a[1].B).map(([p, c]) => `<tr><td>${esc(PART_LABEL[p] || p)}</td><td>${c.B}</td><td>${c.A}</td><td>${c.C}</td></tr>`).join("");

const scanHtml = SCAN ? `<section class="scan"><h2>The source scan</h2>
<p>${SCAN.scanned} source files under <code>src/</code> (tests excluded). Comments are blanked before scanning. The counts cover all source, including code no route renders today, so they show how widespread a pattern is, not what is on screen.</p>
<table class="counts"><tr><th>What</th><th>Count</th></tr>${Object.entries(SCAN.counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${v}</td></tr>`).join("")}
<tr><td>distinct colour values in source</td><td>${SCAN.distinctColours}</td></tr><tr><td>near-duplicate colour pairs (ΔE &lt; 2.3)</td><td>${SCAN.nearDuplicateColours.count}</td></tr></table>
${["primitive-copy", "green", "red", "var-in-keyframes", "color-mix"].map((k) => { const it = SCAN.items.filter((i) => i.kind === k); return it.length ? `<h3>${esc(k)} (${it.length})</h3><ul class="mono">${it.slice(0, 60).map((i) => `<li><code>${esc(i.file)}${i.line ? ":" + i.line : ""}</code> ${swatch(i.hex)}${esc(i.value)} <span class="muted">${esc((i.context || "").slice(0, 100))}</span></li>`).join("")}</ul>${it.length > 60 ? `<p class="muted">…${it.length - 60} more in scan.json</p>` : ""}` : ""; }).join("")}
<h3>Burgundy outside the MountCard frame (${SCAN.counts.burgundy || 0} uses in ${new Set(SCAN.items.filter((i) => i.kind === "burgundy").map((i) => i.file)).size} files)</h3>
<ul class="mono">${Object.entries(SCAN.items.filter((i) => i.kind === "burgundy").reduce((m, i) => ((m[i.file] = (m[i.file] || 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 40).map(([f, n]) => `<li><code>${esc(f)}</code> ${n}</li>`).join("")}</ul>
<h3>Closest near-duplicate colour pairs</h3><ul class="mono">${SCAN.nearDuplicateColours.pairs.slice(0, 40).map((p) => `<li>${swatch(p.a)}${p.a} ${swatch(p.b)}${p.b} ΔE ${p.dE} <span class="muted">${esc(p.aAt)} · ${esc(p.bAt)}</span></li>`).join("")}</ul>
</section>` : "";

const failedHtml = INV.failed.length ? `<ul>${INV.failed.map((x) => `<li><b>${esc(x.path)}</b> at ${x.vw}: ${esc(x.why)}</li>`).join("")}</ul>` : "<p>None.</p>";
const redirHtml = INV.redirected.length ? `<ul>${[...new Map(INV.redirected.map((x) => [x.path, x])).values()].map((x) => `<li><b>${esc(x.path)}</b> → <code>${esc(x.finalUrl)}</code></li>`).join("")}</ul>` : "<p>None.</p>";

const html = `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Consistency audit v1</title>
<style>
:root{--bg:#f6f2ec;--card:#fffdf9;--ink:#241c15;--muted:#7a6d62;--line:#e4dbd0;--b:#8a5a2b;--a:#4f6b86;--c:#6f6a63}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--bg:#1b1814;--card:#24201b;--ink:#efe8de;--muted:#a69a8e;--line:#3a332b}}
body{background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif;margin:0;padding:24px 16px}
main{max-width:1400px;margin:0 auto}h1{font-size:28px;margin:0 0 4px}h2{font-size:22px;margin:40px 0 12px;border-bottom:1px solid var(--line);padding-bottom:6px}
h3{font-size:16px;margin:0 0 6px}.muted{color:var(--muted)}.small{font-size:13px}code{font:12px/1.4 ui-monospace,monospace;background:rgba(127,127,127,.12);padding:1px 4px;border-radius:3px}
.f{background:var(--card);border:1px solid var(--line);border-left:4px solid var(--line);border-radius:8px;padding:14px 16px;margin:12px 0}.tB{border-left-color:var(--b)}.tA{border-left-color:var(--a)}.tC{border-left-color:var(--c)}
.id{font:12px ui-monospace,monospace;color:var(--muted);margin-right:6px}.meta{font-size:13px;color:var(--muted);margin:0 0 10px}
.vars{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}.var{border:1px solid var(--line);border-radius:6px;padding:8px;min-width:0}.var.oracle{outline:2px solid var(--a)}
.vh{font-size:13px;margin-bottom:6px}figure{margin:0 0 6px}figure img{max-width:100%;max-height:180px;display:block;border:1px solid var(--line);background:#fff}figcaption,.noshot{font-size:12px;color:var(--muted)}
table{border-collapse:collapse;font-size:12px;width:100%}th,td{text-align:left;padding:2px 4px;border-bottom:1px solid var(--line);vertical-align:top;word-break:break-word}th{color:var(--muted);font-weight:500;width:40%}
.pages{font-size:12px;margin-top:6px}.src{margin-top:4px;font-size:11px}.src code{display:inline-block;margin:1px 0}
.sw{display:inline-block;width:10px;height:10px;border:1px solid rgba(0,0,0,.25);border-radius:2px;margin-right:4px;vertical-align:-1px}
.tag{background:var(--a);color:#fff;border-radius:3px;padding:0 4px;font-size:11px}.counts{max-width:520px}.counts th{width:auto}.counts td,.counts th{font-size:14px}
.after{font-size:13px;margin:0 0 8px}.after.gone{color:var(--a)}.after.same{color:var(--muted)}.mono li{font-size:12px}
nav a{margin-right:12px}
</style></head><body><main>
<h1>Consistency audit v1</h1>
<p class="muted">Generated ${esc(F.generated)} from run <code>${esc(INV.run)}</code>. Built from the rendered pages (computed values, measured boxes) at 1512×982 and 1920×1080, signed in as the emulator harness account. Desktop only.</p>
<nav><a href="#tierB">Tier B — needs Nick (${B.length})</a><a href="#tierA">Tier A — mechanical (${A.length})</a><a href="#tierC">Tier C — deliberate (${C.length})</a><a href="#pages">Pages</a><a href="#scan">Source scan</a></nav>
<h2>How to read this</h2>
<p>Each finding is one part of the app (for example the page title on workspace pages at 1512px wide) that is drawn more than one way within a family of pages. Pages are compared only within their family (workspace, non-workspace, onboarding, public, overlays); the Dashboard joins the workspace pages for buttons, cards, text and form controls only. Variant 1 is the most common, which is evidence, not the answer: a variant is marked "oracle" only where a shared token settles it.</p>
<table class="counts"><tr><th>Part</th><th>Tier B</th><th>Tier A</th><th>Tier C</th></tr>${partRows}<tr><th>Total</th><th>${B.length}</th><th>${A.length}</th><th>${C.length}</th></tr></table>
<h2 id="tierB">Tier B — needs Nick (${B.length}), most visible first</h2>${B.map(findingHtml).join("")}
<h2 id="tierA">Tier A — mechanical (${A.length})</h2>${A.length ? A.map(findingHtml).join("") : "<p>None.</p>"}
<h2 id="tierC">Tier C — deliberate (${C.length})</h2>${C.length ? C.map(findingHtml).join("") : "<p>None.</p>"}
<h2 id="pages">Pages</h2>
<p>${INV.pages.length} routes measured; ${INV.measured.length} page-views.</p>
<h3>Failed to load</h3>${failedHtml}
<h3>Redirected (measured where they landed)</h3>${redirHtml}
<p class="muted">${INV.singlePageGroups} groups had only one page in them and so could not be compared (listed in inventory.json, never counted as a pass).</p>
<div id="scan">${scanHtml}</div>
</main></body></html>`;
writeFileSync(resolve(DIR, "report.html"), html);
writeFileSync(resolve(DIR, "findings.json"), JSON.stringify({ ...F, after: AFTER ? { run: AFTER_INV.run, counts: AFTER.counts } : null, fixes: FIXES }, null, 1));

/* ── summary.md ───────────────────────────────────────────────────────────────────────────────── */
const top = B.slice(0, 10).map((f, i) => `${i + 1}. **${f.id}** — ${sentence(f)} (${FAMILY_LABEL[f.family] || f.family}, ${(f.vws || [f.vw]).join(" + ")}px; variants: ${f.variants.map((v) => v.pages.length).join(" / ")} pages${f.oracle ? `; oracle → variant ${f.oracle.variant + 1}` : ""})`).join("\n");
const md = `# Consistency audit v1 — summary

Generated ${F.generated}. Run: \`${INV.run}\`. Full report: \`audits/consistency-v1/report.html\`; data: \`findings.json\`.

## Counts by tier

| Tier | Findings |
|---|---|
| B — needs Nick | ${B.length} |
| A — mechanical | ${A.length} |
| C — deliberate | ${C.length} |

## Counts by part

| Part | B | A | C |
|---|---|---|---|
${Object.entries(counts.part).sort((a, b) => b[1].B - a[1].B).map(([p, c]) => `| ${PART_LABEL[p] || p} | ${c.B} | ${c.A} | ${c.C} |`).join("\n")}

## The ten most visible Tier B findings

${top}

## Pages

- Measured: ${INV.pages.length} routes, ${INV.measured.length} page-views.
- Failed to load: ${INV.failed.length ? INV.failed.map((x) => `\`${x.path}\` @${x.vw} (${x.why})`).join("; ") : "none"}.
- Redirected: ${INV.redirected.length ? [...new Set(INV.redirected.map((x) => `\`${x.path}\` → \`${x.finalUrl}\``))].join("; ") : "none"}.
${AFTER ? `\n## After the Tier A fixes\n\nAfter run \`${AFTER_INV.run}\`: ${JSON.stringify(AFTER.counts.tier)} (before: ${JSON.stringify(counts.tier)}).\n` : ""}${FIXES.length ? `\n## Tier A fixes\n\n${FIXES.map((x) => `- ${x.finding}: ${x.what} — \`${x.commit}\``).join("\n")}\n` : ""}`;
writeFileSync(resolve(DIR, "summary.md"), md);
console.log(`[report] B ${B.length} · A ${A.length} · C ${C.length} · ${used.size} screenshots copied`);
