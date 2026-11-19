#!/usr/bin/env node
/**
 * Consistency audit v1 — inventory.json: the Step 0 recon written down.
 *
 *   node audits/consistency-v1/inventory.mjs <runDir> <scan.json> <recon.json>
 *
 * Pages (from routes.json and the run), the shared inventory (tokens and primitives, read from the code),
 * the audit-only files and the branches that own them, and the baselines (recon.json, written by hand at Step 0).
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const [RUN, SCAN, RECON] = process.argv.slice(2).map((p) => resolve(p));
const routes = JSON.parse(readFileSync(resolve(ROOT, "audits/consistency-v1/routes.json"), "utf8"));
const rt = JSON.parse(readFileSync(resolve(RUN, "inventory.runtime.json"), "utf8"));
const scan = JSON.parse(readFileSync(SCAN, "utf8"));
const recon = JSON.parse(readFileSync(RECON, "utf8"));

/* tokens by kind, from the shared token files */
const tokens = { colour: [], type: [], spacing: [], radius: [], shadow: [], other: 0 };
const src = readFileSync(resolve(ROOT, "src/index.css"), "utf8").split("\n");
src.forEach((l, i) => {
  for (const m of l.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
    const [name, v] = [m[1], m[2].trim()];
    const at = `src/index.css:${i + 1}`;
    if (/^--font|font|-serif|-sans|-mono|-body$/.test(name) && /["',]|serif|sans|mono/.test(v)) tokens.type.push({ name, value: v, at });
    else if (/^--r-|radius/.test(name)) tokens.radius.push({ name, value: v, at });
    else if (/shadow|^--sh-/.test(name) || /\d+px \d+px \d+px/.test(v)) tokens.shadow.push({ name, value: v, at });
    else if (/gap|gut|pad|space|^--sp-/.test(name) && /^\d+px$/.test(v)) tokens.spacing.push({ name, value: v, at });
    else if (/^#|rgba?\(|hsla?\(/.test(v)) tokens.colour.push({ name, value: v, at });
    else tokens.other++;
  }
});
const ts = readFileSync(resolve(ROOT, "src/lib/designTokens.ts"), "utf8").split("\n");
ts.forEach((l, i) => { const m = /export const (\w+)\s*=\s*["']([^"']+)["']/.exec(l); if (m) (/^#|rgba?\(/.test(m[2]) ? tokens.colour : /px .*rgba/.test(m[2]) ? tokens.shadow : tokens.colour).push({ name: m[1], value: m[2], at: `src/lib/designTokens.ts:${i + 1}` }); });

const prim = (name, file, note) => ({ name, file, exists: existsSync(resolve(ROOT, file)), note });
const primitives = [
  prim("MountCard", "src/components/MountCard.tsx", "parchment card + inset frame (insetBorder, src/lib/designTokens.ts); identified at runtime by its aria-hidden absolute inset-6 radius-10 frame"),
  prim("StatusDot", "src/components/StatusDot.tsx", "the only drawing of a query's status (CLAUDE.md)"),
  prim("WorkspaceNavyHeader", "src/components/shell/WorkspaceNavyHeader.tsx", "shared navy header; styles src/components/shell/wsnh.css; probes data-wsnh"),
  prim("PageHeader", "src/components/shell/PageHeader.tsx", ""),
  prim("PanelHeader", "src/components/shell/PanelHeader.tsx", ""),
  prim("SlimBar", "src/components/shell/SlimBar.tsx", ""),
  prim("SidePanel (drawer shell)", "src/components/shell/SidePanel.tsx", "aside.spanel — Log a query and the query card open in it"),
  prim("SlideOver", "src/components/shared/SlideOver.tsx", ""),
  prim("HalfDrawer", "src/components/shell/HalfDrawer.tsx", ""),
  prim("MobileSheet", "src/components/shell/MobileSheet.tsx", "phone only — out of scope"),
  prim("EmptyPanel", "src/components/shell/EmptyPanel.tsx", ""),
  prim("ToolbarButton", "src/components/shared/ToolbarButton.tsx", "the one shared button component found; most buttons are page-local classes"),
  prim("SegmentedToggle", "src/components/forms/SegmentedToggle.tsx", ""),
  prim("BrandInput / BrandDropdown / BrandDatePicker", "src/components/forms/BrandInput.tsx", "src/components/forms/"),
  prim("ToastProvider", "src/components/toast/ToastProvider.tsx", ""),
  prim("SearchPalette", "src/components/shell/SearchPalette.tsx", ""),
  prim("AppFooter", "src/components/shell/AppFooter.tsx", ""),
];

const pages = routes.routes.map((r) => {
  const key = r.key || r.path.replace(/^\/#?\/?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "root";
  const m = rt.measured.filter((x) => x.key === key);
  const failed = rt.failed.filter((x) => x.key === key);
  const redir = rt.redirected.find((x) => x.key === key);
  return { path: r.path, name: r.name || r.path, family: r.family, signedOut: !!r.signedOut, measuredAt: m.map((x) => x.vw), failed: failed.map((x) => `${x.vw}: ${x.why}`), redirectedTo: redir?.finalUrl || null, header: m[0]?.header || null, seededData: !r.signedOut, emptyState: "not reached — the harness account is populated; no route shows its empty state with it" };
});

writeFileSync(resolve(ROOT, "audits/consistency-v1/inventory.json"), JSON.stringify({
  generated: new Date().toISOString(),
  base: recon.base,
  auditOnly: recon.auditOnly,
  baselines: recon.baselines,
  pages,
  overlays: routes.overlays.map((o) => ({ ...o, measured: rt.measured.some((x) => x.key === `overlay-${o.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`), failed: rt.failed.filter((x) => x.path === o.from && x.key.includes(o.name.replace(/[^a-z0-9]+/gi, "-"))).map((x) => `${x.vw}: ${x.why}`) })),
  shared: {
    tokenFiles: ["src/index.css (@theme, :root, theme scopes .t-capp/.t-bold/.t-edn/.t-f12)", "src/lib/designTokens.ts", "src/styles/motion.css"],
    counts: { colour: tokens.colour.length, type: tokens.type.length, spacing: tokens.spacing.length, radius: tokens.radius.length, shadow: tokens.shadow.length, otherDefinitions: tokens.other },
    notes: [
      "The navy of the headers and primary buttons (#2a3a52) has no token: it is a literal in 193 source files (grep -rli 2a3a52 src, 18 Nov). The shell's navy is a token (--ink-shell #1b2433, src/index.css:212).",
      "There is no type-size token scale (no --fs-*/--text-* in src/index.css); font sizes are literals in each page stylesheet.",
      "Radius tokens exist (--r-sm 6, --r-md 9, --r-lg 12, --r-xl 16, src/index.css:1242) but are declared inside the .t-f12 theme scope (opened at line 1157), so they resolve only under it.",
      "Spacing has no 8-point token set; gaps are literals.",
    ],
    tokens,
    primitives,
  },
  staticScan: { scanned: scan.scanned, counts: scan.counts, distinctColours: scan.distinctColours, nearDuplicatePairs: scan.nearDuplicateColours.count },
  runtime: { run: rt.run, groups: rt.populations.length, singlePageGroups: rt.singlePageGroups, populations: rt.populations },
}, null, 1));
console.log(`[inventory] ${pages.length} pages · ${primitives.length} primitives · tokens ${JSON.stringify({ colour: tokens.colour.length, type: tokens.type.length, radius: tokens.radius.length, shadow: tokens.shadow.length, spacing: tokens.spacing.length })}`);
