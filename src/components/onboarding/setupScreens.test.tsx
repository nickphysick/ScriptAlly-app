/**
 * The set-up steps (onboarding v5, part 1): welcome, readiness, details, the book. Rendered to a
 * string — what is drawn, in what order, and in which words. Geometry and what a press does are on
 * the rendered page (tests/e2e/onbV5.measure.ts, S1–S4).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { WelcomeStageScreen } from "../Onboarding";
import { WELCOME_EYEBROW, WELCOME_LINE, WELCOME_SECOND, welcomeHeading, firstNameOf } from "../../lib/onboardingV9";
import { AckTitle, READINESS } from "./v9/AckTitle";
import { BookMore } from "./v9/BookMore";
import { STILL_WRITING_LEAD, STILL_WRITING_NOTE } from "../../lib/onboardingV9";
import { ManuscriptFields, emptyManuscriptFields } from "./ManuscriptFields";
import { ManuscriptStatus } from "../../types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const render = (node: React.ReactElement) => renderToStaticMarkup(node).replace(/<!-- -->/g, "");
const noop = () => {};
const TITLES = { starting: "Just getting started", early: "A few queries out", deep: "Deep in it", interest: "Had some interest" } as const;
const ack = (stage: keyof typeof TITLES) => render(<AckTitle stage={stage} stageTitle={TITLES[stage]} onChange={noop} onContinue={noop} />);
const book = () => render(<BookMore title="The October Test" name="Lucy Sterling" initial={{ ...emptyManuscriptFields(), ageCategory: "" }} onBack={noop} onContinue={noop} />);

describe("W1 the words on the set-up steps", () => {
  /* RE-POINTED (onboarding v9): the welcome is the navy panel over a card. The open heading, its
     subline and the card's question line are gone; the options and their words are unchanged. */
  it("welcome: the panel's eyebrow, two-line heading with the first name, and line; the built options", () => {
    expect(WELCOME_EYEBROW).toBe("Welcome");
    expect(WELCOME_SECOND).toBe("Let's get you on board.");
    expect(WELCOME_LINE).toBe("To make your set-up as quick as possible, let us know where you are in your querying journey.");
    expect(welcomeHeading("Lucy Sterling")).toEqual(["Welcome to QueryHawk, Lucy.", "Let's get you on board."]);
    expect(welcomeHeading("  ")).toEqual(["Welcome to QueryHawk.", "Let's get you on board."]);
    expect(welcomeHeading(null)[0]).toBe("Welcome to QueryHawk.");
    expect(firstNameOf("Mary-Jane O'Neil")).toBe("Mary-Jane");
    const h = render(<WelcomeStageScreen name="Lucy Sterling" selected={null} onSelect={noop} onContinue={noop} />);
    expect(h).toContain(`<span>Welcome to QueryHawk, Lucy.</span><span>${esc(WELCOME_SECOND)}</span>`);
    expect(h).toContain(esc(WELCOME_LINE));
    expect(h, "no open heading").not.toContain('class="sf-open"');
    expect(h, "the card asks nothing: the panel has").not.toContain("sf-qlab");
    expect(h).not.toContain("Where are you in your querying journey?");
    expect((h.match(/data-o9="slot"/g) ?? []).length, "one illustration slot").toBe(1);
    for (const t of ["Just getting started", "A few queries out", "Deep in it", "Had some interest"]) expect(h).toContain(t);
    for (const d of ["Haven&#x27;t sent any queries yet", "Early days, waiting to hear back", "Lots of queries in flight", "Requests or an offer on the table"]) expect(h).toContain(d);
    expect(h).toMatch(/<button[^>]*class="sf-btn"[^>]*>Continue<\/button>/);
    expect(h, "no arrow on a primary").not.toContain("→");
  });

  /* RE-POINTED (onboarding v9): the readiness screen, the details screen and set-up's use of the
     book step are gone. Step 2 is the acknowledgement and the title (AckTitle), then "Your book"
     (BookMore). "Just getting started" answers readiness on the acknowledgement's own page. */
  it("step 2 opens on the stamp, the passage and the title card", () => {
    const h = ack("early");
    expect(h).toContain("Where you are");
    expect(h).toContain('<b data-o9="stamp-title">A few queries out</b>');
    expect(h).toContain('aria-label="Got it. Your campaign is underway."');
    expect(h).toContain(">Manuscript title</label>");
    expect(h).toContain('placeholder="e.g. The October Test"');
    expect(h).toContain("‹ Back");
    expect(h, "no Title TBC on a querying journey").not.toContain("Title TBC");
    expect(h, "and no readiness question").not.toContain("Your manuscript is…");
  });
  it("Just getting started: Title TBC, the built readiness options, and the new still-writing note", () => {
    const h = ack("starting");
    expect(h).toContain(">Title TBC</button>");
    expect(h).toContain("Your manuscript is…");
    expect(READINESS.map((r) => r.title)).toEqual(["Still being written", "In revision, nearly there", "Ready to query"]);
    expect(READINESS.map((r) => r.desc), "descriptions unchanged").toEqual([
      "I'm partway through the draft.", "Drafted, working through edits.", "Polished and ready to send to agents.",
    ]);
    expect(READINESS.map((r) => r.status), "the stored values are the built ones").toEqual([ManuscriptStatus.DRAFTING, ManuscriptStatus.REVISING, ManuscriptStatus.READY_TO_QUERY]);
    expect(h).toContain(`<strong>${STILL_WRITING_LEAD}</strong> ${esc(STILL_WRITING_NOTE)}`);
  });
  it("Your book: the eyebrow, the title, the byline, the card's heading and its three labels", () => {
    const h = book();
    expect(h).toContain("— Your book —");
    expect(h).toContain('aria-label="The October Test"');
    expect(h).toContain("<span>by Lucy Sterling</span>");
    expect(h).toContain('<h2 class="sf-h">Tell us a bit more about it.</h2>');
    for (const l of [">Genre</span>", ">Age category</span>", "Word count"]) expect(h).toContain(l);
    expect(h).toContain('placeholder="e.g. 85,000"');
    expect(h, "the strapline is no longer asked in set-up").not.toContain("Strapline");
  });
  it("Your book with no name draws no byline", () => {
    expect(render(<BookMore title="The October Test" initial={emptyManuscriptFields()} onBack={noop} onContinue={noop} />)).not.toContain('data-o9="byline"');
  });
});

describe("S2 option groups are radio groups", () => {
  it("each row is a radio with aria-checked, never aria-pressed", () => {
    for (const h of [
      render(<WelcomeStageScreen selected="deep" onSelect={noop} onContinue={noop} />),
      render(<AckTitle stage="starting" stageTitle="Just getting started" initialStatus={ManuscriptStatus.REVISING} onChange={noop} onContinue={noop} />),
    ]) {
      expect(h).toMatch(/<div class="sf-opts" role="radiogroup"/);
      expect(h).not.toContain("aria-pressed");
      expect(h.match(/role="radio"/g)!.length).toBeGreaterThanOrEqual(3);
      expect(h.match(/aria-checked="true"/g) ?? [], "exactly one checked").toHaveLength(1);
    }
  });
  it("Continue is disabled until one is chosen", () => {
    expect(render(<WelcomeStageScreen selected={null} onSelect={noop} onContinue={noop} />)).toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
    expect(render(<WelcomeStageScreen selected="early" onSelect={noop} onContinue={noop} />)).not.toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
    expect(ack("starting"), "no title and no readiness yet").toMatch(/<button[^>]*disabled=""[^>]*>Continue<\/button>/);
  });
  it("the genre pills are a multi-select listbox and the age row is a radio group; nothing is picked on arrival", () => {
    const h = book();
    expect(h).toMatch(/role="listbox" aria-multiselectable="true"/);
    expect(h).toMatch(/class="o9-pills o9-pills--seg" role="radiogroup"/);
    expect(h).not.toContain('aria-selected="true"');
    expect(h).not.toContain('aria-checked="true"');
  });
});

describe("S3 the manuscript fields kept every label, option and placeholder", () => {
  /* The baseline was read off the unchanged component before the first edit of this pack. */
  const was = JSON.parse(readFileSync(resolve(process.cwd(), "reports/onb-v5-setup/baseline/manuscriptFields.json"), "utf8"));
  const read = (html: string) => ({
    labels: [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()),
    placeholders: [...html.matchAll(/placeholder="([^"]*)"/g)].map((m) => m[1]),
    options: [...html.matchAll(/role="option"[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").replace("✓", "").trim()),
    selectPlaceholders: [...html.matchAll(/sa-placeholder[^>]*>([^<]*)</g)].map((m) => m[1].trim()),
    links: [...html.matchAll(/<button[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1].replace(/<[^>]+>/g, "").trim()).filter(Boolean),
  });
  const cases: Record<string, React.ReactElement> = {
    full: <ManuscriptFields value={emptyManuscriptFields()} onChange={noop} />,
    filled: <ManuscriptFields value={{ ...emptyManuscriptFields(), genre: "Fantasy", subGenres: ["Romance"] }} onChange={noop} />,
    stillWriting: <ManuscriptFields value={emptyManuscriptFields()} onChange={noop} titleLabel="Working title" titleOptional showStrapline={false} showWordCount={false} />,
  };
  for (const [name, node] of Object.entries(cases)) {
    it(`${name}: the text sets equal the baseline`, () => {
      const now = read(renderToStaticMarkup(node));
      expect(was[name].options.length, "the baseline holds real options").toBeGreaterThan(10);
      /* the shared age list gained "New Adult" (onboarding v9), between Young Adult and Adult;
         every other label, option and placeholder is the baseline's */
      const withNew = { ...was[name], options: was[name].options.flatMap((o: string) => (o === "Adult" && was[name].options.includes("Young Adult") ? ["New Adult", "Adult"] : [o])) };
      expect(now.options.filter((o: string) => o === "New Adult").length, "New Adult is offered once").toBe(1);
      expect(now).toEqual(withNew);
    });
  }
  it("genre and age category are pick-lists, not free text", () => {
    const h = renderToStaticMarkup(cases.full);
    expect(h.match(/aria-haspopup="listbox"/g)!.length).toBe(2);
    expect(h.match(/<input/g)!.length, "title, strapline and word count are the only inputs").toBe(3);
  });
});
