#!/usr/bin/env node
/**
 * Consistency roll-out v1 — the review page.
 *   node audits/consistency-rollout-v1/review.mjs <backupsDir> <a1-table.json>
 * Writes <backupsDir>/review.html. Crops are referenced by relative path inside <backupsDir> (never committed).
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, relative } from "node:path";
const [D, A1] = process.argv.slice(2).map((p) => resolve(p));
const R = (p) => relative(D, p);
const J = (p) => JSON.parse(readFileSync(p, "utf8"));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fb = J(resolve(D, "runs/before/findings.json")), fa = J(resolve(D, "runs/a14/findings.json"));
const count = (F, part, role, fam) => F.findings.filter((f) => f.vw === 1512 && f.part === part && f.role === role && (!fam || f.family === fam)).map((f) => f.variants.length).reduce((a, b) => a + b, 0) || 1;
const img = (p, cap) => existsSync(p) ? `<figure><img src="${esc(R(p))}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>` : `<figure class="miss"><div>not on screen in this run</div><figcaption>${esc(cap)}</figcaption></figure>`;
const pair = (b, a, cap) => `<div class="pair">${img(b, "before · " + cap)}${img(a, "after · " + cap)}</div>`;
const page = (run, p) => resolve(D, `runs/${run}/shots/${p}/_page-1512.png`);
const shot = (lab, p, id) => resolve(D, `shots/${lab}/${p}/${id}.png`);
/* old-navy sweep */
const navyKinds = (run) => { const n = new Set(); for (const f of readdirSync(resolve(D, "runs", run)).filter((f) => f.endsWith(".check.json"))) for (const k of Object.keys(J(resolve(D, "runs", run, f)).__navy || {})) n.add(k); return n.size; };
/* inventories for the later rulings, from the after run */
const inv = (pages, key) => { const rows = []; for (const p of pages) { const f = resolve(D, `runs/a14/${p}@1512.check.json`); if (!existsSync(f)) continue; for (const e of J(f)[key] || []) rows.push({ p, ...e }); } return rows; };
const invTable = (rows, cols) => `<table><tr><th>page</th>${cols.map((c) => `<th>${c}</th>`).join("")}</tr>${rows.map((r) => `<tr><td>${esc(r.p)}</td>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("")}</table>`;
const settings = ["account-profile", "account-preferences", "account-emails", "account-data", "account-plan", "plans"];
const onboarding = ["signin", "signup", "import"];
const pub = ["root", "about", "contact", "founders", "pricing", "help-public", "privacy", "terms", "welcome"];
const a1 = existsSync(A1) ? J(A1) : [];
const phases = [
 ["A1", "Wording: “late” and “overdue” become “past expected”", "Not applied — table for approval", "—", "—", "More than 25 user-visible strings would change (Nick's 20 Nov rule), so nothing was edited: the full table is below."],
 ["A2", "Colour that marks lateness", "Landed", "To-do, Queries, Contact list, Dashboard, phone To-do (source)", "15 rules → 0", "None of the 15 rules shows in the harness's default states, so the run proves only that nothing else moved; qcv152card.css (audit-only, agent-card-v2) and the landing hero card (an illustration) are left."],
 ["A3", "To-do filter dot, dead rule", "Landed", "To-do", "pip: red → navy", "—"],
 ["1", "Rail count (ruling 12)", "Reverted", "shell", "—", "At “99+” the 12px badge is 31.6 × 18 at x 38.4 and covers 58% of the 20px icon (limit: a third). At 56 it held (22%). The settings rail draws no count."],
 ["2", "Queries page colour (ruling 1)", "Landed", "Queries (+ its overlays)", `stage ${count(fb, "surfaces", "stage")} → ${count(fa, "surfaces", "stage")}, sheet ${count(fb, "surfaces", "sheet", "workspace")} → ${count(fa, "surfaces", "sheet", "workspace")}`, "Hard-coded old ground left and reported: the sticky group band (qcv149.css, only when grouped and stuck) and the goal-line halo (qcv1541.css) — neither was on screen in the run; the toolbar strip already reads the token (crop)."],
 ["3", "One navy (ruling 3)", "Landed", "55 files, every family", `rendered old-navy kinds ${navyKinds("before")} → ${navyKinds("a14")}`, "16 page-level variables repointed (Nick, 20 Nov); --mk-panel takes the literal #2a3a52 because public pages never load primitives.css."],
 ["4", "Public page colour (ruling 11)", "Landed", "Privacy, Terms, invite", `public sheet ${count(fb, "surfaces", "sheet", "public")} → ${count(fa, "surfaces", "sheet", "public")} (the two left differ in radius only)`, "The page roots .mk-pv/.mk-wel also painted the old ground and were cleared; the invite page's alternating bands keep #f4ede3/#fbf6ef (not on screen in the expired-link state)."],
 ...[["5", "Gap under the navy header (ruling 2)"], ["6", "Titles on Settings, Plans, Help, Your notes (ruling 10)"], ["7", "Heading sizes (ruling 6)"], ["8", "The framed card (ruling 5)"], ["9", "The main action button (ruling 4)"], ["10", "View switches (ruling 7)"], ["11", "Text fields (ruling 8)"], ["12", "Slide-out panels (ruling 9)"]].map(([n, t]) => [n, t, "Not started", "—", "—", "Time ran out: the test slot was held by other sessions' hung runs for about four hours of the session. Inventories are below."]),
];
const html = `<!doctype html><html lang="en-GB"><meta charset="utf-8"><title>Consistency roll-out v1</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>:root{--ink:#1c130f;--mut:#6f645b;--line:#e2d9cc;--bg:#f2eee8}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 Georgia,serif}main{max-width:1180px;margin:0 auto;padding:32px 16px 80px}h1{font:400 34px "Courier New",monospace}h2{margin-top:48px;font:400 24px "Courier New",monospace;border-top:1px solid var(--line);padding-top:24px}table{border-collapse:collapse;width:100%;background:#fff;font-size:13px;margin:12px 0}td,th{border:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}th{background:#f7f3ee}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}figure{margin:0;background:#fff;border:1px solid var(--line);border-radius:10px;padding:8px}figure img{max-width:100%;display:block}figcaption{font-size:12px;color:var(--mut);margin-top:4px}.miss div{padding:30px;color:var(--mut);text-align:center}.tag{font:12px monospace;padding:2px 6px;border-radius:6px;background:#efe9df}@media(max-width:700px){.pair{grid-template-columns:1fr}}</style><main>
<h1>Consistency roll-out v1</h1><p>Branch <code>consistency-rollout-v1</code> on dev's 4528a82f4. Before/after are the audit harness at 1512×982 (and 1920×1080 measured). Crops are local files beside this page.</p>
<h2>The phases</h2><table><tr><th>Phase</th><th>What</th><th>State</th><th>Pages</th><th>Variants before → after</th><th>Reverted, skipped or reported</th></tr>${phases.map((p) => `<tr>${p.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</table>
<h2>A2 + A3 · To-do</h2><p>The day chips already took the ink; the filter dot is navy; the red dismiss options stay red.</p>${pair(shot("before", "todo", "late-filter-pip"), shot("a14", "todo", "late-filter-pip"), "To-do filter dot")}${pair(shot("before", "todo", "late-dismiss-pop"), shot("a14", "todo", "late-dismiss-pop"), "dismiss pop (unchanged, destructive)")}
<h2>1 · Rail count (reverted)</h2><p>Measured at “99+”: covers 58% of the icon. The 12px badge was taken back to 9px.</p>${pair(shot("before", "todo", "P1-ct"), shot("p1-128", "todo", "P1-ct"), "rail count, before (56) and the reverted ruling at 99+")}
<h2>2 · Queries page colour</h2>${pair(page("before", "queries"), page("a14", "queries"), "Queries")}${img(shot("p1-128", "queries", "R2-qc-tbw"), "the toolbar strip after: reads the page token, no patch")}
<h2>3 · One navy</h2>${["dashboard", "manuscripts-versions", "materials-letters", "plans", "signup"].map((p) => pair(page("before", p), page("a14", p), p)).join("")}
<h2>4 · Public page colour</h2>${["privacy", "terms", "welcome"].map((p) => pair(page("before", p), page("a14", p), p)).join("")}
<h2>A1 · the wording table (for approval — nothing applied)</h2><p>${a1.length} strings in source. “Ships” = its fixed text is in the built bundle. Rows marked “needs a look” read awkwardly with the mechanical swap.</p><table><tr><th>Where</th><th>Ships</th><th>Before</th><th>After (proposed)</th><th></th></tr>${a1.map((r) => `<tr><td>${esc(r.loc)}</td><td>${r.ships ? "yes" : "—"}</td><td>${esc(r.text)}</td><td>${esc(r.after)}</td><td>${r.flag ? `<span class="tag">${esc(r.flag)}</span>` : ""}</td></tr>`).join("")}</table>
<h2>Lists asked for</h2><h3>Settings and Plans buttons (for a later ruling)</h3>${invTable(inv(settings, "__btns"), ["text", "w", "h", "rad", "fam", "fs", "fw", "bg", "sh"])}
<h3>Settings, onboarding and public text fields</h3>${invTable(inv([...settings, ...onboarding, ...pub], "__fields"), ["cls", "w", "h", "rad", "fam", "fs", "bd", "sh"])}
</main></html>`;
writeFileSync(resolve(D, "review.html"), html);
console.log(`review.html: ${html.length} bytes, ${a1.length} A1 rows`);
