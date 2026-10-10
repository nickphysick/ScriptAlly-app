/**
 * "Your list" (onboarding v5, part 1): three tiles, each with its own buttons — and the confirm.
 *
 * REWRITTEN with the step it locks. The fork was a radio group with a reveal and one shared
 * primary; this file used to assert exactly that (three radios, one checked, a primary whose label
 * followed the choice, a cost tag and a fit tag per option). Every one of those is retired, and
 * what replaced each is asserted here. Which button calls which handler is held on the rendered
 * page, with spies (tests/e2e/onbV5.measure.ts, K1).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import * as lib from "../../lib/captureFork";
import {
  CaptureOption, CAPTURE_OPTIONS, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_SUB, CAPTURE_LATER,
  CAPTURE_ESCAPE_PREFIX, CAPTURE_ESCAPE_LINK, CAPTURE_ESCAPE_SUFFIX, captureFact, acceptsDroppedFile,
} from "../../lib/captureFork";
import { CaptureFork } from "./CaptureFork";
import {
  ConfirmScreen, CONFIRM_TITLE, CONFIRM_SUB, CONFIRM_NOTE_FREE, CONFIRM_NOTE_PRO, fileSizeLabel, fileTypeLabel,
} from "./ConfirmScreen";
import { confirmFileLead } from "../../lib/smartImportConfirm";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const noop = () => {};
const fork = (ringed: CaptureOption, tier: "free" | "pro" = "free") =>
  renderToStaticMarkup(
    <CaptureFork ringed={ringed} tier={tier} onChooseFile={noop} onDropFile={noop} onUploadTemplate={noop}
                 onAddByHand={noop} onBack={noop} onNothingYet={noop} onOpenImportDesk={noop} onDownloadTemplate={noop} />,
  ).replace(/<!-- -->/g, "");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("W1 the fork's words", () => {
  it("the heading and subline are the built ones, verbatim", () => {
    expect(CAPTURE_HEADING).toBe("How shall we capture your existing agents & queries?");
    const h = fork("smart");
    expect(h).toContain(`<h1 class="sf-title">${esc(CAPTURE_HEADING)}</h1>`);
    expect(h).toContain(`<p class="sf-sub">${esc(CAPTURE_SUB)}</p>`);
  });

  it("the tile titles end with a full stop, as the Contact list's tiles do", () => {
    expect(CAPTURE_OPTIONS.map((k) => CAPTURE_CHOICES[k].title)).toEqual(["Smart import.", "Our template.", "Add by hand."]);
  });

  it("Smart import's text is the new one; the template's and by-hand's are unchanged", () => {
    expect(CAPTURE_CHOICES.smart.desc).toBe("Upload the spreadsheet you already keep, in any layout and any wording. QueryHawk reads it and shows you everything before anything is saved.");
    expect(CAPTURE_CHOICES.template.desc).toBe("Download a ready-made sheet, fill in your agents, upload it back. Set columns mean we read it exactly, every time.");
    expect(CAPTURE_CHOICES.byhand.desc).toBe("Go straight to the agent form and type them in. Quickest route if you've only a handful to record.");
  });

  it("each tile's buttons carry the table's labels", () => {
    const h = fork("smart");
    for (const label of ["Import a spreadsheet", "Download the template", "Upload my sheet", "Add an agent"]) {
      expect(h).toMatch(new RegExp(`<button[^>]*>${label}</button>`));
    }
    expect(h, "the old shared primaries are gone").not.toMatch(/Continue to review|Take me to the agent form|Upload my filled-in sheet/);
  });

  it("the line under the tiles names the Import page", () => {
    expect(CAPTURE_ESCAPE_PREFIX + CAPTURE_ESCAPE_LINK + CAPTURE_ESCAPE_SUFFIX)
      .toBe("Keep a spreadsheet with unusual columns? You can match them up yourself on the Import page once you're in.");
    /* Static markup escapes the apostrophe; the words are compared as a reader sees them. */
    const seen = text(fork("smart")).replace(/&#x27;/g, "'");
    expect(seen).toContain("on the Import page once you're in.");
    expect(seen).toContain(CAPTURE_LATER);
  });

  it("never grades the writer, and never congratulates", () => {
    const all = text(fork("smart")) + text(fork("byhand", "pro"));
    for (const word of [/\brecommended\b/i, /\bbest for\b/i, /\bgreat\b/i, /\bwell done\b/i, /\bperfect\b/i, /\beasy\b/i, /\bsimply\b/i]) {
      expect(all, String(word)).not.toMatch(word);
    }
  });
});

describe("K1 three tiles, no radio, one ring", () => {
  it("draws three tiles and no radio group", () => {
    const h = fork("smart");
    expect(h.match(/class="sf-tile(?: is-ringed)?"/g) ?? []).toHaveLength(3);
    expect(h).not.toContain('role="radio"');
    expect(h).not.toContain('role="radiogroup"');
    expect(h).not.toContain("aria-pressed");
    expect(h).not.toContain("aria-checked");
  });

  it("rings exactly one tile, and it is the suggested one — for each of the three", () => {
    for (const key of CAPTURE_OPTIONS) {
      const h = fork(key);
      const ringed = [...h.matchAll(/data-tile="(\w+)" data-ringed="true"/g)].map((m) => m[1]);
      expect(ringed, `suggesting ${key}`).toEqual([key]);
    }
  });

  it("every tile's buttons are live whichever is ringed", () => {
    for (const key of CAPTURE_OPTIONS) expect(fork(key)).not.toMatch(/<button[^>]*disabled/);
  });

  it("the drop zone rides the ringed Smart import tile, and says what it accepts", () => {
    expect(fork("smart")).toContain('data-sf="drop"');
    expect(text(fork("smart"))).toContain("Drop your file here, or choose a file");
    expect(text(fork("smart"))).toContain(".csv · .xlsx");
    /* A size nothing enforces is not stated (onboarding v5 part 2, phase 0). */
    expect(text(fork("smart"))).not.toMatch(/\bMB\b/);
    expect(fork("byhand")).not.toContain('data-sf="drop"');
    expect(fork("template")).not.toContain('data-sf="drop"');
  });

  it("a drop is taken only for a type the picker offers", () => {
    for (const ok of ["agents.csv", "My Agents.XLSX", "old.xls"]) expect(acceptsDroppedFile(ok), ok).toBe(true);
    for (const no of ["agents.pdf", "notes.txt", "csv", "sheet.numbers"]) expect(acceptsDroppedFile(no), no).toBe(false);
  });

  it("the component handles the drop itself — the words promise it", () => {
    const src = readFileSync(resolve(here, "CaptureFork.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/onDrop=\{drop\}/);
    expect(src).toMatch(/onDropFile\(file\)/);
    expect(src, "first file only").toMatch(/files\?\.\[0\]/);
  });

  /* Part 3 moved the pickers and their handlers into ImportFlow; the fork reaches them through the
     flow's ref. The law is unchanged (each press has its own handler) and now spans the seam, so
     both halves are asserted. */
  it("BranchB wires each press to its own handler", () => {
    const b = readFileSync(resolve(here, "BranchB.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const f = readFileSync(resolve(here, "../import/ImportFlow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const at = b.indexOf("<CaptureFork");
    expect(at).toBeGreaterThan(-1);
    const call = b.slice(at, b.indexOf("/>", at));
    expect(call).toContain("onChooseFile={() => flowRef.current?.chooseFile()}");
    expect(f).toContain("chooseFile: () => fileInputRef.current?.click(),");
    expect(call).toContain("onDropFile={(f) => flowRef.current?.dropFile(f)}");
    expect(f).toContain("dropFile: pickFile,");
    expect(call).toContain("onUploadTemplate={() => flowRef.current?.chooseTemplate()}");
    expect(f).toContain("chooseTemplate: () => templateInputRef.current?.click(),");
    expect(call).toContain("onAddByHand={onAddByHand}");
    expect(call).toContain("onNothingYet={onSkip}");
    expect(call).toContain("ringed={importOption}");
    expect(call).toContain("tier={entitlement.tier}");
    expect(f).toMatch(/data-picker="smart"[\s\S]*?pickFile\(f\)/);
    expect(f).toMatch(/data-picker="template"[\s\S]*?pickTemplateFile\(f\)/);
  });
});

describe("K2 the fact line states cost, from the tier", () => {
  it("Smart import reads the entitlement's tier", () => {
    expect(captureFact("smart", "free")).toBe("Uses your one Smart Import");
    expect(captureFact("smart", "pro")).toBe("Uses this month's Smart Import");
    expect(fork("smart", "free")).toContain('<p class="sf-fact" data-fact="smart">Uses your one Smart Import</p>');
    expect(fork("smart", "pro")).toContain(`<p class="sf-fact" data-fact="smart">${esc("Uses this month's Smart Import")}</p>`);
  });
  it("the other two are always free", () => {
    expect(captureFact("template", "free")).toBe("Always free");
    expect(captureFact("byhand", "pro")).toBe("Always free · Ends set-up");
  });
});

describe("what lost its last reader is deleted, not left", () => {
  it("the lib no longer exports the reveal's copy, the fit tags or the shared primary's label", () => {
    for (const gone of ["capturePrimaryLabel", "TEMPLATE_STEPS", "TEMPLATE_TASTER_NOTE", "HAND_NOTE"]) {
      expect(gone in lib, `${gone} is deleted`).toBe(false);
    }
    const src = readFileSync(resolve(here, "../../lib/captureFork.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/primaryLabel\s*:/);
    expect(src).not.toMatch(/kind:\s*"fit"/);
    expect(src).not.toMatch(/\btags\b/);
  });
});

describe("K3 the confirm names the file, twice, and spends nothing", () => {
  const confirm = (name: string, tier: "free" | "pro" = "free", size: number | null = 14_300) =>
    renderToStaticMarkup(<ConfirmScreen fileName={name} fileSize={size} tier={tier} onChange={noop} onBack={noop} onRead={noop} />).replace(/<!-- -->/g, "");

  it("title, subline, label and primary are the table's", () => {
    expect(CONFIRM_TITLE).toBe("This uses your Smart Import.");
    expect(CONFIRM_SUB).toBe("Nothing is saved until you've checked what we read.");
    const h = confirm("my agents FINAL v3.csv");
    expect(h).toContain(`<h1 class="sf-title">${CONFIRM_TITLE}</h1>`);
    expect(text(h)).toContain("The file you chose");
    expect(h).toMatch(/<button[^>]*data-act="read"[^>]*>Read my file<\/button>/);
    expect(h).toMatch(/<button[^>]*data-act="change"[^>]*>Change<\/button>/);
    expect(h, "no arrow").not.toContain("→");
  });

  it("names the pending file in the row and in the sentence", () => {
    const h = confirm("my agents FINAL v3.csv");
    expect(h).toContain('<b class="sf-filename" data-sf="file-name">my agents FINAL v3.csv</b>');
    expect(h).toContain("We&#x27;ll read <strong>my agents FINAL v3.csv</strong> and show you everything before anything is saved. You confirm what lands.");
    expect(h).toContain('<small class="sf-filesize">14 KB</small>');
    expect(h).toContain(">CSV</span>");
  });

  it("the sentence ends on two sentences now, in both forms", () => {
    const named = confirmFileLead("a.csv");
    expect(named.after).toBe(" and show you everything before anything is saved. You confirm what lands.");
    expect(confirmFileLead("").before).toBe("We'll read your file and show you everything before anything is saved. You confirm what lands.");
  });

  it("states no row count: counting rows would mean reading the file", () => {
    expect(text(confirm("a.csv"))).not.toMatch(/\brows?\b/i);
  });

  it("the note is the tier's", () => {
    expect(confirm("a.csv", "free")).toContain(esc(CONFIRM_NOTE_FREE));
    expect(CONFIRM_NOTE_FREE).toBe("This is your one Smart Import. The template never uses it, so keep it for a spreadsheet you'd rather not retype.");
    expect(confirm("a.csv", "pro")).toContain(esc(CONFIRM_NOTE_PRO));
    expect(CONFIRM_NOTE_PRO, "unchanged").toBe("This is this month's Smart Import. Your next one is available next month.");
  });

  it("sizes and types are stated the way a reader says them", () => {
    expect(fileSizeLabel(14_300)).toBe("14 KB");
    expect(fileSizeLabel(1_300_000)).toBe("1.2 MB");
    expect(fileSizeLabel(null)).toBeNull();
    expect(fileTypeLabel("a.xlsx")).toBe("XLSX");
    expect(fileTypeLabel("a.CSV")).toBe("CSV");
  });

  it("the import flow reads the file only from the confirm's primary", () => {
    const b = readFileSync(resolve(here, "../import/ImportFlow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const calls = [...b.matchAll(/runMapping\(/g)].length;
    expect(calls, "one call site, plus none on mount").toBe(1);
    expect(b).toContain("onRead={() => { if (pendingFile) void runMapping(pendingFile); }}");
    expect(b).not.toMatch(/useEffect\([^)]*runMapping/);
    const pick = b.slice(b.indexOf("const pickFile = (file: File) => {"));
    expect(pick.slice(0, pick.indexOf("\n  };")), "choosing a file reads nothing").not.toContain("runSmartImport");
  });
});
