/**
 * Lock H1 (two-door import v1): the picker's two readers. A file with QueryHawk's headings is read by
 * the template parser; anything else by Smart Import. Mutation: `node scripts/tdi-mutate.mjs apply
 * alwayssmart` (every file to Smart Import) turns the first case red.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { readRouteFor, firstSheetHeadings } from "./importReadRoute";
import { TEMPLATE_HEADERS } from "./templateColumns";

const fixture = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const routeOf = async (bytes: Uint8Array) => readRouteFor(await firstSheetHeadings(bytes));
/** The same file as text with one heading renamed. */
const renamed = (name: string, from: string, to: string) => new TextEncoder().encode(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name), "utf8").replace(from, to));

describe("H1 one picker, two readers", () => {
  it("template-dmy.csv and template-iso.csv route to the headings reader", async () => {
    expect(await routeOf(fixture("template-dmy.csv"))).toBe("headings");
    expect(await routeOf(fixture("template-iso.csv"))).toBe("headings");
    expect(await routeOf(fixture("template-iso.xlsx")), "a workbook with our headings too").toBe("headings");
  });

  it("smart-messy.xlsx routes to Smart Import", async () => {
    expect(await routeOf(fixture("smart-messy.xlsx"))).toBe("smart");
  });

  it("a headings file with one column renamed routes to Smart Import", async () => {
    const bytes = renamed("template-dmy.csv", "Date sent", "When sent");
    expect((await firstSheetHeadings(bytes)).includes("When sent"), "the rename took").toBe(true);
    expect(await routeOf(bytes)).toBe("smart");
  });

  it("case and spacing do not count; a missing heading or an extra one does", () => {
    expect(readRouteFor(TEMPLATE_HEADERS.map((h) => `  ${h.toUpperCase()} `))).toBe("headings");
    expect(readRouteFor([...TEMPLATE_HEADERS, ""])).toBe("headings");
    expect(readRouteFor(TEMPLATE_HEADERS.slice(1))).toBe("smart");
    expect(readRouteFor([...TEMPLATE_HEADERS, "My own column"])).toBe("smart");
    expect(readRouteFor([])).toBe("smart");
  });

  it("names no heading of its own: the template's columns are read from templateColumns", () => {
    const src = readFileSync(resolve(process.cwd(), "src/lib/importReadRoute.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const h of TEMPLATE_HEADERS) expect(src, h).not.toContain(`"${h}"`);
    expect(src).toContain("TEMPLATE_HEADER_LOOKUP.get(normaliseHeader(");
  });
});

/* Lock H2's unit half: in ImportFlow the headings are read FIRST, and the headings branch reaches the
   template parser without passing the entitlement check, the confirm screen or runSmartImport. The page
   half (no request to the callable, ConfirmScreen never mounts) is tests/e2e/twoDoorImport.measure.ts. */
describe("H2 the headings route never touches Smart Import (source)", () => {
  const flow = readFileSync(resolve(process.cwd(), "src/components/import/ImportFlow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const body = (name: string) => { const at = flow.indexOf(`const ${name} = `); return flow.slice(at, flow.indexOf("\n  };", at)); };
  it("the picked file is routed before anything else", () => {
    expect(flow).toContain("const pickFile = (file: File) => { void routeFile(file); };");
    const route = body("routeFile");
    expect(route).toMatch(/if \(\(await readRouteOfFile\(file\)\) === "headings"\) \{ await pickTemplateFile\(file\); return; \}\s*pickSmartFile\(file\);/);
  });
  it("the template parser's path names no entitlement, confirm or Smart Import call", () => {
    const tpl = body("pickTemplateFile");
    expect(tpl).toContain("readTemplateFile(file)");
    for (const gone of ["entitlement", "confirm", "runSmartImport", "runMapping", "setPendingFile"]) expect(tpl, gone).not.toContain(gone);
  });
  it("there is one file picker: no template-only input and no chooseTemplate", () => {
    expect(flow).not.toContain('data-picker="template"');
    expect(flow).not.toContain("chooseTemplate");
    expect(flow.match(/accept="\.csv,\.xlsx,\.xls"/g) ?? []).toHaveLength(1);
  });
});
