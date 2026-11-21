/**
 * Consistency audit v2 — Phase 1 analysis. Reads a run of audit2.measure.ts (CA2_MODE=audit) and writes
 * audits/consistency-v2/findings.json and summary.md.
 *
 *   node audits/consistency-v2/analyse2.mjs <run dir> [--base <sha>]
 *
 * A finding is one role inside one family drawn more than one way: its records (both widths, every page and state
 * in the family) do not share one set of measured values. Each variant lists its values, how many instances, which
 * pages, and one example (text per the public-repo rule, textsafe.mjs). Shell-scope records are left out (the
 * shell is one component); surfaces and the page header are kept. Elements no role claimed are listed, never
 * grouped.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { safeText } from "./textsafe.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const RUN = resolve(process.argv[2]);
const BASE = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "";
const FAMILIES = ["workspace", "dashboard", "non-workspace", "onboarding", "public", "overlays"];
const V1_COUNT = 144;

const log = JSON.parse(readFileSync(resolve(RUN, "_log.json"), "utf8"));
const views = readdirSync(RUN).filter((f) => /@\d+\.json$/.test(f)).map((f) => JSON.parse(readFileSync(resolve(RUN, f), "utf8"))).filter((v) => v.records).map((v) => (v.family === "workspace" && /^\/dashboard/.test(v.finalUrl || "") ? { ...v, family: "dashboard", redirected: true } : v));

/* ── group ─────────────────────────────────────────────────────────────────────────────────────── */
const groups = {};
const unclassified = [];
const pagesByFam = {};
for (const v of views) {
  (pagesByFam[v.family] = pagesByFam[v.family] || new Set()).add(v.key);
  for (const r of v.records) {
    if (r.scope === "shell" && !r.role.startsWith("surfaces/")) continue;
    const k = `${r.role}§${v.family}`;
    const g = (groups[k] = groups[k] || { role: r.role, family: v.family, variants: {} });
    /* an element's fill is its own: a colour that only shows through from behind is not part of its style */
    const sig = { ...r.sig }; if (sig.bgFrom && sig.bgFrom !== "own" && !r.role.startsWith("surfaces/")) sig.bg = "none"; delete sig.bgFrom;
    /* the header's own selectors and its content-driven height are not part of how it is drawn; a StatusDot is its size and ink */
    if (r.role.startsWith("surfaces/page-header")) { delete sig.sel; delete sig.belowSel; delete sig.height; if (sig.title) { const { sel: _s, ...tt } = sig.title; sig.title = tt; } }
    if (r.role === "marks/statusdot") { for (const k of Object.keys(sig)) if (!["width", "height", "color"].includes(k)) delete sig[k]; }
    const vk = JSON.stringify(sig);
    const vv = (g.variants[vk] = g.variants[vk] || { values: sig, n: 0, pages: new Set(), widths: new Set(), example: null });
    vv.n++; vv.pages.add(v.key); vv.widths.add(v.vw);
    if (!vv.example) vv.example = { page: v.key, vw: v.vw, sel: r.sel, text: safeText(r.text, r.role) };
  }
  for (const u of v.unclassified || []) unclassified.push({ page: v.key, vw: v.vw, family: v.family, kind: u.kind, sel: u.sel, why: u.why, text: safeText(u.text, "unclassified") });
}

const findings = [];
const roleFam = {};
for (const g of Object.values(groups)) {
  const vs = Object.values(g.variants).sort((a, b) => b.n - a.n);
  const rf = (roleFam[g.role] = roleFam[g.role] || {});
  rf[g.family] = { instances: vs.reduce((s, x) => s + x.n, 0), variants: vs.length };
  if (vs.length < 2) continue;
  const keys = [...new Set(vs.flatMap((x) => Object.keys(x.values)))];
  const differ = keys.filter((k) => new Set(vs.map((x) => JSON.stringify(x.values[k]))).size > 1);
  findings.push({
    role: g.role, family: g.family, variantCount: vs.length, instances: rf[g.family].instances,
    pages: [...new Set(vs.flatMap((x) => [...x.pages]))].sort(), differ,
    variants: vs.map((x) => ({ values: x.values, n: x.n, pages: [...x.pages].sort(), widths: [...x.widths].sort(), example: x.example })),
  });
}
findings.sort((a, b) => a.role.localeCompare(b.role) || FAMILIES.indexOf(a.family) - FAMILIES.indexOf(b.family));
findings.forEach((f, i) => (f.id = `F${String(i + 1).padStart(3, "0")}`));

/* the unclassified list, one line per selector */
const uMap = {};
for (const u of unclassified) { const k = `${u.kind}§${u.sel}`; const e = (uMap[k] = uMap[k] || { kind: u.kind, sel: u.sel, why: u.why, n: 0, pages: new Set(), text: u.text }); e.n++; e.pages.add(u.page); }
const uList = Object.values(uMap).map((e) => ({ ...e, pages: [...e.pages].sort() })).sort((a, b) => b.n - a.n);

/* every group has members: the proof, per role */
const empty = Object.entries(roleFam).filter(([, fams]) => Object.values(fams).every((x) => !x.instances)).map(([r]) => r);
const rolesInMap = JSON.parse(readFileSync(resolve(HERE, "roles.json"), "utf8")).roles.map((r) => r.role);
const neverSeen = rolesInMap.filter((r) => !roleFam[r] && !/^(surfaces\/page-header|cards\/part-of)/.test(r));

const failed = log.filter((e) => e.failed).map((e) => ({ page: e.key, vw: e.vw, why: e.failed }));
const measured = log.filter((e) => !e.failed && e.records);
const out = {
  generated: new Date().toISOString(), base: BASE, run: RUN.replace(/^\/Users\/[^/]+/, "~"),
  viewports: [...new Set(views.map((v) => v.vw))].sort(),
  measured: measured.map((e) => ({ page: e.key, vw: e.vw, family: e.family, state: e.state || "default", records: e.records })),
  failed,
  counts: {
    findings: findings.length, v1: V1_COUNT,
    byFamily: Object.fromEntries(FAMILIES.map((f) => [f, findings.filter((x) => x.family === f).length])),
    byGroup: Object.fromEntries([...new Set(findings.map((f) => f.role.split("/")[0]))].map((g) => [g, findings.filter((f) => f.role.startsWith(g + "/")).length])),
    unclassifiedInstances: unclassified.length, unclassifiedSelectors: uList.length,
  },
  rolesWithMembers: roleFam, rolesNeverSeen: neverSeen, rolesEmpty: empty,
  findings, unclassified: uList,
};
writeFileSync(resolve(HERE, "findings.json"), JSON.stringify(out, null, 1));

/* ── summary.md ────────────────────────────────────────────────────────────────────────────────── */
const roles = [...new Set(findings.map((f) => f.role))].sort();
const L = [];
L.push("# Consistency audit v2 — summary", "");
L.push(`Generated ${out.generated}${BASE ? ` on ${BASE}` : ""}. Widths ${out.viewports.join(" and ")}. Data: \`findings.json\` (this folder).`, "");
L.push(`**${findings.length} findings** (a role inside one family drawn more than one way), against v1's ${V1_COUNT}. v1 grouped by look (a dark fill was a "primary" button), so a selected pill, a to-do row and a header button all counted as one button; v2 groups by an explicit role map (\`roles.json\`). The two counts measure different things: v2's is per role per family.`, "");
L.push(`**${uList.length} unclassified selectors** (${unclassified.length} instances) — candidates no role in the map claims, listed below, not grouped.`, "");
L.push("## Findings by role and family", "", `| Role | ${FAMILIES.join(" | ")} | Total |`, `|---|${FAMILIES.map(() => "---").join("|")}|---|`);
for (const r of roles) L.push(`| ${r} | ${FAMILIES.map((f) => { const x = findings.find((y) => y.role === r && y.family === f); return x ? `${x.variantCount} ways` : ""; }).join(" | ")} | ${findings.filter((y) => y.role === r).length} |`);
L.push(`| **Findings** | ${FAMILIES.map((f) => out.counts.byFamily[f]).join(" | ")} | **${findings.length}** |`, "");
L.push("## Pages and states", "", `Measured: ${measured.length} page-views.`, "");
L.push(...measured.map((e) => `- ${e.key} @${e.vw} (${e.family}, ${e.state || "default"}) — ${e.records} records`));
L.push("", failed.length ? "Failed (not skipped):" : "Nothing failed to load.", ...failed.map((f) => `- **${f.page} @${f.vw}** — ${f.why}`), "");
if (neverSeen.length) L.push("Roles in the map with no member on any page (so no finding can be made about them):", "", ...neverSeen.map((r) => `- ${r}`), "");
L.push("## Unclassified", "", "| Kind | Selector | Instances | Pages | Example |", "|---|---|---|---|---|");
for (const u of uList) L.push(`| ${u.kind} | \`${u.sel.replace(/\|/g, "\\|")}\` | ${u.n} | ${u.pages.slice(0, 4).join(", ")}${u.pages.length > 4 ? ` +${u.pages.length - 4}` : ""} | ${u.text || ""}${u.why ? ` (${u.why})` : ""} |`);
writeFileSync(resolve(HERE, "summary.md"), L.join("\n") + "\n");
console.log(`findings ${findings.length} (v1 ${V1_COUNT}) · unclassified ${uList.length} selectors / ${unclassified.length} instances · failed ${failed.length} · roles never seen ${neverSeen.length}`);
console.log(JSON.stringify(out.counts));
