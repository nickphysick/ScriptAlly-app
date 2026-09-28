/**
 * Item 4 (clean-up pass, 28 Sep): "28 SEP", never "28 SEPT". One formatter, and a lock that nothing
 * formats a short month any other way. The rendered half is tests/e2e/noSept.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { dayMonth, formatDate, MONTHS_SHORT } from "./dates";

describe("formatDate", () => {
  const sep = new Date(2026, 8, 28, 14, 5);
  it("puts a three-letter month where en-GB would say Sept", () => {
    expect(formatDate(sep, { day: "numeric", month: "short" })).toBe("28 Sep");
    expect(formatDate(sep, { day: "numeric", month: "short", year: "numeric" })).toBe("28 Sep 2026");
    expect(formatDate(sep, { weekday: "short", day: "numeric", month: "short" })).toMatch(/^Mon,? 28 Sep$/);
    expect(dayMonth(sep)).toBe("28 Sep");
  });
  it("changes nothing else: every other part is the platform's own", () => {
    for (const opts of [{ day: "numeric", month: "short" }, { weekday: "long", day: "numeric", month: "short", year: "numeric" }, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }] as Intl.DateTimeFormatOptions[]) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(2026, m, 3, 9, 30);
        expect(formatDate(d, opts)).toBe(d.toLocaleDateString("en-GB", opts).replace("Sept", "Sep"));
      }
    }
  });
  it("the time form, and an invalid date gives nothing", () => {
    expect(formatDate(sep, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }, "en-GB", true)).toContain("28 Sep");
    expect(formatDate("not a date", { day: "numeric", month: "short" })).toBe("");
    expect(MONTHS_SHORT.join(" ")).toBe("Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec");
  });
});

/* ── the lock: nothing in src/ formats a short month any other way ── */
const SRC = join(__dirname, "..");
const files: string[] = [];
(function walk(d: string) {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.(ts|tsx)$/.test(e.name)) files.push(p);
  }
})(SRC);

describe("the one formatter is the only way a short month is made", () => {
  it("the scan found the source", () => expect(files.length).toBeGreaterThan(400));
  it("no toLocaleDateString / toLocaleString / Intl.DateTimeFormat asks for a short month outside lib/dates.ts", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (relative(SRC, f) === "lib/dates.ts") continue;
      const src = readFileSync(f, "utf8");
      if (!/month:\s*["']short["']/.test(src)) continue;
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const shortIn = (n: ts.Node | undefined): boolean => !!n && /month:\s*["']short["']/.test(n.getText(sf));
      const visit = (n: ts.Node) => {
        if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
          && /^(toLocaleDateString|toLocaleString)$/.test(n.expression.name.text) && shortIn(n.arguments[1])) {
          offenders.push(`${relative(SRC, f)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`);
        }
        if (ts.isNewExpression(n) && /DateTimeFormat$/.test(n.expression.getText(sf)) && shortIn(n.arguments?.[1])) {
          offenders.push(`${relative(SRC, f)}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`);
        }
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(offenders).toEqual([]);
  });
  it("no string in the code says Sept (comments may quote the old bug), and there is one month table", () => {
    const sept: string[] = []; const tables: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (n: ts.Node) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) && /\bSept\b/.test(n.getText(sf))) sept.push(relative(SRC, f));
        if (ts.isArrayLiteralExpression(n) && n.elements.length === 12 && n.getText(sf).includes('"Jan"')) tables.push(relative(SRC, f));
        ts.forEachChild(n, visit);
      };
      visit(sf);
    }
    expect(sept).toEqual([]);
    expect(tables).toEqual(["lib/dates.ts"]);
  });
});
