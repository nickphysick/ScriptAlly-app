#!/usr/bin/env node
/**
 * Consistency audit v1 — the static scan of the source.
 *
 *   node audits/consistency-v1/static-scan.mjs [outFile]   (default audits/consistency-v1/.run/scan.json)
 *
 * What it looks for (the prompt's list): colour literals that are not token definitions, near-duplicate
 * colours, font-family outside the type tokens, font sizes off the 28/24/20/16/14 scale, radius / shadow /
 * border values outside the tokens, local copies of a shared primitive, burgundy outside the MountCard
 * frame, any green or red, color-mix(), and var() inside @keyframes.
 *
 * ⚠️ COMMENTS ARE BLANKED BEFORE SCANNING, LINE NUMBERS KEPT. This repo's comments quote hex values and
 * class names constantly; a scan that read them would report prose as code.
 *
 * ⚠️ THE SHARED TOKENS are the definitions in src/index.css (:root, @theme and the theme scopes) and the
 * exports of src/lib/designTokens.ts. A custom property defined in a page stylesheet is a LOCAL token: it
 * is reported in its own bucket, never as a shared one.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import { readTokens } from "./tokens.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const OUT = resolve(ROOT, process.argv[2] || "audits/consistency-v1/.run/scan.json");
const SHARED_CSS = ["src/index.css", "src/styles/motion.css"];
const SHARED_TS = ["src/lib/designTokens.ts"];

const walk = (d, out = []) => {
  for (const f of readdirSync(d)) {
    const p = resolve(d, f);
    const s = statSync(p);
    if (s.isDirectory()) { if (!/node_modules|__fixtures__|^test$/.test(f)) walk(p, out); }
    else if (/\.(css|tsx?|jsx?)$/.test(f) && !/\.test\.|\.spec\.|\.d\.ts$/.test(f)) out.push(p);
  }
  return out;
};
const files = walk(resolve(ROOT, "src")).map((p) => relative(ROOT, p)).sort();

/* blank comments, keep newlines (so line numbers survive) */
const blank = (s) => s.replace(/[^\n]/g, " ");
function stripComments(src, isCss) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, blank);
  if (!isCss) out = out.replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, a) => a + blank(m.slice(a.length)));
  return out;
}

/* ── colour maths ─────────────────────────────────────────────────────────────────────────────── */
const toRgb = (v) => {
  v = v.trim().toLowerCase();
  let m = /^#([0-9a-f]{3,8})$/.exec(v);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = /^rgba?\(([^)]+)\)$/.exec(v);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean);
    if (p.length < 3 || p.some((x, i) => i < 3 && !/^[\d.]+%?$/.test(x))) return null;
    const n = p.map((x) => (x.endsWith("%") ? parseFloat(x) * 2.55 : parseFloat(x)));
    return { r: n[0], g: n[1], b: n[2], a: p[3] !== undefined ? (p[3].endsWith("%") ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1 };
  }
  m = /^hsla?\(([^)]+)\)$/.exec(v);
  if (m) {
    const p = m[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat);
    const [h, s, l] = [p[0], p[1] / 100, p[2] / 100];
    const k = (n) => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return { r: f(0) * 255, g: f(8) * 255, b: f(4) * 255, a: p[3] ?? 1 };
  }
  return null;
};
const lab = ({ r, g, b }) => {
  const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const [R, G, B] = [f(r), f(g), f(b)];
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047, y = R * 0.2126 + G * 0.7152 + B * 0.0722, z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const g3 = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  [x, y, z] = [g3(x), g3(y), g3(z)];
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
};
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
const hsl = ({ r, g, b }) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (!d) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h *= 60; if (h < 0) h += 360;
  return { h, s, l };
};
const hex = ({ r, g, b }) => "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
/* "green": hue 75–170 with real saturation; "red": hue ≤ 12 or ≥ 345, saturated, mid lightness. Burgundy
   (#7c3a2a, hue 12) is its own check, so it is excluded here by value. Sage (#8a9e88, s 0.1) is not green. */
const isBurg = (c) => dE(c, { r: 124, g: 58, b: 42 }) < 3;
const isGreen = (c) => { const x = hsl(c); return x.h >= 75 && x.h <= 170 && x.s >= 0.28 && x.l >= 0.15 && x.l <= 0.85; };
const isRed = (c) => { const x = hsl(c); return (x.h <= 10 || x.h >= 345) && x.s >= 0.45 && x.l >= 0.25 && x.l <= 0.65 && !isBurg(c); };

const COLOUR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;
const SCALE = [28, 24, 20, 16, 14];

/* ── the shared tokens (tokens.mjs: :root/@theme in any stylesheet + designTokens.ts) ─────────────── */
const TOK = readTokens(ROOT);
const sharedTokens = TOK.shared.map((t) => ({ ...t, rgb: toRgb(t.value) }));
const colourTokens = sharedTokens.filter((t) => t.rgb && t.rgb.a === 1);
const SHARED_FILES = new Set(sharedTokens.map((t) => t.file));
const sharedLine = new Set(sharedTokens.map((t) => `${t.file}:${t.line}`));
const nearestToken = (c) => {
  let best = null;
  for (const t of colourTokens) { const d = dE(c, t.rgb); if (!best || d < best.d - 1e-9) best = { t, d }; } // ties keep the app-wide token (sorted first)
  return best;
};

/* ── the scan ────────────────────────────────────────────────────────────────────────────────── */
const items = [];
const push = (kind, file, line, value, extra = {}) => items.push({ kind, file, line, value: String(value).slice(0, 200), ...extra });
const allColours = new Map(); // hex → { n, at }

for (const f of files) {
  const isCss = f.endsWith(".css");
  const raw = readFileSync(resolve(ROOT, f), "utf8");
  const src = stripComments(raw, isCss);
  const lines = src.split("\n");
  let inKeyframes = 0, depth = 0, kfDepth = -1;
  lines.forEach((line, i) => {
    const ln = i + 1;
    /* @keyframes tracking (CSS and template-literal CSS alike) */
    if (/@keyframes\b/.test(line)) { inKeyframes = 1; kfDepth = depth; }
    for (const ch of line) { if (ch === "{") depth++; else if (ch === "}") { depth--; if (inKeyframes && depth <= kfDepth) { inKeyframes = 0; kfDepth = -1; } } }
    if (inKeyframes && /var\(--/.test(line)) push("var-in-keyframes", f, ln, line.trim());
    if (/color-mix\(/.test(line)) push("color-mix", f, ln, line.trim());

    const isTokenDef = /^\s*--[\w-]+\s*:/.test(line) || (isCss && /(^|[;{\s])--[\w-]+\s*:/.test(line));
    for (const m of line.matchAll(COLOUR_RE)) {
      const c = toRgb(m[0]);
      if (!c) continue;
      const h = hex(c);
      if (!allColours.has(h)) allColours.set(h, { n: 0, at: `${f}:${ln}` });
      allColours.get(h).n++;
      if (isBurg(c) && c.a > 0) {
        const mountFrame = f === "src/lib/designTokens.ts" && /insetBorder/.test(line);
        const tokenDef = sharedLine.has(`${f}:${ln}`);
        if (!mountFrame && !tokenDef) push("burgundy", f, ln, m[0], { context: line.trim().slice(0, 140) });
      }
      if (c.a > 0.15 && isGreen(c)) push("green", f, ln, m[0], { hex: h, context: line.trim().slice(0, 140) });
      if (c.a > 0.15 && isRed(c)) push("red", f, ln, m[0], { hex: h, context: line.trim().slice(0, 140) });
      if (sharedLine.has(`${f}:${ln}`) || SHARED_TS.includes(f)) continue;
      const near = c.a === 1 ? nearestToken(c) : null;
      const base = { hex: h, nearest: near ? { token: near.t.name, value: near.t.value, dE: Math.round(near.d * 100) / 100, at: `${near.t.file}:${near.t.line}`, appWide: near.t.appWide } : null };
      if (isTokenDef) push("local-token-colour", f, ln, m[0], base);
      else push("colour-literal", f, ln, m[0], { ...base, context: line.trim().slice(0, 140) });
    }

    /* font-family */
    const ff = isCss ? /font-family\s*:\s*([^;]+)/.exec(line) : /fontFamily\s*:\s*([^,}]+)/.exec(line);
    if (ff && !/var\(--font|var\(--f12|inherit|var\(--[\w-]*(font|serif|sans|mono)/.test(ff[1]) && !sharedLine.has(`${f}:${ln}`)) push("font-family", f, ln, ff[1].trim());

    /* font-size */
    const fsRe = isCss ? /font-size\s*:\s*([\d.]+)(px|rem)\b/g : /fontSize\s*:\s*["']?([\d.]+)(px|rem)?["']?/g;
    for (const m of line.matchAll(fsRe)) {
      const v = m[2] === "rem" ? parseFloat(m[1]) * 16 : parseFloat(m[1]);
      if (!Number.isFinite(v) || v === 0) continue;
      if (!SCALE.includes(v) && v < 32) push("font-size-off-scale", f, ln, `${v}px`, { under12: v < 12 });
    }
    /* font shorthand */
    for (const m of line.matchAll(isCss ? /\bfont\s*:\s*[^;]*?\b([\d.]+)px/g : /\bfont\s*:\s*["'][^"']*?\b([\d.]+)px/g)) {
      const v = parseFloat(m[1]);
      if (!SCALE.includes(v) && v < 32) push("font-size-off-scale", f, ln, `${v}px`, { under12: v < 12, shorthand: true });
    }

    /* radius */
    const rr = isCss ? /border(?:-[a-z]+)*-radius\s*:\s*([^;]+)/.exec(line) : /borderRadius\s*:\s*["']?([^,}"']+)/.exec(line);
    if (rr && !/var\(--/.test(rr[1]) && !/^(0|50%|999+px|9999px|100%|inherit)$/.test(rr[1].trim()) && !sharedLine.has(`${f}:${ln}`)) push("radius-literal", f, ln, rr[1].trim());
    /* shadow */
    const sh = isCss ? /box-shadow\s*:\s*([^;]+)/.exec(line) : /boxShadow\s*:\s*["'`]([^"'`]+)/.exec(line);
    if (sh && !/^(none|inherit|var\([^)]*\))\s*(!important)?$/.test(sh[1].trim()) && !sharedLine.has(`${f}:${ln}`)) push("shadow-literal", f, ln, sh[1].trim());
    /* border with a literal colour */
    const bd = isCss ? /\bborder(?:-(?:top|right|bottom|left))?\s*:\s*([^;]+)/.exec(line) : /\bborder(?:Top|Right|Bottom|Left)?\s*:\s*["'`]([^"'`]+)/.exec(line);
    if (bd && COLOUR_RE.test(bd[1]) && !sharedLine.has(`${f}:${ln}`)) push("border-literal", f, ln, bd[1].trim());
    COLOUR_RE.lastIndex = 0;
  });

  /* local copies of a shared primitive */
  if (f !== "src/components/MountCard.tsx") {
    if (/inset:\s*6\b|inset:\s*["']?6px/.test(src) && /borderRadius:\s*10\b|border-radius:\s*10px/.test(src) && /insetBorder|rgba\(\s*124\s*,\s*58\s*,\s*42/.test(src)) push("primitive-copy", f, 0, "MountCard frame recreated (inset 6, radius 10, the burgundy frame border)");
    if (/0 8px 26px rgba\(58,\s*28,\s*20,\s*0?\.13\)/.test(src)) push("primitive-copy", f, 0, "MountCard shadow restated as a literal (mountShadow)");
  }
  if (f !== "src/components/StatusDot.tsx" && !isCss && /<circle\b/.test(src) && /"(Partial Requested|Full Requested|Revise & Resubmit|Offer)"/.test(src) && !/from ["'][./]*StatusDot["']|StatusDot\b/.test(src.replace(/<circle[\s\S]*/, ""))) {
    push("primitive-copy", f, 0, "draws a query status with its own <circle> and does not import StatusDot");
  }
}

/* near-duplicate colours: pairs a person could not tell apart (ΔE76 < 2.3, the just-noticeable difference) */
const palette = [...allColours.entries()].map(([h, v]) => ({ h, ...v, rgb: toRgb(h) }));
const nearDup = [];
for (let i = 0; i < palette.length; i++) for (let j = i + 1; j < palette.length; j++) {
  const d = dE(palette[i].rgb, palette[j].rgb);
  if (d > 0 && d < 2.3) nearDup.push({ a: palette[i].h, b: palette[j].h, dE: Math.round(d * 100) / 100, aUses: palette[i].n, bUses: palette[j].n, aAt: palette[i].at, bAt: palette[j].at });
}
nearDup.sort((x, y) => x.dE - y.dE);

/* a literal that IS a :root token's value (ΔE 0): the mechanical sweep candidates, reported, never applied here */
const exactTokenDupes = items.filter((i) => i.kind === "colour-literal" && i.nearest && i.nearest.dE === 0 && i.nearest.appWide);
const dupeByToken = {};
for (const i of exactTokenDupes) { const k = `${i.nearest.token} ${i.nearest.value}`; dupeByToken[k] = (dupeByToken[k] || 0) + 1; }
const counts = {};
for (const it of items) counts[it.kind] = (counts[it.kind] || 0) + 1;
const byFile = {};
for (const it of items) { const k = `${it.kind}|${it.file}`; byFile[k] = (byFile[k] || 0) + 1; }

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify({
  scanned: files.length,
  sharedTokens: { count: sharedTokens.length, colours: colourTokens.length, files: [...SHARED_FILES].sort(), themeScopedInIndexCss: TOK.themeScoped.length },
  counts, nearDuplicateColours: { count: nearDup.length, pairs: nearDup.slice(0, 400) },
  distinctColours: palette.length,
  literalsEqualToRootToken: { count: exactTokenDupes.length, files: new Set(exactTokenDupes.map((i) => i.file)).size, byToken: Object.entries(dupeByToken).sort((a, b) => b[1] - a[1]).slice(0, 40) },
  byFile: Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 300).map(([k, n]) => ({ kind: k.split("|")[0], file: k.split("|")[1], n })),
  items,
}, null, 1));
console.log(`[scan] ${files.length} files · ${sharedTokens.length} shared token definitions (${colourTokens.length} opaque colours) · ${palette.length} distinct colours · ${nearDup.length} near-duplicate pairs`);
console.log("[scan] " + Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · "));
