/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Smart Import hand-off (onboarding v5, part 1; redrawn in v9): the file, the sentence naming
 * it, and "Read my file", beside the three things that happen next. Nothing is spent, and nothing
 * is read, until that button is pressed.
 *
 * THIS SCREEN NO LONGER SAYS WHAT IT COSTS (v9). The one-shot note under the card is gone. The
 * tile that leads here still reads "Uses your one Smart Import", and the already-used state is
 * unchanged; only this screen stops naming it.
 *
 * ⚠️ NO ROW COUNT. The reference draws "28 rows"; counting rows means parsing the file, and this
 * screen exists precisely so nothing is read before the writer says so. The size is the `File`'s
 * own and costs nothing to state.
 */

import React from "react";
import { confirmFileLead } from "../../lib/smartImportConfirm";
import { StepColumn, OpenTitle, StepCard, QLabel, BackLink, StepFoot } from "./setupParts";
import "./v9/onbV9.css";

export const CONFIRM_TITLE = "Let QueryHawk Smart Import take it from here.";
export const CONFIRM_SUB = "Nothing is saved until you've checked what we read.";
export const CONFIRM_FILE_LABEL = "The file you chose";
export const CONFIRM_CHANGE = "Change";
export const CONFIRM_PRIMARY = "Read my file";
export const HOW_EYEBROW = "What happens next";
export const HOW_STEPS: Array<{ key: string; title: string; line: string }> = [
  { key: "sheet", title: "Your sheet, as it is", line: "Any layout, any wording. Nothing to tidy first." },
  { key: "reads", title: "QueryHawk reads every row", line: "Agents, queries, dates and statuses, sorted into place." },
  { key: "check", title: "You check what lands", line: "Anything unclear is asked about. Nothing is saved until you say so." },
];

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
  onChange: () => void;
  onBack: () => void;
  onRead: () => void;
}> = ({ fileName, fileSize, onChange, onBack, onRead }) => {
  const lead = confirmFileLead(fileName);
  const size = fileSizeLabel(fileSize);
  return (
    <StepColumn wide screen="confirm">
      <OpenTitle title={CONFIRM_TITLE} sub={CONFIRM_SUB} />
      <div className="o9-conf">
        <StepCard className="o9-pop o9-d2">
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
          <StepFoot left={<BackLink onClick={onBack} />}>
            <button type="button" className="sf-btn" data-act="read" onClick={onRead}>{CONFIRM_PRIMARY}</button>
          </StepFoot>
        </StepCard>
        <aside className="o9-how" data-o9="how" aria-labelledby="o9-how-h">
          <p className="o9-howeye o9-rise" style={{ animationDelay: ".45s" }} id="o9-how-h" data-o9="how-eyebrow">{HOW_EYEBROW}</p>
          <ol className="o9-howlist">
            {HOW_STEPS.map((st, i) => (
              <li key={st.key} className="o9-rise" style={{ animationDelay: `${0.55 + i * 0.15}s` }}>
                <span className="o9-slot o9-howslot" data-o9="slot" data-slot={`handoff-${st.key}`} aria-hidden="true" />
                <span className="o9-howtx"><b>{st.title}</b><span data-o9="how-line">{st.line}</span></span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </StepColumn>
  );
};
