import { readFileSync, writeFileSync, mkdirSync, appendFileSync, rmSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
const W = "/Users/nickphysick/ScriptAlly-analytics-v2a";
const BK = "/private/tmp/claude-501/-Users-nickphysick-ScriptAlly-app/5dee041e-3d07-4d9d-ae7a-ecbaf98d430a/scratchpad/mut";
const LOG = BK + "/results.jsonl";
mkdirSync(BK, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const A = (f, find, rep) => ({ f, find, rep });
const M = [
  ["header-full-width", [A("src/components/analytics/anvFrame.css", ".anv-group > .anv-head { grid-column: 1 / -1; grid-row: 1; }", ".anv-group > .anv-head { grid-column: 1; grid-row: 1; }")]],
  ["header-above-group", [A("src/components/analytics/anvFrame.css", ".anv-group > .anv-main { grid-column: 1; grid-row: 2;", ".anv-group > .anv-main { grid-column: 1; grid-row: 1;")]],
  ["group-centred", [A("src/components/analytics/anvFrame.css", ".anv-group {\n  display: grid;", ".anv-group {\n  margin-right: 60px;\n  display: grid;")]],
  ["rail-340", [A("src/components/analytics/anvRail.css", ".anv-railbody {", ".anv-page .anv-rail { width: 320px; }\n.anv-railbody {")]],
  ["rail-sticky-declared+rail-stuck", [A("src/components/analytics/anvRail.css", ".anv-railbody {", ".anv-page .anv-rail { position: relative; }\n.anv-railbody {")]],
  ["rail-stuck", [A("src/components/analytics/anvRail.css", ".anv-railbody {", ".anv-page .anv-rail { top: 60px; }\n.anv-railbody {")]],
  ["rail-fits-on-load", [A("src/components/analytics/StoryRail.tsx", "fill={!example}", "fill={false}")]],
  ["funnel-links", [A("src/components/analytics/AnvJourney.tsx", "{i < links.length ? <Link label={links[i].label} /> : null}", "{null}")]],
  ["funnel-dots", [A("src/components/analytics/AnvJourney.tsx", "<div className=\"anv-jring\"><StatusDot status={s.dotStatus} overrideSize={80} decorative /></div>", "<div className=\"anv-jring\" />")]],
  ["funnel-ref-height", [A("src/components/analytics/anvJourney.css", ".anv-jring { height: 96px;", ".anv-jring { height: 260px;")]],
  ["chart-reply-marks", [A("src/components/analytics/anvCharts.css", ".anv-rwmk {\n", ".anv-rwmk {\n  display: none;\n")]],
  ["chart-volume-marks", [A("src/components/analytics/anvCharts.css", ".anv-vseg { display: block;", ".anv-vseg { display: none;")]],
  ["chart-endings-marks+chart-stages-marks", [A("src/components/analytics/anvCharts.css", ".anv-lmk {\n", ".anv-lmk {\n  display: none;\n"), A("src/components/analytics/anvCharts.css", ".anv-sbarr { position: absolute;", ".anv-sbarr { display: none; position: absolute;")]],
  ["story-date-order", [A("src/lib/analyticsModel.ts", "ev.sort((a, b) => a.atMs - b.atMs);", "ev.sort((a, b) => b.atMs - a.atMs);")]],
  ["story-ends-today", [A("src/lib/analyticsModel.ts", "    ev.push({\n      kind: \"today\",", "    ev.unshift({\n      kind: \"today\",")]],
  ["caveats-last", [A("src/components/QueryAnalytics.tsx", "          <AnvCaveats model={model} />\n", ""), A("src/components/QueryAnalytics.tsx", "          <AnvVolume model={model} />\n", "          <AnvCaveats model={model} />\n          <AnvVolume model={model} />\n")]],
  ["range-pressed+range-changes-sent", [A("src/components/analytics/AnvJourney.tsx", "onClick={() => onChange(o.value)}", "onClick={() => {}}")]],
  ["no-eyebrow", [A("src/components/QueryAnalytics.tsx", "const NO_SECTION = { section: null };", "const NO_SECTION = { section: \"Queries\" };")]],
  ["chart-stages-marks", [A("src/components/analytics/anvCharts.css", ".anv-sbarr { position: absolute;", ".anv-sbarr { display: none; position: absolute;")]],
  ["range-changes-sent", [A("src/components/QueryAnalytics.tsx", "packages, versions, range, nowMs: Date.now() });", "packages, versions, range: \"all\", nowMs: Date.now() });")]],
  ["no-burgundy", [A("src/components/analytics/anvCharts.css", ".anv-fv { font-size: 24px;", ".anv-fv { color: #7c3a2a; font-size: 24px;")]],
];
const only = process.argv[2] ? process.argv[2].split(",") : null;
for (const [name, edits] of M) {
  if (only && !only.includes(name)) continue;
  const orig = {};
  for (const e of edits) if (!(e.f in orig)) { orig[e.f] = readFileSync(`${W}/${e.f}`, "utf8"); writeFileSync(`${BK}/${e.f.replace(/\//g, "-")}`, orig[e.f]); }
  let ok = true; const cur = { ...orig };
  for (const e of edits) { if (!cur[e.f].includes(e.find)) { ok = false; console.log(`✗ ${name}: anchor missing in ${e.f}`); break; } cur[e.f] = cur[e.f].replace(e.find, e.rep); }
  let failed = [], ran = 0, note = "";
  if (ok) {
    for (const f in cur) writeFileSync(`${W}/${f}`, cur[f]);
    try {
      execSync("npm run build:dev", { cwd: W, stdio: "pipe" });
      rmSync(`${W}/reports/analytics-v2a/ledger`, { recursive: true, force: true });
      try { execSync("npx playwright test tests/e2e/analyticsV2a.measure.ts --project=measure --no-deps", { cwd: W, stdio: "pipe", env: { ...process.env, SA_E2E_BASE_URL: "http://127.0.0.1:4477" } }); } catch { /* red is expected */ }
      const dir = `${W}/reports/analytics-v2a/ledger`;
      const parts = readdirSync(dir).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, "utf8")));
      ran = parts.reduce((n, l) => n + l.ran, 0);
      failed = [...new Set(parts.flatMap((l) => l.rows.filter((r) => !r.ok).map((r) => r.lock)))];
    } catch (err) { note = "build failed: " + String(err).slice(0, 200); }
  }
  for (const f in orig) writeFileSync(`${W}/${f}`, orig[f]);
  const restored = Object.keys(orig).every((f) => sha(readFileSync(`${W}/${f}`, "utf8")) === sha(orig[f]));
  const want = name.split("+");
  const red = want.every((w) => failed.includes(w));
  const row = { name, red, failed, ran, restored, note };
  appendFileSync(LOG, JSON.stringify(row) + "\n");
  console.log(`${red ? "RED ✓" : "NOT RED ✗"} ${name} — failed: ${failed.join(", ") || "none"} (last ledger ${ran} checks) restored=${restored} ${note}`);
}
execSync("npm run build:dev", { cwd: W, stdio: "pipe" });
console.log("rebuilt clean dev bundle");
