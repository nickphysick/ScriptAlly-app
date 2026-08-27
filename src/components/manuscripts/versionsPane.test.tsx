/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Comparable titles (read-only) and Versions (Pro) ═══════════════════════
 *
 * The unrecorded-sample LAW is a property and lives in `src/lib/unrecordedVersion.test.ts`. This
 * file is about the two panes: that the comps pane edits nothing, that the Pro gate offers rather
 * than greys, and that all three version surfaces state the unrecorded ones rather than folding or
 * dropping them.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CompsPane } from "./CompsPane";
import { VersionsPane, VERSION_LIMITATION } from "./VersionsPane";
import { HoldingRow, OpeningRow,  } from "../../lib/bookVersions";
import { CompTitle } from "../../types";

const COMPS: CompTitle[] = [
  { title: "The Loneliest Girl in the Universe", author: "Lauren James", year: 2017, note: "A secret she can't test." },
  { title: "A Good Girl's Guide to Murder", author: "Holly Jackson", year: 2019 },
  { title: "The Wall", author: "John Lanchester", year: 2019 },
  { title: "Boy Parts", author: "Eliza Clark", year: 2020 },
  { title: "Piranesi", author: "Susanna Clarke", year: 2020 },
];

const comps = (list = COMPS) => renderToStaticMarkup(<CompsPane comps={list} onManage={() => {}} />);

const opening = (id: string, name: string, samples: number, meta: string): OpeningRow =>
  ({ id, name, where: `${samples} sample${samples === 1 ? "" : "s"} · 1 package`, meta, sentPct: 0, inPct: 0 });
const holder = (over: Partial<HoldingRow> = {}): HoldingRow =>
  ({ queryId: "q1", agent: "T. Marsh", what: "FULL", holds: "Full manuscript", sentDay: "2 Jun 2026",
     askedFor: "Full requested", askedOn: "28 May 2026", versionName: "Post-R&R", ...over });
/* ⚠️ THREE PACKAGES WITH NO VERSION — the bucket is packages now (D15), and D3 makes it
   permanent: a sent package is frozen and can never gain one. */
const UNATTR: { packages: number; sent: number; requests: number } = { packages: 3, sent: 3, requests: 0 };

const versions = (over: Partial<React.ComponentProps<typeof VersionsPane>> = {}) =>
  renderToStaticMarkup(
    <VersionsPane
      isPro
      versions={[{ id: "bv1", name: "Initial", kind: "initial", createdDate: "2026-01-14" },
                 { id: "bv2", name: "Prologue-first", kind: "reordering", createdDate: "2026-03-01" }] as never}
      materials={[]}
      queries={[]}
      activities={[]}
      today="2026-08-26"
      onSaveBookVersions={() => {}}
      openings={[opening("bv1", "Initial", 12, "1 request from 12 sent"),
                 opening("bv2", "Prologue-first", 9, "2 requests from 9 sent")]}
      unattributed={UNATTR}
      unrecordedHolders={1}
      holders={[holder(), holder({ queryId: "q2", agent: "A. Whitfield", versionName: null })]}
      onUpgrade={() => {}}
      {...over}
    />,
  );

// ─────────────────────────────────────────────────────────────────────────────
describe("comparable titles are read-only here", () => {
  it("offers no way to add, remove or reorder a comp", () => {
    const html = comps();
    /* ⚠️ THE CHECK IS ABOUT CONTROLS, NOT ABOUT THE WORDS. The pane's own footnote says "Add, edit
       and reorder comps on the Comparable titles page" — a sentence naming where the editing
       happens is the opposite of an editing affordance, and a blunt word sweep flags it. So the
       buttons are read, and every one of them must be the one that leaves. */
    const buttons = html.match(/<button[\s\S]*?<\/button>/g) ?? [];
    expect(buttons).toHaveLength(1);
    for (const word of ["add", "remove", "delete", "reorder", "move up", "move down", "edit"]) {
      expect(buttons[0].toLowerCase(), word).not.toContain(word);
    }
    expect(html).toContain("Manage in Comparable titles ›");
    expect(html).toContain("Read-only here.");
  });

  /** ⚠️ THE TAB IS FREE. Only the Scout that SUGGESTS comps is gated, and it is on the other page. */
  it("sells nothing", () => {
    expect(comps()).not.toMatch(/\bPro\b|Upgrade/);
  });

  it("splits the list without reordering it", () => {
    const html = comps();
    const order = [...html.matchAll(/class="msp-compt">([^<]+)</g)].map((m) => m[1]);
    expect(order).toEqual(COMPS.map((c) => c.title.replace(/'/g, "&#x27;")));
    // `ceil` puts the odd one in the first card — 3 then 2, never an empty second card.
    expect(html).toContain(">1–3<");
    expect(html).toContain(">4–5<");
  });

  it("renders one card for one comp rather than an empty second", () => {
    const html = comps([COMPS[0]]);
    expect(html.match(/sa-cap--reference/g)).toHaveLength(1);
    expect(html).toContain(">1<");
  });

  it("omits an absent author or year rather than dashing it", () => {
    const html = comps([{ title: "Untitled" }]);
    expect(html).toContain("Untitled");
    expect(html).not.toContain("msp-compby");
    expect(html).not.toContain("Unknown");
  });

  it("says the shelf is empty rather than drawing empty cards", () => {
    const html = comps([]);
    expect(html).toContain("No comparable titles recorded yet.");
    expect(html.match(/sa-cap--reference/g)).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("versions — the Pro gate offers rather than greys", () => {
  /**
   * ⚠️ THREE STATES, AND TWO OF THEM MUST NEVER BE CONFUSED. A paying user shown an upgrade prompt
   * is being sold what they own; a free user shown "unavailable" is told a temporary lie about a
   * permanent state. Free gets the offer.
   */
  it("shows a free writer what the feature does, and one way to it", () => {
    const html = versions({ isPro: false });
    expect(html).toContain("Upgrade");
    expect(html).not.toMatch(/unavailable|temporarily|try again/i);
    // No data behind the gate — not a greyed table, not a teaser row.
    expect(html).not.toContain("Prologue-first");
    expect(html).not.toContain("<table");
  });

  it("never sells to somebody who has already bought", () => {
    expect(versions()).not.toContain("Upgrade");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("unrecorded is never folded, on any of the three surfaces", () => {
  it("names the holders whose version is unknown, and says where they are counted", () => {
    const html = versions();
    expect(html).toContain("<b>1 agent</b> holds a sample with no recorded version.");
    /* ⚠️ THE SENTENCE IS THE GUARD. A reader adding the per-version figures would otherwise find
       them short of the total and have nothing to explain the difference. */
    expect(html).toContain("Counted here, not against any version above.");
  });

  it("gives the versionless PACKAGES their own row, unattributed", () => {
    const html = versions();
    expect(html).toContain(">Not recorded<");
    expect(html).toContain(">Not attributed<");
    // …and no request figure against it, because a request cannot be attributed to an unknown.
    const row = /<td class="soft">Not recorded<\/td>([\s\S]*?)<\/tr>/.exec(html)?.[1] ?? "";
    expect(row).toContain(">3<");
    expect(row).not.toMatch(/request/i);
  });

  it("says `Not recorded` in the version column rather than guessing", () => {
    const html = versions();
    expect(html).toContain(">Not recorded<");
    expect(html).toContain("Post-R&amp;R");
  });

  it("states the unrecorded PACKAGES in the header's meta, and omits the clause when there are none", () => {
    /* ⚠️ PACKAGES, NOT SAMPLES (D15). A sample no longer carries an ordering — it is not a
       material type at all — so what can fail to name a version is a package, and D3 makes that
       permanent rather than a backlog. */
    expect(versions()).toContain("2 recorded · 3 packages with no version");
    expect(versions({ unattributed: { packages: 0, sent: 0, requests: 0 } })).toContain(">2 recorded<");
    expect(versions({ unattributed: { packages: 0, sent: 0, requests: 0 } })).not.toContain("unrecorded");
  });

  it("says nothing about unrecorded holders when there are none", () => {
    expect(versions({ unrecordedHolders: 0 })).not.toContain("no recorded version.");
  });

  it("agrees with itself about singulars", () => {
    expect(versions({ unrecordedHolders: 2 })).toContain("<b>2 agents</b> hold a sample");
    expect(versions({ unattributed: { packages: 1, sent: 1, requests: 0 } })).toContain("1 package with no version");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the permanent limitation", () => {
  /**
   * ⚠️ IT IS ON THE PAGE, NOT ONLY IN A REPORT. The app records which version a sample was SENT AS;
   * it cannot open the file and check the text matches. Without the sentence, the table reads as a
   * guarantee about a manuscript's contents.
   */
  it("states what the app can and cannot promise, where the claim is made", () => {
    expect(versions()).toContain("can&#x27;t check the text itself matches");
    expect(versions()).toContain("Reported, not guaranteed.");
    expect(VERSION_LIMITATION).toContain("records which version a sample was sent as");
  });

  it("survives an empty table — the limitation is about the feature, not about the rows", () => {
    expect(versions({ holders: [] })).toContain("Reported, not guaranteed.");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the app reports, never appraises", () => {
  it("keeps the writer's version order and never sorts by request count", () => {
    const src = readFileSync(join(__dirname, "VersionsPane.tsx"), "utf8");
    expect(src.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/\.sort\(/);
    const html = versions();
    expect(html.indexOf(">Initial<")).toBeLessThan(html.indexOf(">Prologue-first<"));
  });

  it("uses no verdict language on either pane", () => {
    const words = /\b(best|worst|strongest|weakest|poor|great|top performer|leading|winning|recommend)\b/i;
    expect(versions()).not.toMatch(words);
    expect(comps()).not.toMatch(words);
  });
});
