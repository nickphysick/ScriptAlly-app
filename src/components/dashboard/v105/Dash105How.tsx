/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v105 — HOW IT WORKS, AS SLIDES (ref design-refs/dashboard-v105/founding-how-v102.html, PANEL "Slides";
 * the same modal is drawn in founding-flow-v104.html as `#howB`). A centred modal, 520 wide: three slides, each a striped
 * picture, a typewriter title and a line or two; Back, the dots and Next / "Got it".
 *
 * ⚠️ PORTALLED TO `document.body`, so it carries its own colours and READS the shell's type tokens (`--sp-type`,
 *    `--sp-serif`, `--sp-mono`); it never names a family (marketingTokens.test counts the files that do).
 * ⚠️ ONE ESCAPE STACK: Escape is a layer (`ESC_LEVEL.pageModal`), never a second document listener. Focus is trapped
 *    inside while it is open and returns to the ⓘ that opened it (the card owns that). It reopens at slide 1.
 */
import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { HOW_SLIDES, HOW_TITLE, RANK_NAMES } from "../../../lib/foundingCard";
import { EggNest, GIFT_ICON, ICONS, headFor } from "./foundingArt";

export const Dash105How: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [i, setI] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const last = HOW_SLIDES.length - 1;
  useEscapeLayer(open, onClose, ESC_LEVEL.pageModal);

  /* every opening starts at slide 1, with focus inside */
  useEffect(() => {
    if (!open) return;
    setI(0);
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>('[data-d105h="next"]')?.focus());
  }, [open]);

  const go = (n: number) => setI(Math.max(0, Math.min(last, n)));
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); go(i + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); go(i - 1); }
    else if (e.key === "Tab") {
      /* the trap: the controls on show, wrapped at both ends */
      const f = [...(boxRef.current?.querySelectorAll<HTMLElement>("button:not([disabled])") ?? [])].filter((b) => b.offsetParent !== null && getComputedStyle(b).visibility !== "hidden");
      if (!f.length) return;
      const at = f.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && (at <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && at === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  };

  if (typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className={`d105-dim${open ? " on" : ""}`} data-d105h="dim" onClick={onClose} aria-hidden="true" />
      <div
        ref={boxRef} className={`d105-how${open ? " on" : ""}`} data-d105h="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-hidden={!open} inert={!open} onKeyDown={onKey} data-slide={i}
      >
        <h2 className="d105-sr2" id={titleId}>{HOW_TITLE}</h2>
        <button type="button" className="d105-hx2" data-d105h="close" aria-label="Close" onClick={onClose}>✕</button>
        <div className="d105-viewport">
          <div className="d105-slides" data-d105h="slides" style={{ transform: `translateX(-${i * 100}%)` }}>
            {HOW_SLIDES.map((s, n) => (
              <section key={s.title} className="d105-slide" data-d105h="slide" aria-hidden={n !== i} inert={n !== i}>
                <div className="d105-sart" aria-hidden="true">
                  {n === 0 && (["like", "dont", "idea"] as const).map((k, j) => (
                    <span key={k} className="d105-big"><i>{ICONS[k]}</i><small>{["Like", "Don’t like", "Idea"][j]}</small></span>
                  ))}
                  {n === 1 && (
                    <span className="d105-stair">
                      {RANK_NAMES.map((name, t) => {
                        const head = headFor(t);
                        return (
                          <span key={name} className={`d105-sn d105-sn${t}`}>
                            <span className="d105-hh">{head ? <img src={head} alt="" draggable={false} /> : <EggNest className="d105-hnest" />}</span>
                            <small>{name}</small>
                          </span>
                        );
                      })}
                    </span>
                  )}
                  {n === 2 && <span className="d105-gift"><i>{GIFT_ICON}</i></span>}
                </div>
                <h3 className="d105-st3">{s.title}</h3>
                <p className="d105-sp">{s.body}</p>
                {"fine" in s && <p className="d105-sp d105-fp">{s.fine}</p>}
              </section>
            ))}
          </div>
        </div>
        <div className="d105-snav">
          <button type="button" className="d105-sback" data-d105h="back" onClick={() => go(i - 1)} style={{ visibility: i === 0 ? "hidden" : "visible" }}>Back</button>
          <span className="d105-sdots" data-d105h="dots" aria-label={`Slide ${i + 1} of ${HOW_SLIDES.length}`} role="img">
            {HOW_SLIDES.map((s, n) => <i key={s.title} className={n === i ? "on" : undefined} />)}
          </span>
          <button type="button" className="d105-snext" data-d105h="next" onClick={() => (i === last ? onClose() : go(i + 1))}>{i === last ? "Got it" : "Next"}</button>
        </div>
      </div>
    </>,
    document.body,
  );
};
