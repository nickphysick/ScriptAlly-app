/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CopyRuns — the one way a sentence carrying inline emphasis or a link is expressed on the public
 * pages.
 *
 * ⚠️ STRUCTURED RUNS, NEVER `dangerouslySetInnerHTML`. The refs write their copy as HTML with
 * inline `<strong>` and `<a>`, and the obvious translation is to paste the markup and set it as
 * inner HTML. That would make every future copy edit an unreviewed injection site, and it would
 * put `href="#/privacy"` back into strings — the exact shape that gave the sign-up screen links to
 * pages which could not exist. A run is a string, a bold, or a link with a DESTINATION the router
 * resolves; the copy never spells a URL.
 *
 * ⚠️ AN IN-APP LINK IS A BUTTON. Marketing routes are driven by `onNavigate`, so a copy link into
 * the site renders as a button styled as a link rather than an anchor that would reload the app.
 * `mailto:` and external destinations stay anchors, because those genuinely leave.
 */

import React from "react";

/** Destinations inside the site, expressed as `onNavigate` tabs rather than paths. */
export type CopyRoute = "landing" | "pricing" | "about" | "contact" | "privacy" | "terms";

export type CopyRun =
  | string
  | { b: string }
  /**
   * ⚠️ ITALIC, ADDED BECAUSE THE TYPE COULD NOT EXPRESS A CHOICE THE COPY OFFERED. The founders
   * page needs one italicised word inside a run, and the alternatives were both worse: a bespoke
   * render in that page would put a SECOND copy-rendering path into a tier that deliberately has
   * one, and the next italic would either copy it or extend the type anyway. Purely additive —
   * no existing branch is altered and no call site changes.
   * ⚠️ AND IT CARRIES NO COLOUR. Emphasis here is a change of voice, not of ink; a coloured word
   * inside a paragraph pulls the eye off whatever the paragraph is subordinate to.
   */
  | { em: string }
  | { link: string; to: CopyRoute }
  | { link: string; mailto: string }
  | { link: string; href: string };

export const Runs: React.FC<{
  runs: CopyRun[];
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ runs, onNavigate }) => (
  <>
    {runs.map((run, i) => {
      if (typeof run === "string") return <React.Fragment key={i}>{run}</React.Fragment>;
      if ("b" in run) return <strong key={i}>{run.b}</strong>;
      if ("em" in run) return <em key={i}>{run.em}</em>;
      if ("to" in run) {
        return (
          <button key={i} type="button" className="mk-doclink" onClick={() => onNavigate(run.to)}>
            {run.link}
          </button>
        );
      }
      if ("mailto" in run) return <a key={i} href={run.mailto}>{run.link}</a>;
      return <a key={i} href={run.href} target="_blank" rel="noopener noreferrer">{run.link}</a>;
    })}
  </>
);
