/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FIRST VISIT v2, Part H — THE FINISH LINE (ref design-refs/dashboard-first-visit-v2/, screen 15).
 *
 * When every Getting started row is done the sheet says so: a navy tick (it pops in once, over 500ms; still under
 * reduced motion), "That's you set up", what the path's steps were, and "Close this list". Closing stores the flag and
 * the goal sheet takes the slot; it does not come back.
 */
import React from "react";
import { FINISH, type StartPath } from "../../../lib/dashFirstVisit";

export const FinishLine: React.FC<{ path: StartPath | null; onClose?: () => void }> = ({ path, onClose }) => (
  <div className="fv2-fin" data-fv2="finish">
    <span className="fv2-fintick" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" /></svg></span>
    <div className="fv2-finw">
      <h2 className="fv2-fint" data-fv2="finish-title">{FINISH.title}</h2>
      <p className="fv2-finp">{FINISH.text(path)}</p>
      <div className="fv2-finrow">
        <button type="button" className="fv2-finclose" data-fv2="finish-close" onClick={onClose} disabled={!onClose}>{FINISH.close}</button>
        <small>{FINISH.note}</small>
      </div>
    </div>
  </div>
);
