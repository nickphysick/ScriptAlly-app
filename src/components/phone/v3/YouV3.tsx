/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — YOU (ref `vLibrary`): "Progress | Materials", and the Settings gear in the header. Every page the
 * retired menu offered is reachable from here, from Settings or from Today.
 */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePhoneBandExtra } from "../phoneBandStore";
import { V3HeaderIcon } from "./V3Chrome";
import { V3I, type V3IconName } from "./v3Icons";
import { YOU_PATH } from "../../../lib/phoneV3Nav";
import "./phoneV3.css";

type YouSeg = "progress" | "materials";

export const LRow: React.FC<{ icon: V3IconName; t: string; s?: string | null; onOpen: () => void; pa3?: string }> = ({ icon, t, s, onOpen, pa3 }) => (
  <button type="button" className="pa3-row pa3-lrow" data-pa3={pa3 ?? "lrow"} onClick={onOpen}>
    <span className="pa3-icw"><V3I n={icon} /></span>
    <span className="pa3-tx"><span className="pa3-t">{t}</span>{s ? <span className="pa3-s">{s}</span> : null}</span>
    <V3I n="chev" className="pa3-ic pa3-chev" />
  </button>
);

export const YouV3: React.FC = () => {
  const navigate = useNavigate();
  const [seg, setSeg] = useState<YouSeg>("progress");
  usePhoneBandExtra(YOU_PATH, <V3HeaderIcon label="Settings" pa3="settings" onClick={() => navigate("/account")}><V3I n="gear" /></V3HeaderIcon>, [navigate]);
  return (
    <div className="pa3 pa3-you" data-pa3="you" data-seg={seg}>
      <div className="pa3-page">
        <div className="pa3-seg" role="tablist">
          <button type="button" role="tab" aria-selected={seg === "progress"} className={seg === "progress" ? "on" : ""} data-pa3="yseg" data-k="progress" onClick={() => setSeg("progress")}>Progress</button>
          <button type="button" role="tab" aria-selected={seg === "materials"} className={seg === "materials" ? "on" : ""} data-pa3="yseg" data-k="materials" onClick={() => setSeg("materials")}>Materials</button>
        </div>
        {seg === "progress" ? (
          <div className="pa3-card">
            <LRow icon="mail" t="Responses" onOpen={() => navigate("/queries/responses")} />
            <LRow icon="chart" t="Analytics" onOpen={() => navigate("/queries/analytics")} />
            <LRow icon="flame" t="Streaks and goals" onOpen={() => navigate("/goals")} />
          </div>
        ) : (
          <div className="pa3-card">
            <LRow icon="book" t="Your book" onOpen={() => navigate("/manuscripts")} />
            <LRow icon="box" t="Packages" onOpen={() => navigate("/queries/packages")} />
            <LRow icon="file" t="Query letters" onOpen={() => navigate("/materials/letters")} />
            <LRow icon="note" t="Synopses and comps" onOpen={() => navigate("/manuscripts#comps")} />
          </div>
        )}
      </div>
    </div>
  );
};
