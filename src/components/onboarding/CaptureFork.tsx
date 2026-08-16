/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The capture fork — three ways to bring an existing list across (ref:
 * design-refs/scriptally-onboarding-fork.html).
 *
 * ⚠️ IT IS ITS OWN COMPONENT SO IT CAN BE ASSERTED ON ITS OWN. Left inside BranchB it was only
 * reachable after driving that component through the manuscript screen first, which means the
 * spec for the fork would have been a spec for the screen before it.
 *
 * ⚠️ ONE REVEAL AT A TIME, BECAUSE THE CHOICE IS ONE. Three panels open together are three sets of
 * instructions for one decision, and the writer has to work out which of them applies to them.
 *
 * ⚠️ THE QUIET EXIT IS A TEXT LINK AND SITS OUTSIDE THE RADIOGROUP. "I've nothing to capture yet"
 * is not a fourth way of capturing a list; offered as a peer card it reads as one, and a writer
 * with nothing to bring across would be choosing between four things when they have nothing to
 * choose between.
 */

import React from "react";
import { SelectRow, FONT_SANS, FONT_MONO } from "./chrome";
import {
  sageText, onbOptionEdge, onbOptionRest, onbMuted,
} from "../../lib/designTokens";
import {
  CaptureOption, CAPTURE_OPTIONS, CAPTURE_CHOICES, CAPTURE_LATER,
  CAPTURE_ESCAPE_PREFIX, CAPTURE_ESCAPE_LINK, CAPTURE_ESCAPE_SUFFIX,
  TEMPLATE_TASTER_NOTE, TEMPLATE_STEPS, HAND_NOTE,
} from "../../lib/captureFork";
import { TEMPLATE_FILENAME, downloadTemplate } from "../../lib/templateFile";

const UploadIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M12 3v12M8 7l4-4 4 4" />
  </svg>
);
const TemplateIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h6" />
  </svg>
);
const HandIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
  </svg>
);

const ICONS: Record<CaptureOption, React.ReactNode> = {
  smart: UploadIcon, template: TemplateIcon, byhand: HandIcon,
};

/** A quiet aside beneath an option — a rule and a sentence, never a boxed warning. */
const Aside: React.FC<{ tone: "sage" | "muted"; children: React.ReactNode }> = ({ tone, children }) => (
  <div
    style={{
      display: "flex", gap: 9, borderRadius: 9, padding: "10px 12px",
      background: tone === "sage" ? "#e7ece1" : onbOptionRest,
      border: `0.5px solid ${tone === "sage" ? "#c4d0bc" : onbOptionEdge}`,
    }}
  >
    <span aria-hidden="true" style={{ flex: "0 0 auto", width: 3, borderRadius: 2, background: tone === "sage" ? sageText : onbMuted, opacity: 0.5 }} />
    <p style={{ fontFamily: FONT_SANS, fontSize: 12, lineHeight: 1.5, color: tone === "sage" ? "#44563a" : onbMuted, margin: 0 }}>
      {children}
    </p>
  </div>
);

export interface CaptureForkProps {
  selected: CaptureOption;
  onSelect: (option: CaptureOption) => void;
  /** Open the file picker for a Smart Import upload. */
  onChooseFile: () => void;
  /** Open the file picker for a filled-in template — the local, taster-free path. */
  onUploadTemplate: () => void;
  /** The quiet exit: nothing to bring across. */
  onNothingYet: () => void;
  /** The Import desk, for a sheet whose columns none of the three routes suit. */
  onOpenImportDesk: () => void;
  /** Injected so a spec can assert the download without writing a file. */
  onDownloadTemplate?: () => void;
}

export const CaptureFork: React.FC<CaptureForkProps> = ({
  selected, onSelect, onChooseFile, onUploadTemplate, onNothingYet, onOpenImportDesk, onDownloadTemplate,
}) => {
  const download = onDownloadTemplate ?? (() => { void downloadTemplate(TEMPLATE_FILENAME); });

  return (
    <>
      <div role="radiogroup" aria-label="How to build your list">
        {CAPTURE_OPTIONS.map((key) => (
          <React.Fragment key={key}>
            <SelectRow
              radio
              icon={ICONS[key]}
              title={CAPTURE_CHOICES[key].title}
              desc={CAPTURE_CHOICES[key].desc}
              tags={CAPTURE_CHOICES[key].tags}
              selected={selected === key}
              onClick={() => onSelect(key)}
            />

            {selected === key && (
              <div style={{ margin: "-3px 0 12px", padding: "0 2px" }}>
                {key === "smart" && (
                  <div
                    onClick={onChooseFile}
                    style={{
                      border: `1.5px dashed ${sageText}`, background: onbOptionRest, borderRadius: 12,
                      padding: "18px 16px", textAlign: "center", cursor: "pointer",
                    }}
                  >
                    <div style={{ color: sageText, marginBottom: 7 }}>{UploadIcon}</div>
                    <p style={{ fontFamily: FONT_SANS, fontSize: 12.5, color: "#3a1c14", margin: 0 }}>
                      Drop your file here, or <span style={{ color: sageText, fontWeight: 500 }}>choose a file</span>
                    </p>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.08em", textTransform: "uppercase", color: onbMuted, marginTop: 7 }}>
                      .csv · .xlsx · up to 5 MB
                    </div>
                  </div>
                )}

                {key === "template" && (
                  <>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      {TEMPLATE_STEPS.map((step) => (
                        <div key={step.num} style={{ flex: "1 1 150px", minWidth: 0 }}>
                          <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.12em", color: onbMuted }}>{step.num}</div>
                          <strong style={{ display: "block", fontFamily: FONT_SANS, fontSize: 13, color: "#3a1c14", marginTop: 2 }}>{step.title}</strong>
                          <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: 12, color: onbMuted, lineHeight: 1.45, marginTop: 2 }}>{step.body}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
                      <button
                        type="button"
                        onClick={download}
                        style={{
                          fontFamily: FONT_SANS, fontSize: 12.5, color: sageText, background: "none", cursor: "pointer",
                          border: `1px solid ${sageText}`, borderRadius: 9, padding: "8px 14px",
                        }}
                      >
                        Download the template
                      </button>
                      <button
                        type="button"
                        onClick={onUploadTemplate}
                        style={{
                          fontFamily: FONT_SANS, fontSize: 12.5, color: sageText, background: "none", cursor: "pointer",
                          border: `1px solid ${onbOptionEdge}`, borderRadius: 9, padding: "8px 14px",
                        }}
                      >
                        Upload my filled-in sheet
                      </button>
                    </div>
                    {/* ⚠️ THE SENTENCE THAT MAKES THE TEMPLATE A REAL ALTERNATIVE. Without it a
                        writer reads two upload paths and picks the cleverer-sounding one, spending
                        a one-shot entitlement on a sheet they were willing to fill in by hand. */}
                    <Aside tone="sage">{TEMPLATE_TASTER_NOTE}</Aside>
                  </>
                )}

                {key === "byhand" && <Aside tone="muted">{HAND_NOTE}</Aside>}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{ textAlign: "center", margin: "4px 0 2px" }}>
        <button
          type="button"
          onClick={onNothingYet}
          style={{
            fontFamily: FONT_SANS, fontSize: 12, color: onbMuted, background: "none",
            border: "none", borderBottom: `0.5px solid ${onbOptionEdge}`, cursor: "pointer", padding: 0,
          }}
        >
          {CAPTURE_LATER}
        </button>
      </div>

      <div style={{ textAlign: "center", fontSize: 11, color: "#a8968a", marginTop: 10, fontFamily: FONT_SANS }}>
        {CAPTURE_ESCAPE_PREFIX}
        <button
          type="button"
          onClick={onOpenImportDesk}
          style={{ font: "inherit", color: "#9c8878", background: "none", border: "none", borderBottom: "0.5px solid #cdbdae", cursor: "pointer", padding: 0 }}
        >
          {CAPTURE_ESCAPE_LINK}
        </button>
        {CAPTURE_ESCAPE_SUFFIX}
      </div>
    </>
  );
};
