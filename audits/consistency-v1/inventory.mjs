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
import { readTokens } from "./tokens.mjs";

const ROOT = resolve(new URL("../..", import.meta.url).pathname);
const [RUN, SCAN, RECON] = process.argv.slice(2).map((p) => resolve(p));
const routes = JSON.parse(readFileSync(resolve(ROOT, "audits/consistency-v1/routes.json"), "utf8"));
const rt = JSON.parse(readFileSync(resolve(RUN, "inventory.runtime.json"), "utf8"));
const scan = JSON.parse(readFileSync(SCAN, "utf8"));
const recon = JSON.parse(readFileSync(RECON, "utf8"));

/* tokens by kind: every shared declaration (tokens.mjs — :root/@theme in any stylesheet, plus designTokens.ts) */
const TOK = readTokens(ROOT);
const tokens = { colour: [], type: [], spacing: [], radius: [], shadow: [], other: 0 };
for (const t of TOK.shared) {
  const { name, value: v } = t;
  const row = { name, value: v.slice(0, 160), at: `${t.file}:${t.line}`, appWide: t.appWide };
  if (/font|serif|sans|mono/.test(name) && /["',]|serif|sans|mono/.test(v)) tokens.type.push(row);
  else if (/^--r-|radius/i.test(name)) tokens.radius.push(row);
  else if (/shadow|^--sh-/i.test(name) || /\d+px \d+px \d+px/.test(v)) tokens.shadow.push(row);
  else if (/gap|gut|pad|space|^--sp-\d/i.test(name) && /^\d+px$/.test(v)) tokens.spacing.push(row);
  else if (/^#|rgba?\(|hsla?\(/.test(v)) tokens.colour.push(row);
  else tokens.other++;
}
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
    tokenFiles: [...new Set(TOK.shared.map((t) => t.file))].sort(),
    themeScopedInIndexCss: { count: TOK.themeScoped.length, scopes: [...new Set(TOK.themeScoped.map((t) => t.scope))] },
    counts: { colour: tokens.colour.length, type: tokens.type.length, spacing: tokens.spacing.length, radius: tokens.radius.length, shadow: tokens.shadow.length, otherDefinitions: tokens.other },
    notes: [
      "The navy of the headers and primary buttons (#2a3a52) is a token twice over: --sp-anthracite (src/components/shell/primitives.css:125, :root) and shellActiveBg (src/lib/designTokens.ts:143). It is also a literal in 193 source files (grep -rli 2a3a52 src, 19 Nov). The shell's own navy is --ink-shell #1b2433 (src/index.css:212).",
      "Shared tokens are spread across many stylesheets: any custom property declared at :root is global. Page stylesheets declare their own at :root too (--fc-*, --clv-*, --dv1-*); the report prefers an app-wide token (index.css, shell/, designTokens.ts) when two share a value.",
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
