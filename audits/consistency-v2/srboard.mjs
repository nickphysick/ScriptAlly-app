/**
 * Main green v1, Part 3 — builds audits/consistency-v2/board-data-spacing-rows.json from a harness run made with
 * CA_SR=1 (srprobe.js, read by audit2.measure.ts). Reads only the run folder and src/**\/*.css.
 *
 *   node audits/consistency-v2/srboard.mjs <run dir> [out file]
 *
 * Spacing: workspace pages, the Dashboard and slide-out panels (the run's "workspace", "dashboard" and "overlays"
 * families). List rows: every family except the public pages. Account text never reaches the file: a row's or
 * header's own text is kept only when it is fixed interface copy (ROW_KINDS says which); otherwise "[data]".
 */
import { readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { join, resolve, relative } from "node:path";

const RUN = resolve(process.argv[2] || "audits/consistency-v2/.run");
const OUT = resolve(process.argv[3] || "audits/consistency-v2/board-data-spacing-rows.json");
const ROOT = process.cwd();
const SPACING_FAMILIES = new Set(["workspace", "dashboard", "overlays"]);

/* A page-gutter reading is the sheet's edge to the outermost content on each side. When the two sides
   differ, one of them is not a gutter, and the value says why in words (hand check, main-green v1). */
function gutterNote(value) {
  const [l, r] = String(value).split(" ").map(Number);
  if (l === r) return {};
  if (l < 0 || r < 0) return { note: "Not a gutter on either side: a carousel's off-screen cards run past the sheet's edge, so neither reading is the page's gutter." };
  return { note: `Not a gutter on the ${l > r ? "left" : "right"}: the outermost content stops short of that side (a narrow column or a single card), so only the ${l > r ? "right" : "left"} side, ${Math.min(l, r)}, is the page's gutter.` };
}

/* Hand checks (main-green v1, 23 Nov): three values each for two spacing groups and two row kinds, checked
   against the CSS that sets them, the raw rectangles and the crop. Each line says what was compared. */
const HAND_CHECKS = [
  { group: "page-gutter", value: "32 32 @1512", result: "agrees", how: "the sheet is 1424 wide, under --work-max 1660 (src/index.css:315), so the gap is --work-gutter, 32 (src/index.css:318), set by .wpg-scroll > * (src/components/shell/workspacePageGrid.css:489)." },
  { group: "page-gutter", value: "118 118 @1920", result: "agrees", how: "the sheet is 1832 wide; (1832 − 1660) / 2 = 86 of centring margin, plus the 32 gutter, is 118." },
  { group: "page-gutter", value: "32 632 @1512", result: "agrees as geometry, but not a gutter", how: "on Versions (empty) the only content is one 760px card in the left column: 1424 − 32 − 760 = 632. The left side is the gutter; the value now carries a note saying so (likewise 32 332, and the carousel's negative readings on Responses)." },
  { group: "panel-body-padding", value: "20 20 12 20", result: "agrees", how: ".laq .laq-sb { padding: 20px 20px 12px } (src/components/queries/centre/qcLogStages.css:89)." },
  { group: "panel-body-padding", value: "6 16 6 16", result: "agrees", how: ".qc152 .qc1522-cb { padding: 6px 16px } (src/components/queries/centre/qcv1522card.css:55)." },
  { group: "panel-body-padding", value: "6 10 14 10", result: "agrees", how: ".qcrr-body { padding: 6px 10px 14px } (src/components/queries/centre/qcWhoReplied.css:10)." },
  { rowKind: "Record a response picker rows", value: "58 high, padding 8 10, radius 12", result: "agrees", how: "min-height: 58px; padding: 8px 10px; border-radius: 12px (src/components/queries/centre/qcWhoReplied.css:20)." },
  { rowKind: "Record a response picker rows", value: "hover and selected #f7f3ee", result: "agrees", how: ".qcrr-row:hover, .qcrr-row.hi (qcWhoReplied.css:21); the selected row is the aria-selected keyboard highlight (QcWhoReplied.tsx:98), on the same ground as hover." },
  { rowKind: "Record a response picker rows", value: "primary Source Serif 4 16/500, secondary 13.5/400 grey", result: "agrees after a probe fix", how: "the first reading took the avatar disc's initials as secondary; the probe now reads words in order and skips initials, stars and text on its own filled ground (srprobe.js). The crop shows the name over the agency and date line." },
  { rowKind: "Contact list rows", value: "72 high, padding 10 0, 1px rule at 8%", result: "agrees after a builder fix", how: "min-height: 72px; padding: 10px 0 (src/components/agents/contact/contactV26.css:114); the rule is .cl26-row + .cl26-row { border-top } (:118), so a run's first row has none of its own and now takes its next row's (srboard.mjs)." },
  { rowKind: "Contact list rows", value: "hover #fbf9f6", result: "agrees", how: ".cl26-row:hover (contactV26.css:119)." },
  { rowKind: "Contact list rows", value: "primary Special Elite 18/1.3 #1c130f, secondary Source Serif 4 14/1.35 #5b4f47", result: "agrees after a probe fix", how: "contactV26.css:124 and contactPrinciples.css:31; line heights 23.4 and 18.9 match. The first reading took the star rating as primary." },
];

/* ── the views and their families ── */
const files = readdirSync(RUN);
const family = {};
const routed = {}; /* key → { path, finalUrl } */
for (const f of files) {
  const m = /^(.+)@(1512|1920)\.json$/.exec(f); if (!m) continue;
  try { const d = JSON.parse(readFileSync(join(RUN, f), "utf8")); family[m[1]] = d.family; routed[m[1]] = { path: d.path, finalUrl: d.finalUrl }; } catch { /* unreadable view: skipped */ }
}
/* a route that redirects onto another measured view (the phone-only /you, /goals, /materials land on
   /dashboard on desktop) measures that view again; counting it would count the same page twice */
const measuredPaths = new Set(Object.values(routed).filter((r) => r.path === r.finalUrl).map((r) => r.path));
const redirected = new Set(Object.entries(routed).filter(([, r]) => r.finalUrl && r.path && r.finalUrl !== r.path && !r.path.includes("?") && measuredPaths.has(r.finalUrl)).map(([k]) => k));
const sr = [];
for (const f of files) {
  const m = /^(.+)@sr-(\d+)\.json$/.exec(f); if (!m) continue;
  if (redirected.has(m[1])) continue;
  const d = JSON.parse(readFileSync(join(RUN, f), "utf8"));
  if (d.error) { sr.push({ key: m[1], vw: +m[2], error: d.error }); continue; }
  sr.push({ key: m[1], vw: +m[2], fam: family[m[1]] || "unknown", ...d });
}

/* ── selector text → source file and line ── */
const cssFiles = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) walk(p); else if (/\.css$/.test(n)) cssFiles.push(p); } })(join(ROOT, "src"));
const norm = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([>+~,])\s*/g, "$1").replace(/::?(before|after)/g, ":$1").trim();
const index = new Map();
for (const f of cssFiles) {
  const text = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(text))) {
    const line = text.slice(0, m.index + m[1].search(/\S/)).split("\n").length;
    for (const one of norm(m[1]).split(",")) {
      if (!one || one.startsWith("@")) continue;
      if (!index.has(one)) index.set(one, []);
      index.get(one).push({ file: relative(ROOT, f), line, body: m[2] });
    }
  }
}
const whereSet = (rule) => {
  if (!rule) return null;
  if (rule.inline) return `inline style (${rule.prop}: ${rule.value})`;
  const hits = [];
  for (const one of norm(rule.sel).split(",")) for (const h of index.get(one) || []) if (new RegExp(`(^|[;\\s{])${rule.prop.replace(/-/g, "\\-")}\\s*:`).test(h.body)) hits.push(`${h.file}:${h.line}`);
  return hits.length ? [...new Set(hits)].join(", ") : `${rule.sel} { ${rule.prop}: ${rule.value} } (selector not found in src/**/*.css)`;
};

const onGrid = (v) => {
  const parts = String(v).split(" ").map(Number);
  return parts.every((x) => x >= 0 && x % 8 === 0); /* a multiple of 8 (64, 96 included); a negative reading is never on it */
};

/* ── spacing ── */
const GROUPS = [
  ["section-gap", "1. Section to section in a page's main column (a section: a block with its own section heading, or a framed card alone in the column)"],
  ["section-heading-gap", "2. A section heading to the first thing under it"],
  ["card-gap", "3. Card to card in one grid or stack (across: side by side; down: stacked)"],
  ["framed-inner-padding", "4. Padding inside a framed card's inner frame (top right bottom left)"],
  ["card-heading-gap", "5. A card heading to the first thing under it"],
  ["panel-body-padding", "6a. Padding inside a slide-out panel's body (top right bottom left)"],
  ["panel-field-gap", "6b. Field to field in a slide-out panel: the bottom of one field's control to the next field's label (pitch = label top to label top)"],
  ["page-gutter", "7. The page's left and right gutters (sheet edge to content edge), per width"],
];
const spacing = [];
for (const [g, what] of GROUPS) {
  const subs = g === "card-gap" ? ["across", "down"] : g === "page-gutter" ? ["1512", "1920"] : [null];
  for (const sub of subs) {
    const vals = new Map(); let total = 0; const pages = new Set();
    for (const v of sr) {
      if (v.error || !SPACING_FAMILIES.has(v.fam)) continue;
      /* an overlay view's page behind the panel is the page's own view, measured there: only the panel counts here */
      for (const it of v.spacing.filter((x) => x.group === g && (v.fam !== "overlays" || x.scope === "panel") && (sub === null || (g === "card-gap" ? x.axis === sub : String(v.vw) === sub)))) {
        const k = String(it.value);
        if (!vals.has(k)) vals.set(k, { value: it.value, count: 0, pages: new Set(), widths: new Set(), scopes: new Set(), setBy: new Map(), crop: null, example: null, pitch: new Set() });
        const e = vals.get(k); e.count++; total++; e.pages.add(v.key); pages.add(v.key); e.widths.add(v.vw); e.scopes.add(it.scope);
        if (it.pitch != null) e.pitch.add(it.pitch);
        if (!e.example) e.example = { page: v.key, vw: v.vw, a: it.a, b: it.b || null, line: it.line || null, first: it.first || null, grid: it.grid || null, panel: it.panel || null, ...(it.subtitle ? { subtitle: it.subtitle } : {}), ...(it.boxGap != null ? { boxGap: it.boxGap } : {}), ...(it.cssPadding ? { cssPadding: it.cssPadding } : {}), ...(it.band ? { bandAbove: it.band } : {}) };
        for (const s of it.src || []) { if (!s.rule) continue; const w = `${s.prop} ← ${whereSet(s.rule)}`; e.setBy.set(w, (e.setBy.get(w) || 0) + 1); }
        if (!e.crop && it.crop) e.crop = it.crop;
      }
    }
    const list = [...vals.values()].sort((a, b) => b.count - a.count).map((e) => ({
      value: e.value, count: e.count, onGrid: onGrid(e.value), pages: [...e.pages].sort(), widths: [...e.widths].sort(), scopes: [...e.scopes].sort(),
      setBy: [...e.setBy.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 6), ...(e.pitch.size ? { pitch: [...e.pitch].sort((a, b) => a - b) } : {}),
      example: e.example, crop: e.crop, ...(g === "page-gutter" ? gutterNote(e.value) : {}),
    }));
    const offGrid = list.filter((x) => !x.onGrid).length;
    spacing.push({
      group: sub ? `${g}:${sub}` : g, what, distinctValues: list.length, occurrences: total, pages: pages.size,
      summary: `${list.length} different value${list.length === 1 ? "" : "s"} across ${pages.size} page${pages.size === 1 ? "" : "s"} (${total} measured); ${list.length - offGrid} on the 8-point grid, ${offGrid} off it${list[0] ? `; the commonest is ${list[0].value} (${list[0].count}×)` : ""}.`,
      values: list,
    });
  }
}

/* ── list rows, grouped by the job they do ── */
/* [kind, test(view key, row selector, list selector)] — first match wins; ROW_COPY lists the kinds whose row text is fixed copy */
const ROW_KINDS = [
  ["search palette results", (k, s, l) => /^overlay-.*(search|Search|palette|K)/.test(k) || /(srch|sv1-|cmdk|palette)/.test(s + l)],
  ["Log a query picker rows", (k) => /^journey-laq|^overlay-Log-a-query/.test(k)],
  ["Materials letters rows", (k) => /^materials-letters/.test(k)],
  ["Record a response picker rows", (k, s) => /^journey-rr|Record-a-response/.test(k) || /qcrr/.test(s)],
  ["Settings rows", (k) => /^account-/.test(k)],
  ["Contact list rows", (k) => /^agents($|-empty|-all)/.test(k)],
  ["Discover rows", (k) => /^agents-discover/.test(k)],
  ["To-do tray rows", (k) => /^todo/.test(k)],
  ["Comps shelf rows", (k) => /^manuscripts-comps/.test(k)],
  ["Queries list rows", (k) => /^queries($|-empty|-all)/.test(k)],
  ["Responses rows", (k) => /^queries-responses|responses/.test(k)],
  ["Packages rows", (k) => /packages/.test(k)],
  ["Manuscripts and versions rows", (k) => /^manuscripts/.test(k)],
  ["Dashboard rows", (k) => /^dashboard/.test(k)],
  ["Analytics rows", (k) => /analytics/.test(k)],
  ["Agent card rows", (k) => /Agent-card/.test(k)],
  ["Query card rows", (k) => /Query-card/.test(k)],
];
const ROW_COPY = new Set(["Settings rows"]);
const kindOf = (k, s, l) => (ROW_KINDS.find(([, t]) => t(k, s || "", l || "")) || [`other rows (${k})`])[0];
const fontKey = (f) => (f ? `${f.font} ${f.size}/${f.weight} ${f.color}` : null);
const kinds = new Map();
for (const v of sr) {
  if (v.error || v.fam === "public") continue;
  /* rows of the page behind an overlay are that page's; query cards are rows only on the Queries pages */
  /* a rule drawn as \`.row + .row { border-top }\` leaves the first row of each run with no border of its own,
     though the line under it (the next row's) is the same: that row takes its next row's separator */
  const inOrder = v.rows.map((r, i, all) => { const n = all[i + 1]; return r.divider === "nothing" && n && n.list === r.list && /^border-top/.test(n.divider || "") ? { ...r, divider: n.divider, style: { ...r.style, divider: n.divider } } : r; });
  const ordered = inOrder.filter((r) => (v.fam !== "overlays" || r.scope === "panel") && (r.role !== "cards/query-card" || /^queries($|-empty|-all)/.test(v.key))).sort((a, b) => (a.divider == null) - (b.divider == null));
  for (const r of ordered) {
    const kind = kindOf(v.key, r.sel, r.list);
    if (!kinds.has(kind)) kinds.set(kind, { styles: new Map(), pages: new Set(), rows: 0, headers: new Map() });
    const K = kinds.get(kind); K.pages.add(v.key); K.rows++;
    const s = r.style;
    const base = { h: s.height, min: s.minHeight, pad: s.padding, bg: s.bg, img: s.bgImage, r: s.radius, p: fontKey(s.primary), s2: fontKey(s.secondary), sel: r.selected };
    /* a last row (no next row, no rule of its own) takes the separator of a sibling style that matches it in every other way */
    let sig = JSON.stringify({ ...base, div: s.divider });
    if (s.divider == null) { const twin = [...K.styles.keys()].find((k) => { const o = JSON.parse(k); const { div, ...rest } = o; return JSON.stringify(rest) === JSON.stringify(base); }); if (twin) sig = twin; }
    if (!K.styles.has(sig)) K.styles.set(sig, { height: s.height, minHeight: s.minHeight, padding: s.padding, divider: r.divider ? r.divider.replace(/^gap (\d+)$/, "gap $1") : null, ground: { rest: r.selected ? null : s.bg, hover: null, selected: r.selected ? s.bg : null }, bgImage: s.bgImage, radius: s.radius, primary: fontKey(s.primary), secondary: fontKey(s.secondary), selector: r.sel, count: 0, pages: new Set(), widths: new Set(), example: null, crop: null });
    const S = K.styles.get(sig); S.count++; S.pages.add(v.key); S.widths.add(v.vw);
    if (!S.example) S.example = { page: v.key, vw: v.vw, text: ROW_COPY.has(kind) && !/\d/.test(r.text || "") ? r.text : "[data]" /* a figure or date in a Settings row is the account's */ };
    if (r.hover && !S.ground.hover) S.ground.hover = r.hover;
    if (r.crop && !S.crop) S.crop = r.crop;
  }
  for (const h of (v.headers || []).filter((h) => v.fam !== "overlays" || h.scope === "panel")) {
    /* a header belongs to the kind of the rows on its page (the first kind seen there) */
    const kind = [...kinds.entries()].find(([, K]) => K.pages.has(v.key))?.[0] || kindOf(v.key, h.sel, "");
    if (!kinds.has(kind)) kinds.set(kind, { styles: new Map(), pages: new Set(), rows: 0, headers: new Map() });
    const sig = JSON.stringify({ role: h.role, h: h.height, pad: h.padding, bg: h.bg, t: fontKey(h.type), b: h.border });
    const H = kinds.get(kind).headers;
    if (!H.has(sig)) H.set(sig, { kind: h.role.replace("lists/", ""), height: h.height, padding: h.padding, ground: h.bg, rule: h.border, type: fontKey(h.type), selector: h.sel, count: 0, pages: new Set() });
    const X = H.get(sig); X.count++; X.pages.add(v.key);
  }
}
const rows = [...kinds.entries()].filter(([, K]) => K.rows > 0 || K.headers.size > 0).sort((a, b) => b[1].rows - a[1].rows).map(([kind, K]) => {
  const styles = [...K.styles.values()].sort((a, b) => b.count - a.count).map((s) => ({ ...s, pages: [...s.pages].sort(), widths: [...s.widths].sort() }));
  const headers = [...K.headers.values()].sort((a, b) => b.count - a.count).map((h) => ({ ...h, pages: [...h.pages].sort() }));
  const heights = new Set(styles.map((s) => s.height)), dividers = new Set(styles.map((s) => s.divider)), types = new Set(styles.map((s) => s.primary));
  return {
    kind, rowsMeasured: K.rows, pages: [...K.pages].sort(), distinctStyles: styles.length,
    summary: `${styles.length} different row style${styles.length === 1 ? "" : "s"} across ${K.pages.size} page${K.pages.size === 1 ? "" : "s"} (${K.rows} rows): ${heights.size} height${heights.size === 1 ? "" : "s"}, ${dividers.size} kind${dividers.size === 1 ? "" : "s"} of separator, ${types.size} primary type${types.size === 1 ? "" : "s"}; ${headers.length} header style${headers.length === 1 ? "" : "s"}.`,
    styles, headers,
  };
});

const crops = [...new Set([...spacing.flatMap((g) => g.values.map((v) => v.crop)), ...rows.flatMap((k) => k.styles.map((s) => s.crop))].filter(Boolean))].sort();
const out = {
  about: "Main green v1, Part 3 — spacing and list rows, measured (no app code changed). Made by audits/consistency-v2/srboard.mjs from a harness run with CA_SR=1 (srprobe.js). Spacing covers workspace pages, the Dashboard and slide-out panels; rows cover every signed-in surface. Values are CSS px at 1512×982 and 1920×1080. `setBy` is the rule that declares the value (CDP), matched to src/**/*.css by its selector; `onGrid` means every part is a multiple of 8 (0 included). A gutter value whose two sides differ carries a `note` saying which side is not a gutter. A row's text is kept only when it is fixed interface copy; anything from the account is [data]. Crops (real size, one per distinct value or style) are in /Users/nickphysick/ScriptAlly-backups/main-green-v1/crops/.",
  run: relative(ROOT, RUN) || RUN, views: new Set(sr.map((v) => v.key)).size, readings: sr.length, probeErrors: sr.filter((v) => v.error).map((v) => `${v.key}@${v.vw}: ${v.error}`),
  handChecks: HAND_CHECKS,
  skippedRedirects: [...redirected].sort().map((k) => `${k}: ${routed[k].path} lands on ${routed[k].finalUrl}, measured as its own view`),
  spacing, rows, crops,
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${relative(ROOT, OUT)}: ${out.views} views, ${out.readings} readings, ${out.probeErrors.length} probe errors, ${crops.length} crops`);
for (const g of spacing) console.log(`  ${g.group}: ${g.summary}`);
for (const k of rows) console.log(`  ${k.kind}: ${k.summary}`);
