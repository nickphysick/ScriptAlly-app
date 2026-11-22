/**
 * Consistency audit v2 — the public-repo rule for committed data. An element's text is recorded only when it is fixed
 * interface copy; anything from the account (names, titles, agencies, notes, dates, counts) is written "[data]".
 *
 * Text is kept only when all three hold:
 *   1. it equals, whole, one string literal or JSX text run in the app's source (src/**, not tests) — a substring
 *      match is not enough ("Coastal" is inside other words);
 *   2. it does not appear, as a whole word or phrase, anywhere in the harness account's data
 *      (tests/emulator-seed/harness.json) — so a genre, title or name that is ALSO a source string is still data;
 *   3. the element's role is not one that only ever holds account content (initials, chips, rows, query cards…).
 * Numbers and dates are always "[data]". When in doubt it is "[data]".
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const DATA_ROLES = /^(marks\/(initials-disc|chip|statusdot|chart-point)|lists\/(list-row|table-row|list-item)|cards\/(query-card|note))$/;
const norm = (s) => String(s || "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();
let src = null, seed = null, seedShort = [];
function load(root) {
  src = new Set();
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = join(d, f); const st = statSync(p);
      if (st.isDirectory()) { if (!/^(node_modules|__snapshots__|test|tests)$/.test(f)) walk(p); continue; }
      if (!/\.(tsx|ts|jsx|js)$/.test(f) || /\.test\.|\.spec\.|\.measure\./.test(f)) continue;
      const t = readFileSync(p, "utf8");
      for (const m of t.matchAll(/"([^"\\\n]{1,400})"|'([^'\\\n]{1,400})'|`([^`$]{1,600})`|>([^<>{}\n]{1,400})</g)) { const n = norm(m[1] || m[2] || m[3] || m[4]); if (n) src.add(n); }
    }
  };
  walk(resolve(root, "src"));
  const vals = [];
  const take = (o) => { if (typeof o === "string") vals.push(norm(o)); else if (Array.isArray(o)) o.forEach(take); else if (o && typeof o === "object") Object.values(o).forEach(take); };
  const sp = resolve(root, "tests/emulator-seed/harness.json");
  if (existsSync(sp)) take(JSON.parse(readFileSync(sp, "utf8")));
  seed = "\n" + vals.join("\n") + "\n";
  /* the short account values (names, titles, agencies, tags) for the reverse check: text that CONTAINS one is data */
  seedShort = [...new Set(vals.filter((v) => v.length >= 4 && v.length <= 60 && /[a-z]/.test(v) && !/^[a-z0-9_-]+$/.test(v) || (v.length >= 4 && v.length <= 60 && /^[a-z]+$/.test(v) && v.length >= 5)))];
}
export function safeText(t, role = "", root = process.cwd()) {
  if (src == null) load(root);
  const n = norm(t);
  if (!n) return "";
  if (DATA_ROLES.test(role)) return "[data]";
  if (/\d/.test(n)) return "[data]";
  if (n.length <= 2 && /^[^a-z]+$/.test(n)) return t; /* a glyph: ×, →, / */
  if (!src.has(n)) return "[data]";
  const esc = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`(^|[^a-z'])${esc}([^a-z']|$)`, "m").test(seed)) return "[data]";
  for (const v of seedShort) { if (n.includes(v)) { const e = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); if (new RegExp(`(^|[^a-z'])${e}([^a-z']|$)`).test(n)) return "[data]"; } }
  return t;
}
