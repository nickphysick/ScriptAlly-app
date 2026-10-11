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

describe("W1 · the column matcher's words", () => {
  it("each string of the table, as a literal", async () => {
    const m = await import("./importMatcher");
    expect([m.MATCHER_TITLE, m.MATCHER_SUB, m.MATCHER_BACK]).toEqual(["Match your own columns.", "Choose the column in your file for each QueryHawk field.", "‹ Back to import"]);
    expect([...m.MATCHER_STEPS]).toEqual(["Your file", "Match columns", "Import"]);
    expect(m.KIND_QUESTION).toBe("What's in the file?");
    expect(m.KINDS.map((k) => `${k.title} / ${k.desc}`)).toEqual([
      "Agents / Names, agencies, contact details", "Manuscripts / Titles, genres, word counts",
      "Queries / Who you queried, when, and the status", "Query history / Dated events for queries already here",
    ]);
    expect([m.FILE_QUESTION, m.FILE_DROP, m.FILE_PASTE, m.FILE_READ]).toEqual(["Choose a file, or paste it", "Drop a .csv file here, or choose one.", "Or paste the rows, comma separated", "Read the file"]);
    expect([m.MAP_FIELD, m.MAP_SKIP, m.MAP_REQUIRED, m.MAP_START_AGAIN]).toEqual(["QueryHawk field", "Don't import this", "Required", "‹ Start again"]);
    expect(m.MAP_LINK_NOTE).toBe("Each row is linked to the agent and manuscript already here with the same name. A row with no match is still imported, and listed for you to decide.");
    expect([m.importRowsLabel(1), m.importRowsLabel(7)]).toEqual(["Import 1 row", "Import 7 rows"]);
    expect([m.RUN_WORKING, m.RUN_KEEP_OPEN, m.RUN_PROGRESS, m.RUN_FINISHED]).toEqual(["Importing…", "Keep this tab open until it finishes.", "Progress", "Import finished."]);
    expect([m.COUNT_IMPORTED, m.COUNT_NOT, m.COUNT_DECIDE, m.LOG_TITLE]).toEqual(["Imported", "Not imported", "Need a decision", "Row by row"]);
    expect(m.AFTER_ANOTHER).toBe("Import another file");
    expect([m.afterOpenLabel("agents"), m.afterOpenLabel("manuscripts"), m.afterOpenLabel("queries"), m.afterOpenLabel("activities")]).toEqual(["Open the Contact list", "Open Manuscripts", "Open the Query Centre", "Open the Contact list"]);
  });
  it("the run's lines", async () => {
    const { LOG, ERR, DEVELOPER_WORDS } = await import("./importMatcher");
    const lines = [
      LOG.agentExists("Clara Voss"), LOG.manuscriptExists("The Salt Road"), LOG.agentAdded("Clara Voss", "Pemberton Literary"), LOG.agentAdded("Owen Hale", ""),
      LOG.manuscriptAdded("The Salt Road"), LOG.queryAdded("The Salt Road", "Clara Voss", "Queried"), LOG.eventAdded("Asked for the partial"),
      ERR.noName(3), ERR.noTitle(4), ERR.needsBoth(5), ERR.agentFailed("Clara Voss", "boom"), ERR.agentFailed("Clara Voss"), ERR.manuscriptFailed("T"), ERR.queryFailed(6, "boom"), ERR.eventFailed(), ERR.rowUnreadable(7, "x"),
    ];
    expect(lines.slice(0, 7)).toEqual([
      "Clara Voss is already on your contact list. Row not imported.", '"The Salt Road" is already in your manuscripts. Row not imported.',
      "Added agent: Clara Voss, Pemberton Literary", "Added agent: Owen Hale", 'Added manuscript: "The Salt Road"',
      'Added query: "The Salt Road" to Clara Voss, Queried', "Added to a query's history: Asked for the partial",
    ]);
    for (const l of lines) expect(l, l).not.toMatch(DEVELOPER_WORDS);
  });
  it("the matcher renders them, and its three removals are gone", () => {
    const src = code("src/components/ImportCsv.tsx");
    for (const c of ["{MATCHER_BACK}", "MATCHER_TITLE", "MATCHER_SUB", "{KIND_QUESTION}", "{FILE_QUESTION}", "{FILE_DROP}", "{FILE_PASTE}", "{FILE_READ}", "{MAP_FIELD}", "{MAP_SKIP}", "{MAP_REQUIRED}", "{MAP_LINK_NOTE}", "{MAP_START_AGAIN}", "importRowsLabel(csvRows.length)", "RUN_WORKING : RUN_FINISHED", "{RUN_KEEP_OPEN}", "{RUN_PROGRESS}", "{COUNT_IMPORTED}", "{COUNT_NOT}", "{COUNT_DECIDE}", "{LOG_TITLE}", "{DECIDE_NOTE}", "{AFTER_ANOTHER}", "afterOpenLabel(importType)"]) {
      expect(src, c).toContain(c);
    }
    for (const gone of ["loadDemoCsv", "subTab", "activeGridTab", "gridSearch", "<PageHeader", "Zite", "Grid Viewer", "stone-", "blue-", "bg-[#7c3a2a]"]) expect(src, gone).not.toContain(gone);
    expect(src).toContain('role="button"'); // the drop zone
    expect(src).toContain("onDrop="); // "Drop" is said because a drop is handled
  });
});
