/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v42 Part G (screens 11, 12) — How it works, ONE animated infographic, replacing v41's five-step
 * guide. It opens from the header's "How it works" in a centred dialog with the shared rim (portalled), and closes with
 * ✕, Escape, a click outside or Got it. "How packages work", one line, then four stations in one row joined by a single
 * dashed route running behind the drawings (graphics style D, "One route"): a drawing (howArt.tsx, placeholders), a
 * numbered title and one line of copy each, in the pack's words (lib/packagesV42).
 *
 * The motion is a slow sequence of ~12s on open: the route draws left to right; each station fades and rises in turn
 * (HOW_STATION_AT: 0.3, 4.1, 6.7, 10s) and the pieces inside its drawing settle after it. Ease-out, no bounce. "Play
 * again" (bottom left) restarts it by remounting the stage. With reduced motion every animation is off and the finished
 * state shows at once: the CSS states the FINISHED state as each element's own, and only the animations (fill-mode
 * `both`) hold the start state, so switching them off cannot leave anything hidden. The founding writer note's link
 * (v41) sits in the footer.
 */
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import { FOUNDING_SHOW } from "../../../lib/packagesV41";
import { HOW_GOT_IT, HOW_INTRO, HOW_PLAY_AGAIN, HOW_STATION_AT, HOW_STATIONS, HOW_TITLE } from "../../../lib/packagesV42";
import { useOverlay } from "../../shell/useOverlay";
import { HOW_ART } from "./howArt";

const Graphic: React.FC<{ onClose: () => void; onShowFounding?: () => void }> = ({ onClose, onShowFounding }) => {
  const [run, setRun] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { scrimClasses: ["p42-hw"], onScrimClick: onClose });
  useEscapeLayer(true, onClose, ESC_LEVEL.pageModal);
  /* focus goes to Got it on open (useOverlay returns it to the opener on close) */
  useEffect(() => { okRef.current?.focus(); }, []);
  return (
    <div className="p42-hw" ref={rootRef} tabIndex={-1} data-pk42="hw" onClick={scrimClick} onKeyDown={trapTab}>
      <div className="p42-hwc" role="dialog" aria-modal="true" aria-labelledby="p42-hwT" aria-describedby="p42-hwP">
        <button type="button" className="p42-hwx" aria-label="Close" data-pk42="hw-x" onClick={onClose}>✕</button>
        <div className="p42-hwh">
          <h3 id="p42-hwT" className="p42-hwt" data-pk42="hw-title">{HOW_TITLE}</h3>
          <p id="p42-hwP" data-pk42="hw-intro">{HOW_INTRO}</p>
        </div>
        <div key={run} className="p42-hws" data-pk42="hw-stage" data-run={run}>
          <i className="p42-hw-route" aria-hidden="true" data-pk42="hw-route" />
          {HOW_STATIONS.map(([t, d], n) => {
            const Art = HOW_ART[n];
            return (
              <div key={t} className="p42-hwb" style={{ ["--at" as string]: `${HOW_STATION_AT[n]}s` }} data-pk42-station={n + 1}>
                <div className="p42-hwa"><Art /></div>
                <b className="p42-hwbt" data-pk42="hw-station-title"><u>{n + 1}</u>{t}</b>
                <span>{d}</span>
              </div>
            );
          })}
        </div>
        <div className="p42-hwf">
          <button type="button" className="p42-hwl" data-pk42="hw-again" onClick={() => setRun((r) => r + 1)}>{HOW_PLAY_AGAIN}</button>
          {onShowFounding ? <button type="button" className="p42-hwl p42-hwfn" data-pk41="show-founding" onClick={() => { onShowFounding(); onClose(); }}>{FOUNDING_SHOW}</button> : null}
          <button type="button" ref={okRef} className="p42-hb1" data-pk42="hw-ok" onClick={onClose}>{HOW_GOT_IT}</button>
        </div>
      </div>
    </div>
  );
};

export const Pk42HowItWorks: React.FC<{ open: boolean; onClose: () => void; onShowFounding?: () => void }> = ({ open, onClose, onShowFounding }) =>
  open ? createPortal(<Graphic onClose={onClose} onShowFounding={onShowFounding} />, document.body) : null;
