/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your list": two doors (two-door import v1; ref design-refs/two-door-import-v1/, screen 1).
 *
 * "I HAVE A LIST" AND "I'M STARTING FRESH". The template is no longer a door: a file that already
 * uses our column headings is recognised when it is picked (lib/importReadRoute) and read straight
 * in, with no Smart Import run. All that is left of it here is the quiet line under the doors, which
 * hands out the headings sheet.
 *
 * ONE FILLED NAVY BUTTON ON THE PAGE: "Upload a file". "Use photos" beside it is a line button of the
 * same door; door two's button is a line button too. Neither door is ringed.
 *
 * A FILE DROPPED ON DOOR ONE IS STILL TAKEN. The door itself is the target; it takes the first
 * spreadsheet, sends images to the photos screen, and ignores anything else.
 *
 * The component owns no file input and makes no decision: it is given a handler for every press.
 */

import React, { useState } from "react";
import {
  CaptureOption, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_SUB,
  CAPTURE_UPLOAD_ACTION, CAPTURE_PHOTOS_ACTION, CAPTURE_LIST_CAPTION, CAPTURE_FRESH_ACTION,
  CAPTURE_QUIET_LINE, CAPTURE_QUIET_LINK, captureFact,
} from "../../lib/captureFork";
import { classifyDrop } from "../../lib/photoImport";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { StepColumn, OpenTitle, BackLink } from "./setupParts";
import "./v9/onbV9.css";

export interface CaptureForkProps {
  /** "Upload a file": open the import's one file picker. The file's headings decide how it is read. */
  onChooseFile: () => void;
  /** A spreadsheet dropped on door one: the same thing the picker's choice runs. */
  onDropFile: (file: File) => void;
  /** "Use photos": the photos screen, empty (smart-import-photos-v1.1). Never the picker itself. */
  onUsePhotos: () => void;
  /** Images dropped on door one, with no spreadsheet among them. */
  onDropPhotos: (files: File[]) => void;
  onBack: () => void;
  /** "Take me to my dashboard": set-up ends, as "I've nothing to capture yet" did. */
  onNothingYet: () => void;
  /** Overridable for the lab and the locks; the default downloads the real headings sheet. */
  onDownloadTemplate?: () => void;
}

const delay = (s: number): React.CSSProperties => ({ animationDelay: `${s}s` });

const Door: React.FC<{ option: CaptureOption; at: number; drop?: React.HTMLAttributes<HTMLElement>; over?: boolean; children: React.ReactNode }> = ({ option, at, drop, over, children }) => (
  <section className={`sf-tile o9-way o9-pop${over ? " is-over" : ""}`} style={delay(at)} data-tile={option} aria-labelledby={`sf-tile-${option}`} {...drop}>
    <span className="o9-slot o9-wayslot" data-o9="slot" data-slot={`fork-${option}`} aria-hidden="true" />
    <div className="o9-waybody">
      <h2 className="sf-tileh" id={`sf-tile-${option}`}>{CAPTURE_CHOICES[option].title}</h2>
      <ul className="o9-waylist">
        {CAPTURE_CHOICES[option].lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {children}
    </div>
  </section>
);

export const CaptureFork: React.FC<CaptureForkProps> = ({
  onChooseFile, onDropFile, onUsePhotos, onDropPhotos, onBack, onNothingYet, onDownloadTemplate,
}) => {
  const download = onDownloadTemplate ?? (() => { void downloadTemplate(TEMPLATE_FILENAME); });
  const [over, setOver] = useState(false);

  const dropProps: React.HTMLAttributes<HTMLElement> = {
    onDragOver: (e) => { e.preventDefault(); if (!over) setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e) => {
      e.preventDefault();
      setOver(false);
      /* A spreadsheet in the drop is taken as today: the first one. With none, every image goes to
         the photos screen. Anything else is ignored, not guessed at. */
      const drop = classifyDrop(Array.from(e.dataTransfer?.files ?? []));
      if (drop.kind === "sheet") onDropFile(drop.file);
      else if (drop.kind === "photos") onDropPhotos(drop.files);
    },
  };

  return (
    <StepColumn wide screen="fork">
      <OpenTitle title={CAPTURE_HEADING} sub={CAPTURE_SUB} />
      <div className="sf-tiles sf-doors">
        <Door option="list" at={0.2} drop={dropProps} over={over}>
          <div className="sf-tileacts o9-wayacts">
            <button type="button" className="sf-btn sf-btn--sm" data-act="upload" onClick={onChooseFile}>{CAPTURE_UPLOAD_ACTION}</button>
            <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="photos" onClick={onUsePhotos}>{CAPTURE_PHOTOS_ACTION}</button>
          </div>
          <p className="sf-cap" data-sf="caption">{CAPTURE_LIST_CAPTION}</p>
          <p className="sf-fact" data-fact="list">{captureFact("list")}</p>
        </Door>
        <Door option="fresh" at={0.35}>
          <div className="sf-tileacts o9-wayacts">
            <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="fresh" onClick={onNothingYet}>{CAPTURE_FRESH_ACTION}</button>
          </div>
        </Door>
      </div>

      <p className="sf-quiet o9-rise" style={delay(0.55)} data-sf="quiet">
        <span>{CAPTURE_QUIET_LINE}</span>
        <button type="button" className="sf-link sf-link--quiet" data-act="headings" onClick={download}>{CAPTURE_QUIET_LINK}</button>
      </p>
      <div className="sf-under-tiles o9-rise" style={delay(0.7)}>
        <BackLink onClick={onBack} />
      </div>
    </StepColumn>
  );
};
