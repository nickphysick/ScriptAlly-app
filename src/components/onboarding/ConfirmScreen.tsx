/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Smart Import confirm (onboarding v5, part 1): the file, the sentence naming it, what it
 * costs, and "Read my file". Nothing is spent, and nothing is read, until that button is pressed.
 *
 * ⚠️ NO ROW COUNT. The reference draws "28 rows"; counting rows means parsing the file, and this
 * screen exists precisely so nothing is read before the writer says so. The size is the `File`'s
 * own and costs nothing to state.
 */

import React from "react";
import { confirmFileLead } from "../../lib/smartImportConfirm";
import { StepColumn, OpenTitle, StepCard, QLabel, BackLink, StepFoot } from "./setupParts";

export const CONFIRM_TITLE = "This uses your Smart Import.";
export const CONFIRM_SUB = "Nothing is saved until you've checked what we read.";
export const CONFIRM_FILE_LABEL = "The file you chose";
export const CONFIRM_CHANGE = "Change";
export const CONFIRM_PRIMARY = "Read my file";
export const CONFIRM_NOTE_FREE =
  "This is your one Smart Import. The template never uses it, so keep it for a spreadsheet you'd rather not retype.";
export const CONFIRM_NOTE_PRO = "This is this month's Smart Import. Your next one is available next month.";

/** "14 KB", "1.2 MB" — the file's own size, as a reader says it. */
export function fileSizeLabel(bytes: number | null | undefined): string | null {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes) || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** The disc's label: the file's type, from its name. */
export function fileTypeLabel(name: string): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name.trim())?.[1]?.toUpperCase() ?? "";
  return ext === "CSV" ? "CSV" : ext === "XLSX" || ext === "XLS" ? ext : "FILE";
}

export const ConfirmScreen: React.FC<{
  fileName: string;
  fileSize: number | null;
  tier: "free" | "pro";
  onChange: () => void;
  onBack: () => void;
  onRead: () => void;
}> = ({ fileName, fileSize, tier, onChange, onBack, onRead }) => {
  const lead = confirmFileLead(fileName);
  const size = fileSizeLabel(fileSize);
  return (
    <StepColumn screen="confirm">
      <OpenTitle title={CONFIRM_TITLE} sub={CONFIRM_SUB} />
      <StepCard>
        <QLabel>{CONFIRM_FILE_LABEL}</QLabel>
        <div className="sf-file" data-sf="file">
          <span className="sf-filedisc" aria-hidden="true">{fileTypeLabel(fileName)}</span>
          <span className="sf-filetx">
            <b className="sf-filename" data-sf="file-name">{fileName}</b>
            {size && <small className="sf-filesize">{size}</small>}
          </span>
          <button type="button" className="sf-link sf-link--quiet" data-act="change" onClick={onChange}>{CONFIRM_CHANGE}</button>
        </div>
        <p className="sf-lede sf-lede--confirm" data-sf="confirm-lead">
          {lead.name ? <>{lead.before}<strong>{lead.name}</strong>{lead.after}</> : <>{lead.before}</>}
        </p>
        <p className="sf-note">{tier === "pro" ? CONFIRM_NOTE_PRO : CONFIRM_NOTE_FREE}</p>
        <StepFoot left={<BackLink onClick={onBack} />}>
          <button type="button" className="sf-btn" data-act="read" onClick={onRead}>{CONFIRM_PRIMARY}</button>
        </StepFoot>
      </StepCard>
    </StepColumn>
  );
};
