/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your list": three tiles, each with its own buttons (onboarding v5, part 1; redrawn in v9).
 *
 * THERE IS NO RADIO GROUP AND NO SHARED PRIMARY. A writer who knows what they want presses it.
 * Every tile's buttons work at once.
 *
 * NO TILE IS PRE-SELECTED (v9). v5 ringed the tile matching the writer's stage and hung a drop
 * zone under the ringed Smart import tile. Both are gone: each tile opens on a 16:9 illustration
 * slot and three short lines, and none is marked on arrival.
 *
 * A FILE DROPPED ON THE SMART IMPORT TILE IS STILL TAKEN. The tile itself is the target now; it
 * takes the first file and ignores a type the picker would not have accepted. No words on the
 * tile promise it, so nothing is claimed that a reader could find untrue.
 *
 * The component owns no file input and makes no decision: it is given a handler for every press.
 */

import React, { useState } from "react";
import {
  CaptureOption, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_SUB, CAPTURE_LATER,
  CAPTURE_ESCAPE_PREFIX, CAPTURE_ESCAPE_LINK, CAPTURE_ESCAPE_SUFFIX,
  CAPTURE_SMART_ACTION, CAPTURE_TEMPLATE_DOWNLOAD, CAPTURE_TEMPLATE_UPLOAD, CAPTURE_HAND_ACTION,
  captureFact, acceptsDroppedFile,
} from "../../lib/captureFork";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { StepColumn, OpenTitle, BackLink } from "./setupParts";
import "./v9/onbV9.css";

export interface CaptureForkProps {
  /** The writer's Smart Import tier, from the entitlement. */
  tier: "free" | "pro";
  /** "Import a spreadsheet": open the Smart import picker. */
  onChooseFile: () => void;
  /** A file dropped on the Smart import tile: the same thing the picker's choice runs. */
  onDropFile: (file: File) => void;
  /** "Upload my sheet": open the template picker. */
  onUploadTemplate: () => void;
  /** "Add an agent". */
  onAddByHand: () => void;
  onBack: () => void;
  /** "I've nothing to capture yet". */
  onNothingYet: () => void;
  onOpenImportDesk: () => void;
  /** Overridable for the lab and the locks; the default downloads the real template. */
  onDownloadTemplate?: () => void;
}

const delay = (s: number): React.CSSProperties => ({ animationDelay: `${s}s` });

const Tile: React.FC<{ option: CaptureOption; fact: string; at: number; drop?: React.HTMLAttributes<HTMLElement>; over?: boolean; children: React.ReactNode }> = ({ option, fact, at, drop, over, children }) => (
  <section className={`sf-tile o9-way o9-pop${over ? " is-over" : ""}`} style={delay(at)} data-tile={option} aria-labelledby={`sf-tile-${option}`} {...drop}>
    <span className="o9-slot o9-wayslot" data-o9="slot" data-slot={`fork-${option}`} aria-hidden="true" />
    <div className="o9-waybody">
      <h2 className="sf-tileh" id={`sf-tile-${option}`}>{CAPTURE_CHOICES[option].title}</h2>
      <ul className="o9-waylist">
        {CAPTURE_CHOICES[option].lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      <div className="sf-tileacts o9-wayacts">{children}</div>
      <p className="sf-fact" data-fact={option}>{fact}</p>
    </div>
  </section>
);

export const CaptureFork: React.FC<CaptureForkProps> = ({
  tier, onChooseFile, onDropFile, onUploadTemplate, onAddByHand, onBack, onNothingYet, onOpenImportDesk, onDownloadTemplate,
}) => {
  const download = onDownloadTemplate ?? (() => { void downloadTemplate(TEMPLATE_FILENAME); });
  const [over, setOver] = useState(false);

  const dropProps: React.HTMLAttributes<HTMLElement> = {
    onDragOver: (e) => { e.preventDefault(); if (!over) setOver(true); },
    onDragLeave: () => setOver(false),
    onDrop: (e) => {
      e.preventDefault();
      setOver(false);
      /* First file only; a type the picker would not have offered is ignored, not guessed at. */
      const file = e.dataTransfer?.files?.[0];
      if (file && acceptsDroppedFile(file.name)) onDropFile(file);
    },
  };

  return (
    <StepColumn wide screen="fork">
      <OpenTitle title={CAPTURE_HEADING} sub={CAPTURE_SUB} />
      <div className="sf-tiles">
        <Tile option="smart" fact={captureFact("smart", tier)} at={0.2} drop={dropProps} over={over}>
          <button type="button" className="sf-btn sf-btn--sm" data-act="smart" onClick={onChooseFile}>{CAPTURE_SMART_ACTION}</button>
        </Tile>
        <Tile option="template" fact={captureFact("template", tier)} at={0.35}>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="download" onClick={download}>{CAPTURE_TEMPLATE_DOWNLOAD}</button>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="upload" onClick={onUploadTemplate}>{CAPTURE_TEMPLATE_UPLOAD}</button>
        </Tile>
        <Tile option="byhand" fact={captureFact("byhand", tier)} at={0.5}>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="byhand" onClick={onAddByHand}>{CAPTURE_HAND_ACTION}</button>
        </Tile>
      </div>

      <div className="sf-under-tiles o9-rise" style={delay(0.75)}>
        <BackLink onClick={onBack} />
        <button type="button" className="sf-link" data-act="later" onClick={onNothingYet}>{CAPTURE_LATER}</button>
      </div>
      <p className="sf-escape o9-rise" style={delay(0.85)}>
        {CAPTURE_ESCAPE_PREFIX}
        <button type="button" className="sf-link sf-link--in" data-act="desk" onClick={onOpenImportDesk}>{CAPTURE_ESCAPE_LINK}</button>
        {CAPTURE_ESCAPE_SUFFIX}
      </p>
    </StepColumn>
  );
};
