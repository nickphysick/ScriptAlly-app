/**
 * OB2 · W1 — the import's words.
 * Every "Becomes" string of the pack's Words table is held here as a literal and found on its
 * rendered screen; every "Not changed" constant is found verbatim, from its own module.
 * Named mutation: paraphrase `dupNoteMerged`.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ImportOverview } from "./ImportOverview";
import { SmartImportReview, duplicatesTitle, DUPLICATES_SUB, REVIEW_PRIMARY, importPrimary, GUIDE, GUIDE_EYEBROW, DUP_FAQS, AGENT_FAQS } from "./SmartImportReview";
import { DupeMerged } from "./reviewRows";
import { SkipSetupConfirm, SKIP_ASK } from "./SkipSetupConfirm";
import { READY_TXT } from "./ScatterSettleLoader";
import { IMPORTING_HEAD, IMPORTING_DONE_LINE, IMPORTING_MESSAGES } from "./ImportingLoader";
import { REVIEW_FIXTURE, REVIEW_FIXTURE_DUPES, REVIEW_FIXTURE_CLEAR } from "./SmartImportReviewFixture";
import { TIER_TEXT, TIER_NAME, SUMMARY_TITLE, SUMMARY_PRIMARY, stepCaption, IMPORT_STEP_LABEL } from "../../lib/importSummary";
import { dupNoteMerged, dupNoteOpen, dupNoteKept, keepBothLabel, keptClusterLabel, MAPPING_NOTE, parseModel } from "../../lib/smartImportReviewModel";
import { noticeHeadline, noticeWhy, noticeToggle, NOTICE_DISMISS, NO_NAME_REASON } from "../../lib/importNotice";

const text = (el: React.ReactElement): string =>
  renderToStaticMarkup(el).replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ");
const noop = () => {};
const overview = (r: typeof REVIEW_FIXTURE) => text(<ImportOverview result={r} manuscriptTitle="The Salt Road" fileName="queries.csv" rowCount={24} onContinue={noop} />);
const review = (r: typeof REVIEW_FIXTURE) => text(<SmartImportReview result={r} manuscriptTitle="The Salt Road" onBack={noop} error={null} onImport={noop as never} />);

describe("W1 · the words that changed, as literals, on their screens", () => {
  it("the reading loader ends on Ready", () => { expect(READY_TXT).toBe("Ready"); });

  it("the summary", () => {
    const t = overview(REVIEW_FIXTURE_DUPES);
    expect(SUMMARY_TITLE).toBe("We've read your file.");
    expect(t).toContain("We've read your file.");
    expect(t).toContain("Most of it's ready to go. ");
    expect(t).toContain("for your contact list");
    expect(t).toMatch(/for\s+The Salt Road/);
    expect(t).toContain("with agents");
    expect(t).toContain("Step 1");
    expect(overview(REVIEW_FIXTURE)).toContain("Optional");
    expect(t).toContain("Let's work through it");
    for (const gone of ["Top tip", "Why sharpen", "Skip setup", "→", "Here's what we found"]) expect(t).not.toContain(gone);
    for (const l of ["Duplicates", "Agents", "Queries", "Import"]) expect(t).toContain(l);
    expect(Object.values(IMPORT_STEP_LABEL)).toEqual(["Duplicates", "Agents", "Queries", "Import"]);
    const clear = overview(REVIEW_FIXTURE_CLEAR);
    expect(clear).toContain("It all read cleanly. Your history's ready to come straight in.");
    expect(clear).toContain("Bring it in");
    expect(SUMMARY_PRIMARY).toEqual({ work: "Let's work through it", clear: "Bring it in" });
  });

  it("the tier sentences and the stepper captions", () => {
    expect(TIER_TEXT.agentsReady).toBe("Read cleanly. Good to import as they are.");
    expect(TIER_TEXT.agentsFix(1)).toBe("1 possible duplicate set to merge. Sorted on the duplicates step.");
    expect(TIER_TEXT.agentsFix(3)).toBe("3 possible duplicate sets to merge. Sorted on the duplicates step.");
    expect(TIER_TEXT.agentsSharpen({ noAgency: 2, openMapping: true })).toBe("2 could use an agency, plus the odd detail to confirm. Nothing's lost without one.");
    expect(TIER_TEXT.agentsSharpen({ noAgency: 2, openMapping: false })).toBe("2 could use an agency. Nothing's lost without one.");
    expect(TIER_TEXT.agentsSharpen({ noAgency: 0, openMapping: true })).toBe("A detail or two to confirm. Each one sharpens your tracking.");
    expect(TIER_TEXT.queriesReady).toBe("Dates read, statuses clear. Good to import as they are.");
    expect(TIER_TEXT.queriesSharpen).toBe("A few dates to confirm and statuses to clarify. Each one makes your tracking sharper.");
    const n = { sets: 1, agentsOpen: 3, queriesOpen: 0 };
    expect(stepCaption("duplicates", n)).toBe("1 set");
    expect(stepCaption("duplicates", { ...n, sets: 4 })).toBe("4 sets");
    expect(stepCaption("agents", n)).toBe("3 optional");
    expect(stepCaption("queries", n)).toBe("Ready to go");
    expect(stepCaption("import", n)).toBe("You confirm");
    const t = overview(REVIEW_FIXTURE);
    expect(t).toContain(TIER_TEXT.queriesSharpen);
  });

  it("the duplicates step", () => {
    expect(duplicatesTitle(0)).toBe("All duplicates sorted.");
    expect(duplicatesTitle(1)).toBe("One agent looks like they came in twice.");
    expect(duplicatesTitle(4)).toBe("Four agents look like they came in twice.");
    expect(duplicatesTitle(12)).toBe("Twelve agents look like they came in twice.");
    expect(duplicatesTitle(13)).toBe("13 agents look like they came in twice.");
    const t = review(REVIEW_FIXTURE_DUPES);
    expect(t).toMatch(/agents? looks? like they came in twice\./);
    expect(t).toContain("Keep one row and its queries combine. Nothing is lost.");
    expect(DUPLICATES_SUB).toBe("Keep one row and its queries combine. Nothing is lost.");
    expect(t).toContain("Possible repeats");
    expect(t).toMatch(/\d+ sets?/);
    expect(t).toContain("How this step works");
    expect(t).toContain("Same agent, twice?");
    expect(t).toContain("Remove the duplicate and its queries move onto the one you keep. Different people? Keep them both.");
    expect(t).toContain("Questions");
    expect(t).not.toContain("FAQs");
    expect(t).toContain("Review all agents");
    expect(t).not.toContain("→");
  });

  it("the agents step", () => {
    const t = review(REVIEW_FIXTURE);
    expect(t).toContain("agents for your contact list");
    expect(t).toContain("Add as much or as little detail as you like.");
    expect(t).toContain("Agents from your file");
    expect(t).toMatch(/\d+ ready/);
    expect(t).toMatch(/\d+ to sharpen/);
    expect(t).toContain("Anything marked needs a quick look.");
    expect(t).toContain("It might be missing the agency's name. Check those, add any detail you can, then we'll move on to your queries.");
    expect(t).toContain("Continue to queries");
    expect(t).toContain("No agency name");
    for (const gone of ["Populating your agent database", "Before you review", "Data captured", "in pink", "Ready to import", "→"]) expect(t).not.toContain(gone);
  });

  it("the queries step's words, and the primaries", () => {
    expect(GUIDE.queries).toEqual({ head: "Dates drive your reminders.", text: "A sent date lets QueryHawk tell you when a nudge is due. Where we couldn't be sure, we've asked rather than guessed." });
    expect(GUIDE_EYEBROW).toBe("How this step works");
    expect(REVIEW_PRIMARY).toEqual({ duplicates: "Review all agents", agents: "Continue to queries" });
    expect(importPrimary(12, 3)).toBe("Import 12 agents · 3 to sharpen");
    expect(importPrimary(1, 2)).toBe("Import 1 agent · 2 to sharpen");
    expect(importPrimary(5, 0)).toBe("Import and get started");
  });

  it("leaving mid-review", () => {
    const t = text(<SkipSetupConfirm onKeep={noop} onSkip={noop} />);
    expect(t).toContain("Skip set-up for now?");
    expect(t).toContain("Nothing from this file has been saved yet. You can import a spreadsheet or add agents by hand any time from the Import page.");
    expect(t).toContain("Keep setting up");
    expect(t).toContain("Skip for now");
    expect(SKIP_ASK.title).toBe("Skip set-up for now?");
  });

  it("the skipped-rows line", () => {
    expect(noticeHeadline(3)).toBe("3 rows from your file weren't imported.");
    expect(noticeHeadline(1)).toBe("1 row from your file wasn't imported.");
    const row = (reason: string) => ({ label: "Row", reason });
    expect(noticeWhy({ count: 2, rows: [row(NO_NAME_REASON), row(NO_NAME_REASON)] } as never)).toBe("They had no agent or agency name.");
    expect(noticeWhy({ count: 1, rows: [row(NO_NAME_REASON)] } as never)).toBe("It had no agent or agency name.");
    expect(noticeWhy({ count: 2, rows: [row(NO_NAME_REASON), row("other")] } as never)).toBeNull();
    expect([noticeToggle(2, false), noticeToggle(2, true), noticeToggle(1, false), noticeToggle(1, true)]).toEqual(["Show the rows", "Hide the rows", "Show the row", "Hide the row"]);
    expect(NOTICE_DISMISS).toBe("Dismiss");
  });
});

describe("W1 · the words that did not change, verbatim from their modules", () => {
  it("the duplicate cards' sentences", () => {
    expect(dupNoteMerged).toBe("Merged the duplicate in — its queries moved across, nothing lost.");
    const model = parseModel(REVIEW_FIXTURE_DUPES);
    const [keeper, absorbed] = model.agents;
    const merged = text(<DupeMerged keeper={keeper} bars={[absorbed]} queries={2} movedCount={() => 1} onUndo={noop} />);
    expect(merged).toContain("Merged the duplicate in — its queries moved across, nothing lost.");
    expect(dupNoteOpen("Hale House")).toBe("Looks like the same agent at Hale House, imported more than once — remove the duplicate, or keep both.");
    expect(dupNoteKept("Hale House")).toBe("Kept both — separate agents at Hale House.");
    expect(keepBothLabel(2)).toBe("They're different — keep both");
    expect(keepBothLabel(3)).toBe("They're all different — keep them all");
    expect(keptClusterLabel(2)).toBe("Kept both");
    expect(MAPPING_NOTE).toBe("We weren't fully sure we read this agent's details correctly — worth a quick look.");
    const t = review(REVIEW_FIXTURE_DUPES);
    expect(t).toMatch(/Looks like the same agent( at [^,]+)?, imported more than once — remove the duplicate, or keep both\./);
    expect(t).toMatch(/They're (all )?different — keep (both|them all)/);
  });

  it("the questions, the frame's own controls and the importing loader", () => {
    const dupes = review(REVIEW_FIXTURE_DUPES);
    for (const f of DUP_FAQS) expect(dupes).toContain(f.q);
    const agents = review(REVIEW_FIXTURE);
    for (const f of AGENT_FAQS) expect(agents).toContain(f.q);
    expect(agents).toContain("‹ Back");
    expect(agents).toContain("Reset all changes made here");
    expect(IMPORTING_HEAD).toEqual({ working: "Setting up your dashboard", done: "You're all set" });
    expect(IMPORTING_DONE_LINE).toBe("Opening your dashboard…");
    expect(IMPORTING_MESSAGES).toHaveLength(6);
    expect(TIER_NAME).toEqual({ ready: "Ready to go", fix: "A quick fix", sharpen: "Chances to sharpen" });
  });
});
