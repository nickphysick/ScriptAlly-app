/**
 * "Your list": two doors (two-door import v1) — and the confirm.
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
  CaptureOption, CAPTURE_OPTIONS, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_SUB,
  CAPTURE_QUIET_LINE, CAPTURE_QUIET_LINK, captureFact, acceptsDroppedFile,
} from "../../lib/captureFork";
import { CaptureFork } from "./CaptureFork";
import {
  ConfirmScreen, CONFIRM_TITLE, CONFIRM_SUB, HOW_EYEBROW, HOW_STEPS, fileSizeLabel, fileTypeLabel,
} from "./ConfirmScreen";
import { confirmFileLead } from "../../lib/smartImportConfirm";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const noop = () => {};
const fork = (_was?: CaptureOption) =>
  renderToStaticMarkup(
    <CaptureFork onChooseFile={noop} onDropFile={noop} onUsePhotos={noop} onDropPhotos={noop}
                 onBack={noop} onNothingYet={noop} onDownloadTemplate={noop} />,
  ).replace(/<!-- -->/g, "");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

/* REWRITTEN (two-door import v1): "Your list" is two doors. The template tile, the by-hand tile, the
   "I've nothing to capture yet" link and the matcher footnote are gone; the template is a file the
   picker recognises (lib/importReadRoute), offered here only as the quiet headings line. */
describe("W1 the fork's words (two-door import v1)", () => {
  it("the heading and subline are the mock's, verbatim", () => {
    expect(CAPTURE_HEADING).toBe("How shall we capture your list?");
    expect(CAPTURE_SUB).toBe("Bring the list you already keep, or start a new one here.");
    const h = fork();
    expect(h).toContain(`<h1 class="sf-title">${esc(CAPTURE_HEADING)}</h1>`);
    expect(h).toContain(`<p class="sf-sub">${esc(CAPTURE_SUB)}</p>`);
  });

  it("two doors, in order, with the table's titles and bullets", () => {
    expect(CAPTURE_OPTIONS).toEqual(["list", "fresh"]);
    expect(CAPTURE_OPTIONS.map((k) => CAPTURE_CHOICES[k].title)).toEqual(["I have a list", "I'm starting fresh"]);
    expect(CAPTURE_CHOICES.list.lines).toEqual(["A spreadsheet, a document, or a photo of your notebook", "Smart Import reads it into your database", "You answer a few questions, only where it matters"]);
    expect(CAPTURE_CHOICES.fresh.lines).toEqual(["Add agents as you find them", "Log each query when you send it", "Nothing to prepare"]);
    expect(fork().match(/<li>/g) ?? []).toHaveLength(6);
  });

  it("each door's buttons and the caption carry the table's words", () => {
    const h = fork();
    for (const label of ["Upload a file", "Use photos", "Take me to my dashboard", "Download the headings"]) {
      expect(h).toMatch(new RegExp(`<button[^>]*>${label}</button>`));
    }
    expect(text(h)).toContain("It doesn't need tidying first.");
    expect(h, "the three-tile buttons are gone").not.toMatch(/Import a spreadsheet|Download the template|Upload my sheet|Add an agent/);
  });

  it("the quiet line under the doors: one sentence and one link", () => {
    expect(CAPTURE_QUIET_LINE).toBe("Keeping your list in a spreadsheet? Use our column headings and it's read straight in.");
    expect(CAPTURE_QUIET_LINK).toBe("Download the headings");
    const h = fork();
    const at = h.indexOf('data-sf="quiet"');
    expect(at).toBeGreaterThan(h.indexOf('data-tile="fresh"'));
    expect(text(h)).toContain(CAPTURE_QUIET_LINE);
  });

  it("the old exits are gone from the fork", () => {
    const t = text(fork());
    expect(t).not.toContain("I've nothing to capture yet");
    expect(t).not.toMatch(/match them up yourself|unusual columns/);
    for (const gone of ["CAPTURE_LATER", "CAPTURE_ESCAPE_PREFIX", "CAPTURE_ESCAPE_LINK", "CAPTURE_ESCAPE_SUFFIX", "CAPTURE_TEMPLATE_UPLOAD", "CAPTURE_HAND_ACTION"]) {
      expect(gone in lib, `${gone} is deleted`).toBe(false);
    }
  });

  it("never grades the writer, and never congratulates", () => {
    const all = text(fork());
    for (const word of [/\brecommended\b/i, /\bbest for\b/i, /\bgreat\b/i, /\bwell done\b/i, /\bperfect\b/i, /\beasy\b/i, /\bsimply\b/i]) {
      expect(all, String(word)).not.toMatch(word);
    }
  });
});

describe("K1 two doors, one filled navy button, no ring (lock D1's unit half)", () => {
  it("draws two doors and no radio group", () => {
    const h = fork();
    expect(h.match(/<section class="sf-tile /g) ?? []).toHaveLength(2);
    expect(h).not.toContain('role="radio"');
    expect(h).not.toContain("aria-pressed");
  });

  it("exactly one filled button: Upload a file; every other button is a line or a link", () => {
    const buttons = [...fork().matchAll(/<button[^>]*class="([^"]*)"[^>]*>([^<]*)<\/button>/g)];
    const filled = buttons.filter((m) => /\bsf-btn\b/.test(m[1]) && !/sf-btn--line/.test(m[1]));
    expect(filled.map((m) => m[2])).toEqual(["Upload a file"]);
  });

  it("no door is ringed on arrival, and each opens on its illustration slot", () => {
    const h = fork();
    expect(h).not.toContain("is-ringed");
    expect([...h.matchAll(/data-slot="fork-(\w+)"/g)].map((m) => m[1])).toEqual(["list", "fresh"]);
  });

  it("every button is live", () => {
    expect(fork()).not.toMatch(/<button[^>]*disabled/);
  });

  it("a drop is taken only for a type the picker offers", () => {
    for (const ok of ["agents.csv", "My Agents.XLSX", "old.xls"]) expect(acceptsDroppedFile(ok), ok).toBe(true);
    for (const no of ["agents.pdf", "notes.txt", "csv", "sheet.numbers"]) expect(acceptsDroppedFile(no), no).toBe(false);
  });

  it("door one takes a dropped file itself", () => {
    const src = readFileSync(resolve(here, "CaptureFork.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/onDrop: \(e\) =>/);
    expect(src).toMatch(/<Door option="list"[^>]*drop=\{dropProps\}/);
    expect(src).toMatch(/classifyDrop\(Array\.from\(e\.dataTransfer\?\.files \?\? \[\]\)\)/);
    expect(src).toMatch(/if \(drop\.kind === "sheet"\) onDropFile\(drop\.file\)/);
    expect(src).toMatch(/else if \(drop\.kind === "photos"\) onDropPhotos\(drop\.files\)/);
  });

  it("BranchB wires each press to its own handler, and door two to what 'nothing yet' did", () => {
    const b = readFileSync(resolve(here, "BranchB.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const f = readFileSync(resolve(here, "../import/ImportFlow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const at = b.indexOf("<CaptureFork");
    expect(at).toBeGreaterThan(-1);
    const call = b.slice(at, b.indexOf("/>", at));
    expect(call).toContain("onChooseFile={() => flowRef.current?.chooseFile()}");
    expect(f).toContain("chooseFile: () => fileInputRef.current?.click(),");
    expect(call).toContain("onDropFile={(f) => flowRef.current?.dropFile(f)}");
    expect(f).toContain("dropFile: pickFile,");
    expect(call).toContain("onNothingYet={onSkip}");
    expect(call).not.toMatch(/onUploadTemplate|onAddByHand|onOpenImportDesk/);
    expect(f).toMatch(/data-picker="smart"[\s\S]*?pickFile\(f\)/);
  });
});

describe("K2 the fact line states cost — one Smart Import per account (plan rules v1)", () => {
  it("door one states the one import; door two has no fact line", () => {
    expect(captureFact("list")).toBe("Uses your one Smart Import");
    expect(fork()).toContain('<p class="sf-fact" data-fact="list">Uses your one Smart Import</p>');
    expect(fork()).not.toContain('data-fact="fresh"');
  });
});

describe("K3 the confirm names the file, twice, and spends nothing", () => {
  const confirm = (name: string, _tier: "free" | "pro" = "free", size: number | null = 14_300) =>
    renderToStaticMarkup(<ConfirmScreen fileName={name} fileSize={size} onChange={noop} onBack={noop} onRead={noop} />).replace(/<!-- -->/g, "");

  it("title, subline, label and primary are the table's", () => {
    expect(CONFIRM_TITLE).toBe("Let QueryHawk Smart Import take it from here.");
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
    expect(text(confirm("a.csv"))).not.toMatch(/\d[\d,]*\s+rows?\b/i);
  });

  /* RE-POINTED (onboarding v9): this screen no longer says what the import costs. The tile's fact
     line (K2) and the already-used state still do. */
  it("carries no one-shot note, for either tier", () => {
    for (const tier of ["free", "pro"] as const) {
      const seen = text(confirm("a.csv", tier)).replace(/&#x27;/g, "'");
      expect(seen).not.toMatch(/your one Smart Import|this month's Smart Import/);
      expect(confirm("a.csv", tier)).not.toContain("sf-note");
    }
  });

  it("says what happens next, in three steps", () => {
    expect(HOW_EYEBROW).toBe("What happens next");
    expect(HOW_STEPS.map((s) => [s.title, s.line])).toEqual([
      ["Your sheet, as it is", "Any layout, any wording. Nothing to tidy first."],
      ["QueryHawk reads every row", "Agents, queries, dates and statuses, sorted into place."],
      ["You check what lands", "Anything unclear is asked about. Nothing is saved until you say so."],
    ]);
    expect(confirm("a.csv").match(/data-slot="handoff-/g) ?? []).toHaveLength(3);
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
