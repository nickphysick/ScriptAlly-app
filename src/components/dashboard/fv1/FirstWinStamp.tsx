/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v1 — THE FIRST-WIN STAMP (Part B; ref pane 04).
 *
 * A burgundy rubber stamp, struck once over the dashboard when a writer's first query on a manuscript is logged,
 * their first agent added, or their first import committed: it scales in from 1.6 at −8° with a slight overshoot,
 * holds 2.2s and fades. It records the event; it does not congratulate.
 *
 * ⚠️ IT FIRES ON THE ACT, NOT ON THE DATA: the write that made the thing records a pending stamp (lib/firstWin),
 * and this shows it on the dashboard's next render, wherever the act happened. ⚠️ ONCE ONLY, per kind, user and
 * manuscript: each stamp shown is written to the user's prefs (`todoPrefs.dash.wins`), and a pending stamp
 * already recorded there is dropped, not repeated. Without a prefs writer (the onboarding ghost) nothing shows.
 * ⚠️ REDUCED MOTION: the stamp appears and goes without the scale.
 */
import React, { useEffect, useRef, useState } from "react";
import { clearWin, onFirstWin, pendingWins, type PendingWin } from "../../../lib/firstWin";
import { STAMP_HOLD_MS, pickStamp, winWrite } from "../../../lib/dashFirstVisit";
import type { UserPaths } from "../../../lib/userPaths";

const IN_MS = 380;
const OUT_MS = 260;

export interface FirstWinStampProps {
  uid: string | null;
  /** the dashboard is the page on screen and has loaded */
  active: boolean;
  /** stamps already shown, from the user's prefs */
  shown: Record<string, true>;
  onPrefs?: (paths: UserPaths) => void | Promise<void>;
}

export const FirstWinStamp: React.FC<FirstWinStampProps> = ({ uid, active, shown, onPrefs }) => {
  const [win, setWin] = useState<PendingWin | null>(null);
  const [phase, setPhase] = useState<"in" | "out">("in");
  const [tick, setTick] = useState(0);
  /* this mount's own record, so a re-render before the prefs write lands can never strike the same stamp twice */
  const struck = useRef(new Set<string>());
  useEffect(() => onFirstWin(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    if (!active || !uid || !onPrefs || win) return;
    const { strike, key, drop } = pickStamp(pendingWins(uid), shown, struck.current);
    for (const w of drop) clearWin(w);
    if (!strike || !key) return;
    clearWin(strike);
    struck.current.add(key);
    void onPrefs(winWrite(key));
    setPhase("in");
    setWin(strike);
  }, [active, uid, onPrefs, win, shown, tick]);

  useEffect(() => {
    if (!win) return undefined;
    const out = window.setTimeout(() => setPhase("out"), IN_MS + STAMP_HOLD_MS);
    const gone = window.setTimeout(() => setWin(null), IN_MS + STAMP_HOLD_MS + OUT_MS);
    return () => { window.clearTimeout(out); window.clearTimeout(gone); };
  }, [win]);

  if (!win) return null;
  return (
    <div className={`fv1-stamp is-${phase}`} role="status" aria-live="polite" data-fv1="stamp" data-kind={win.kind}>
      <span className="fv1-stampt" data-fv1="stamp-title">{win.title}</span>
      {win.sub && <small className="fv1-stamps" data-fv1="stamp-sub">{win.sub}</small>}
    </div>
  );
};
