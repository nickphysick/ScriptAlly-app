#!/usr/bin/env node
/**
 * Consistency fixes v1 — list every R1–R5 instance from a run's *.rules.json, with the rule that sets its value.
 *
 *   node audits/consistency-fixes-v1/list.mjs <runDir> <auditOnly.txt> [--vw 1512] [--out instances.json]
 *
 * An INSTANCE is one distinct thing to fix on one page: the same element kind (its own class chain head) at the same
 * value is one instance however many times a list repeats it; the count of elements is kept beside it.
 *
 * The SOURCE of a value is the CSS rule (file:line) whose selector names one of the element's classes (its own, then
 * its ancestors') and whose body sets the property (font-size / font: for R1; color for R4/R5; background for R2/R3),
 * or a Tailwind arbitrary class in a .tsx (text-[10px], bg-[#…]). Every candidate is listed; the first is the best guess.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const args = process.argv.slice(2);
const RUN = resolve(args[0]);
const AUDIT_ONLY = new Set(readFileSync(resolve(args[1]), "utf8").split("\n").map((s) => s.trim()).filter(Boolean));
const VW = args.includes("--vw") ? args[args.indexOf("--vw") + 1] : "1512";
const OUT = args.includes("--out") ? resolve(args[args.indexOf("--out") + 1]) : resolve(RUN, "instances.json");

/* ── the CSS rule index ─────────────────────────────────────────────────────────────────────────── */
const walk = (d, out = []) => { for (const f of readdirSync(d)) { const p = resolve(d, f); if (statSync(p).isDirectory()) { if (!/node_modules|__fixtures__/.test(f)) walk(p, out); } else out.push(p); } return out; };
const files = walk(resolve(ROOT, "src")).map((p) => relative(ROOT, p));
const rules = [];
for (const f of files.filter((f) => f.endsWith(".css") || f.endsWith(".tsx") || f.endsWith(".ts"))) {
  if (/\.test\./.test(f)) continue;
  const raw = readFileSync(resolve(ROOT, f), "utf8");
  const src = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  if (f.endsWith(".css") || /<style|css`|`\s*\./.test(src)) {
    /* naive block scan: selector { body } with line of the selector */
    const re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(src))) {
      const sel = m[1].trim();
      if (!/\./.test(sel) || sel.length > 400) continue;
      const line = src.slice(0, m.index + m[1].length - m[1].trimStart().length).split("\n").length + (m[1].match(/^\s*/)[0].match(/\n/g) || []).length;
      rules.push({ file: f, line: src.slice(0, m.index).split("\n").length + (m[1].match(/^\n*/)[0].length), sel, body: m[2] });
    }
  }
}
const lineOf = (f, needle) => { const L = readFileSync(resolve(ROOT, f), "utf8").split("\n"); const i = L.findIndex((l) => l.includes(needle)); return i < 0 ? 0 : i + 1; };
const tsxFiles = files.filter((f) => f.endsWith(".tsx") && !/\.test\./.test(f));
const PROP = { r1: /font-size\s*:|(^|[;\s])font\s*:/, r4: /(^|[;\s])color\s*:/, r5: /(^|[;\s])color\s*:/, r2: /background(-color)?\s*:/, r3: /background(-color)?\s*:/ };
function sourcesFor(rule, chain, value) {
  const out = [];
  for (let lvl = 0; lvl < chain.length && out.length < 6; lvl++) {
    const classes = (chain[lvl].split(/[.#]/).slice(1) || []).filter((c) => c && !/^\[/.test(c));
    for (const c of classes) {
      const esc = c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const lastCompound = new RegExp(`\\.${esc}(?![\\w-])[^,{]*$`);
      for (const r of rules) {
        if (!r.sel.split(",").some((s) => lastCompound.test(s.trim()) && (lvl === 0 || true))) continue;
        if (!PROP[rule].test(r.body)) continue;
        const at = `${r.file}:${r.line}`;
        if (!out.some((o) => o.at === at)) out.push({ at, sel: r.sel.replace(/\s+/g, " ").slice(0, 120), decl: (r.body.match(rule === "r1" ? /(font-size\s*:[^;]+|(?:^|;)\s*font\s*:[^;]+)/ : rule === "r2" || rule === "r3" ? /background(-color)?\s*:[^;]+/ : /(?:^|[;\s])color\s*:[^;]+/) || [""])[0].trim().slice(0, 80), level: lvl, cls: c });
      }
      /* Tailwind arbitrary classes in tsx */
      if (/^(text|bg)-\[/.test(c) || /\[/.test(chain[lvl])) {
        for (const t of tsxFiles) { const L = lineOf(t, c); if (L) out.push({ at: `${t}:${L}`, sel: c, decl: c, level: lvl, cls: c }); if (out.length > 6) break; }
      }
    }
    if (out.length && lvl >= 0 && out.some((o) => o.level === lvl)) break; // the nearest level that styles it
  }
  /* Tailwind arbitrary classes are written in the chain as e.g. text-[10px] */
  const tw = chain[0].match(/text-\[(\d+(?:\.\d+)?)px\]|text-\[#[0-9a-fA-F]{3,6}\]|bg-\[#[0-9a-fA-F]{3,6}\]/g) || [];
  for (const c of tw) for (const t of tsxFiles) { const L = lineOf(t, c); if (L && !out.some((o) => o.at === `${t}:${L}`)) { out.push({ at: `${t}:${L}`, sel: c, decl: c, level: 0, cls: c }); break; } }
  return out;
}

const runs = readdirSync(RUN).filter((f) => f.endsWith(`@${VW}.rules.json`));
const pageOf = (f) => f.replace(`@${VW}.rules.json`, "");
const redirected = new Set(["materials", "goals", "you", "queries-all"]); // the redirects; measured where they landed, never counted
const inst = { r1: [], r2: [], r3: [], r4: [], r5: [] };
for (const f of runs) {
  const page = pageOf(f);
  if (redirected.has(page)) continue;
  const d = JSON.parse(readFileSync(resolve(RUN, f), "utf8")).out;
  for (const rule of Object.keys(inst)) {
    const groups = new Map();
    for (const x of d[rule] || []) {
      /* an overlay run sees the page behind it too: an overlay page counts only what is inside a dialog */
      if (page.startsWith("overlay-") && x.view === "page") continue;
      const value = rule === "r1" ? `${x.fontSize}px` : rule === "r2" ? `${x.bg}${x.notNavy ? " (not navy)" : ""}` : rule === "r3" ? x.bg : x.color;
      const k = `${x.view}|${x.chain[0]}|${value}`;
      if (!groups.has(k)) groups.set(k, { page, view: x.view, element: x.chain[0], chain: x.chain, value, n: 0, examples: [], ids: [], raw: x });
      const g = groups.get(k);
      g.n++;
      if (g.examples.length < 3) g.examples.push(x.own || x.label || x.text);
      g.ids.push(x.id);
    }
    for (const g of groups.values()) {
      const src = sourcesFor(rule, g.chain, g.value);
      const files = [...new Set(src.map((s) => s.at.split(":")[0]))];
      inst[rule].push({ ...g, sources: src, auditOnly: files.filter((x) => AUDIT_ONLY.has(x)), inArt: !!g.raw.inArt, scaledCopy: g.raw.scaledCopy || null, viewCount: g.raw.viewCount, notNavy: !!g.raw.notNavy, inShell: !!g.raw.inShell, disabled: !!g.raw.disabled });
    }
  }
}
/* R2: only views that break the rule (more than one primary, or one that is not navy) are instances */
inst.r2 = inst.r2.filter((x) => !x.inShell && !x.disabled && (x.viewCount > 1 || x.notNavy));
for (const k of Object.keys(inst)) inst[k].sort((a, b) => a.page.localeCompare(b.page) || a.view.localeCompare(b.view));
writeFileSync(OUT, JSON.stringify(inst, null, 1));
const c = Object.fromEntries(Object.entries(inst).map(([k, v]) => [k, `${v.length} instances / ${v.reduce((s, x) => s + x.n, 0)} elements / ${new Set(v.map((x) => x.page)).size} pages`]));
console.log("[list]", JSON.stringify(c));
