/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The first-run stage — "How it works", shown while no package exists.
 * Design authority: design-refs/submission-packages-restructure.html (the infographic).
 *
 * ⚠️ THIS WAS `PackagesOverview` AND HELD THE WHOLE PAGE. The broadsheet rework (D1) moved the rail
 * out and the stage's working half into three bands, which left this file rendering one thing under
 * a name that claimed the page. A component called "Overview" that draws only a first-run explainer
 * is the kind of stale name a future session reads as "this is where the page lives" — so it was
 * renamed with the change rather than after it.
 *
 * ⚠️ TWO STATES, DERIVED FROM THE DATA (D6), and there is still no stored flag. No package → this;
 * any package → the packages and tracking bands. Deleting your last package takes you back to the
 * explanation, which is the honest thing for a page whose whole job is to describe what packages
 * are.
 *
 * ⚠️ AND IT WRITES NOTHING AND HOLDS NO STATE. The infographic's progress is `howItWorks` over
 * three counts, unit-locked in lib/packagesOverview.ts.
 */
import React from "react";
import { howItWorks } from "../../lib/packagesOverview";
import "./packagesOverview.css";
import "./packagesFlow.css";
import "./packagesBroadsheet.css";

const STEPS = [
  {
    n: 1,
    title: "Add your materials",
    body: (
      <>
        Versions of your <strong>covering letter, synopsis and sample pages</strong> — written here
        or pasted in. Most writers keep two or three of each.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
        <rect x="10" y="14" width="28" height="38" rx="2" />
        <path d="M16 22h16M16 28h16M16 34h10" />
        <rect x="24" y="10" width="28" height="38" rx="2" fill="var(--pkg-card)" />
        <path d="M30 18h16M30 24h16M30 30h12M30 36h16M30 42h8" />
      </svg>
    ),
  },
  {
    n: 2,
    title: "Arrange them into packages",
    body: (
      <>
        Pick one of each and give the combination a name. Build as many as you like, then{" "}
        <strong>attach a package when you log a query</strong>.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M32 8l20 10v18L32 46 12 36V18L32 8z" />
        <path d="M32 24l20-6M32 24v22M32 24L12 18" />
        <path d="M22 13l20 10" strokeDasharray="2 3" />
      </svg>
    ),
  },
  {
    n: 3,
    title: "Track what comes back",
    body: (
      <>
        Replies land against the package that went out. Tracking shows{" "}
        <strong>which materials sit behind each response and request</strong> — reported, not
        guessed.
      </>
    ),
    art: (
      <svg viewBox="0 0 64 64" fill="none" strokeWidth={1.2} strokeLinecap="round" aria-hidden="true">
        <path d="M10 52h44M10 52V14" />
        <rect x="17" y="36" width="7" height="16" />
        <rect x="29" y="26" width="7" height="26" />
        <rect x="41" y="18" width="7" height="34" />
        <path d="M18 30c8-4 14-10 30-14" strokeDasharray="2 3" />
      </svg>
    ),
  },
] as const;

/** One rail panel: sage head, mono label, derived count chip, optional outlined action. */
export interface PackagesOnboardingProps {
  /** The counts the infographic ticks — the same numbers the bands above it render. */
  materialCount: number;
  packageCount: number;
  /** Queries carrying any package — step three's tick. */
  live: number;
}

/**
 * ⚠️ THE PROBLEM STATEMENT IS GONE FROM HERE, and it did not move — the hero band already carries
 * it, in every state, which is where the ref draws it. It lived here as the stage's opening card
 * back when there was no hero; keeping both would have put "Fed up of guessing which materials are
 * landing with agents?" on the page twice, three inches apart.
 */
export const PackagesOnboarding: React.FC<PackagesOnboardingProps> = ({
  materialCount, packageCount, live,
}) => {
  const steps = howItWorks(materialCount, packageCount, live);
  return (
    <section className="pkgb-band pkgb-band--last" aria-labelledby="pkgo-hiw-h">
      <div className="pkgb-bandhead">
        <h2 id="pkgo-hiw-h">How it works</h2>
        <span className="pkgb-tag">Three steps</span>
      </div>
      {/* ⚠️ THE INFOGRAPHIC DOUBLES AS PROGRESS (D3) AND READS THE SAME COUNTS THE BANDS DO.
          `steps` comes from `howItWorks(materials, packages, live)` — the very numbers the bands
          above render — so the stage cannot claim "2 BUILT" beside a band listing three. One
          derivation, two surfaces. */}
      <div className="pkgo-steps">
        {STEPS.map((s, i) => {
          const state = steps[i];
          return (
            <article key={s.n} className={`pkgo-step${state.live ? " pkgo-step--live" : ""}`}>
              <div className="pkgo-eyebrow">
                <span className={`pkgo-num${state.done ? " pkgo-num--done" : ""}`}>{s.n}</span>
                {state.tick && (
                  <span className={`pkgo-tick${state.live ? " pkgo-tick--live" : ""}`}>{state.tick}</span>
                )}
              </div>
              {/* D8 — the illustrations are not drawn yet, and the plate says so rather than
                  pretending. Dashed is this page's provisional grammar. */}
              <div className="pkgo-plate">
                {s.art}
                <span className="pkgo-platelbl">Illustration</span>
              </div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
};
