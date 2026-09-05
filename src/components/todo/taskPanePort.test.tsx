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
import { JOURNEYS } from "../../lib/journeys";
import { StatusDot } from "../StatusDot";
import { TaskPaneBody } from "./TaskPaneBody";
import { requirementsFor } from "../../lib/paneGate";

const REF = readFileSync(join(process.cwd(), "design-refs/todo-actionbar-corrected.html"), "utf8");
/* ⚠️ FOUR CONTRACTS ARE IN FORCE, AND SAYING SO IS MORE HONEST THAN PRETENDING ONE IS.
   `todo-actionbar-corrected` owns the CHASSIS — the split, the fixed zones, the accordion, the
   record card — and supersedes the pane contract there, which superseded the materials contract
   before it. `todo-workspace-final` owns the in-row answers and the Edit affordance. The two older
   files are still the authority for what they still draw: the sample control, the bulk table, the
   note's own words. The assertion is unchanged in kind — every rendered class comes from ONE OF
   THE FOUR, which is what stops a name being invented here — and the day any of them changes, this
   suite changes with it. */
const REF_FINAL = readFileSync(join(process.cwd(), "design-refs/todo-workspace-final.html"), "utf8");
const REF_PANE = readFileSync(join(process.cwd(), "design-refs/todo-pane-contract.html"), "utf8");
const REF_MATERIALS = readFileSync(join(process.cwd(), "design-refs/todo-materials-contract.html"), "utf8");
/* ⚠️ THE FILLING PRIMARY IS ITS OWN CONTRACT (journey round, Phase 7), and it joins the vocabulary
   rather than being exempted from it. `prime`, `fill`, `ready`, `nudge` and `count` are the ref's
   own words; adding the FILE keeps the law intact — every class the pane renders comes from a
   contract — where a hand-written exemption list would have quietly suspended it. */
const REF_PRIMARY = readFileSync(join(process.cwd(), "design-refs/todo-filling-primary.html"), "utf8");
/**
 * ⚠️ THE PANE'S CHASSIS COMES FROM A SIXTH CONTRACT NOW (drawer round, Phase 3). The three floating
 * cards became one sheet beside a quick-reference slip, and that shape is drawn in
 * `todo-fullscreen-final.html` — so `wcol`, `sheet`, `foot`, `qrwrap`, `qr`, `rrim`, `qrtab` and
 * the slip's `x` are contract words, not invented ones. The journey INTERNALS are still the pane
 * contract's; this file is a composition of two refs and says so rather than pretending one
 * covers both. Both are on `check-design-refs.mjs`'s watchlist, so neither can drift under it.
 */
const REF_DRAWER = readFileSync(join(process.cwd(), "design-refs/todo-fullscreen-final.html"), "utf8");
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
  body: (
    <TaskPaneBody
      /* ⚠️ THE FIXTURE'S LEDGER IS THE DECLARATION'S OWN, NOT A HAND-WRITTEN ROW LIST (workspace
         round, Phase 3). `requirementsFor("send")` is what the real session passes down, so a
         literal here would be the "test the function with an input its callers cannot produce"
         fault: the rows would keep rendering after the declaration stopped naming them. */
      questions={requirementsFor("send").map((r) => ({
        id: r.id, field: r.field, label: r.label,
        answered: r.isAnswered({ unit: true, when: false, expect: false, remind: false, rows: false, holdday: false, checkin: false, again: false }),
      }))}
      openId="s-when"
      value={{
        rows: [{ key: "sample", kind: "qty", name: "Opening sample", on: true, unit: "Chapters", amount: "3" }],
        /* ⚠️ THE FIXTURE OPENS UNCHOSEN, like the real form. A fixture with answers in it would
           render every pill lit and quietly assert the opposite of Phase 3's rule. */
        alongside: "", when: null, expect: null, remind: null, also: "",
        hold: null, checkin: null, again: null, unitCommitted: true,
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
  const mockClasses = new Set(
    [REF, REF_FINAL, REF_PANE, REF_MATERIALS, REF_PRIMARY, REF_DRAWER].flatMap((r) =>
      [...cssOf(r).matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1])),
  );

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
    /* ⚠️ RETARGETED AGAIN, AND THE LAW IT ASSERTS IS UNCHANGED (drawer round, Phase 3): the pane's
       structure is the contract's, named in the contract's words, in the contract's order. What
       moved is WHICH contract. `.ws` → `.paneCol` beside `.rec` was the two-track grid of the
       three-card pane; the drawer contract draws ONE sheet — `.wcol` → `.sheet` → `.rim` holding
       band, work and foot — beside a `.qrwrap` slip. A suite that kept asserting the retired names
       would be asserting a page the app no longer serves, which is the whole test of whether a
       retarget is honest: the names changed because the page did, and every one of the new ones is
       a word from the ref that changed it. */
    for (const c of ["pane", "wcol", "sheet", "rim", "band", "deed", "b-sub", "work", "foot", "actbar", "willrec"]) {
      expect(rendered.has(c), `${c} is missing from the rendered pane`).toBe(true);
    }
    /* ⚠️ ONE CARD, NOT THREE — REVERSED AGAIN, AND FOR THE OPPOSITE REASON (drawer round, Phase 3).
       The previous round asserted THREE `.fc > .rim` cards, from a contract that drew a
       transparent column holding a header card, a form card and a story card. The drawer contract
       draws ONE framed object: `.sheet > .rim` holding the band, the work and the foot, with the
       record promoted to a slip beside it. Three frames for one task made the deed read as a
       caption above the form rather than as the form's own top edge.

       ⚠️ WHAT THE CASE ASSERTS IS UNCHANGED AND IS WHY IT SURVIVES BOTH REVERSALS: the zone ORDER.
       Band, then work, then foot, then the slip — in source order, which is the only half a string
       can carry. That the foot is not a LID over the work is a rendered-page claim and lives in
       `tests/e2e/sheetSlip.measure.ts`. */
    const sheet = HTML.indexOf('class="sheet"');
    const band = HTML.indexOf('class="band"');
    const work = HTML.indexOf('class="work"');
    const bar = HTML.indexOf('class="foot actbar"');
    const rec = HTML.indexOf('class="qrwrap"');
    expect(band).toBeGreaterThan(-1);
    expect(sheet, "the sheet is missing").toBeGreaterThan(-1);
    expect(band, "the band is not the sheet's top edge").toBeGreaterThan(sheet);
    expect(work).toBeGreaterThan(band);
    expect(bar).toBeGreaterThan(work);
    expect(rec, "the slip is not after the sheet — it is inside it").toBeGreaterThan(bar);
    /* ⚠️ EXACTLY TWO RIMS ON A QUERY JOURNEY, AND THEY ARE DIFFERENT OBJECTS: the sheet's, which
       clips the band's tint and the work's overflow, and the slip's own `.rrim`. Asserting the
       count is what stops a fourth card growing back one round at a time. */
    expect((HTML.match(/class="rim"/g) || []).length, "the sheet is not one rim").toBe(1);
    expect((HTML.match(/class="rrim"/g) || []).length, "the slip is not one rim").toBe(1);
    /* ⚠️ AND THE THREE CARD CLASSES ARE GONE, ASSERTED BY NAME. A retirement stated only as "the
       new names are present" passes on a page carrying both. */
    for (const dead of ["fc hdr", "fc work", "fc rec"]) {
      expect(HTML, `${dead} is still rendered`).not.toContain(`class="${dead}"`);
    }
    /* ⚠️ THE TILES ARE IN THE RECORD, AND NOWHERE ELSE. They were three cells in the header band —
       facts about the record, drawn on the task — and the whole point of the split is that the
       record owns them. Asserted as absence AND presence, because either alone is satisfiable by a
       pane that renders no tiles at all. */
    expect(HTML, "a tile row is back in the band").not.toMatch(/["\s`]tiles["\s`]/);
    expect(HTML.indexOf('class="rtiles"'), "the tiles are not inside the record card")
      .toBeGreaterThan(rec);
  });

  it("the mockup's own scoping is the only edit to its stylesheet", () => {
    /* ⚠️ AN AT-RULE'S BODY IS NOT A SELECTOR LIST, and this counted it as one. `@keyframes` steps
       read `0%, 100% {` — there is nothing to scope, and no way to write one that would satisfy a
       `.tpn` prefix — so the first animation added to this sheet failed a lock about where rules
       REACH. The at-rule's own line was already skipped; its contents were not. Skipped by depth:
       everything between an `@` line and the brace that closes it is the at-rule's business. */
    const lines = strip(PANE_CSS).split("\n");
    const rules: string[] = [];
    let inAt = 0;
    for (const l of lines) {
      if (/^\s*@/.test(l)) { inAt = 1; continue; }
      if (inAt) {
        inAt += (l.match(/{/g) || []).length - (l.match(/}/g) || []).length;
        if (inAt <= 0) inAt = 0;
        continue;
      }
      if (l.includes("{")) rules.push(l);
    }
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
  /* ⚠️ `story` LEFT THIS LIST WITH THE WRAPPER IT NAMED (steer round, Phase 4). `.fc > .rim` is
     the card, so a `.story` div inside it was a fourth box; the updated contract has no such
     element and the head, body and foot sit directly in the rim. `storycol` stays — the COLUMN is
     still a part, and it is the one this list was really protecting. */
  /* ⚠️ THE CHECKLIST IS THE CORRECTED CONTRACT'S PARTS (workspace round, Phase 1). `tiles`/`tile`
     retired with the band's tile row and `mid`/`formcol`/`storycol` with the single scroller; the
     record card's own parts take their place. The CLAIM is unchanged: the pane is a port of its
     contract, and the contract is the input rather than a fixture. */
  /* ⚠️ THE CHASSIS WORDS ARE THE DRAWER CONTRACT'S NOW (Phase 3) — `wcol`/`sheet`/`foot`/`qrwrap`
     replace `ws`/`paneCol`/`rec`. The JOURNEY internals are unchanged and still the pane
     contract's, which is the honest shape of a pane assembled from two refs. */
  const PANE_PARTS = ["pane", "wcol", "sheet", "band", "deed", "b-nav",
    "work", "workscroll", "form", "foot", "actbar", "wr", "ab",
    "qrwrap", "qr", "rrim", "rhead", "rtiles", "rtile", "rtl", "rfoot"];

  it("the mockup emits every part this checks", () => {
    /* the guard on the guard: a part that stopped being in the ref would silently drop out */
    /* ⚠️ THE GUARD ON THE GUARD READS BOTH REFS, because the parts now come from both. Left
       reading `REF` alone it would report every drawer word as "not in the mockup" — a guard going
       red about a page that is exactly right. */
    const inRef = (p: string) => [REF, REF_DRAWER].some((r) =>
      r.includes(`class="${p}`) || r.includes(`class='${p}`) || r.includes(`.${p}{`) || r.includes(`.${p} `));
    const gone = PANE_PARTS.filter((p) => !emitted.has(p) && !inRef(p));
    expect(gone, `not found in the ref — the checklist is stale: ${gone.join(" ")}`).toHaveLength(0);
  });

  it("the rendered Send journey carries all of them", () => {
    /* ⚠️ `wr` IS THE CONTRACT'S NAME FOR THE STRIP AND `willrec` IS THIS PANE'S — one deviation,
       named. The corrected file draws the strip as `.wr`; this pane has carried `.willrec` since
       the materials port and it is the word four other locks and the measurement suite address it
       by. Renaming it would be a rename for the sake of a drawing, so the CHECKLIST accepts either
       and `b-sub` is exempted the same way (a note has one, a query journey does not). */
    const ALIAS: Record<string, string> = { wr: "willrec" };
    const missing = PANE_PARTS.filter((p) => !rendered.has(p) && !rendered.has(ALIAS[p] ?? p));
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
    /* ⚠️ NO RECORD, NO COLUMN — and the grid says so rather than holding an empty 288px track. A
       cohort concerns many queries and a note concerns none; both take the full width. */
    const noTl = renderToStaticMarkup(
      <TaskPane journey={{ ...SEND, tiles: null, tl: null }} onPrimary={() => {}} />);
    /* ⚠️ NO RECORD, NO SLIP AND NO SLOT — the 264px column is reserved only when there is something
       to put in it. That is a different claim from the wrap law, which is about the slot NOT
       collapsing when the writer dismisses a slip that exists; a journey with no record never had
       one, so holding its width would be reserving space for nothing. A cohort concerns many
       queries and a note concerns none: both take the sheet's full width. */
    expect(noTl, "the slip survived a journey with no record").not.toMatch(/["\s`]qr["\s`]/);
    expect(noTl, "an empty tile row rendered").not.toMatch(/["\s`]rtiles["\s`]/);
    expect(noTl, "the slip's slot is held open with nothing in it").not.toMatch(/["\s`]qrwrap["\s`]/);
    /* ⚠️ AND THE TAB GOES WITH IT. A bookmark for a reference that does not exist is a control
       that cannot do anything — the dead-control fault, arriving through an absent branch. */
    expect(noTl, "the bookmark tab survived a journey with no record").not.toMatch(/["\s`]qrtab["\s`]/);
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
 * ⚠️ THE FORK IS THE FIRST QUESTION (journey round, Phase 2) — asserted on RENDERED output, because
 * every claim here is about what the writer is shown and offered.
 */
describe("the fork — the pane opens on the decision, not the paperwork", () => {
  /* ⚠️ THE FIXTURE IS DERIVED FROM THE DECLARATION, NOT RETYPED (drawer round, Phase 3). It held a
     hand-written copy of the send journey's three intents, which is the "an input the system can
     actually produce" fault waiting to happen: it went stale the moment `JourneyIntent` gained its
     glyph, and it would have gone stale silently had the new field been optional. Reading
     `JOURNEYS.send.fork` means the fixture cannot describe a fork the app does not offer. */
  const FORK = {
    label: JOURNEYS.send.fork.label,
    options: JOURNEYS.send.fork.options.map((o) => ({
      id: o.id, title: o.title, subtitle: o.subtitle, glyph: o.glyph,
      ...(o.id === "wont" ? { crossesTo: "close" } : {}),
    })),
    onChoose: () => {},
  };
  const forked = (over: Partial<TaskPaneJourney> = {}) =>
    renderToStaticMarkup(<TaskPane journey={{ ...SEND, ...over }} onPrimary={() => {}} nav={NAV} />);

  it("no primary is rendered until an intent is chosen", () => {
    const html = forked({ fork: FORK, prim: null, missing: [] });
    /* ⚠️ MATCH THE CLASS LIST, NOT AN EXACT ATTRIBUTE (journey round, Phase 7). This read
       `not.toContain('class="ab go"')`, and the moment the primary gained its Phase 7 modifiers the
       rendered attribute became `class="ab go prime ready"` — which this would have PASSED, while a
       verb was being offered before the fork was answered. The positive twin at least went red; the
       negative one is the direction that fails silently, which is this repo's most-recorded trap. */
    expect(html, "a verb was offered before the pane knew what the writer wanted")
      .not.toMatch(/class="ab go(\s|")/);
    /* ⚠️ AND THE GUARD ON THE GUARD: the fork must actually be there, or an empty render satisfies
       this without the pane having drawn anything. */
    expect(html).toContain('class="fork"');
    expect(html).toContain("Where are you with it?");
  });

  it("Snooze and Dismiss remain — both are honest answers to “not now”", () => {
    const html = forked({ fork: FORK, prim: null, missing: [], onSnooze: () => {}, onDismiss: () => {} });
    expect(html).toContain(">Snooze<");
    expect(html).toContain(">Dismiss<");
  });

  it("every option states a title and a subtitle, and a crossover says so before it is pressed", () => {
    const html = forked({ fork: FORK, prim: null, missing: [] });
    for (const o of FORK.options) {
      expect(html, `the fork lost "${o.title}"`).toContain(o.title);
      expect(html, `"${o.title}" offers no subtitle`).toContain(o.subtitle);
    }
    expect(html, "a crossover gave no warning that it swaps the journey").toContain("crosses to close");
    /* the two that stay in the journey do NOT wear the crossover line */
    expect((html.match(/crosses to/g) || []).length, "a non-crossover was labelled as one").toBe(1);
  });

  it("the steer square marks the fork itself while no intent is chosen", () => {
    const html = forked({ fork: FORK, prim: null, missing: [] });
    const lbl = html.slice(html.indexOf('class="forklbl"'), html.indexOf("</div>", html.indexOf('class="forklbl"')));
    expect(lbl, "the fork carries no marker").toContain('class="sqm"');
  });

  /* ⚠️ THE FORK OR THE RECEIPT — NEVER BOTH. Two states of one thing on screen at once is how a
     reader comes to believe the choice has not been made. */
  it("choosing collapses the fork to a one-line receipt with a way back", () => {
    const html = forked({ receipt: { kind: "chose", label: "I’ve sent it", onChange: () => {} } });
    expect(html, "the fork survived the choice").not.toContain('class="fork"');
    expect(html).toContain("You chose");
    expect(html).toContain("I’ve sent it");
    expect(html).toContain(">Change<");
    /* and the primary is back, because there is a verb now — matched on the class LIST, so a
       modifier added later cannot turn this into a lock about a button that stopped rendering */
    expect(html).toMatch(/class="ab go(\s|")/);
  });

  it("a crossover's receipt names where it came from and offers the way back", () => {
    const html = forked({ receipt: { kind: "crossed", label: "x", journey: "send", onBack: () => {} } });
    expect(html).toContain("Crossed from");
    expect(html).toContain(">Go back<");
    expect(html, "a crossover receipt offered Change, which would return to the wrong fork")
      .not.toContain(">Change<");
  });

  it("the cleared-answers line renders only when answers were actually discarded", () => {
    expect(forked({ receipt: { kind: "chose", label: "x", onChange: () => {} } }),
      "the pane narrated a discard that did not happen")
      .not.toContain("were cleared");
    expect(forked({ clearedNote: true })).toContain("Your answers to the previous choice were cleared.");
  });

  it("a flow's standing line renders where the flow declares one, and nowhere else", () => {
    expect(forked({})).not.toContain('class="flowinfo"');
    expect(forked({ flowInfo: "Nothing is recorded and nothing is invented." }))
      .toContain("Nothing is recorded and nothing is invented.");
  });
});

/**
 * ⚠️ THE CHROME DIET (workspace round, Phase 4) — asserted on RENDERED OUTPUT, because every claim
 * here is about what the writer is shown rather than about what was written.
 */
describe("the chrome diet — what the form no longer says", () => {
  /* the ledger as the session builds it, for each journey that has one */
  const form = (kind: "send" | "close" | "fix" | "note", over: Partial<React.ComponentProps<typeof TaskPaneBody>> = {}) =>
    renderToStaticMarkup(
      <TaskPaneBody
        questions={requirementsFor(kind).map((r) => ({
          id: r.id, field: r.field, label: r.label,
          answered: r.isAnswered({ unit: false, when: false, expect: false, remind: false, rows: false, holdday: false, checkin: false, again: false }),
        }))}
        openId={requirementsFor(kind)[0]?.id ?? null}
        value={{ rows: [], alongside: "", when: null, expect: null, remind: null, also: "",
                 hold: null, checkin: null, again: null, unitCommitted: false }}
        onChange={() => {}}
        {...(kind === "note" ? { note: { text: "Chase the agency", added: "18 Aug" } } : {})}
        {...over}
      />);

  it("no journey renders a form heading or a sub-line", () => {
    /* the pane itself carries neither element any more — asserted against the classes that drew
       them, on a journey that has a body, so an empty render cannot satisfy this */
    expect(HTML, "the form heading is back").not.toMatch(/["\s`]f-h["\s`]/);
    expect(HTML, "the form sub-line is back").not.toMatch(/["\s`]f-sub["\s`]/);
    expect(HTML, "the ledger did not render — this case is measuring nothing").toContain('class="q');
  });

  /* ⚠️ THE FLOW DECIDES WHICH OPTIONAL FIELDS ARE OFFERED, and none is offered before an intent is
     chosen (journey round, Phase 3, found in a screenshot). A link inviting a note on a decision the
     writer has not made yet is the fork's own question answered from underneath. */
  it("no optional field is offered while the fork is showing", () => {
    const html = renderToStaticMarkup(
      <TaskPaneBody questions={[]} openId={null} offers={[]}
        value={{ rows: [], alongside: "", when: null, expect: null, remind: null, also: "",
                 hold: null, checkin: null, again: null, unitCommitted: false }}
        onChange={() => {}} />);
    expect(html, "an optional field was offered before the intent was chosen").not.toContain("addlink");
    expect(html).not.toContain("<textarea");
  });

  it("a flow offering only one optional field offers only that one", () => {
    const html = renderToStaticMarkup(
      <TaskPaneBody
        questions={requirementsFor("send").map((r) => ({
          id: r.id, field: r.field, label: r.label, answered: false }))}
        openId="s-when" offers={["also"]}
        value={{ rows: [], alongside: "", when: null, expect: null, remind: null, also: "",
                 hold: null, checkin: null, again: null, unitCommitted: false }}
        onChange={() => {}} />);
    expect(html).toContain("+ Add a note for your file");
    expect(html, "a field this flow does not offer was offered anyway")
      .not.toContain("+ Anything else going with it");
  });

  it("at rest the form holds no textarea and no OPTIONAL tag, on any journey", () => {
    for (const k of ["send", "close", "fix", "note"] as const) {
      const html = form(k);
      expect(html, `${k} presents an empty box at rest`).not.toContain("<textarea");
      expect(html, `${k} tags a field nobody has opened`).not.toContain("opttag");
      /* the guard on the guard: the offer must actually be there to have been declined */
      expect(html, `${k} offers no optional field at all`).toContain("addlink");
    }
  });

  it("opening one optional field renders it, its tag, and no other", () => {
    const one = form("send", { extras: { alongside: false, also: true } });
    expect((one.match(/<textarea/g) || []).length, "opening one opened two").toBe(1);
    expect((one.match(/opttag/g) || []).length, "a tag rendered for a field nobody opened").toBe(1);
    /* the other is still on offer rather than gone */
    expect(one).toContain("+ Anything else going with it");
  });

  /* ⚠️ "ANYTHING ELSE GOING WITH IT" NEEDS AN IT — a journey with no parcel has nothing for it to
     go alongside, so the offer is absent rather than opening onto a question about nothing. */
  it("the parcel's own optional field is offered only where a parcel is recorded", () => {
    expect(form("send")).toContain("+ Anything else going with it");
    expect(form("fix")).toContain("+ Anything else going with it");
    expect(form("close"), "a close journey offered to record what went alongside nothing")
      .not.toContain("+ Anything else going with it");
    expect(form("note")).not.toContain("+ Anything else going with it");
  });

  /* ⚠️ A HINT BELONGS TO THE OPEN QUESTION. A column of quiet lines above questions nobody is
     answering is a form explaining itself to no one. */
  it("each hint renders only under the row that is open", () => {
    const openWhen = form("send", { openId: "s-when", whenHint: "Closing records no response." });
    expect(openWhen, "the open row's hint is missing").toContain("Closing records no response.");
    expect(openWhen, "a closed row's hint rendered").not.toContain("The reminder lands here");
    const openRemind = form("send", { openId: "s-remind", whenHint: "Closing records no response." });
    expect(openRemind).toContain("The reminder lands here");
    expect(openRemind, "a closed row's hint rendered").not.toContain("Closing records no response.");
  });

  /* ⚠️ THE LABELS ARE THE DECLARATION'S, so the ledger and the missing line cannot come to name one
     question two things. Read from `requirementsFor`, never from a list typed here. */
  it("every row's heading is its requirement's own label", () => {
    for (const k of ["send", "close", "fix"] as const) {
      const html = form(k);
      for (const r of requirementsFor(k)) {
        expect(html, `${k} lost the label for ${r.field}`).toContain(`>${r.label}</span>`);
      }
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
    /* ⚠️ RETARGETED (workspace round, Phase 1) AND THE LAW IS UNCHANGED: this page must not scroll,
       so the chain runs `flex: 1; min-height: 0` from the pane root down to an element that owns
       the overflow. What moved is WHERE the chain ends. It was one `.mid` scrollport holding both
       columns, which meant the record travelled with the work; the split ends the chain inside each
       column instead, so `.mid` is retired rather than relocated.
       ⚠️ THE SCROLLERS THEMSELVES ARE PHASE 2's and are asserted there — this case asserts that the
       chain still reaches them, which is the half a retirement can break silently. */
    expect(decls, "the single-scrollport middle is back").not.toMatch(/\.tpn \.mid[ .{:,]/);
    /* ⚠️ THE CHAIN ENDS IN THE SHEET NOW (Phase 3). It ran pane → `.ws` → `.paneCol` → the card;
       the sheet is one object, so it is pane → `.wcol` → `.sheet` → `.rim` → the scroller. Same
       law, one fewer link, and every link still declares `min-height: 0` or a `flex: 1 1 0%`
       chain silently computes to zero — which this repo has measured twice. */
    expect(rule(".tpn > .pane")).toContain("min-height: 0");
    expect(rule(".tpn .wcol")).toContain("min-height:0");
    expect(rule(".tpn .sheet")).toContain("min-height: 0");
    expect(rule(".tpn .sheet > .rim")).toContain("min-height:0");
  });

  it("3 · fluid columns — no breakpoint decides anything", () => {
    /* the ref's `@media (max-width:1160px)` is superseded by rules that reach the same outcomes
       by measure. The block is still in the file, above, and these override it. */
    /* ⚠️ THE WORKROW IS RETIRED WITH THE CARD-IN-CARD, and `.formcol`/`.storycol` with the wrapping
       middle that needed them. The split is a two-track GRID: `minmax(0, 1fr)` beside a fixed
       record column, which is fluid by construction and has no threshold to decide anything at.
       `minmax(0, …)` rather than a bare `1fr` because a grid item's automatic minimum is its
       content — without it the worksheet refuses to shrink and pushes the record off its measure. */
    expect(decls, "the retired workrow is back").not.toContain(".tpn .workrow");
    expect(decls, "the wrapping middle's columns are back").not.toMatch(/\.tpn \.(formcol|storycol)[ .{:,]/);
    /* ⚠️ THE SPLIT IS A FLEX ROW NOW, NOT A GRID (Phase 3) — the sheet grows, the slip's slot is a
       fixed 264, and there is still no threshold deciding anything. `flex: 1 1 auto` with
       `min-width: 0` is the flex spelling of `minmax(0, 1fr)`: without the min-width the sheet
       refuses to shrink below its content and pushes the slip off its measure, which is exactly
       what the grid's `minmax(0, …)` was there to prevent. */
    const pane = rule(".tpn .pane").replace(/\s*:\s*/g, ":");
    const wcol = rule(".tpn .wcol").replace(/\s*:\s*/g, ":");
    const slot = rule(".tpn .qrwrap").replace(/\s*:\s*/g, ":");
    expect(pane, "a wrap decides the split instead of the row").not.toContain("flex-wrap");
    expect(wcol).toContain("flex:1 1 auto");
    expect(wcol, "the sheet refuses to shrink and pushes the slip off its measure").toContain("min-width:0");
    expect(slot, "the slip's slot is not a fixed 264").toContain("flex:0 0 264px");
    /* the tiles stack in the record column now — there is no column count left to auto-fit */
    expect(decls, "the retired tile row's auto-fit is back").not.toContain("repeat(auto-fit, minmax(150px, 1fr))");
  });

  /**
   * ⚠️ A CONTAINER QUERY CONFERS NO SPECIFICITY, SO ITS OVERRIDE MUST COME AFTER THE RULE IT
   * OVERRIDES — the repo's own `prefers-reduced-motion` law, and a container query behaves the
   * same. Written immediately below `.actbar` this block sat two hundred lines ABOVE
   * `.tpn .willrec`'s own rule; both are 0-2-0, the later won, and `flex: 1 1 240px` put the basis
   * straight back to 240. The declaration read correctly and did nothing.
   *
   * ⚠️ AND NO MEASUREMENT CAN SEE IT. Nothing overlapped and nothing was clipped, so the bar's two
   * measured assertions stayed green over a bar wrapping into three ragged lines. Ordering is a
   * SOURCE fact, so this is a source lock — which is what a source lock is genuinely for.
   */
  it("the bar's wrap override is declared after the rules it overrides", () => {
    const q = decls.indexOf("@container (max-width: 560px)");
    expect(q, "the bar's container query is gone").toBeGreaterThan(-1);
    /* ⚠️ SEARCHED IN THE TEXT *BEFORE* THE QUERY, not with `lastIndexOf` over the whole file — the
       query's own body names both selectors, so a whole-file `lastIndexOf` finds a position INSIDE
       the block it is comparing against and the case fails on a correct sheet. It did, first run. */
    const above = decls.slice(0, q);
    for (const sel of [".tpn .willrec {", ".tpn .miss {"]) {
      expect(above.includes(sel), `${sel} has no rule above the container query that overrides it`)
        .toBe(true);
    }
    /* and nothing restates them BELOW it, which would win the same way */
    const below = decls.slice(q + 200);
    for (const sel of [".tpn .willrec {", ".tpn .miss {"]) {
      expect(below.includes(sel), `${sel} is restated after the override — the override loses again`)
        .toBe(false);
    }
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
