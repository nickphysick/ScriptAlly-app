/**
 * Consistency audit v1 — the one reader of the shared tokens, used by the scan, the analysis and the inventory.
 *
 * SHARED = a custom property declared at :root / @theme / html in ANY stylesheet under src/ (the global tokens are
 * spread across src/index.css and a dozen shell stylesheets, e.g. --sp-anthracite in shell/primitives.css), plus the
 * exports of src/lib/designTokens.ts. A property declared under a theme scope (.t-capp, .t-bold, .t-edn, .t-f12) or a
 * page class is reported with that scope and is NOT shared: it resolves only inside its scope (CLAUDE memory
 * "token scope, not existence": a theme-scoped token read outside its theme paints transparent).
 *
 * Comments are blanked before reading, so a hex quoted in prose is never a token.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { resolve, relative } from "node:path";

const blank = (s) => s.replace(/[^\n]/g, " ");

export function cssFiles(root) {
  const out = [];
  const walk = (d) => {
    for (const f of readdirSync(d)) {
      const p = resolve(d, f);
      const st = statSync(p);
      if (st.isDirectory()) { if (!/node_modules|__fixtures__/.test(f)) walk(p); }
      else if (f.endsWith(".css")) out.push(p);
    }
  };
  walk(resolve(root, "src"));
  return out.sort();
}

/** every custom property declaration in one stylesheet, with the selector of the block it sits in */
export function declarations(root, file) {
  const src = readFileSync(resolve(root, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, blank);
  const out = [];
  const stack = [];
  let buf = "", line = 1, declStart = 1;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === "\n") line++;
    if (ch === "{") { stack.push(buf.trim().replace(/\s+/g, " ").split(/\s*,\s*/)[0] || "?"); buf = ""; declStart = line; continue; }
    if (ch === "}" || ch === ";") {
      const m = /^\s*(--[\w-]+)\s*:\s*([\s\S]+)$/.exec(buf);
      if (m) {
        const scope = stack.length ? stack[stack.length - 1] : "(top)";
        out.push({ name: m[1], value: m[2].trim().replace(/\s*!important$/, ""), file, line: declStart + (buf.slice(0, buf.indexOf(m[1])).match(/\n/g) || []).length, scope, shared: /^(:root|@theme|html)$/.test(scope) });
      }
      if (ch === "}") stack.pop();
      buf = ""; declStart = line; continue;
    }
    if (!buf.trim()) declStart = line;
    buf += ch;
  }
  return out;
}

export function readTokens(root) {
  const all = [];
  for (const p of cssFiles(root)) all.push(...declarations(root, relative(root, p)));
  const ts = readFileSync(resolve(root, "src/lib/designTokens.ts"), "utf8");
  ts.split("\n").forEach((l, i) => {
    const m = /export const (\w+)\s*=\s*["'`]([^"'`]+)["'`]/.exec(l);
    if (m) all.push({ name: m[1], value: m[2], file: "src/lib/designTokens.ts", line: i + 1, scope: "designTokens.ts export", shared: true });
  });
  /* app-wide before page-declared: index.css, then the shell's stylesheets, then designTokens.ts, then a page's own :root */
  const rank = (t) => (t.file === "src/index.css" || t.file === "src/styles/motion.css" ? 0 : t.file.startsWith("src/components/shell/") ? 1 : t.file === "src/lib/designTokens.ts" ? 2 : 3);
  const shared = all.filter((t) => t.shared).map((t) => ({ ...t, rank: rank(t), appWide: rank(t) < 3 })).sort((a, b) => a.rank - b.rank);
  return { all, shared, themeScoped: all.filter((t) => t.file === "src/index.css" && !t.shared) };
}
