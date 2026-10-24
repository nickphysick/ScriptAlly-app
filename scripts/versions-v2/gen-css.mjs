// Versions v2 — turn extract-css.mjs's matched rules into src/components/versions/versionsV2.css.
//   node scripts/versions-v2/extract-css.mjs design-refs/versions-v2/versions-v2.html /tmp/rules.json
//   node scripts/versions-v2/gen-css.mjs /tmp/rules.json src/components/versions/versionsV2.css
//
// Every rule is the ref's own text, in the ref's own order, scoped under `.vv2`. Three things are added, and only
// three: a user-agent restore (`all: revert`, so the app's Tailwind preflight and brand.tsx's bare-element fonts do not
// change what the ref drew), the ref's body type on `.vv2`, and an `!important` font claw-back on the rules that land
// on headings (brand.tsx forces `h2, h3` with !important). Nothing is hand-tuned here; a value that must differ from
// the ref is set in versionsV2.app.css, with its reason.
import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath] = process.argv;
const { kept, kf } = JSON.parse(readFileSync(inPath, "utf8"));

/* the shell is the app's own: any selector part rooted in the ref's sidebar, bar, frame, state switch or guide goes */
const SHELL = /(^|[\s>+~(,])(\.(side|bar|stsw|app|main|scroll|gd-pop|gd-spot|gd-note|pck-pill|gsp)|#gsp|#scroll)(?![-\w])/;
const splitTop = (sel) => { const out = []; let d = 0, cur = ""; for (const ch of sel) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && !d) { out.push(cur.trim()); cur = ""; } else cur += ch; } if (cur.trim()) out.push(cur.trim()); return out; };

const scope = (part) => {
  let p = part.trim();
  if (p === "*") return ".vv2 *";
  /* :root / html / body (with attributes) are the page root */
  p = p.replace(/^:root\b/, ".vv2").replace(/^html\s+body\b/, ".vv2").replace(/^html\b/, ".vv2");
  const m = /^body((?:\[[^\]]+\])*)(.*)$/.exec(p);
  if (m) return `.vv2${m[1]}${m[2]}`;
  if (p.startsWith(".vv2")) return p;
  return `.vv2 ${p}`;
};

const familyOf = (body) => {
  const f = /(?:^|;)\s*font-family\s*:\s*([^;!]+)/.exec(body);
  if (f) return f[1].trim();
  const s = /(?:^|;)\s*font\s*:\s*[^;]*?\d[\d.]*(?:px|em|rem|%|pt)(?:\/[^\s;]+)?\s+([^;!]+)/.exec(body);
  return s ? s[1].trim() : null;
};

const out = [];
out.push(`/* ══ GENERATED from design-refs/versions-v2/versions-v2.html by scripts/versions-v2/{extract-css,gen-css}.mjs ══
   ${kept.length} of the ref's rules: exactly those that match its Versions DOM across all five states and every overlay,
   in the ref's order, scoped under .vv2. Do not edit by hand — regenerate. App-side overrides live in versionsV2.app.css. */`);
out.push(`.vv2 :where(*:not(svg, svg *)) { all: revert; }`);
out.push(`.vv2 :where(svg) { display: revert; vertical-align: revert; }`);
out.push(`.vv2 { color: var(--ink); font-family: var(--serif); font-size: 15px; line-height: 1.5; }`);
out.push(`.vv2.vv2 :is(h1, h2, h3, h4, h5, h6) { font-family: inherit !important; }`);

let media = null; let buf = [];
const flush = () => { if (!buf.length) return; out.push(media && media.length ? media.reduceRight((inner, c) => `${c.startsWith("@") ? c : `@media ${c}`} {\n${inner}\n}`, buf.join("\n")) : buf.join("\n")); buf = []; };
let dropped = 0;
for (const r of kept) {
  const key = JSON.stringify(r.media);
  if (key !== JSON.stringify(media)) { flush(); media = r.media; }
  if (/^html\s*,\s*body$/.test(r.sel.replace(/\s+/g, " ").trim())) { dropped++; continue; }
  const parts = splitTop(r.sel).filter((p) => !SHELL.test(p));
  if (!parts.length) { dropped++; continue; }
  const body = r.text.slice(r.text.indexOf("{") + 1, r.text.lastIndexOf("}")).trim();
  const sel = parts.map(scope).join(", ");
  buf.push(`${sel} { ${body} }`);
  if (r.head) {
    const fam = familyOf(body);
    const hp = parts.filter((p) => /(^|[\s>+~])h[1-6](?![\w-])[^\s>+~]*$/.test(p.replace(/::?[a-z-]+(\([^)]*\))?$/g, "")) && !/::(before|after)$/.test(p));
    if (fam && hp.length) buf.push(`${hp.map((p) => `.vv2.vv2 ${scope(p).replace(/^\.vv2\s*/, "")}`).join(", ")} { font-family: ${fam} !important; }`);
  }
}
flush();
/* ⚠️ THE TWO FACES ARE THE APP'S TOKENS, NEVER THEIR NAMES: the ref declares them as literals on :root, and the house
   lock (marketingTokens.test) forbids any other sheet naming either family — the app reads them from --sp-type and
   --sp-serif. Same faces, one owner. */
for (let i = 0; i < out.length; i++) {
  /* ⚠️ AND THE REF'S OWN DEFINITIONS OF THE APP'S TOKENS GO: it declares `--sp-type: var(--machine)` and
     `--sp-serif: var(--serif)` (and --font-mono) on :root to imitate the app. Kept beside the swap above they form a
     cycle — --machine → --sp-type → --machine — and every face on the page resolves to nothing. The app owns them. */
  out[i] = out[i].replace(/--(sp-serif|sp-type|font-mono)\s*:\s*var\(--(serif|machine|mono)\)\s*;?/g, "");
  out[i] = out[i].replace(/--machine:\s*'Special Elite',\s*monospace/g, "--machine:var(--sp-type)").replace(/--serif:\s*'Source Serif 4',\s*Georgia,\s*serif/g, "--serif:var(--sp-serif)");
}
/* ⚠️ THE BANNER'S LOOK MOVED TO src/components/shared/pageAlertBanner.css (Query Centre v149, lock QC149-L0): the
   page renders it through PageAlertBanner. Its parts go; its two base rules keep only their margins, which are the
   page's. Without this a regeneration would put a second copy of the look back under .vv2. */
for (let i = 0; i < out.length; i++) {
  out[i] = out[i].split("\n").flatMap((l) => {
    if (/^\.vv2 \.wb-(i|i svg|t|h|h b|s|g|g span|b|b:hover) \{/.test(l)) return [];
    if (l.startsWith(".vv2 .wb { display:flex")) return [".vv2 .wb { margin:30px 0 0 }"];
    if (l.startsWith(".vv2 .wb { margin-top:44px!important;")) return [".vv2 .wb { margin-top:44px!important }"];
    return [l];
  }).join("\n");
}
const allText = out.join("\n");
for (const k of kf) if (new RegExp(`\\b${k.name}\\b`).test(allText)) out.push(k.text);
writeFileSync(outPath, out.join("\n") + "\n");
console.log(`wrote ${kept.length - dropped} rules (${dropped} shell-only dropped), ${kf.filter((k) => new RegExp(`\\b${k.name}\\b`).test(allText)).length} keyframes`);
