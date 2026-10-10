/**
 * IP1 · W1 — the Import page's words (the tiles' half; the matcher's half joins in Phase 4).
 * Every "Becomes" string is held here as a literal; the page renders these constants (lock D1 reads
 * them off the rendered page). Named mutation: paraphrase the footnote.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IMPORT_TITLE, IMPORT_SUB, TILE_SMART, TILE_TEMPLATE, TILE_MATCH, IMPORT_FOOTNOTE, IMPORT_FOOTNOTE_SECOND, smartFactLine } from "./importPage";
import { dayMonth } from "./dates";

const code = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("W1 · the Import page's words", () => {
  it("the header", () => {
    expect(IMPORT_TITLE).toBe("Bring your list across.");
    expect(IMPORT_SUB).toBe("Agents, queries and dates from the spreadsheet you already keep. You check everything before it's saved.");
  });
  it("the three tiles", () => {
    expect(TILE_SMART).toEqual({ title: "Smart import.", text: "Any layout, any wording. QueryHawk reads the sheet and shows you everything before anything is saved.", action: "Import a spreadsheet" });
    expect(TILE_TEMPLATE).toEqual({ title: "Our template.", text: "Set columns, read exactly. Use it as often as you like to add agents and queries in bulk.", download: "Download the template", upload: "Upload my sheet", fact: "Always free · No limit" });
    expect(TILE_MATCH).toEqual({ title: "Match your own columns.", text: "Keep a sheet with unusual columns? Tell QueryHawk which column is which.", action: "Match columns", fact: "CSV · Always free" });
  });
  it("the Smart import tile's fact line, for each entitlement", () => {
    expect(smartFactLine({ allowed: true, reason: "free_available" }, dayMonth)).toBe("1 Smart Import available");
    expect(smartFactLine({ allowed: true, reason: "pro_available" }, dayMonth)).toBe("1 Smart Import available");
    expect(smartFactLine({ allowed: false, reason: "free_used" }, dayMonth)).toBe("Smart Import already used");
    expect(smartFactLine({ allowed: false, reason: "pro_month_used", nextAvailable: "2026-11-01" }, dayMonth)).toBe("Available 1 Nov");
    expect(smartFactLine({ allowed: false, reason: "pro_month_used" }, dayMonth), "no date to give").toBe("Available next month");
  });
  it("the footnote is its first sentence alone: the second is not true of all three tiles", () => {
    expect(IMPORT_FOOTNOTE).toBe("An import adds to what you already have.");
    const page = code("src/components/import/ImportPage.tsx");
    expect(page).toContain("{IMPORT_FOOTNOTE}");
    expect(page).not.toContain("IMPORT_FOOTNOTE_SECOND");
    expect(page).not.toContain(IMPORT_FOOTNOTE_SECOND);
    /* why: Smart import and the template match an agent on name AND agency; the matcher on name alone */
    expect(code("src/lib/smartImportCommit.ts")).toContain("norm(ex.name) === norm(agentName) && norm(ex.agency) === norm(a.agency ?? \"\")");
  });
  it("the page renders these constants and no words of its own for them", () => {
    const page = code("src/components/import/ImportPage.tsx");
    for (const c of ["{IMPORT_TITLE}", "{IMPORT_SUB}", "{TILE_SMART.title}", "{TILE_SMART.text}", "{TILE_SMART.action}", "{TILE_TEMPLATE.title}", "{TILE_TEMPLATE.text}", "{TILE_TEMPLATE.download}", "{TILE_TEMPLATE.upload}", "{TILE_TEMPLATE.fact}", "{TILE_MATCH.title}", "{TILE_MATCH.text}", "{TILE_MATCH.action}", "{TILE_MATCH.fact}", "smartFactLine(entitlement, dayMonth)"]) {
      expect(page, c).toContain(c);
    }
    expect(page).not.toMatch(/recommended|Upgrade/i);
  });
});

describe("W1 · leaving an import part-way uses the query drawer's own words", () => {
  it("each of the four strings is in the drawer's discard confirm", async () => {
    const { CANCEL_ASK } = await import("../components/import/ImportCancelConfirm");
    expect(CANCEL_ASK).toEqual({ title: "Discard this?", text: "Nothing has been saved yet.", keep: "Keep going", discard: "Discard" });
    const drawer = code("src/components/queryActions/DrawerShell.tsx");
    expect(drawer).toContain(`<b>${CANCEL_ASK.title}</b>${CANCEL_ASK.text}`);
    expect(drawer).toContain(`>${CANCEL_ASK.keep}</button>`);
    expect(drawer).toContain(`>${CANCEL_ASK.discard}</button>`);
  });
});
