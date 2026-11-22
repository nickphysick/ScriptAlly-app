/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — TOP TIP (Part E; ref design-refs/dashboard-feed-v1/ screen 01, right column).
 *
 * A post-it yellow header ("Top tip", "From the Mentor · {i} of {n}", the pointing Mentor and the chick standing on its
 * bottom edge), then the tip in a white body, with the dots and ‹ › under a hairline.
 *
 * ⚠️ THE TIPS ARE `DASH_TIPS` AND NOTHING ELSE. They carry no headline field, so each tip's `lead` is its headline
 * (its full stop dropped) and its `rest` is the text.
 * ⚠️ IT TURNS EVERY 7 SECONDS, and pauses while the pointer is over the card, while focus is inside it, and while the
 * tab is hidden — resuming where it left off, never from the start. ‹, › and the dots jump and restart the clock.
 * Under reduced motion it never turns by itself, and a change has no animation.
 * ⚠️ THE CARD IS ITS LONGEST TIP'S HEIGHT AT ANY WIDTH, WITH NO MEASURING: every tip sits in one grid cell and only the
 * current one shows.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { DASH_TIPS } from "../../../lib/dashTips";
import { ArtSlot } from "../../todo/ArtSlot";

export const TIP_MS = 7000;
/** "Query in batches." → "Query in batches" */
export const tipHeadline = (lead: string): string => lead.replace(/[.\s]+$/, "");

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const F1Tip: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
  const n = DASH_TIPS.length;
  const [at, setAt] = useState(0);
  const [dir, setDir] = useState(1);
  const [prev, setPrev] = useState<number | null>(null);
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);
  /* a new page of the clock: bumped on every jump, so the dot's fill animation starts again */
  const [run, setRun] = useState(0);
  const paused = hover || focus || hidden;
  const still = reduced();

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const go = useCallback((to: number, d: number) => {
    setAt((cur) => { if (to !== cur) setPrev(cur); return to; });
    setDir(d);
    setRun((r) => r + 1);
  }, []);

  /* ⚠️ THE CLOCK KEEPS WHAT IS LEFT, so a pause resumes where it left off: `left` is the time remaining on this tip,
     spent while running and kept while paused. A new tip (`run`) starts it at the full 7s. */
  const left = useRef(TIP_MS);
  useEffect(() => { left.current = TIP_MS; }, [run]);
  useEffect(() => {
    if (still || loading || paused || n < 2) return undefined;
    const started = Date.now();
    const t = window.setTimeout(() => go((at + 1) % n, 1), left.current);
    return () => { window.clearTimeout(t); left.current = Math.max(0, left.current - (Date.now() - started)); };
  }, [still, loading, paused, n, at, run, go]);

  const card = useRef<HTMLElement>(null);
  return (
    <section
      ref={card}
      className={`df1-tip${paused ? " is-paused" : ""}${still ? " is-still" : ""}`}
      data-df1="tip" data-at={at} data-paused={paused ? "1" : "0"}
      aria-roledescription="carousel" aria-label="Top tips"
      style={{ ["--dx" as string]: `${dir * 14}px` } as React.CSSProperties}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={(e) => { if (!card.current?.contains(e.relatedTarget as Node | null)) setFocus(false); }}
    >
      <div className="df1-tiph">
        <div className="df1-tipl">
          <span className="df1-tipttl">Top tip</span>
          <small data-df1="tip-pos">From the Mentor · {at + 1} of {n}</small>
        </div>
        <ArtSlot name="dash-mentor-pointing" maxWidth={127} className="df1-tipart" />
      </div>
      <div className="df1-tipb">
        <div className="df1-tipswap" aria-live="polite">
          {DASH_TIPS.map((t, i) => (
            <div key={i} className={`df1-tipit${i === at ? " is-on" : i === prev ? " is-leave" : ""}`} data-df1="tip-item" data-on={i === at ? "1" : "0"}
              aria-hidden={i === at ? undefined : true}>
              <h4 className="df1-tiph4">{tipHeadline(t.lead)}</h4>
              <p>{t.rest}</p>
            </div>
          ))}
        </div>
        <div className="df1-tipf">
          <span className="df1-tipdots">
            {DASH_TIPS.map((_, i) => (
              <button key={i} type="button" aria-label={`Tip ${i + 1} of ${n}`} aria-current={i === at ? "true" : undefined} data-df1="tip-dot"
                className={i === at ? "is-on" : undefined} onClick={() => { if (i !== at) go(i, i > at ? 1 : -1); }}>
                {i === at && <b key={run} className={still || loading || n < 2 ? "is-full" : "is-run"} style={{ animationDuration: `${TIP_MS}ms` }} />}
              </button>
            ))}
          </span>
          <button type="button" className="df1-tipx" aria-label="Previous tip" data-df1="tip-prev" onClick={() => go((at + n - 1) % n, -1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button type="button" className="df1-tipx" aria-label="Next tip" data-df1="tip-next" onClick={() => go((at + 1) % n, 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
};
