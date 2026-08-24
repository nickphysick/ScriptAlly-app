/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ FIRST VISIT — the page teaches before it files ════════════════════════════════════════════
 *
 * Design authority: design-refs/submission-packages-teach-first.html.
 *
 * ⚠️ NO WORKSPACE FURNITURE HERE, AND THAT IS THE WHOLE FIX (D-A4). The page it replaces showed a
 * writer their empty filing system before they knew what filing was for: three empty material
 * columns, zero counts, ghost cards and a tracking panel reporting on nothing. Every one of those
 * says "you have not done the thing" to somebody who has not yet been told what the thing is.
 *
 * ⚠️ THE STATE IS DERIVED, NEVER STORED. `materials + packages === 0` — so it comes back if a writer
 * clears everything out, which is correct: they are a first-time user of a feature they now have no
 * record in. A `hasSeenPackages` flag would strand them on a workspace that has nothing to show.
 *
 * ⚠️ AND IT KEEPS ITS OWN STAGE STRIP (D-C4). The drawer teaches the same three stages, and on first
 * visit the teaching is THE PAGE — a writer must not have to open a panel to find out what the
 * feature does.
 *
 * ⚠️ MIRRORED FROM COMPARABLE TITLES, NOT SHARED WITH IT — deliberately, and flagged as F-S. Their
 * `CompCarousel` is nearly generic and hardcodes one comps-shaped string (`396×250`), and their
 * pattern moved hours before this was written (comps v3.1). The brief's instruction for that case is
 * to build to what is on `main` and flag the divergence. Importing `comps.css` for a carousel would
 * have coupled two pages through a thousand-line stylesheet reading `--ct-*` tokens this page does
 * not own. Structure, conventions and behaviour match theirs; the report carries the extraction
 * shape.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import "./packagesTeach.css";

export interface TeachSlide {
  /** Slot id + rendered size, in the comps convention: `PKG-JOB-RECORD · 396×214`. */
  slot: string;
  caption: string;
  body: string;
  /** The placeholder mark, as paths on a 32×32 viewBox. Provisional — the plate stays dashed. */
  art: React.ReactNode;
}

/** The four jobs a package does. Copy verbatim from the ref. */
export const TEACH_SLIDES: TeachSlide[] = [
  {
    slot: "PKG-JOB-RECORD · 396×214",
    caption: "Remembers exactly what went",
    body: "Which letter, which synopsis, which pages — recorded per agent, so six months later you know precisely what any of them is holding.",
    art: <><path d="M7 4h13l5 5v19H7z" /><path d="M20 4v5h5" /><path d="M11 14h11M11 18h11M11 22h7" /></>,
  },
  {
    slot: "PKG-JOB-REUSE · 396×214",
    caption: "Sends without rebuilding",
    body: "Bundle once, attach to every query that wants the same combination. No re-assembling the same three documents forty times.",
    art: <><path d="M16 4 28 10v12L16 28 4 22V10z" /><path d="M16 15 28 10M16 15v13M16 15 4 10" /><path d="M10 7l12 6" /></>,
  },
  {
    slot: "PKG-JOB-REPLIES · 396×214",
    caption: "Ties replies to materials",
    body: "When an agent replies or requests more, it lands against the package that went out — so every figure traces back to real correspondence.",
    art: <><path d="M5 14 16 6l11 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z" /><path d="M5 14l11 8 11-8" /></>,
  },
  {
    slot: "PKG-JOB-SCORECARD · 396×214",
    caption: "Shows which combination lands",
    body: "Two letters, two synopses, tested across your list — Tracking reports which materials sit behind each request, as counts, not guesses.",
    art: <><path d="M5 26h22M5 26V5" /><rect x="9" y="17" width="4" height="9" /><rect x="15" y="12" width="4" height="14" /><rect x="21" y="7" width="4" height="19" /></>,
  },
];

export interface TeachStage {
  slot: string;
  n: string;
  title: string;
  body: string;
  art: React.ReactNode;
}

export const TEACH_STAGES: TeachStage[] = [
  {
    slot: "PKG-STAGE-ADD", n: "Stage one", title: "Add your materials",
    body: "Versions of your covering letter, synopsis and sample pages — written here or pasted in. Most writers keep two or three of each.",
    art: <><path d="M7 4h13l5 5v19H7z" /><path d="M20 4v5h5" /><path d="M16 14v8M12 18h8" /></>,
  },
  {
    slot: "PKG-STAGE-BUNDLE", n: "Stage two", title: "Bundle them into packages",
    body: "Pick one of each and name the combination. Attach a package when you log a query — its contents go exactly as they are.",
    art: <><path d="M16 4 28 10v12L16 28 4 22V10z" /><path d="M16 15 28 10M16 15v13M16 15 4 10" /></>,
  },
  {
    slot: "PKG-STAGE-TRACK", n: "Stage three", title: "Track what comes back",
    body: "Replies land against the package that went out. Tracking shows which materials sit behind each response and request.",
    art: <><path d="M5 26h22M5 26V5" /><rect x="9" y="17" width="4" height="9" /><rect x="15" y="11" width="4" height="15" /><rect x="21" y="7" width="4" height="19" /></>,
  },
];

export const TEACH_HEADLINE = "Fed up of guessing which materials are landing with agents?";
export const TEACH_CTA = "Add your first material";
export const STAGES_HEADING = "Managing your packages with ScriptAlly";
export const STAGES_SUB = "Gather your materials, bundle them, and let the replies report back.";

const AUTOPLAY_MS = 4200;

/**
 * ⚠️ AUTOPLAY STOPS ON INTERACTION AND UNDER REDUCED MOTION. A carousel that keeps moving while a
 * reader is part-way through the card they chose is taking the page back off them.
 */
const TeachCarousel: React.FC<{ slides: TeachSlide[]; label: string }> = ({ slides, label }) => {
  const [index, setIndex] = useState(0);
  const held = useRef(false);
  const count = slides.length;

  const go = useCallback((i: number) => { held.current = true; setIndex(i); }, []);

  useEffect(() => {
    if (held.current) return;
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [count, index]);

  const s = slides[index];
  return (
    <div className="pkgt-caro" aria-roledescription="carousel" aria-label={label}>
      <div className="pkgt-caro-card">
        <div className="pkgt-caro-ct" aria-hidden="true">{index + 1} / {count}</div>
        {/* ⚠️ DASHED, BECAUSE DASHED MEANS PROVISIONAL on these pages — the artwork is a commission,
            not a rendering fault, and the plate carries its own slot id so the brief is on screen. */}
        <div className="pkgt-caro-slot" data-slot={s.slot}>
          <svg viewBox="0 0 32 32" aria-hidden="true">{s.art}</svg>
          <span className="pkgt-slotlbl">SLOT · {s.slot}</span>
        </div>
        <h4>{s.caption}</h4>
        <p>{s.body}</p>
      </div>
      {/* ⚠️ REAL BUTTONS WITH REAL LABELS — a row of styled spans is unreachable by keyboard, and
          "go to slide 3" tells a reader nothing about where they are going. */}
      <div className="pkgt-dots">
        {slides.map((sl, i) => (
          <button
            key={sl.slot} type="button"
            className={i === index ? "on" : undefined}
            aria-label={sl.caption}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
};

export interface PackagesTeachFirstProps {
  /** Opens the material modal — the one thing this state asks for. */
  onAddMaterial: () => void;
}

export const PackagesTeachFirst: React.FC<PackagesTeachFirstProps> = ({ onAddMaterial }) => (
  <div className="pkgt">
    <div className="pkgt-hero">
      <div>
        {/**
         * ⚠️ PLAYFAIR, NOT CAVEAT, AT THIS SIZE (D-A1). The same question is set in the hand on the
         * working page, where it is an aside beside real content. As the page's opening line it is
         * the headline, and a 40px hand reads as a poster rather than as the app talking.
         */}
        <h2 className="pkgt-h">{TEACH_HEADLINE}</h2>
        <div className="pkgt-body">
          A package is one covering letter, one synopsis and one sample, bundled under a name. Every
          package keeps its own scorecard — ScriptAlly records{" "}
          <b>which letter, synopsis and pages went to each agent</b>, so the answer sits on the page,
          not in your head.
        </div>
        {/* ⚠️ THE PAGE'S ONLY FILLED CONTROL, in this state as in the other. */}
        <button type="button" className="pkgt-cta" onClick={onAddMaterial}>{TEACH_CTA}</button>
      </div>
      <TeachCarousel slides={TEACH_SLIDES} label="What a package does" />
    </div>

    <section className="pkgt-stages" aria-labelledby="pkgt-stages-h">
      <h3 className="pkgt-stages-h" id="pkgt-stages-h">{STAGES_HEADING}</h3>
      <p className="pkgt-stages-sub">{STAGES_SUB}</p>
      <div className="pkgt-stage-grid">
        {TEACH_STAGES.map((st, i) => (
          <React.Fragment key={st.slot}>
            {i > 0 && <div className="pkgt-stage-dash" aria-hidden="true" />}
            <div className="pkgt-stage">
              <span className="pkgt-disc" data-slot={st.slot}>
                <svg viewBox="0 0 32 32" aria-hidden="true">{st.art}</svg>
                <span className="pkgt-disc-l">{st.slot}</span>
              </span>
              <span className="pkgt-stage-n">{st.n}</span>
              <h5>{st.title}</h5>
              <p>{st.body}</p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </section>
  </div>
);
