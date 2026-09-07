/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE PRIMITIVE, AND THE LIST OF WHO HAS NOT ADOPTED IT YET.
 *
 * `SlideOver` was extracted because the app had THREE private right-hand drawers and no shared
 * one. Phase 5 built it and deliberately migrated none of the three: each sits in a file another
 * stream is mid-round in, and rewriting a hot file to prove a point about consistency is how two
 * rounds collide.
 *
 * That leaves a hazard this file exists to close. **A primitive nobody adopts is a fourth
 * implementation wearing a shared name** — strictly worse than the three, because it looks like
 * consolidation. So:
 *
 *   - the three named adopters must still exist, and must still own their own fixed element (if
 *     one has migrated, this list is stale and should shrink);
 *   - `SlideOver` must have at least one live mount, so it is a component and not a proposal.
 *
 * Both halves are asserted, because either alone passes while the other rots.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { SlideOver } from "./SlideOver";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

/** the three the primitive was extracted FROM, each still owning a private fixed drawer */
const NOT_YET_ADOPTED = [
  { name: "the Query Centre's panel", css: "src/components/queries/queryPanel.css", sel: ".qpn" },
  { name: "the Query log sheet", css: "src/components/queries/queryLogSheet.css", sel: ".qls" },
  { name: "the packages drawer", css: "src/components/packages/packagesBroadsheet.css", sel: null },
];

describe("SlideOver — the shared drawer, and the three that have not adopted it", () => {
  it("renders a scrim and a labelled drawer, and says whether it is open", () => {
    const html = renderToStaticMarkup(
      <SlideOver open onClose={() => {}} label="Task detail"><p>body</p></SlideOver>,
    );
    expect(html).toContain('class="slo-scrim"');
    expect(html).toContain('data-on="true"');
    expect(html).toContain('aria-label="Task detail"');
    /* the scrim is a real control, so the keyboard can dismiss it */
    expect(html).toContain('aria-label="Close Task detail"');
  });

  it("is hidden from the accessibility tree and untabbable when closed", () => {
    const html = renderToStaticMarkup(
      <SlideOver open={false} onClose={() => {}} label="Task detail"><p>body</p></SlideOver>,
    );
    expect(html).toContain('data-on="false"');
    expect(html).toContain('aria-hidden="true"');
    /* ⚠️ A CLOSED DRAWER THAT KEEPS ITS TAB STOPS is a reader tabbing into something they cannot
       see — the reason the scrim's tabIndex is -1 while closed rather than merely invisible. */
    expect(html).toContain('tabindex="-1"');
  });

  /* ⚠️ HALF ONE — the primitive is MOUNTED. A shared drawer with no call site is a fourth private
     drawer with a public-looking name, which is worse than the three it was meant to replace. */
  it("has at least one live mount", () => {
    const dirs = ["src/components/todo", "src/components/shared", "src/components/queries"];
    const mounts: string[] = [];
    for (const d of dirs) {
      for (const f of readdirSync(join(process.cwd(), d))) {
        if (!f.endsWith(".tsx") || f.includes(".test.") || f === "SlideOver.tsx") continue;
        if (strip(read(join(d, f))).includes("<SlideOver")) mounts.push(d + "/" + f);
      }
    }
    expect(mounts, "SlideOver is rendered by nothing — it is a proposal, not a primitive")
      .not.toEqual([]);
  });

  /* ⚠️ HALF TWO — the three still own their own drawers, so the list in `SlideOver.tsx` is a fact
     rather than a memory. If one has migrated, this goes red and the list should lose a name. */
  it("the three named non-adopters still have their own fixed drawer", () => {
    const stale: string[] = [];
    for (const a of NOT_YET_ADOPTED) {
      const css = strip(read(a.css));
      if (!/position:\s*fixed/.test(css)) stale.push(`${a.name} no longer has a fixed element`);
      if (a.sel && !css.includes(a.sel)) stale.push(`${a.name} no longer declares ${a.sel}`);
    }
    expect(stale,
      "SlideOver.tsx names three drawers that have not adopted it. One of them has changed — "
      + "if it has migrated, remove it from that list AND from this one; a stale list of "
      + "non-adopters is how a migration comes to look unfinished forever.").toEqual([]);
  });
});
