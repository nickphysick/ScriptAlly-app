/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenBanner — the list's open head over a coloured workspace (Contact list v13, ruling Q1; the v126
 * list banner's construction, lifted): a figure perched on the workspace's top edge, a mono eyebrow,
 * a Special Elite heading, the sentence, and the controls right-aligned on the sentence's row,
 * wrapping beneath at narrow widths. No fill, no container — the workspace under it is the colour.
 *
 * ⚠️ THE PERCH IS A NEGATIVE MARGIN OF THE FIGURE'S OWN, so its feet sit `perchDrop` px INTO the
 * workspace's top edge; the banner is z 2 and the workspace z 1, so the feet overlap the workspace.
 * ⚠️ ONLY THE CONTACT LIST USES IT IN THIS PACK (the Query Centre keeps `QcSentence variant="banner"`).
 */
import React from "react";
import "./openBanner.css";

export interface OpenBannerProps {
  figure?: { src: string; width: number; height: number } | null;
  eyebrow: React.ReactNode;
  heading: string;
  sentence: React.ReactNode;
  controls?: React.ReactNode;
  /** a probe name (`data-ob`) */
  probe?: string;
  bannerRef?: React.Ref<HTMLDivElement>;
}

export const OpenBanner: React.FC<OpenBannerProps> = ({ figure, eyebrow, heading, sentence, controls, probe, bannerRef }) => (
  <div className={`ob${figure ? "" : " ob--bare"}`} data-ob={probe ?? "banner"} ref={bannerRef}>
    {figure ? <img className="ob-perch" data-ob-perch="" src={figure.src} width={figure.width} height={figure.height} alt="" /> : null}
    <div className="ob-txt">
      <div className="ob-k">{eyebrow}</div>
      <h2 className="ob-h">{heading}</h2>
      <div className="ob-row">
        <p className="ob-p">{sentence}</p>
        {controls ? <div className="ob-ctl" data-ob-ctl="">{controls}</div> : null}
      </div>
    </div>
  </div>
);
