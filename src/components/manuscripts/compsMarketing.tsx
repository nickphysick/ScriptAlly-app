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
/* ⚠️ THE SLOT IS LABELLED 396×250, WHICH IS WHAT THE BOX IS — and the v3.1 ref disagrees with
   itself here: its CSS draws `height: 250px` while its label text reads 396×270. The label is the
   illustrator's brief, so it has to describe the box the artwork will actually sit in; art drawn to
   270 would not fit. Flagged in the report. */
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

/**
 * The second track (v3.1 §6).
 *
 * ⚠️ THE COPY IS RECOVERED VERBATIM FROM `cc27a62e`, NOT REWRITTEN. These five cells were reviewed
 * once and then lost: they belonged to `FieldNotesCard`, which v3 §6 retired because it duplicated
 * the first track's five jobs — and the missteps went with it because the v3 reference carried them
 * nowhere. The carousel is their home now, which is why the card did not need reviving.
 *
 * ⚠️ AND THEY DESCRIBE MISSTEPS IN GENERAL, NEVER THIS WRITER'S. "Comping the giants" is a thing
 * people do; it is not an observation about the list three sections down. That distinction is the
 * whole reason this page is allowed to give advice at all.
 */
export const COMP_MISSTEPS: CompSlide[] = [
  { slot: "comp-miss-giants", caption: "Comping the giants",
    body: "Global phenomena can't anchor a realistic case for a debut — and everyone names them." },
  { slot: "comp-miss-age", caption: "Reaching too far back",
    body: "A comp from another publishing era says the market has moved on without you." },
  { slot: "comp-miss-unread", caption: "Comping the unread",
    body: "Agents ask about comps. A title you haven't read is easily exposed." },
  { slot: "comp-miss-shelf", caption: "Crossing shelves",
    body: "Comps from the wrong category muddy where the book sits — and who it's for." },
  { slot: "comp-miss-count", caption: "Piling them on",
    body: "Two is the common counsel, three at most. A longer list dilutes the signal." },
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
      {/* ⚠️ NO `n / 5` COUNTER (v3.1 §2) — the dots already state position, and two devices saying
          one thing is one of them to keep in step for nothing. */}
      <div className="ct-caro-stage">
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
              <span>396×250</span>
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

/**
 * ⚠️ ONE FEATURE COMPONENT, TWO BLOCKS, TWO PLACEMENTS EACH (v3.1 §4/§5). The five jobs and the five
 * missteps are the SAME block with different content and a `flip`; each renders again demoted at the
 * workspace foot. Four renders, one implementation — never a second copy of the markup, and
 * therefore never a second copy of the copy.
 *
 * ⚠️ AND `flip` REORDERS THE CHILDREN, IT DOES NOT DUPLICATE THEM. `direction: rtl` and a second
 * markup order were both available and both wrong: the first inverts punctuation and scrollbars, the
 * second is the duplication this file exists to avoid. `order` on the two grid children is the whole
 * mechanism.
 */
export interface FeatureCopy {
  heading: string;
  lead: string;
  /** the demoted placement's shorter lead, where one is wanted */
  leadShort?: string;
  slides: CompSlide[];
  carouselLabel: string;
}

export const FEATURE_JOBS: FeatureCopy = {
  heading: "What does a good comp do?",
  lead: "A comp is a recent, published book your manuscript sits beside. Two well-chosen comps tell an agent where your book shelves, who buys it, and how it feels — before they've read a word. Gather yours here, and they'll be ready for every query letter and submission package you build.",
  leadShort: "A comp is a recent, published book your manuscript sits beside. Two well-chosen comps tell an agent where your book shelves, who buys it, and how it feels — before they've read a word.",
  slides: COMP_SLIDES,
  carouselLabel: "What a good comp does",
};

/**
 * ⚠️ THE STANDFIRST IS NICK'S, SUPPLIED DIRECTLY — it is NOT "from the mockup", because the ref this
 * pack names carries no such block: it still shows the toggle design this replaces. Recorded so
 * nobody later goes looking for a source that does not exist.
 */
export const FEATURE_MISSTEPS: FeatureCopy = {
  /* ⚠️ NO EYEBROW (v3.1 §5). The heading carries it; a mono label above a Playfair heading that says
     nearly the same thing is a second voice for one idea. */
  heading: "Things to avoid",
  lead: "The same handful of missteps turn up in query letters again and again. None of them are about the writing — they are about the choice of comp, which makes them the easiest thing on the page to get right.",
  slides: COMP_MISSTEPS,
  carouselLabel: "Common missteps",
};

/**
 * ⚠️ `demoted` DROPS THE ACTION AND STEPS THE HEADING DOWN. Offering "Add your first comp" beneath a
 * list of comps is the page forgetting what the reader has already done — and the add action has
 * three homes up there already.
 */
export const FeatureBlock: React.FC<{
  copy: FeatureCopy;
  flip?: boolean;
  demoted?: boolean;
  onAddComp?: () => void;
}> = ({ copy, flip = false, demoted = false, onAddComp }) => (
  <section
    className={`ct-measure ct-feature${flip ? " flip" : ""}${demoted ? " demoted" : ""}`}
    aria-label={copy.heading}
  >
    <div className="ct-feature-l">
      {/* ⚠️ PLAIN PLAYFAIR IN INK, ONE WEIGHT — no italic accent word, no burgundy `<em>`, no
          colour-shifted word. A heading that changes colour mid-sentence reads as two things. */}
      <h2 className="ct-feature-h">{copy.heading}</h2>
      <p className="ct-feature-p">{demoted && copy.leadShort ? copy.leadShort : copy.lead}</p>
      {!demoted && onAddComp && (
        <div className="ct-feature-ctas">
          {/* ⚠️ THE THEME'S SOLID DARK, NOT BURGUNDY-FILLED. `--ct-accent` is this page's ADVISORY
              ink; filling the main action with it makes the thing to do look like a warning. */}
          <button type="button" className="ct-btn-dark" onClick={onAddComp}>
            Add your first comp
          </button>
        </div>
      )}
    </div>
    <CompCarousel slides={copy.slides} label={copy.carouselLabel} />
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
  /* ⚠️ NO BAND ANY MORE (v3.1 §4). The stages moved to the TOP of the page, and a wash that made
     sense as a closing section reads as a header treatment at the top. The three blocks are now
     separated by hairline dividers on one surface — the sheet — rather than by changing surface. */
  /* ⚠️ A WIDER MEASURE THAN THE FEATURE BLOCKS, DELIBERATELY (v3.1 §1). 1240 against their 1060,
     because a three-across grid of images needs the room and a three-column grid squeezed to a
     copy measure makes each image too small to read. The left edges therefore do NOT align down
     the page — that is intended, and unifying them is the thing not to "fix". */
  <section className="ct-stageswide ct-stages" aria-labelledby="ct-stages-h">
    <h3 className="ct-stages-h" id="ct-stages-h">Curate your comps with ScriptAlly</h3>
    <p className="ct-stages-p">Gather them, grow them, and put them to work in your queries.</p>
    <div className="ct-stages-grid">
      {COMP_STAGES.map((s, i) => (
        /* ⚠️ THE CONNECTOR IS A CLASS ON THE STAGE, NOT A SEPARATE ELEMENT, and the LAST stage never
           carries it — a trailing connector points at nothing. It is drawn only on wide viewports,
           because once the grid stacks a horizontal rule between rows is pointing sideways. */
        /* ⚠️ NO CONNECTOR CLASS ANY MORE (v3.1 §4) — the hairlines between stages went with the
           circles they joined. A rule between two rectangular plates reads as a border, not a link. */
        <div key={s.slot} className="ct-stage">
          <div className="ct-stage-slot" data-slot={s.slot}><span>{s.slot}</span></div>
          <span className="ct-lbl">{s.label}</span>
          <h4>{s.heading}</h4>
          <p>{s.body}</p>
        </div>
      ))}
    </div>
  </section>
);
