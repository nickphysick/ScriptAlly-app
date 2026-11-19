#!/usr/bin/env node
/**
 * Consistency fixes v1 — judge every fix, before against after.
 *
 *   node audits/consistency-fixes-v1/compare.mjs <beforeDir> <afterDir> [--out verdicts.json]
 *
 * Per fix (fixes.json), per page, per width, per matched element (paired by order):
 *   - R1: the font-size reached 12; the line count did not grow (no new wrap); nothing is newly clipped or
 *     overlapping; the container (parent box) did not grow by more than 2px either way.
 *   - R2/R3: the fill changed as meant; the box did not move or resize by more than 1px.
 * Then, per page, every OTHER measured record (the audit collector's) is compared: a record is matched by part,
 * role, its own class chain head and its text; any numeric field that moved by more than 1px, or any other field that
 * changed, on an element that is not one of the fixed ones, is listed as collateral.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const [B, A] = process.argv.slice(2, 4).map((p) => resolve(p));
const OUT = process.argv.includes("--out") ? resolve(process.argv[process.argv.indexOf("--out") + 1]) : resolve(A, "verdicts.json");
const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const FIXES = JSON.parse(readFileSync(resolve(ROOT, process.env.CA_FIXES || "audits/consistency-fixes-v1/fixes.json"), "utf8")).fixes;
/* v1.1: a fix may name its mode; without one, the v1 prefix rule (R1 = font, else fill) */
const modeOf = (id, fx) => fx.mode || (id.startsWith("R1") ? "font" : "fill");
const load = (d, f) => (existsSync(resolve(d, f)) ? JSON.parse(readFileSync(resolve(d, f), "utf8")) : null);

const verdicts = {};
for (const [id, fx] of Object.entries(FIXES)) {
  const v = (verdicts[id] = { id, sel: fx.sel, pages: {}, ok: true, reasons: [], measured: 0 });
  for (const page of fx.pages) {
    for (const vw of [1512, 1920]) {
      const b = load(B, `${page}@${vw}.check.json`)?.[id], a = load(A, `${page}@${vw}.check.json`)?.[id];
      if (!b || !a) { v.pages[`${page}@${vw}`] = "not measured in both runs"; continue; }
      const rows = [];
      if (!b.length && !a.length) { v.pages[`${page}@${vw}`] = "no visible element in either run"; continue; }
      for (let i = 0; i < Math.max(b.length, a.length); i++) {
        const x = b[i], y = a[i];
        if (!x || !y) { rows.push({ i, problem: `element count ${b.length} → ${a.length}` }); continue; }
        v.measured++;
        const r = { i, text: y.text, fontSize: `${x.fontSize}→${y.fontSize}`, lines: `${x.lines}→${y.lines}`, box: `${x.box.w}x${x.box.h}→${y.box.w}x${y.box.h}`, parent: x.parent && y.parent ? `${x.parent.w}x${x.parent.h}→${y.parent.w}x${y.parent.h}` : null, problems: [] };
        const mode = modeOf(id, fx);
        const moved = Math.abs(y.box.w - x.box.w) > 1 || Math.abs(y.box.h - x.box.h) > 1 || Math.abs(y.box.x - x.box.x) > 1 || Math.abs(y.box.y - x.box.y) > 1;
        if (mode === "color" || mode === "same") {
          r.color = `${x.color} → ${y.color}`;
          if (mode === "color" && x.color === y.color) r.problems.push("colour unchanged");
          if (mode === "same" && (x.color !== y.color || x.bg !== y.bg || x.text !== y.text && !process.env.CA_TEXT_OK)) r.problems.push(`changed: ${x.color}/${x.bg}/${x.text} → ${y.color}/${y.bg}/${y.text}`);
          if (moved) r.problems.push(`box moved/resized ${JSON.stringify(x.box)} → ${JSON.stringify(y.box)}`);
        } else if (mode === "font") {
          if (y.fontSize < 12) r.problems.push(`still ${y.fontSize}px (another rule wins)`);
          if (y.lines > x.lines) r.problems.push(`wraps: ${x.lines} → ${y.lines} lines`);
          if (y.clipped && !x.clipped) r.problems.push(`clipped: ${y.clipped}`);
          const newOv = (y.overlaps || []).filter((o) => !(x.overlaps || []).includes(o));
          if (newOv.length) r.problems.push(`overlaps ${newOv.join(", ")}`);
          if (x.parent && y.parent && (Math.abs(y.parent.w - x.parent.w) > 2 || Math.abs(y.parent.h - x.parent.h) > 2)) r.problems.push(`container grew ${x.parent.w}x${x.parent.h} → ${y.parent.w}x${y.parent.h}`);
        } else {
          if (x.bg === y.bg && x.shadow === y.shadow) r.problems.push("fill unchanged");
          if (Math.abs(y.box.w - x.box.w) > 1 || Math.abs(y.box.h - x.box.h) > 1 || Math.abs(y.box.x - x.box.x) > 1) r.problems.push(`box moved/resized ${JSON.stringify(x.box)} → ${JSON.stringify(y.box)}`);
          r.fill = `${x.bg} → ${y.bg}`;
        }
        rows.push(r);
      }
      v.pages[`${page}@${vw}`] = rows;
      for (const r of rows) for (const p of r.problems || (r.problem ? [r.problem] : [])) { v.ok = false; v.reasons.push(`${page}@${vw} #${r.i}: ${p}`); }
    }
  }
  if (!v.measured) { v.ok = false; v.reasons.push("never measured on screen"); }
}

/* collateral: every other collector record on the affected pages */
const fixedClasses = new Set(Object.values(FIXES).flatMap((f) => (f.sel.match(/\.[\w-]+/g) || []).map((c) => c.slice(1))));
const isFixed = (r) => (r.cls || []).slice(0, 2).some((level) => level.split(".").slice(1).some((c) => fixedClasses.has(c)));
const pages = [...new Set(Object.values(FIXES).flatMap((f) => f.pages))];
const collateral = {};
for (const page of pages) for (const vw of [1512, 1920]) {
  const b = load(B, `${page}@${vw}.json`), a = load(A, `${page}@${vw}.json`);
  if (!b || !a) continue;
  const key = (r) => `${r.part}|${r.role}|${(r.cls || [])[0]}|${r.text}`;
  const am = new Map();
  for (const r of a.records) { const k = key(r); if (!am.has(k)) am.set(k, []); am.get(k).push(r); }
  const diffs = [];
  const used = new Map();
  for (const r of b.records) {
    if (isFixed(r)) continue;
    const k = key(r); const list = am.get(k) || []; const n = used.get(k) || 0; used.set(k, n + 1);
    const s = list[n];
    if (!s) { diffs.push({ k, change: "gone in after" }); continue; }
    const ch = [];
    for (const f of new Set([...Object.keys(r.sig), ...Object.keys(s.sig)])) {
      const x = r.sig[f], y = s.sig[f];
      if (JSON.stringify(x) === JSON.stringify(y)) continue;
      if (typeof x === "number" && typeof y === "number" && Math.abs(x - y) <= 1) continue;
      ch.push(`${f}: ${JSON.stringify(x)} → ${JSON.stringify(y)}`);
    }
    for (const f of ["x", "y", "w", "h"]) if (Math.abs((r.rect?.[f] ?? 0) - (s.rect?.[f] ?? 0)) > 1) ch.push(`rect.${f}: ${r.rect[f]} → ${s.rect[f]}`);
    if (ch.length) diffs.push({ k, change: ch.join("; ") });
  }
  if (diffs.length) collateral[`${page}@${vw}`] = diffs;
}
writeFileSync(OUT, JSON.stringify({ verdicts, collateral }, null, 1));
for (const v of Object.values(verdicts)) console.log(`${v.ok ? "PASS" : "FAIL"} ${v.id} (${v.measured} measured)${v.ok ? "" : " — " + v.reasons.slice(0, 3).join(" | ")}`);
console.log(`[collateral] ${Object.entries(collateral).map(([k, d]) => `${k}: ${d.length}`).join(" · ") || "none"}`);
