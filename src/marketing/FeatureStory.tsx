/**
 * FeatureStory — the six features on phones as a story you scroll DOWN, one feature per flick (≤760px;
 * landing on phones v3, 26 Oct; ref design-refs/landing-mobile-v3.html `.p3`, `.s3`, `.tl`). A picture
 * panel sticks just under the 60px bar and takes half the screen below it (never more than 420px).
 * Each caption is exactly the space beneath it and is a snap point (`scroll-snap-stop: always`, its
 * margin the bar plus the panel), so one flick lands the next caption directly under the picture.
 * A caption is a "N of 6" label, the heading, one line and three ticked points. The one whose top has
 * passed 72% of the viewport is current: full opacity, the panel cross-fades (0.45s) to its picture,
 * and the six-step bar fills to it. After the sixth, a closing beat ("And so much more.") snaps under
 * the bar with the top of the navy vision showing beneath it. The desktop rows are unchanged.
 *
 * ⚠️ THE PAGE SNAPS WITH CSS ALONE: `html` takes `scroll-snap-type: y proximity` while this section is
 * on the page (phones, the landing only), and nothing but the captions and the beat is a snap point,
 * so the hero, the vision, the closing card and the footer scroll freely. No script moves the scroll
 * position. Reduced motion: no snapping and no cross-fade.
 *
 * ⚠️ NO SCROLL HIJACKING. The page scrolls as a page: the panel is `position: sticky` inside this
 * section only, so once the last caption has passed the panel scrolls away with the section and the
 * vision rises straight up beneath it. Nothing snaps and nothing listens to the wheel.
 *
 * ⚠️ THE CURRENT CAPTION IS DERIVED FROM WHERE THE CAPTIONS ARE, READ ON SCROLL — the ref's own rule,
 * and the same answer for a swipe, a key, a deep link or a reload halfway down.
 *
 * ⚠️ THE PICTURES ARE THE ROWS' PICTURES: the file, its pixel size and its version come from
 * `FeatureRows`' table, so a picture replaced there is replaced here.
 *
 * Reduced motion: the picture swaps instantly (no cross-fade); everything else is the same.
 */
import React, { useEffect, useRef, useState } from "react";
import { FEATURE_ROWS, FEATURE_STORY, BAND_HEADING, featureStoryLabel, STORY_MORE_HEADING, STORY_MORE_LINE } from "./landingCopy";
import { ILLUSTRATIONS } from "./FeatureRows";

/** A caption is current once its top has passed this share of the viewport's height (the ref's .72). */
const CURRENT_AT = 0.72;

/** The ref's ring-tick marker for a caption's points. */
const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#a2452a" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#a2452a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FeatureStory: React.FC = () => {
  const steps = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const el = steps.current; if (!el) return;
      const line = window.innerHeight * CURRENT_AT;
      let a = 0;
      Array.from(el.children).forEach((c, i) => { if (c.getBoundingClientRect().top < line) a = i; });
      setAt((was) => (was === a ? was : a));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    read();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);

  const rows = FEATURE_STORY.map((c) => FEATURE_ROWS.find((r) => r.key === c.key)!);

  return (
    <>
    <section className="mk-story" id="mk-features" aria-label={BAND_HEADING}>
      <div className="mk-spimg">
        {rows.map((row, i) => {
          const art = ILLUSTRATIONS[row.image];
          return (
            <img key={row.key} className={i === at ? "mk-on" : undefined} src={row.image + "?v=" + art.version}
                 alt={i === at ? row.alt : ""} aria-hidden={i === at ? undefined : true}
                 width={art.width} height={art.height} loading="lazy" />
          );
        })}
        <div className="mk-spbar" aria-hidden="true">
          {FEATURE_STORY.map((c, i) => <i key={c.key} className={i <= at ? "mk-on" : undefined} />)}
        </div>
      </div>
      <div className="mk-spsteps" ref={steps}>
        {FEATURE_STORY.map((c, i) => (
          <div className={"mk-s3" + (i === at ? " mk-on" : "")} key={c.key}>
            <span className="mk-s3n">{featureStoryLabel(i + 1, FEATURE_STORY.length)}</span>
            <h3 className="mk-s3h3">{c.heading}</h3>
            <p>{c.line}</p>
            <ul>{c.points.map((pt) => <li key={pt}><Tick /><span>{pt}</span></li>)}</ul>
          </div>
        ))}
      </div>
    </section>
    {/* The closing beat, outside the story's section so the picture has let go of the bar by now. */}
    <div className="mk-tl">
      <p className="mk-tl1">{STORY_MORE_HEADING}</p>
      <p className="mk-tl2">{STORY_MORE_LINE}</p>
      <span className="mk-tla" aria-hidden="true">↓</span>
    </div>
    </>
  );
};
