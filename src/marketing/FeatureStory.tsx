/**
 * FeatureStory — the six features on phones as a story you scroll DOWN (≤760px; landing on phones v2,
 * 26 Oct; ref design-refs/landing-mobile-v2.html `.sp.big`, `.spimg`, `.spbar`, `.spt`). A picture
 * panel sticks just under the 60px bar and takes half the screen below it (never more than 420px);
 * one caption per feature scrolls up beneath it. The caption whose top has passed 84% of the viewport
 * is the current one: it is at full opacity, the panel cross-fades (0.45s) to its picture, and the
 * six-step bar fills to it. It replaces v1's swipe strip; the desktop rows (`FeatureRows`) are unchanged.
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
import { FEATURE_ROWS, FEATURE_STORY, BAND_HEADING } from "./landingCopy";
import { ILLUSTRATIONS } from "./FeatureRows";

/** A caption is current once its top has passed this share of the viewport's height (the ref's .84). */
const CURRENT_AT = 0.84;

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
          <div className={"mk-spt" + (i === at ? " mk-on" : "")} key={c.key}>
            <h3 className="mk-spth3">{c.heading}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
};
