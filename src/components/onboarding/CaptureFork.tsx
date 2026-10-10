/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "Your list" — three tiles, each with its own buttons (onboarding v5, part 1).
 *
 * ⚠️ THERE IS NO RADIO GROUP AND NO SHARED PRIMARY. The step used to be choose-then-Continue: three
 * radios, a reveal under the chosen one, and one primary whose label changed with the choice. A
 * writer who knows what they want now presses it. Every tile's buttons work at once.
 *
 * ⚠️ THE RING IS A SUGGESTION, NOT A SELECTION. One tile is ringed — the one matching the default
 * for the writer's stage — and nothing about the other two is disabled by it.
 *
 * ⚠️ DROPPING A FILE ON THE DROP ZONE WORKS, BECAUSE THE WORDS SAY IT DOES. Before this the zone
 * read "Drop your file here" and handled a click only. A drop takes the first file, and ignores a
 * type the picker would not have accepted.
 *
 * The component owns no file input and makes no decision: it is given a handler for every press.
 */

import React, { useState } from "react";
import {
  CaptureOption, CAPTURE_CHOICES, CAPTURE_HEADING, CAPTURE_SUB, CAPTURE_LATER,
  CAPTURE_ESCAPE_PREFIX, CAPTURE_ESCAPE_LINK, CAPTURE_ESCAPE_SUFFIX,
  CAPTURE_SMART_ACTION, CAPTURE_TEMPLATE_DOWNLOAD, CAPTURE_TEMPLATE_UPLOAD, CAPTURE_HAND_ACTION,
  CAPTURE_DROP_LEAD, CAPTURE_DROP_LINK, CAPTURE_DROP_TYPES, captureFact, acceptsDroppedFile,
} from "../../lib/captureFork";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";
import { StepColumn, OpenTitle, BackLink } from "./setupParts";

const ICON = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
const UploadIcon = <svg {...ICON}><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M12 3v12M8 7l4-4 4 4" /></svg>;
const TemplateIcon = <svg {...ICON}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>;
const HandIcon = <svg {...ICON}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>;

export interface CaptureForkProps {
  /** The suggested tile. A ring, not a selection. */
  ringed: CaptureOption;
  /** The writer's Smart Import tier, from the entitlement. */
  tier: "free" | "pro";
  /** "Import a spreadsheet", and a press on the drop zone: open the Smart import picker. */
  onChooseFile: () => void;
  /** A file dropped on the drop zone: the same thing the picker's choice runs. */
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

const Tile: React.FC<{ option: CaptureOption; ringed: boolean; icon: React.ReactNode; fact: string; extra?: React.ReactNode; children: React.ReactNode }> = ({ option, ringed, icon, fact, extra, children }) => (
  <section className={`sf-tile${ringed ? " is-ringed" : ""}`} data-tile={option} data-ringed={ringed ? "true" : "false"} aria-labelledby={`sf-tile-${option}`}>
    <div className="sf-tilemain">
      <span className="sf-tiledisc" aria-hidden="true">{icon}</span>
      <div className="sf-tiletx">
        <h2 className="sf-tileh" id={`sf-tile-${option}`}>{CAPTURE_CHOICES[option].title}</h2>
        <p className="sf-tilep">{CAPTURE_CHOICES[option].desc}</p>
        <div className="sf-tileacts">{children}</div>
        <p className="sf-fact" data-fact={option}>{fact}</p>
      </div>
    </div>
    {extra}
  </section>
);

export const CaptureFork: React.FC<CaptureForkProps> = ({
  ringed, tier, onChooseFile, onDropFile, onUploadTemplate, onAddByHand, onBack, onNothingYet, onOpenImportDesk, onDownloadTemplate,
}) => {
  const download = onDownloadTemplate ?? (() => { void downloadTemplate(TEMPLATE_FILENAME); });
  const [over, setOver] = useState(false);

  const drop = (e: React.DragEvent) => {
    e.preventDefault();
    setOver(false);
    /* First file only; a type the picker would not have offered is ignored, not guessed at. */
    const file = e.dataTransfer?.files?.[0];
    if (file && acceptsDroppedFile(file.name)) onDropFile(file);
  };

  return (
    <StepColumn wide screen="fork">
      <OpenTitle title={CAPTURE_HEADING} sub={CAPTURE_SUB} />
      <div className="sf-tiles">
        <Tile
          option="smart" ringed={ringed === "smart"} icon={UploadIcon} fact={captureFact("smart", tier)}
          extra={ringed === "smart" && (
            <div
              className={`sf-drop${over ? " is-over" : ""}`} data-sf="drop" role="button" tabIndex={0}
              onClick={onChooseFile}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onChooseFile(); } }}
              onDragOver={(e) => { e.preventDefault(); if (!over) setOver(true); }}
              onDragLeave={() => setOver(false)}
              onDrop={drop}
            >
              <p className="sf-droplead">{CAPTURE_DROP_LEAD}<span className="sf-dropuline">{CAPTURE_DROP_LINK}</span></p>
              <p className="sf-droptypes">{CAPTURE_DROP_TYPES}</p>
            </div>
          )}
        >
          <button type="button" className="sf-btn sf-btn--sm" data-act="smart" onClick={onChooseFile}>{CAPTURE_SMART_ACTION}</button>
        </Tile>
        <Tile option="template" ringed={ringed === "template"} icon={TemplateIcon} fact={captureFact("template", tier)}>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="download" onClick={download}>{CAPTURE_TEMPLATE_DOWNLOAD}</button>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="upload" onClick={onUploadTemplate}>{CAPTURE_TEMPLATE_UPLOAD}</button>
        </Tile>
        <Tile option="byhand" ringed={ringed === "byhand"} icon={HandIcon} fact={captureFact("byhand", tier)}>
          <button type="button" className="sf-btn sf-btn--sm sf-btn--line" data-act="byhand" onClick={onAddByHand}>{CAPTURE_HAND_ACTION}</button>
        </Tile>
      </div>

      <div className="sf-under-tiles">
        <BackLink onClick={onBack} />
        <button type="button" className="sf-link" data-act="later" onClick={onNothingYet}>{CAPTURE_LATER}</button>
      </div>
      <p className="sf-escape">
        {CAPTURE_ESCAPE_PREFIX}
        <button type="button" className="sf-link sf-link--in" data-act="desk" onClick={onOpenImportDesk}>{CAPTURE_ESCAPE_LINK}</button>
        {CAPTURE_ESCAPE_SUFFIX}
      </p>
    </StepColumn>
  );
};
