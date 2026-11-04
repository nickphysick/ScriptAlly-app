/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The dashboard's own loading page, behind the importing loader (onboarding v5, part 2).
 *
 * ⚠️ IT IS THE DASHBOARD, NOT A DRAWING OF IT. This mounts `Dash58` with `loading` set and no data,
 * inside the same two wrappers the shell gives it (`.ws-wbody` › `.ws-work`), so every box is the
 * one the dashboard draws while it loads — a ghost that is a second implementation drifts the day
 * the dashboard changes, and the writer sees the page jump as the loader hands over. Lock H2
 * compares the two at the same window.
 *
 * It is for show: `inert`, hidden from assistive technology, and its floating feed tab is not
 * drawn (the app's own arrives with the app).
 */
import React, { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { Dash58 } from "../dashboard/v58/Dash58";
import { Dash2Hawk } from "../dashboard/v2/Dash2Hawk";
import { mentorIntroArmed } from "../../lib/mentorIntro";

const NOTHING: never[] = [];
const noop = () => {};

/* v1.1: THE ONE EXCEPTION TO THE SKELETON. After an import commit the corner hawk is drawn on this
   loading page too, where the loaded dashboard draws him, and starts his sequence (lib/mentorIntro).
   Only then: an ordinary loading page has no hawk until the dashboard does. */
export const DashGhost: React.FC = () => {
  const [hawk] = useState(mentorIntroArmed);
  /* ⚠️ INTO THE SET-UP FRAME, NOT <body>: during set-up the frame is a fixed layer at z-index 9999
     over the whole window, so a hawk on <body> is drawn under it. Inside it he is still fixed to the
     window (the frame has no transform), so his box is the one the loaded dashboard draws. On the
     Import page there is no such layer, and <body> is right. */
  const [host, setHost] = useState<HTMLElement | null>(null);
  const ghostRef = useCallback((el: HTMLDivElement | null) => {
    if (el) setHost((el.closest(".ws-app.sf") as HTMLElement | null) ?? document.body);
  }, []);
  return (<>
  {hawk && host && createPortal(<Dash2Hawk />, host)}
  <div ref={ghostRef} className="ws-wbody im-ghost" aria-hidden="true" data-im="ghost" {...{ inert: true }}>
    <div className="ws-work">
      <div className="sa-dashroot font-sans">
        <Dash58
          loading
          queries={NOTHING} agents={NOTHING} manuscripts={NOTHING} tasks={NOTHING} userTasks={NOTHING}
          activities={NOTHING} taskFlags={NOTHING} currentUser={null} activeManuscript={null} onNavigate={noop}
        />
      </div>
    </div>
  </div>
  </>);
};
