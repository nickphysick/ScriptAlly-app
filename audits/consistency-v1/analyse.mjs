#!/usr/bin/env node
/**
 * Consistency audit v1 — group the measurements into findings.
 *
 *   node audits/consistency-v1/analyse.mjs <runDir> [--out <dir>]
 *
 * Reads every <route>@<vw>.json a run wrote, groups the records by family × viewport × part × role,
 * and calls every group with more than one distinct value set a FINDING. Each finding is tiered:
 *
 *   C  covered by a baked decision (the reason is written on it)
 *   A  mechanical: (1) one page off by ≤ 2px from the value EVERY other page in the family uses, or
 *      (2) a value that differs from the family's value, or from a shared token, by a colour difference
 *      nobody could see (ΔE76 < 1.0). Nothing else.
 *   B  everything else. When unsure, B.
 *
 * ⚠️ A GROUP NEEDS MEMBERS. A group with one page in it cannot disagree with itself, and is reported as
 * "single-page" (not a pass): an empty or lonely population proves nothing.
 *
 * ⚠️ MOST-PAGES-AGREE IS EVIDENCE, NEVER THE ORACLE. The report names the variant the oracle points to only
 * when a shared token or primitive says so; a majority is shown as a count, never as the answer.
 *
 * Writes findings.json and inventory.json to --out (default: the run dir).
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { readTokens } from "./tokens.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const args = process.argv.slice(2);
const RUN = resolve(args[0] || "audits/consistency-v1/.run");
const OUT = resolve(args.includes("--out") ? args[args.indexOf("--out") + 1] : RUN);

/* ── load ─────────────────────────────────────────────────────────────────────────────────────── */
const allRuns = readdirSync(RUN).filter((f) => /@\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(resolve(RUN, f), "utf8")));
/* ⚠️ A REDIRECTED ROUTE IS NOT A PAGE. /materials, /goals, /you and /queries/all send a computer elsewhere; counting
   them would enter the Dashboard (or Queries) twice and make every Dashboard value look like a two-page majority. */
const isRedirected = (r) => r.family !== "overlays" && r.finalUrl && !r.path.startsWith("/#") && r.path !== "/" && r.finalUrl.split(/[?#]/)[0].replace(/\/$/, "") !== r.path.replace(/\/$/, "");
const runs = allRuns.filter((r) => !isRedirected(r));
const log = existsSync(resolve(RUN, "_log.json")) ? JSON.parse(readFileSync(resolve(RUN, "_log.json"), "utf8")) : [];

/* ── the colour maths (same as the static scan) ──────────────────────────────────────────────── */
const toRgb = (v) => {
  const m = /^#([0-9a-f]{6})(?:\/(\d+))?$/.exec(v || "");
  return m ? { r: parseInt(m[1].slice(0, 2), 16), g: parseInt(m[1].slice(2, 4), 16), b: parseInt(m[1].slice(4, 6), 16), a: m[2] ? +m[2] / 100 : 1 } : null;
};
const lab = ({ r, g, b }) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [f(r), f(g), f(b)];
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [g3(x), g3(y), g3(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) + Math.abs((a.a ?? 1) - (b.a ?? 1)) * 100; };

/* shared colour tokens (tokens.mjs: :root/@theme anywhere + designTokens.ts), for "the oracle points to" */
const SHARED_TOK = readTokens(ROOT).shared;
/* resolve the rgb(var(--x-rgb)) form (--ws-page is written that way) as well as plain hex */
const tokVal = (t) => {
  const v = t.value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  const m = /^rgba?\(\s*var\((--[\w-]+)\)\s*\)$/.exec(v);
  const ref = m && SHARED_TOK.find((x) => x.name === m[1]);
  const ch = ref && /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/.exec(ref.value.trim());
  return ch ? "#" + ch.slice(1, 4).map((n) => (+n).toString(16).padStart(2, "0")).join("") : null;
};
const tokenColours = SHARED_TOK.map((t) => ({ name: t.name, hex: tokVal(t), at: `${t.file}:${t.line}`, appWide: t.appWide })).filter((t) => t.hex);
const tokenFor = (hex) => tokenColours.filter((t) => t.hex === hex);

/* ── which fields each part compares ─────────────────────────────────────────────────────────── */
const DROP = new Set(["bgFrom", "label"]);
/* ⚠️ BOX GEOMETRY IS COMPARED TO THE WHOLE PIXEL. Text-driven boxes land on fractions (227 / 227.1 / 227.2)
   that nobody can see; left unrounded they split one value into three "variants". Type values keep their
   decimals: a 54.4px title against a 54px one is a real difference in the CSS. */
const GEOM = new Set(["height", "width", "topFromSheet", "leftFromSheet", "titleLeft", "titleTop", "subGap", "illusRight", "rightItemInset", "gapBelow"]);
const roundGeom = (k, v) => (GEOM.has(k) && typeof v === "number" ? Math.round(v) : k === "illusBox" && typeof v === "string" ? v.replace(/[\d.]+/g, (n) => String(Math.round(+n))) : v);
const sigOf = (part, role, sig) => {
  const o = {};
  for (const [k0, v0] of Object.entries(sig || {})) {
    const k = k0, v = roundGeom(k0, v0);
    if (DROP.has(k) || v === undefined || v === null) continue;
    if (k === "width" && !(part === "buttons" && role.startsWith("icon-only")) && !["form-controls", "tags-status", "overlays", "surfaces"].includes(part)) continue;
    if (k === "height" && part === "type") continue;
    o[k] = v;
  }
  return o;
};
const PART_WEIGHT = { "page-header": 10, surfaces: 9, type: 6, buttons: 7, cards: 6, overlays: 5, "form-controls": 4, "in-page-nav": 4, "tags-status": 4, lists: 3, footers: 3, "small-parts": 2 };
const ROLE_WEIGHT = { "navy · topFromSheet": 4, "navy · height": 3, "navy · bg": 3, "navy · titleLeft": 3, "navy · gapBelow": 2.5, "plain · topFromSheet": 3, "page-title": 3, "page-subheader": 2, navy: 3, plain: 2, "primary/rest": 2, sheet: 2, "page-background": 2, stage: 2, mountcard: 2, "section-heading": 1.5, "card-heading": 1.2, body: 0.35, secondary: 0.35, labels: 0.35, numerals: 0.35 };

/* ── the baked decisions, as code ────────────────────────────────────────────────────────────── */
const STATE_FILLS = ["#f7efe3", "#e0e5dd", "#f5e6df", "#d7e0e8", "#e4e1db"];
function bakedReason(f) {
  if (f.family === "workspace:discover-not-ready") return "Baked 5 and design-refs/discover-v1 (ref-empty-1512): Discover's not-ready state has its own hero; the shared header (design-refs/workspace-headers-v1) is for its populated state, which the harness account does not reach.";
  if (f.family === "workspace:todo-slim-header") return "Baked 2: the To-do list has a slim title row instead of the full workspace header; held apart from the workspace header comparison.";
  if (f.family === "dashboard" && (f.part === "page-header" || f.part === "surfaces")) return "Baked 1: the Dashboard's header and layout differ from the workspace pages on purpose.";
  if (f.part === "page-header" && f.pages.length && f.variants.every((v) => v.pages.every((p) => p === "todo") || v.pages.length === 0)) return "Baked 2: the To-do list has a slim title row.";
  if (f.part === "small-parts" && f.role === "empty-state") return "Baked 5: empty states keep a light, open header (not held to populated values).";
  /* query state colours: variants that differ ONLY by a background drawn from the five state fills */
  if (["tags-status", "cards", "lists"].includes(f.part)) {
    const bgs = f.variants.map((v) => v.sig.bg);
    const rest = f.variants.map((v) => JSON.stringify({ ...v.sig, bg: 0 }));
    if (new Set(rest).size === 1 && bgs.every((b) => STATE_FILLS.includes(b))) return "Baked 7: the five query state fills are deliberate.";
  }
  return null;
}

/* ── group ───────────────────────────────────────────────────────────────────────────────────── */
const SHARED_FAMILY_PARTS = new Set(["buttons", "cards", "type", "form-controls", "tags-status"]); // the Dashboard joins workspace for these only
const groups = new Map();
const pagesById = {};
for (const run of runs) {
  pagesById[run.key] = { key: run.key, name: run.name, path: run.path, family: run.family, finalUrl: run.finalUrl };
  for (const r of run.records) {
    if (r.scope === "shell" && r.part !== "surfaces") continue;
    /* an overlay run measures the overlay; the page behind it is measured in its own run */
    if (run.family === "overlays" && r.scope !== "overlay") continue;
    let family = run.family;
    /* Baked 2: the To-do list's slim title row is held apart from the workspace header comparison */
    if (run.family === "workspace" && run.key === "todo" && (r.part === "page-header" || (r.part === "type" && /^page-/.test(r.role)))) family = "workspace:todo-slim-header";
    /* Baked 5 + design-refs/discover-v1 (ref-empty): the harness account reaches Discover's not-ready state, whose
       hero is that ref's. workspace-headers-v1 gives Discover the shared header only when populated, which the
       harness does not reach — so Discover's header is held apart rather than compared with populated headers. */
    if (run.family === "workspace" && run.key === "agents-discover" && (r.part === "page-header" || (r.part === "type" && /^page-/.test(r.role)))) family = "workspace:discover-not-ready";
    if (r.scope === "overlay") family = "overlays";
    if (family === "dashboard" && SHARED_FAMILY_PARTS.has(r.part) && !(r.part === "type" && /page-/.test(r.role))) family = "workspace";
    /* overlays are compared with each other wherever they open from, and whatever height they happen to be:
       the collector's drawer/modal guess (by height) is dropped from the group key */
    const role0 = family === "overlays" ? r.role.replace(/^(drawer|modal|full-screen)[/-]/, "") : r.role;
    /* the page header is a set of independent measurements: each is its own comparison, so a finding reads
       "the header sits at three distances from the sheet" rather than "eleven headers are all different" */
    const units = r.part === "page-header" && !family.startsWith("workspace:")
      ? Object.entries(sigOf(r.part, r.role, r.sig)).filter(([k]) => k !== "kind").map(([k, v]) => ({ role: `${role0} · ${k}`, sig: { [k]: v } }))
      : [{ role: role0, sig: sigOf(r.part, r.role, r.sig) }];
    for (const u of units) {
    const role = u.role;
    const key = `${family}|${run.vw}|${r.part}|${role}`;
    if (!groups.has(key)) groups.set(key, { family, vw: run.vw, part: r.part, role, variants: new Map(), pages: new Set() });
    const g = groups.get(key);
    const sig = u.sig;
    const sk = JSON.stringify(sig);
    if (!g.variants.has(sk)) g.variants.set(sk, { sig, pages: new Set(), n: 0, examples: [] });
    const v = g.variants.get(sk);
    v.pages.add(run.key);
    v.n++;
    g.pages.add(run.key);
    if (v.examples.length < 6 && !v.examples.some((e) => e.page === run.key)) {
      const shotKey = Object.keys(run.shots || {}).find((k) => k.startsWith(`${r.part}/${r.role}/`) && k.endsWith(hashSig(r.sig)));
      v.examples.push({ page: run.key, cls: r.cls, text: r.text, rect: r.rect, shot: shotKey ? run.shots[shotKey] : null });
    }
    }
  }
}
function hashSig(sig) {
  /* must match the spec's hash: sha1(JSON.stringify(sig)).slice(0,10) */
  return createHashSync(JSON.stringify(sig));
}
function createHashSync(s) {
  return createHash("sha1").update(s).digest("hex").slice(0, 10);
}

/* ── the class → source index (for "file and line") ──────────────────────────────────────────── */
const srcIndex = new Map();
{
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (/node_modules|__fixtures__/.test(e.name) ? [] : walk(resolve(d, e.name))) : [resolve(d, e.name)]));
  for (const p of walk(resolve(ROOT, "src")).filter((p) => /\.(css|tsx)$/.test(p) && !/\.test\./.test(p))) {
    const rel = relative(ROOT, p);
    readFileSync(p, "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\*|\/\*|\/\/)/.test(line)) return;
      for (const m of line.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
        if (!/[{,:\s>+~]|$/.test(line.slice(m.index + m[0].length, m.index + m[0].length + 1))) continue;
        if (!rel.endsWith(".css") && !/<style|`|css/.test(line)) continue;
        const k = m[1];
        if (!srcIndex.has(k)) srcIndex.set(k, []);
        const arr = srcIndex.get(k);
        if (arr.length < 8 && !arr.includes(`${rel}:${i + 1}`)) arr.push(`${rel}:${i + 1}`);
      }
    });
  }
}
const sourcesFor = (cls) => {
  const out = [];
  for (const level of cls || []) {
    const classes = (level.split(".").slice(1) || []).filter((c) => !/^(flex|grid|block|hidden|relative|absolute|w-|h-|p[xytrbl]?-|m[xytrbl]?-|gap-|items-|justify-|text-|bg-|border|rounded|font-|shadow)/.test(c));
    for (const c of classes) for (const at of srcIndex.get(c) || []) if (!out.includes(at)) out.push(at);
    if (out.length) break;
  }
  return out.slice(0, 4);
};

/* ── tier ────────────────────────────────────────────────────────────────────────────────────── */
const numericDiff = (a, b) => {
  /* every differing field must be numeric (or a px list) and within the tolerance; returns max |Δ| or null */
  let max = 0;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    const na = String(a[k]).match(/-?[\d.]+/g), nb = String(b[k]).match(/-?[\d.]+/g);
    const ta = String(a[k]).replace(/-?[\d.]+/g, "#"), tb = String(b[k]).replace(/-?[\d.]+/g, "#");
    if (!na || !nb || na.length !== nb.length || ta !== tb) return null;
    /* a colour inside a string (#abcdef) is text, not numbers */
    if (/#[0-9a-f]{6}/.test(String(a[k])) || /#[0-9a-f]{6}/.test(String(b[k]))) {
      const ca = String(a[k]).match(/#[0-9a-f]{6}(\/\d+)?/g) || [], cb = String(b[k]).match(/#[0-9a-f]{6}(\/\d+)?/g) || [];
      const restA = String(a[k]).replace(/#[0-9a-f]{6}(\/\d+)?/g, "C"), restB = String(b[k]).replace(/#[0-9a-f]{6}(\/\d+)?/g, "C");
      if (restA !== restB || ca.length !== cb.length) return null;
      for (let i = 0; i < ca.length; i++) if (dE(toRgb(ca[i]), toRgb(cb[i])) >= 1) return null;
      continue;
    }
    for (let i = 0; i < na.length; i++) max = Math.max(max, Math.abs(+na[i] - +nb[i]));
  }
  return max;
};
const colourOnlyInvisible = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  let any = false;
  for (const k of keys) {
    if (JSON.stringify(a[k]) === JSON.stringify(b[k])) continue;
    const ca = toRgb(a[k]), cb = toRgb(b[k]);
    if (!ca || !cb) return false;
    if (dE(ca, cb) >= 1) return false;
    any = true;
  }
  return any;
};

const findings = [];
const singles = [];
for (const g of groups.values()) {
  const variants = [...g.variants.values()].map((v) => ({ ...v, pages: [...v.pages].sort() })).sort((a, b) => b.pages.length - a.pages.length || b.n - a.n);
  const pages = [...g.pages].sort();
  if (g.family === "workspace:todo-slim-header" || g.family === "workspace:discover-not-ready") {
    findings.push({ id: "", family: g.family, vw: g.vw, part: g.part, role: g.role, pages, fields: Object.keys(variants[0].sig), variants: variants.map((v) => ({ sig: v.sig, pages: v.pages, n: v.n, examples: v.examples.map((e) => ({ ...e, sources: sourcesFor(e.cls) })) })), tier: "C", reason: bakedReason({ family: g.family }), oracle: null, visibility: 0 });
    continue;
  }
  if (pages.length < 2 && variants.length < 2) { singles.push({ family: g.family, vw: g.vw, part: g.part, role: g.role, pages, values: variants[0]?.sig }); continue; }
  if (variants.length < 2) continue;
  const f = { id: "", family: g.family, vw: g.vw, part: g.part, role: g.role, pages, variants: variants.map((v) => ({ sig: v.sig, pages: v.pages, n: v.n, examples: v.examples.map((e) => ({ ...e, sources: sourcesFor(e.cls) })) })) };
  /* which fields differ, across the variants */
  const fields = new Set();
  for (const v of variants) for (const k of Object.keys(v.sig)) if (variants.some((w) => JSON.stringify(w.sig[k]) !== JSON.stringify(v.sig[k]))) fields.add(k);
  f.fields = [...fields];
  /* the oracle: a variant whose colours are all shared tokens */
  f.oracle = null;
  const REF = (() => { try { return JSON.parse(readFileSync(resolve(ROOT, "audits/consistency-v1/ref-checks.json"), "utf8")).checks; } catch { return []; } })();
  const rc = REF.find((c) => c.key === `${g.family}|${g.part}|${g.role}`);
  if (rc) { f.refNote = rc.note; if (rc.tier) f.forceTier = rc.tier; }
  for (const v of variants) {
    const cols = Object.entries(v.sig).filter(([, x]) => /^#[0-9a-f]{6}$/.test(String(x)));
    const hit = cols.length && cols.every(([, x]) => tokenFor(x).length);
    if (hit && variants.filter((w) => Object.entries(w.sig).filter(([, x]) => /^#[0-9a-f]{6}$/.test(String(x))).every(([, x]) => tokenFor(x).length)).length === 1) {
      f.oracle = { variant: variants.indexOf(v), why: `its colours are shared tokens (${cols.map(([k, x]) => `${k} ${x} = ${tokenFor(x).map((t) => t.name).join("/")}`).join("; ")})` };
    }
  }
  const baked = bakedReason(f);
  if (baked) { f.tier = "C"; f.reason = baked; }
  else if (f.forceTier) { f.tier = f.forceTier; f.reason = f.refNote; }
  else {
    /* Tier A test 1: exactly two variants; the minority is ONE page; every other page in the group uses the
       majority and nothing else; the difference is ≤ 2px (or an invisible colour) on every differing field. */
    /* Baked 6 and the prompt's tiering: a header position or header shape difference is always B, never mechanical */
    const headerRule = g.part === "page-header";
    const [maj, ...rest] = headerRule ? [] : variants;
    const others = maj ? pages.filter((p) => !maj.pages.includes(p)) : [];
    if (maj && rest.length === 1 && rest[0].pages.length === 1 && others.length === 1 && maj.pages.length >= 2 && !maj.pages.includes(rest[0].pages[0])) {
      const d = numericDiff(maj.sig, rest[0].sig);
      if (d !== null && d <= 2) { f.tier = "A"; f.reason = `One page (${rest[0].pages[0]}) is ${d === 0 ? "an invisible colour shade" : `${d}px`} off the value the other ${maj.pages.length} pages use.`; f.aTest = "one-page-within-2px"; f.target = { variant: 0 }; f.stray = { variant: 1 }; }
    }
    /* Tier A test 2: a variant that differs from another ONLY by an invisible colour difference, where the other is a shared token */
    if (!f.tier && !headerRule) {
      for (let i = 0; i < variants.length && !f.tier; i++) for (let j = 0; j < variants.length && !f.tier; j++) {
        if (i === j || variants.length !== 2) continue;
        if (colourOnlyInvisible(variants[i].sig, variants[j].sig)) {
          const tok = Object.values(variants[i].sig).filter((x) => /^#[0-9a-f]{6}$/.test(String(x))).every((x) => tokenFor(x).length);
          if (tok) { f.tier = "A"; f.aTest = "invisible-colour-vs-token"; f.reason = "Two values a person could not tell apart (ΔE < 1); one of them is a shared token."; f.target = { variant: i }; f.stray = { variant: j }; }
        }
      }
    }
    if (!f.tier) { f.tier = "B"; f.reason = headerRule ? "Baked 6 / the prompt: a difference in the page header's position or shape is always Tier B." : variants.length === 2 ? "Two real variants in use." : `${variants.length} variants in use.`; }
  }
  /* visibility: how much of the screen and how many pages it touches */
  const area = Math.max(...variants.flatMap((v) => v.examples.map((e) => (e.rect?.w || 0) * (e.rect?.h || 0))), 1);
  f.visibility = Math.round((PART_WEIGHT[g.part] || 1) * (ROLE_WEIGHT[g.role] || 1) * pages.length * Math.log10(10 + area) * (1 + 0.15 * Math.min(variants.length - 1, 4)) * (fields.has("bg") || fields.has("color") || fields.has("fontFamily") ? 1.6 : 1));
  findings.push(f);
}
/* ── the rules the baked decisions state outright, checked on what rendered ────────────────────── */
const hsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return { h, s, l };
};
const BURG = { r: 124, g: 58, b: 42 };
const isGreen = (c) => { const x = hsl(c); return x.h >= 75 && x.h <= 170 && x.s >= 0.28 && x.l >= 0.15 && x.l <= 0.85; };
const isRed = (c) => { const x = hsl(c); return (x.h <= 10 || x.h >= 345) && x.s >= 0.45 && x.l >= 0.25 && x.l <= 0.65 && dE(c, BURG) >= 3; };
const isBlush = (c) => { const x = hsl(c); return (x.h <= 30 || x.h >= 340) && x.s >= 0.3 && x.l >= 0.82 && x.l <= 0.96; };
const NAVY_OK = (c) => { const x = hsl(c); return x.h >= 200 && x.h <= 235 && x.l <= 0.3; };
const SCALE = [28, 24, 20, 16, 14];
function ruleFinding(rule, title, rows, reason) {
  if (!rows.length) return;
  const byVal = new Map();
  for (const r of rows) { if (!byVal.has(r.value)) byVal.set(r.value, { sig: { value: r.value }, pages: new Set(), n: 0, examples: [] }); const v = byVal.get(r.value); v.pages.add(r.page); v.n += r.n || 1; if (v.examples.length < 4) v.examples.push({ page: r.page, cls: [r.cls || ""], text: r.text || "", sources: sourcesFor([r.cls || ""]), shot: r.shot || null }); }
  const variants = [...byVal.values()].map((v) => ({ ...v, pages: [...v.pages].sort() })).sort((a, b) => b.pages.length - a.pages.length || b.n - a.n);
  const pages = [...new Set(rows.map((r) => r.page))].sort();
  findings.push({ id: "", family: "all", vw: 1512, part: "rules", role: rule, title, pages, fields: ["value"], variants, tier: "B", reason, oracle: null, visibility: Math.round(8 * pages.length * Math.log10(10 + rows.length)) });
}
{
  const at1512 = runs.filter((r) => r.vw === 1512);
  const prim = [], blush = [], green = [], red = [], burg = [], tiny = [], offScale = [];
  for (const run of at1512) {
    const recs = run.records.filter((r) => !(run.family === "overlays" && r.scope !== "overlay") && r.scope !== "shell");
    const p = recs.filter((r) => r.part === "buttons" && r.role === "primary/rest");
    if (p.length > 1) prim.push({ page: run.key, value: `${p.length} filled primary buttons in one view`, cls: p[0].cls[0], text: p.map((x) => x.label || x.text).join(" · ").slice(0, 80) });
    for (const x of p) if (!NAVY_OK(toRgb(x.sig.bg) || { r: 0, g: 0, b: 0 })) prim.push({ page: run.key, value: `primary button fill ${x.sig.bg} is not navy`, cls: x.cls[0], text: x.label || x.text });
    for (const x of recs.filter((r) => r.part === "buttons" && /^filled-light/.test(r.role))) { const c = toRgb(x.sig.bg); if (c && isBlush(c)) blush.push({ page: run.key, value: `blush-filled button ${x.sig.bg}`, cls: x.cls[0], text: x.label || x.text }); }
    for (const [k, v] of Object.entries(run.census || {})) {
      const [kind, hex] = k.split(" ");
      const c = toRgb(hex);
      if (!c || c.a < 0.15) continue;
      if (isGreen(c)) green.push({ page: run.key, value: `${kind} ${hex}`, cls: v.ex, n: v.n });
      if (isRed(c)) red.push({ page: run.key, value: `${kind} ${hex}`, cls: v.ex, n: v.n });
      if (dE(c, BURG) < 3) burg.push({ page: run.key, value: `${kind} ${hex}`, cls: v.ex, n: v.n });
    }
    for (const x of recs.filter((r) => r.part === "type" || r.part === "buttons" || r.part === "tags-status")) {
      const fs = +x.sig.fontSize;
      if (!fs) continue;
      if (fs < 12) tiny.push({ page: run.key, value: `${fs}px`, cls: x.cls[0], text: x.text });
      else if (!SCALE.includes(fs) && !(fs >= 32 && /page-title|h1/.test(x.role))) offScale.push({ page: run.key, value: `${fs}px`, cls: x.cls[0], text: x.text });
    }
  }
  ruleFinding("one-navy-primary", "More than one filled primary button in a view, or a primary that is not navy", prim, "Baked 10: one filled primary button per view, in navy.");
  ruleFinding("blush-button", "A button filled with blush", blush, "Baked 10: blush is an accent, never a button.");
  ruleFinding("green", "Green drawn on the page", green, "Baked 9: no green anywhere.");
  ruleFinding("red", "Red drawn on the page", red, "Baked 9: no red states.");
  ruleFinding("burgundy", "Burgundy drawn somewhere other than a MountCard frame", burg.filter((b) => !/border/.test(b.value) || true), "Baked 9: burgundy is only the MountCard frame border. (The MountCard frame itself is drawn at 28% opacity, so it is not this colour.)");
  ruleFinding("type-under-12", "Text smaller than 12px", tiny, "Baked 11: nothing under 12.");
  ruleFinding("type-off-scale", "Text sizes off the 28 / 24 / 20 / 16 / 14 scale", offScale, "Baked 11: the type scale is 28, 24, 20, 16, 14 (one larger display size for a hero). Off-scale is Tier B unless it meets the Tier A test.");
}

/* ── one finding per part, not one per viewport ───────────────────────────────────────────────────
   Values are compared like with like (1512 with 1512, 1920 with 1920 — baked 13). When the same group is a
   finding at both widths, it is ONE finding: the 1512 reading is shown, and the 1920 reading is attached. */
{
  const key = (f) => `${f.family}|${f.part}|${f.role}`;
  const by = new Map();
  for (const f of findings) { if (!by.has(key(f))) by.set(key(f), []); by.get(key(f)).push(f); }
  const merged = [];
  for (const list of by.values()) {
    const a = list.find((f) => f.vw === 1512) || list[0];
    const b = list.find((f) => f !== a);
    if (b) {
      const part = (f) => JSON.stringify(f.variants.map((v) => v.pages).sort());
      a.vws = [a.vw, b.vw].sort();
      a.otherWidth = { vw: b.vw, variants: b.variants.length, samePagesSplit: part(a) === part(b), tier: b.tier, variantsData: b.variants.map((v) => ({ sig: v.sig, pages: v.pages })) };
      /* the stricter tier wins: a difference that is mechanical at one width and real at the other is B */
      if (a.tier !== b.tier) { const order = { B: 0, A: 1, C: 2 }; if (order[b.tier] < order[a.tier]) { a.tier = b.tier; a.reason = `${b.reason} (at ${b.vw})`; } }
      a.visibility = Math.max(a.visibility, b.visibility);
    } else a.vws = [a.vw];
    merged.push(a);
  }
  findings.length = 0;
  findings.push(...merged);
}

const tierOrder = { B: 0, A: 1, C: 2 };
findings.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier] || b.visibility - a.visibility);
findings.forEach((f, i) => { f.id = `${f.tier}${String(i + 1).padStart(3, "0")}`; });

/* the inventory: pages, failures, group populations */
const failed = log.filter((e) => e.failed).map((e) => ({ key: e.key, path: e.path, vw: e.vw, why: e.failed }));
const redirected = allRuns.filter(isRedirected).map((r) => ({ key: r.key, path: r.path, vw: r.vw, finalUrl: r.finalUrl }));
const populations = [...groups.values()].map((g) => ({ family: g.family, vw: g.vw, part: g.part, role: g.role, pages: g.pages.size, variants: g.variants.size })).sort((a, b) => (a.family + a.part + a.role).localeCompare(b.family + b.part + b.role));

const inventory = {
  generated: new Date().toISOString(),
  run: relative(ROOT, RUN),
  pages: Object.values(pagesById),
  measured: runs.map((r) => ({ key: r.key, vw: r.vw, records: r.records.length, header: r.meta?.header, scrollbar: r.meta?.scrollbar, errors: r.errors?.length || 0 })),
  failed, redirected, populations,
  singlePageGroups: singles.length,
};
writeFileSync(resolve(OUT, "findings.json"), JSON.stringify({ generated: inventory.generated, counts: countBy(findings), findings }, null, 1));
writeFileSync(resolve(OUT, "inventory.runtime.json"), JSON.stringify(inventory, null, 1));
console.log(`[analyse] ${runs.length} measured page-views · ${groups.size} groups · ${findings.length} findings (${JSON.stringify(countBy(findings).tier)}) · ${failed.length} failed loads · ${singles.length} single-page groups`);

function countBy(fs) {
  const tier = {}, part = {};
  for (const f of fs) { tier[f.tier] = (tier[f.tier] || 0) + 1; part[`${f.part}`] = part[f.part] || { A: 0, B: 0, C: 0 }; part[f.part][f.tier]++; }
  return { tier, part };
}
