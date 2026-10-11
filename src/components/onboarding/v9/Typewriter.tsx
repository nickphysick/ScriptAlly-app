/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The typewriter (onboarding v9): text that arrives letter by letter, with no cursor.
 *
 * ⚠️ THE WHOLE TEXT IS LAID OUT FROM THE FIRST FRAME. Each run is drawn as the part that has
 * appeared and the part that has not, the second `visibility: hidden`: it takes its space, so
 * nothing reflows as the letters arrive, and a screen reader is given the whole sentence at once
 * through the line's `aria-label`.
 *
 * The count is derived from elapsed time against a schedule (never one timer per letter), so a
 * throttled tab catches up instead of drifting. Under reduced motion, and after a click, it is all
 * there at once.
 */
import React, { useEffect, useRef, useState } from "react";
import { typeSchedule, typedCount, lineText, type Run } from "../../../lib/onboardingV9";

export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Type `lines` in. Returns how many characters have appeared, the total, whether it has finished,
 * and `finish()` (a click on the passage). `startDelay` holds the first letter back.
 */
export function useTypewriter(lines: readonly string[], opts: { startDelay?: number; leadMs?: number; bodyMs?: number } = {}) {
  const schedule = React.useMemo(() => typeSchedule(lines, opts.leadMs, opts.bodyMs), [lines.join("\n"), opts.leadMs, opts.bodyMs]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = schedule.length;
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? total : 0));
  const raf = useRef(0);
  useEffect(() => {
    if (prefersReducedMotion()) { setShown(total); return; }
    const started = performance.now() + (opts.startDelay ?? 0);
    const tick = () => {
      const n = typedCount(schedule, performance.now() - started);
      setShown((cur) => (cur >= total ? cur : Math.max(cur, n)));
      if (n < total) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [schedule, total]); // eslint-disable-line react-hooks/exhaustive-deps
  return { shown: Math.min(shown, total), total, done: shown >= total, finish: () => { cancelAnimationFrame(raf.current); setShown(total); } };
}

/** One typed line. `from` is the index of its first character in the whole passage. */
export const TypedLine: React.FC<{ runs: readonly Run[]; from: number; shown: number; as?: "p" | "h1"; className?: string; id?: string }> = ({ runs, from, shown, as = "p", className, id }) => {
  let at = from;
  const Tag = as;
  return (
    <Tag className={className} id={id} aria-label={lineText(runs)}>
      {runs.map((r, i) => {
        const start = at;
        at += r.text.length;
        const n = Math.max(0, Math.min(r.text.length, shown - start));
        const body = (
          <>
            <span aria-hidden="true">{r.text.slice(0, n)}</span>
            {n < r.text.length && <span aria-hidden="true" className="o9-unseen">{r.text.slice(n)}</span>}
          </>
        );
        return r.em ? <em key={i}>{body}</em> : <React.Fragment key={i}>{body}</React.Fragment>;
      })}
    </Tag>
  );
};
