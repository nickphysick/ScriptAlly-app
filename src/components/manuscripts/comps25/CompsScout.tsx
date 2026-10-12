/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comparable titles v25, Part E: the Scout, coming soon, as a floating tab and a half drawer.
 *
 * ⚠️ NOTHING HERE CAN REACH THE SCOUT. No import of lib/suggestComps, no working control: the tab
 * opens a description of what it will do, and its one button closes the drawer.
 */
import React, { useState } from "react";
import { FloatingTab } from "../../shell/FloatingTab";
import { HalfDrawer } from "../../shell/HalfDrawer";
import { CloseIcon } from "./marks";

export const SCOUT_HEAD = { src: "/images/comps/scout-head.webp", version: "264838af" } as const;

export const CompsScout: React.FC<{ msTitle: string; routeActive: boolean; hidden: boolean }> = ({ msTitle, routeActive, hidden }) => {
  const [open, setOpen] = useState(false);
  const img = `${SCOUT_HEAD.src}?v=${SCOUT_HEAD.version}`;
  return (
    <>
      <FloatingTab probe="scout" hidden={open || hidden} routeActive={routeActive} onOpen={() => setOpen(true)} label="Open the Scout (coming soon)">
        <span className="cv-layer cv-stab-hh" aria-hidden="true"><img src={img} alt="" /></span>
        <span className="cv-layer cv-stab-tt"><b>The Scout</b><small>COMING SOON</small></span>
      </FloatingTab>
      <HalfDrawer probe="scout" open={open && routeActive} onClose={() => setOpen(false)} label="The Scout" width="min(560px, 46vw)"
        head={(
          <div className="cv-layer cv-sh-head">
            <img src={img} alt="" />
            <h3 className="cv-dt">The Scout<span className="cv-soon" data-cv="scout-soon">COMING SOON</span></h3>
            <button type="button" className="cv-x" aria-label="Close" onClick={() => setOpen(false)}><CloseIcon /></button>
          </div>
        )}
        foot={(
          <div className="cv-layer cv-df">
            <span>Every title will be checked against a real catalogue.</span>
            <span className="cv-bt"><button type="button" className="cv-pillbtn" data-cv="scout-close" onClick={() => setOpen(false)}>Close</button></span>
          </div>
        )}>
        <div className="cv-layer cv-db" data-cv="scout-body">
          <p className="cv-lead">The Scout will look for recently published books like <i>{msTitle}</i> and say why each one compares. You choose what joins your list.</p>
          <ol className="cv-steps">
            <li><i>1</i><div><b>Reads your book’s details</b><span>Genre, word count, logline and the comps you already have.</span></div></li>
            <li><i>2</i><div><b>Suggests recent titles</b><span>Each with its publisher, year and the reason it compares.</span></div></li>
            <li><i>3</i><div><b>You add or dismiss</b><span>Nothing joins your comps without you.</span></div></li>
          </ol>
        </div>
      </HalfDrawer>
    </>
  );
};
