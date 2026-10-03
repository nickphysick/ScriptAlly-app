import { readFileSync, writeFileSync, mkdirSync, appendFileSync, rmSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
const W = "/Users/nickphysick/ScriptAlly-analytics-v13";
const BK = "/private/tmp/claude-501/-Users-nickphysick-ScriptAlly-app/5dee041e-3d07-4d9d-ae7a-ecbaf98d430a/scratchpad/mut13";
const LOG = BK + "/results.jsonl";
mkdirSync(BK, { recursive: true });
const sha = (s) => createHash("sha256").update(s).digest("hex");
const A = (f, find, rep) => ({ f, find, rep });
const M = [
  ["feature-fits", [A("src/components/analytics/a13.css", "height: clamp(480px, calc(var(--a13-port) - 18px - 6px - var(--wpg-hem-h, 44px) - 4px), 760px);", "height: clamp(480px, calc(var(--a13-port) + 200px), 1600px);")]],
  ["feature-max-760", [A("src/components/analytics/a13.css", "- var(--wpg-hem-h, 44px) - 4px), 760px);", "- var(--wpg-hem-h, 44px) - 4px), 1000px);")]],
  ["feature-clear-of-hem", [A("src/components/analytics/a13.css", "height: clamp(480px, calc(var(--a13-port) - 18px - 6px - var(--wpg-hem-h, 44px) - 4px), 760px);", "height: clamp(480px, calc(var(--a13-port) - 18px - 6px - 4px), 760px);")]],
  ["feature-text-whole", [A("src/components/analytics/A13Frame.tsx", "if (t.scrollHeight > el.clientHeight + 1) el.setAttribute(\"data-tight\", \"1\");", "void t;")]],
  ["button-visible", [A("src/components/analytics/a13.css", ".a13-feat-acts { display: flex;", ".a13-feat-acts { margin-bottom: -400px; position: relative; top: 400px; display: flex;")]],
  ["no-living-header", [A("src/components/QueryAnalytics.tsx", "<div className=\"a13-flow\" data-a13=\"flow\">{body}</div>", "<div className=\"ph\" /><div className=\"a13-flow\" data-a13=\"flow\">{body}</div>")]],
  ["seven-sections", [A("src/components/QueryAnalytics.tsx", "<Section sec={4} num=", "<Section sec={9} num=")]],
  ["white-containers", [A("src/components/QueryAnalytics.tsx", "lede={v.reply.lede} white", "lede={v.reply.lede}")]],
  ["caveats-last", [A("src/components/QueryAnalytics.tsx", "        <section className=\"a13-chap\" data-a13=\"sec\" data-sec={6} id=\"a13-sec-6\">", "        <div className=\"a13-tail\" data-sec=\"tail\" style={{ height: 40 }} />\n        <section className=\"a13-chap\" data-a13=\"sec\" data-sec={6} id=\"a13-sec-6\">"), A("src/components/QueryAnalytics.tsx", "          </div>\n        </section>\n      </>", "          </div>\n        </section>\n        <div className=\"a13-tail\" data-sec=\"tail\" style={{ height: 40 }} />\n      </>")]],
  ["figure-0-present", [A("src/components/QueryAnalytics.tsx", "          <Funnel model={model} />\n", "")]],
  ["figure-0-marks", [A("src/components/analytics/a13.css", ".a13-svg [data-a13=\"mark\"] {", ".a13-svg [data-a13=\"mark\"] { display: none; } .a13-x {")]],
  ["nav-seven", [A("src/components/analytics/A13Frame.tsx", "\"How things stand\", \"Caveats\"]", "\"How things stand\"]")]],
  ["nav-on-screen", [A("src/components/analytics/A13Frame.tsx", "right: window.innerWidth - r.right + 22", "right: window.innerWidth - r.right - 40")]],
  ["take-a-look-scrolls", [A("src/components/QueryAnalytics.tsx", "<Feature model={model} onGo={() => go(0)} />", "<Feature model={model} onGo={() => go(2)} />")]],
  ["nav-tracks-0", [A("src/components/analytics/A13Frame.tsx", "if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.sec));", "void e;")]],
  ["nav-tracks-3", [A("src/components/analytics/A13Frame.tsx", "if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.sec));", "if (e.isIntersecting) setActive((a) => (a === -1 ? Number((e.target as HTMLElement).dataset.sec) : a));")]],
  ["tooltip-on-hover", [A("src/components/analytics/A13Frame.tsx", "show: (e, body) => setTip({ body, x: e.clientX + 14, y: e.clientY + 14 }),", "show: () => {},")]],
  ["no-burgundy", [A("src/components/analytics/a13.css", ".a13-read b { display: block;", ".a13-read b { color: #7c3a2a; display: block;")]],
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
      rmSync(`${W}/reports/analytics-v13/ledger`, { recursive: true, force: true });
      try { execSync("npx playwright test tests/e2e/analyticsV13.measure.ts --project=measure --no-deps", { cwd: W, stdio: "pipe", env: { ...process.env, SA_E2E_BASE_URL: "http://127.0.0.1:4477" } }); } catch { /* red is expected */ }
      const dir = `${W}/reports/analytics-v13/ledger`;
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
