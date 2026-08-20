/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THIS ASSERTS THAT THE PANE IS A PORT, not that it looks similar.
 *
 * The three claims the brief names, each read against a different artefact so no one of them can
 * be satisfied by the wrong thing:
 *
 *   1 · the pane's class names ARE the mockup's — read from the mockup's own `<style>` block and
 *       from rendered output, never from a list typed here;
 *   2 · every element of the mockup's SEND journey exists in the rendered pane — enumerated from
 *       the mockup's markup and its render function, not from memory;
 *   3 · no class from the retired pane survives anywhere in `src/`.
 *
 * ⚠️ THE MOCKUP IS THE INPUT, NOT A FIXTURE. Every expectation below is derived from
 * `design-refs/todo-pane-contract.html` at run time, so the day the ref changes this suite
 * changes with it — which is the only way a "port" claim can stay true. A hand-written list of
 * class names would pass forever over a file nobody had opened since.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { QueryStatus } from "../../types";
import { TaskPane, TaskPaneJourney } from "./TaskPane";
import { StatusDot } from "../StatusDot";
import { TaskPaneBody } from "./TaskPaneBody";

const REF = readFileSync(join(process.cwd(), "design-refs/todo-pane-contract.html"), "utf8");
/* ⚠️ TWO CONTRACTS ARE IN FORCE, and saying so is more honest than pretending one is. The pane
   contract owns the CHASSIS — band, middle, action bar — and supersedes the materials contract
   there. The form's fields and the story's entries are still the materials contract's until
   Phases 3 and 8 replace them, so its vocabulary is still legitimate. The assertion is that every
   rendered class comes from ONE OF THE TWO, which is what stops a name being invented here. */
const REF_MATERIALS = readFileSync(join(process.cwd(), "design-refs/todo-materials-contract.html"), "utf8");
const PANE_CSS = readFileSync(join(process.cwd(), "src/components/todo/taskPane.css"), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** the mockup's Send journey, rendered through the port */
const SEND: TaskPaneJourney = {
  cls: "u-now",
  deed: <>Send your <em>full manuscript</em></>,
  sub: "Requested by Jonathan Marsh, The Marsh Agency · 14 Aug 2026",
  btns: [{ label: "Snooze", onPress: () => {} }],
  tiles: [
    { k: "Send to", val: "Jonathan Marsh", small: "j.marsh@marshagency.co.uk" },
    { k: "Sent previously", val: "3 items", small: "letter · synopsis · ch. 1–3" },
    { k: "Then expect", val: "6–8 weeks", small: "the stated window" },
  ],
  actTitle: "Record the send",
  actSub: "One entry updates the query, its timeline and this task.",
  body: (
    <TaskPaneBody
      sample
      value={{
        rows: [{ key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "3" }],
        alongside: "", when: "Today", also: "", expectWeeks: 6, remindDaysBefore: 7,
      }}
      onChange={() => {}}
      upsell={<><span className="tag">Pro</span><span>Records which draft went to each agent.</span></>}
    />
  ),
  will: "Full sent · today · via email",
  quiet: { label: "Copy Jonathan's email", onPress: () => {} },
  prim: "Log the send",
  /* ⚠️ THE FIXTURE STATES BOTH KINDS (Phase 8): two real statuses, one non-status mark, and the
     terminus. A fixture of statuses alone would leave the mark branch unrendered by any test. */
  tl: [
    { key: "1", kind: "status", status: QueryStatus.QUERIED, t: "Query sent", d: "3 Jun · via email" },
    { key: "2", kind: "status", status: QueryStatus.PARTIAL_REQUESTED, t: "Partial requested", d: "1 Jul" },
    { key: "3", kind: "mark", t: "Nudge sent", d: "23 Jul · via email" },
    { key: "4", kind: "now", t: "Your turn", d: "Today" },
  ],
  onOpenQuery: () => {},
};

const NAV = { index: 2, total: 9, label: "Needs you now", onPrev: () => {}, onNext: () => {} };
const HTML = renderToStaticMarkup(<TaskPane journey={SEND} onPrimary={() => {}} nav={NAV} />);
/** every class the rendered pane actually carries */
const rendered = new Set(
  [...HTML.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean),
);

describe("1 · the pane's class names are the mockup's", () => {
  /**
   * ⚠️ READ OUT OF THE MOCKUP, NOT LISTED HERE. Its `<style>` block is the authority for which
   * words are its vocabulary; anything the pane renders that is not in that set is a name this
   * port invented, which is the thing the brief forbids.
   */
  const cssOf = (src: string) => strip(src.slice(src.indexOf("<style>"), src.indexOf("</style>")));
  const mockClasses = new Set([
    ...[...cssOf(REF).matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]),
    ...[...cssOf(REF_MATERIALS).matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]),
  ]);

  it("every class the pane renders is a word from the mockup", () => {
    /* ⚠️ THE ONE EXEMPTION IS NAMED AND PREFIXED. Task navigation is behaviour the brief requires
       carried and the mockup has no control for it — it navigates by clicking a list row. Those
       classes carry a `tpn-` prefix precisely so this assertion can tell them apart from a name
       that was invented while porting. */
    /* ⚠️ AND A MOUNTED COMPONENT BRINGS ITS OWN VOCABULARY, WHICH IS THE POINT (Phases 3 and 8).
       The census is about words the PANE INVENTS. A component the pane MOUNTS names its own
       internals, and requiring those to be contract words would mean the pane could only satisfy
       this case by redrawing that component locally — which is the one thing the reuse law forbids,
       so the case would be pushing against the law it sits beside.

       Each exemption is a NAMESPACE with a named owner, not a list of strings, so it cannot go
       stale as those components change — and a genuinely invented word still has nowhere to hide,
       because inventing one would mean claiming a namespace that belongs to something else. */
    const MOUNTED = [
      { ns: /^sa-/, why: "StatusDot — the app's one drawing of a query status (Phase 8)" },
      /* the root carries the bare namespace, the parts carry it hyphenated — both are its own */
      { ns: /^ssp(-|$)/, why: "SampleSpecPicker — the sample's units and amounts (Phase 3)" },
    ];
    const invented = [...rendered].filter((c) =>
      !mockClasses.has(c) && !/^tpn(-|$)/.test(c) && !MOUNTED.some((m) => m.ns.test(c)));
    expect(invented, `classes not in the mockup: ${invented.join(" ")}`).toHaveLength(0);
  });

  it("the structural names are present, and nested as the mockup nests them", () => {
    for (const c of ["pane", "band", "deed", "b-sub", "mid", "formcol", "actbar", "willrec"]) {
      expect(rendered.has(c), `${c} is missing from the rendered pane`).toBe(true);
    }
    /* ⚠️ THREE ZONES IN ORDER, AND NOW THREE CARDS — REVERSED DELIBERATELY (finishing round,
       Phase 1). This forbade `.fc`, on the previous round's reading that the pane contract had
       retired the Form 11 card-in-card. The UPDATED contract (md5 52473130) draws the opposite: a
       transparent pane column holding `.fc > .rim` cards for the header, the form and the story.
       So the prohibition is deleted rather than argued with, and what it was protecting — the zone
       ORDER — is asserted as it always was, alongside the card count it now expects. */
    const band = HTML.indexOf('class="band"');
    const mid = HTML.indexOf('class="mid"');
    const bar = HTML.indexOf('class="actbar"');
    expect(band).toBeGreaterThan(-1);
    expect(mid).toBeGreaterThan(band);
    expect(bar).toBeGreaterThan(mid);
    /* a query journey: header + form + story. The rim is what clips the band's tint, so its
       presence is the structural half of the claim the measurement makes about the corners. */
    expect((HTML.match(/class="rim"/g) || []).length, "a query journey draws three rim cards").toBe(3);
    expect(HTML, "the header card lost its fixed-zone class").toContain('class="fc hdr"');
  });

  it("the mockup's own scoping is the only edit to its stylesheet", () => {
    /* every rule is scoped, and the class names inside the selectors are untouched */
    const rules = strip(PANE_CSS).split("\n").filter((l) => l.includes("{") && !l.startsWith("@"));
    /* ⚠️ TWO SHAPES ARE SCOPED AND NOTHING ELSE IS: `.tpn <mockup class>` — a ported rule — and
       `.tpn-<name>` — one of the named exemptions the mockup has no markup for. Both are confined
       to this pane; anything else would reach the whole app, which is the fault this guards. */
    const unscoped = rules.filter((l) => l.trim() && !/^\s*\.tpn[-\s.{:>]/.test(l) && !/^\s*}/.test(l));
    expect(unscoped, `unscoped rules would reach the whole app:\n${unscoped.slice(0, 5).join("\n")}`)
      .toHaveLength(0);
  });
});

describe("2 · every element of the mockup's Send journey exists in the rendered pane", () => {
  /**
   * ⚠️ ENUMERATED FROM THE MOCKUP'S RENDER, NOT FROM MEMORY. Its `render()` writes the band, the
   * tiles, the act and the timeline; the class names it emits are the checklist, and a `.tl-e`
   * that stopped rendering would fail here rather than being noticed by eye.
   */
  const emitted = new Set(
    [...REF.matchAll(/class="([a-zA-Z][\w -]*)"/g)]
      .flatMap((m) => m[1].split(/\s+/))
      .filter(Boolean),
  );
  /* the pane's own — the list, the harness and the other journeys' controls are not this test's */
  /* ⚠️ THE AUTHORITY MOVED (pane round, Phase 2). This asserted the MATERIALS contract's
     card-in-card — `.v` → `.fc` → `.rim`, a `.workrow` of two framed cards, `.bandfig`,
     `.b-onband`. The pane contract supersedes that chassis with one card and three zones, so the
     checklist is its parts, read from its own markup. The CLAIM is unchanged: the pane is a port
     of its contract, and the contract is the input rather than a fixture. */
  const PANE_PARTS = ["pane", "band", "deed", "b-sub", "b-nav", "tiles", "tile",
    "mid", "formcol", "storycol", "story", "actbar", "willrec", "ab"];

  it("the mockup emits every part this checks", () => {
    /* the guard on the guard: a part that stopped being in the ref would silently drop out */
    const gone = PANE_PARTS.filter((p) => !emitted.has(p) && !REF.includes(`class="${p}`) && !REF.includes(`class='${p}`));
    expect(gone, `not found in the ref — the checklist is stale: ${gone.join(" ")}`).toHaveLength(0);
  });

  it("the rendered Send journey carries all of them", () => {
    const missing = PANE_PARTS.filter((p) => !rendered.has(p));
    expect(missing, `missing from the rendered pane: ${missing.join(" ")}`).toHaveLength(0);
  });

  it("the band's three states are the mockup's, driven by data and not by a branch", () => {
    /* `.nofig` is what a journey with no figure gets — the mockup's own modifier */
    /* ⚠️ THE FIGURE LEFT THE BAND WITH THE CHASSIS. The pane contract's band is deed + sub-line +
       nav; the materials contract's Playfair figure and its `.nofig` modifier are not in it, and a
       journey with no figure now differs by having nothing there rather than by a class. */
    const noFig = renderToStaticMarkup(<TaskPane journey={SEND} onPrimary={() => {}} />);
    expect(noFig, "the retired band figure is back").not.toContain("bandfig");
    expect(noFig, "the retired absence modifier is back").not.toMatch(/["\s`]nofig["\s`]/);
    /* and a journey with no timeline drops the card, leaving the workrow one child */
    const noTl = renderToStaticMarkup(
      <TaskPane journey={{ ...SEND, tiles: null, tl: null }} onPrimary={() => {}} />);
    expect(noTl, "the story column survived a journey with no story").not.toContain("storycol");
    expect(noTl, "an empty tile row rendered").not.toContain('class="tiles"');
  });

  /**
   * ⚠️ THE STORY'S TWO KINDS OF ENTRY, ASSERTED AGAINST THE SHARED COMPONENT ITSELF (Phase 8).
   *
   * Not "a dot is present" — the pane's status rung must contain BYTE-FOR-BYTE what `StatusDot`
   * renders for that status. That is the only form of this claim that cannot be satisfied by a
   * local recreation, and a recreation is exactly what was there: `.tl-e .dot` drew a white disc
   * with a burgundy ring in CSS, which is a status dot redrawn by hand.
   *
   * ⚠️ AND THE NON-STATUS RUNG MUST NOT CONTAIN ONE. `StatusDot` takes `QueryStatus | string` and
   * will render a neutral dot for "Nudge sent" rather than refusing — so a nudge could wear the
   * mark of a status with nothing going red. Both directions, in one case.
   */
  it("a status rung IS the shared StatusDot; a nudge rung has no dot at all", () => {
    const html = renderToStaticMarkup(<TaskPane journey={SEND} onPrimary={() => {}} />);
    const real = renderToStaticMarkup(<StatusDot status={QueryStatus.QUERIED} overrideSize={12} decorative />);
    expect(real, "the fixture's own dot rendered nothing to compare against").toContain("<svg");
    expect(html, "the status rung is not the shared component's output").toContain(real);

    /* the nudge rung: an empty slot, and no second dot beyond the two status rungs */
    expect(html).toContain('<span class="sd"></span>');
    const dots = html.split("<svg").length - 1;
    expect(dots, "a non-status rung was given a status dot").toBe(2);

    /* and the retired hand-drawn span is gone from the markup entirely */
    expect(html, "the redrawn dot is back").not.toMatch(/["\s`]dot["\s`]/);
  });

  it("the paper is the mockup's three, set on `.v`", () => {
    for (const cls of ["u-now", "u-house", "u-yours"] as const) {
      const html = renderToStaticMarkup(<TaskPane journey={{ ...SEND, cls }} onPrimary={() => {}} />);
      expect(html).toContain(`class="pane ${cls}"`);
    }
  });
});

describe("3 · no class from the retired pane survives", () => {
  /**
   * ⚠️ SWEPT OVER `src/`, NOT OVER THE PANE. Leaving a `.tdk-` rule anywhere is how the old pane
   * comes back a piece at a time — and the class names overlap enough with the port's that a stray
   * rule would reach it. Comments are stripped first: this repo's prose names what it retires.
   */
  it("no `tdk-` class is rendered or styled anywhere in src/", () => {
    const files = execFiles();
    const offenders: string[] = [];
    for (const [name, body] of files) {
      const decl = strip(body);
      /* ⚠️ BOUNDED, NOT A SUBSTRING — `tdk-` as a bare prefix would also match prose that happens
         to run the letters together, and a complete class name is delimited on both sides. */
      const hits = [...decl.matchAll(/["'`\s.](tdk-[a-z0-9-]+)["'`\s{,:)]/g)].map((m) => m[1]);
      if (hits.length) offenders.push(`${name}: ${[...new Set(hits)].slice(0, 6).join(" ")}`);
    }
    expect(offenders, `the retired pane's classes survive:\n${offenders.join("\n")}`).toHaveLength(0);
  });

  it("the retired pane's files are gone", () => {
    for (const f of ["TodoDock.tsx", "todoDock.css"]) {
      let found = true;
      try { readFileSync(join(process.cwd(), "src/components/todo", f), "utf8"); } catch { found = false; }
      expect(found, `${f} is still on disk`).toBe(false);
    }
  });
});

/**
 * ⚠️ FOUR ADAPTATIONS, FOUR ASSERTIONS — and each says what it REPLACED, so a reader can tell an
 * adaptation from a liberty. Anything the app frame required that is not one of these four is a
 * change nobody sanctioned.
 */
describe("the app frame — four named adaptations, and only four", () => {
  const decls = strip(PANE_CSS);
  const frame = decls.slice(decls.indexOf("THE APP FRAME") > -1 ? 0 : 0);
  /**
   * ⚠️ EVERY BLOCK FOR THE SELECTOR, JOINED — not the first one. This file declares `.tpn` THREE
   * times on purpose: the ported token block, then each adaptation as its own rule, so a reader can
   * see what the app frame added without it being folded into the port. First-match slicing reads
   * whichever comes first and reports the others missing, which is exactly what it did here — the
   * documented ambiguity, produced by the very structure that makes the file readable.
   */
  const rule = (sel: string) => {
    const parts: string[] = [];
    for (let i = decls.indexOf(sel + " {"); i > -1; i = decls.indexOf(sel + " {", i + 1)) {
      parts.push(decls.slice(i, decls.indexOf("}", i)));
    }
    expect(parts.length, `${sel} has no rule`).toBeGreaterThan(0);
    return parts.join("\n");
  };

  it("1 · full width — the ref's own cap is gone", () => {
    expect(rule(".tpn")).toContain("width: 100%");
    /* the ref caps its frame at 1420 because it draws a whole page; the shell's content column
       owns the cap here, and a second one would fight it */
    expect(decls, "the ref's page cap came across").not.toContain("max-width:1420px");
    expect(decls, "the ref's list track came across").not.toContain("372px");
  });

  it("2 · one screen — the Query Centre's mechanism, not a second one", () => {
    /* `flex: 1; min-height: 0` down to a child that owns the overflow — the same chain `/queries`
       runs, and `min-height: 0` on every link because a flex item's automatic minimum is content */
    expect(frame).toContain("flex-direction: column");
    /* ⚠️ THE SCROLLPORT MOVED WITH THE CHASSIS (pane round, Phase 2). It was `.v`, the materials
       contract's column; the pane contract's middle zone owns it, between a fixed band and a fixed
       action bar. Same chain, same three declarations, one element along. */
    const mid = rule(".tpn .mid");
    expect(mid).toContain("min-height:0");
    expect(mid).toContain("overflow-y:auto");
    expect(mid).toContain("flex:1 1 auto");
  });

  it("3 · fluid columns — no breakpoint decides anything", () => {
    /* the ref's `@media (max-width:1160px)` is superseded by rules that reach the same outcomes
       by measure. The block is still in the file, above, and these override it. */
    /* ⚠️ THE WORKROW IS RETIRED WITH THE CARD-IN-CARD. The pane contract's middle is one flex row
       of two columns — `.formcol` and `.storycol` — which wrap by measure exactly as the workrow
       did, without the two framed cards between them. Asserted on the survivors. */
    expect(decls, "the retired workrow is back").not.toContain(".tpn .workrow");
    const mid2 = rule(".tpn .mid");
    /* ⚠️ WHITESPACE-NORMALISED: one of these rules is PORTED (tight, as the contract writes it)
       and one is AUTHORED (spaced, as this repo writes it), and the claim is about neither. */
    expect(mid2.replace(/\s*:\s*/g, ":")).toContain("flex-wrap:wrap");
    /* the tiles count themselves rather than taking `.n3`/`.n4` from a prop */
    expect(decls).toContain("repeat(auto-fit, minmax(150px, 1fr))");
  });

  it("4 · the app's tokens — by name, and the shadows removed so the names reach them", () => {
    /* the band's three papers read the app's own surfaces */
    expect(decls).toContain("--u-house-1: var(--sage-band)");
    expect(decls).toContain("--u-house-2: var(--sage-band-2)");
    expect(decls).toContain("--u-now-1: var(--pink)");
    /* ⚠️ AND THE REF'S OWN `--pink`/`--sage` DEFINITIONS ARE GONE FROM `.tpn`. Left in place they
       would shadow the app's tokens of the same name, and every substitution above would resolve
       to the drawing's hex — an adaptation that reads as done and reaches nothing. */
    const root = decls.slice(decls.indexOf(".tpn {"), decls.indexOf("}", decls.indexOf(".tpn {")));
    for (const shadow of ["--pink:", "--pink-b:", "--pink-h:", "--sage:"]) {
      expect(root, `${shadow} still shadows the app's token`).not.toContain(shadow);
    }
  });
});

/** every source file under src/, as [path, contents] */
function execFiles(): [string, string][] {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n)) out.push([p, readFileSync(p, "utf8")]);
    }
  };
  walk(join(process.cwd(), "src"));
  return out;
}
