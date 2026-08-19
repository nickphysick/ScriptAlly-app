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
 * `design-refs/todo-materials-contract.html` at run time, so the day the ref changes this suite
 * changes with it — which is the only way a "port" claim can stay true. A hand-written list of
 * class names would pass forever over a file nobody had opened since.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { TaskPane, TaskPaneJourney } from "./TaskPane";
import { TaskPaneBody } from "./TaskPaneBody";

const REF = readFileSync(join(process.cwd(), "design-refs/todo-materials-contract.html"), "utf8");
const PANE_CSS = readFileSync(join(process.cwd(), "src/components/todo/taskPane.css"), "utf8");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** the mockup's Send journey, rendered through the port */
const SEND: TaskPaneJourney = {
  cls: "u-now",
  deed: <>Send your <em>full manuscript</em></>,
  sub: "Requested by Jonathan Marsh, The Marsh Agency · 14 Aug 2026",
  fig: "4",
  figU: "days with you",
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
      materials={[{ label: "Full manuscript", detail: "84,200 words" }]}
      value={{ materials: [], when: "Today", also: "" }}
      onChange={() => {}}
      upsell={<><span className="tag">Pro</span><span>Records which draft went to each agent.</span></>}
    />
  ),
  will: "Full sent · today · via email",
  quiet: { label: "Copy Jonathan's email", onPress: () => {} },
  prim: "Log the send",
  tl: [
    { key: "1", kind: "", t: "Query sent", d: "3 Jun · via email" },
    { key: "2", kind: "in", t: "Partial requested", d: "1 Jul" },
    { key: "3", kind: "now", t: "Your turn", d: "Today" },
  ],
  onOpenQuery: () => {},
};

const HTML = renderToStaticMarkup(<TaskPane journey={SEND} onPrimary={() => {}} />);
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
  const mockCss = strip(REF.slice(REF.indexOf("<style>"), REF.indexOf("</style>")));
  const mockClasses = new Set([...mockCss.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));

  it("every class the pane renders is a word from the mockup", () => {
    /* ⚠️ THE ONE EXEMPTION IS NAMED AND PREFIXED. Task navigation is behaviour the brief requires
       carried and the mockup has no control for it — it navigates by clicking a list row. Those
       classes carry a `tpn-` prefix precisely so this assertion can tell them apart from a name
       that was invented while porting. */
    const invented = [...rendered].filter((c) => !mockClasses.has(c) && !/^tpn(-|$)/.test(c));
    expect(invented, `classes not in the mockup: ${invented.join(" ")}`).toHaveLength(0);
  });

  it("the structural names are present, and nested as the mockup nests them", () => {
    for (const c of ["v", "fc", "rim", "band", "tiles", "tile", "workrow", "act", "acts"]) {
      expect(rendered.has(c), `${c} is missing from the rendered pane`).toBe(true);
    }
    /* ⚠️ `.workrow` IS A SIBLING OF THE HEADER CARD, NOT A DESCENDANT — the whole of the contract's
       structure, and the assertion that has been silently green before by only checking a `.rim`
       exists. The header card closes before the workrow opens. */
    const headerCard = HTML.indexOf('<div class="fc">');
    const workrow = HTML.indexOf('<div class="workrow">');
    const tilesEnd = HTML.indexOf('class="tiles');
    expect(headerCard).toBeGreaterThan(-1);
    expect(workrow).toBeGreaterThan(tilesEnd);
    expect(HTML.slice(headerCard, workrow)).not.toContain("workrow");
    /* three cards, each with its own rim — the header, the act, the timeline */
    expect((HTML.match(/class="fc"/g) ?? [])).toHaveLength(3);
    expect((HTML.match(/class="rim"/g) ?? [])).toHaveLength(3);
  });

  it("the mockup's own scoping is the only edit to its stylesheet", () => {
    /* every rule is scoped, and the class names inside the selectors are untouched */
    const rules = strip(PANE_CSS).split("\n").filter((l) => l.includes("{") && !l.startsWith("@"));
    const unscoped = rules.filter((l) => l.trim() && !/^\s*\.tpn[\s.{:>]/.test(l) && !/^\s*}/.test(l));
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
  const PANE_PARTS = ["band", "deed", "b-sub", "bandfig", "bandbtns", "b-onband",
    "tiles", "tile", "act", "acts", "willrec", "b-quiet", "b-primary",
    "tl-head", "tl-in", "tl", "tl-e", "dot", "tl-foot", "f-lbl", "chip", "tick", "seg", "note-in"];

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
    const noFig = renderToStaticMarkup(
      <TaskPane journey={{ ...SEND, fig: null }} onPrimary={() => {}} />);
    expect(noFig).toContain('class="band nofig"');
    expect(noFig).not.toContain('class="bandfig"');
    /* and a journey with no timeline drops the card, leaving the workrow one child */
    const noTl = renderToStaticMarkup(
      <TaskPane journey={{ ...SEND, tiles: null, tl: null }} onPrimary={() => {}} />);
    expect(noTl).not.toContain("tl-head");
    expect((noTl.match(/class="fc"/g) ?? []), "the timeline card is still there").toHaveLength(2);
    expect(noTl).not.toContain('class="tiles');
  });

  it("the paper is the mockup's three, set on `.v`", () => {
    for (const cls of ["u-now", "u-house", "u-yours"] as const) {
      const html = renderToStaticMarkup(<TaskPane journey={{ ...SEND, cls }} onPrimary={() => {}} />);
      expect(html).toContain(`class="v ${cls}"`);
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
