/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles — the two explanatory blocks (v3 §2/§3).
 *
 * ⚠️ ONE COMPONENT PER BLOCK, TWO PLACEMENTS EACH. The feature block and the three-stage block each
 * render at the top of the FIRST-VISIT state and again, demoted, at the foot of the WORKSPACE. The
 * difference is props — never a second copy of the markup, and never a second copy of the copy. Two
 * copies of a sentence is two sentences the day one of them is edited.
 *
 * ⚠️ EVERYTHING HERE IS GENERAL GUIDANCE AND NEVER APPRAISAL. No slide, heading or paragraph may
 * refer to the writer's own manuscript or their own comps. This page has been walked back from that
 * line once already (`c5832984`, "the page stops appraising"), and these blocks sit directly above
 * the list they would otherwise be appraising.
 *
 * ⚠️ THE ILLUSTRATIONS ARE NAMED DASHED PLACEHOLDERS, at the ref's dimensions. No stock art, no
 * generated images, no emoji — the names are the illustrator's brief and they are in the report.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";

/** One carousel slide. `slot` is the illustrator's brief; `caption`/`body` are the ref's copy. */
export interface CompSlide {
  slot: string;
  caption: string;
  body: string;
}

/**
 * ⚠️ A LIST, NOT FIVE HARDCODED BLOCKS — the component takes an array so one implementation serves
 * both placements.
 *
 * ⚠️ AND THE RECENCY LINE STAYS SOFT: "broadly the last three to five years". Agents genuinely
 * disagree on the window, and tightening it to a single number would have the app manufacture a
 * consensus that does not exist. It has survived three packs; it is not a rounding opportunity.
 */
export const COMP_SLIDES: CompSlide[] = [
  { slot: "comp-job-shelf", caption: "Places it on a shelf",
    body: "Comps tell an agent exactly which section of the bookshop your manuscript belongs in." },
  { slot: "comp-job-readership", caption: "Names the readership",
    body: "They point to a set of readers who already buy books like yours." },
  { slot: "comp-job-sales", caption: "Backs the sales case",
    body: "Editors build a book's numbers partly on how its nearest neighbours actually sold." },
  { slot: "comp-job-tone", caption: "Carries the tone",
    body: "A well-chosen pair conveys how the book feels faster than any synopsis can." },
  { slot: "comp-job-current", caption: "Shows you read now",
    body: "Recent comps — broadly the last three to five years — show you know today's market, not the one you grew up reading." },
];

const AUTOPLAY_MS = 4200;

/**
 * The carousel.
 *
 * ⚠️ HAND-ROLLED, AND THAT IS A CONSTRAINT RATHER THAN A PREFERENCE — no new dependencies. What a
 * library would give us here is autoplay, dots and a slide index, all of which are a `useState` and
 * an interval.
 *
 * ⚠️ REDUCED MOTION IS NOT OPTIONAL AND IS NOT A CSS-ONLY ANSWER. `prefers-reduced-motion` here has
 * to stop the TIMER, not just the transition: an animation suppressed in CSS still changes the slide
 * underneath, so the content would jump every 4.2s for exactly the reader who asked it not to. The
 * dots keep working — the reader may still move through it themselves, which is the point of
 * honouring the preference rather than disabling the feature.
 *
 * ⚠️ AND THE QUERY IS WATCHED, NOT READ ONCE. Someone who turns the preference on while the page is
 * open must have the autoplay stop, so the listener re-runs the effect rather than sampling at mount.
 */
export const CompCarousel: React.FC<{ slides: CompSlide[]; label: string }> = ({ slides, label }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const count = slides.length;

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (reduced || paused || count < 2) return;
    const t = window.setInterval(() => setIndex((n) => (n + 1) % count), AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [reduced, paused, count]);

  const go = useCallback((n: number) => setIndex(((n % count) + count) % count), [count]);

  return (
    <div
      className="ct-caro"
      /* ⚠️ THE REGION IS NAMED, or a screen reader meets an unlabelled group of five things. */
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      /* ⚠️ FOCUS PAUSES IT TOO. A keyboard reader tabbing into the dots is reading it, and a slide
         changing under them mid-read is the same interruption a pointer user is spared by hover. */
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="ct-caro-stage">
        <span className="ct-caro-count" aria-hidden="true">{index + 1} / {count}</span>
        {slides.map((s, i) => (
          /* ⚠️ INACTIVE SLIDES LEAVE THE ACCESSIBILITY TREE, not just the viewport. Visually hidden
             but readable is how a screen reader ends up narrating all five at once; `aria-hidden`
             removes them from the tree and `inert` removes them from the tab order — both, because
             each covers a hole the other leaves. */
          <div
            key={s.slot}
            className={`ct-caro-slide${i === index ? " on" : ""}`}
            aria-hidden={i === index ? undefined : true}
            {...(i === index ? {} : { inert: true })}
          >
            <div className="ct-caro-slot" data-slot={s.slot}>
              <span>{s.slot}</span>
              <span>396×270</span>
            </div>
            <div className="ct-caro-cap">
              <h4>{s.caption}</h4>
              <p>{s.body}</p>
            </div>
          </div>
        ))}
      </div>
      {/* ⚠️ REAL BUTTONS WITH REAL LABELS. A row of styled `<span>`s is the usual shape here and it
          is unreachable by keyboard; the label names the slide rather than its number, because "go
          to slide 3" tells a reader nothing about where they are going. */}
      <div className="ct-caro-dots">
        {slides.map((s, i) => (
          <button
            key={s.slot}
            type="button"
            className={`ct-caro-dot${i === index ? " on" : ""}`}
            aria-label={`Show: ${s.caption}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </div>
  );
};

/** The two standfirsts — the demoted placement drops the last sentence, exactly as the ref draws it. */
export const FEATURE_HEADING = "What does a good comp do?";
const FEATURE_LEAD_FULL =
  "A comp is a recent, published book your manuscript sits beside. Two well-chosen comps tell an agent where your book shelves, who buys it, and how it feels — before they've read a word. Gather yours here, and they'll be ready for every query letter and submission package you build.";
const FEATURE_LEAD_SHORT =
  "A comp is a recent, published book your manuscript sits beside. Two well-chosen comps tell an agent where your book shelves, who buys it, and how it feels — before they've read a word.";

/**
 * ⚠️ `demoted` IS THE ONLY DIFFERENCE BETWEEN THE TWO PLACEMENTS — a smaller heading, the shorter
 * standfirst, and no actions. The actions are what makes it a first-visit block; offering "Add your
 * first comp" underneath a list of comps would be the page forgetting what the reader has done.
 */
export const FeatureBlock: React.FC<{
  demoted?: boolean;
  onAddComp?: () => void;
  onScout?: () => void;
}> = ({ demoted = false, onAddComp, onScout }) => (
  <section className={`ct-feature${demoted ? " demoted" : ""}`} aria-labelledby="ct-feature-h">
    <div className="ct-feature-l">
      {/* ⚠️ PLAIN PLAYFAIR IN INK, ONE WEIGHT — no italic accent word, no burgundy `<em>`, no
          colour-shifted word. A heading that changes colour mid-sentence reads as two things. */}
      <h2 className="ct-feature-h" id="ct-feature-h">{FEATURE_HEADING}</h2>
      <p className="ct-feature-p">{demoted ? FEATURE_LEAD_SHORT : FEATURE_LEAD_FULL}</p>
      {!demoted && (
        <div className="ct-feature-ctas">
          {/* ⚠️ THE THEME'S SOLID DARK, NOT BURGUNDY-FILLED. Burgundy is this app's advisory ink;
              a burgundy-filled primary makes the page's main action look like a warning. */}
          <button type="button" className="ct-btn-dark" onClick={onAddComp}>
            Add your first comp
          </button>
          {/* slate marks the TIER, and the chip says which — the same slate the Scout's band uses */}
          <button type="button" className="ct-btn-slateghost" onClick={onScout}>
            Try the Scout<span className="ct-tag pro">Pro</span>
          </button>
        </div>
      )}
    </div>
    <CompCarousel slides={COMP_SLIDES} label="What a good comp does" />
  </section>
);

/** One stage of the three-stage explainer. */
interface CompStage {
  slot: string;
  label: string;
  heading: string;
  body: string;
}

/**
 * ⚠️ STAGE THREE SAYS "follow their journey", NOT "track their performance" — the comp→letter
 * analytics do not exist, and copy states what the code does today.
 *
 * ⚠️ AND ITS PARAGRAPH IS TRIMMED FOR THE SAME REASON, WHICH IS A DEVIATION FROM "take it verbatim".
 * The ref ends it "…and see which letters carried which comps". Nothing links a comp to a letter:
 * `SubmissionPackage` carries three version ids and no comps, and `CompTitle` carries an `inQuery`
 * intent and no usage record. The brief pre-emptively fixed the HEADING for exactly this reason and
 * did not reach the sentence beneath it. Flagged in the report; the clause returns the day the link
 * does.
 */
export const COMP_STAGES: CompStage[] = [
  { slot: "comp-stage-add", label: "Stage one", heading: "Add comps from your own reading",
    body: "Record the books you already know your manuscript sits beside — with the year, the imprint, and a note on what each one shares." },
  { slot: "comp-stage-scout", label: "Stage two", heading: "Get tailored recommendations from the Scout",
    body: "The Scout reads your manuscript's details and returns recent, real titles that match it — each checked against a real catalogue, with its provenance shown." },
  { slot: "comp-stage-track", label: "Stage three", heading: "Add them to queries and follow their journey",
    body: "Build your query letter line from your comps, and keep it ready for the submission packages you send." },
];

export const StagesBlock: React.FC = () => (
  <section className="ct-stages" aria-labelledby="ct-stages-h">
    <h3 className="ct-stages-h" id="ct-stages-h">Managing your comps with ScriptAlly</h3>
    <p className="ct-stages-p">Gather them, grow them, and put them to work in your queries.</p>
    <div className="ct-stages-grid">
      {COMP_STAGES.map((s, i) => (
        /* ⚠️ THE CONNECTOR IS A CLASS ON THE STAGE, NOT A SEPARATE ELEMENT, and the LAST stage never
           carries it — a trailing connector points at nothing. It is drawn only on wide viewports,
           because once the grid stacks a horizontal rule between rows is pointing sideways. */
        <div key={s.slot} className={`ct-stage${i < COMP_STAGES.length - 1 ? " linked" : ""}`}>
          <div className="ct-stage-slot" data-slot={s.slot}><span>{s.slot}</span></div>
          <span className="ct-lbl">{s.label}</span>
          <h4>{s.heading}</h4>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  </section>
);
