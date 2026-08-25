/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The footnote band — how each figure above it is counted.
 * Design authority: design-refs/submission-packages-broadsheet.html (`.hownote`).
 *
 * ⚠️ THIS IS WHAT MAKES "REPORTED, NOT GUESSED" CHECKABLE RATHER THAN A SLOGAN. A dashboard that
 * states three numbers and not how they were reached asks to be trusted; this says what each one
 * counts, so a writer can reconcile a figure against their own records and find the app either
 * right or wrong. That is the point — a claim nobody can test is not a claim.
 *
 * ⚠️ THE COPY IS THE REF'S, VERBATIM (D12), and it is stated as MECHANISM, never as reassurance.
 * "Counted when a query goes out with a package attached" is checkable; "we track everything
 * accurately" is not.
 */
import React from "react";
import { IllustrationSlot } from "./IllustrationSlot";
import "./packagesBroadsheet.css";

interface Cell {
  id: string;
  icon: string;
  direction: "out" | "in";
  title: string;
  body: string;
}

const CELLS: Cell[] = [
  {
    id: "hn-sent",
    icon: "postbox",
    direction: "out",
    title: "Sent",
    body: "Counted when a query goes out with a package attached. The package records exactly which letter, synopsis and pages went.",
  },
  {
    id: "hn-replies",
    icon: "doormat",
    direction: "in",
    title: "Replies",
    body: "Any agent response lands against the package that went out — so every figure traces back to real correspondence.",
  },
  {
    id: "hn-requests",
    icon: "magnifier",
    direction: "in",
    title: "Requests",
    body: "Partial and full requests are credited to each material in the package that earned them. Counts, never guesses.",
  },
];

export const FootnoteBand: React.FC = () => (
  <section className="pkgb-band pkgb-band--last" aria-label="How these figures are counted">
    <div className="pkgb-hownote">
      {CELLS.map((c) => (
        <div key={c.id} className="pkgb-hncell">
          {/* ⚠️ `bare` — NO DASHED RIM (D7). The plate's dashed border says "artwork pending", which is
                 true of the inventory and not of a page a writer is reading. The mark stays; the
                 commission chrome does not. */}
            <IllustrationSlot id={c.id} icon={c.icon} px={34} shape="bare" width={64} height={64} />
          <div>
            <div className={`pkgb-hnt pkgb-dir--${c.direction}`}>
              {c.direction === "out" ? "→" : "←"} {c.title}
            </div>
            <p>{c.body}</p>
          </div>
        </div>
      ))}
    </div>
  </section>
);
