/**
 * The dead ends of "Your list" (onboarding v5, part 1): chip, title, text and actions per state.
 * Which press calls which handler is held on the rendered page with spies (onbV5.measure.ts, E1).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderToStaticMarkup } from "react-dom/server";
import {
  UsedFree, UsedProMonth, Unreadable, NothingImported, Unloaded,
  CHIP_USED, CHIP_UNREADABLE, CHIP_NOTHING, CHIP_UNLOADED,
  USED_FREE_TITLE, USED_FREE_TEXT, USED_PRO_TITLE, UNREADABLE_TITLE, UNREADABLE_TEXT, NOTHING_TITLE, UNLOADED_TITLE, UNLOADED_TEXT,
} from "./DeadEnd";

const here = dirname(fileURLToPath(import.meta.url));
const noop = () => {};
const r = (n: React.ReactElement) => renderToStaticMarkup(n).replace(/<!-- -->/g, "");
/* Tags become spaces, so a word in <strong> is followed by one before its full stop; closed up. */
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ").replace(/ ([.,:;])/g, "$1").trim();
const buttons = (h: string) => [...h.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/&#x27;/g, "'"));
const OUTCOME = { queriesImported: 0, agentsCreated: 0, agentsMerged: 0, queriesSkipped: 3, errors: ["Row 4: no agent or agency name."] };

const STATES = {
  usedFree: r(<UsedFree onBack={noop} onAddByHand={noop} onUseTemplate={noop} />),
  usedPro: r(<UsedProMonth nextLabel="1 November 2026" onBack={noop} onAddByHand={noop} />),
  unreadable: r(<Unreadable onBack={noop} onAddByHand={noop} onDownload={noop} />),
  nothing: r(<NothingImported outcome={OUTCOME} skippedReasons={["No agent or agency name"]} onBackToReview={noop} />),
  unloaded: r(<Unloaded onAddByHand={noop} onRestart={noop} />),
};

describe("E1 each dead end is one card: chip, title, text, foot", () => {
  it("renders all five (the sweep is not vacuous)", () => {
    expect(Object.keys(STATES)).toHaveLength(5);
    for (const [name, h] of Object.entries(STATES)) {
      expect(h.match(/class="sf-card sf-dead"/g) ?? [], `${name}: one card`).toHaveLength(1);
      expect(h, `${name}: a chip`).toMatch(/class="sf-chip( sf-chip--fail)?"/);
      expect(h, `${name}: no open title above it`).not.toContain("sf-open");
      expect(h, `${name}: no arrow on any control`).not.toMatch(/[→←]/);
    }
  });

  it("Smart Import used, free: leads with the template and offers no Upgrade", () => {
    const h = STATES.usedFree;
    expect(text(h)).toContain(CHIP_USED);
    expect(h).toContain(`<h1 class="sf-deadh">${USED_FREE_TITLE.replace("'", "&#x27;")}</h1>`);
    expect(USED_FREE_TITLE).toBe("You've used your Smart Import.");
    expect(USED_FREE_TEXT).toBe("The template is always free, and reads your sheet exactly. Or add your agents by hand for now.");
    expect(text(h)).toContain(USED_FREE_TEXT);
    expect(buttons(h)).toEqual(["‹ Back", "Add by hand", "Use the template"]);
    expect(text(h)).not.toMatch(/upgrade/i);
    expect(h, "the primary is the template").toMatch(/<button[^>]*class="sf-btn"[^>]*>Use the template<\/button>/);
  });

  it("Smart Import used, Pro's month: the built title, sentence and date", () => {
    const h = STATES.usedPro;
    expect(USED_PRO_TITLE).toBe("Next Smart Import next month");
    expect(text(h)).toContain("You've used this month's Smart Import. Your next one is available on 1 November 2026. You can add agents by hand in the meantime.");
    expect(buttons(h)).toEqual(["‹ Back", "Add them by hand"]);
  });

  it("file couldn't be read: a failure chip, and no claim about whether the import was spent", () => {
    const h = STATES.unreadable;
    expect(h).toContain(`<p class="sf-chip sf-chip--fail" data-sf="chip">${CHIP_UNREADABLE.replace("'", "&#x27;")}</p>`);
    expect(UNREADABLE_TITLE).toBe("We couldn't read that one.");
    expect(UNREADABLE_TEXT).toBe("Use the template, or add your agents by hand. Nothing has been saved.");
    expect(text(h)).not.toMatch(/hasn't been used|has not been used|wasn't used|still have your/i);
    expect(buttons(h)).toEqual(["‹ Back", "Add by hand", "Download the template"]);
  });

  it("nothing imported: the built counts, skipped line and errors, and one way on", () => {
    const h = STATES.nothing;
    expect(h).toContain(`<p class="sf-chip sf-chip--fail" data-sf="chip">${CHIP_NOTHING}</p>`);
    expect(NOTHING_TITLE).toBe("That didn't work.");
    expect(text(h)).toContain("0 queries imported · 0 agents added");
    expect(text(h)).toContain("3 rows were skipped: no agent or agency name.");
    expect(text(h)).toContain("Row 4: no agent or agency name.");
    expect(buttons(h)).toEqual(["Back to the review"]);
  });

  it("step didn't load: neutral chip, the built reassurance without its instruction", () => {
    const h = STATES.unloaded;
    expect(h).toContain(`<p class="sf-chip" data-sf="chip">${CHIP_UNLOADED.replace("'", "&#x27;")}</p>`);
    expect(UNLOADED_TITLE).toBe("That step didn't load.");
    expect(UNLOADED_TEXT).toBe("Something didn't load on our side. Your file hasn't been imported and nothing has been saved.");
    expect(buttons(h)).toEqual(["Add by hand", "Start this step again"]);
  });

  it("no verdict words, and nothing congratulates", () => {
    const all = Object.values(STATES).map(text).join(" ");
    for (const w of [/\boops\b/i, /\bsorry\b/i, /\bfailed\b/i, /\bwrong\b/i, /\bgreat\b/i, /\bcongrat/i, /\bwell done\b/i, /\bunfortunately\b/i]) {
      expect(all, String(w)).not.toMatch(w);
    }
  });
});

describe("E1 BranchB wires each dead end to the built routes", () => {
  /* Part 3: the dead ends are drawn by ImportFlow now. "Back to the fork" is toStart(): the flow
     goes idle, and BranchB shows the fork whenever the flow is idle. Both halves are asserted. */
  const branchOnly = readFileSync(resolve(here, "BranchB.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const b = readFileSync(resolve(here, "../import/ImportFlow.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const o = readFileSync(resolve(here, "../Onboarding.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

  /* RE-POINTED (onboarding v9): the fork rings no tile, so BranchB has nothing to set on the way back. */
  it("'Use the template' returns to the fork", () => {
    expect(b).toContain('onUseTemplate={() => { setBlocked(null); onUseTemplate?.(); toStart(); }}');
    expect(branchOnly).not.toContain("setImportOption");
    expect(b).toContain('const toStart = () => { setScreen("idle"); onBackToStart?.(); };');
    expect(branchOnly).toContain('{flowScreen === "idle" && (');
  });
  it("the upgrade exit is gone from set-up: no prop, no caller, no hatch", () => {
    expect(b).not.toContain("onUpgrade");
    expect(branchOnly).not.toContain("onUpgrade");
    expect(o).not.toContain("onUpgrade");
    expect(o).not.toContain('"plans"');
  });
  it("'Start this step again' and the unreadable Back both return to the fork", () => {
    expect(b).toContain('<Unloaded onAddByHand={onAddByHand} onRestart={() => toStart()} />');
    expect(b).toMatch(/<Unreadable\s+onBack=\{\(\) => toStart\(\)\}/);
  });
  it("'Back to the review' returns to the review, and by-hand is the parent's handler everywhere", () => {
    expect(b).toContain('onBackToReview={() => setScreen("review")}');
    expect(((b + branchOnly).match(/onAddByHand=\{onAddByHand\}/g) ?? []).length).toBeGreaterThanOrEqual(5);
  });
  it("the old card is no longer drawn by any screen in BranchB", () => {
    for (const file of [b, branchOnly]) {
      expect(file).not.toContain("OnboardingCard");
      expect(file).not.toContain("SelectRow");
    }
  });
});

/* Onboarding v5 part 2, phase 0 — one template file. */
describe("the unreadable-file card hands out the fork's template", () => {
  const branch = readFileSync(resolve(process.cwd(), "src/components/import/ImportFlow.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  it("calls downloadTemplate(TEMPLATE_FILENAME), as the fork does", () => {
    expect(branch).toContain("downloadTemplate(TEMPLATE_FILENAME)");
  });
  it("and no longer names the three-tab workbook", () => {
    expect(branch).not.toContain("pipeline-import-template");
  });
});
